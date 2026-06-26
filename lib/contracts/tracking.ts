/**
 * tracking.ts — 落地页扫码归因 / URL 参数协议契约类型
 *
 * 覆盖：
 *   - 落地页 URL 参数协议定义（S2 核心）
 *   - 扫码事件上报 DTO（落地页 → 后端）
 *   - 扫码响应 DTO（后端 → 落地页，含活动渲染数据）
 *   - 注册时的归因上下文 DTO（贯穿注册流程）
 *
 * 依赖：./shared.ts
 *
 * 设计决策：
 *   S2 — 统一二维码标识体系：以 qrCodeId（qr_codes.id）为唯一外键。
 *         落地页 URL 参数协议：?qr_id=<id>&activity_id=<activityId>&invite=<inviteCode>
 *         三参数含义与取值来源见 TrackingUrlParams。
 *
 * 注意：本项目无 packages/ 共享包，落地页与管理后台的 DTO 单独维护。
 *   落地页扫码事件上报 DTO（QrScanTrackRequestDTO / QrScanTrackResponseDTO）
 *   在管理后台侧的镜像定义位于：
 *   `拓客系统-管理后台/lib/contracts/qr-code.ts`
 *   两侧字段保持同步，变更时需同时更新。
 */

import type { MaterialClaimStatus } from './material';

// ===========================================================================
// URL 参数协议（S2 核心定义）
// ===========================================================================

/**
 * TrackingUrlParams — 落地页追踪链接 URL 参数协议
 *
 * 完整链接格式：
 *   https://m.example.com/?qr_id=<id>&activity_id=<activityId>&invite=<inviteCode>
 *
 * 参数说明：
 *
 * | 参数名       | 取值来源                      | 必填 | 说明 |
 * |--------------|-------------------------------|------|------|
 * | qr_id        | qr_codes.id（系统主键 UUID）  | 是   | 唯一追踪标识，S2 归因外键 |
 * | activity_id  | activities.id（活动主键）     | 否   | 二维码绑定了活动时携带；
 * |              |                               |      | 落地页按此渲染活动内容；
 * |              |                               |      | 未绑定活动时省略此参数  |
 * | invite       | qr_codes.inviteCode（短码）   | 否   | 人类可读邀请码，用于展示；
 * |              |                               |      | 不用于系统主键查询      |
 *
 * 设计决策（对应审计 S2 四套标识统一方案）：
 *   1. 废弃 mock 中 {activity.id}-INVITE 拼接格式（如 A003-INVITE）
 *   2. 废弃 user.sourceQr 直接存 inviteCode 字符串（如 CHANNEL-SZ-002）
 *   3. 废弃 lead.qr 直接存自定义字符串（如 ACT-20260702-001）
 *   4. 统一：qr_id=qr_codes.id → 写入 user.sourceQrId / lead.sourceQrId 外键
 *
 * 落地页读取方式（Next.js App Router）：
 *   ```tsx
 *   // app/page.tsx（服务端组件，推荐）
 *   export default function Page({ searchParams }: { searchParams: TrackingUrlParams }) {
 *     const { qr_id, activity_id, invite } = searchParams;
 *     // 传入 EventLandingPage 组件
 *   }
 *   ```
 */
export interface TrackingUrlParams {
  /**
   * 二维码系统主键（qr_codes.id）。
   * 后端以此为唯一查询键，验证有效性并触发 scans 计数。
   * 不可用 inviteCode 替代 — inviteCode 面向人类，qr_id 面向系统。
   */
  qr_id?: string;
  /**
   * 活动主键（activities.id）。
   * 存在时，落地页按此活动 id 渲染动态活动内容（替代硬编码 defaultEventData）。
   * 不存在时，落地页渲染通用落地页内容。
   */
  activity_id?: string;
  /**
   * 二维码可读短邀请码（qr_codes.inviteCode）。
   * 仅用于页面展示（如"您通过 ACT20260702 邀请码进入"），不用于后端查询。
   */
  invite?: string;
}

// ===========================================================================
// 归因上下文（贯穿注册流程）
// ===========================================================================

/**
 * TrackingContext — 落地页归因上下文
 * 从 URL 参数解析后，存入 React Context 或 sessionStorage，
 * 贯穿从扫码到注册完成的整个流程，注册时随请求体一起提交。
 *
 * 使用场景：
 *   扫码进入 → parseTrackingParams() → TrackingContext →
 *   注册表单提交时附加 sourceQrId / sourceActivityId → 写入 users 表
 */
export interface TrackingContext {
  /**
   * 来源二维码 id（已验证有效性）。
   * null 表示直接访问（非扫码来源）。
   */
  sourceQrId: string | null;
  /**
   * 来源活动 id。
   * null 表示无活动归因（通用落地页场景）。
   */
  sourceActivityId: string | null;
  /**
   * 可读邀请码（展示用，不做业务逻辑判断）。
   */
  inviteCode: string | null;
  /**
   * 二维码是否已验证有效（调用 POST /api/track/qr-scan 后更新）。
   * undefined 表示尚未验证（接口调用前）。
   */
  qrValid?: boolean;
}

// ===========================================================================
// 扫码事件上报 DTO
// ===========================================================================

/**
 * QrScanTrackRequestDTO — 落地页扫码事件上报请求体
 * 对应 POST /api/track/qr-scan
 *
 * 调用时机：落地页加载时，若 URL 含 qr_id 参数则立即触发。
 * 认证：无需认证（匿名公开接口）。
 * 副作用：后端原子递增 qr_codes.scans；写入 qr_scan_events 日志。
 */
