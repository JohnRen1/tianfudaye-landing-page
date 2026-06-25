import { NextRequest } from 'next/server';
import { buildPhoneLoginResponse, loginOrCreateUserByPhone, verifyAndConsumeDevCode } from '@/lib/db';
import { ok, fail } from '@/lib/api-response';
import { buildUserAuthToken, setUserAuthCookie } from '@/lib/auth-token';
import type { PhoneLoginResponseDTO } from '@/lib/contracts/auth';

export const dynamic = 'force-dynamic';

const PHONE_REGEX = /^1[3-9]\d{9}$/;
const CODE_REGEX = /^\d{6}$/;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('INVALID_REQUEST_BODY', '请求体格式错误', 400);
  }

  const { phone, code, sourceQrId, sourceActivityId } = body as Record<string, unknown>;

  if (typeof phone !== 'string' || !PHONE_REGEX.test(phone)) {
    return fail('INVALID_PHONE', '手机号格式不正确', 400);
  }

  if (typeof code !== 'string' || !CODE_REGEX.test(code)) {
    return fail('INVALID_CODE', '验证码格式不正确', 400);
  }

  const isValid = await verifyAndConsumeDevCode(phone, code);
  if (!isValid) {
    return fail('AUTH_INVALID_CODE', '验证码错误或已过期', 401);
  }

  try {
    const result = await loginOrCreateUserByPhone({
      phone,
      sourceQrId: typeof sourceQrId === 'string' ? sourceQrId : undefined,
      sourceActivityId: typeof sourceActivityId === 'string' ? sourceActivityId : undefined,
    });
    const accessToken = buildUserAuthToken(result.user.id);
    const response: PhoneLoginResponseDTO = buildPhoneLoginResponse({
      user: result.user,
      isNew: result.isNew,
      accessToken,
    });
    const nextResponse = ok(response);
    setUserAuthCookie(nextResponse, accessToken);
    return nextResponse;
  } catch (error) {
    return fail('USER_CREATE_FAILED', '用户登录失败', 500, error instanceof Error ? error.message : error);
  }
}
