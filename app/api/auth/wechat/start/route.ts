import { NextRequest, NextResponse } from 'next/server';
import { buildWechatAuthorizeUrl, createWechatOauthState } from '@/lib/wechat';
import { fail } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const redirectPath = url.searchParams.get('redirectPath') ?? '/';
    const sourceQrId = url.searchParams.get('sourceQrId') ?? undefined;
    const sourceActivityId = url.searchParams.get('sourceActivityId') ?? undefined;

    const state = createWechatOauthState({
      redirectPath,
      sourceQrId,
      sourceActivityId,
    });

    const authorizeUrl = buildWechatAuthorizeUrl({ state });
    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'WECHAT_START_FAILED';
    if (message.startsWith('MISSING_')) {
      return fail('WECHAT_NOT_CONFIGURED', '微信登录尚未完成配置', 501, message);
    }
    return fail('WECHAT_START_FAILED', '微信授权发起失败', 500, message);
  }
}
