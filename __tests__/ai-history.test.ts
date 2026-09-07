import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { groupChatSessions } from '@/lib/ai-history';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), from: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireUser: mocks.auth }));
vi.mock('@/lib/database/supabase-adapter', () => ({ createServiceClient: () => ({ from: mocks.from }) }));
import { GET } from '@/app/api/ai/history/route';

describe('chat history', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('groups turns, preserves first question and orders by latest activity', () => {
    const result = groupChatSessions([
      { id: '1', session_id: 'a', question: '第一问', created_at: '2026-01-01' },
      { id: '2', session_id: 'b', question: '另一个话题', created_at: '2026-01-02' },
      { id: '3', session_id: 'a', question: '追问', created_at: '2026-01-03' },
      { id: '4', session_id: null, question: '旧数据', created_at: '2025-01-01' },
    ]);
    expect(result[0]).toEqual({ sessionId: 'a', title: '第一问', preview: '追问', updatedAt: '2026-01-03', turns: 2 });
    expect(result.map((item) => item.sessionId)).toEqual(['a', 'b', 'record:4']);
  });

  it('rejects unauthenticated requests before querying', async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await GET(new NextRequest('http://localhost/api/ai/history'))).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it.each(['page=0', 'page=1.5', 'session='])('validates %s', async (query) => {
    mocks.auth.mockResolvedValue({ userId: 'me' });
    expect((await GET(new NextRequest(`http://localhost/api/ai/history?${query}`))).status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  function chain(data: unknown[]) {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range: vi.fn().mockResolvedValue({ data, error: null }) };
    mocks.from.mockReturnValue(query);
    return query;
  }

  it('filters session details by authenticated user even with a forged userId parameter', async () => {
    mocks.auth.mockResolvedValue({ userId: 'me' });
    const query = chain([]);
    const response = await GET(new NextRequest('http://localhost/api/ai/history?session=other-session&userId=other'));
    expect(query.eq).toHaveBeenCalledWith('user_id', 'me');
    expect(query.eq).toHaveBeenCalledWith('session_id', 'other-session');
    expect(response.status).toBe(404);
  });

  it('paginates sessions rather than individual turns', async () => {
    mocks.auth.mockResolvedValue({ userId: 'me' });
    const query = chain(Array.from({ length: 21 }, (_, index) => ({ id: String(index), session_id: String(index), question: '问题', created_at: `2026-01-${String(index + 1).padStart(2, '0')}` })));
    const response = await GET(new NextRequest('http://localhost/api/ai/history?page=2'));
    const body = await response.json();
    expect(query.eq).toHaveBeenCalledWith('user_id', 'me');
    expect(body.data.items).toHaveLength(1);
    expect(body.data.hasMore).toBe(false);
  });

  it('returns a retryable error instead of an empty history on database failure', async () => {
    mocks.auth.mockResolvedValue({ userId: 'me' });
    const query = chain([]);
    query.range.mockResolvedValue({ data: [], error: { message: 'unavailable' } });
    expect((await GET(new NextRequest('http://localhost/api/ai/history'))).status).toBe(500);
  });
});
