import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import EditorialStoryViewer from '@/components/editorial/EditorialStoryViewer';
import { retailClasses } from '@/brand/retailTheme';
import { trackStoryImpression } from '@/lib/editorialAnalytics';

export default function EditorialStoriesRail({ stories = [] }) {
  const [open, setOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const impressed = useRef(new Set());
  const railRef = useRef(null);

  useEffect(() => {
    const root = railRef.current;
    if (!root) return undefined;
    const nodes = root.querySelectorAll('[data-story-id]');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.getAttribute('data-story-id');
          if (!id || impressed.current.has(id)) return;
          impressed.current.add(id);
          trackStoryImpression(id);
        });
      },
      { threshold: 0.45 },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [stories]);

  if (!stories.length) return null;

  return (
    <section className="border-b border-soft-border/40 bg-warm-cream py-8 md:py-10" aria-labelledby="editorial-stories-heading">
      <div className={retailClasses.container}>
        <p className={retailClasses.label}>Stories</p>
        <h2 id="editorial-stories-heading" className={`${retailClasses.titleLg} mt-2`}>
          The product worlds behind what you just saw
        </h2>
        <p className={`${retailClasses.body} mt-2 max-w-2xl`}>
          Homemade kitchens, cold-pressed oils, heritage rice, dry fruits, honey — each story should lead somewhere shoppable.
        </p>

        <div ref={railRef} className="mt-6 flex gap-3 overflow-x-auto pb-2">
          {stories.map((story, index) => (
            <button
              key={story.id}
              type="button"
              data-story-id={story.id}
              onClick={() => {
                setStartIndex(index);
                setOpen(true);
              }}
              className="group relative w-[7.5rem] flex-shrink-0 overflow-hidden rounded-2xl border border-soft-border bg-white text-left sm:w-36"
            >
              <div className="relative aspect-[9/16] bg-deep-forest/10">
                {story.poster_image_url ? (
                  <img
                    src={story.poster_image_url}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-end bg-gradient-to-br from-deep-forest to-[#4a3a28] p-3">
                    <span className="font-cormorant text-sm font-semibold text-warm-cream line-clamp-3">{story.title}</span>
                  </div>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition group-hover:opacity-100">
                  <span className="rounded-full bg-white/90 p-2 text-deep-forest">
                    <Play className="h-4 w-4 fill-current" />
                  </span>
                </span>
                {story.status === 'draft' ? (
                  <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 font-inter text-[9px] font-bold uppercase tracking-wider text-white">
                    Draft
                  </span>
                ) : null}
              </div>
              <div className="p-2.5">
                <p className="line-clamp-2 font-inter text-[11px] font-semibold leading-snug text-deep-forest">
                  {story.title}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <EditorialStoryViewer
        stories={stories}
        startIndex={startIndex}
        open={open}
        onClose={() => setOpen(false)}
      />
    </section>
  );
}
