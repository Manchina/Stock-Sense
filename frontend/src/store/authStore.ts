import { create } from 'zustand';
import { User } from '../types/common';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, role?: User['role']) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const DEFAULT_USER: User = {
  id: 'usr-1',
  name: 'Sarah Connor',
  email: 'sarah.connor@stocksense.io',
  role: 'inventory_manager',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  warehouseId: 'wh-1',
};

export const useAuthStore = create<AuthState>((set) => ({
  user: DEFAULT_USER,
  token: 'mock-jwt-token-stocksense',
  isAuthenticated: true,
  isLoading: false,
  login: async (email, role = 'inventory_manager') => {
    set({ isLoading: true });
    // Simulate auth
    await new Promise((res) => setTimeout(res, 500));
    const loggedUser: User = {
      id: 'usr-' + Date.now(),
      name: email.split('@')[0].replace('.', ' '),
      email,
      role,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      warehouseId: 'wh-1',
    };
    localStorage.setItem('stocksense_auth_token', 'mock-jwt-token-stocksense');
    set({ user: loggedUser, token: 'mock-jwt-token-stocksense', isAuthenticated: true, isLoading: false });
  },
  logout: () => {
    localStorage.removeItem('stocksense_auth_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
