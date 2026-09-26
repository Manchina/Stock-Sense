const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const api = {
  get: async <T>(endpoint: string): Promise<T> => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },
  post: async <T>(endpoint: string, body?: unknown): Promise<T> => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },
  put: async <T>(endpoint: string, body?: unknown): Promise<T> => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },
  delete: async <T>(endpoint: string): Promise<T> => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },
};
