import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  createAppointment: vi.fn(),
  getAppointmentUserProfile: vi.fn(),
}));

import { requireUser } from '@/lib/auth';
import { createAppointment, getAppointmentUserProfile } from '@/lib/db';

function makeMessageRequest(): NextRequest {
  return new NextRequest('http://localhost/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '',
      phone: '',
      topic: 'other',
      description: '无法领取资料，请客服协助',
      company: '',
      industry: '',
      contactTime: '',
      appointmentType: 'message',
    }),
  });
}

describe('POST /api/appointments 留言咨询', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue({
      userId: 'user-uuid-1',
      user: {
        id: 'user-uuid-1',
        name: null,
        phone: '13800138001',
        identity: null,
        company: null,
        industry: null,
        size: null,
        registeredAt: '2026-06-01T00:00:00Z',
        activeAt: '2026-06-01T00:00:00Z',
        isProfileComplete: false,
      },
    });
    vi.mocked(getAppointmentUserProfile).mockResolvedValue({
      name: '',
      phone: '13800138001',
    });
    vi.mocked(createAppointment).mockResolvedValue({
      id: 'appointment-1',
      leadId: null,
      status: 'pending',
      createdAt: '2026-08-03T00:00:00Z',
    });
  });

  it('账号未填写姓名时使用留言快照名并成功提交', async () => {
    const { POST } = await import('@/app/api/appointments/route');
    const response = await POST(makeMessageRequest());

    expect(response.status).toBe(201);
    expect(createAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-uuid-1',
        userPhone: '13800138001',
        userName: '留言用户',
        body: expect.objectContaining({
          name: '留言用户',
          appointmentType: 'message',
        }),
      }),
    );
  });
});
