import { describe, expect, it, vi } from 'vitest';

const createExpertReview = vi.fn();

vi.mock('@/lib/db', () => ({ createExpertReview }));

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
