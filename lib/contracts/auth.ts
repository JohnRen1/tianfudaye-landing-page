/**
 * auth.ts — 落地页端用户认证契约类型
 *
 * 覆盖：手机号验证码登录、微信授权登录、发送验证码、当前用户信息、企业信息补录。
 * 依赖：./shared.ts
 *
 * 设计决策遵守审计总纲：
 *   S3 — 登录后持久化 session（替代仅调 onSuccess() 无任何存储的现状）
 *   S4 — 时间字段统一 ISO 8601 字符串
 *   S5 — 端用户认证体系独立于管理员体系
 *   审计不确定项 #1 — 数据库存完整手机号，响应 DTO 含脱敏展示字段
 *   审计不确定项 #2 — 微信 openid 与手机号合并为同一账号（phone 为主 key）
 *   审计不确定项 #4 — 注册分两步：先手机号登录，再补充企业信息（字段 nullable）
 */

import type { RiskLevel } from './shared';

// ===========================================================================
// 端用户身份枚举（与 admin-system 保持一致）
// ===========================================================================

export type UserIdentity = '企业老板' | '财务负责人' | '创业者' | string;

// ===========================================================================
// 发送验证码
// ===========================================================================

/**
 * SendCodeRequestDTO — 发送手机验证码请求
 * 对应 POST /api/auth/send-code
 */
export interface SendCodeRequestDTO {
  /** 完整 11 位手机号 */
  phone: string;
  /**
   * 验证码用途：
   *   login — 登录/注册（统一入口，后端判断是否新用户）
   */
  purpose: 'login';
}

/**
 * SendCodeResponseDTO — 发送验证码响应
 */
export interface SendCodeResponseDTO {
  /** 服务端生成的验证码有效期剩余秒数（前端倒计时使用） */
  expiresInSeconds: number;
  /**
   * 是否已注册：
   *   true  — 已有账号，此次发码用于登录
   *   false — 新用户，登录后需引导补充企业信息
   * 用于前端提前判断是否需要显示"补充信息"步骤提示。
   */
  isRegistered: boolean;
}

// ===========================================================================
// 手机号验证码登录
// ===========================================================================

/**
 * PhoneLoginRequestDTO — 手机号验证码登录/注册请求
 * 对应 POST /api/auth/login-phone
 * 新老用户共用此接口，后端自动判断是否首次注册。
 */
export interface PhoneLoginRequestDTO {
  /** 完整 11 位手机号 */
  phone: string;
  /** 6 位纯数字验证码 */
  code: string;
  /**
   * 扫码来源归因（S2：落地页读取 URL 参数后传入）
   * 新用户注册时由落地页从 URL query 提取并提交，服务端写入 User 记录。
   * 已有用户登录时忽略此字段（不覆盖原始归因）。
   */
  sourceQrId?: string;
  sourceActivityId?: string;
}

/**
 * PhoneLoginResponseDTO — 手机号验证码登录/注册响应
 * 对应 POST /api/auth/login-phone
 */
export interface PhoneLoginResponseDTO {
  /** JWT access token，前端存 httpOnly cookie（由服务端 Set-Cookie）或 localStorage */
  accessToken: string;
  /** token 过期时间，ISO 8601 字符串 */
  expiresAt: string;
  /** 当前用户信息 */
  user: CurrentUserDTO;
  /**
   * 是否新注册用户：
   *   true  — 首次注册，前端需引导用户跳转补充企业信息步骤（审计不确定项 #4）
   *   false — 已有账号，正常登录后跳转
   */
  isNew: boolean;
}

// ===========================================================================
// 微信授权登录
// ===========================================================================

/**
 * WechatOAuthCallbackDTO — 微信授权回调参数
 * 对应 GET /api/auth/wechat-callback?code=...&state=...
 * 参数由微信 OAuth 重定向后拼接在 URL 中，服务端处理。
 * 前端无需手动构造此 DTO，仅作接口文档记录。
 */
