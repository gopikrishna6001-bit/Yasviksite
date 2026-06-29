export default function PublicPageHeader({ eyebrow, title, description, className = '' }) {
  return (
    <header className={`mx-auto max-w-3xl px-6 pb-8 pt-8 text-center md:pt-10 ${className}`}>
      {eyebrow ? (
        <p className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-sun-dried-clay">{eyebrow}</p>
      ) : null}
      <h1 className="mt-2 font-cormorant text-3xl font-semibold leading-tight text-deep-forest md:text-4xl">{title}</h1>
      {description ? (
        <p className="mx-auto mt-3 max-w-2xl font-inter text-sm leading-7 text-deep-forest/70 md:text-base">{description}</p>
      ) : null}
    </header>
  );
}
