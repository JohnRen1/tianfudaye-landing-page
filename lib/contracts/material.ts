/**
 * material.ts — 落地页资料管理模块契约类型
 *
 * 覆盖：
 *   - 落地页资料展示 DTO（MaterialLandingItemDTO）：供 materials-page.tsx 和 event-landing-page.tsx 使用
 *   - 资料领取 DTO（MaterialClaimCreateDTO / MaterialClaimCreateResponseDTO）
 *   - 落地页用户个人领取状态 DTO（MaterialMyClaimsDTO）
 *
 * 依赖：./shared.ts（ApiSuccess / ApiFailure / PaginatedData）
 *
 * 审计总纲对应：
 *   S1 — activityId 外键传入（从 URL 参数读取，贯穿领取流程）
 *   S3 — 领取操作落库，返回 downloadUrl，解决\"领取后无下载逻辑\"缺口
 *   S4 — MaterialType / FileFormat 枚举与 admin 侧一致；needCompanyInfo（无 s）统一命名；
 *        claimStatus 替代原 status 字段消除同名异义
 *   S2 — MaterialClaimCreateDTO 包含 activityId，扫码归因链落库
 */

// ===========================================================================
// 枚举（与 admin-system/lib/contracts/material.ts 保持一致）
// ===========================================================================

/**
 * MaterialType — 资料类型枚举
 * 与 admin-system/lib/contracts/material.ts 中的 MaterialType 完全一致。
 * 同时用作落地页 Tab 的 value（categoryTabs[].value）。
 */
export type MaterialType = 'courseware' | 'policy' | 'checklist' | 'case';

/** 落地页 Tab 中文展示标签（与原 categoryTabs[].label 对齐） */
export const MATERIAL_TYPE_TAB_LABEL: Record<MaterialType, string> = {
  courseware: '沙龙课件',
  policy: '政策解读',
  checklist: '自查表',
  case: '案例资料',
};

/**
 * FileFormat — 文件格式枚举
 * 与 admin-system/lib/contracts/material.ts 中的 FileFormat 完全一致。
 * 展示层将 'xlsx' 映射为 \"Excel\"，'pdf' 映射为 \"PDF\" 等。
 */
export type FileFormat = 'pdf' | 'xlsx' | 'pptx' | 'docx';

/** 落地页文件格式展示标签（与原 format === \"Excel\" 逻辑对齐） */
export const FILE_FORMAT_LABEL: Record<FileFormat, string> = {
  pdf: 'PDF',
  xlsx: 'Excel',
  pptx: 'PPT',
  docx: 'Word',
};

/**
 * MaterialClaimStatus — 单条资料对当前用户的领取状态（落地页展示用）
 *
 * S4 解决方案：
 *   - 原 landing-page mock 中的 MaterialStatus（available/claimed/needs_company_info）
 *     与 admin 的上架状态 MaterialStatus 同名异义，高风险混淆
 *   - 重命名为 MaterialClaimStatus，专门描述\"用户对该资料的领取状态\"
 *   - 新增 'needs_login' 值（审计：needLogin 字段在落地页完全未使用，补齐状态机）
 */
export type MaterialClaimStatus =
  | 'available'           // 可领取
  | 'claimed'             // 已领取
  | 'needs_company_info'  // 需要补充企业信息才能领取（含 needLogin）
  | 'needs_login';        // 需要登录才能领取（不需要企业信息）

// ===========================================================================
// 落地页资料展示 DTO
// ===========================================================================

