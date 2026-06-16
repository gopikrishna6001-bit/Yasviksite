import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Map, BookOpen, Users, Tag,
  Globe, Image, X, Search, Settings, Gift, ShoppingBag, Layers, LogOut, Menu
} from 'lucide-react';
import { appClient } from '@/api/appClient';

const NAV_SECTIONS = [
  {
    title: 'Core',
    items: [
      { label: 'Overview', path: '/admin', icon: LayoutDashboard },
      { label: 'Orders', path: '/admin/orders', icon: ShoppingBag },
      { label: 'Products', path: '/admin/products', icon: Package },
      { label: 'Categories', path: '/admin/categories', icon: Tag },
      { label: 'Media', path: '/admin/media', icon: Image },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Journeys', path: '/admin/journeys', icon: Map },
      { label: 'Stories', path: '/admin/stories', icon: BookOpen },
      { label: 'People', path: '/admin/people', icon: Users },
      { label: 'Regions', path: '/admin/regions', icon: Globe },
      { label: 'Combos', path: '/admin/combos', icon: Gift },
    ],
  },
  {
    title: 'Site',
    items: [
      { label: 'Page Heroes', path: '/admin/page-heroes', icon: Layers },
      { label: 'Hamburger Menu', path: '/admin/page-visibility', icon: Menu },
      { label: 'SEO Manager', path: '/admin/seo', icon: Search },
      { label: 'Settings', path: '/admin/settings', icon: Settings },
    ],
  },
];

function NavLinkItem({ item, active, onClose }) {
  const Icon = item.icon;
  return (
    <Link
      key={item.path}
      to={item.path}
      onClick={onClose}
      className={`flex items-center gap-3 px-6 py-2.5 font-inter text-sm transition-all ${
        active
          ? 'text-white bg-white/10 border-r-2 border-warm-turmeric'
          : 'text-white/50 hover:text-white/80 hover:bg-white/5'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {item.label}
    </Link>
  );
}

export default function AdminSidebar({ onClose }) {
  const location = useLocation();

  const handleLogout = async () => {
    await appClient.auth.logout('/admin-login');
  };

  const isActive = (path) => (path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(path));

  return (
    <div className="flex flex-col h-full bg-rain-cloud text-white">
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div>
          <h1 className="font-cormorant text-xl text-white/90 font-light">Yasvik</h1>
          <p className="font-inter text-[10px] text-white/35 mt-0.5 tracking-widest uppercase">Content Studio</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-2">
            <p className="px-6 py-1.5 font-inter text-[10px] uppercase tracking-[0.18em] text-white/30">{section.title}</p>
            {section.items.map((item) => (
              <NavLinkItem key={item.path} item={item} active={isActive(item.path)} onClose={onClose} />
            ))}
          </div>
        ))}
      </nav>

      <div className="p-6 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full mb-3 flex items-center gap-2 font-inter text-xs text-white/45 hover:text-white/80 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
        <Link
          to="/"
          className="font-inter text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          ← Back to site
        </Link>
      </div>
    </div>
  );
}
