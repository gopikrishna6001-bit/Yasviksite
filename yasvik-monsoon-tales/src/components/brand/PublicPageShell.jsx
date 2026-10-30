import RetailPageShell from '@/components/retail/RetailPageShell';

/** Customer-facing page wrapper — no AI illustration banners. */
export default function PublicPageShell({ children, className = '', showDeliveryBar = false }) {
  return (
    <RetailPageShell showDeliveryBar={showDeliveryBar} className={className}>
      {children}
    </RetailPageShell>
  );
}
