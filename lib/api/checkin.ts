/**
 * checkin.ts — 落地页签到模块 API 客户端
 */

import { apiGet, apiPost } from './client';
import type { CheckinPageDTO, CheckinSubmitResponseDTO } from '../contracts/checkin';

export async function getCheckinPage(qrId: string): Promise<CheckinPageDTO> {
  return apiGet<CheckinPageDTO>('/api/checkin', { qr_id: qrId });
}

export async function submitCheckin(checkinQrId: string): Promise<CheckinSubmitResponseDTO> {
  return apiPost<CheckinSubmitResponseDTO>('/api/checkin', { checkinQrId });
}
