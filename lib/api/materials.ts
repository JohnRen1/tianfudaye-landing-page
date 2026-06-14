/**
 * materials.ts — 落地页资料模块 API 客户端
 *
 * 封装：获取资料列表、领取资料。
 */

import { apiGet, apiPost } from './client';
import type {
  MaterialLandingItemDTO,
  MaterialLandingQueryDTO,
  MaterialClaimCreateResponseDTO,
} from '../contracts/material';
import type { PaginatedData } from '../contracts/shared';

/**
 * 获取资料列表
 * GET /api/materials
 */
export async function getMaterials(
  params?: MaterialLandingQueryDTO,
): Promise<PaginatedData<MaterialLandingItemDTO>> {
  return apiGet<PaginatedData<MaterialLandingItemDTO>>('/api/materials', params as Record<string, string | number | boolean | null | undefined>);
}

/**
 * 领取资料
 * POST /api/material-claims
 */
export async function claimMaterial(
  materialId: string,
  activityId?: string | null,
): Promise<MaterialClaimCreateResponseDTO> {
  return apiPost<MaterialClaimCreateResponseDTO>('/api/material-claims', {
    materialId,
    ...(activityId !== undefined ? { activityId } : {}),
  });
}
