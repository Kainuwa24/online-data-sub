"use client";

import { useState } from "react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { Mail } from "lucide-react";

export function MagicLinkForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devLink, setDevLink] = useState<string | null>(null);

  async function submit() {
    setError("");
    setDevLink(null);
    setStatus("loading");
    const res = await fetch("/api/auth/magic/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus("idle");
      setError(data.error || "Could not send link");
      return;
    }
    setStatus("sent");
    setMessage(data.message || "Check your email for a sign-in link.");
    if (data.devLink) setDevLink(data.devLink);
  }

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-brand-blue/15 bg-brand-blueSoft/60 p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-white shadow-soft flex items-center justify-center shrink-0">
            <Mail size={16} className="text-brand-blue" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold font-body text-brand-blue">Check your inbox</div>
            <p className="text-xs text-brand-muted font-body mt-1 leading-relaxed">{message}</p>
            {devLink && (
              <div className="mt-3">
                <div className="text-[10px] uppercase tracking-wide text-brand-muted font-body mb-1">
                  Dev link
                </div>
                <a
                  href={devLink}
                  className="text-xs text-brand-blue font-mono break-all underline"
                >
                  Open magic link
                </a>
              </div>
            )}
            <button
              type="button"
              className="text-xs text-brand-muted font-body mt-3 underline"
              onClick={() => {
                setStatus("idle");
                setMessage("");
                setDevLink(null);
              }}
            >
              Use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TextField
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={setEmail}
      />
      <Button onClick={submit} disabled={!email.includes("@") || status === "loading"} variant="secondary">
        {status === "loading" ? "Sending link…" : "Email me a magic link"}
      </Button>
      {error && (
        <div className="text-center text-brand-red text-xs font-body mt-2 font-medium">{error}</div>
      )}
    </div>
  );
}
