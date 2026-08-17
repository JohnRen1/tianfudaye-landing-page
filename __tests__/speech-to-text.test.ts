import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const recognizeTencentSpeech = vi.fn();

vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }));
vi.mock('@/lib/tencent-asr', () => ({ recognizeTencentSpeech }));

import { requireUser } from '@/lib/auth';

function makeRequest(formData?: FormData): NextRequest {
  return new NextRequest('http://localhost/api/ai/speech-to-text', {
    method: 'POST',
    body: formData,
  });
}

describe('POST /api/ai/speech-to-text', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires logged-in user before transcribing speech', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce(null);
    const { POST } = await import('@/app/api/ai/speech-to-text/route');

    const response = await POST(makeRequest(new FormData()));

    expect(response.status).toBe(401);
    expect(recognizeTencentSpeech).not.toHaveBeenCalled();
  });

  it('requires an audio file', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce({
      userId: 'user-1',
      user: {
        id: 'user-1',
        name: '测试用户',
        phone: '13791127972',
        identity: null,
        company: null,
        industry: null,
        size: null,
        registeredAt: '2026-08-17T00:00:00.000Z',
        activeAt: '2026-08-17T00:00:00.000Z',
        isProfileComplete: true,
      },
    });
    const { POST } = await import('@/app/api/ai/speech-to-text/route');

    const response = await POST(makeRequest(new FormData()));

    expect(response.status).toBe(400);
    expect(recognizeTencentSpeech).not.toHaveBeenCalled();
  });

  it('returns recognized text from Tencent ASR', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce({
      userId: 'user-1',
      user: {
        id: 'user-1',
        name: '测试用户',
        phone: '13791127972',
        identity: null,
        company: null,
        industry: null,
        size: null,
        registeredAt: '2026-08-17T00:00:00.000Z',
        activeAt: '2026-08-17T00:00:00.000Z',
        isProfileComplete: true,
      },
    });
    recognizeTencentSpeech.mockResolvedValueOnce({
      text: '收到发票后应该怎么处理？',
      requestId: 'request-1',
      audioDuration: 1800,
    });
    const formData = new FormData();
    formData.set('audio', new File([new Uint8Array([1, 2, 3])], 'speech.wav', { type: 'audio/wav' }));
    const { POST } = await import('@/app/api/ai/speech-to-text/route');

    const response = await POST(makeRequest(formData));
    const body = await response.json() as { success: true; data: { text: string } };

    expect(response.status).toBe(200);
    expect(body.data.text).toBe('收到发票后应该怎么处理？');
    expect(recognizeTencentSpeech).toHaveBeenCalledWith({
      audio: Buffer.from([1, 2, 3]),
      voiceFormat: 'wav',
    });
  });
});
