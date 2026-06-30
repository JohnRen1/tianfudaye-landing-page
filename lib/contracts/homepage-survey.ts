/**
 * homepage-survey.ts — 落地页公司主页沙龙投票问卷契约类型
 *
 * 覆盖：通用落地页 / 公司主页展示当前问卷、候选课题、多选提交、
 *       当前用户是否已提交、提交响应与错误码。
 *
 * 设计约束：
 * - 仅公司主页（通用落地页）使用，活动落地页继续走预约入口。
 * - 提交必须登录，用户身份由服务端从 token 注入。
 * - 公司信息必填。
 * - 课题支持多选，topicIds 至少一个。
 * - 当前轮次同一用户只能提交一次；管理员发布新一轮后 version + 1。
 */

import type { ApiResponse } from './shared';

// ===========================================================================
// 公开展示 DTO
// ===========================================================================

/**
 * HomepageSurveyPublicTopicDTO — 落地页展示的候选沙龙课题
 * voteCount 从提交明细聚合，可用于展示热度。
 */
export interface HomepageSurveyPublicTopicDTO {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  voteCount: number;
}

/**
 * HomepageSurveyPublicConfigDTO — 当前公司主页沙龙问卷配置
 * 对应 GET /api/homepage-survey/active
 */
export interface HomepageSurveyPublicConfigDTO {
  id: string;
  title: string;
  description: string | null;
  version: number;
  hasSubmitted: boolean;
  submittedTopicIds: string[];
  topics: HomepageSurveyPublicTopicDTO[];
}

export type HomepageSurveyActiveResponse = ApiResponse<HomepageSurveyPublicConfigDTO>;

// ===========================================================================
// 提交 DTO
// ===========================================================================

/**
 * HomepageSurveySubmitDTO — 沙龙投票问卷提交请求体
 * 对应 POST /api/homepage-survey/submissions
 */
export interface HomepageSurveySubmitDTO {
  surveyConfigId: string;
  surveyVersion: number;
  /** 多选课题 id，至少一个 */
  topicIds: string[];
  /** 必填：姓名 */
  name: string;
  /** 必填：11 位手机号 */
  phone: string;
  /** 必填：公司名称 */
  company: string;
  /** 必填：所属行业 */
  industry: string;
  /** 选填：企业规模 */
  companySize?: string;
  /** 选填：微信号 */
  wechat?: string;
  /** 选填：方便联系时间 */
  contactTime?: string;
  /** 选填：关注问题 / 补充说明 */
  note?: string;
  /** 来源二维码 id，来自 URL 或 localStorage 中的 qr_id */
  sourceQrId?: string;
}

/**
 * HomepageSurveySubmitResponseDTO — 沙龙投票问卷提交成功响应
 */
export interface HomepageSurveySubmitResponseDTO {
  id: string;
  surveyConfigId: string;
  surveyVersion: number;
  topicIds: string[];
  submittedAt: string;
}

export type HomepageSurveySubmitResponse = ApiResponse<HomepageSurveySubmitResponseDTO>;

// ===========================================================================
// 错误码
// ===========================================================================

export const HOMEPAGE_SURVEY_ERROR_CODES = {
  HOMEPAGE_SURVEY_AUTH_REQUIRED: 'HOMEPAGE_SURVEY_AUTH_REQUIRED',
  HOMEPAGE_SURVEY_NOT_FOUND: 'HOMEPAGE_SURVEY_NOT_FOUND',
  HOMEPAGE_SURVEY_TOPIC_NOT_FOUND: 'HOMEPAGE_SURVEY_TOPIC_NOT_FOUND',
  HOMEPAGE_SURVEY_TOPIC_INACTIVE: 'HOMEPAGE_SURVEY_TOPIC_INACTIVE',
  HOMEPAGE_SURVEY_TOPIC_REQUIRED: 'HOMEPAGE_SURVEY_TOPIC_REQUIRED',
  HOMEPAGE_SURVEY_VERSION_EXPIRED: 'HOMEPAGE_SURVEY_VERSION_EXPIRED',
  HOMEPAGE_SURVEY_ALREADY_SUBMITTED: 'HOMEPAGE_SURVEY_ALREADY_SUBMITTED',
  HOMEPAGE_SURVEY_NAME_REQUIRED: 'HOMEPAGE_SURVEY_NAME_REQUIRED',
  HOMEPAGE_SURVEY_PHONE_INVALID: 'HOMEPAGE_SURVEY_PHONE_INVALID',
  HOMEPAGE_SURVEY_COMPANY_REQUIRED: 'HOMEPAGE_SURVEY_COMPANY_REQUIRED',
  HOMEPAGE_SURVEY_INDUSTRY_REQUIRED: 'HOMEPAGE_SURVEY_INDUSTRY_REQUIRED',
  HOMEPAGE_SURVEY_VALIDATION_FAILED: 'HOMEPAGE_SURVEY_VALIDATION_FAILED',
} as const;

export type HomepageSurveyErrorCode =
  (typeof HOMEPAGE_SURVEY_ERROR_CODES)[keyof typeof HOMEPAGE_SURVEY_ERROR_CODES];
