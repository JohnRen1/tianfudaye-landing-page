/**
 * activity.ts — 落地页活动展示契约类型
 *
 * 覆盖：落地页活动展示 DTO（EventLandingDTO）、
 *       活动关联资料展示 DTO（ActivityMaterialDisplayDTO）、
 *       资料领取请求/响应 DTO。
 *
 * 依赖：./shared.ts
 *
 * 字段映射说明（S4：解决两端字段冲突）：
 *
 * | admin-system 字段      | 落地页字段              | 转换方式             |
 * |------------------------|------------------------|----------------------|
 * | activities.name        | EventLandingDTO.title  | 直接映射，字段名不同 |
 * | activities.teacher     | EventLandingDTO.speaker| 直接映射，字段名不同 |
 * | （缺失）               | EventLandingDTO.speakerTitle | admin 补全后映射 |
 * | activities.place       | EventLandingDTO.location | 直接映射，字段名不同 |
 * | activities.startAt     | EventLandingDTO.date   | 后端格式化 YYYY-MM-DD |
 * | activities.startAt/endAt | EventLandingDTO.time | 后端格式化\"HH:mm - HH:mm\" |
 * | （缺失）               | EventLandingDTO.description | admin 补全后映射 |
 * | （缺失）               | EventLandingDTO.coverImage  | admin 补全后映射 |
 *
 * 与 tracking.ts 的关系：
 *   - tracking.ts 已定义 TrackingActivityDTO 和 ActivityLandingDetailDTO，
 *     这两个 DTO 覆盖扫码路径（POST /api/track/qr-scan 响应中的活动信息）。
 *   - 本文件的 EventLandingDTO 与 TrackingActivityDTO 字段完全对齐，
 *     是 EventLandingPage 组件的 eventData props 的契约类型。
 *   - ActivityLandingDetailDTO（tracking.ts 中定义）= TrackingActivityDTO，
 *     覆盖直接按 activity_id 加载活动详情的路径（GET /api/activities/:id/landing）。
 *   - 本文件不重复定义已有 DTO，通过 re-export 对齐。
 *
 * 注意：本项目无 packages/ 共享包，落地页与管理后台的 DTO 单独维护。
 */

import type { MaterialClaimStatus } from './material';

// ===========================================================================
// 活动展示 DTO（EventLandingPage 组件 eventData props 契约）
// ===========================================================================

/**
 * EventLandingDTO — 落地页活动信息展示数据
 *
 * 字段命名与 EventLandingPage 组件 eventData props 完全对齐（event-landing-page.tsx:28-37）。
 * 由后端在响应时从 Activity 实体转换，前端直接赋值给组件 props，无需额外映射。
 *
 * 获取路径：
 *   1. 扫码路径：POST /api/track/qr-scan → QrScanTrackResponseDTO.activity（TrackingActivityDTO）
 *   2. 直链路径：GET /api/activities/:id/landing → ActivityLandingDetailDTO
 *   3. 两个路径返回字段结构完全相同，本 DTO 与 TrackingActivityDTO 对齐。
 *
 * 与 tracking.ts 中 TrackingActivityDTO 的关系：
 *   EventLandingDTO 是本文件维护的落地页视角类型别名，
 *   与 tracking.ts/TrackingActivityDTO 字段完全相同，两者保持同步。
 *   如两者出现分歧，以 tracking.ts/TrackingActivityDTO 为准（已接入 S2 归因链）。
 */
