import type { CurrentUserDTO } from './contracts/auth';
import { buildPhoneLoginResponse, loginOrCreateUserByPhone } from './db';
import { pickEnvByStage, pickTruthyEnvByStage } from './env';

const DEFAULT_PHONE = '18660396808';

export function isUserAuthBypassEnabled(): boolean {
  return pickTruthyEnvByStage(
    process.env.AUTH_BYPASS_ENABLED,
    process.env.NEXT_PUBLIC_AUTH_BYPASS_ENABLED,
  );
}

export function getBypassUserPhone(): string {
  return (
    pickEnvByStage(
      process.env.AUTH_BYPASS_USER_PHONE,
      process.env.NEXT_PUBLIC_AUTH_BYPASS_USER_PHONE,
    ) ||
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
