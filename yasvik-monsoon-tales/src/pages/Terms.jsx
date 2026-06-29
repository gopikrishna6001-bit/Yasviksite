import { Link } from 'react-router-dom';
import PublicPageHeader from '@/components/brand/PublicPageHeader';

export default function Terms() {
  return (
    <div className="min-h-screen bg-warm-cream pb-24 text-deep-forest">
      <PublicPageHeader
        eyebrow="Legal"
        title="Terms of Service"
        description="The terms that apply when you use the Yasvik website, create an account, and place orders."
      />

      <div className="mx-auto max-w-3xl space-y-8 px-6 font-inter text-sm leading-7 text-deep-forest/75">
        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Agreement</h2>
          <p className="mt-3">
            By using the Yasvik website and web application at{' '}
            <a href="https://www.yasvik.com" className="font-semibold text-forest-canopy hover:underline">
              www.yasvik.com
            </a>
            , you agree to these Terms of Service. If you do not agree, please do not use the site.
          </p>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">About Yasvik</h2>
          <p className="mt-3">
            Yasvik Natural Foods (&quot;Yasvik&quot;, &quot;we&quot;, &quot;us&quot;) operates an online store and web application
            for natural foods and everyday groceries in Hyderabad, India. You may browse products, create an account,
            and place orders for delivery or local pickup.
          </p>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Accounts</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>You may register with email or sign in with Google.</li>
            <li>You are responsible for keeping your account credentials secure.</li>
            <li>Information you provide must be accurate and up to date.</li>
            <li>We may suspend accounts used for fraud, abuse, or violation of these terms.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Orders and payments</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Product availability, prices, and pack sizes may change without notice until an order is confirmed.</li>
            <li>We will confirm orders by email or phone when needed.</li>
            <li>Payment terms and delivery areas are shown at checkout or communicated by our team.</li>
            <li>Refunds or replacements for quality issues are handled case by case in line with our store policy.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Acceptable use</h2>
          <p className="mt-3">
            You agree not to misuse the site, attempt unauthorized access, interfere with other users, or use the
            application for unlawful purposes.
          </p>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Privacy</h2>
          <p className="mt-3">
            Our use of personal information is described in our{' '}
            <Link to="/privacy" className="font-semibold text-forest-canopy hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Limitation of liability</h2>
          <p className="mt-3">
            Yasvik provides the website and application on an &quot;as is&quot; basis. To the extent permitted by law, we are
            not liable for indirect or consequential losses arising from use of the site, except where required by
            applicable consumer protection law.
          </p>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Changes and contact</h2>
          <p className="mt-3">
            We may update these terms from time to time. The latest version will be published on this page. Questions:
            {' '}
            <a href="mailto:yasvikfoods@gmail.com" className="font-semibold text-forest-canopy hover:underline">
              yasvikfoods@gmail.com
            </a>
            .
          </p>
          <p className="mt-4 text-deep-forest/55">Last updated: June 2026</p>
        </section>

        <p>
          <Link to="/" className="font-semibold text-forest-canopy hover:underline">
            ← Back to Yasvik home
          </Link>
        </p>
      </div>
    </div>
  );
}
