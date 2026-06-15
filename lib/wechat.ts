import crypto from 'node:crypto';

interface WechatOauthStatePayload {
  redirectPath?: string;
  sourceQrId?: string;
  sourceActivityId?: string;
}

interface WechatUserInfo {
  openid: string;
  nickname?: string | null;
  headimgurl?: string | null;
  unionid?: string | null;
}

interface WechatLoginExchangeResult {
  openid: string;
  accessToken: string;
  nickname?: string | null;
  avatarUrl?: string | null;
}

type WechatLoginProvider = 'native' | 'arsn';

const STATE_TTL_MS = 10 * 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var _wechatOauthStateStore:
    | Map<string, { expiresAt: number; payload: WechatOauthStatePayload }>
    | undefined;
}

function getWechatStateStore(): Map<string, { expiresAt: number; payload: WechatOauthStatePayload }> {
  if (!globalThis._wechatOauthStateStore) {
    globalThis._wechatOauthStateStore = new Map();
  }
  return globalThis._wechatOauthStateStore;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`MISSING_${name}`);
  }
  return value;
}

function getWechatLoginProvider(): WechatLoginProvider {
  return process.env.WECHAT_LOGIN_PROVIDER === 'arsn' ? 'arsn' : 'native';
}

export function createWechatOauthState(payload: WechatOauthStatePayload): string {
  const state = crypto.randomBytes(16).toString('hex');
  const store = getWechatStateStore();
  store.set(state, { expiresAt: Date.now() + STATE_TTL_MS, payload });
  return state;
}

export function consumeWechatOauthState(state: string): WechatOauthStatePayload | null {
  const store = getWechatStateStore();
  const found = store.get(state);
  if (!found) return null;
  store.delete(state);
  if (found.expiresAt <= Date.now()) return null;
  return found.payload;
}

