"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/ui/TextField";
import { PhoneField } from "@/components/ui/PhoneField";
import { Button } from "@/components/ui/Button";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { MagicLinkForm } from "@/components/auth/MagicLinkForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { isValidNgPhone, validateNgPhone } from "@/lib/phone";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = name.trim().length >= 2 && isValidNgPhone(phone) && !loading;

  async function submit() {
    const phoneCheck = validateNgPhone(phone);
    if (!phoneCheck.ok) {
      setError(phoneCheck.error);
      return;
    }
    if (name.trim().length < 2) {
      setError("Enter your full name");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), phone: phoneCheck.phone }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      return;
    }
    router.push(`/otp?phone=${encodeURIComponent(phoneCheck.phone)}&purpose=signup`);
  }

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create account"
      subtitle="Start with Google, email, or phone. PIN and KYC come next."
      footer={
        <>
          Already have an account?{" "}
          <a href="/login" className="text-brand-blue font-semibold">
            Log in
          </a>
        </>
      }
    >
      <GoogleButton label="Sign up with Google" />

      <div className="divider-or">
        <span className="text-[11px] text-brand-muted font-body shrink-0">or magic link</span>
      </div>
      <MagicLinkForm />

      <div className="divider-or">
        <span className="text-[11px] text-brand-muted font-body shrink-0">or phone</span>
      </div>

      <TextField
        label="Full name"
        placeholder="e.g. Zagalost Abdullahi"
        value={name}
        onChange={setName}
      />
      <PhoneField label="Phone number" value={phone} onChange={setPhone} />

      {error && (
        <div className="text-center text-brand-red text-xs font-body mb-3 font-medium">{error}</div>
      )}

      <Button onClick={submit} disabled={!canSubmit}>
        {loading ? "Sending code…" : "Continue"}
      </Button>
    </AuthShell>
  );
}
