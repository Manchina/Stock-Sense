import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, login, logout } = useAuthStore();
  return {
    user,
    isAuthenticated,
    isLoading,
    isManager: user?.role === 'inventory_manager' || user?.role === 'admin',
    isStaff: user?.role === 'warehouse_staff',
    login,
    logout,
  };
};
