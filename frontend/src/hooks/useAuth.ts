import { useAuthStore } from '../store/authStore';
import type { UserRole } from '../types/common';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, login, logout } = useAuthStore();
  
  const isSuperAdmin = user?.role === 'super_admin';
  const isManager = isSuperAdmin || user?.role === 'inventory_manager';
  const isStaff = user?.role === 'warehouse_staff';

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return roles.includes(user.role);
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    isSuperAdmin,
    isManager,
    isStaff,
    hasRole,
    canManageWarehouses: isSuperAdmin || isManager,
    canManageProducts: isSuperAdmin || isManager,
    canDeleteProducts: isSuperAdmin,
    login,
    logout,
  };
};
