/**
 * checkin.ts — 落地页签到模块契约类型
 *
 * 覆盖：签到状态查询、签到提交请求/响应 DTO、签到窗口状态枚举。
 * 依赖：./shared.ts
 */

import type { ApiResponse } from './shared';

// ===========================================================================
// 枚举与常量
// ===========================================================================

/** 签到窗口状态，由 get_checkin_window_status() 数据库函数返回 */
export type CheckinWindowStatus =
  | 'open'               // 签到中
  | 'not_started'        // 未到签到时间
  | 'ended'              // 签到已结束
  | 'force_closed'       // 运营手动关闭
  | 'activity_not_found' // 活动不存在

export const CHECKIN_WINDOW_STATUS_LABEL: Record<CheckinWindowStatus, string> = {
  open: '签到中',
  not_started: '签到未开始',
  ended: '签到已结束',
  force_closed: '签到已关闭',
  activity_not_found: '活动不存在',
};

// ===========================================================================
// 落地页签到状态查询 DTO
// ===========================================================================

/**
 * CheckinPageDTO — 扫活动二维码后落地页签到展示所需的全部信息
 * 对应 GET /api/checkin?qr_id=xxx
 */
export interface CheckinPageDTO {
  /** 签到码对应的活动 id */
  activityId: string;
  /** 活动名称 */
  activityName: string;
  /** 活动日期，如"2026年7月2日" */
  activityDate: string;
  /** 活动时间段，如"14:00 - 17:00" */
  activityTime: string;
  /** 活动地点 */
  activityLocation: string;
  /** 当前签到窗口状态 */
  windowStatus: CheckinWindowStatus;
  /** 签到开放时间（ISO 8601），windowStatus=not_started 时展示倒计时用 */
  windowOpenAt: string | null;
  /** 签到关闭时间（ISO 8601） */
  windowCloseAt: string | null;
  /** 当前累计签到人数 */
  checkinCount: number;
  /** 当前用户是否已签到（未登录时为 false） */
  alreadyCheckedIn: boolean;
  /** 活动二维码 id，提交签到时使用 */
  checkinQrId: string;
}

// ===========================================================================
// 签到提交 DTO
// ===========================================================================

/**
 * CheckinSubmitDTO — 签到提交请求体
 * POST /api/checkin
 * 认证：Bearer token（端用户），必须已登录
 */
export interface CheckinSubmitDTO {
  /** 活动二维码 id（qr_codes.id，type='activity'） */
  checkinQrId: string;
}

/**
 * CheckinSubmitResponseDTO — 签到提交成功响应
 */
export interface CheckinSubmitResponseDTO {
  /** 签到记录 id */
  checkinId: string;
  /** 活动 id */
  activityId: string;
  /** 活动名称 */
  activityName: string;
  /** 签到时间，ISO 8601 */
  checkedInAt: string;
  /** 当前累计签到人数（签到后实时值） */
  checkinCount: number;
}

export type CheckinPageResponse = ApiResponse<CheckinPageDTO>;
export type CheckinSubmitResponse = ApiResponse<CheckinSubmitResponseDTO>;

// ===========================================================================
// 错误码
// ===========================================================================

export const CHECKIN_ERROR_CODES = {
  CHECKIN_QR_NOT_FOUND:       'CHECKIN_QR_NOT_FOUND',       // 404：活动二维码不存在
  CHECKIN_QR_NOT_ACTIVITY_TYPE:'CHECKIN_QR_NOT_ACTIVITY_TYPE', // 400：该二维码不是活动二维码
  CHECKIN_WINDOW_NOT_OPEN:    'CHECKIN_WINDOW_NOT_OPEN',    // 403：不在签到窗口内
  CHECKIN_ALREADY_DONE:       'CHECKIN_ALREADY_DONE',       // 409：该用户已签到
  CHECKIN_AUTH_REQUIRED:      'CHECKIN_AUTH_REQUIRED',      // 401：未登录
  CHECKIN_ACTIVITY_NOT_FOUND: 'CHECKIN_ACTIVITY_NOT_FOUND', // 404：活动不存在
} as const;

export type CheckinErrorCode = (typeof CHECKIN_ERROR_CODES)[keyof typeof CHECKIN_ERROR_CODES];
