import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { CartProvider } from '@/lib/CartContext';
import { WishlistProvider } from '@/lib/WishlistContext';
import { RecentlyViewedProvider } from '@/lib/RecentlyViewedContext';
import { TrendingProvider } from '@/lib/TrendingContext';
import { UserAffinityProvider } from '@/lib/UserAffinityContext';
import SplashLoader from '@/components/SplashLoader';
import { AnimatePresence } from 'framer-motion';
import {
  fetchAllAppSettings,
  getCachedSetting,
  resolveSetting,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';
import { BRAND_LOGO_HORIZONTAL } from '@/lib/brandAssets';
import { optimizeMediaUrl } from '@/lib/mediaUrl';

const CURRENT_ADMIN_LOGO_URL = BRAND_LOGO_HORIZONTAL;

import AppLayout from './components/AppLayout';
import Home from './pages/Home';
import Shop from './pages/Shop';
import JourneyDetail from './pages/JourneyDetail';
import Stories from './pages/Stories';
import StoryDetail from './pages/StoryDetail';
import ProductDetail from './pages/ProductDetail';
import BundleDetail from './pages/BundleDetail';
import People from './pages/People';
import PersonDetail from './pages/PersonDetail';
import Contact from './pages/Contact';
import PosScan from './pages/PosScan';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Wishlist from './pages/Wishlist';
import FarmingCycle from './pages/FarmingCycle';
import OurRoots from './pages/OurRoots';
import AdminSEO from './pages/admin/AdminSEO';
import AdminSettings from './pages/admin/AdminSettings';
import AdminIllustrations from './pages/admin/AdminIllustrations';
import AdminCombos from './pages/admin/AdminCombos';
import AdminLabelGenerator from './pages/admin/AdminLabelGenerator';
import CheckoutSummary from './pages/CheckoutSummary';
import Profile from './pages/Profile';


import AdminLayout from './components/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminProducts from './pages/admin/AdminProducts.jsx';
import AdminJourneys from './pages/admin/AdminJourneys';
import AdminStories from './pages/admin/AdminStories';
import AdminPeople from './pages/admin/AdminPeople';
import AdminCategories from './pages/admin/AdminCategories';
import AdminMedia from './pages/admin/AdminMedia';
import AdminOrders from './pages/admin/AdminOrders';
import AdminPOS from './pages/admin/AdminPOS';
import AdminPricingStrategy from './pages/admin/AdminPricingStrategy';
import AdminPageVisibility from './pages/admin/AdminPageVisibility';
import OrderTracking from './pages/OrderTracking';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLogin from './pages/AdminLogin';
import SeoMetaManager from './components/SeoMetaManager';
import GoogleAnalytics from './components/GoogleAnalytics';
import ThemeVariables from './components/ThemeVariables';

function RouteScrollManager() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }, [pathname, search, hash]);

  useEffect(() => {
    if (!hash) return;
    const id = hash.replace('#', '');
    const scrollToAnchor = () => {
      const target = document.getElementById(id);
      if (!target) return false;
      target.scrollIntoView({ behavior: 'auto', block: 'start' });
      return true;
    };

    if (scrollToAnchor()) return;
    const t1 = window.setTimeout(scrollToAnchor, 120);
    const t2 = window.setTimeout(scrollToAnchor, 320);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [pathname, hash]);

  return null;
}

