import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { categories as categoriesApi, products as productsApi } from '@/services/api';
import { appClient } from '@/api/appClient';
import ComboCard from '@/components/products/ComboCard';
import ProductCard from '@/components/products/ProductCard';

const BUNDLES_KEY = '__bundles__';

export default function Shop() {
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [searchParams] = useSearchParams();

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.listActive(24), staleTime: 5 * 60 * 1000 });
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['shop-products', activeCategory],
    queryFn: () => activeCategory && activeCategory !== BUNDLES_KEY ? productsApi.listByCategory(activeCategory, 80) : productsApi.listPublished('-created_date', 120),
    staleTime: 3 * 60 * 1000,
    enabled: activeCategory !== BUNDLES_KEY,
  });
  const { data: combos = [], isLoading: combosLoading } = useQuery({ queryKey: ['shop-combos'], queryFn: () => appClient.entities.Combo.filter({ is_published: true }, '-created_date', 20), staleTime: 5 * 60 * 1000 });

  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    if (!categoryFromUrl) { setActiveCategory(null); return; }
    setActiveCategory(categoryFromUrl);
  }, [searchParams]);

  const showBundles = activeCategory === BUNDLES_KEY;
  const filtered = search.trim()
    ? products.filter((p) => `${p.title || p.name || ''} ${p.short_description || ''} ${p.description || ''}`.toLowerCase().includes(search.toLowerCase()))
    : products;

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] pb-24 text-[var(--text-main)] transition-colors duration-300">
      <section className="mx-auto max-w-[1400px] px-4 pt-8 md:px-8 md:pt-10">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-section)] px-5 py-8 shadow-[0_18px_56px_rgba(6,53,31,.08)] md:px-8 md:py-10">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[color-mix(in_srgb,var(--action-primary)_28%,transparent)] blur-3xl" />
          <p className="relative font-inter text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--theme-accent)]">Millets • Native Rice • Wood-Pressed Oils • Everyday Essentials</p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h1 className="relative max-w-2xl font-syne text-4xl font-extrabold leading-tight tracking-[-0.05em] text-[var(--text-main)] md:text-6xl">Shop better everyday foods.</h1>
            <p className="relative max-w-xl font-inter text-sm leading-7 text-[var(--theme-muted)]">Millets, native rice, wood-pressed oils, pulses, spices, jaggery, dry fruits and everyday groceries chosen to help families make one better choice at a time.</p>
          </div>
        </div>
      </section>

      <section className="sticky top-[var(--yasvik-content-top,8rem)] z-20 border-y border-[var(--theme-border)] bg-[var(--bg-card)]/92 px-4 py-3 shadow-[0_12px_34px_rgba(6,53,31,.06)] backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 md:flex-row md:items-center">
          <div className="relative md:w-[24rem]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--theme-muted)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="h-11 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--bg-canvas)] pl-10 pr-4 font-inter text-sm text-[var(--text-main)] outline-none transition-colors placeholder:text-[var(--theme-muted)]/70 focus:border-[var(--action-primary)] focus:ring-2 focus:ring-[var(--ysv-focus-ring)]" />
          </div>
          <div className="flex flex-1 gap-2 overflow-x-auto hide-scrollbar">
            <button onClick={() => setActiveCategory(null)} className={`h-9 flex-shrink-0 rounded-full px-4 font-inter text-[12px] font-bold transition-colors ${!activeCategory ? 'bg-[var(--theme-header)] text-[var(--theme-header-text)]' : 'border border-[var(--theme-border)] bg-[var(--bg-canvas)] text-[var(--theme-muted)] hover:border-[var(--action-primary)]'}`}>All</button>
            {categories.map((cat) => <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`h-9 flex-shrink-0 rounded-full px-4 font-inter text-[12px] font-bold transition-colors ${activeCategory === cat.id ? 'bg-[var(--theme-header)] text-[var(--theme-header-text)]' : 'border border-[var(--theme-border)] bg-[var(--bg-canvas)] text-[var(--theme-muted)] hover:border-[var(--action-primary)]'}`}>{cat.emotional_title || cat.name}</button>)}
            {combos.length > 0 && <button onClick={() => setActiveCategory(BUNDLES_KEY)} className={`h-9 flex-shrink-0 rounded-full px-4 font-inter text-[12px] font-bold transition-colors ${activeCategory === BUNDLES_KEY ? 'bg-[var(--theme-accent)] text-[var(--action-text)]' : 'border border-[var(--theme-border)] bg-[var(--bg-canvas)] text-[var(--theme-muted)] hover:border-[var(--theme-accent)]'}`}>Bundles</button>}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-7 md:px-8">
        {showBundles ? (
          combosLoading ? <div className="grid grid-cols-1 gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-[var(--bg-card)]" />)}</div>
          : combos.length === 0 ? <EmptyState text="No bundles available." />
          : <div className="grid grid-cols-1 gap-4">{combos.map((combo) => <ComboCard key={combo.id} combo={combo} />)}</div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-[var(--bg-card)]" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState text="No products found." action={search ? <button onClick={() => setSearch('')} className="mt-3 font-inter text-sm font-bold text-[var(--theme-accent)] underline">Clear search</button> : null} />
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {filtered.map((product, i) => <ProductCard key={product.id} product={product} index={i} />)}
          </motion.div>
        )}
      </section>

      {!isLoading && filtered.length > 0 && (
        <div className="mx-auto max-w-[1400px] px-4 pb-8 md:px-8">
          <Link to="/our-roots#roads" className="flex items-center justify-between rounded-2xl border border-[var(--theme-border)] bg-[var(--bg-card)] px-5 py-4 transition-colors hover:bg-[var(--theme-soft)]">
            <div><p className="font-syne text-lg font-bold text-[var(--text-main)]">Explore Our Roots</p><p className="font-inter text-xs text-[var(--theme-muted)]">The stories behind the sourcing</p></div>
            <span className="text-xl text-[var(--theme-accent)]">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}

function EmptyState({ text, action }) {
  return <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--theme-border)] bg-[var(--bg-card)] py-20"><p className="font-inter text-sm text-[var(--theme-muted)]">{text}</p>{action}</div>;
}
