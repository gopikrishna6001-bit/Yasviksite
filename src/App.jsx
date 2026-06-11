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
  resolveSetting,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';

import AppLayout from './components/AppLayout';
import Home from './pages/Home';
import Shop from './pages/Shop';
import JourneyDetail from './pages/JourneyDetail';
import Stories from './pages/Stories';
import StoryDetail from './pages/StoryDetail';
import ProductDetail from './pages/ProductDetail';
import People from './pages/People';
import PersonDetail from './pages/PersonDetail';
import Contact from './pages/Contact';
import Wishlist from './pages/Wishlist';
import FarmingCycle from './pages/FarmingCycle';
import OurRoots from './pages/OurRoots';
import AdminSEO from './pages/admin/AdminSEO';
import AdminSettings from './pages/admin/AdminSettings';
import AdminCombos from './pages/admin/AdminCombos';
import Recipes from './pages/Recipes';
import RecipeDetail from './pages/RecipeDetail';
import CheckoutSummary from './pages/CheckoutSummary';
import Profile from './pages/Profile';


import AdminLayout from './components/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminProducts from './pages/admin/AdminProducts.jsx';
import AdminJourneys from './pages/admin/AdminJourneys';
import AdminStories from './pages/admin/AdminStories';
import AdminPeople from './pages/admin/AdminPeople';
import AdminCategories from './pages/admin/AdminCategories';
import AdminRegions from './pages/admin/AdminRegions';
import AdminMedia from './pages/admin/AdminMedia';
import AdminOrders from './pages/admin/AdminOrders';
import AdminPageHeroes from './pages/admin/AdminPageHeroes';
import AdminPageVisibility from './pages/admin/AdminPageVisibility';
import OrderTracking from './pages/OrderTracking';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLogin from './pages/AdminLogin';
import SeoMetaManager from './components/SeoMetaManager';
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
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  const { data: appSettings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.splash,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });

  const heroLogoUrl = String(resolveSetting(appSettings, 'brand_logo_symbol_url', '/brand-logos/symbol-original.svg'));
  const heroLogoWidth = Number(resolveSetting(appSettings, 'brand_logo_splash_width', 80));
  const heroLogoHeight = Number(resolveSetting(appSettings, 'brand_logo_splash_height', 80));

  if (isLoadingPublicSettings || isLoadingAuth) {
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
      navigateToLogin();
      return null;
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
        <Route path="/people" element={<People />} />
        <Route path="/people/:id" element={<PersonDetail />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/recipes/:id" element={<RecipeDetail />} />
        <Route path="/checkout" element={<CheckoutSummary />} />
        <Route path="/profile" element={<Profile />} />

        <Route path="/farming-cycle" element={<FarmingCycle />} />
        <Route path="/about" element={<Navigate to="/our-roots#philosophy" replace />} />
        <Route path="/contact" element={<Contact />} />
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
          <Route path="journeys" element={<AdminJourneys />} />
          <Route path="stories" element={<AdminStories />} />
          <Route path="people" element={<AdminPeople />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="regions" element={<AdminRegions />} />
          <Route path="media" element={<AdminMedia />} />
          <Route path="seo" element={<AdminSEO />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="combos" element={<AdminCombos />} />
          <Route path="page-heroes" element={<AdminPageHeroes />} />
          <Route path="page-visibility" element={<AdminPageVisibility />} />
          <Route path="collections" element={<Navigate to="/admin/settings" replace />} />
          <Route path="homepage" element={<Navigate to="/admin/settings" replace />} />
          <Route path="hero" element={<Navigate to="/admin/page-heroes" replace />} />
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
