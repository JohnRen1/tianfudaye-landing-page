import { NextRequest } from 'next/server';
import { getAssessmentReportById, saveAssessmentReport } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, fail } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/assessment/report/:id/save
 * 需要认证。
 * 更新 assessment_reports SET is_saved=true。
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
    return fail('REPORT_FORBIDDEN', '无权限保存此报告', 403);
  }

  try {
    const response = await saveAssessmentReport(id);
    return ok(response);
  } catch (error) {
    return fail('REPORT_SAVE_FAILED', '保存失败', 500, error instanceof Error ? error.message : error);
  }
}
