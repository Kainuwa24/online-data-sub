"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";

export default function ForgotPinPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    const res = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, purpose: "reset_pin" }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      return;
    }
    router.push(`/otp?phone=${encodeURIComponent(phone)}&purpose=reset_pin`);
  }

  return (
    <div className="min-h-screen px-6 py-10 max-w-sm mx-auto">
      <div className="text-lg font-display font-bold mt-5">Forgot PIN</div>
      <div className="text-sm text-gray-500 font-body mt-2 mb-6">
        Enter the phone number on your account. We'll send a code to verify it's you.
      </div>
      <TextField label="Phone number" placeholder="080X XXX XXXX" value={phone} onChange={setPhone} />
      {error && <div className="text-center text-red-600 text-xs font-body mb-3">{error}</div>}
      <Button onClick={submit} disabled={phone.length < 10}>
        Send code
      </Button>
    </div>
  );
}
