import { Link } from 'react-router-dom';
import PublicPageHeader from '@/components/brand/PublicPageHeader';
import { DELIVERY_RATE_CALCULATOR_URL, MIN_DELIVERY_ORDER_RS } from '@/lib/commerceCopy';
import { YASVIK_DEFAULT_SERVICE_PINCODE } from '@/lib/storeLocation';

const DELIVERY_ZONES = [
  { zone: 'Zone 1 — Hyperlocal', distance: '0–4 km', charge: '₹50–₹80' },
  { zone: 'Zone 2 — Nearby', distance: 'Above 4–8 km', charge: '₹80–₹130' },
  { zone: 'Zone 3 — Extended West Hyderabad', distance: 'Above 8–15 km', charge: '₹120–₹200' },
  { zone: 'Zone 4 — Wider Hyderabad', distance: 'Above 15–25 km', charge: '₹180–₹320' },
  { zone: 'Zone 5 — Far Hyderabad', distance: 'Above 25 km', charge: '₹280–₹450 or more' },
];

export default function DeliveryPolicy() {
  return (
    <div className="min-h-screen bg-warm-cream pb-24 text-deep-forest">
      <PublicPageHeader
        eyebrow="Policy"
        title="Delivery Policy"
        description="How Yasvik delivers across Hyderabad and ships orders outside the city — charges, dispatch, and what to expect."
      />

      <div className="mx-auto max-w-3xl space-y-8 px-6 font-inter text-sm leading-7 text-deep-forest/75">
        <p className="text-deep-forest/55">Effective from: 17 July 2026</p>

        <section>
          <p>
            Yasvik offers delivery across Hyderabad through third-party delivery partners such as Rapido and Porter.
            Orders outside Hyderabad are shipped through available courier services.
          </p>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Hyderabad delivery</h2>
          <p className="mt-3">
            Delivery charges are based on the actual fare quoted by Rapido, Porter, or another suitable delivery
            partner at the time of dispatch.
          </p>
          <p className="mt-3">
            An estimated delivery range may be shown based on the road distance from our Ashok Nagar–Lingampally store:
          </p>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-soft-border bg-white">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-soft-border bg-[#F3EDE0]/60">
                  <th className="px-4 py-3 font-semibold text-deep-forest">Delivery zone</th>
                  <th className="px-4 py-3 font-semibold text-deep-forest">Approximate distance</th>
                  <th className="px-4 py-3 font-semibold text-deep-forest">Estimated delivery charge</th>
                </tr>
              </thead>
              <tbody>
                {DELIVERY_ZONES.map((row) => (
                  <tr key={row.zone} className="border-b border-soft-border/70 last:border-0">
                    <td className="px-4 py-3 align-top">{row.zone}</td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">{row.distance}</td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">{row.charge}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4">These ranges are only estimates. The final fare may vary based on:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Exact pickup and delivery location</li>
            <li>Traffic and travel time</li>
            <li>Rider or vehicle availability</li>
            <li>Peak-hour or weather-related surge</li>
            <li>Order weight and parcel size</li>
            <li>Waiting time or additional delivery stops</li>
          </ul>
          <p className="mt-3">
            Standard Porter / Rapido delivery charges apply. We pick the best slot to avoid surcharges and peak city
            traffic.
          </p>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Heavy and bulky orders</h2>
          <p className="mt-3">
            Standard estimated charges generally apply to orders suitable for two-wheeler delivery.
          </p>
          <p className="mt-3">
            Orders containing large rice bags, oil cartons, bulk groceries, fragile items, or packages that cannot be
            safely carried on a two-wheeler may require an auto, three-wheeler, or other vehicle.
          </p>
          <p className="mt-3">Standard charges for the required vehicle apply.</p>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Outside Hyderabad</h2>
          <p className="mt-3">
            Orders outside Hyderabad are shipped through courier services, subject to product eligibility and service
            availability.
          </p>
          <p className="mt-3">Shipping charges depend on:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Destination pincode</li>
            <li>Packed or volumetric weight</li>
            <li>Courier partner</li>
            <li>Surface or air shipping</li>
            <li>Packaging requirements</li>
            <li>COD availability, where offered</li>
          </ul>
          <p className="mt-3">
            Standard courier charges apply. We choose the best partner for safe delivery at a reasonable charge. You can
            estimate charges on the{' '}
            <a
              href={DELIVERY_RATE_CALCULATOR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-deep-forest underline"
            >
              Delhivery rate calculator
            </a>{' '}
            — our pincode is {YASVIK_DEFAULT_SERVICE_PINCODE}.
          </p>
          <p className="mt-3">
            Perishable, fragile, leaking, short-shelf-life, or courier-restricted products may not be available for
            shipping outside Hyderabad.
          </p>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Store pickup</h2>
          <p className="mt-3">
            Customers may collect orders from the Yasvik store at no delivery charge after receiving confirmation that
            the order is ready.
          </p>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Order processing and dispatch</h2>
          <p className="mt-3">Orders are dispatched only after:</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>Product availability is confirmed.</li>
            <li>Required payment is completed or an approved payment method is confirmed.</li>
          </ol>
          <p className="mt-3">
            Dispatch timelines depend on product availability, delivery-partner availability, operating hours, traffic,
            weather, and destination.
          </p>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Payment of delivery charges</h2>
          <p className="mt-3">
            Delivery charges are not included in the online order total and are paid by the customer. Within Hyderabad,
            the standard Porter / Rapido charge is paid to the rider at delivery. Outside Hyderabad, standard courier
            charges apply. Charges are based on weight, package size and distance.
          </p>
          <p className="mt-3">
            Home delivery is available on orders of ₹{MIN_DELIVERY_ORDER_RS} and above. Smaller orders can be collected
            free from our store.
          </p>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Delivery address and customer availability</h2>
          <p className="mt-3">
            Customers must provide a complete and accurate address, pincode, mobile number, landmark, and delivery
            instructions.
          </p>
          <p className="mt-3">The customer or an authorised person should be available to receive the order.</p>
          <p className="mt-3">
            Additional charges arising from an incorrect address, unavailable recipient, waiting time, re-routing, or
            repeat delivery must be borne by the customer.
          </p>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Failed or refused delivery</h2>
          <p className="mt-3">
            If an order cannot be delivered because the customer is unavailable, refuses the order, provides incorrect
            details, or does not respond, the delivery fee and any return-delivery charges may still apply.
          </p>
          <p className="mt-3">Refunds for undelivered orders will be considered only after deducting:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Delivery and return charges</li>
            <li>Payment-processing charges, where applicable</li>
            <li>Losses on products that cannot be resold safely</li>
          </ul>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Inspection and damage reporting</h2>
          <p className="mt-3">Customers should inspect the package at the time of delivery.</p>
          <p className="mt-3">
            Any leakage, breakage, missing item, incorrect item, or visible damage should be reported to Yasvik as soon
            as possible, preferably on the same day, with clear photographs or video.
          </p>
          <p className="mt-3">
            Issues caused solely by the third-party delivery partner will be reviewed with the delivery partner, but
            Yasvik will assist the customer in resolving genuine concerns.
          </p>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Changes and cancellations</h2>
          <p className="mt-3">
            Orders may be modified or cancelled before packing or dispatch, subject to product type and preparation
            status.
          </p>
          <p className="mt-3">
            Once an order has been handed over to the delivery or courier partner, cancellation may not be possible.
            Delivery and return charges may still apply.
          </p>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Important note</h2>
          <p className="mt-3">
            Yasvik does not add a hidden markup to third-party delivery fares unless a separate packaging, handling, or
            special-service charge is clearly disclosed before confirmation.
          </p>
          <p className="mt-3">
            By placing an order, the customer agrees to the applicable delivery charge and the terms stated in this
            policy.
          </p>
        </section>

        <section className="rounded-2xl border border-soft-border bg-white px-5 py-6">
          <p className="font-cormorant text-xl font-semibold text-deep-forest">Yasvik</p>
          <p className="mt-1 text-deep-forest/70">Conscious foods for modern living.</p>
          <p className="mt-3">
            <a href="https://www.yasvik.com" className="font-semibold text-forest-canopy hover:underline">
              www.yasvik.com
            </a>
            <br />
            <a href="tel:+917842938998" className="font-semibold text-forest-canopy hover:underline">
              +91 78429 38998
            </a>
          </p>
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
