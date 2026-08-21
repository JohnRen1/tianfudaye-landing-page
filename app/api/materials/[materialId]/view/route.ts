import { NextRequest } from 'next/server';
import { getClaimedMaterialViewUrl } from '@/lib/db';
import { fail, ok } from '@/lib/api-response';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ materialId: string }>;
}

/**
 * 已领取资料的查看入口。
 * 客户端取得地址后在当前页面导航，以兼容微信及系统浏览器对客户端弹窗的限制。
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const ctx = await requireUser(req);
  if (!ctx) return fail('AUTH_REQUIRED', '请先登录', 401);

  const { materialId } = await params;
  if (!materialId) return fail('INVALID_MATERIAL_ID', '资料编号不能为空', 400);

  try {
    const viewData = await getClaimedMaterialViewUrl({
      userId: ctx.userId,
      materialId,
    });
    return ok(viewData);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'MATERIAL_NOT_CLAIMED') {
      return fail('MATERIAL_NOT_CLAIMED', '请先下载资料后再查看', 403);
    }
    if (message === 'MATERIAL_NOT_FOUND') return fail('MATERIAL_NOT_FOUND', '资料不存在或已下架', 404);
    return fail('MATERIAL_VIEW_FAILED', '资料查看失败，请稍后重试', 500, message);
  }
}
