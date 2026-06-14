import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api-response';
import { buildWechatLoginResponse, getUserByWechatOpenId } from '@/lib/db';
import {
  consumeWechatOauthState,
  exchangeWechatCodeForAccessToken,
  fetchWechatUserInfo,
} from '@/lib/wechat';
import type {
  WechatLoginResponseDTO,
  WechatPendingBindResponseDTO,
} from '@/lib/contracts/auth';

export const dynamic = 'force-dynamic';

function buildDevToken(userId: string): string {
  return Buffer.from(`${userId}:${Date.now()}`).toString('base64');
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) {
    return fail('WECHAT_CODE_MISSING', '缺少微信授权 code', 400);
  }

  if (!state) {
    return fail('WECHAT_STATE_MISSING', '缺少微信授权 state', 400);
  }

  const statePayload = consumeWechatOauthState(state);
  if (!statePayload) {
    return fail('WECHAT_STATE_INVALID', '微信授权 state 无效或已过期', 400);
  }

  try {
    const tokenResult = await exchangeWechatCodeForAccessToken(code);
    const wechatUser = await fetchWechatUserInfo({
      accessToken: tokenResult.accessToken,
      openid: tokenResult.openid,
    });

    const user = await getUserByWechatOpenId(tokenResult.openid);
    if (!user) {
      const pending: WechatPendingBindResponseDTO = {
        requiresPhoneBinding: true,
        openid: tokenResult.openid,
        nickname: wechatUser.nickname ?? null,
        avatarUrl: wechatUser.headimgurl ?? null,
      };
      return ok(pending, 202);
    }

    const response: WechatLoginResponseDTO = buildWechatLoginResponse({
      user,
      isNew: false,
      accessToken: buildDevToken(user.id),
    });

    return ok({
      ...response,
      redirectPath: statePayload.redirectPath ?? '/',
    });
  } catch (error) {
    return fail(
      'WECHAT_LOGIN_FAILED',
      '微信登录失败',
      500,
      error instanceof Error ? error.message : error,
    );
  }
}
