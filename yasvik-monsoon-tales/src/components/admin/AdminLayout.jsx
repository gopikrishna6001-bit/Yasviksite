import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminInstallPrompt from './AdminInstallPrompt';
import AdminRouteErrorBoundary, { adminRouteLabel } from './AdminRouteErrorBoundary';
import { Menu, PanelLeftOpen, Search } from 'lucide-react';
import { setPosSidebarHidden, usePosSidebarHidden } from '@/lib/posSidebarStore';
import { applyAdminPwaHead } from '@/lib/pwaUtils';
import { useAuth } from '@/lib/AuthContext';
import { canAccessAdminPath } from '@/lib/adminAccess';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalQ, setGlobalQ] = useState('');
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPosRoute = pathname.startsWith('/admin/pos');
  const { hidden: posSidebarHidden } = usePosSidebarHidden();
  const collapseSidebar = isPosRoute && posSidebarHidden;

  useEffect(() => {
    const cleanupPwa = applyAdminPwaHead();
    const body = document.body;
    const prev = {
      paddingTop: body.style.paddingTop,
      paddingLeft: body.style.paddingLeft,
      paddingRight: body.style.paddingRight,
      overflow: body.style.overflow,
    };
    body.style.paddingTop = '0';
    body.style.paddingLeft = '0';
    body.style.paddingRight = '0';
    body.style.overflow = 'hidden';
    return () => {
      cleanupPwa();
      body.style.paddingTop = prev.paddingTop;
      body.style.paddingLeft = prev.paddingLeft;
      body.style.paddingRight = prev.paddingRight;
      body.style.overflow = prev.overflow;
    };
  }, []);

  const runGlobalSearch = (e) => {
    e.preventDefault();
    const q = globalQ.trim();
    if (!q) return;
    navigate(`/admin/customers?q=${encodeURIComponent(q)}`);
    setGlobalQ('');
  };

  return (
    <div className="flex h-[100dvh] bg-rain-mist overflow-hidden">
      {/* Desktop sidebar — collapses on POS when counter focus is on */}
      <aside
        className={`hidden lg:flex flex-shrink-0 overflow-hidden transition-[width] duration-200 ease-out ${
          collapseSidebar ? 'w-0' : 'w-60'
        }`}
        aria-hidden={collapseSidebar}
      >
        <div className="w-60 h-full flex-shrink-0">
          <AdminSidebar />
        </div>
      </aside>

      {/* Restore menu tab when POS sidebar is hidden */}
      {collapseSidebar && (
        <button
          type="button"
          onClick={() => setPosSidebarHidden(false)}
          className="hidden lg:flex fixed left-0 top-1/2 z-50 -translate-y-1/2 flex-col items-center gap-1.5 rounded-r-xl border border-l-0 border-warm-turmeric/50 bg-rain-cloud px-3 py-4 text-white shadow-lg hover:bg-wet-earth/95 transition-colors"
          title="Show admin menu"
        >
          <PanelLeftOpen className="w-5 h-5 text-warm-turmeric" />
          <span className="font-inter text-[9px] uppercase tracking-wider text-white/85">Menu</span>
        </button>
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-rain-cloud/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-64 flex-shrink-0">
            <AdminSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="lg:hidden admin-safe-top">
          <AdminInstallPrompt />
          <div className="flex items-center gap-4 px-5 py-4 bg-white border-b border-border">
            <button type="button" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5 text-rain-cloud/60" />
            </button>
            <span className="font-cormorant text-lg text-rain-cloud">Yasvik Admin</span>
          </div>
        </div>

        <main className={`flex-1 min-h-0 flex flex-col ${isPosRoute ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {!isPosRoute && canAccessAdminPath(user?.role, '/admin/customers') && (
            <form
              onSubmit={runGlobalSearch}
              className="hidden lg:flex items-center gap-2 px-6 py-3 border-b border-border/40 bg-white/70"
            >
              <Search className="w-4 h-4 text-rain-cloud/35" />
              <input
                value={globalQ}
                onChange={(e) => setGlobalQ(e.target.value)}
                placeholder="Search customers by name, mobile, or invoice…"
                className="flex-1 bg-transparent font-inter text-sm outline-none placeholder:text-rain-cloud/35"
              />
            </form>
          )}
          <div className="flex flex-1 flex-col min-h-0">
            <AdminRouteErrorBoundary routeLabel={adminRouteLabel(pathname)} resetKey={pathname}>
              <Outlet />
            </AdminRouteErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
