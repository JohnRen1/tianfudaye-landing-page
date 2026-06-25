import type { CurrentUserDTO } from './contracts/auth';
import { buildPhoneLoginResponse, loginOrCreateUserByPhone } from './db';

const DEFAULT_PHONE = '18660396808';

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function isUserAuthBypassEnabled(): boolean {
  return isTruthy(process.env.AUTH_BYPASS_ENABLED) || isTruthy(process.env.NEXT_PUBLIC_AUTH_BYPASS_ENABLED);
}

export function getBypassUserPhone(): string {
  return (
    process.env.AUTH_BYPASS_USER_PHONE?.trim() ||
    process.env.NEXT_PUBLIC_AUTH_BYPASS_USER_PHONE?.trim() ||
    DEFAULT_PHONE
  );
}

export function buildUserToken(userId: string): string {
  return Buffer.from(`${userId}:${Date.now()}`).toString('base64');
}

export async function resolveBypassUser(): Promise<CurrentUserDTO> {
  const result = await loginOrCreateUserByPhone({
    phone: getBypassUserPhone(),
  });
  return result.user;
}

export async function buildBypassLoginResponse() {
  const user = await resolveBypassUser();
  return buildPhoneLoginResponse({
    user,
    isNew: false,
    accessToken: buildUserToken(user.id),
  });
}
