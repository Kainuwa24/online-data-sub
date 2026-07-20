"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Mail, MessageCircle } from "lucide-react";
import { ScreenHeader } from "@/components/layout/ScreenHeader";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I fund my wallet?",
    a: "On Home, tap Fund wallet. You’ll get a PalmPay account number (when configured). Transfer from any bank app; your balance updates after confirmation. In development you can use “simulate funding”.",
  },
  {
    q: "Why did a data purchase fail?",
    a: "Common causes: wrong network, invalid number, low wallet balance, or the vendor rejecting the plan. Your wallet is refunded automatically if the vendor fails after debit.",
  },
  {
    q: "How do referrals work?",
    a: "Share your code from Profile → Refer & earn. When a friend signs up with your code, you both get a wallet bonus (default ₦500).",
  },
  {
    q: "I forgot my PIN",
    a: "On the login screen choose Forgot PIN, verify your phone with OTP, then set a new 4-digit PIN.",
  },
  {
    q: "How do I change my PIN?",
    a: "Go to Profile → Security & PIN and enter your current PIN, then a new one twice.",
  },
  {
    q: "Why do you need BVN or NIN?",
    a: "PalmPay requires identity on permanent virtual accounts so bank transfers can complete. Add BVN (preferred) or NIN under Edit profile.",
  },
];

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);
  const email =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@onlinedatasub.app";
  const wa = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "2348000000000").replace(
    /\D/g,
    "",
  );
  const waUrl = `https://wa.me/${wa}?text=${encodeURIComponent(
    "Hi Online Data Sub support — I need help with: ",
  )}`;
  const mailUrl = `mailto:${email}?subject=${encodeURIComponent("Online Data Sub — Help")}`;

  return (
    <div className="animate-fade-up pb-28">
      <ScreenHeader title="Help & support" backHref="/profile" />
      <div className="px-5">
        <p className="text-sm text-brand-muted font-body mb-5 leading-relaxed">
          Answers to common questions, plus ways to reach us.
        </p>

        <div className="section-label mb-2">Contact us</div>
        <div className="card overflow-hidden mb-6">
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-4 py-3.5 border-b border-brand-line/70 active:bg-slate-50"
          >
            <MessageCircle size={17} className="text-brand-blue" />
            <div>
              <div className="text-[13.5px] font-semibold font-body text-brand-ink">
                WhatsApp
              </div>
              <div className="text-[11px] text-brand-muted font-body">Chat with support</div>
            </div>
          </a>
          <a
            href={mailUrl}
            className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50"
          >
            <Mail size={17} className="text-brand-blue" />
            <div>
              <div className="text-[13.5px] font-semibold font-body text-brand-ink">Email</div>
              <div className="text-[11px] text-brand-muted font-body">{email}</div>
            </div>
          </a>
        </div>

        <div className="section-label mb-2">FAQs</div>
        <div className="card overflow-hidden">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                key={f.q}
                className={i !== FAQS.length - 1 ? "border-b border-brand-line/70" : ""}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
                >
                  <span className="text-[13.5px] font-semibold font-body text-brand-ink">
                    {f.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp size={16} className="text-brand-muted shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-brand-muted shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-3.5 text-[12.5px] leading-relaxed text-brand-muted font-body">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