/**
 * MaterialLandingItemDTO — 落地页资料列表单条数据
 *
 * 对应页面：
 *   - landing-page/components/mobile/materials-page.tsx（资料领取页主体）
 *   - landing-page/components/mobile/event-landing-page.tsx（活动落地页内嵌资料入口）
 *
 * 设计决策：
 *   1. 不含 MaterialStatus（上架状态），API 已在服务端过滤只返回 status='published' 的资料
 *   2. claimStatus 由服务端根据当前用户的领取记录计算后返回
 *      （未登录用户：available/needs_login；已登录用户：已领取时返回 claimed）
 *   3. needCompanyInfo（无 s）统一命名（S4）
 *   4. fileSizeBytes 替代 event-landing-page.tsx 的字符串 size 字段（\"2.4 MB\" → 数字）
 *
 * 审计对应：
 *   - event-landing-page.tsx 的 materials.title → name（统一字段名）
 *   - event-landing-page.tsx 的 materials.downloaded → claimStatus（结构化）
 *   - event-landing-page.tsx 的 materials.icon → 前端根据 format 自行选 icon，不由 API 返回
 *   - event-landing-page.tsx 的 materials.size → fileSizeBytes（number，展示层格式化）
 */
export interface MaterialLandingItemDTO {
  /** UUID，对应数据库主键。S4：统一 string，废弃 mock 的 number id */
  id: string;
  name: string;
  /**
   * 细分类型标签（如\"课程课件\"\"答疑整理\"\"专题指南\"），
   * 用于资料卡片的细分 Badge 展示（对应原 materials-page.tsx 中的 material.type 字段）。
   * 可为 null。
   */
  subType: string | null;
  /** S4：统一 MaterialType 英文枚举，用于 Tab 过滤 */
  category: MaterialType;
  /** S4：统一 FileFormat 小写枚举 */
  format: FileFormat;
  /** 资料描述（cards 展示，对应 materials-page.tsx description 字段） */
  description: string | null;
  /** 累计下载次数（前端只读展示） */
  downloads: number;
  /**
   * 是否需要补充企业信息（S4：统一命名，去掉原 landing mock 的 's'）。
   * 门槛层级：needCompanyInfo=true 隐含 needLogin=true。
   */
  needCompanyInfo: boolean;
  /**
   * 当前用户对该资料的领取状态（S4：区别于 admin MaterialStatus 上架状态）。
   * 服务端根据 JWT 中的 userId 和领取记录表计算后返回。
   * 未认证请求时：根据 needLogin / needCompanyInfo 返回 'needs_login' 或 'available'。
   */
  claimStatus: MaterialClaimStatus;
  /**
   * 文件大小（字节数）。
   * 展示层格式化：fileSizeBytes / 1024 / 1024 → \"2.4 MB\"
   * 对应 event-landing-page.tsx 的字符串 size 字段（审计：改为 number）。
   * 可为 null（旧数据）。
   */
  fileSizeBytes: number | null;
}

/**
 * MaterialLandingQueryDTO — 落地页资料列表请求参数
 * 对应：GET /api/materials（落地页端用户 API）
 *
 * 与 admin 的 MaterialQueryDTO 区别：
 *   - 无 status 参数（服务端固定返回 published 资料）
 *   - 有 activityId 参数（活动落地页资料入口，S1 外键筛选）
 *   - 有 category 参数（Tab 切换时前端可传，或一次性拉取所有分类由前端过滤）
 */
export interface MaterialLandingQueryDTO {
  /** 按活动 id 筛选（S1：活动落地页场景，event-landing-page.tsx 使用） */
  activityId?: string;
  /** 按资料分类筛选（可选，materials-page.tsx Tab 切换场景） */
  category?: MaterialType;
  /** 页码，默认 1 */
  page?: number;
  /** 每页条数，默认 20 */
  pageSize?: number;
}

// ===========================================================================
// 落地页用户个人领取记录
// ===========================================================================

/**
 * MaterialMyClaimItemDTO — 当前用户的资料领取记录列表项
 * 对应：GET /api/me/material-claims（端用户查询自己的领取历史）
 */
export interface MaterialMyClaimItemDTO {
  id: string;
  materialId: string;
  materialName: string;
  materialType: MaterialType;
  materialFormat: FileFormat;
  /** ISO 8601 */
  claimedAt: string;
  /**
   * 是否已下载（实际触发文件下载）。
   * 对应 claims vs downloads 两个计数的差异。
   */
  downloaded: boolean;
  /** ISO 8601，实际下载时间，未下载时为 null */
  downloadedAt: string | null;
}

