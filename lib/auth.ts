import { NextRequest } from 'next/server';
import { getCurrentUserById } from './db';
import type { CurrentUserDTO } from './contracts/auth';

export interface UserContext {
  userId: string;
  user: CurrentUserDTO;
}

/**
 * 从 Authorization: Bearer <token> 验证落地页端用户身份。
 * 当前阶段使用开发临时 token（base64 userId:timestamp）。
 * 生产阶段替换为 Supabase Auth JWT 验证。
 */
export async function requireUser(req: NextRequest): Promise<UserContext | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  // 开发阶段：解析临时 token（格式：base64(userId:timestamp)）
  let userId: string;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [id] = decoded.split(':');
    if (!id || id.length < 10) return null;
    userId = id;
  } catch {
    return null;
  }

  const user = await getCurrentUserById(userId);
  if (!user) return null;

  return { userId, user };
}