export interface WechatOAuthCallbackDTO {
  /** 微信授权码，服务端用于换取 openid */
  code: string;
  /** CSRF 防护 state 参数，服务端校验 */
  state: string;
}

/**
 * WechatLoginResponseDTO — 微信授权登录响应
 * 对应 GET /api/auth/wechat-callback 重定向后的 JSON 响应（或 JS Bridge 回调）
 */
export interface WechatLoginResponseDTO {
  accessToken: string;
  expiresAt: string;
  user: CurrentUserDTO;
  /** 是否新注册用户，逻辑同 PhoneLoginResponseDTO.isNew */
  isNew: boolean;
}

export interface WechatStartResponseDTO {
  authorizeUrl: string;
  state: string;
}

export interface WechatPendingBindResponseDTO {
  requiresPhoneBinding: true;
  openid: string;
  nickname?: string | null;
  avatarUrl?: string | null;
}

// ===========================================================================
// 企业信息补录（注册第二步，审计不确定项 #4）
// ===========================================================================

/**
 * UserProfileCompleteDTO — 补充企业信息请求
 * 对应 PATCH /api/auth/me/profile
 * 新用户手机号登录后（isNew === true），引导用户填写此表单。
 * 所有字段可选（部分用户可能跳过）；服务端对已填字段做非空校验。
 * 服务端生成字段（id / registeredAt / activeAt / phone / openid）不得出现。
 */
export interface UserProfileCompleteDTO {
  name?: string;
  identity?: UserIdentity;
  company?: string;
  industry?: string;
  size?: string;
}

/**
 * UserProfileCompletedResponseDTO — 补充企业信息响应
 * 返回更新后的当前用户信息。
 */
export interface UserProfileCompletedResponseDTO {
  user: CurrentUserDTO;
}

// ===========================================================================
// 当前用户信息
// ===========================================================================

/**
 * CurrentUserDTO — 落地页当前登录用户信息
 * 对应 GET /api/auth/me
 * 落地页视角：用户读取/展示自己的信息，无需查看他人数据。
 *
 * 与管理后台 UserDetailDTO 的区别：
 *   - 落地页返回完整手机号（用户有权查看自己的手机号）
 *   - 落地页不返回 leadStatus（端用户无需感知线索状态）
 *   - 落地页不返回 openid（敏感字段，通过 token 隐式标识）
 */
export interface CurrentUserDTO {
  id: string;
  name: string | null;
  /**
   * 完整手机号（用户查看自己的信息可见完整号码）
   * 审计不确定项 #1：数据库存完整手机号，此处返回完整号
   */
  phone: string;
  identity: UserIdentity | null;
  company: string | null;
  industry: string | null;
  size: string | null;
  /** ISO 8601 字符串（S4） */
  registeredAt: string;
  /** ISO 8601 字符串（S4） */
  activeAt: string;
  /**
   * 企业信息是否已补全：
   *   false — 新注册，尚未完成第二步，前端显示引导
   *   true  — 已填写企业信息
   */
  isProfileComplete: boolean;
}

/**
 * UserMeAssessmentSummaryDTO — 用户个人报告摘要（落地页"我的报告"展示）
 * 对应 GET /api/auth/me/report
 * 落地页仅展示风险等级和关键模块，不展示完整原始数据（S5：防止 score 篡改）
 */
export interface UserMeAssessmentSummaryDTO {
  id: string;
  score: number;
  /** S4：统一 RiskLevel 枚举 */
  riskLevel: RiskLevel;
  modules: string[];
  /** ISO 8601 字符串 */
  completedAt: string;
}

// ===========================================================================
// 退出登录
// ===========================================================================

/**
 * UserLogoutResponseDTO — 端用户退出登录响应
 * 对应 POST /api/auth/logout
 * 服务端使 token 失效，客户端同步清除本地存储。
 */
export interface UserLogoutResponseDTO {
  success: true;
}
