import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminInstallPrompt from './AdminInstallPrompt';
import { Menu, PanelLeftOpen } from 'lucide-react';
import { setPosSidebarHidden, usePosSidebarHidden } from '@/lib/posSidebarStore';
import { applyAdminPwaHead } from '@/lib/pwaUtils';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
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

        <main className={`flex-1 min-h-0 ${isPosRoute ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
