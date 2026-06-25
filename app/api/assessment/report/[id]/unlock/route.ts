import { NextRequest } from 'next/server';
import { getAssessmentReportById, unlockAssessmentReport } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, fail } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function logAssessmentUnlock(message: string, data?: unknown): void {
  if (process.env.NODE_ENV === 'production') return;
  console.log(`[assessment/unlock] ${message}`, data ?? '');
}

/**
 * POST /api/assessment/report/:id/unlock
 * 需要认证。
 * 更新 assessment_reports SET viewed=true，返回含 suggestions 的完整报告。
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const userCtx = await requireUser(req);
  logAssessmentUnlock('request start', {
    reportId: id,
    hasUser: Boolean(userCtx),
    userId: userCtx?.userId ?? null,
  });
  if (!userCtx) {
    return fail('AUTH_REQUIRED', '请先登录', 401);
  }

  // 查询报告，验证存在性和归属
  let existing: Awaited<ReturnType<typeof getAssessmentReportById>>;
  try {
    existing = await getAssessmentReportById(id);
  } catch (error) {
    logAssessmentUnlock('lookup failed', {
      reportId: id,
      message: error instanceof Error ? error.message : error,
    });
    return fail('REPORT_LOOKUP_FAILED', '报告查询失败', 500, error instanceof Error ? error.message : error);
  }

  if (!existing) {
    logAssessmentUnlock('not found', { reportId: id });
    return fail('REPORT_NOT_FOUND', '报告不存在', 404);
  }

  // 若报告已认领，必须是同一用户
  if (existing.userId !== null && existing.userId !== userCtx.userId) {
    logAssessmentUnlock('forbidden', {
      reportId: id,
      reportUserId: existing.userId,
      requestUserId: userCtx.userId,
    });
    return fail('REPORT_FORBIDDEN', '无权限解锁此报告', 403);
  }

  try {
    const response = await unlockAssessmentReport(id, userCtx.userId);
    if (!response) return fail('REPORT_FETCH_FAILED', '报告数据获取失败', 500);
    logAssessmentUnlock('success', {
      reportId: id,
      userId: userCtx.userId,
      isUnlocked: response.report.isUnlocked,
    });
    return ok(response);
  } catch (error) {
    logAssessmentUnlock('unlock failed', {
      reportId: id,
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return fail('REPORT_UNLOCK_FAILED', '解锁失败', 500, error instanceof Error ? error.message : error);
  }
}
