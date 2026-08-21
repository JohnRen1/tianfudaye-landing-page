import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }));
vi.mock('@/lib/db', () => ({ getClaimedMaterialViewUrl: vi.fn() }));

import { requireUser } from '@/lib/auth';
import { getClaimedMaterialViewUrl } from '@/lib/db';

const userContext = {
  userId: 'user-1',
  user: {
    id: 'user-1', name: null, phone: '13800138001', identity: null, company: null,
    industry: null, size: null, registeredAt: '2026-01-01T00:00:00.000Z',
    activeAt: '2026-01-01T00:00:00.000Z', isProfileComplete: true,
  },
};

function makeRequest() {
  return new NextRequest('https://landing.example.com/api/materials/material-1/view');
}

function makeContext(materialId = 'material-1') {
  return { params: Promise.resolve({ materialId }) };
}

describe('GET /api/materials/[materialId]/view', () => {
  beforeEach(() => vi.clearAllMocks());

  it('未登录时拒绝查看', async () => {
    vi.mocked(requireUser).mockResolvedValue(null);
    const { GET } = await import('@/app/api/materials/[materialId]/view/route');

    const response = await GET(makeRequest(), makeContext());

    expect(response.status).toBe(401);
    expect(getClaimedMaterialViewUrl).not.toHaveBeenCalled();
  });

  it('已领取时返回新的签名查看链接', async () => {
    vi.mocked(requireUser).mockResolvedValue(userContext);
    vi.mocked(getClaimedMaterialViewUrl).mockResolvedValue({
      viewUrl: 'https://storage.example.com/material.pdf?token=fresh',
      name: '财税指南',
      format: 'pdf',
    });
    const { GET } = await import('@/app/api/materials/[materialId]/view/route');

    const response = await GET(makeRequest(), makeContext());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        viewUrl: 'https://storage.example.com/material.pdf?token=fresh',
        name: '财税指南',
        format: 'pdf',
      },
    });
    expect(getClaimedMaterialViewUrl).toHaveBeenCalledWith({ userId: 'user-1', materialId: 'material-1' });
  });

  it('未领取时拒绝查看', async () => {
    vi.mocked(requireUser).mockResolvedValue(userContext);
    vi.mocked(getClaimedMaterialViewUrl).mockRejectedValue(new Error('MATERIAL_NOT_CLAIMED'));
    const { GET } = await import('@/app/api/materials/[materialId]/view/route');

    const response = await GET(makeRequest(), makeContext());

    expect(response.status).toBe(403);
  });
});
