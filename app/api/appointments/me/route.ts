import { NextRequest } from 'next/server';
import { listUserAppointments } from '@/lib/db';
import { ok, fail } from '@/lib/api-response';
import { requireUser } from '@/lib/auth';
import { APPOINTMENT_ERROR_CODES } from '@/lib/contracts/appointment';

export async function GET(req: NextRequest) {
  // 认证：端用户必须登录
  const ctx = await requireUser(req);
  if (!ctx) {
    return fail(
      APPOINTMENT_ERROR_CODES.APPOINTMENT_AUTH_REQUIRED,
      '请先登录后再查看预约记录',
      401,
    );
  }
  const { userId } = ctx;

  try {
    const list = await listUserAppointments(userId);
    return ok(list);
  } catch (error) {
    return fail('APPOINTMENT_FETCH_FAILED', '预约记录获取失败', 500, error instanceof Error ? error.message : error);
  }
}
