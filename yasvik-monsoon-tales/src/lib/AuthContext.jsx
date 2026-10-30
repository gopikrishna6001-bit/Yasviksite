import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { appClient } from '@/api/appClient';
import { supabase } from '@/api/supabaseClient';
import { getPrivilegedStaffAuthViolation } from '@/lib/adminAuthPolicy';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }
  const authInFlight = useRef(null);
  const hasResolvedAuth = useRef(false);

  useEffect(() => {
    checkAppState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // Soft revalidation — never flip the full-page loading gate after first resolve.
        checkUserAuth({ soft: true });
      }
      if (event === 'SIGNED_OUT') {
        hasResolvedAuth.current = true;
        setUser(null);
        setIsAuthenticated(false);
        setAuthChecked(true);
        setIsLoadingAuth(false);
      }
    });

    // Do NOT re-run auth on window focus / visibility.
    // Opening the OS photo gallery blurs the page; a hard recheck was unmounting Admin
    // (isLoadingAuth=true → spinner) and destroying the file input before onChange fired.
    // That made Media Library / combo hero uploads look completely broken.

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      setAppPublicSettings(null);
      await Promise.race([
        checkUserAuth({ soft: false }),
        new Promise((_, reject) => {
          window.setTimeout(() => reject(new Error('auth_check_timeout')), 4000);
        }),
      ]);
      setIsLoadingPublicSettings(false);
    } catch (error) {
      console.error('Unexpected error:', error);
      hasResolvedAuth.current = true;
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      setIsLoadingPublicSettings(false);
    }
  };

  const checkUserAuth = async ({ soft = false } = {}) => {
    if (authInFlight.current) return authInFlight.current;

    const run = (async () => {
      try {
        // Only block the UI on the first auth resolution. Soft checks must not
        // remount ProtectedRoute or file inputs will be destroyed mid-picker.
        if (!soft && !hasResolvedAuth.current) {
          setIsLoadingAuth(true);
        }
        const currentUser = await appClient.auth.me();
        const policyError = getPrivilegedStaffAuthViolation(currentUser?.role, currentUser);
        if (policyError) {
          await supabase.auth.signOut();
          hasResolvedAuth.current = true;
          setUser(null);
          setIsAuthenticated(false);
          setAuthError({ type: 'privileged_staff_reauth', message: policyError.message });
          setIsLoadingAuth(false);
          setAuthChecked(true);
          return;
        }
        setUser(currentUser);
        setIsAuthenticated(true);
        setAuthError(null);
        hasResolvedAuth.current = true;
        setIsLoadingAuth(false);
        setAuthChecked(true);
      } catch (error) {
        const message = String(error?.message || error || '');
        if (!/auth session missing/i.test(message)) {
          console.error('User auth check failed:', error);
        }
        hasResolvedAuth.current = true;
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setAuthChecked(true);
      } finally {
        authInFlight.current = null;
      }
    })();

    authInFlight.current = run;
    return run;
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      appClient.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      appClient.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    appClient.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
