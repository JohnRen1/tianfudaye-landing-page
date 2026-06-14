import { NextRequest } from 'next/server';
import { listAssessmentQuestions } from '@/lib/db';
import { ok, fail } from '@/lib/api-response';
import type { QuestionPublicDTO } from '@/lib/contracts/assessment';

/**
 * GET /api/assessment/questions
 * 公开接口，无需认证。
 * 返回活跃题目列表，故意省略 options.score（S5 安全约定）。
 */
export async function GET(_req: NextRequest) {
  try {
    const questions = await listAssessmentQuestions();
    return ok<QuestionPublicDTO[]>(questions);
  } catch (error) {
    return fail('QUESTIONS_FETCH_FAILED', '题库加载失败', 500, error instanceof Error ? error.message : error);
  }
}
