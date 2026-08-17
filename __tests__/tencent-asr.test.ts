import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('腾讯云语音识别鉴权', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.TENCENTCLOUD_SECRET_ID = 'AKID_TEST';
    process.env.TENCENTCLOUD_SECRET_KEY = 'SECRET_TEST';
    globalThis.fetch = vi.fn(async (_input, init) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('Authorization')).toMatch(/^TC3-HMAC-SHA256 Credential=/);
      expect(headers.get('Authorization')).not.toMatch(/^TC3-HMAC-SHA256,/);
      return new Response(JSON.stringify({ Response: { Result: '测试', RequestId: 'request-1' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.TENCENTCLOUD_SECRET_ID;
    delete process.env.TENCENTCLOUD_SECRET_KEY;
  });

  it('使用符合腾讯云 TC3 规范的 Authorization 头', async () => {
    const { recognizeTencentSpeech } = await import('@/lib/tencent-asr');
    await recognizeTencentSpeech({ audio: Buffer.from([1, 2, 3]), voiceFormat: 'wav' });
  });
});
