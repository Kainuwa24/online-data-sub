"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneField } from "@/components/ui/PhoneField";
import { Button } from "@/components/ui/Button";
import { AuthShell } from "@/components/auth/AuthShell";
import { isValidNgPhone, validateNgPhone } from "@/lib/phone";

export default function ForgotPinPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const check = validateNgPhone(phone);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: check.phone, purpose: "reset_pin" }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      return;
    }
    router.push(`/otp?phone=${encodeURIComponent(check.phone)}&purpose=reset_pin`);
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Forgot PIN"
      subtitle="Enter the phone number on your account. We'll send a code to verify it's you."
      footer={
        <a href="/login" className="text-brand-blue font-semibold">
          ← Back to login
        </a>
      }
    >
      <PhoneField label="Phone number" value={phone} onChange={setPhone} />
      {error && (
        <div className="text-center text-brand-red text-xs font-body mb-3 font-medium">{error}</div>
      )}
      <Button onClick={submit} disabled={!isValidNgPhone(phone) || loading}>
        {loading ? "Sending…" : "Send code"}
      </Button>
    </AuthShell>
  );
}
