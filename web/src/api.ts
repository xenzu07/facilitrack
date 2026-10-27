import axios, { isAxiosError } from 'axios';

export const API_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
export const TOKEN_KEY = 'facilitrack_token';
export const USER_KEY = 'facilitrack_user';

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}

// an expired or invalid session sends the user back to the login page
api.interceptors.response.use(
  (res) => res,
  (error: unknown) => {
    if (
      isAxiosError(error) &&
      error.response?.status === 401 &&
      sessionStorage.getItem(TOKEN_KEY)
    ) {
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  },
);

export function errorMessage(e: unknown): string {
  if (isAxiosError(e)) {
    if (!e.response) {
      return 'Cannot reach the server. Check your connection and that the backend is running.';
    }
    const m = (e.response.data as { message?: string | string[] } | undefined)
      ?.message;
    if (Array.isArray(m)) return m.join(', ');
    if (typeof m === 'string') return m;
  } else if (e instanceof Error) {
    return e.message;
  }
  return 'Something went wrong. Please try again.';
}