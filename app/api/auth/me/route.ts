import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { ok, fail } from '@/lib/api-response';
import { buildBypassLoginResponse, isUserAuthBypassEnabled } from '@/lib/auth-bypass';
import { USER_AUTH_TOKEN_COOKIE } from '@/lib/auth-token';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (isUserAuthBypassEnabled()) {
    const bypass = await buildBypassLoginResponse();
    return ok({
      ...bypass.user,
      accessToken: bypass.accessToken,
    });
  }

  const ctx = await requireUser(req);
  if (!ctx) return fail('AUTH_REQUIRED', '请先登录', 401);

  const cookieToken = req.cookies.get(USER_AUTH_TOKEN_COOKIE)?.value;
  return ok({
    ...ctx.user,
    ...(cookieToken ? { accessToken: cookieToken } : {}),
  });
}
