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

function getRegionLabel(product) {
  return String(product?.origin_region || product?.region_name || product?.sourcing_location || product?.location_label || '').trim();
}

function sortProducts(items, sort) {
  const list = [...items];
  if (sort === 'price-low') return list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  if (sort === 'price-high') return list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  if (sort === 'name') return list.sort((a, b) => String(a.title || a.name || '').localeCompare(String(b.title || b.name || '')));
  return list;
}

export default function Shop() {
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [activeRegion, setActiveRegion] = useState('');
  const [sort, setSort] = useState('latest');
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
  const regions = [...new Set(products.map(getRegionLabel).filter(Boolean))].slice(0, 12);
  const filtered = sortProducts(
    products
      .filter((p) => !activeRegion || getRegionLabel(p) === activeRegion)
      .filter((p) => !search.trim() || `${p.title || p.name || ''} ${p.short_description || ''} ${p.description || ''}`.toLowerCase().includes(search.toLowerCase())),
    sort,
  );

  return (
    <div className="min-h-screen bg-[#F8F4E7] pb-24 text-[#1F1710] transition-colors duration-300">
      <section className="mx-auto max-w-[1400px] px-4 pt-8 md:px-8 md:pt-10">
        <div className="relative overflow-hidden rounded-[34px] border border-[#E4D7B9] bg-[#FFFDF3] px-5 py-9 shadow-[0_18px_56px_rgba(43,33,24,.08)] md:px-9 md:py-12">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#E8D4A7] blur-3xl" />
          <p className="relative font-inter text-[11px] font-bold uppercase tracking-[0.16em] text-[#9A6B32]">Millets • Native Rice • Wood-Pressed Oils • Everyday Essentials</p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h1 className="relative max-w-2xl font-cormorant text-5xl font-semibold leading-none text-[#1F1710] md:text-7xl">Shop better everyday foods.</h1>
            <p className="relative max-w-xl font-inter text-sm leading-7 text-[#6E604C]">Millets, native rice, wood-pressed oils, pulses, spices, jaggery, dry fruits and everyday groceries chosen to help families make one better choice at a time.</p>
          </div>
        </div>
      </section>

      <section className="sticky top-[var(--yasvik-content-top,8rem)] z-20 border-y border-[#E4D7B9] bg-[#FFFDF3]/94 px-4 py-3 shadow-[0_12px_34px_rgba(43,33,24,.06)] backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative lg:w-[22rem]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E604C]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="h-11 w-full rounded-full border border-[#E4D7B9] bg-[#F8F4E7] pl-10 pr-4 font-inter text-sm text-[#1F1710] outline-none transition-colors placeholder:text-[#6E604C]/70 focus:border-[#5F873F] focus:ring-2 focus:ring-[#5F873F]/20" />
          </div>
          <div className="flex flex-1 gap-2 overflow-x-auto hide-scrollbar">
            <button onClick={() => setActiveCategory(null)} className={`h-9 flex-shrink-0 rounded-full px-4 font-inter text-[12px] font-bold transition-colors ${!activeCategory ? 'bg-[#1F1710] text-[#FFFDF3]' : 'border border-[#E4D7B9] bg-[#F8F4E7] text-[#6E604C] hover:border-[#5F873F]'}`}>All</button>
            {categories.map((cat) => <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`h-9 flex-shrink-0 rounded-full px-4 font-inter text-[12px] font-bold transition-colors ${activeCategory === cat.id ? 'bg-[#1F1710] text-[#FFFDF3]' : 'border border-[#E4D7B9] bg-[#F8F4E7] text-[#6E604C] hover:border-[#5F873F]'}`}>{cat.emotional_title || cat.name}</button>)}
            {combos.length > 0 && <button onClick={() => setActiveCategory(BUNDLES_KEY)} className={`h-9 flex-shrink-0 rounded-full px-4 font-inter text-[12px] font-bold transition-colors ${activeCategory === BUNDLES_KEY ? 'bg-[#B96A2E] text-[#FFFDF3]' : 'border border-[#E4D7B9] bg-[#F8F4E7] text-[#6E604C] hover:border-[#B96A2E]'}`}>Bundles</button>}
          </div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {regions.length > 0 && (
              <select value={activeRegion} onChange={(e) => setActiveRegion(e.target.value)} className="h-9 rounded-full border border-[#E4D7B9] bg-[#F8F4E7] px-3 font-inter text-[12px] font-bold text-[#6E604C] outline-none focus:border-[#5F873F]">
                <option value="">All regions</option>
                {regions.map((region) => <option key={region} value={region}>{region}</option>)}
              </select>
            )}
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 rounded-full border border-[#E4D7B9] bg-[#F8F4E7] px-3 font-inter text-[12px] font-bold text-[#6E604C] outline-none focus:border-[#5F873F]">
              <option value="latest">Latest</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-7 md:px-8">
        {showBundles ? (
          combosLoading ? <div className="grid grid-cols-1 gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-[var(--bg-card)]" />)}</div>
          : combos.length === 0 ? <EmptyState text="No harvests found for this journey — try a different season or region." />
          : <div className="grid grid-cols-1 gap-4">{combos.map((combo) => <ComboCard key={combo.id} combo={combo} />)}</div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-[#FFFDF3]" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState text="No harvests found for this journey — try a different season or region." action={search ? <button onClick={() => setSearch('')} className="mt-3 font-inter text-sm font-bold text-[#2D5C35] underline">Clear search</button> : null} />
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {filtered.map((product, i) => <ProductCard key={product.id} product={product} index={i} />)}
          </motion.div>
        )}
      </section>

      {!isLoading && filtered.length > 0 && (
        <div className="mx-auto max-w-[1400px] px-4 pb-8 md:px-8">
          <Link to="/our-roots#roads" className="flex items-center justify-between rounded-2xl border border-[#E4D7B9] bg-[#FFFDF3] px-5 py-4 transition-colors hover:bg-[#F4ECD8]">
            <div><p className="font-cormorant text-2xl font-semibold text-[#1F1710]">Explore Our Roots</p><p className="font-inter text-xs text-[#6E604C]">The stories behind the sourcing</p></div>
            <span className="text-xl text-[#B96A2E]">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}

function EmptyState({ text, action }) {
  return <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E4D7B9] bg-[#FFFDF3] py-20 text-center"><p className="max-w-sm font-cormorant text-2xl font-semibold text-[#1F1710]">{text}</p>{action}</div>;
}
