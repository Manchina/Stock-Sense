import React, { createContext, useContext, useState, useCallback } from 'react';
import { FormattedZodError, formatZodApiError } from '../lib/zod-error-formatter';
import { ApiError } from '../lib/api';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'zod';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  zodError?: FormattedZodError;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
  zod: (err: unknown, fallbackMessage?: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let globalToastHandler: ToastContextValue | null = null;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, 'id'>): string => {
      // Deduplicate recent identical toasts (within 1.5s)
      let isDuplicate = false;
      setToasts((prev) => {
        const hasDup = prev.some(
          (t) => t.type === toast.type && t.message === toast.message && (t.title || '') === (toast.title || '')
        );
        if (hasDup) {
          isDuplicate = true;
          return prev;
        }
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const newToast: ToastItem = { ...toast, id };

        const duration = toast.duration ?? (toast.type === 'zod' || toast.type === 'error' ? 8000 : 4500);
        if (duration > 0) {
          setTimeout(() => {
            removeToast(id);
          }, duration);
        }

        return [...prev, newToast];
      });

      return isDuplicate ? '' : `toast-${Date.now()}`;
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title?: string) => {
      return showToast({ type: 'success', message, title });
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, title?: string) => {
      return showToast({ type: 'error', message, title });
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, title?: string) => {
      return showToast({ type: 'warning', message, title });
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, title?: string) => {
      return showToast({ type: 'info', message, title });
    },
    [showToast]
  );

  const zod = useCallback(
    (err: unknown, fallbackMessage?: string) => {
      if (err instanceof ApiError) {
        const hasFields = err.zodError?.fieldErrors && err.zodError.fieldErrors.length > 0;
        return showToast({
          type: hasFields ? 'zod' : 'error',
          title: hasFields ? (err.zodError.title || 'Validation Error') : 'Operation Failed',
          message: err.message,
          zodError: err.zodError,
          duration: 9000,
        });
      }

      const anyError = err as any;
      const errorPayload = anyError?.response?.data || anyError?.data || anyError?.errors ? (anyError.data || anyError.response?.data || anyError) : null;
      if (errorPayload) {
        const formatted = formatZodApiError(errorPayload);
        const hasFields = formatted.fieldErrors && formatted.fieldErrors.length > 0;
        const apiMsg = errorPayload.message || errorPayload.error || formatted.summary;
        return showToast({
          type: hasFields ? 'zod' : 'error',
          title: hasFields ? formatted.title : 'Validation Error',
          message: apiMsg,
          zodError: formatted,
          duration: 9000,
        });
      }

      return showToast({
        type: 'error',
        title: 'Error',
        message:
          (err instanceof Error ? err.message : String(err)) ||
          fallbackMessage ||
          'Operation failed. Please try again.',
      });
    },
    [showToast]
  );

  const value = {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info,
    zod,
  };

  globalToastHandler = value;

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};

/**
 * Global singleton helper to trigger popups from anywhere
 */
export const toast = {
  success: (msg: string, title?: string) => globalToastHandler?.success(msg, title),
  error: (msg: string, title?: string) => globalToastHandler?.error(msg, title),
  warning: (msg: string, title?: string) => globalToastHandler?.warning(msg, title),
  info: (msg: string, title?: string) => globalToastHandler?.info(msg, title),
  zod: (err: unknown, fallbackMsg?: string) => globalToastHandler?.zod(err, fallbackMsg),
};