// ===========================================================================
// 领取操作 DTO（与 admin-system 侧的 MaterialClaimCreateDTO 相同）
// ===========================================================================

/**
 * MaterialClaimCreateDTO — 用户领取资料（落地页端用户提交）
 * 对应：POST /api/material-claims
 *
 * S3：领取操作落库，服务端从 JWT 读取 userId，不接受客户端传 userId。
 * S2：activityId 从 URL 参数读取后传入，实现扫码归因链完整性。
 */
export interface MaterialClaimCreateDTO {
  materialId: string;
  /**
   * 来源活动 id（S1/S2：落地页从 URL 参数 ?activity_id= 读取后传入）。
   * 对应 event-landing-page.tsx 中的活动上下文，当前 mock 未传入，此契约补齐。
   * 若无活动上下文可传 null 或省略。
   */
  activityId?: string | null;
}

/**
 * MaterialClaimCreateResponseDTO — 领取成功响应
 * S3：返回 downloadUrl，解决\"领取后无下载逻辑\"缺口（审计 materials-page.tsx:146-164）。
 */
export interface MaterialClaimCreateResponseDTO {
  /** 领取记录 UUID */
  claimId: string;
  materialId: string;
  /** ISO 8601 */
  claimedAt: string;
  /**
   * 文件下载链接（signed URL）。
   * 前端领取成功后立即用此 URL 触发 window.open / a[download]，
   * 解决审计缺口\"handleClaim 仅改变 status，无文件下载逻辑\"。
   */
  downloadUrl: string;
  /** signed URL 过期时间，ISO 8601 */
  downloadUrlExpiresAt: string;
}

// ===========================================================================
// 落地页资料统计（供页面顶部 3 个统计数字展示）
// ===========================================================================

/**
 * MaterialLandingSummaryDTO — 落地页资料模块顶部统计数字
 * 对应：GET /api/materials/summary?activityId=（可选活动维度）
 *
 * 对应 materials-page.tsx 顶部 3 个统计：
 *   - materials.length → total
 *   - materials.filter(m => m.status === 'claimed').length → claimedCount（当前用户已领取数）
 *   - materials.filter(m => m.needsCompanyInfo).length → needsCompanyInfoCount
 */
export interface MaterialLandingSummaryDTO {
  /** 可领取资料总数（当前活动或全部上架资料） */
  total: number;
  /** 当前用户已领取数（未登录时为 0） */
  claimedCount: number;
  /** 需补充企业信息的资料数 */
  needsCompanyInfoCount: number;
}

// ===========================================================================
// 错误码
// ===========================================================================

/**
 * 落地页资料模块错误码
 * 与 admin-system/lib/contracts/material.ts 中的错误码集合保持一致（子集）。
 * 格式：MATERIAL_{VERB}_{REASON} / CLAIM_{VERB}_{REASON}
 */
export const MATERIAL_ERROR_CODES = {
  MATERIAL_NOT_FOUND: 'MATERIAL_NOT_FOUND',
  MATERIAL_NOT_PUBLISHED: 'MATERIAL_NOT_PUBLISHED',
  CLAIM_LOGIN_REQUIRED: 'CLAIM_LOGIN_REQUIRED',
  CLAIM_COMPANY_INFO_REQUIRED: 'CLAIM_COMPANY_INFO_REQUIRED',
  CLAIM_ALREADY_CLAIMED: 'CLAIM_ALREADY_CLAIMED',
  CLAIM_NOT_FOUND: 'CLAIM_NOT_FOUND',
  CLAIM_DOWNLOAD_URL_EXPIRED: 'CLAIM_DOWNLOAD_URL_EXPIRED',
} as const;

export type MaterialErrorCode = typeof MATERIAL_ERROR_CODES[keyof typeof MATERIAL_ERROR_CODES];
