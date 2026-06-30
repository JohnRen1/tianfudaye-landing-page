import { NextRequest } from 'next/server';
import { getCurrentUserById } from './db';
import type { CurrentUserDTO } from './contracts/auth';
import { isUserAuthBypassEnabled, resolveBypassUser } from './auth-bypass';
import { parseUserAuthToken, USER_AUTH_TOKEN_COOKIE } from './auth-token';

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
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const cookieToken = req.cookies.get(USER_AUTH_TOKEN_COOKIE)?.value ?? null;
  const token = bearerToken || cookieToken;

  if (!token) {
    if (!isUserAuthBypassEnabled()) return null;
    const user = await resolveBypassUser();
    return { userId: user.id, user };
  }

  const userId = parseUserAuthToken(token);
  if (!userId) {
    if (!isUserAuthBypassEnabled()) return null;
    const user = await resolveBypassUser();
    return { userId: user.id, user };
  }

  const user = await getCurrentUserById(userId);
  if (!user) {
    if (!isUserAuthBypassEnabled()) return null;
    const bypassUser = await resolveBypassUser();
    return { userId: bypassUser.id, user: bypassUser };
  }

  return { userId, user };
}

/**
 * 可选认证：有 token 则解析用户，无 token 或无效 token 则返回 null。
 * 用于既支持已登录也支持匿名访问的接口（如签到页数据查询）。
 */
export async function optionalUser(req: NextRequest): Promise<UserContext | null> {
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const cookieToken = req.cookies.get(USER_AUTH_TOKEN_COOKIE)?.value ?? null;
  const token = bearerToken || cookieToken;

  if (!token) return null;

  const userId = parseUserAuthToken(token);
  if (!userId) return null;

  const user = await getCurrentUserById(userId);
  if (!user) return null;

  return { userId, user };
}