export interface EventLandingDTO {
  /** 活动 id（UUID） */
  id: string;
  /**
   * 活动标题（对应 admin activities.name）。
   * 组件用法：eventData.title → <h1>{eventData.title}</h1>
   */
  title: string;
  /**
   * 主讲人姓名（对应 admin activities.teacher）。
   * 组件用法：eventData.speaker → {eventData.speaker} · {eventData.speakerTitle}
   */
  speaker: string;
  /**
   * 主讲人职称（admin 侧需补全 speakerTitle 字段）。
   * 审计高风险项 S4：admin-system mock 无此字段，本契约要求 admin 侧补全。
   * 组件用法：eventData.speakerTitle → {eventData.speaker} · {eventData.speakerTitle}
   */
  speakerTitle: string;
  /**
   * 活动日期，格式化字符串供展示用（如\"2026年6月18日\"）。
   * 后端从 ISO 8601 startAt 格式化（对应 admin activities.startAt 日期部分）。
   * 审计高风险项 S4：替代 mock 中 activities.time 单字符串同时存日期+时间的问题。
   * 组件用法：eventData.date → <span>{eventData.date}</span>
   */
  date: string;
  /**
   * 活动时间段字符串（如\"14:00 - 17:00\"）。
   * 后端从 startAt/endAt 格式化，仅含时分，不含日期。
   * 审计高风险项 S4：替代 mock 中将日期+时间混合存储在一个字段的问题。
   * 组件用法：eventData.time → <span>{eventData.time}</span>
   */
  time: string;
  /**
   * 活动地点（对应 admin activities.place）。
   * 字段名统一为 location（落地页组件用法），映射自 admin 侧 place。
   * 审计中风险项 S4：admin 用 place，落地页用 location，本契约统一。
   * 组件用法：eventData.location → <span>{eventData.location}</span>
   */
  location: string;
  /**
   * 活动简介全文（admin 侧需补全 description 字段）。
   * 审计高风险项 S4：admin-system mock 无此字段，表单控件为占位。
   * 组件用法：eventData.description → <p>{eventData.description}</p>
   */
  description: string;
  /**
   * 活动封面图 URL（admin 侧需补全 coverImage 字段）。
   * 审计高风险项 S4：admin-system mock 无此字段，表单上传控件为占位。
   * null 时落地页使用默认渐变背景（不展示 <img>）。
   * 组件用法：eventData.coverImage → 可选背景图
   */
  coverImage?: string;
  /**
   * 活动状态（落地页据此决定是否展示\"报名已结束\"或\"活动进行中\"标识）。
   * 'published' = 正常展示；'closed' = 展示\"已结束\"；'draft' = 预览模式。
   */
  status: 'published' | 'draft' | 'closed';
}

// ===========================================================================
// 落地页资料展示 DTO
// ===========================================================================

/**
 * ActivityMaterialDisplayDTO — 落地页资料列表单条展示数据
 * 对应 GET /api/activities/:id/materials 响应的每条资料
 *
 * 解决审计中多处字段冲突（S4）：
 *   - id: 统一为 string（admin 用 MAT-001，mock 落地页用 number 1/2/3/4）
 *   - title: 对应 admin materialItems.name（字段名不同）
 *   - format: 对应 admin materialItems.format（落地页 mock 用 type，同名异义）
 *   - fileSize: 补全 admin 侧缺失的文件大小字段（落地页 mock 已消费 size）
 *   - needLogin / needCompanyInfo: 统一命名（S4：admin 用 needCompanyInfo，落地页 mock 用 needsCompanyInfo）
 *
 * 注意：icon 和 downloaded 为纯前端状态字段，不出现在此 DTO：
 *   - icon: 前端根据 format 动态选择图标组件
 *   - downloaded（领取状态）: 由认证后接口 GET /api/auth/me/claimed-materials 提供
 */
export interface ActivityMaterialDisplayDTO {
  /**
   * 资料 id，string 类型（统一 admin 侧 MAT-001 格式）。
   * 审计高风险项 S4：落地页 mock materials.id 为 number（1/2/3/4），改为 string。
   */
  id: string;
  /**
   * 资料标题（对应 admin materialItems.name，字段名不同）。
   * 组件用法：material.title → <p>{material.title}</p>
   */
  title: string;
  /**
   * 资料格式（如 PDF / XLSX / PPTX / DOCX）。
   * 对应 admin materialItems.format。
   * 审计 S4：落地页 mock 用 type 字段存格式，admin 用 format，统一为 format。
   * 前端根据 format 选择展示图标（FileText / ClipboardCheck / Shield 等）。
   */
  format: string;
  /**
   * 文件大小展示字符串（如\"2.4 MB\"、\"156 KB\"）。
   * 审计高风险项 S4：admin-system mock 无此字段，落地页 mock 已消费 size 字段。
   * 后端从存储系统获取文件元数据后填充。
   * null 表示文件大小未知（如外链资料）。
   */
  fileSize: string | null;
  /**
   * 是否需要登录才能领取。
   * 对应 admin materialItems.needLogin（字段名一致）。
   */
  needLogin: boolean;
  /**
   * 是否需要补充企业信息才能领取。
   * 对应 admin materialItems.needCompanyInfo（统一为 needCompanyInfo，不带 s）。
   * 审计高风险项 S4：落地页 mock 用 needsCompanyInfo（多一个 s）。
   */
  needCompanyInfo: boolean;
  /** 当前用户对该资料的领取状态，刷新后由服务端返回，避免仅依赖前端本地状态。 */
  claimStatus: MaterialClaimStatus;
}

