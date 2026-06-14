import { NextRequest } from 'next/server';
import { sendDevPhoneCode } from '@/lib/db';
import { ok, fail } from '@/lib/api-response';
import type { SendCodeResponseDTO } from '@/lib/contracts/auth';

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
    const response: SendCodeResponseDTO & { _devCode?: string } = await sendDevPhoneCode(phone);
    return ok(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'CODE_SEND_TOO_FREQUENT') {
      return fail('CODE_SEND_TOO_FREQUENT', '发送太频繁，请 60 秒后再试', 429);
    }
    return fail('SEND_CODE_FAILED', '验证码发送失败', 500, error instanceof Error ? error.message : error);
  }
}
