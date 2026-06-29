import { Link } from 'react-router-dom';
import PublicPageHeader from '@/components/brand/PublicPageHeader';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-warm-cream pb-24 text-deep-forest">
      <PublicPageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        description="How Yasvik collects, uses, and protects your information when you use our website and sign in with Google or email."
      />

      <div className="mx-auto max-w-3xl space-y-8 px-6 font-inter text-sm leading-7 text-deep-forest/75">
        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Who we are</h2>
          <p className="mt-3">
            Yasvik Natural Foods (&quot;Yasvik&quot;, &quot;we&quot;, &quot;us&quot;) operates the Yasvik website and web application at{' '}
            <a href="https://www.yasvik.com" className="font-semibold text-forest-canopy hover:underline">
              www.yasvik.com
            </a>
            . Our store is located in Hyderabad, Telangana, India. Contact:{' '}
            <a href="mailto:yasvikfoods@gmail.com" className="font-semibold text-forest-canopy hover:underline">
              yasvikfoods@gmail.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">What this application does</h2>
          <p className="mt-3">
            Yasvik is an online grocery and natural foods store. The application lets you browse products, manage a
            cart and wishlist, create an account, and place orders for delivery or local pickup.
          </p>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Information we collect</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              <strong>Account information:</strong> name and email address when you register or sign in with Google
            </li>
            <li>
              <strong>Order information:</strong> products ordered, delivery details, phone number, and payment status
            </li>
            <li>
              <strong>Usage information:</strong> basic site activity needed to run the store (for example, items viewed
              or added to cart)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Google sign-in</h2>
          <p className="mt-3">
            If you sign in with Google, Google shares your basic profile information (name and email) with Yasvik so we
            can create and manage your account. We do not receive your Google password. We use this information only to
            authenticate you, save your profile and order history, and communicate about your orders.
          </p>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">How we use your information</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Process and fulfil your orders</li>
            <li>Provide customer support</li>
            <li>Maintain your account, wishlist, and order history</li>
            <li>Improve our products and store experience</li>
          </ul>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Sharing</h2>
          <p className="mt-3">
            We do not sell your personal information. We share data only with service providers needed to run the store
            (for example, payment, hosting, and delivery partners) and when required by law.
          </p>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Your choices</h2>
          <p className="mt-3">
            You may request access to or correction of your account information by emailing us. You can sign out at any
            time from your profile page.
          </p>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Updates</h2>
          <p className="mt-3">
            We may update this policy from time to time. The latest version will always be published on this page.
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
