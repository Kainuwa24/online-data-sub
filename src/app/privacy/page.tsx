import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · Online Data Sub",
  description: "How Online Data Sub collects, uses, and protects your information.",
};

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://online-data-sub-production.up.railway.app";

export default function PrivacyPage() {
  const updated = "25 July 2026";

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-brand-ink">
      <div className="max-w-2xl mx-auto px-5 py-10 pb-16">
        <p className="text-[11px] uppercase tracking-[0.12em] text-brand-muted font-body font-medium">
          Legal
        </p>
        <h1 className="text-3xl font-display font-extrabold tracking-tight mt-1">
          Privacy Policy
        </h1>
        <p className="text-sm text-brand-muted font-body mt-2">
          Online Data Sub · Last updated {updated}
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
              Contact:{" "}
              <a className="text-brand-blue font-semibold" href="mailto:support@onlinedatasub.app">
                support@onlinedatasub.app
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">2. Information we collect</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Account data:</strong> name, phone number, email, and authentication
                details (including Google Sign-In if you choose it).
              </li>
              <li>
                <strong>Identity for funding (optional):</strong> BVN or NIN when you complete
                wallet KYC for virtual account funding.
              </li>
              <li>
                <strong>Transaction data:</strong> purchases, wallet credits/debits, references,
                and related status messages.
              </li>
              <li>
                <strong>Device / security:</strong> basic app session data; optional biometric
                unlock is verified on your device and is not stored as fingerprint/face images
                on our servers.
              </li>
              <li>
                <strong>Technical logs:</strong> IP address, device type, and error logs needed
                to operate and secure the service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">3. How we use information</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Create and secure your account, including PIN and session management</li>
              <li>Process data, airtime, bill payments, and wallet funding</li>
              <li>Comply with payment-provider and regulatory requirements</li>
              <li>Prevent fraud, abuse, and unauthorized access</li>
              <li>Provide customer support and service notices</li>
              <li>Improve reliability and performance of the app and website</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">4. Sharing</h2>
            <p>We share data only as needed to run the service, including with:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Payment and VTU providers (e.g. funding rails, data/airtime/bill partners)</li>
              <li>Authentication providers (e.g. Google) when you sign in with them</li>
              <li>Infrastructure hosts that run our servers and databases</li>
              <li>Authorities when required by law</li>
            </ul>
            <p className="mt-2">We do not sell your personal information.</p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">5. Payments &amp; wallet</h2>
            <p>
              Wallet balances and funding accounts are processed through licensed payment
              partners. We do not store full card numbers for bank-transfer funding. Transaction
              history is kept so you can review activity in the app.
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">6. Biometrics</h2>
            <p>
              If you enable fingerprint or face unlock, verification happens using your device
              biometrics framework. We do not receive or store your biometric templates. You can
              turn this off anytime in Security &amp; PIN.
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">7. Security</h2>
            <p>
              We use HTTPS, hashed PINs, session controls, and access-limited production systems.
              No method of transmission or storage is 100% secure; please protect your PIN and
              device unlock.
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">8. Data retention</h2>
            <p>
              We keep account and transaction records for as long as your account is active and
              as needed for legal, accounting, dispute, and fraud-prevention purposes. You may
              request account closure by contacting support.
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">9. Your choices</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Update profile details in the app</li>
              <li>Disable biometric unlock in Security settings</li>
              <li>Sign out on shared devices</li>
              <li>Contact us to correct data or request account deletion</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">10. Children</h2>
            <p>
              The service is not directed to children under 13 (or the minimum age required in
              your jurisdiction). Do not create an account for a child.
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">11. Changes</h2>
            <p>
              We may update this policy. The &quot;Last updated&quot; date will change when we do.
              Continued use of the app after updates means you accept the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">12. Contact</h2>
            <p>
              Questions about privacy:{" "}
              <a className="text-brand-blue font-semibold" href="mailto:support@onlinedatasub.app">
                support@onlinedatasub.app
              </a>
            </p>
            <p className="mt-2 text-xs text-brand-muted">
              Canonical URL: {APP_URL}/privacy
            </p>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap gap-4 text-sm font-body">
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
