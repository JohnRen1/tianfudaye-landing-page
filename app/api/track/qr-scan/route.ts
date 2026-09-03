import { NextRequest } from 'next/server';
import { createServiceClient, trackQrScan } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ok, fail } from '@/lib/api-response';
import type { QrScanTrackRequestDTO } from '@/lib/contracts/tracking';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('INVALID_REQUEST_BODY', '请求体格式错误', 400);
  }

  const requestBody = body as QrScanTrackRequestDTO & Record<string, unknown>;
  let qrCodeId =
    typeof requestBody.qrCodeId === 'string'
      ? requestBody.qrCodeId
      : typeof requestBody.qrId === 'string'
        ? requestBody.qrId
        : '';
  const scene = typeof requestBody.scene === 'string' ? requestBody.scene.trim() : '';
  const { sessionId, userAgent } = requestBody;

  if (!qrCodeId && scene) {
    const decodedScene = (() => { try { return decodeURIComponent(scene); } catch { return scene; } })();
    const uuidScene = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(decodedScene);
    const nestedQrId = decodedScene.match(/(?:^|&)qr_id=([^&]+)/)?.[1];
    if (uuidScene) qrCodeId = decodedScene;
    else if (nestedQrId) qrCodeId = decodeURIComponent(nestedQrId);
    else {
      const serviceClient = createServiceClient();
      const { data, error } = await serviceClient
        .from('qr_codes')
        .select('id')
        .eq('invite_code', decodedScene)
        .maybeSingle();
      if (error) return fail('QR_SCENE_RESOLVE_FAILED', '二维码入口解析失败', 500);
      qrCodeId = typeof data?.id === 'string' ? data.id : '';
    }
  }

  if (typeof qrCodeId !== 'string' || !qrCodeId) {
    return fail('INVALID_QR_CODE_ID', 'qrCodeId 不能为空', 400);
  }

  const userCtx = await requireUser(req);
  const response = await trackQrScan({
    qrCodeId,
    sessionId: typeof sessionId === 'string' ? sessionId : null,
    userAgent: typeof userAgent === 'string' ? userAgent : null,
    userId: userCtx?.userId ?? null,
    isProfileComplete: userCtx?.user.isProfileComplete ?? false,
  });

  if (!response) {
    return fail('QR_CODE_NOT_FOUND', '二维码不存在或已停用', 404);
  }
  return ok({ ...response, qrCodeId });
}
