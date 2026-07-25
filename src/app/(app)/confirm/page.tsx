"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Smartphone,
  Zap,
  Receipt,
} from "lucide-react";
import { PinDots, NumPad } from "@/components/ui/PinPad";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  clearCheckout,
  loadCheckout,
  checkoutAmountKobo,
  checkoutTitle,
  type CheckoutPayload,
} from "@/lib/checkout";
import { formatPhoneDisplay } from "@/lib/phone";
import { useAppCache } from "@/components/app/AppCacheProvider";
import {
  authenticateBiometric,
  BIOMETRIC_TRANSACTION_KEY,
  getBiometricAvailability,
  readBiometricSetting,
} from "@/lib/native-biometric";

type Phase = "review" | "processing" | "success" | "failed";

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-brand-line/60 last:border-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted font-body shrink-0">
        {label}
      </span>
      <span className="text-sm font-medium font-body text-brand-ink text-right break-all">
        {value}
      </span>
    </div>
  );
}

export default function ConfirmPurchasePage() {
  const router = useRouter();
  const { success: toastSuccess } = useToast();
  const {
    updateWallet,
    clearHistory,
    updateUnreadCount,
    updateNotifications,
  } = useAppCache();
  const [payload, setPayload] = useState<CheckoutPayload | null>(null);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("review");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [biometricTransactionEnabled, setBiometricTransactionEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadBiometricPreference() {
      const availability = await getBiometricAvailability();
      if (cancelled) return;
      setBiometricTransactionEnabled(
        availability.available && readBiometricSetting(BIOMETRIC_TRANSACTION_KEY, false),
      );
    }
    void loadBiometricPreference();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const p = loadCheckout();
    setPayload(p);
    setReady(true);
  }, []);

  // Block accidental leave while processing
  useEffect(() => {
    if (phase !== "processing") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [phase]);

  const submit = useCallback(
    async (fullPin: string) => {
      if (!payload || phase === "processing") return;
      setPinError(null);
      setError(null);
      setPin(fullPin);

      if (biometricTransactionEnabled) {
        const bio = await authenticateBiometric({
          title: "Verify transaction",
          subtitle: "Use fingerprint or face to confirm this purchase",
        });
        if (!bio.verified) {
          setPin("");
          setPinError(
            bio.cancelled
              ? "Biometric verification was cancelled"
              : bio.message || "Biometric verification failed",
          );
          return;
        }
      }

      setPhase("processing");

      try {
        let res: Response;
        if (payload.kind === "data") {
          res = await fetch("/api/data/purchase", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              network: payload.network,
              variationCode: payload.variationCode,
              planLabel: payload.planLabel,
              priceKobo: payload.priceKobo,
              recipientPhone: payload.recipientPhone,
              pin: fullPin,
            }),
          });
        } else if (payload.kind === "airtime") {
          res = await fetch("/api/airtime/purchase", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              network: payload.network,
              amountKobo: payload.amountKobo,
              recipientPhone: payload.recipientPhone,
              pin: fullPin,
            }),
          });
        } else {
          res = await fetch("/api/bills/pay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category: payload.category,
              billerName: payload.billerName,
              serviceID: payload.serviceID,
              variationCode: payload.variationCode,
              accountNumber: payload.accountNumber,
              amountKobo: payload.amountKobo,
              pin: fullPin,
            }),
          });
        }

        const data = await res.json();

        if (res.status === 401) {
          setPhase("review");
          setPin("");
          setPinError(data.error || "Incorrect PIN");
          return;
        }

        if (!res.ok || !data.success) {
          setPhase("failed");
          setError(data.error || "Transaction failed");
          setReference(data.reference || null);
          return;
        }

        clearCheckout();
        updateWallet(() => undefined);
        clearHistory();
        updateUnreadCount(() => undefined);
        updateNotifications(() => undefined);
        setReference(data.reference || null);
        setPhase("success");
        toastSuccess("Payment successful");
      } catch {
        setPhase("failed");
        setError("Network error. Please try again.");
        setPin("");
      }
    },
    [payload, phase, toastSuccess, biometricTransactionEnabled],
  );

  function press(d: string) {
    if (phase !== "review") return;
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setPinError(null);
    if (next.length === 4) void submit(next);
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-brand-muted font-body">
        Loading…
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen px-5 py-10 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => router.push("/home")}
          className="flex items-center gap-1.5 text-xs text-brand-muted font-body mb-6"
        >
          <ArrowLeft size={14} /> Home
        </button>
        <div className="card p-8 text-center">
          <p className="text-sm font-body text-brand-muted">
            No purchase to confirm. Pick a plan or bill first.
          </p>
          <div className="mt-6">
            <Button onClick={() => router.push("/data")}>Go to Data</Button>
          </div>
        </div>
      </div>
    );
  }

  const amount = checkoutAmountKobo(payload);
  const title = checkoutTitle(payload);
  const Icon =
    payload.kind === "data" ? Smartphone : payload.kind === "airtime" ? Zap : Receipt;

  return (
    <div className="min-h-screen px-5 py-6 pb-16 max-w-md mx-auto animate-fade-up">
      {phase === "review" && (
        <button
          type="button"
          onClick={() => {
            clearCheckout();
            router.back();
          }}
          className="flex items-center gap-1.5 text-xs text-brand-muted font-body mb-5"
        >
          <ArrowLeft size={14} /> Cancel
        </button>
      )}

      {(phase === "processing" || phase === "success" || phase === "failed") && (
        <div className="h-5 mb-5" />
      )}

      {phase === "processing" && (
        <div className="mb-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-blue font-body">
            Processing
          </div>
          <h1 className="text-[26px] font-display font-extrabold text-brand-ink tracking-tight mt-1">
            Please wait…
          </h1>
          <p className="text-sm text-brand-muted font-body mt-1.5">
            Do not close this page while we complete your transaction.
          </p>
        </div>
      )}

      {phase === "success" && (
        <div className="mb-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-blue font-body">
            Successful
          </div>
          <h1 className="text-[26px] font-display font-extrabold text-brand-ink tracking-tight mt-1">
            {title}
          </h1>
          <p className="text-sm text-brand-muted font-body mt-1.5">
            Your wallet has been debited and the order was submitted.
          </p>
        </div>
      )}

      {phase === "failed" && (
        <div className="mb-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-blue font-body">
            Failed
          </div>
          <h1 className="text-[26px] font-display font-extrabold text-brand-ink tracking-tight mt-1">
            {title}
          </h1>
          <p className="text-sm text-brand-muted font-body mt-1.5">
            Nothing was completed successfully. You can try again.
          </p>
        </div>
      )}

      {/* Summary card */}
      <div className={`card p-5 mb-5 ${phase === "review" ? "mt-1" : ""}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-11 w-11 rounded-2xl bg-brand-blueSoft flex items-center justify-center">
            <Icon size={20} className="text-brand-blue" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-display font-bold text-brand-ink truncate">{title}</div>
            <div className="text-2xl font-display font-extrabold text-brand-blue tracking-tight mt-0.5">
              {naira(amount)}
            </div>
          </div>
        </div>

        {payload.kind === "data" && (
          <>
            <Row label="Network" value={payload.network} />
            <Row label="Plan" value={`${payload.size} · ${payload.validity}`} />
            <Row label="To" value={formatPhoneDisplay(payload.recipientPhone)} />
          </>
        )}
        {payload.kind === "airtime" && (
          <>
            <Row label="Network" value={payload.network} />
            <Row label="To" value={formatPhoneDisplay(payload.recipientPhone)} />
          </>
        )}
        {payload.kind === "bill" && (
          <>
            <Row label="Category" value={payload.category} />
            <Row label="Biller" value={payload.billerName} />
            <Row label="Account" value={payload.accountNumber} />
          </>
        )}
        {reference && <Row label="Reference" value={reference} />}
      </div>

      {/* PIN / status area */}
      {phase === "review" && (
        <div className="auth-panel">
          <div className="text-center text-[13px] font-semibold font-body text-brand-ink mb-1">
            Enter PIN to pay
          </div>
          <PinDots length={4} filled={pin.length} />
          {biometricTransactionEnabled && (
            <div className="text-center text-[11px] text-brand-muted font-body mb-3 -mt-1">
              Biometric verification is on for this transaction.
            </div>
          )}
          <NumPad
            onPress={press}
            onBackspace={() => {
              setPin(pin.slice(0, -1));
              setPinError(null);
            }}
          />
          {pinError && (
            <div className="text-center text-brand-red text-xs font-body font-medium mt-3">
              {pinError}
            </div>
          )}
        </div>
      )}

      {phase === "processing" && (
        <div className="card p-10 text-center">
          <Loader2 size={36} className="mx-auto text-brand-blue animate-spin" />
          <div className="mt-4 text-sm font-semibold font-body text-brand-ink">
            Processing payment
          </div>
          <p className="mt-2 text-xs text-brand-muted font-body leading-relaxed">
            Stay on this screen. We’re confirming with the provider and updating your wallet.
          </p>
          <div className="mt-5 h-1.5 rounded-full bg-brand-line overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-brand-blue animate-pulse" />
          </div>
        </div>
      )}

      {phase === "success" && (
        <div className="card p-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <div className="mt-4 text-lg font-display font-bold text-brand-ink">Payment successful</div>
          <p className="mt-1.5 text-xs text-brand-muted font-body">
            {naira(amount)} · {title}
          </p>
          <div className="mt-6 space-y-2.5">
            <Button onClick={() => router.push(reference ? `/history` : "/home")}>
              View history
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                router.push(
                  payload.kind === "bill" ? "/bills" : payload.kind === "airtime" ? "/data?tab=airtime" : "/data",
                )
              }
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {phase === "failed" && (
        <div className="card p-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-brand-redSoft flex items-center justify-center">
            <XCircle size={32} className="text-brand-red" />
          </div>
          <div className="mt-4 text-lg font-display font-bold text-brand-ink">Payment failed</div>
          <p className="mt-1.5 text-xs text-brand-red font-body font-medium">{error}</p>
          <div className="mt-6 space-y-2.5">
            <Button
              onClick={() => {
                setPhase("review");
                setPin("");
                setError(null);
                setPinError(null);
              }}
            >
              Try again
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                clearCheckout();
                router.push("/home");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
