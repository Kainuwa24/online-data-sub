import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Deletion - Online Data Sub",
  description: "Request deletion of your Online Data Sub account and associated data.",
};

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://onlinedatasub.com.ng";
const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@onlinedatasub.app";

export default function AccountDeletionPage() {
  const mailSubject = "Online Data Sub account deletion request";
  const mailBody = [
    "Hello Online Data Sub support,",
    "",
    "I want to delete my Online Data Sub account and associated data.",
    "",
    "Account email:",
    "Account phone number:",
    "Full name on account:",
    "",
    "I understand that deletion is permanent and that some records may be retained only where required for legal, accounting, fraud-prevention, dispute, or regulatory reasons.",
  ].join("\n");
  const mailUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    mailSubject,
  )}&body=${encodeURIComponent(mailBody)}`;

  return (
    <main className="legal-page text-brand-ink">
      <div className="legal-page-inner">
        <p className="text-[11px] uppercase tracking-[0.12em] text-brand-muted font-body font-medium">
          Account controls
        </p>
        <h1 className="text-3xl font-display font-extrabold tracking-tight mt-1">
          Delete your Online Data Sub account
        </h1>
        <p className="text-sm text-brand-muted font-body mt-2">
          Public account deletion resource for Online Data Sub users.
        </p>

        <div className="card p-5 mt-6 space-y-5 text-[14px] leading-relaxed font-body text-brand-ink">
          <section>
            <h2 className="text-base font-display font-bold mb-2">Fastest option: delete in the app</h2>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>Sign in to Online Data Sub.</li>
              <li>Open Profile.</li>
              <li>Tap Delete account.</li>
              <li>Type DELETE and confirm with your PIN, or with your account email if no PIN is set.</li>
            </ol>
            <p className="mt-3">
              This permanently deletes the account record and associated in-app data tied to your account.
            </p>
            <div className="mt-4">
              <Link href="/profile/delete" className="btn-primary inline-flex w-auto items-center justify-center px-5">
                Open in-app deletion
              </Link>
            </div>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">If you cannot access the app</h2>
            <p>
              You can request account deletion by email. Include the phone number and email address used on your account so we can verify ownership before deletion.
            </p>
            <div className="mt-4">
              <a href={mailUrl} className="btn-secondary inline-flex w-auto items-center justify-center px-5">
                Email deletion request
              </a>
            </div>
            <p className="mt-3 text-xs text-brand-muted">
              Support email: <a className="text-brand-blue font-semibold" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">What is deleted</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Your profile details such as name, phone number, email, PIN hash, BVN/NIN fields, and Google sign-in identifier.</li>
              <li>Your wallet record, notifications, virtual funding accounts, and in-app transaction history.</li>
              <li>Referral links connected to your account.</li>
              <li>Unused OTP and magic-link login tokens linked to your phone or email.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">What may be retained</h2>
            <p>
              Some payment-provider, accounting, fraud-prevention, dispute, security, or regulatory records may need to be retained where legally required or necessary to protect the service. Retained records are limited to those purposes and are not used to keep your app account active.
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">Timing</h2>
            <p>
              In-app deletion is processed immediately when confirmation succeeds. Email requests are reviewed after ownership verification and completed as quickly as reasonably possible.
            </p>
            <p className="mt-2 text-xs text-brand-muted">
              Play Console URL: {APP_URL}/account-deletion
            </p>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap gap-4 text-sm font-body">
          <Link href="/privacy" className="text-brand-blue font-semibold">
            Privacy policy
          </Link>
          <Link href="/terms" className="text-brand-blue font-semibold">
            Terms of service
          </Link>
          <Link href="/login" className="text-brand-muted font-medium">
            Back to app
          </Link>
        </div>
      </div>
    </main>
  );
}
