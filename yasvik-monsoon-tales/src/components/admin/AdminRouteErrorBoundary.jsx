import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Catches render errors inside a single admin screen so the sidebar stays usable
 * and the failure is visible instead of a blank white page.
 */
export default class AdminRouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    const label = this.props.routeLabel || 'Admin page';
    console.error(`[yasvik admin] ${label} crashed:`, error, info);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    const label = this.props.routeLabel || 'This admin page';
    const message = this.state.error?.message || String(this.state.error);

    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <p className="font-inter text-xs font-semibold uppercase tracking-wider text-red-600">
            Admin error
          </p>
          <h1 className="mt-2 font-cormorant text-2xl font-semibold text-rain-cloud">
            {label} could not load
          </h1>
          <p className="mt-2 font-inter text-sm text-rain-cloud/65">
            Something broke while rendering this screen. Other admin pages should still work.
            Try again — if it keeps failing, note the message below.
          </p>
          <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-rain-mist/50 p-3 font-mono text-[11px] text-rain-cloud/80 whitespace-pre-wrap">
            {message}
          </pre>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-full bg-forest-canopy px-4 py-2 font-inter text-sm font-medium text-white hover:bg-forest-canopy/90"
            >
              Try again
            </button>
            <Link
              to="/admin"
              className="rounded-full border border-border px-4 py-2 font-inter text-sm font-medium text-rain-cloud hover:bg-rain-mist/50"
            >
              Admin home
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

const ADMIN_ROUTE_LABELS = {
  '/admin': 'Overview',
  '/admin/products': 'Products',
  '/admin/labels': 'Labels',
  '/admin/pricing': 'Pricing strategy',
  '/admin/pos': 'POS',
  '/admin/orders': 'Orders',
  '/admin/inventory': 'Inventory',
  '/admin/categories': 'Categories',
  '/admin/settings': 'Settings',
};

export function adminRouteLabel(pathname = '') {
  if (ADMIN_ROUTE_LABELS[pathname]) return ADMIN_ROUTE_LABELS[pathname];
  const base = Object.keys(ADMIN_ROUTE_LABELS)
    .filter((path) => path !== '/admin')
    .find((path) => pathname.startsWith(path));
  return base ? ADMIN_ROUTE_LABELS[base] : 'Admin page';
}
