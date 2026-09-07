import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { ok, fail } from '@/lib/api-response';
import { listSavedAssessmentReports } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userCtx = await requireUser(req);
  if (!userCtx) {
    return fail('AUTH_REQUIRED', '请先登录后再查看报告', 401);
  }

  try {
    const reports = await listSavedAssessmentReports(userCtx.userId);
    return ok(reports);
  } catch (error) {
    return fail(
      'REPORT_LIST_FAILED',
      '报告列表获取失败',
      500,
      error instanceof Error ? error.message : error,
    );
  }
}
