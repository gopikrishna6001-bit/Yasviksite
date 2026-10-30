import { Link, useLocation } from 'react-router-dom';
import { Package, Calculator, Tag, Boxes } from 'lucide-react';

const TABS = [
  { id: 'products', label: 'Products', path: '/admin/products', icon: Package },
  { id: 'pricing', label: 'Pricing', path: '/admin/pricing', icon: Calculator },
  { id: 'packaging', label: 'Packaging', path: '/admin/packaging', icon: Boxes },
  { id: 'labels', label: 'Labels', path: '/admin/labels', icon: Tag },
];

export default function AdminCatalogueTabs() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Catalogue"
      className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-white p-1.5 shadow-sm"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = pathname === tab.path || pathname.startsWith(`${tab.path}/`);
        return (
          <Link
            key={tab.id}
            to={tab.path}
            className={`inline-flex flex-1 min-w-[7rem] items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-inter text-sm transition-colors ${
              active
                ? 'bg-forest-canopy text-white shadow-sm'
                : 'text-rain-cloud/65 hover:bg-rain-mist/50 hover:text-rain-cloud'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
