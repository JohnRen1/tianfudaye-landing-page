import { NextRequest } from 'next/server';
import { claimMaterial } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, fail } from '@/lib/api-response';
import type { MaterialClaimCreateDTO } from '@/lib/contracts/material';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ctx = await requireUser(req);
  if (!ctx) return fail('AUTH_REQUIRED', '请先登录', 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('INVALID_REQUEST_BODY', '请求体格式错误', 400);
  }

  const { materialId, activityId } = body as MaterialClaimCreateDTO & Record<string, unknown>;

  if (typeof materialId !== 'string' || !materialId) {
    return fail('INVALID_MATERIAL_ID', 'materialId 不能为空', 400);
  }

  try {
    const response = await claimMaterial({
      userId: ctx.userId,
      isProfileComplete: ctx.user.isProfileComplete,
      materialId,
      activityId: typeof activityId === 'string' ? activityId : null,
    });
    return ok(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'MATERIAL_NOT_FOUND') return fail('MATERIAL_NOT_FOUND', '资料不存在', 404);
    if (message === 'MATERIAL_NOT_PUBLISHED') return fail('MATERIAL_NOT_PUBLISHED', '资料未上架，无法领取', 422);
    if (message === 'CLAIM_COMPANY_INFO_REQUIRED') {
      return fail('CLAIM_COMPANY_INFO_REQUIRED', '需要先补充企业信息才能领取', 403);
    }
    return fail('CLAIM_FAILED', '领取失败', 500, message);
  }
}
