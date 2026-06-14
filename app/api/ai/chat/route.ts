import { NextRequest } from 'next/server';
import { createQaRecord } from '@/lib/db';
import { ok, fail } from '@/lib/api-response';
import { requireUser } from '@/lib/auth';
import { AI_CHAT_ERROR_CODES } from '@/lib/contracts/ai-chat';
import type { AiAnswerBodyDTO } from '@/lib/contracts/ai-chat';
import type { RiskLevel } from '@/lib/contracts/shared';

export const dynamic = 'force-dynamic';

// ===========================================================================
// 模拟 AI 回答生成（开发阶段）
// 生产阶段：此处替换为真实 LLM 调用（OpenAI/DeepSeek/自有模型）
// ===========================================================================

interface MockAiResult {
  riskLevel: RiskLevel;
  advisorRecommended: boolean;
  needsConfirmation: boolean;
}

function classifyQuestion(question: string): MockAiResult {
  if (/发票|进项/.test(question)) {
    return { riskLevel: 'high', advisorRecommended: true, needsConfirmation: false };
  }
  if (/工资|社保/.test(question)) {
    return { riskLevel: 'medium', advisorRecommended: false, needsConfirmation: true };
  }
  if (/增值税/.test(question)) {
    return { riskLevel: 'medium', advisorRecommended: false, needsConfirmation: false };
  }
  return { riskLevel: 'low', advisorRecommended: false, needsConfirmation: false };
}

function buildMockAnswer(question: string): AiAnswerBodyDTO {
  const { riskLevel, advisorRecommended, needsConfirmation } = classifyQuestion(question);

  return {
    questionUnderstanding: `您询问的是：${question.slice(0, 50)}${question.length > 50 ? '...' : ''}`,
    initialJudgment:
      '根据您描述的情况，初步判断存在一定税务风险，建议进一步核查。',
    involvedRisks: ['发票合规风险', '税务稽查风险'],
    suggestions: ['建议咨询专业税务顾问', '保留完整发票凭证'],
    riskLevel,
    advisorRecommended,
    needsConfirmation,
    knowledgeItemIds: [],
  };
}

// ===========================================================================
// POST /api/ai/chat
// ===========================================================================

export async function POST(req: NextRequest) {
  // ---------- 解析请求体 ----------
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(AI_CHAT_ERROR_CODES.VALIDATION_ERROR, '请求体格式错误', 400);
  }

  const { question, sessionId, activityId } = body as Record<string, unknown>;

  // ---------- 参数校验 ----------
  if (typeof question !== 'string' || question.trim().length === 0) {
    return fail(AI_CHAT_ERROR_CODES.AI_CHAT_QUESTION_EMPTY, '问题内容不能为空', 400);
  }
  if (question.length > 2000) {
    return fail(
      AI_CHAT_ERROR_CODES.AI_CHAT_QUESTION_TOO_LONG,
      '问题内容不能超过 2000 字符',
      400,
    );
  }

  const resolvedSessionId =
    typeof sessionId === 'string' && sessionId.trim().length > 0
      ? sessionId.trim()
      : crypto.randomUUID();

  const resolvedActivityId =
    typeof activityId === 'string' && activityId.trim().length > 0
      ? activityId.trim()
      : null;

  // ---------- 可选认证（未登录用户 userId 为 null） ----------
  const userCtx = await requireUser(req);
  const userId: string | null = userCtx?.userId ?? null;

  // ---------- 生成 AI 回答（开发阶段模拟） ----------
  // 生产阶段：此处替换为真实 LLM 调用（OpenAI/DeepSeek/自有模型）
  const answer = buildMockAnswer(question);

  try {
    const response = await createQaRecord({
      userId,
      sessionId: resolvedSessionId,
      activityId: resolvedActivityId,
      question: question.trim(),
      answer,
    });
    return ok(response, 201);
  } catch (error) {
    return fail(
      AI_CHAT_ERROR_CODES.INTERNAL_SERVER_ERROR,
      '问答记录保存失败',
      500,
      error instanceof Error ? error.message : error,
    );
  }
}
