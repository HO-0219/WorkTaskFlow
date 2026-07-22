const API_BASE = String(import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '');

export type ApiError = { code?: string; message?: string; fieldErrors?: Record<string, string> };

export async function request<T>(path: string, init: RequestInit = {}, authenticated = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (authenticated) {
    const token = accessToken.get();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'include' });
  } catch {
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    throw {
      code: offline ? 'OFFLINE' : 'NETWORK_ERROR',
      message: offline
        ? '오프라인에서는 조회하거나 변경할 수 없습니다. 연결 후 다시 시도해 주세요.'
        : '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    } satisfies ApiError;
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '요청 처리 중 오류가 발생했습니다.' }));
    throw error as ApiError;
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export function serviceUrl(path: string) {
  return `${API_BASE.replace(/\/api\/v1$/, '')}${path}`;
}

export const accessToken = {
  get: () => localStorage.getItem('accessToken'),
  set: (value: string) => localStorage.setItem('accessToken', value),
  clear: () => localStorage.removeItem('accessToken'),
};

export function errorMessage(error: unknown) {
  const value = error as ApiError;
  return value?.message ?? '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}
