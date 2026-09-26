export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = localStorage.getItem('stocksense_auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

import { formatZodApiError, FormattedZodError } from './zod-error-formatter';
import { toast } from '../context/ToastContext';

export class ApiError extends Error {
  public status: number;
  public data: any;
  public zodError: FormattedZodError;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.zodError = formatZodApiError(data);
  }
}

async function handleResponse<T>(res: Response, showToastOnError = true): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    const message =
      errorData?.message ||
      (errorData?.details && Array.isArray(errorData.details)
        ? errorData.details.map((d: { message: string }) => d.message).join(', ')
        : null) ||
      errorData?.error ||
      `HTTP error ${res.status}`;
    const apiError = new ApiError(message, res.status, errorData);
    
    // Automatically trigger Zod error popup across entire application
    if (showToastOnError && toast?.zod) {
      toast.zod(apiError);
    }

    throw apiError;
  }
  return res.json();
}

export const api = {
  get: async <T>(endpoint: string, options?: { params?: Record<string, string | number | boolean | undefined> }): Promise<T> => {
    let url = `${API_BASE_URL}${endpoint}`;
    if (options?.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }
    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });
    return handleResponse<T>(res);
  },

  post: async <T>(endpoint: string, body?: unknown): Promise<T> => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  put: async <T>(endpoint: string, body?: unknown): Promise<T> => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  delete: async <T>(endpoint: string): Promise<T> => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<T>(res);
  },
};
