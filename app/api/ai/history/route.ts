import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { ok, fail } from '@/lib/api-response';
import { getChatSession, listChatSessions } from '@/lib/database/ai-history';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return fail('AUTH_REQUIRED', '请先登录后查看历史对话', 401);
  const sessionId = req.nextUrl.searchParams.get('session');
  const page = Number(req.nextUrl.searchParams.get('page') ?? '1');
  if (!Number.isSafeInteger(page) || page < 1 || (sessionId !== null && (!sessionId.trim() || sessionId.length > 200))) {
    return fail('INVALID_QUERY', '历史查询参数无效', 400);
  }
  try {
    if (sessionId !== null) {
      const turns = await getChatSession(user.userId, sessionId);
      if (!turns.length) return fail('CHAT_NOT_FOUND', '该对话不存在或不属于当前账号', 404);
      return ok(turns);
    }
    return ok(await listChatSessions(user.userId, page));
  } catch {
    return fail('CHAT_HISTORY_FAILED', '历史对话加载失败，请重试', 500);
  }
}
