/**
 * auth.ts — 落地页认证模块 API 客户端
 *
 * 封装：发送验证码、手机号验证码登录、获取当前用户信息。
 * token 存储 key：'user-token'
 */

import { apiGet, apiPatch, apiPost } from './client';
import type {
  SendCodeResponseDTO,
  PhoneLoginResponseDTO,
  CurrentUserDTO,
  UserProfileCompleteDTO,
  UserProfileCompletedResponseDTO,
} from '../contracts/auth';

const TOKEN_KEY = 'user-token';

/**
 * 发送手机验证码
 * POST /api/auth/send-code
 * @returns { isRegistered; _devCode? }
 */
export async function sendCode(
  phone: string,
): Promise<{ isRegistered: boolean; _devCode?: string }> {
  const data = await apiPost<SendCodeResponseDTO & { _devCode?: string }>(
    '/api/auth/send-code',
    { phone, purpose: 'login' },
  );
  return {
    isRegistered: data.isRegistered,
    _devCode: data._devCode,
  };
}

/**
 * 手机号验证码登录 / 注册
 * POST /api/auth/login-phone
 * 登录成功后将 accessToken 存入 localStorage。
 */
export async function loginPhone(
  phone: string,
  code: string,
  sourceQrId?: string,
  sourceActivityId?: string,
): Promise<{ user: CurrentUserDTO; accessToken: string; isNew: boolean }> {
  const data = await apiPost<PhoneLoginResponseDTO>('/api/auth/login-phone', {
    phone,
    code,
    ...(sourceQrId ? { sourceQrId } : {}),
    ...(sourceActivityId ? { sourceActivityId } : {}),
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, data.accessToken);
  }

  return {
    user: data.user,
    accessToken: data.accessToken,
    isNew: data.isNew,
  };
}

/**
 * 获取当前登录用户信息
 * GET /api/auth/me
 */
export async function me(): Promise<CurrentUserDTO> {
  return apiGet<CurrentUserDTO>('/api/auth/me');
}

/**
 * 补充/更新企业信息
 * PATCH /api/auth/me/profile
 */
export async function updateProfile(
  body: UserProfileCompleteDTO,
): Promise<UserProfileCompletedResponseDTO> {
  return apiPatch<UserProfileCompletedResponseDTO>('/api/auth/me/profile', body);
}
