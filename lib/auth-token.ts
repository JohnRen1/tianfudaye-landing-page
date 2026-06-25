import { NextResponse } from 'next/server';

export const USER_AUTH_TOKEN_COOKIE = 'user_auth_token';
export const USER_AUTH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export function buildUserAuthToken(userId: string, issuedAt = Date.now()): string {
  return Buffer.from(`${userId}:${issuedAt}`).toString('base64');
}

export function parseUserAuthToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId] = decoded.split(':');
    if (!userId || userId.length < 10) return null;
    return userId;
  } catch {
    return null;
  }
}

export function setUserAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: USER_AUTH_TOKEN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: USER_AUTH_TOKEN_TTL_SECONDS,
  });
}
