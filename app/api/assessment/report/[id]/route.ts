import { NextRequest } from 'next/server';
import { getAssessmentReportById } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, fail } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function logAssessmentReport(message: string, data?: unknown): void {
  if (process.env.NODE_ENV === 'production') return;
  console.log(`[assessment/report] ${message}`, data ?? '');
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
  logAssessmentReport('request start', {
    reportId: id,
    hasUser: Boolean(userCtx),
    userId: userCtx?.userId ?? null,
  });

  let result: Awaited<ReturnType<typeof getAssessmentReportById>>;
  try {
    result = await getAssessmentReportById(id);
  } catch (error) {
    logAssessmentReport('lookup failed', {
      reportId: id,
      message: error instanceof Error ? error.message : error,
    });
    return fail('REPORT_LOOKUP_FAILED', '报告查询失败', 500, error instanceof Error ? error.message : error);
  }

  if (!result) {
    logAssessmentReport('not found', { reportId: id });
    return fail('REPORT_NOT_FOUND', '报告不存在', 404);
  }

  // 归属校验：报告已认领（user_id 非 null）且请求用户已登录 → 必须匹配
  const reportUserId = result.userId;
  if (reportUserId !== null && userCtx !== null) {
    if (reportUserId !== userCtx.userId) {
      logAssessmentReport('forbidden', {
        reportId: id,
        reportUserId,
        requestUserId: userCtx.userId,
      });
      return fail('REPORT_FORBIDDEN', '无权限访问此报告', 403);
    }
  }

  logAssessmentReport('success', {
    reportId: id,
    reportUserId,
    score: result.report.score,
    riskLevel: result.report.riskLevel,
  });
  return ok(result.report);
}
