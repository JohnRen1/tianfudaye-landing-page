/**
 * appointment.ts — 落地页预约模块契约类型
 *
 * 覆盖：预约提交请求/响应 DTO、当前用户预约查询 DTO、预约状态枚举、
 *       咨询主题枚举（与管理后台 lead.ts AppointmentTopic 同步）。
 *
 * 依赖：./shared.ts（ApiSuccess、ApiFailure、ApiResponse）
 *
 * 不依赖规则：
 *   - 不引用 admin-system 的任何文件（跨项目禁止）
 *   - 两端共用枚举以注释形式标注同步来源，由人工维护一致
 *
 * 设计决策遵守审计总纲：
 *   S1  — 提交成功响应含 leadId，建立预约与线索的关联外键
 *   S3  — 预约提交落库（替代 setSubmitted(true) 纯前端状态）
 *   S4  — topic 统一为英文枚举，展示层映射中文；time 字段 ISO 8601
 *   S5  — 服务端生成字段（id / createdAt / leadId）不出现在请求 DTO
 *   缺口修复审计 #5（预约表单不感知登录状态）— userId 由服务端从 token 注入
 *   缺口修复审计 #7（已登录用户 name/phone/company 可预填）— 预填数据由
 *         GET /api/auth/me 返回，不通过预约 DTO 传递
 *   缺口修复审计 #6（查看预约路由错误）— GET /api/appointments/me 返回
 *         AppointmentMySummaryDTO，供落地页"查看我的预约"使用
 */

import type { ApiResponse } from './shared';

// ===========================================================================
// 枚举与常量
// ===========================================================================

/**
 * AppointmentType — 预约类型枚举
 *
 * 标识本次预约的来源场景，与管理后台保持一致。
 * 数据库存英文值，展示层使用 APPOINTMENT_TYPE_LABEL 映射中文。
 */
export type AppointmentType =
  | 'consult'   // 预约顾问（完整表单入口）
  | 'enroll'    // 沙龙报名（活动页报名入口）
  | 'message';  // 留言咨询（未来扩展）

/** 展示用中文标签映射 */
export const APPOINTMENT_TYPE_LABEL: Record<AppointmentType, string> = {
  consult: '预约顾问',
  enroll: '沙龙报名',
  message: '留言咨询',
};

/** 展示用色调映射 */
export const APPOINTMENT_TYPE_TONE: Record<AppointmentType, string> = {
  consult: 'bg-primary/10 text-primary',
  enroll: 'bg-accent/15 text-accent-foreground',
  message: 'bg-secondary text-secondary-foreground',
};

/**
 * AppointmentTopic — 预约咨询主题枚举
 *
 * 与管理后台 lib/contracts/lead.ts AppointmentTopic 保持一致。
 * 两端任何新增 topic 必须同步更新。
 *
 * 数据库存英文值，展示层使用 APPOINTMENT_TOPIC_LABEL 映射中文。
 */
export type AppointmentTopic =
  | 'tax_risk_check'          // 税务风险排查
  | 'invoice_compliance'      // 发票合规
  | 'public_to_private_risk'  // 公转私风险
  | 'corporate_income_tax'    // 企业所得税筹划
  | 'individual_tax_social'   // 个税社保合规
  | 'tax_audit_response'      // 税务稽查应对
  | 'company_structure'       // 公司架构设计
  | 'other';                  // 其他问题

/** 展示用中文标签映射，仅前端渲染使用 */
export const APPOINTMENT_TOPIC_LABEL: Record<AppointmentTopic, string> = {
  tax_risk_check: '税务风险排查',
  invoice_compliance: '发票合规',
  public_to_private_risk: '公转私风险',
  corporate_income_tax: '企业所得税筹划',
  individual_tax_social: '个税社保合规',
  tax_audit_response: '税务稽查应对',
  company_structure: '公司架构设计',
  other: '其他问题',
};

/**
 * AppointmentStatus — 预约状态枚举
 *
 * 描述单次预约事件的生命周期，独立于 LeadStatus。
 * 与管理后台 lib/contracts/lead.ts AppointmentStatus 保持一致。
 */
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

/** 展示用中文标签映射，仅前端渲染使用 */
export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: '待联系',
  confirmed: '已确认',
  completed: '已完成',
  cancelled: '已取消',
};

// ===========================================================================
// 预约提交 DTO
// ===========================================================================

/**
 * AppointmentCreateDTO — 预约提交请求体
 * POST /api/appointments
 *
 * 对应落地页 app/appointment/page.tsx 的 FormState。
 *
 * 必填字段（7 个）：name / phone / topic / description / company / industry / contactTime
 * 选填字段（2 个）：wechat / uploadIntent
 *
 * 服务端生成字段（不在此 DTO 中）：
 *   - id        — UUID 主键
 *   - createdAt — 提交时间
 *   - leadId    — 提交成功后自动关联或创建线索（S1）
 *   - userId    — 已登录用户从 Bearer token 注入；未登录时通过 phone 匹配
 *   - status    — 初始值固定为 'pending'
 *
 * 认证：无强制要求（允许未登录提交，降低转化门槛）。
 *        若请求头含有效 Bearer token，则 userId 从 token 注入；
 *        否则通过 phone 尝试匹配已有用户，仍无匹配时创建匿名预约。
 *
 * 审计修复：
 *   - 原 appointment/page.tsx:72-75 仅执行 setSubmitted(true)，
 *     此 DTO 定义的字段即为真实落库请求体（S3）。
 *   - userId 不在请求体中（安全考量），由服务端从 token 读取（S5）。
 */
