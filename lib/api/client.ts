/**
 * client.ts — 落地页统一 API 请求基础封装
 *
 * 从 localStorage 读取 token（key: 'user-token'），附加到 Authorization 头。
 * 统一处理响应解包：直接返回 data 字段，非 2xx 时抛出带 code/message 的 Error。
 */

import type { ApiResponse } from '../contracts/shared';
import { getClientAuthToken } from '../client-auth';

const TOKEN_KEY = 'user-token';

/** 从非 2xx 响应或 ApiFailure 中构造错误 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return getClientAuthToken();
}

function buildHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  let body: ApiResponse<T>;
  try {
    body = await res.json();
  } catch {
    throw new ApiError('PARSE_ERROR', `HTTP ${res.status}: 响应解析失败`, res.status);
  }

  if (!res.ok || !body.success) {
    if (!body.success) {
      throw new ApiError(body.error.code, body.error.message, res.status);
    }
    throw new ApiError('HTTP_ERROR', `HTTP ${res.status}`, res.status);
  }

  return body.data;
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | null | undefined>): string {
  const url = new URL(path, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.pathname + url.search;
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<T> {
  const url = buildUrl(path, params);
  const res = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(),
  });
  return handleResponse<T>(res);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: buildHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'PATCH',
    headers: buildHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}
