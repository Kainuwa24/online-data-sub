"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { PinDots, NumPad } from "@/components/ui/PinPad";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = name && phone.length >= 10 && pin.length === 4 && !loading;

  function press(d: string) {
    if (pin.length < 4) setPin(pin + d);
  }

  async function submit() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, pin }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      return;
    }
    router.push(`/otp?phone=${encodeURIComponent(phone)}&purpose=signup`);
  }

  return (
    <div className="min-h-screen px-6 py-10 max-w-sm mx-auto">
      <div className="text-2xl font-display font-extrabold mt-5">Create your account</div>
      <div className="text-sm text-gray-500 font-body mt-1 mb-6">Takes less than a minute.</div>

      <TextField label="Full name" placeholder="e.g. Zagalost Abdullahi" value={name} onChange={setName} />
      <TextField label="Phone number" placeholder="080X XXX XXXX" value={phone} onChange={setPhone} />

      <div className="text-[11px] text-gray-500 font-body mb-1.5">Create a 4-digit PIN</div>
      <PinDots length={4} filled={pin.length} />
      <NumPad onPress={press} onBackspace={() => setPin(pin.slice(0, -1))} />

      {error && <div className="text-center text-red-600 text-xs font-body mt-4">{error}</div>}

      <div className="mt-6">
        <Button onClick={submit} disabled={!canSubmit}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </div>
      <div className="text-center text-xs text-gray-500 font-body mt-4">
        Already have an account?{" "}
        <a href="/login" className="text-brand-blue font-semibold">
          Log in
        </a>
      </div>
    </div>
  );
}
