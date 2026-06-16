import clsx from 'clsx';

export default function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'left',
  className = '',
  id,
}) {
  const alignClass = align === 'center' ? 'text-center mx-auto' : '';

  return (
    <div className={clsx('max-w-2xl', alignClass, className)}>
      {eyebrow && (
        <p className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-sun-dried-clay">
          {eyebrow}
        </p>
      )}
      {title && (
        <h2 id={id} className="mt-2 font-cormorant text-3xl font-semibold leading-tight text-deep-forest md:text-5xl">
          {title}
        </h2>
      )}
      {description && (
        <p className="mt-3 font-inter text-sm leading-7 text-deep-forest/70 md:text-base">
          {description}
        </p>
      )}
    </div>
  );
}
