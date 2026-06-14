import { NextRequest } from 'next/server';
import { getAssessmentReportById } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, fail } from '@/lib/api-response';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/assessment/report/:id
 * 认证可选。
 * - 若报告 user_id 非 null，且请求用户已登录，则校验归属。
 * - 未解锁时不返回 suggestions（S5）。
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const userCtx = await requireUser(req);

  const result = await getAssessmentReportById(id);
  if (!result) {
    return fail('REPORT_NOT_FOUND', '报告不存在', 404);
  }

  // 归属校验：报告已认领（user_id 非 null）且请求用户已登录 → 必须匹配
  const reportUserId = result.userId;
  if (reportUserId !== null && userCtx !== null) {
    if (reportUserId !== userCtx.userId) {
      return fail('REPORT_FORBIDDEN', '无权限访问此报告', 403);
    }
  }

  return ok(result.report);
}
