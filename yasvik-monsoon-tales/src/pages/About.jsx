import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import { Link } from 'react-router-dom';
import PageHeroRenderer from '@/components/PageHeroRenderer';
import { retailClasses } from '@/brand/retailTheme';
import {
  YASVIK_BRAND,
  YASVIK_MANIFESTO_PARAGRAPHS,
  YASVIK_MANIFESTO_CLOSING,
} from '@/brand/yasvikManifesto';

export default function About() {
  const { data: hero, isLoading: heroLoading } = useQuery({
    queryKey: ['page-hero', 'about'],
    queryFn: async () => {
      const results = await appClient.entities.PageHero.filter({ page_key: 'about' }, '-updated_date', 1);
      return results[0];
    },
  });

  return (
    <div className={retailClasses.page}>
      {hero && <PageHeroRenderer hero={hero} isLoading={heroLoading} />}
      <div className={`${retailClasses.containerNarrow} pt-10 text-center md:pt-14`}>
        <p className={retailClasses.label}>Yasvik</p>
        <h1 className={`mt-2 ${retailClasses.titlePage}`}>{YASVIK_BRAND.tagline}</h1>
        <p className={`mt-3 ${retailClasses.body}`}>{YASVIK_BRAND.promise}</p>
      </div>

      <div className={`${retailClasses.containerNarrow} pt-9`}>
        <motion.article
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className={`${retailClasses.card} p-6 md:p-10`}
        >
          <div className={`space-y-5 ${retailClasses.bodyLg}`}>
            {YASVIK_MANIFESTO_PARAGRAPHS.map((paragraph) => {
              const isAccent = paragraph.startsWith('That is where')
                || paragraph.startsWith('Because better')
                || paragraph.startsWith('For us,')
                || paragraph.startsWith('It means better')
                || paragraph.startsWith('We do the travelling')
                || paragraph.startsWith('You bring home');
              if (isAccent && (paragraph.startsWith('It means') || paragraph.startsWith('We do the') || paragraph.startsWith('You bring'))) {
                return (
                  <p key={paragraph} className={retailClasses.titleMd}>
                    {paragraph}
                  </p>
                );
              }
              return <p key={paragraph}>{paragraph}</p>;
            })}
          </div>

          <div className="my-10 text-center">
            <p className={`${retailClasses.label} tracking-[0.2em]`}>{YASVIK_MANIFESTO_CLOSING[0]}</p>
            <p className={`mt-2 ${retailClasses.titleLg}`}>{YASVIK_MANIFESTO_CLOSING[1]}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link to="/shop" className={retailClasses.btnPrimary}>
              Shop Yasvik
            </Link>
            <Link to="/our-roots" className={retailClasses.btnOutline}>
              Our Roots
            </Link>
          </div>
        </motion.article>
      </div>
    </div>
  );
}
