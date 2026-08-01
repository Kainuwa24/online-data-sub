import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Online Data Sub",
  description: "How Online Data Sub collects, uses, and protects your information.",
};

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://onlinedatasub.com.ng";
const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@onlinedatasub.app";

export default function PrivacyPage() {
  const updated = "1 August 2026";

  return (
    <main className="legal-page text-brand-ink">
      <div className="legal-page-inner">
        <p className="text-[11px] uppercase tracking-[0.12em] text-brand-muted font-body font-medium">
          Legal
        </p>
        <h1 className="text-3xl font-display font-extrabold tracking-tight mt-1">
          Privacy Policy
        </h1>
        <p className="text-sm text-brand-muted font-body mt-2">
          Online Data Sub - Last updated {updated}
        </p>

        <div className="card p-5 mt-6 space-y-5 text-[14px] leading-relaxed font-body text-brand-ink">
          <section>
            <h2 className="text-base font-display font-bold mb-2">1. Who we are</h2>
            <p>
              Online Data Sub (&quot;we&quot;, &quot;us&quot;) provides mobile data, airtime, bill payments,
              wallet funding, and related services through our website and Android app
              (package <code className="text-xs">app.onlinedatasub.mobile</code>).
            </p>
            <p className="mt-2">
              Contact: <a className="text-brand-blue font-semibold" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">2. Information we collect</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Account data:</strong> name, phone number, email, and authentication details, including Google Sign-In if you choose it.</li>
              <li><strong>Identity for funding:</strong> BVN or NIN when needed for wallet funding account setup.</li>
              <li><strong>Transaction data:</strong> purchases, wallet credits/debits, references, and related status messages.</li>
              <li><strong>Device and security data:</strong> app session data and optional biometric unlock status. Biometric verification happens on your device; we do not store fingerprint or face templates.</li>
              <li><strong>Technical logs:</strong> IP address, device type, and error logs needed to operate and secure the service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">3. How we use information</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Create and secure your account, including PIN and session management.</li>
              <li>Process data, airtime, bill payments, and wallet funding.</li>
              <li>Comply with payment-provider, KYC, and regulatory requirements.</li>
              <li>Prevent fraud, abuse, and unauthorized access.</li>
              <li>Provide customer support, service notices, and reliability improvements.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">4. Sharing</h2>
            <p>We share data only as needed to run the service, including with:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Payment, wallet funding, data, airtime, and bill-payment providers.</li>
              <li>Authentication providers, such as Google, when you sign in with them.</li>
              <li>Infrastructure hosts that run our servers and databases.</li>
              <li>Authorities when required by law.</li>
            </ul>
            <p className="mt-2">We do not sell your personal information.</p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">5. Payments and wallet</h2>
            <p>
              Wallet balances and funding accounts are processed through payment partners. We do not store full card numbers for bank-transfer funding. Transaction history is shown in the app so you can review activity.
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">6. Security</h2>
            <p>
              We use HTTPS, hashed PINs, session controls, and access-limited production systems. No method of transmission or storage is 100% secure; please protect your PIN and device unlock.
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">7. Data retention and deletion</h2>
            <p>
              We keep account and transaction records while your account is active and as needed for legal, accounting, dispute, regulatory, security, and fraud-prevention purposes. When you delete your account, we delete the app account and associated in-app data, except limited records we must retain for those legitimate purposes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">8. Your choices</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Update profile details in the app.</li>
              <li>Disable biometric unlock in Security and PIN settings.</li>
              <li>Sign out on shared devices.</li>
              <li>
                Delete your account in the app from Profile - Delete account, or use our public <Link href="/account-deletion" className="text-brand-blue font-semibold">account deletion page</Link> if you cannot access the app.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">9. Children</h2>
            <p>
              The service is not directed to children under 13 or the minimum age required in your jurisdiction. Do not create an account for a child.
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">10. Changes</h2>
            <p>
              We may update this policy. The Last updated date will change when we do. Continued use of the app after updates means you accept the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">11. Contact</h2>
            <p>
              Questions about privacy: <a className="text-brand-blue font-semibold" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </p>
            <p className="mt-2 text-xs text-brand-muted">Canonical URL: {APP_URL}/privacy</p>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap gap-4 text-sm font-body">
          <Link href="/terms" className="text-brand-blue font-semibold">Terms of service</Link>
          <Link href="/account-deletion" className="text-brand-blue font-semibold">Account deletion</Link>
          <Link href="/login" className="text-brand-muted font-medium">Back to app</Link>
        </div>
      </div>
    </main>
  );
}
