import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { updateUserProfile } from '@/lib/db';
import { ok, fail } from '@/lib/api-response';
import type { UserProfileCompleteDTO } from '@/lib/contracts/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  const ctx = await requireUser(req);
  if (!ctx) return fail('AUTH_REQUIRED', '请先登录', 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('INVALID_REQUEST_BODY', '请求体格式错误', 400);
  }

  try {
    const response = await updateUserProfile(ctx.userId, body as UserProfileCompleteDTO);
    return ok(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'COMPANY_REQUIRED') return fail('COMPANY_REQUIRED', '请填写企业名称', 400);
    if (message === 'INDUSTRY_REQUIRED') return fail('INDUSTRY_REQUIRED', '请选择所属行业', 400);
    return fail('PROFILE_SAVE_FAILED', '企业信息保存失败', 500, message);
  }
}
