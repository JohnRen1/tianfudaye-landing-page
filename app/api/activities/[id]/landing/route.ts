import { NextRequest } from 'next/server';
import { getActivityLandingDetail } from '@/lib/db';
import { ok, fail } from '@/lib/api-response';
import { TRACKING_ERROR_CODES } from '@/lib/contracts/tracking';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return fail(TRACKING_ERROR_CODES.TRACK_ACTIVITY_NOT_FOUND, '活动 id 不能为空', 400);
  }

  const response = await getActivityLandingDetail(id);
  if (!response) {
    return fail(TRACKING_ERROR_CODES.TRACK_ACTIVITY_NOT_FOUND, '活动不存在或已下架', 404);
  }
  return ok(response);
}
