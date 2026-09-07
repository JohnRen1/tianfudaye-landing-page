import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireUser = vi.fn();
const mockListSavedAssessmentReports = vi.fn();
const mockGetAssessmentReportById = vi.fn();
const mockSaveAssessmentReport = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireUser: mockRequireUser,
}));

vi.mock('@/lib/db', () => ({
  listSavedAssessmentReports: mockListSavedAssessmentReports,
  getAssessmentReportById: mockGetAssessmentReportById,
  saveAssessmentReport: mockSaveAssessmentReport,
}));

function makeRequest(method: string, path: string): NextRequest {
  return new NextRequest(new Request(`http://localhost${path}`, { method }));
}

function makeUserContext() {
  return {
    userId: 'user-1',
    user: {
      id: 'user-1',
      phone: '13800138000',
      name: '测试用户',
      identity: null,
      company: null,
      industry: null,
      size: null,
      registeredAt: '2026-09-01T00:00:00.000Z',
      activeAt: '2026-09-01T00:00:00.000Z',
      isProfileComplete: true,
    },
  };
}

describe('GET /api/auth/me/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未登录时返回 401', async () => {
    mockRequireUser.mockResolvedValue(null);
    const { GET } = await import('@/app/api/auth/me/reports/route');

    const response = await GET(makeRequest('GET', '/api/auth/me/reports'));

    expect(response.status).toBe(401);
    expect(mockListSavedAssessmentReports).not.toHaveBeenCalled();
  });

  it('仅查询当前用户已保存的报告', async () => {
    mockRequireUser.mockResolvedValue(makeUserContext());
    mockListSavedAssessmentReports.mockResolvedValue([
      {
        id: 'report-1',
        score: 78,
        riskLevel: 'high',
        modules: ['发票合规风险'],
        completedAt: '2026-09-03T10:00:00.000Z',
      },
    ]);
    const { GET } = await import('@/app/api/auth/me/reports/route');

    const response = await GET(makeRequest('GET', '/api/auth/me/reports'));
    const body = await response.json() as { success: boolean; data: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data[0]?.id).toBe('report-1');
    expect(mockListSavedAssessmentReports).toHaveBeenCalledWith('user-1');
  });
});

describe('POST /api/assessment/report/:id/save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('保存匿名报告时传入当前用户完成归属绑定', async () => {
    mockRequireUser.mockResolvedValue(makeUserContext());
    mockGetAssessmentReportById.mockResolvedValue({
      report: { id: 'report-1' },
      userId: null,
    });
    mockSaveAssessmentReport.mockResolvedValue({
      saved: true,
      savedAt: '2026-09-05T10:00:00.000Z',
    });
    const { POST } = await import('@/app/api/assessment/report/[id]/save/route');

    const response = await POST(
      makeRequest('POST', '/api/assessment/report/report-1/save'),
      { params: Promise.resolve({ id: 'report-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mockSaveAssessmentReport).toHaveBeenCalledWith('report-1', 'user-1');
  });

  it('拒绝保存属于其他用户的报告', async () => {
    mockRequireUser.mockResolvedValue(makeUserContext());
    mockGetAssessmentReportById.mockResolvedValue({
      report: { id: 'report-2' },
      userId: 'another-user',
    });
    const { POST } = await import('@/app/api/assessment/report/[id]/save/route');

    const response = await POST(
      makeRequest('POST', '/api/assessment/report/report-2/save'),
      { params: Promise.resolve({ id: 'report-2' }) },
    );

    expect(response.status).toBe(403);
    expect(mockSaveAssessmentReport).not.toHaveBeenCalled();
  });
});
