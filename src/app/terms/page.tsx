import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service · Online Data Sub",
  description: "Terms governing use of Online Data Sub website and mobile app.",
};

export default function TermsPage() {
  const updated = "25 July 2026";

  return (
    <main className="legal-page text-brand-ink">
      <div className="legal-page-inner">
        <p className="text-[11px] uppercase tracking-[0.12em] text-brand-muted font-body font-medium">
          Legal
        </p>
        <h1 className="text-3xl font-display font-extrabold tracking-tight mt-1">
          Terms of Service
        </h1>
        <p className="text-sm text-brand-muted font-body mt-2">
          Online Data Sub · Last updated {updated}
        </p>

        <div className="card p-5 mt-6 space-y-5 text-[14px] leading-relaxed font-body">
          <section>
            <h2 className="text-base font-display font-bold mb-2">1. Agreement</h2>
            <p>
              By using Online Data Sub (website or Android app), you agree to these Terms and
              our{" "}
              <Link href="/privacy" className="text-brand-blue font-semibold">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">2. The service</h2>
            <p>
              We provide tools to buy mobile data and airtime, pay selected bills, fund a wallet,
              and view limited market information. Availability of plans, billers, and funding
              methods depends on partners and network conditions.
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">3. Eligibility</h2>
            <p>
              You must be legally able to enter a binding agreement in your jurisdiction and
              provide accurate registration information. You are responsible for activity under
              your account and for keeping your PIN and device secure.
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">4. Wallet &amp; payments</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Wallet funds are for use on the platform as described in the app.</li>
              <li>
                Successful purchases are generally non-reversible once delivered by the provider.
              </li>
              <li>
                Failed or pending orders may be refunded to wallet after verification; timelines
                depend on partners.
              </li>
              <li>We may reverse or hold transactions that look fraudulent or erroneous.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">5. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Use the service for illegal activity or fraud</li>
              <li>Attempt to bypass security, scrape, or overload our systems</li>
              <li>Share accounts or sell access without permission</li>
              <li>Provide false KYC or recipient details</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">6. Third parties</h2>
            <p>
              Networks, billers, and payment providers have their own terms. Delivery speed and
              success rates can vary by partner and network.
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">7. Disclaimers</h2>
            <p>
              The service is provided &quot;as is&quot;. Market/watch content is informational only and
              not investment advice. We do not guarantee uninterrupted availability.
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">8. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, Online Data Sub is not liable for indirect
              or consequential losses, or for partner outages beyond our reasonable control.
              Our aggregate liability for a claim is limited to the amount you paid for the
              specific transaction giving rise to the claim.
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">9. Suspension</h2>
            <p>
              We may suspend or terminate accounts that violate these Terms, present risk, or
              are required to be closed by law or partners.
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">10. Changes</h2>
            <p>
              We may update these Terms. Continued use after changes constitutes acceptance of
              the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-display font-bold mb-2">11. Contact</h2>
            <p>
              Support:{" "}
              <a className="text-brand-blue font-semibold" href="mailto:support@onlinedatasub.app">
                support@onlinedatasub.app
              </a>
            </p>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap gap-4 text-sm font-body">
          <Link href="/privacy" className="text-brand-blue font-semibold">
            Privacy policy
          </Link>
          <Link href="/login" className="text-brand-muted font-medium">
            Back to app
          </Link>
        </div>
      </div>
    </main>
  );
}
