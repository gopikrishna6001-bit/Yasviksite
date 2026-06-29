import PageHeaderBanner from '@/components/brand/atmosphere/PageHeaderBanner';

export default function PublicPageShell({ illustration, children, className = '' }) {
  return (
    <div className={`min-h-screen bg-warm-cream pb-24 text-deep-forest transition-colors duration-300 ${className}`}>
      {illustration ? <PageHeaderBanner page={illustration} /> : null}
      <div>{children}</div>
    </div>
  );
}
