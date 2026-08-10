import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const createExpertReview = vi.fn();
const isExpertUserPhone = vi.fn();

vi.mock('@/lib/db', () => ({ createExpertReview, isExpertUserPhone }));
vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }));

import { requireUser } from '@/lib/auth';

describe('POST /api/ai/expert-review', () => {
  it('requires a correction reason before saving', async () => {
    const { POST } = await import('@/app/api/ai/expert-review/route');
    const response = await POST(
      new Request('http://localhost/api/ai/expert-review', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'expert-session',
          question: '政策是否适用？',
          aiAnswer: '可以适用。',
          expertAnswer: '目前不能仅凭现有事实确定。',
          reviewKind: 'incorrect',
          reason: '',
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(response.status).toBe(400);
    expect(createExpertReview).not.toHaveBeenCalled();
  });

  it('saves an independent expert-modified review', async () => {
    createExpertReview.mockResolvedValueOnce({
      id: 'review-1',
      status: 'expert_modified',
      createdAt: '2026-08-09T00:00:00.000Z',
    });
    const { POST } = await import('@/app/api/ai/expert-review/route');
    const response = await POST(
      new Request('http://localhost/api/ai/expert-review', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'expert-session',
          qaRecordId: 'qa-1',
          question: '政策是否适用？',
          aiAnswer: '可以适用。',
          expertAnswer: '目前不能仅凭现有事实确定。',
          reviewKind: 'incorrect',
          reason: '排除条件不是充分条件。',
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(response.status).toBe(201);
    expect(createExpertReview).toHaveBeenCalledWith({
      sessionId: 'expert-session',
      qaRecordId: 'qa-1',
      question: '政策是否适用？',
      aiAnswer: '可以适用。',
      expertAnswer: '目前不能仅凭现有事实确定。',
      reviewKind: 'incorrect',
      reason: '排除条件不是充分条件。',
    });
  });
});

describe('GET /api/auth/expert-status', () => {
  it('returns expert status for current logged-in user phone', async () => {
    vi.mocked(requireUser).mockResolvedValueOnce({
      userId: 'expert-user-1',
      user: {
        id: 'expert-user-1',
        name: '高琨',
        phone: '13791127972',
        identity: null,
        company: null,
        industry: null,
        size: null,
        registeredAt: '2026-08-10T00:00:00.000Z',
        activeAt: '2026-08-10T00:00:00.000Z',
        isProfileComplete: true,
      },
    });
    isExpertUserPhone.mockResolvedValueOnce(true);

    const { GET } = await import('@/app/api/auth/expert-status/route');
    const response = await GET(new NextRequest('http://localhost/api/auth/expert-status'));

    expect(response.status).toBe(200);
    const body = await response.json() as { success: true; data: { isExpert: boolean } };
    expect(body.data.isExpert).toBe(true);
    expect(isExpertUserPhone).toHaveBeenCalledWith('13791127972');
  });
});
