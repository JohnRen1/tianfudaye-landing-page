import { NextRequest } from 'next/server';
import { sendDevPhoneCode } from '@/lib/db';
import { ok, fail } from '@/lib/api-response';
import type { SendCodeResponseDTO } from '@/lib/contracts/auth';
import { getSmsProvider, sendJuheSmsCode } from '@/lib/sms';

export const dynamic = 'force-dynamic';

const PHONE_REGEX = /^1[3-9]\d{9}$/;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('INVALID_REQUEST_BODY', '请求体格式错误', 400);
  }

  const { phone, purpose } = body as Record<string, unknown>;

  if (typeof phone !== 'string' || !PHONE_REGEX.test(phone)) {
    return fail('INVALID_PHONE', '手机号格式不正确', 400);
  }

  if (purpose !== 'login') {
    return fail('INVALID_PURPOSE', '验证码用途不合法', 400);
  }

  try {
    const result = await sendDevPhoneCode(phone);
    const provider = getSmsProvider();

    if (provider === 'juhe') {
      if (!result._devCode) {
        return fail('SMS_CODE_PREPARE_FAILED', '验证码生成失败', 500);
      }
      await sendJuheSmsCode({ phone, code: result._devCode });
    }

    const response: SendCodeResponseDTO = {
      expiresInSeconds: result.expiresInSeconds,
      isRegistered: result.isRegistered,
    };

    if (provider === 'dev') {
      return ok({ ...response, _devCode: result._devCode });
    }

    return ok(response);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'CODE_SEND_TOO_FREQUENT') {
        return fail('CODE_SEND_TOO_FREQUENT', '发送太频繁，请 60 秒后再试', 429);
      }
      if (error.message === 'CODE_DAILY_LIMIT_EXCEEDED') {
        return fail('CODE_DAILY_LIMIT_EXCEEDED', '今日验证码发送次数已达上限', 429);
      }
    }
    return fail('SEND_CODE_FAILED', '验证码发送失败', 500, error instanceof Error ? error.message : error);
  }
}
