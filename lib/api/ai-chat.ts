/**
 * ai-chat.ts — 落地页 AI 问答模块 API 客户端
 *
 * 封装：发送问题到 AI 问答接口。
 */

import { apiPost } from './client';
import type { AiChatRequestDTO, AiChatResponseDTO } from '../contracts/ai-chat';
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
  handlers: {
    onDelta: (text: string) => void;
    onDone: (response: AiChatResponseDTO) => void;
    onError?: (message: string, code?: string) => void;
  },
): Promise<void> {
  const body: AiChatRequestDTO = {
    question,
    ...(sessionId !== undefined ? { sessionId } : {}),
    ...(activityId !== undefined ? { activityId } : {}),
    stream: true,
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
