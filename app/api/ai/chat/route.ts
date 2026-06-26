import { NextRequest } from 'next/server';
import { createQaRecord } from '@/lib/db';
import { ok, fail } from '@/lib/api-response';
import { requireUser } from '@/lib/auth';
import { AI_CHAT_ERROR_CODES } from '@/lib/contracts/ai-chat';
import type { AiAnswerBodyDTO, AiCitationDTO } from '@/lib/contracts/ai-chat';
import type { RiskLevel } from '@/lib/contracts/shared';
import { isProdEnv, pickEnvByStage } from '@/lib/env';

export const dynamic = 'force-dynamic';

interface RagCitationRaw {
  title?: unknown;
  source_path?: unknown;
  section?: unknown;
  score?: unknown;
  point_id?: unknown;
  doc_id?: unknown;
}

interface RagChatResponseRaw {
  query?: unknown;
  answer?: unknown;
  citations?: unknown;
}

interface RagStreamResult {
  answerText: string;
  citations: AiCitationDTO[];
}

function getRagChatUrl(): string {
  const configuredUrl = pickEnvByStage(
    process.env.RAG_CHAT_URL,
    process.env.NEXT_RAG_CHAT_URL,
  );
  if (configuredUrl) return configuredUrl;

  if (!isProdEnv()) {
    return 'http://127.0.0.1:8000/chat';
  }

  throw new Error(isProdEnv() ? 'NEXT_RAG_CHAT_URL is not configured' : 'RAG_CHAT_URL is not configured');
}

function isAiStreamDebugEnabled(): boolean {
  return process.env.AI_STREAM_DEBUG === 'true';
}

function getRagMaxTokens(): number {
  return Math.max(800, Number(process.env.RAG_CHAT_MAX_TOKENS ?? 2400));
}

function normalizeCitation(raw: RagCitationRaw): AiCitationDTO {
  return {
    title: typeof raw.title === 'string' ? raw.title : '未命名来源',
    sourcePath: typeof raw.source_path === 'string' ? raw.source_path : '',
    section: typeof raw.section === 'string' ? raw.section : '正文',
    score: typeof raw.score === 'number' ? raw.score : Number(raw.score ?? 0),
    pointId: typeof raw.point_id === 'string' ? raw.point_id : '',
    docId: typeof raw.doc_id === 'string' ? raw.doc_id : '',
  };
}

function inferRiskLevel(answerText: string): RiskLevel {
  if (/严重风险|重大风险|高风险|稽查|补缴|处罚/.test(answerText)) return 'high';
  if (/风险|建议|确认|关注|核查|留存/.test(answerText)) return 'medium';
  return 'low';
}

function buildRagAnswer(question: string, ragResponse: RagChatResponseRaw): AiAnswerBodyDTO {
  const answerText = typeof ragResponse.answer === 'string' ? ragResponse.answer.trim() : '';
  const citations = Array.isArray(ragResponse.citations)
    ? ragResponse.citations
        .filter((item): item is RagCitationRaw => typeof item === 'object' && item !== null)
        .map(normalizeCitation)
    : [];
  const riskLevel = inferRiskLevel(answerText);
  const advisorRecommended = riskLevel === 'high' || /建议.*顾问|专业税务顾问|主管税务机关/.test(answerText);

  return {
    answerText: answerText || '暂未生成有效回答，请稍后重试。',
    questionUnderstanding: `您询问的是：${question.slice(0, 80)}${question.length > 80 ? '...' : ''}`,
    initialJudgment: answerText || '暂未生成有效回答，请稍后重试。',
    involvedRisks: riskLevel === 'low' ? ['暂未识别明显高风险事项'] : ['需结合业务事实确认适用条件和留存资料', '需关注政策口径、申报填报和税务核查风险'],
    suggestions: ['结合企业实际合同、凭证和申报数据复核', '必要时咨询专业税务顾问或主管税务机关'],
    riskLevel,
    advisorRecommended,
    needsConfirmation: /建议|确认|主管税务机关|专业税务顾问|拿不准|结合具体/.test(answerText),
    knowledgeItemIds: citations.map((item) => item.docId).filter(Boolean),
    citations,
  };
}

