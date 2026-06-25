const USER_TOKEN_KEY = 'user-token';

export function getClientAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_TOKEN_KEY);
}

export function isClientLoggedIn(): boolean {
  return Boolean(getClientAuthToken());
}

export function setClientAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_TOKEN_KEY, token);
}

export function clearClientAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_TOKEN_KEY);
}

/**
 * 恢复并校验客户端登录状态。
 *
 * 注意：不能只看 localStorage 是否存在 user-token。
 * 浏览器可能残留旧 token 或历史 bypass token；如果不向服务端验证，页面会误判为已登录，
 * 但后续 AI/测评等接口无法解析出真实 userId，后台就无法关联用户信息。
 */
export async function hydrateClientAuthFromServer(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const existingToken = localStorage.getItem(USER_TOKEN_KEY);
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (existingToken) {
    headers.set('Authorization', `Bearer ${existingToken}`);
  }

  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      clearClientAuthToken();
      return false;
    }

    const body = (await response.json()) as
      | { success: true; data: { accessToken?: string } }
      | { success: false };

    if (!body.success) {
      clearClientAuthToken();
      return false;
    }

    const accessToken = body.data.accessToken;
    if (typeof accessToken === 'string' && accessToken.length > 0) {
      setClientAuthToken(accessToken);
    }

    return true;
  } catch {
    clearClientAuthToken();
    return false;
  }
}
