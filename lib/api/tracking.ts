/**
 * tracking.ts — 落地页追踪模块 API 客户端
 *
 * 封装：上报扫码事件、按活动 id 获取落地页活动详情。
 */

import { apiGet, apiPost } from './client';
import type {
  QrScanTrackResponseDTO,
  ActivityLandingDetailDTO,
} from '../contracts/tracking';

/**
 * 上报二维码扫码事件
 * POST /api/track/qr-scan
 */
export async function trackQrScan(
  qrCodeId: string,
  sessionId?: string,
  userAgent?: string,
): Promise<QrScanTrackResponseDTO> {
  return apiPost<QrScanTrackResponseDTO>('/api/track/qr-scan', {
    qrId: qrCodeId,
    ...(sessionId ? { sessionId } : {}),
    ...(userAgent ? { userAgent } : {}),
  });
}

/**
 * 按活动 id 获取落地页活动详情
 * GET /api/activities/:id/landing
 */
export async function getActivityLanding(
  activityId: string,
): Promise<ActivityLandingDetailDTO> {
  return apiGet<ActivityLandingDetailDTO>(`/api/activities/${activityId}/landing`);
}
