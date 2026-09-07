import { NextRequest } from 'next/server';
import { bindWechatOpenIdToUser, buildPhoneLoginResponse, loginOrCreateUserByPhone, verifyAndConsumeDevCode } from '@/lib/db';
import { ok, fail } from '@/lib/api-response';
import { buildUserAuthToken, setUserAuthCookie } from '@/lib/auth-token';
import type { PhoneLoginResponseDTO } from '@/lib/contracts/auth';
import { exchangeMiniProgramCodeForOpenId } from '@/lib/wechat';

export const dynamic = 'force-dynamic';

const PHONE_REGEX = /^1[3-9]\d{9}$/;
const CODE_REGEX = /^\d{6}$/;

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const clientPlatform = req.headers.get('x-client-platform') ?? 'unknown';
  let failureStage = 'parse_request';
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    console.warn('[api/auth/login-phone] invalid request body', { requestId, clientPlatform });
    return fail('INVALID_REQUEST_BODY', '请求体格式错误', 400, undefined, requestId);
  }

  const { phone, code, sourceQrId, sourceActivityId, miniProgramCode } = body as Record<string, unknown>;
  const maskedPhone = typeof phone === 'string' ? phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2') : null;
  console.info('[api/auth/login-phone] request', {
    requestId,
    clientPlatform,
    phone: maskedPhone,
    hasMiniProgramCode: typeof miniProgramCode === 'string' && miniProgramCode.length > 0,
    hasSourceQrId: typeof sourceQrId === 'string' && sourceQrId.length > 0,
    hasSourceActivityId: typeof sourceActivityId === 'string' && sourceActivityId.length > 0,
  });

  if (typeof phone !== 'string' || !PHONE_REGEX.test(phone)) {
    return fail('INVALID_PHONE', '手机号格式不正确', 400, undefined, requestId);
  }

  if (typeof code !== 'string' || !CODE_REGEX.test(code)) {
    return fail('INVALID_CODE', '验证码格式不正确', 400, undefined, requestId);
  }

  failureStage = 'verify_code';
  const isValid = await verifyAndConsumeDevCode(phone, code);
  console.info('[api/auth/login-phone] verification result', { requestId, valid: isValid });
  if (!isValid) return fail('AUTH_INVALID_CODE', '验证码错误或已过期', 401, undefined, requestId);

  try {
    failureStage = 'exchange_mini_program_code';
    const miniProgramOpenId = typeof miniProgramCode === 'string' && miniProgramCode.length > 0
      ? await exchangeMiniProgramCodeForOpenId(miniProgramCode)
      : undefined;
    console.info('[api/auth/login-phone] mini program code exchange', { requestId, exchanged: Boolean(miniProgramOpenId) });
    failureStage = 'login_or_create_user';
    const result = await loginOrCreateUserByPhone({
      phone,
      sourceQrId: typeof sourceQrId === 'string' ? sourceQrId : undefined,
      sourceActivityId: typeof sourceActivityId === 'string' ? sourceActivityId : undefined,
    });
    console.info('[api/auth/login-phone] user resolved', { requestId, isNew: result.isNew });
    failureStage = 'bind_openid';
    if (miniProgramOpenId) {
      await bindWechatOpenIdToUser(result.user.id, miniProgramOpenId);
    }
    console.info('[api/auth/login-phone] success', { requestId, userId: result.user.id, isNew: result.isNew });
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
    console.error('[api/auth/login-phone] failed', {
      requestId,
      stage: failureStage,
      phone: maskedPhone,
      error: error instanceof Error ? error.message : String(error),
    });
    return fail('USER_CREATE_FAILED', '用户登录失败', 500, error instanceof Error ? error.message : error, requestId);
  }
}