const AuthenticatedApp = () => {
  const location = useLocation();
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  const { data: appSettings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.splash,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });

  const cachedSplashLogo = getCachedSetting('brand_logo_horizontal_url', CURRENT_ADMIN_LOGO_URL);
  const heroLogoUrl = optimizeMediaUrl(String(resolveSetting(appSettings, 'brand_logo_horizontal_url', cachedSplashLogo)), 'logo');
  const heroLogoWidth = Math.min(Math.max(Number(resolveSetting(appSettings, 'brand_logo_splash_width', getCachedSetting('brand_logo_splash_width', 220))), 160), 360);
  const heroLogoHeight = Math.min(Math.max(Number(resolveSetting(appSettings, 'brand_logo_splash_height', getCachedSetting('brand_logo_splash_height', 78))), 48), 120);

  const skipSplashForPath = /^\/(privacy|terms|contact)?$/.test(location.pathname);
  const showSplash = (isLoadingPublicSettings || isLoadingAuth) && !skipSplashForPath;

  if (showSplash) {
    return (
      <AnimatePresence>
        <SplashLoader 
          logoUrl={heroLogoUrl} 
          logoWidth={heroLogoWidth} 
          logoHeight={heroLogoHeight}
        />
      </AnimatePresence>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      const isProtectedRoute = /^\/(admin|profile|checkout)(\/|$)/.test(location.pathname);
      if (isProtectedRoute) {
        navigateToLogin();
        return null;
      }
    }
  }

  return (
    <Routes>
      {/* Auth pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/pos-scan" element={<PosScan />} />

      {/* Public site */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/our-roots" element={<OurRoots />} />
        <Route path="/journeys" element={<Navigate to="/our-roots#roads" replace />} />
        <Route path="/journeys/:id" element={<JourneyDetail />} />
        <Route path="/stories" element={<Stories />} />
        <Route path="/stories/:id" element={<StoryDetail />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/bundles/:slug" element={<BundleDetail />} />
        <Route path="/farmers" element={<People />} />
        <Route path="/farmers/:id" element={<PersonDetail />} />
        <Route path="/people" element={<Navigate to="/farmers" replace />} />
        <Route path="/people/:id" element={<PersonDetail />} />
        <Route path="/producers" element={<Navigate to="/farmers" replace />} />
        <Route path="/producers/:id" element={<PersonDetail />} />
        <Route path="/checkout" element={<CheckoutSummary />} />
        <Route path="/profile" element={<Profile />} />

        <Route path="/farming-cycle" element={<FarmingCycle />} />
        <Route path="/about" element={<Navigate to="/our-roots#philosophy" replace />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/orders/:orderId/track" element={<OrderTracking />} />
      </Route>

      {/* Admin CMS (requires login) */}
      <Route
        element={
          <ProtectedRoute
            unauthenticatedElement={<Navigate to="/admin-login" replace />}
            requiredRoles={['admin', 'staff']}
            forbiddenElement={<Navigate to="/admin-login" replace />}
          />
        }
      >
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="labels" element={<AdminLabelGenerator />} />
          <Route path="journeys" element={<AdminJourneys />} />
          <Route path="stories" element={<AdminStories />} />
          <Route path="people" element={<AdminPeople />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="media" element={<AdminMedia />} />
          <Route path="seo" element={<AdminSEO />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="illustrations" element={<AdminIllustrations />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="pos" element={<AdminPOS />} />
          <Route path="pricing" element={<AdminPricingStrategy />} />
          <Route path="combos" element={<AdminCombos />} />
          <Route path="regions" element={<Navigate to="/admin/settings" replace />} />
          <Route path="page-heroes" element={<Navigate to="/admin/illustrations" replace />} />
          <Route path="page-visibility" element={<AdminPageVisibility />} />
          <Route path="collections" element={<Navigate to="/admin/settings" replace />} />
          <Route path="homepage" element={<Navigate to="/admin/settings" replace />} />
          <Route path="hero" element={<Navigate to="/admin/illustrations" replace />} />
          <Route path="pages" element={<Navigate to="/admin/settings" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <CartProvider>
          <WishlistProvider>
            <TrendingProvider>
            <UserAffinityProvider>
            <RecentlyViewedProvider>
              <Router>
                <RouteScrollManager />
                <ThemeVariables />
                <SeoMetaManager />
                <GoogleAnalytics />
                <AuthenticatedApp />
              </Router>
              <Toaster />
            </RecentlyViewedProvider>
            </UserAffinityProvider>
            </TrendingProvider>
          </WishlistProvider>
        </CartProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
