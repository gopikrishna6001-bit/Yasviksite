import { useQuery } from '@tanstack/react-query';
import { Download, MessageCircle, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { appClient } from '@/api/appClient';

async function loadPublicCatalogues() {
  const { data } = await appClient.functions.invoke('listPublicCatalogues', {});
  return data?.catalogues || [];
}

export default function Catalogue() {
  const { data: catalogues = [], isLoading, error } = useQuery({
    queryKey: ['public-catalogues'],
    queryFn: loadPublicCatalogues,
    staleTime: 5 * 60 * 1000,
  });

  const latest = catalogues.find((c) => c.is_latest_public) || catalogues[0] || null;

  return (
    <div className="min-h-screen bg-warm-cream text-deep-forest">
      <section className="border-b border-soft-border/50 px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-[900px]">
          <p className="font-inter text-[11px] font-bold uppercase tracking-[0.16em] text-deep-forest/45">
            Download
          </p>
          <h1 className="mt-3 font-cormorant text-4xl font-semibold md:text-5xl">Yasvik catalogues</h1>
          <p className="mt-3 max-w-2xl font-inter text-sm leading-6 text-deep-forest/65 md:text-base">
            Current product catalogues generated from the live Yasvik shop — prices and availability may change.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {latest?.generation?.file_url ? (
              <a
                href={latest.generation.file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-deep-forest px-5 py-3 font-inter text-sm font-bold text-white"
              >
                <Download className="h-4 w-4" />
                Download latest catalogue
              </a>
            ) : null}
            <a
              href="https://wa.me/917842938998"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-soft-border bg-white px-5 py-3 font-inter text-sm font-bold text-deep-forest"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp Yasvik
            </a>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 rounded-full border border-soft-border bg-white px-5 py-3 font-inter text-sm font-bold text-deep-forest"
            >
              <ShoppingBag className="h-4 w-4" />
              Visit live shop
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 md:px-8 md:py-14">
        <div className="mx-auto max-w-[900px]">
          <h2 className="font-cormorant text-2xl font-semibold">Available downloads</h2>
          {isLoading ? (
            <p className="mt-6 font-inter text-sm text-deep-forest/50">Loading catalogues…</p>
          ) : error ? (
            <p className="mt-6 font-inter text-sm text-red-700">{error.message}</p>
          ) : !catalogues.length ? (
            <p className="mt-6 font-inter text-sm text-deep-forest/50">
              No public catalogues published yet. Check back soon, or browse the live shop.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {catalogues.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border border-soft-border/70 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-inter text-sm font-semibold text-deep-forest">
                      {item.name}
                      {item.is_latest_public ? (
                        <span className="ml-2 rounded-full bg-neon-paddy/15 px-2 py-0.5 font-inter text-[10px] font-bold uppercase tracking-wider text-deep-forest">
                          Latest
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 font-inter text-xs text-deep-forest/50">
                      {item.catalogue_type}
                      {item.generation?.page_count ? ` · ${item.generation.page_count} pages` : ''}
                      {item.published_at ? ` · ${new Date(item.published_at).toLocaleDateString('en-IN')}` : ''}
                    </p>
                  </div>
                  {item.generation?.file_url ? (
                    <a
                      href={item.generation.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-deep-forest px-4 py-2.5 font-inter text-xs font-bold text-white"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download PDF
                    </a>
                  ) : (
                    <span className="font-inter text-xs text-deep-forest/40">PDF unavailable</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
