import { Link } from 'react-router-dom';
import YasvikLogo from '@/components/brand/YasvikLogo';

export function AuthField({ id, label, hint, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="font-inter text-xs font-semibold uppercase tracking-[0.14em] text-deep-forest/55">
          {label}
        </label>
        {hint ? <div className="font-inter text-[11px] text-deep-forest/45">{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function AuthInput({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-2xl border border-[var(--theme-border)] bg-white px-4 py-3.5 font-inter text-sm text-deep-forest placeholder:text-deep-forest/30 focus:border-forest-canopy focus:outline-none focus:ring-2 focus:ring-forest-canopy/15 ${className}`}
      {...props}
    />
  );
}

export function AuthNotice({ tone = 'muted', className = '', children }) {
  const tones = {
    muted: 'border-[var(--theme-border)] bg-[var(--theme-soft)] text-deep-forest/65',
    error: 'border-red-200 bg-red-50 text-red-700',
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 font-inter text-sm ${tones[tone] || tones.muted} ${className}`}>
      {children}
    </div>
  );
}

export default function AuthLayout({ eyebrow = 'Yasvik account', title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen bg-warm-cream px-4 py-10 text-deep-forest">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link to="/" className="mb-6 inline-flex rounded-2xl bg-white/80 px-5 py-3 shadow-[0_12px_40px_rgba(6,53,31,.06)]">
            <YasvikLogo variant="horizontal" />
          </Link>
          <p className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-wet-earth/70">{eyebrow}</p>
          <h1 className="mt-2 font-cormorant text-4xl font-semibold tracking-tight text-deep-forest">{title}</h1>
          {subtitle ? (
            <p className="mt-2 max-w-sm font-inter text-sm leading-6 text-deep-forest/60">{subtitle}</p>
          ) : null}
        </div>

        <div className="rounded-[2rem] border border-[var(--theme-border)] bg-white p-6 shadow-[0_22px_70px_rgba(6,53,31,.08)] md:p-8">
          {children}
        </div>

        {footer ? (
          <p className="mt-6 text-center font-inter text-sm text-deep-forest/55">{footer}</p>
        ) : null}
      </div>
    </div>
  );
}