function buildRagAnswerFromText(question: string, answerTextValue: string, citations: AiCitationDTO[]): AiAnswerBodyDTO {
  const answerText = answerTextValue.trim();
  const riskLevel = inferRiskLevel(answerText);
  const advisorRecommended = riskLevel === 'high' || /建议.*顾问|专业税务顾问|主管税务机关/.test(answerText);

  return {
    answerText: answerText || '暂未生成有效回答，请稍后重试。',
    questionUnderstanding: `您询问的是：${question.slice(0, 80)}${question.length > 80 ? '...' : ''}`,
    initialJudgment: answerText || '暂未生成有效回答，请稍后重试。',
    involvedRisks: riskLevel === 'low' ? ['暂未识别明显高风险事项'] : ['需结合业务事实确认适用条件和留存资料', '需关注政策口径、申报填报和税务核查风险'],
    suggestions: ['结合企业实际合同、凭证和申报数据复核', '必要时咨询专业税务顾问或主管税务机关'],
    riskLevel,
    advisorRecommended,
    needsConfirmation: /建议|确认|主管税务机关|专业税务顾问|拿不准|结合具体/.test(answerText),
    knowledgeItemIds: citations.map((item) => item.docId).filter(Boolean),
    citations,
  };
}

async function callRagChat(question: string): Promise<RagChatResponseRaw> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.RAG_CHAT_TIMEOUT_MS ?? 60000));

  try {
    const response = await fetch(getRagChatUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: question,
        top_k: Number(process.env.RAG_CHAT_TOP_K ?? 6),
        max_tokens: getRagMaxTokens(),
        max_new_tokens: getRagMaxTokens(),
        return_debug: process.env.RAG_CHAT_RETURN_DEBUG !== 'false',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`RAG 服务返回 HTTP ${response.status}`);
    }

    const data: unknown = await response.json();
    if (typeof data !== 'object' || data === null) {
      throw new Error('RAG 服务响应格式错误');
    }

    return data as RagChatResponseRaw;
  } finally {
    clearTimeout(timeout);
  }
}

function parseRagStreamPayload(raw: string): { delta?: string; answer?: string; citations?: AiCitationDTO[] } | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '[DONE]') return null;
  const dataText = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed;
  if (!dataText || dataText === '[DONE]') return null;

  try {
    const payload = JSON.parse(dataText) as Record<string, unknown>;
    const delta =
      typeof payload.delta === 'string'
        ? payload.delta
        : typeof payload.text === 'string'
          ? payload.text
          : typeof payload.content === 'string'
            ? payload.content
            : typeof payload.token === 'string'
              ? payload.token
              : undefined;
    const answer = typeof payload.answer === 'string' ? payload.answer : undefined;
    const citations = Array.isArray(payload.citations)
      ? payload.citations
          .filter((item): item is RagCitationRaw => typeof item === 'object' && item !== null)
          .map(normalizeCitation)
      : undefined;
    return { delta, answer, citations };
  } catch {
    return { delta: dataText };
  }
}

function splitRagStreamEvents(buffer: string, flush = false): { events: string[]; rest: string } {
  if (buffer.includes('\n\n')) {
    const parts = buffer.split('\n\n');
    return { events: parts.slice(0, -1), rest: parts.at(-1) ?? '' };
  }

  const lines = buffer.split('\n');
  if (lines.length > 1) {
    return { events: lines.slice(0, -1), rest: lines.at(-1) ?? '' };
  }

  if (flush && buffer.trim()) {
    return { events: [buffer], rest: '' };
  }

  return { events: [], rest: buffer };
}

async function callRagChatStream(question: string, onDelta: (text: string) => void): Promise<RagStreamResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.RAG_CHAT_TIMEOUT_MS ?? 60000));
  let answerText = '';
  let citations: AiCitationDTO[] = [];

  try {
    const response = await fetch(getRagChatUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({
        query: question,
        top_k: Number(process.env.RAG_CHAT_TOP_K ?? 6),
        max_tokens: getRagMaxTokens(),
        max_new_tokens: getRagMaxTokens(),
        return_debug: process.env.RAG_CHAT_RETURN_DEBUG !== 'false',
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`RAG 服务返回 HTTP ${response.status}`);
    }

    if (isAiStreamDebugEnabled()) {
      console.log('[ai/chat/stream] rag response', {
        status: response.status,
        contentType: response.headers.get('content-type'),
      });
    }

    if (!response.body) {
      const data = (await response.json()) as RagChatResponseRaw;
      const fallbackAnswer = typeof data.answer === 'string' ? data.answer : '';
      return {
        answerText: fallbackAnswer,
        citations: Array.isArray(data.citations)
          ? data.citations
              .filter((item): item is RagCitationRaw => typeof item === 'object' && item !== null)
              .map(normalizeCitation)
          : [],
      };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunkText = decoder.decode(value, { stream: true });
      if (isAiStreamDebugEnabled()) {
        console.log('[ai/chat/stream] rag chunk received', {
          bytes: value.byteLength,
          preview: chunkText.slice(0, 80),
        });
      }
      buffer += chunkText;
      const { events, rest } = splitRagStreamEvents(buffer);
      buffer = rest;

      if (events.length === 0 && buffer.trim() && !buffer.trim().startsWith('{') && !buffer.trim().startsWith('data:')) {
        const text = buffer;
        buffer = '';
        answerText += text;
        if (isAiStreamDebugEnabled()) {
          console.log('[ai/chat/stream] plain delta forwarded', { chars: text.length });
        }
        onDelta(text);
        continue;
      }

      for (const event of events) {
        const dataLines = event
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim());
        const payloadText = dataLines.length > 0 ? dataLines.join('\n') : event.trim();
        const payload = parseRagStreamPayload(payloadText);
        if (!payload) continue;
        if (payload.citations) citations = payload.citations;
        if (payload.answer !== undefined) answerText = payload.answer;
        if (payload.delta) {
          answerText += payload.delta;
          if (isAiStreamDebugEnabled()) {
            console.log('[ai/chat/stream] parsed delta forwarded', { chars: payload.delta.length });
          }
          onDelta(payload.delta);
        }
      }
    }

    if (buffer.trim()) {
      const { events } = splitRagStreamEvents(buffer, true);
      for (const event of events) {
        const payload = parseRagStreamPayload(event);
        if (payload?.citations) citations = payload.citations;
        if (payload?.answer !== undefined) answerText = payload.answer;
        if (payload?.delta) {
          answerText += payload.delta;
          if (isAiStreamDebugEnabled()) {
            console.log('[ai/chat/stream] final delta forwarded', { chars: payload.delta.length });
          }
          onDelta(payload.delta);
        }
      }
    }

    return { answerText, citations };
  } finally {
    clearTimeout(timeout);
  }
}