export interface AppointmentCreateDTO {
  /** 必填：姓名 */
  name: string;
  /**
   * 必填：11 位手机号，后端校验 /^1\d{10}$/ 格式。
   * 审计修复 #9：用于关联已有用户；无法关联时创建匿名预约。
   */
  phone: string;
  /**
   * 选填：咨询主题（英文枚举，S4 统一）。
   * 活动报名场景下可不填，服务端默认记为 'other'。
   * 展示层通过 APPOINTMENT_TOPIC_LABEL 映射中文。
   */
  topic?: AppointmentTopic;
  /** 必填：问题描述 */
  description: string;
  /** 必填：企业名称 */
  company: string;
  /** 必填：所属行业 */
  industry: string;
  /**
   * 必填：方便联系时间（自由文本，如 '工作日下午'）。
   * 保留为自由文本以兼容前端选项枚举（contactTimes 常量）。
   */
  contactTime: string;
  /** 选填：微信号 */
  wechat?: string;
  /**
   * 选填：预约类型，标识来源场景。
   * 前端根据入口自动填入，服务端存入 appointment_type 字段。
   * 不传时服务端默认记为 'consult'。
   */
  appointmentType?: AppointmentType;
  /**
   * 选填：是否愿意上传资料（自由文本，对应 uploadOptions 常量）。
   * 属于意向信号，写入 Appointment 实体供顾问参考。
   */
  uploadIntent?: string;
  /**
   * 选填：来源线索 id（若从报告页跳转则由 URL 参数传入，前端负责读取后传入）。
   * 服务端收到后将此预约关联到指定 leadId，并更新对应线索状态为 'appointed'（S3）。
   * 审计修复 #11：明确传递来源，使预约与线索状态联动有迹可循。
   */
  sourceLeadId?: string;
}

/**
 * AppointmentCreateResponseDTO — 预约提交成功响应
 * 对应 POST /api/appointments 的 success data 字段。
 *
 * 返回服务端生成字段，前端持久化后用于"查看我的预约"跳转。
 */
export interface AppointmentCreateResponseDTO {
  /** 新建预约的 UUID */
  id: string;
  /**
   * 关联或新建的线索 id（S1）。
   * null 表示本次预约未能关联已有线索（极少数边界情况）。
   */
  leadId: string | null;
  /** 预约初始状态，固定为 'pending' */
  status: AppointmentStatus;
  /** 提交时间，ISO 8601（S4） */
  createdAt: string;
}

/** POST /api/appointments 完整响应类型 */
export type AppointmentCreateResponse = ApiResponse<AppointmentCreateResponseDTO>;

// ===========================================================================
// 当前用户预约查询 DTO
// ===========================================================================

/**
 * AppointmentMySummaryDTO — 当前用户的单条预约摘要
 * 对应 GET /api/appointments/me 的列表项。
 * 用于"查看我的预约"页面展示。
 *
 * 认证：Bearer token（端用户），必须已登录。
 *
 * 审计修复 #6：原"查看我的预约"按钮 router.push('/appointment') 跳回表单页，
 * 此 DTO 为真实预约详情的数据结构，供后续独立预约详情页消费。
 */
export interface AppointmentMySummaryDTO {
  /** 预约 UUID */
  id: string;
  /** 预约类型 */
  appointmentType: AppointmentType;
  /** 咨询主题枚举 */
  topic: AppointmentTopic;
  /** 问题描述摘要（前 100 字） */
  descriptionSummary: string;
  /** 预约状态 */
  status: AppointmentStatus;
  /**
   * 已分配顾问展示名。
   * null 表示尚未分配顾问（初始提交后台会尽快处理）。
   */
  advisorName: string | null;
  /**
   * 顾问联系时间（顾问确认后填写，如 '2026-06-07 14:00'）。
   * null 表示尚未确认时间。
   */
  scheduledAt: string | null;
  /** 提交时间，ISO 8601（S4） */
  createdAt: string;
}

/** GET /api/appointments/me 完整响应类型 */
export type AppointmentMeResponse = ApiResponse<AppointmentMySummaryDTO[]>;

// ===========================================================================
// 错误码
// ===========================================================================

/**
 * 预约模块错误码（格式：APPOINTMENT_{VERB}_{REASON}）
 * 落地页侧使用的错误码；管理后台侧在 lead.ts LEAD_ERROR_CODES 中定义。
 * 错误码稳定；message 可本地化。
 */
export const APPOINTMENT_ERROR_CODES = {
  /** 手机号格式不合法（非 11 位纯数字） */
  APPOINTMENT_PHONE_INVALID: 'APPOINTMENT_PHONE_INVALID',
  /** 咨询主题值不在合法枚举范围内 */
  APPOINTMENT_TOPIC_INVALID: 'APPOINTMENT_TOPIC_INVALID',
  /** sourceLeadId 指向的线索不存在 */
  APPOINTMENT_LEAD_NOT_FOUND: 'APPOINTMENT_LEAD_NOT_FOUND',
  /** 该用户在 24 小时内已提交预约，触发频率限制（可选保护） */
  APPOINTMENT_RATE_LIMITED: 'APPOINTMENT_RATE_LIMITED',
  /** 查看预约需要登录 */
  APPOINTMENT_AUTH_REQUIRED: 'APPOINTMENT_AUTH_REQUIRED',
  /** 请求的预约记录不属于当前用户 */
  APPOINTMENT_FORBIDDEN: 'APPOINTMENT_FORBIDDEN',
} as const;

export type AppointmentErrorCode =
  (typeof APPOINTMENT_ERROR_CODES)[keyof typeof APPOINTMENT_ERROR_CODES];
