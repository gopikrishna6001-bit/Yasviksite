import { STORY_COPY } from '@/brand/monsoonTokens';

export default function StoryBlock() {
  return (
    <section className="border-y border-soft-border bg-warm-cream px-4 py-12 md:px-8 md:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[1.75rem] border border-soft-border bg-white px-6 py-8 text-center shadow-[0_12px_36px_rgba(31,61,43,0.05)] md:px-10 md:py-10">
          <p className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-sun-dried-clay">
            Why Yasvik
          </p>
          <div className="mx-auto mt-4 flex items-center justify-center gap-2" aria-hidden="true">
            <span className="h-px w-10 bg-soft-border" />
            <span className="h-2 w-2 rounded-full bg-neon-paddy/70" />
            <span className="h-px w-10 bg-soft-border" />
          </div>
          <p className="mt-5 font-cormorant text-xl font-medium leading-[1.45] text-deep-forest md:text-2xl md:leading-[1.5]">
            {STORY_COPY}
          </p>
        </div>
      </div>
    </section>
  );
}
