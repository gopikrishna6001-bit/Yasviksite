/** Customer-facing page wrapper — delivery bar lives in SiteHeader. */
export default function RetailPageShell({ children, className = '' }) {
  return <div className={`min-h-screen bg-warm-cream pb-20 text-deep-forest md:pb-8 ${className}`}>{children}</div>;
}
