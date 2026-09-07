import { createServiceClient } from './supabase-adapter';
import { groupChatSessions, type ChatHistoryMetadata, type ChatHistoryPage, type ChatHistoryTurn } from '../ai-history';
import type { AiAnswerBodyDTO } from '../contracts/ai-chat';

// Read metadata only for grouping; do not load every answer into the list endpoint.
export async function listChatSessions(userId: string, page: number): Promise<ChatHistoryPage> {
  const client = createServiceClient();
  const rows: ChatHistoryMetadata[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from('qa_records')
      .select('id, session_id, question, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }).order('id', { ascending: true })
      .range(offset, offset + 499);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  const sessions = groupChatSessions(rows);
  const start = (page - 1) * 20;
  return { items: sessions.slice(start, start + 20), hasMore: sessions.length > start + 20 };
}

export async function getChatSession(userId: string, sessionId: string): Promise<ChatHistoryTurn[]> {
  const client = createServiceClient();
  const turns: ChatHistoryTurn[] = [];
  for (let offset = 0; ; offset += 100) {
    let query = client.from('qa_records').select('id, question, ai_answer, created_at')
      .eq('user_id', userId);
    query = sessionId.startsWith('record:')
      ? query.eq('id', sessionId.slice(7)).is('session_id', null)
      : query.eq('session_id', sessionId);
    const { data, error } = await query.order('created_at', { ascending: true })
      .order('id', { ascending: true }).range(offset, offset + 99);
    if (error) throw new Error(error.message);
    turns.push(...(data ?? []).map((row) => ({
      id: row.id as string,
      question: row.question as string,
      answer: row.ai_answer as AiAnswerBodyDTO,
      createdAt: row.created_at as string,
    })));
    if (!data || data.length < 100) break;
  }
  return turns;
}
