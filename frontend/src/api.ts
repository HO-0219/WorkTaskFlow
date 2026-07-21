const API_BASE = String(import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '');

export type TokenResponse = { accessToken: string; tokenType: string; expiresIn: number };
export type ProviderResponse = { google: boolean; kakao: boolean };
export type MeResponse = { userId: number; username: string; email: string; name: string; role: string };
export type ApiError = { code?: string; message?: string; fieldErrors?: Record<string, string> };

async function request<T>(path: string, init: RequestInit = {}, authenticated = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (authenticated) {
    const token = localStorage.getItem('accessToken');
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'include' });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '요청 처리 중 오류가 발생했습니다.' }));
    throw error as ApiError;
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export const api = {
  sendVerification: (email: string) => request<void>('/auth/email-verifications', { method: 'POST', body: JSON.stringify({ email }) }),
  confirmVerification: (email: string, code: string) => request<void>('/auth/email-verifications/confirm', { method: 'POST', body: JSON.stringify({ email, code }) }),
  signup: (body: { username: string; email: string; name: string; password: string; verificationCode: string }) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (username: string, password: string) => request<TokenResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  refresh: () => request<TokenResponse>('/auth/refresh', { method: 'POST' }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  remindUsername: (email: string) => request<void>('/auth/username-reminders', { method: 'POST', body: JSON.stringify({ email }) }),
  requestPasswordReset: (email: string) => request<void>('/auth/password-resets', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (email: string, token: string, newPassword: string) => request<void>('/auth/password-resets/confirm', { method: 'POST', body: JSON.stringify({ email, token, newPassword }) }),
  providers: () => request<ProviderResponse>('/auth/providers'),
  me: () => request<MeResponse>('/auth/me', {}, true),
  socialUrl: (provider: 'google' | 'kakao') => `${API_BASE.replace(/\/api\/v1$/, '')}/oauth2/authorization/${provider}`,
};

export function errorMessage(error: unknown) {
  const value = error as ApiError;
  return value?.message ?? '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