export interface QrScanTrackRequestDTO {
  /**
   * 来自 URL 参数 qr_id，即 qr_codes.id（系统主键）。
   * S2 核心：唯一允许的二维码查询键，不接受 inviteCode。
   */
  qrId: string;
  /** 用户代理字符串，用于设备类型统计。可选。 */
  userAgent?: string;
}

/**
 * QrScanTrackResponseDTO — 扫码事件上报响应
 * 落地页据此决定渲染内容和是否展示"二维码已失效"提示。
 */
export interface QrScanTrackResponseDTO {
  /** 二维码是否有效（false → 展示失效提示页） */
  valid: boolean;
  /** 二维码当前状态 */
  status: 'active' | 'paused';
  /**
   * 绑定的活动信息，供 EventLandingPage 动态渲染。
   * null 表示未绑定活动，渲染通用落地页。
   */
  activity: TrackingActivityDTO | null;
  /**
   * 绑定的顾问 id（注册后自动关联线索归因用）。
   * null 表示未绑定顾问。
   */
  advisorId: string | null;
  /** 绑定的顾问显示名称，仅展示用 */
  advisorName: string | null;
}

/**
 * TrackingActivityDTO — 扫码后落地页渲染所需的活动信息
 * 字段与 EventLandingPage.eventData props 对齐，解决审计中
 * admin-system activities 字段（teacher/place/time 单字符串）与
 * landing-page eventData（speaker/speakerTitle/date+time 拆分/location）不一致问题（S4）。
 *
 * 本 DTO 由后端按落地页命名规范返回，前端直接赋值给 EventLandingPage.eventData。
 */
export interface TrackingActivityDTO {
  id: string;
  name: string;
  /**
   * 活动日期，ISO 8601 日期字符串（YYYY-MM-DD）。
   * 落地页格式化为"2026年6月15日"展示。
   * 对应 admin-system activities.time 的日期部分（拆分，S4）。
   */
  date: string;
  /**
   * 活动时间段字符串，如 "14:00 - 17:00"。
   * 对应 admin-system activities.time 的时间部分（拆分，S4）。
   */
  time: string;
  /**
   * 活动地点。
   * 对应 landing-page eventData.location；
   * 映射自 admin-system activities.place（S4：命名统一）。
   */
  location: string;
  /**
   * 主讲嘉宾姓名。
   * 对应 landing-page eventData.speaker；
   * 映射自 admin-system activities.teacher（S4：命名统一）。
   */
  speaker: string;
  /**
   * 讲师头衔 / 职位描述。
   * landing-page 需要此字段，admin-system 当前 mock 无此字段（S4 补齐）。
   */
  speakerTitle: string;
  /** 活动简介，对应 landing-page eventData.description */
  description: string;
  /** 活动封面图 URL，null 时前端使用默认图 */
  coverImage: string | null;
  /** 活动状态，落地页据此决定是否展示"报名已结束"提示 */
  status: 'published' | 'draft' | 'closed';
  /** 当前活动绑定的已上架资料列表 */
  materials?: Array<{
    id: string;
    title: string;
    format: string;
    fileSize: string | null;
    needLogin: boolean;
    needCompanyInfo: boolean;
    claimStatus: MaterialClaimStatus;
  }>;
}

// ===========================================================================
// 活动详情直接获取 DTO（按 activity_id 参数加载，不经过二维码验证）
// ===========================================================================

/**
 * ActivityDetailRequestParams — 按活动 id 直接获取活动信息的请求参数
 * 对应 GET /api/activities/:id/landing（落地页专用，不暴露管理后台字段）
 *
 * 使用场景：当 URL 仅含 activity_id 而无 qr_id 时（如活动海报直链），
 * 落地页直接按 activity_id 加载活动内容，不触发扫码归因。
 */
export interface ActivityDetailRequestParams {
  activityId: string;
}

/**
 * ActivityLandingDetailDTO — 落地页活动详情响应
 * 与 TrackingActivityDTO 相同结构，作为独立 DTO 以支持不同请求路径。
 * 两者字段对齐，后端可复用同一序列化逻辑。
 */
export type ActivityLandingDetailDTO = TrackingActivityDTO;

// ===========================================================================
// 错误码（落地页追踪相关）
// ===========================================================================

/**
 * TRACKING_ERROR_CODES — 落地页追踪模块错误码
 * 格式：TRACK_{VERB}_{REASON}
 */
export const TRACKING_ERROR_CODES = {
  TRACK_QR_NOT_FOUND: 'TRACK_QR_NOT_FOUND',          // 404：qr_id 查无记录
  TRACK_QR_DISABLED: 'TRACK_QR_DISABLED',            // 403：二维码已停用
  TRACK_QR_EXPIRED: 'TRACK_QR_EXPIRED',              // 403：二维码已过有效期
  TRACK_ACTIVITY_NOT_FOUND: 'TRACK_ACTIVITY_NOT_FOUND', // 404：activity_id 查无记录
  TRACK_ACTIVITY_CLOSED: 'TRACK_ACTIVITY_CLOSED',    // 410：活动已结束/关闭
} as const;

export type TrackingErrorCode = (typeof TRACKING_ERROR_CODES)[keyof typeof TRACKING_ERROR_CODES];
