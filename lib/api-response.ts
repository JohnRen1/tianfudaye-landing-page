import { NextResponse } from 'next/server';
import type { ApiSuccess, ApiFailure, PaginatedData, PaginationMeta } from './contracts/shared';

export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): NextResponse<ApiFailure> {
  const body: ApiFailure = {
    success: false,
    error: { code, message, requestId: crypto.randomUUID() },
  };
  if (process.env.NODE_ENV !== 'production' && details !== undefined) {
    body.error.details = details;
  }
  return NextResponse.json(body, { status });
}

export function paginated<T>(
  items: T[],
  page: number,
  pageSize: number,
  total: number,
): NextResponse<ApiSuccess<PaginatedData<T>>> {
  const pagination: PaginationMeta = {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
  return ok({ items, pagination });
}
