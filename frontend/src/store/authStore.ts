import { create } from 'zustand';
import { api } from '../lib/api';
import type { User } from '../types/common';

interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    name: string;
    email: string;
    password: string;
    role?: 'inventory_manager' | 'warehouse_staff';
  }) => Promise<void>;
  updateProfile: (data: {
    name?: string;
    email?: string;
    role?: 'inventory_manager' | 'warehouse_staff';
  }) => Promise<User>;
  checkAuth: () => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  clearError: () => void;
}

const getStoredToken = () => localStorage.getItem('stocksense_auth_token');
const getStoredRefreshToken = () => localStorage.getItem('stocksense_refresh_token');
const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem('stocksense_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getStoredUser(),
  token: getStoredToken(),
  refreshToken: getStoredRefreshToken(),
  isAuthenticated: !!getStoredToken(),
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.post<AuthResponse>('/auth/login', {
        email,
        password,
      });

      localStorage.setItem('stocksense_auth_token', data.token);
      localStorage.setItem('stocksense_refresh_token', data.refreshToken);
      localStorage.setItem('stocksense_user', JSON.stringify(data.user));

      set({
        user: data.user,
        token: data.token,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      set({ isLoading: false, error: msg });
      throw err;
    }
  },

  signup: async (signupData) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.post<AuthResponse>('/auth/signup', signupData);

      localStorage.setItem('stocksense_auth_token', data.token);
      localStorage.setItem('stocksense_refresh_token', data.refreshToken);
      localStorage.setItem('stocksense_user', JSON.stringify(data.user));

      set({
        user: data.user,
        token: data.token,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      set({ isLoading: false, error: msg });
      throw err;
    }
  },

  updateProfile: async (profileData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.put<{ user: User }>('/auth/me', profileData);
      localStorage.setItem('stocksense_user', JSON.stringify(res.user));
      set({
        user: res.user,
        isLoading: false,
        error: null,
      });
      return res.user;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.';
      set({ isLoading: false, error: msg });
      throw err;
    }
  },

  checkAuth: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ isAuthenticated: false, user: null, token: null });
      return;
    }

    try {
      const res = await api.get<{ user: User }>('/auth/me');
      set({ user: res.user, isAuthenticated: true });
      localStorage.setItem('stocksense_user', JSON.stringify(res.user));
    } catch {
      // Try refresh token if access token check failed
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        try {
          const refreshed = await api.post<AuthResponse>('/auth/refresh', { refreshToken });
          localStorage.setItem('stocksense_auth_token', refreshed.token);
          localStorage.setItem('stocksense_refresh_token', refreshed.refreshToken);
          localStorage.setItem('stocksense_user', JSON.stringify(refreshed.user));
          set({
            user: refreshed.user,
            token: refreshed.token,
            refreshToken: refreshed.refreshToken,
            isAuthenticated: true,
          });
          return;
        } catch {
          // Both failed, proceed to logout
        }
      }
      get().logout();
    }
  },

  logout: () => {
    localStorage.removeItem('stocksense_auth_token');
    localStorage.removeItem('stocksense_refresh_token');
    localStorage.removeItem('stocksense_user');
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null,
    });
  },

  setUser: (user) => {
    if (user) {
      localStorage.setItem('stocksense_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('stocksense_user');
    }
    set({ user, isAuthenticated: !!user });
  },
}));
