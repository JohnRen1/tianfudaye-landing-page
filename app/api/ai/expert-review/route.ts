import { NextRequest } from 'next/server';
import { createExpertReview } from '@/lib/db';
import { fail, ok } from '@/lib/api-response';
import type { ExpertReviewRequestDTO } from '@/lib/contracts/ai-chat';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const userCtx = await requireUser(req);
  if (!userCtx) return fail('AUTH_REQUIRED', '请先登录', 401);

  let body: Partial<ExpertReviewRequestDTO>;
  try {
    body = (await req.json()) as Partial<ExpertReviewRequestDTO>;
  } catch {
    return fail('VALIDATION_ERROR', '请求体格式错误', 400);
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  const aiAnswer = typeof body.aiAnswer === 'string' ? body.aiAnswer.trim() : '';
  const expertAnswer = typeof body.expertAnswer === 'string' ? body.expertAnswer.trim() : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  const reviewKind = body.reviewKind;

  if (!sessionId || !question || !aiAnswer || !expertAnswer || !reason) {
    return fail('VALIDATION_ERROR', '问题、原回答、专家修正和修正原因不能为空', 400);
  }
  if (reviewKind !== 'incorrect' && reviewKind !== 'needs_revision') {
    return fail('VALIDATION_ERROR', '专家修正类型无效', 400);
  }

  try {
    const review = await createExpertReview({
      sessionId,
      qaRecordId: typeof body.qaRecordId === 'string' ? body.qaRecordId : null,
      expertName: userCtx.user.name?.trim() || userCtx.user.phone,
      expertContact: userCtx.user.phone,
      question,
      aiAnswer,
      expertAnswer,
      reviewKind,
      reason,
    });
    return ok(review, 201);
  } catch (error) {
    return fail(
      'INTERNAL_SERVER_ERROR',
      '专家修正保存失败',
      500,
      error instanceof Error ? error.message : error,
    );
  }
}
