import { NextRequest } from 'next/server';
import { submitAssessment } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, fail } from '@/lib/api-response';
import type { AssessmentSubmitDTO } from '@/lib/contracts/assessment';

export const dynamic = 'force-dynamic';

function logAssessmentSubmit(message: string, data?: unknown): void {
  if (process.env.NODE_ENV === 'production') return;
  console.log(`[assessment/submit] ${message}`, data ?? '');
}

/**
 * POST /api/assessment/submit
 * 认证必填，报告必须关联当前用户。
 * S5：score / riskLevel 由服务端计算，不接受前端传入。
 */
export async function POST(req: NextRequest) {
  const userCtx = await requireUser(req);
  logAssessmentSubmit('auth resolved', {
    hasUser: Boolean(userCtx),
    userId: userCtx?.userId ?? null,
  });
  if (!userCtx) {
    return fail('AUTH_REQUIRED', '请先登录后再提交测评', 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    logAssessmentSubmit('invalid request body');
    return fail('INVALID_REQUEST_BODY', '请求体格式错误', 400);
  }

  const { answers, sourceQrId, sourceActivityId } = body as Partial<AssessmentSubmitDTO>;
  logAssessmentSubmit('request parsed', {
    answersCount: Array.isArray(answers) ? answers.length : null,
    firstAnswer: Array.isArray(answers) ? answers[0] : null,
    sourceQrId,
    sourceActivityId,
  });

  // 验证 answers
  if (!Array.isArray(answers) || answers.length === 0) {
    logAssessmentSubmit('invalid answers: empty or not array', { answers });
    return fail('INVALID_ANSWERS', 'answers 不能为空', 400);
  }

  for (const ans of answers) {
    if (
      typeof ans !== 'object' ||
      ans === null ||
      typeof ans.questionId !== 'string' ||
      !Array.isArray(ans.selectedIndexes)
    ) {
      logAssessmentSubmit('invalid answer item', { answer: ans });
      return fail('INVALID_ANSWERS', 'answers 格式不正确', 400);
    }
  }

  try {
    logAssessmentSubmit('submit start', {
      questionIds: answers.map((answer) => answer.questionId),
      selectedIndexes: answers.map((answer) => answer.selectedIndexes),
    });
    const response = await submitAssessment(
      {
        answers,
        sourceQrId: typeof sourceQrId === 'string' ? sourceQrId : null,
        sourceActivityId: typeof sourceActivityId === 'string' ? sourceActivityId : null,
      },
      userCtx.userId,
    );
    logAssessmentSubmit('submit success', response);
    return ok(response, 201);
  } catch (error) {
    logAssessmentSubmit('submit failed', {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return fail('REPORT_CREATE_FAILED', '报告生成失败', 500, error instanceof Error ? error.message : error);
  }
}
