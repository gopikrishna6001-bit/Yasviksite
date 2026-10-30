import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { adminLandingPath, canAccessAdminPath } from '@/lib/adminAccess';

export default function AdminPathGuard() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!canAccessAdminPath(user?.role, pathname)) {
    return <Navigate to={adminLandingPath(user?.role)} replace />;
  }

  return <Outlet />;
}
