/**
 * ai-chat.ts — 落地页 AI 问答模块 API 客户端
 *
 * 封装：发送问题到 AI 问答接口。
 */

import { apiGet, apiPost } from './client';
import type { ChatHistoryPage, ChatHistoryTurn } from '../ai-history';

export function getChatHistory(page = 1): Promise<ChatHistoryPage> {
  return apiGet('/api/ai/history', { page });
}

export function getChatHistorySession(session: string): Promise<ChatHistoryTurn[]> {
  return apiGet('/api/ai/history', { session });
}
import type { AiChatRequestDTO, AiChatResponseDTO } from '../contracts/ai-chat';
import type { ExpertReviewRequestDTO, ExpertReviewResponseDTO, SpeechToTextResponseDTO } from '../contracts/ai-chat';
import { getClientAuthToken } from '../client-auth';

type AiChatStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; data: AiChatResponseDTO }
  | { type: 'error'; message: string; code?: string };

/**
 * 发送 AI 问答请求
 * POST /api/ai/chat
 */
export async function sendMessage(
  question: string,
  sessionId?: string | null,
  activityId?: string | null,
): Promise<AiChatResponseDTO> {
  const body: AiChatRequestDTO = {
    question,
    ...(sessionId !== undefined ? { sessionId } : {}),
    ...(activityId !== undefined ? { activityId } : {}),
  };
  return apiPost<AiChatResponseDTO>('/api/ai/chat', body);
}

function parseStreamEvent(raw: string): AiChatStreamEvent | null {
  const dataLine = raw
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('data:'));

  if (!dataLine) return null;

  try {
    return JSON.parse(dataLine.slice(5).trim()) as AiChatStreamEvent;
  } catch {
    return null;
  }
}

export async function sendMessageStream(
  question: string,
  sessionId: string | null | undefined,
  activityId: string | null | undefined,
  recentHistory: AiChatRequestDTO['recentHistory'],
  handlers: {
    onDelta: (text: string) => void;
    onDone: (response: AiChatResponseDTO) => void;
    onError?: (message: string, code?: string) => void;
  },
  mode: AiChatRequestDTO['mode'] = 'customer',
): Promise<void> {
  const body: AiChatRequestDTO = {
    question,
    ...(sessionId !== undefined ? { sessionId } : {}),
    ...(activityId !== undefined ? { activityId } : {}),
    ...(recentHistory?.length ? { recentHistory } : {}),
    stream: true,
    mode,
  };
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const token = getClientAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    throw new Error(`AI 问答请求失败：HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      const event = parseStreamEvent(chunk);
      if (!event) continue;
      if (event.type === 'delta') handlers.onDelta(event.text);
      if (event.type === 'done') handlers.onDone(event.data);
      if (event.type === 'error') {
        handlers.onError?.(event.message, event.code);
        throw new Error(event.message);
      }
    }
  }

  if (buffer.trim()) {
    const event = parseStreamEvent(buffer);
    if (event?.type === 'delta') handlers.onDelta(event.text);
    if (event?.type === 'done') handlers.onDone(event.data);
    if (event?.type === 'error') {
      handlers.onError?.(event.message, event.code);
      throw new Error(event.message);
    }
  }
}

export async function saveExpertReview(
  request: ExpertReviewRequestDTO,
): Promise<ExpertReviewResponseDTO> {
  const response = await apiPost<ExpertReviewResponseDTO>('/api/ai/expert-review', request);
  return response;
}

export async function transcribeSpeech(audio: Blob): Promise<SpeechToTextResponseDTO> {
  const formData = new FormData();
  formData.set('audio', audio, 'speech.wav');
  const headers = new Headers();
  const token = getClientAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch('/api/ai/speech-to-text', {
    method: 'POST',
    headers,
    body: formData,
  });

  const body = await response.json().catch(() => null) as
    | { success: true; data: SpeechToTextResponseDTO }
    | { success: false; error: { message: string } }
    | null;
  if (!response.ok || !body?.success) {
    throw new Error(body && !body.success ? body.error.message : `语音识别失败：HTTP ${response.status}`);
  }
  return body.data;
}