function streamEvent(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(AI_CHAT_ERROR_CODES.VALIDATION_ERROR, '请求体格式错误', 400);
  }

  const { question, sessionId, activityId, stream } = body as Record<string, unknown>;

  if (typeof question !== 'string' || question.trim().length === 0) {
    return fail(AI_CHAT_ERROR_CODES.AI_CHAT_QUESTION_EMPTY, '问题内容不能为空', 400);
  }
  if (question.length > 2000) {
    return fail(AI_CHAT_ERROR_CODES.AI_CHAT_QUESTION_TOO_LONG, '问题内容不能超过 2000 字符', 400);
  }

  const resolvedSessionId =
    typeof sessionId === 'string' && sessionId.trim().length > 0
      ? sessionId.trim()
      : crypto.randomUUID();

  const resolvedActivityId =
    typeof activityId === 'string' && activityId.trim().length > 0
      ? activityId.trim()
      : null;

  const userCtx = await requireUser(req);
  if (!userCtx) {
    return fail('AUTH_REQUIRED', '请先登录后再使用 AI 问答', 401);
  }
  const userId: string = userCtx.userId;
  const normalizedQuestion = question.trim();

  if (stream === true) {
    if (isAiStreamDebugEnabled()) {
      console.log('[ai/chat/stream] request accepted', {
        sessionId: resolvedSessionId,
        activityId: resolvedActivityId,
      });
    }
    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const ragResult = await callRagChatStream(normalizedQuestion, (text) => {
            controller.enqueue(encoder.encode(streamEvent({ type: 'delta', text })));
          });
          const answer = buildRagAnswerFromText(normalizedQuestion, ragResult.answerText, ragResult.citations);
          const response = await createQaRecord({
            userId,
            sessionId: resolvedSessionId,
            activityId: resolvedActivityId,
            question: normalizedQuestion,
            answer,
          });
          controller.enqueue(encoder.encode(streamEvent({ type: 'done', data: response })));
        } catch (error) {
          const aborted = error instanceof Error && error.name === 'AbortError';
          controller.enqueue(
            encoder.encode(
              streamEvent({
                type: 'error',
                code: aborted ? AI_CHAT_ERROR_CODES.AI_SERVICE_TIMEOUT : AI_CHAT_ERROR_CODES.AI_SERVICE_UNAVAILABLE,
                message: aborted ? 'AI 知识库服务响应超时，请稍后重试' : 'AI 知识库服务暂不可用，请稍后重试',
              }),
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  }

  let answer: AiAnswerBodyDTO;
  try {
    const ragResponse = await callRagChat(normalizedQuestion);
    answer = buildRagAnswer(normalizedQuestion, ragResponse);
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return fail(
      aborted ? AI_CHAT_ERROR_CODES.AI_SERVICE_TIMEOUT : AI_CHAT_ERROR_CODES.AI_SERVICE_UNAVAILABLE,
      aborted ? 'AI 知识库服务响应超时，请稍后重试' : 'AI 知识库服务暂不可用，请稍后重试',
      aborted ? 504 : 502,
      error instanceof Error ? error.message : error,
    );
  }

  try {
    const response = await createQaRecord({
      userId,
      sessionId: resolvedSessionId,
      activityId: resolvedActivityId,
      question: normalizedQuestion,
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
