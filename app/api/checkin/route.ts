import { NextRequest } from 'next/server';
import { getCheckinPageData, submitCheckin } from '@/lib/db';
import { requireUser, optionalUser } from '@/lib/auth';
import { ok, fail } from '@/lib/api-response';
import type { CheckinSubmitDTO } from '@/lib/contracts/checkin';

export const dynamic = 'force-dynamic';

/** GET /api/checkin?qr_id=xxx — 查询签到码信息（落地页签到页加载） */
export async function GET(req: NextRequest) {
  const qrId = req.nextUrl.searchParams.get('qr_id');
  if (!qrId) return fail('CHECKIN_QR_NOT_FOUND', '缺少 qr_id 参数', 400);

  // 已登录用户的 userId 用于判断是否已签到，未登录时为 null
  const ctx = await optionalUser(req);

  try {
    const data = await getCheckinPageData(qrId, ctx?.userId ?? null);
    return ok(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'CHECKIN_QR_NOT_FOUND')        return fail('CHECKIN_QR_NOT_FOUND', '活动二维码不存在或已停用', 404);
    if (message === 'CHECKIN_QR_NOT_ACTIVITY_TYPE') return fail('CHECKIN_QR_NOT_ACTIVITY_TYPE', '该二维码不是活动二维码，无法用于签到', 400);
    if (message === 'CHECKIN_ACTIVITY_NOT_FOUND')  return fail('CHECKIN_ACTIVITY_NOT_FOUND', '活动不存在', 404);
    return fail('CHECKIN_LOAD_FAILED', '签到信息加载失败', 500, message);
  }
}

/** POST /api/checkin — 提交签到（必须已登录） */
export async function POST(req: NextRequest) {
  const ctx = await requireUser(req);
  if (!ctx) return fail('CHECKIN_AUTH_REQUIRED', '请先登录后再签到', 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('INVALID_REQUEST_BODY', '请求体格式错误', 400);
  }

  const { checkinQrId } = body as CheckinSubmitDTO & Record<string, unknown>;
  if (typeof checkinQrId !== 'string' || !checkinQrId) {
    return fail('CHECKIN_QR_NOT_FOUND', 'checkinQrId 不能为空', 400);
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? undefined;

  try {
    const result = await submitCheckin({
      checkinQrId,
      userId: ctx.userId,
      ipAddress: ip,
    });
    return ok(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'CHECKIN_QR_NOT_FOUND')        return fail('CHECKIN_QR_NOT_FOUND', '活动二维码不存在', 404);
    if (message === 'CHECKIN_QR_NOT_ACTIVITY_TYPE') return fail('CHECKIN_QR_NOT_ACTIVITY_TYPE', '该二维码不是活动二维码，无法用于签到', 400);
    if (message === 'CHECKIN_ACTIVITY_NOT_FOUND')  return fail('CHECKIN_ACTIVITY_NOT_FOUND', '活动不存在', 404);
    if (message === 'CHECKIN_WINDOW_NOT_OPEN')     return fail('CHECKIN_WINDOW_NOT_OPEN', '当前不在签到时间内', 403);
    if (message === 'CHECKIN_ALREADY_DONE')        return fail('CHECKIN_ALREADY_DONE', '您已完成本场签到', 409);
    return fail('CHECKIN_FAILED', '签到失败，请重试', 500, message);
  }
}
