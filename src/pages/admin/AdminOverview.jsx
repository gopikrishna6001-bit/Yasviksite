import { useQuery } from '@tanstack/react-query';
import { products as productsApi, journeys as journeysApi, stories as storiesApi, people as peopleApi, mediaAssets, categories as categoriesApi } from '@/services/api';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Package, Map, BookOpen, Users, Image, Tag } from 'lucide-react';

function StatCard({ label, count, icon: Icon, to, color }) {
  return (
    <Link to={to}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-inter text-xs text-rain-cloud/45 uppercase tracking-wider">{label}</p>
            <p className="font-cormorant text-4xl text-rain-cloud mt-2 font-medium">{count ?? '—'}</p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default function AdminOverview() {
  const { data: products = [] } = useQuery({ queryKey: ['admin-products-count'], queryFn: () => productsApi.list('-created_date', 100) });
  const { data: journeys = [] } = useQuery({ queryKey: ['admin-journeys-count'], queryFn: () => journeysApi.list('sort_order', 100) });
  const { data: stories = [] } = useQuery({ queryKey: ['admin-stories-count'], queryFn: () => storiesApi.list('-created_date', 100) });
  const { data: people = [] } = useQuery({ queryKey: ['admin-people-count'], queryFn: () => peopleApi.list('-created_date', 100) });
  const { data: media = [] } = useQuery({ queryKey: ['admin-media-count'], queryFn: () => mediaAssets.list('-created_date', 100) });
  const { data: categories = [] } = useQuery({ queryKey: ['admin-categories-count'], queryFn: () => categoriesApi.list('sort_order', 100) });

  const stats = [
    { label: 'Products', count: products.length, icon: Package, to: '/admin/products', color: '#6E5846' },
    { label: 'Journeys', count: journeys.length, icon: Map, to: '/admin/journeys', color: '#5B7A4B' },
    { label: 'Stories', count: stories.length, icon: BookOpen, to: '/admin/stories', color: '#2F3A34' },
    { label: 'People', count: people.length, icon: Users, to: '/admin/people', color: '#D1A14B' },
    { label: 'Media Assets', count: media.length, icon: Image, to: '/admin/media', color: '#8BA66D' },
    { label: 'Categories', count: categories.length, icon: Tag, to: '/admin/categories', color: '#CBBCA5' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-cormorant text-3xl text-rain-cloud font-medium">Overview</h1>
        <p className="font-inter text-sm text-rain-cloud/45 mt-1">Your Yasvik content at a glance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="font-cormorant text-xl text-rain-cloud font-medium mb-5">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Add New Product', to: '/admin/products', color: '#6E5846' },
            { label: 'Create Journey', to: '/admin/journeys', color: '#5B7A4B' },
            { label: 'Write a Story', to: '/admin/stories', color: '#2F3A34' },
            { label: 'Add Person', to: '/admin/people', color: '#D1A14B' },
          ].map(a => (
            <Link
              key={a.label}
              to={a.to}
              className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-temple-stone transition-all"
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
              <span className="font-inter text-sm text-rain-cloud/70">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}