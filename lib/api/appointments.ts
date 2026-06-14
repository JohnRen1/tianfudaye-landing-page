/**
 * appointments.ts — 落地页预约模块 API 客户端
 *
 * 封装：提交预约、获取当前用户预约列表。
 */

import { apiGet, apiPost } from './client';
import type {
  AppointmentCreateDTO,
  AppointmentCreateResponseDTO,
  AppointmentMySummaryDTO,
} from '../contracts/appointment';

/**
 * 提交预约
 * POST /api/appointments
 */
export async function submitAppointment(
  dto: AppointmentCreateDTO,
): Promise<AppointmentCreateResponseDTO> {
  return apiPost<AppointmentCreateResponseDTO>('/api/appointments', dto);
}

/**
 * 获取当前用户的预约列表
 * GET /api/appointments/me
 */
export async function getMyAppointments(): Promise<AppointmentMySummaryDTO[]> {
  return apiGet<AppointmentMySummaryDTO[]>('/api/appointments/me');
}
