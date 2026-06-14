import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { ok, fail } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  const ctx = await requireUser(req);
  if (!ctx) return fail('AUTH_REQUIRED', '请先登录', 401);

  return ok(ctx.user);
}
