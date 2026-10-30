export default function CategoryContextHeader({ title, intro = '' }) {
  return (
    <section className="border-b border-soft-border/50 bg-warm-cream px-4 py-4 md:px-8">
      <div className="mx-auto max-w-[1400px]">
        <h1 className="font-cormorant text-2xl font-semibold text-deep-forest md:text-3xl">{title || 'Shop'}</h1>
        {intro ? (
          <p className="mt-1 max-w-3xl font-inter text-sm leading-6 text-deep-forest/60 md:text-[15px]">
            {intro}
          </p>
        ) : null}
      </div>
    </section>
  );
}
