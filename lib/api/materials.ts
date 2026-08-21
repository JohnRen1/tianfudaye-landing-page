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
  MaterialViewResponseDTO,
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

/**
 * 获取已领取资料的查看地址。
 * 请求会携带端用户 Authorization；客户端随后在当前页面导航，避免移动端弹窗限制。
 */
export async function getMaterialViewUrl(materialId: string): Promise<MaterialViewResponseDTO> {
  return apiGet<MaterialViewResponseDTO>(
    `/api/materials/${encodeURIComponent(materialId)}/view`,
  );
}
