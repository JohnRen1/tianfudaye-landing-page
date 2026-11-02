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
      // 已发布小程序遇到 404 会停在「正在恢复对话」。没有记录时返回空数组，恢复结束并可继续提问。
      return ok(await getChatSession(user.userId, sessionId));
    }
    return ok(await listChatSessions(user.userId, page));
  } catch {
    return fail('CHAT_HISTORY_FAILED', '历史对话加载失败，请重试', 500);
  }
}