function buildNativeWechatAuthorizeUrl(params: {
  state: string;
  scope?: 'snsapi_base' | 'snsapi_userinfo';
}): string {
  const appId = getRequiredEnv('WECHAT_APP_ID');
  const callbackUrl = getRequiredEnv('WECHAT_OAUTH_CALLBACK_URL');
  const scope = params.scope ?? 'snsapi_userinfo';
  const url = new URL('https://open.weixin.qq.com/connect/oauth2/authorize');
  url.searchParams.set('appid', appId);
  url.searchParams.set('redirect_uri', callbackUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', params.state);
  return `${url.toString()}#wechat_redirect`;
}

function buildArsnWechatAuthorizeUrl(params: {
  state: string;
  type?: 'wx' | 'wxmp';
}): string {
  const appId = getRequiredEnv('ARSN_LOGIN_APP_ID');
  const appKey = getRequiredEnv('ARSN_LOGIN_APP_KEY');
  const callbackUrl = getRequiredEnv('WECHAT_OAUTH_CALLBACK_URL');
  const type = params.type ?? 'wx';
  const redirectUrl = new URL(callbackUrl);
  redirectUrl.searchParams.set('state', params.state);

  const url = new URL('https://u.arsn.cn/connect.php');
  url.searchParams.set('act', 'login');
  url.searchParams.set('appid', appId);
  url.searchParams.set('appkey', appKey);
  url.searchParams.set('type', type);
  url.searchParams.set('redirect_uri', redirectUrl.toString());
  return url.toString();
}

export function buildWechatAuthorizeUrl(params: {
  state: string;
  scope?: 'snsapi_base' | 'snsapi_userinfo';
  type?: 'wx' | 'wxmp';
}): string {
  return getWechatLoginProvider() === 'arsn'
    ? buildArsnWechatAuthorizeUrl({ state: params.state, type: params.type })
    : buildNativeWechatAuthorizeUrl({ state: params.state, scope: params.scope });
}

async function exchangeNativeWechatCode(code: string): Promise<WechatLoginExchangeResult> {
  const appId = getRequiredEnv('WECHAT_APP_ID');
  const appSecret = getRequiredEnv('WECHAT_APP_SECRET');

  const url = new URL('https://api.weixin.qq.com/sns/oauth2/access_token');
  url.searchParams.set('appid', appId);
  url.searchParams.set('secret', appSecret);
  url.searchParams.set('code', code);
  url.searchParams.set('grant_type', 'authorization_code');

  const response = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
  const body = (await response.json()) as Record<string, unknown>;

  if (!response.ok || typeof body.errcode === 'number') {
    throw new Error(`WECHAT_TOKEN_EXCHANGE_FAILED:${String(body.errmsg ?? response.statusText)}`);
  }

  const openid = body.openid;
  const accessToken = body.access_token;

  if (typeof openid !== 'string' || typeof accessToken !== 'string') {
    throw new Error('WECHAT_TOKEN_EXCHANGE_INVALID_RESPONSE');
  }

  return { openid, accessToken };
}

async function exchangeArsnWechatCode(code: string): Promise<WechatLoginExchangeResult> {
  const appId = getRequiredEnv('ARSN_LOGIN_APP_ID');
  const appKey = getRequiredEnv('ARSN_LOGIN_APP_KEY');
  const type = process.env.ARSN_WECHAT_LOGIN_TYPE === 'wxmp' ? 'wxmp' : 'wx';

  const url = new URL('https://u.arsn.cn/connect.php');
  url.searchParams.set('act', 'callback');
  url.searchParams.set('appid', appId);
  url.searchParams.set('appkey', appKey);
  url.searchParams.set('type', type);
  url.searchParams.set('code', code);

  const response = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
  const body = (await response.json()) as Record<string, unknown>;

  if (!response.ok || body.code !== 0) {
    throw new Error(`WECHAT_TOKEN_EXCHANGE_FAILED:${String(body.msg ?? response.statusText)}`);
  }

  const openid = body.social_uid;
  const accessToken = body.access_token;

  if (typeof openid !== 'string' || typeof accessToken !== 'string') {
    throw new Error('WECHAT_TOKEN_EXCHANGE_INVALID_RESPONSE');
  }

  return {
    openid,
    accessToken,
    nickname: typeof body.nickname === 'string' ? body.nickname : null,
    avatarUrl: typeof body.faceimg === 'string' ? body.faceimg : null,
  };
}

export async function exchangeWechatCodeForAccessToken(code: string): Promise<WechatLoginExchangeResult> {
  return getWechatLoginProvider() === 'arsn'
    ? exchangeArsnWechatCode(code)
    : exchangeNativeWechatCode(code);
}

async function fetchNativeWechatUserInfo(params: {
  accessToken: string;
  openid: string;
}): Promise<WechatUserInfo> {
  const url = new URL('https://api.weixin.qq.com/sns/userinfo');
  url.searchParams.set('access_token', params.accessToken);
  url.searchParams.set('openid', params.openid);
  url.searchParams.set('lang', 'zh_CN');

  const response = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
  const body = (await response.json()) as Record<string, unknown>;

  if (!response.ok || typeof body.errcode === 'number') {
    return { openid: params.openid };
  }

  return {
    openid: typeof body.openid === 'string' ? body.openid : params.openid,
    nickname: typeof body.nickname === 'string' ? body.nickname : null,
    headimgurl: typeof body.headimgurl === 'string' ? body.headimgurl : null,
    unionid: typeof body.unionid === 'string' ? body.unionid : null,
  };
}

async function fetchArsnWechatUserInfo(params: {
  accessToken: string;
  openid: string;
}): Promise<WechatUserInfo> {
  return {
    openid: params.openid,
    nickname: null,
    headimgurl: null,
    unionid: null,
  };
}

export async function fetchWechatUserInfo(params: {
  accessToken: string;
  openid: string;
}): Promise<WechatUserInfo> {
  return getWechatLoginProvider() === 'arsn'
    ? fetchArsnWechatUserInfo(params)
    : fetchNativeWechatUserInfo(params);
}
