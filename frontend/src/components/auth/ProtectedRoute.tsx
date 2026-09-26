import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'inventory_manager' | 'warehouse_staff' | 'admin'>;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-md text-center">
          <h2 className="text-xl font-black text-rose-600 mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-600 mb-4">
            You do not have the required permissions to access this inventory section.
          </p>
          <Navigate to="/dashboard" replace />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