/**
 * ActivityMaterialListDTO — 落地页资料列表响应
 * 对应 GET /api/activities/:id/materials 完整响应
 */
export interface ActivityMaterialListDTO {
  /** 关联此活动的资料列表（仅含已上架的资料） */
  materials: ActivityMaterialDisplayDTO[];
  /**
   * 当前登录用户已领取的资料 id 列表（需认证）。
   * 未登录时为空数组（[]），前端据此渲染已领取/未领取状态。
   * 解决审计 S3：领取状态由服务端返回，不再依赖纯前端 state。
   */
  claimedIds: string[];
}

// ===========================================================================
// 资料领取 DTO
// ===========================================================================

/**
 * MaterialClaimRequestDTO — 资料领取请求体
 * 对应 POST /api/material-claims
 *
 * 解决审计 S3：落地页资料领取操作落库，不再仅更新前端 state。
 */
export interface MaterialClaimRequestDTO {
  /** 要领取的资料 id（对应 materialItems.id） */
  materialId: string;
  /**
   * 来源活动 id（S1：外键归因）。
   * 落地页从 URL 参数 activity_id 读取后传入。
   */
  activityId: string;
  /**
   * 来源二维码 id（S1/S2：可选，用于精确归因）。
   * 落地页从 URL 参数 qr_id 读取后传入。
   * null 表示直接访问（非扫码来源）。
   */
  qrId?: string;
}

/**
 * MaterialClaimResponseDTO — 资料领取响应
 * 对应 POST /api/material-claims 成功响应
 */
export interface MaterialClaimResponseDTO {
  /** 领取记录 id（UUID） */
  claimId: string;
  /** 被领取的资料 id */
  materialId: string;
  /**
   * 资料下载/查看 URL（有效期限时链接）。
   * 落地页触发文件下载或跳转预览。
   */
  downloadUrl: string;
  /** 链接过期时间，ISO 8601 */
  urlExpiresAt: string;
  /** 已更新的全量领取 id 列表（供前端同步 claimedIds 状态） */
  updatedClaimedIds: string[];
}

// ===========================================================================
// Re-export tracking.ts 已有 DTO（避免使用方重复引入多个文件）
// ===========================================================================

/**
 * Re-export tracking.ts 中已有的落地页活动相关 DTO。
 * 使用方直接从本文件引入即可，无需同时引入 tracking.ts。
 */
export type {
  TrackingActivityDTO,
  ActivityLandingDetailDTO,
  TrackingUrlParams,
  TrackingContext,
  QrScanTrackRequestDTO,
  QrScanTrackResponseDTO,
} from './tracking';

// ===========================================================================
// 错误码（落地页活动展示相关）
// ===========================================================================

/**
 * ACTIVITY_LANDING_ERROR_CODES — 落地页活动展示模块错误码
 * 格式：ACTIVITY_{VERB}_{REASON}
 */
export const ACTIVITY_LANDING_ERROR_CODES = {
  /** 404：activity_id 查无活动记录 */
  ACTIVITY_NOT_FOUND: 'ACTIVITY_NOT_FOUND',
  /** 410：活动已结束/关闭（status === 'closed'） */
  ACTIVITY_CLOSED: 'ACTIVITY_CLOSED',
  /** 404：活动下无已上架的关联资料 */
  ACTIVITY_MATERIALS_EMPTY: 'ACTIVITY_MATERIALS_EMPTY',
  /** 403：领取资料需要登录（needLogin === true 但用户未认证） */
  CLAIM_REQUIRE_LOGIN: 'CLAIM_REQUIRE_LOGIN',
  /** 403：领取资料需要补充企业信息（needCompanyInfo === true 但未完善） */
  CLAIM_REQUIRE_COMPANY_INFO: 'CLAIM_REQUIRE_COMPANY_INFO',
  /** 404：要领取的资料不存在或已下架 */
  CLAIM_MATERIAL_NOT_FOUND: 'CLAIM_MATERIAL_NOT_FOUND',
  /** 409：用户已领取过该资料（幂等保护） */
  CLAIM_ALREADY_CLAIMED: 'CLAIM_ALREADY_CLAIMED',
} as const;

export type ActivityLandingErrorCode =
  (typeof ACTIVITY_LANDING_ERROR_CODES)[keyof typeof ACTIVITY_LANDING_ERROR_CODES];
