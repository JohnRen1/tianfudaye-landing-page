import { NextRequest } from 'next/server';
import { trackQrScan } from '@/lib/db';
import { ok, fail } from '@/lib/api-response';
import type { QrScanTrackRequestDTO } from '@/lib/contracts/tracking';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('INVALID_REQUEST_BODY', '请求体格式错误', 400);
  }

  const requestBody = body as QrScanTrackRequestDTO & Record<string, unknown>;
  const qrCodeId =
    typeof requestBody.qrCodeId === 'string'
      ? requestBody.qrCodeId
      : typeof requestBody.qrId === 'string'
        ? requestBody.qrId
        : '';
  const { sessionId, userAgent } = requestBody;

  if (typeof qrCodeId !== 'string' || !qrCodeId) {
    return fail('INVALID_QR_CODE_ID', 'qrCodeId 不能为空', 400);
  }

  const response = await trackQrScan({
    qrCodeId,
    sessionId: typeof sessionId === 'string' ? sessionId : null,
    userAgent: typeof userAgent === 'string' ? userAgent : null,
  });

  if (!response) {
    return fail('QR_CODE_NOT_FOUND', '二维码不存在或已停用', 404);
  }
  return ok(response);
}
