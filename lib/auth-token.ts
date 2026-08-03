import { NextResponse } from 'next/server';

export const USER_AUTH_TOKEN_COOKIE = 'user_auth_token';
export const USER_AUTH_TOKEN_TTL_SECONDS = 
  parseInt(process.env.USER_AUTH_TOKEN_TTL_SECONDS ?? '', 10) || 
  30 * 24 * 60 * 60;

export function buildUserAuthToken(userId: string, issuedAt = Date.now()): string {
  return Buffer.from(`${userId}:${issuedAt}`).toString('base64');
}

export function parseUserAuthToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId, issuedAtStr] = decoded.split(':');
    if (!userId || userId.length < 10) return null;
    
    const issuedAt = parseInt(issuedAtStr ?? '', 10);
    if (!issuedAt || isNaN(issuedAt)) return null;
    
    const ageSeconds = (Date.now() - issuedAt) / 1000;
    if (ageSeconds > USER_AUTH_TOKEN_TTL_SECONDS) {
      return null;
    }
    
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
