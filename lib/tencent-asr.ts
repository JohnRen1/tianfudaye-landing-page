import crypto from 'node:crypto';

const ASR_HOST = 'asr.tencentcloudapi.com';
const ASR_SERVICE = 'asr';
const ASR_VERSION = '2019-06-14';
const ASR_ACTION = 'SentenceRecognition';

export interface TencentAsrResult {
  text: string;
  requestId: string;
  audioDuration: number | null;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function hmacSha256(key: Buffer | string, value: string): Buffer {
  return crypto.createHmac('sha256', key).update(value, 'utf8').digest();
}

function formatUtcDate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

function buildAuthorization(params: {
  secretId: string;
  secretKey: string;
  timestamp: number;
  payload: string;
}): string {
  const date = formatUtcDate(params.timestamp);
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${ASR_HOST}\n`;
  const signedHeaders = 'content-type;host';
  const canonicalRequest = [
    'POST',
    '/',
    '',
    canonicalHeaders,
    signedHeaders,
    sha256(params.payload),
  ].join('\n');
  const credentialScope = `${date}/${ASR_SERVICE}/tc3_request`;
  const stringToSign = [
    'TC3-HMAC-SHA256',
    String(params.timestamp),
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');
  const secretDate = hmacSha256(`TC3${params.secretKey}`, date);
  const secretService = hmacSha256(secretDate, ASR_SERVICE);
  const secretSigning = hmacSha256(secretService, 'tc3_request');
  const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign, 'utf8').digest('hex');

  return `TC3-HMAC-SHA256 ${[
    `Credential=${params.secretId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(', ')}`;
}

function getTencentAsrCredentials(): { secretId: string; secretKey: string } {
  const secretId = process.env.TENCENTCLOUD_SECRET_ID?.trim() ?? '';
  const secretKey = process.env.TENCENTCLOUD_SECRET_KEY?.trim() ?? '';
  if (!secretId || !secretKey) {
    throw new Error('腾讯云语音识别尚未配置 SecretId 或 SecretKey');
  }
  return { secretId, secretKey };
}

export async function recognizeTencentSpeech(params: {
  audio: Buffer;
  voiceFormat: string;
}): Promise<TencentAsrResult> {
  const { secretId, secretKey } = getTencentAsrCredentials();
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    ProjectId: 0,
    SubServiceType: 2,
    EngSerViceType: process.env.TENCENT_ASR_ENGINE?.trim() || '16k_zh',
    SourceType: 1,
    VoiceFormat: params.voiceFormat,
    Data: params.audio.toString('base64'),
    DataLen: params.audio.byteLength,
    FilterDirty: 0,
    FilterModal: 1,
    FilterPunc: 0,
    ConvertNumMode: 1,
    ...(process.env.TENCENT_ASR_HOTWORD_LIST?.trim()
      ? { HotwordList: process.env.TENCENT_ASR_HOTWORD_LIST.trim() }
      : {}),
  });
  const response = await fetch(`https://${ASR_HOST}`, {
    method: 'POST',
    headers: {
      Authorization: buildAuthorization({ secretId, secretKey, timestamp, payload }),
      'Content-Type': 'application/json; charset=utf-8',
      Host: ASR_HOST,
      'X-TC-Action': ASR_ACTION,
      'X-TC-Timestamp': String(timestamp),
      'X-TC-Version': ASR_VERSION,
      'X-TC-Region': process.env.TENCENT_ASR_REGION?.trim() || 'ap-shanghai',
    },
    body: payload,
  });

  const body = (await response.json().catch(() => null)) as
    | {
        Response?: {
          Result?: string;
          RequestId?: string;
          AudioDuration?: number;
          Error?: { Code?: string; Message?: string };
        };
      }
    | null;
  const asrResponse = body?.Response;
  if (!response.ok || asrResponse?.Error) {
    const code = asrResponse?.Error?.Code ?? `HTTP_${response.status}`;
    const message = asrResponse?.Error?.Message ?? '腾讯云语音识别调用失败';
    throw new Error(`${code}: ${message}`);
  }

  return {
    text: asrResponse?.Result?.trim() ?? '',
    requestId: asrResponse?.RequestId ?? '',
    audioDuration: asrResponse?.AudioDuration ?? null,
  };
}
