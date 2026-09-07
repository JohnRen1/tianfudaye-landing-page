import { NextRequest } from 'next/server';
import { sendDevPhoneCode } from '@/lib/db';
import { ok, fail } from '@/lib/api-response';
import type { SendCodeResponseDTO } from '@/lib/contracts/auth';
import { getSmsProvider, getSmsRuntimeInfo, sendJuheSmsCode } from '@/lib/sms';

export const dynamic = 'force-dynamic';

const PHONE_REGEX = /^1[3-9]\d{9}$/;

function maskPhone(phone: string): string {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const clientPlatform = req.headers.get('x-client-platform') ?? 'unknown';
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    console.warn('[api/auth/send-code] invalid request body', { requestId, clientPlatform });
    return fail('INVALID_REQUEST_BODY', '请求体格式错误', 400, undefined, requestId);
  }

  const { phone, purpose } = body as Record<string, unknown>;
  const maskedPhone = typeof phone === 'string' ? maskPhone(phone) : null;
  console.info('[api/auth/send-code] request', { requestId, clientPlatform, phone: maskedPhone, purpose });

  if (typeof phone !== 'string' || !PHONE_REGEX.test(phone)) {
    return fail('INVALID_PHONE', '手机号格式不正确', 400, undefined, requestId);
  }

  if (purpose !== 'login') {
    return fail('INVALID_PURPOSE', '验证码用途不合法', 400, undefined, requestId);
  }

  try {
    const result = await sendDevPhoneCode(phone);
    const provider = getSmsProvider();
    const runtimeInfo = getSmsRuntimeInfo();

    console.info('[auth/send-code] code prepared', {
      requestId,
      phone: maskPhone(phone),
      provider,
      hasJuheApiKey: runtimeInfo.hasJuheApiKey,
      hasJuheTplId: runtimeInfo.hasJuheTplId,
    });

    if (provider === 'juhe') {
      if (!result._devCode) {
        return fail('SMS_CODE_PREPARE_FAILED', '验证码生成失败', 500);
      }
      await sendJuheSmsCode({ phone, code: result._devCode });
      console.info('[auth/send-code] juhe sms sent', {
        phone: maskPhone(phone),
      });
    }

    const response: SendCodeResponseDTO = {
      expiresInSeconds: result.expiresInSeconds,
      isRegistered: result.isRegistered,
    };

    if (provider === 'dev') {
      console.info('[api/auth/send-code] success', { requestId, provider, hasDevCode: Boolean(result._devCode) });
      return ok({ ...response, _devCode: result._devCode });
    }

    console.info('[api/auth/send-code] success', { requestId, provider, hasDevCode: false });
    return ok(response);
  } catch (error) {
    console.error('[auth/send-code] failed', {
      requestId,
      phone: typeof phone === 'string' ? maskPhone(phone) : null,
      provider: getSmsProvider(),
      message: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof Error) {
      if (error.message === 'CODE_SEND_TOO_FREQUENT') {
        return fail('CODE_SEND_TOO_FREQUENT', '发送太频繁，请 60 秒后再试', 429, undefined, requestId);
      }
      if (error.message === 'CODE_DAILY_LIMIT_EXCEEDED') {
        return fail('CODE_DAILY_LIMIT_EXCEEDED', '今日验证码发送次数已达上限', 429, undefined, requestId);
      }
    }
    return fail('SEND_CODE_FAILED', '验证码发送失败', 500, error instanceof Error ? error.message : error, requestId);
  }
}
