/**
 * ai-chat.ts — 落地页 AI 问答模块 API 客户端
 *
 * 封装：发送问题到 AI 问答接口。
 */

import { apiPost } from './client';
import type { AiChatRequestDTO, AiChatResponseDTO } from '../contracts/ai-chat';

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
