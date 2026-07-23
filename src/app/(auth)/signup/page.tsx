"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { AuthShell } from "@/components/auth/AuthShell";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refFromUrl = searchParams.get("ref") || "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit =
    name.trim().length >= 2 &&
    email.includes("@") &&
    password.length >= 8 &&
    confirm === password &&
    !loading;

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email,
          password,
          referralCode: refFromUrl || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      router.push(data.next || "/complete-profile");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create account"
      subtitle="Google or email. Phone, KYC, and purchase PIN come next."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-brand-blue font-semibold">
            Sign in
          </Link>
        </>
      }
    >
      <GoogleButton label="Sign up with Google" />

      <div className="divider-or">
        <span className="text-[11px] text-brand-muted font-body shrink-0">or email</span>
      </div>

      <form onSubmit={(e) => void submit(e)}>
        <TextField
          label="Full name"
          placeholder="e.g. Zagalost Abdullahi"
          value={name}
          onChange={setName}
        />
        <TextField
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
        />

        <div className="mb-4">
          <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-brand-muted font-body">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="input-premium pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-brand-muted hover:text-brand-ink"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] font-body text-brand-muted">
            Minimum 8 characters
          </p>
        </div>

        <div className="mb-6">
          <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-brand-muted font-body">
            Confirm password
          </label>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Repeat password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="input-premium"
          />
        </div>

        {error && (
          <div className="text-center text-brand-red text-xs font-body mb-4 font-medium">{error}</div>
        )}

        <div className="pt-1">
          <Button type="submit" disabled={!canSubmit}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
