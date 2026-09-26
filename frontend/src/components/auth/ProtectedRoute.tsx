import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

import type { UserRole } from '../../types/common';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
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

  if (allowedRoles && user) {
    // Super Admin has unrestricted access to all protected routes
    const isSuperAdmin = user.role === 'super_admin';
    if (!isSuperAdmin && !allowedRoles.includes(user.role)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-md text-center">
            <h2 className="text-xl font-black text-rose-600 mb-2">Access Restricted</h2>
            <p className="text-sm text-slate-600 mb-4">
              You do not have the required role permissions ({allowedRoles.map((r) => r.replace('_', ' ')).join(', ')}) to access this inventory section.
            </p>
            <Navigate to="/dashboard" replace />
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
