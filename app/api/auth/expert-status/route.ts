import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/api-response';
import { isExpertUserPhone } from '@/lib/db';
import type { ExpertStatusDTO } from '@/lib/contracts/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ctx = await requireUser(req);
  if (!ctx) return fail('AUTH_REQUIRED', '请先登录', 401);

  const data: ExpertStatusDTO = {
    isExpert: await isExpertUserPhone(ctx.user.phone),
  };
  return ok(data);
}
