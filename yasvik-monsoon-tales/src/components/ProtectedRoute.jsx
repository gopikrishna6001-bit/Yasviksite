import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { canAccessAdminPath, isAdminRole } from '@/lib/adminAccess';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({
  fallback = <DefaultFallback />,
  unauthenticatedElement,
  requiredRoles = null,
  requiredPath = null,
  forbiddenElement = null,
}) {
  const { isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth, user } = useAuth();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  if (user?.is_active === false) {
    return forbiddenElement || unauthenticatedElement;
  }

  if (Array.isArray(requiredRoles) && requiredRoles.length > 0) {
    const role = (user?.role || '').toLowerCase();
    const allowed = requiredRoles.map((r) => String(r).toLowerCase()).includes(role);
    if (!allowed) return forbiddenElement || unauthenticatedElement;
  }

  if (requiredPath && (!isAdminRole(user?.role) || !canAccessAdminPath(user?.role, requiredPath))) {
    return forbiddenElement || unauthenticatedElement;
  }

  return <Outlet />;
}
