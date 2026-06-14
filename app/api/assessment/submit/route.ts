import { NextRequest } from 'next/server';
import { submitAssessment } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, fail } from '@/lib/api-response';
import type { AssessmentSubmitDTO } from '@/lib/contracts/assessment';

export const dynamic = 'force-dynamic';

/**
 * POST /api/assessment/submit
 * 认证可选（userId 可为 null）。
 * S5：score / riskLevel 由服务端计算，不接受前端传入。
 */
export async function POST(req: NextRequest) {
  // 认证可选
  const userCtx = await requireUser(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('INVALID_REQUEST_BODY', '请求体格式错误', 400);
  }

  const { answers, sourceQrId, sourceActivityId } = body as Partial<AssessmentSubmitDTO>;

  // 验证 answers
  if (!Array.isArray(answers) || answers.length === 0) {
    return fail('INVALID_ANSWERS', 'answers 不能为空', 400);
  }

  for (const ans of answers) {
    if (
      typeof ans !== 'object' ||
      ans === null ||
      typeof ans.questionId !== 'string' ||
      !Array.isArray(ans.selectedIndexes)
    ) {
      return fail('INVALID_ANSWERS', 'answers 格式不正确', 400);
    }
  }

  try {
    const response = await submitAssessment(
      {
        answers,
        sourceQrId: typeof sourceQrId === 'string' ? sourceQrId : null,
        sourceActivityId: typeof sourceActivityId === 'string' ? sourceActivityId : null,
      },
      userCtx?.userId ?? null,
    );
    return ok(response, 201);
  } catch (error) {
    return fail('REPORT_CREATE_FAILED', '报告生成失败', 500, error instanceof Error ? error.message : error);
  }
}
