import { NextRequest } from 'next/server';
import { getAssessmentReportById, unlockAssessmentReport } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, fail } from '@/lib/api-response';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/assessment/report/:id/unlock
 * 需要认证。
 * 更新 assessment_reports SET viewed=true，返回含 suggestions 的完整报告。
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const userCtx = await requireUser(req);
  if (!userCtx) {
    return fail('AUTH_REQUIRED', '请先登录', 401);
  }

  // 查询报告，验证存在性和归属
  const existing = await getAssessmentReportById(id);
  if (!existing) {
    return fail('REPORT_NOT_FOUND', '报告不存在', 404);
  }

  // 若报告已认领，必须是同一用户
  if (existing.userId !== null && existing.userId !== userCtx.userId) {
    return fail('REPORT_FORBIDDEN', '无权限解锁此报告', 403);
  }

  try {
    const response = await unlockAssessmentReport(id, userCtx.userId);
    if (!response) return fail('REPORT_FETCH_FAILED', '报告数据获取失败', 500);
    return ok(response);
  } catch (error) {
    return fail('REPORT_UNLOCK_FAILED', '解锁失败', 500, error instanceof Error ? error.message : error);
  }
}
