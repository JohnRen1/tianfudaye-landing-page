import type { AiAnswerBodyDTO } from './contracts/ai-chat';

export interface ChatSessionSummary {
  sessionId: string;
  title: string;
  preview: string;
  updatedAt: string;
  turns: number;
}

export interface ChatHistoryTurn {
  id: string;
  question: string;
  answer: AiAnswerBodyDTO;
  createdAt: string;
}

export interface ChatHistoryPage {
  items: ChatSessionSummary[];
  hasMore: boolean;
}

export interface ChatHistoryMetadata {
  id: string;
  session_id: string | null;
  question: string;
  created_at: string;
}

/** Input is ordered oldest first, with id as the stable timestamp tie-breaker. */
export function groupChatSessions(rows: ChatHistoryMetadata[]): ChatSessionSummary[] {
  const sessions = new Map<string, ChatSessionSummary>();
  for (const row of rows) {
    const sessionId = row.session_id || `record:${row.id}`;
    const previous = sessions.get(sessionId);
    sessions.set(sessionId, {
      sessionId,
      title: previous?.title ?? row.question.slice(0, 40),
      preview: row.question.slice(0, 100),
      updatedAt: row.created_at,
      turns: (previous?.turns ?? 0) + 1,
    });
  }
  return [...sessions.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.sessionId.localeCompare(b.sessionId));
}
