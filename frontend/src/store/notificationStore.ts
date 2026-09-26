import { create } from 'zustand';
import { InventoryNotification } from '../features/notifications/types';
import { notificationsApi } from '../features/notifications/api';

const READ_STORAGE_KEY = 'stocksense_read_notifications';
const DISMISSED_STORAGE_KEY = 'stocksense_dismissed_notifications';

function getStoredStringArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredStringArray(key: string, items: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.warn(`Failed to save ${key} to localStorage:`, e);
  }
}

export interface NotificationState {
  notifications: InventoryNotification[];
  readIds: string[];
  dismissedIds: string[];
  isLoading: boolean;
  lastFetchedAt: Date | null;

  // Actions
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;

  // Computed helper getters
  getVisibleNotifications: () => InventoryNotification[];
  getUnreadCount: () => number;
  getCriticalAlerts: () => InventoryNotification[];
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  readIds: getStoredStringArray(READ_STORAGE_KEY),
  dismissedIds: getStoredStringArray(DISMISSED_STORAGE_KEY),
  isLoading: false,
  lastFetchedAt: null,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const data = await notificationsApi.getAll();
      set({
        notifications: data,
        isLoading: false,
        lastFetchedAt: new Date(),
      });
    } catch (err) {
      console.warn('Failed to load notifications:', err);
      set({ isLoading: false });
    }
  },

  markAsRead: (id: string) => {
    const { readIds } = get();
    if (!readIds.includes(id)) {
      const next = [...readIds, id];
      saveStoredStringArray(READ_STORAGE_KEY, next);
      set({ readIds: next });
    }
  },

  markAllAsRead: () => {
    const { notifications, readIds } = get();
    const allIds = Array.from(new Set([...readIds, ...notifications.map((n) => n.id)]));
    saveStoredStringArray(READ_STORAGE_KEY, allIds);
    set({ readIds: allIds });
  },

  dismissNotification: (id: string) => {
    const { dismissedIds } = get();
    if (!dismissedIds.includes(id)) {
      const next = [...dismissedIds, id];
      saveStoredStringArray(DISMISSED_STORAGE_KEY, next);
      set({ dismissedIds: next });
    }
  },

  clearAll: () => {
    const { notifications, dismissedIds } = get();
    const next = Array.from(new Set([...dismissedIds, ...notifications.map((n) => n.id)]));
    saveStoredStringArray(DISMISSED_STORAGE_KEY, next);
    set({ dismissedIds: next });
  },

  getVisibleNotifications: () => {
    const { notifications, dismissedIds, readIds } = get();
    return notifications
      .filter((n) => !dismissedIds.includes(n.id))
      .map((n) => ({
        ...n,
        read: readIds.includes(n.id),
      }));
  },

  getUnreadCount: () => {
    const { notifications, dismissedIds, readIds } = get();
    return notifications.filter(
      (n) => !dismissedIds.includes(n.id) && !readIds.includes(n.id)
    ).length;
  },

  getCriticalAlerts: () => {
    const { notifications, dismissedIds } = get();
    return notifications.filter(
      (n) => !dismissedIds.includes(n.id) && n.type === 'error'
    );
  },
}));
