/**
 * 落地页 API 路由单元测试
 *
 * 测试策略：
 * - Mock Supabase createServiceClient 和 requireUser
 * - 测试 Route Handler 的业务逻辑、参数验证和错误处理
 * - 不发起真实网络请求
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mock 公共依赖
// ---------------------------------------------------------------------------

const mockFrom = vi.fn();
const mockServiceClient = { from: mockFrom };
vi.mock('@/lib/supabase', () => ({
  createServiceClient: () => mockServiceClient,
  supabase: mockServiceClient,
}));

vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn(),
}));

import { requireUser } from '@/lib/auth';

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------

function makeRequest(
  method: string,
  url: string,
  body?: unknown,
  headers: Record<string, string> = {},
): NextRequest {
  const reqHeaders: Record<string, string> = { ...headers };
  const reqInit: { method: string; headers: Record<string, string>; body?: string } = { method, headers: reqHeaders };
  if (body !== undefined) {
    reqInit.body = JSON.stringify(body);
    reqHeaders['Content-Type'] = 'application/json';
  }
  return new NextRequest(new Request(url, reqInit));
}

function makeUserCtx() {
  return {
    userId: 'user-uuid-1',
    user: {
      id: 'user-uuid-1',
      name: '李明',
      phone: '13800138001',
      identity: null,
      company: null,
      industry: null,
      size: null,
      registeredAt: '2026-06-01T00:00:00Z',
      activeAt: '2026-06-01T00:00:00Z',
      isProfileComplete: true,
    },
  };
}

function buildSupabaseChain(result: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  mockFrom.mockReturnValue(chain);
  return chain;
}

// ---------------------------------------------------------------------------
// 测试：发送验证码 API
// ---------------------------------------------------------------------------

describe('POST /api/auth/send-code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('手机号格式错误时返回 400', async () => {
    const { POST } = await import('@/app/api/auth/send-code/route');
    const req = makeRequest('POST', 'http://localhost/api/auth/send-code', { phone: '123' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_PHONE');
  });

  it('手机号合法时返回成功', async () => {
    const chain = buildSupabaseChain({ data: null, error: null });
    chain.select = vi.fn().mockImplementation((_fields?: string, opts?: { count?: string; head?: boolean }) => {
      if (opts?.count === 'exact') {
        return { ...chain, single: vi.fn().mockResolvedValue({ count: 0, data: null, error: null }) } as typeof chain;
      }
      return chain;
    });
    chain.limit = vi.fn().mockReturnValue({ ...chain, 0: undefined, length: 0 });
    chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
    chain.insert = vi.fn().mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const { POST } = await import('@/app/api/auth/send-code/route');
    const req = makeRequest('POST', 'http://localhost/api/auth/send-code', { phone: '13800138001', purpose: 'login' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { isRegistered: boolean } };
    expect(body.success).toBe(true);
    expect(typeof body.data.isRegistered).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// 测试：手机号登录 API
// ---------------------------------------------------------------------------

describe('POST /api/auth/login-phone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('缺少手机号时返回 400', async () => {
    const { POST } = await import('@/app/api/auth/login-phone/route');
    const req = makeRequest('POST', 'http://localhost/api/auth/login-phone', { code: '123456' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('缺少验证码时返回 400', async () => {
    const { POST } = await import('@/app/api/auth/login-phone/route');
    const req = makeRequest('POST', 'http://localhost/api/auth/login-phone', { phone: '13800138001' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// 测试：当前用户 API
// ---------------------------------------------------------------------------

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未认证时返回 401', async () => {
    vi.mocked(requireUser).mockResolvedValue(null);
    const { GET } = await import('@/app/api/auth/me/route');
    const req = makeRequest('GET', 'http://localhost/api/auth/me');
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('已认证时返回用户信息', async () => {
    vi.mocked(requireUser).mockResolvedValue(makeUserCtx());
    const { GET } = await import('@/app/api/auth/me/route');
    const req = makeRequest('GET', 'http://localhost/api/auth/me');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { id: string } };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('user-uuid-1');
  });
});

// ---------------------------------------------------------------------------
// 测试：资料领取 API
// ---------------------------------------------------------------------------

describe('POST /api/material-claims', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未认证时返回 401', async () => {
    vi.mocked(requireUser).mockResolvedValue(null);
    const { POST } = await import('@/app/api/material-claims/route');
    const req = makeRequest('POST', 'http://localhost/api/material-claims', { materialId: 'mat-1' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('materialId 为空时返回 400', async () => {
    vi.mocked(requireUser).mockResolvedValue(makeUserCtx());
    const { POST } = await import('@/app/api/material-claims/route');
    const req = makeRequest('POST', 'http://localhost/api/material-claims', {});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_MATERIAL_ID');
  });

  it('资料不存在时返回 404', async () => {
    vi.mocked(requireUser).mockResolvedValue(makeUserCtx());
    const chain = buildSupabaseChain(null);
    chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } });

    const { POST } = await import('@/app/api/material-claims/route');
    const req = makeRequest('POST', 'http://localhost/api/material-claims', { materialId: 'nonexistent' });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// 测试：AI 问答 API
// ---------------------------------------------------------------------------

describe('POST /api/ai/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        query: '发票合规怎么判断？',
        answer: '发票合规需要结合合同、物流、资金流和发票流综合判断，建议留存完整证据链。',
        citations: [
          {
            title: '发票合规指南',
            source_path: '税务知识库数据/发票合规.md',
            section: '正文',
            score: 0.9,
            point_id: 'point-1',
            doc_id: 'DOC-1',
          },
        ],
      }),
    }));
  });

  it('问题为空时返回 400', async () => {
    const { POST } = await import('@/app/api/ai/chat/route');
    const req = makeRequest('POST', 'http://localhost/api/ai/chat', { question: '' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('问题超出长度限制时返回 400', async () => {
    const { POST } = await import('@/app/api/ai/chat/route');
    const req = makeRequest('POST', 'http://localhost/api/ai/chat', { question: 'a'.repeat(2001) });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('正常问答落库并返回 AI 回答', async () => {
    vi.mocked(requireUser).mockResolvedValue(makeUserCtx());
    const chain = buildSupabaseChain(null);
    chain.insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'qa-1', session_id: 'sess-1' },
          error: null,
        }),
      }),
    });

    const { POST } = await import('@/app/api/ai/chat/route');
    const req = makeRequest('POST', 'http://localhost/api/ai/chat', {
      question: '发票合规怎么判断？',
    });
    const res = await POST(req);
    expect(res.status).toBeOneOf([200, 201]);
    const body = await res.json() as {
      success: boolean;
      data: { answer: { riskLevel: string; involvedRisks: string[] } };
    };
    expect(body.success).toBe(true);
    expect(body.data.answer.riskLevel).toBeTruthy();
    expect(Array.isArray(body.data.answer.involvedRisks)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 测试：测评题库 API
// ---------------------------------------------------------------------------

describe('GET /api/assessment/questions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('返回题目列表（不含 score）', async () => {
    const chain = buildSupabaseChain(null);
    chain.select = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'q-1',
              module_key: 'basic_info',
              type: 'single',
              title: '企业所属行业？',
              description: '请选择',
              sort_order: 1,
              options: [
                { sort_order: 0, label: '制造业', score: 2 },
                { sort_order: 1, label: '批发零售', score: 2 },
              ],
            },
          ],
          error: null,
        }),
      }),
    });

    const { GET } = await import('@/app/api/assessment/questions/route');
    const req = makeRequest('GET', 'http://localhost/api/assessment/questions');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json() as {
      success: boolean;
      data: Array<{ options: Array<{ score?: number }> }>;
    };
    expect(body.success).toBe(true);
    // S5 安全约束：options 中不应包含 score
    for (const q of body.data) {
      for (const opt of q.options) {
        expect(opt.score).toBeUndefined();
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 测试：活动落地页 API
// ---------------------------------------------------------------------------

describe('GET /api/activities/[id]/landing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('活动不存在时返回 404', async () => {
    const chain = buildSupabaseChain(null);
    chain.single = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } });

    const { GET } = await import('@/app/api/activities/[id]/landing/route');
    const req = makeRequest('GET', 'http://localhost/api/activities/nonexistent/landing');
    const res = await GET(req, { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });

  it('已发布活动返回活动信息', async () => {
    const chain = buildSupabaseChain(null);
    chain.single = vi.fn().mockResolvedValue({
      data: {
        id: 'act-1',
        name: '金税四期风险识别专题课',
        start_at: '2026-06-15T14:00:00Z',
        end_at: '2026-06-15T17:00:00Z',
        place: '上海静安区',
        teacher: '王老师',
        speaker_title: '资深税务顾问',
        description: '本次沙龙将深度解析金税四期...',
        cover_image: null,
        status: 'published',
      },
      error: null,
    });

    const { GET } = await import('@/app/api/activities/[id]/landing/route');
    const req = makeRequest('GET', 'http://localhost/api/activities/act-1/landing');
    const res = await GET(req, { params: Promise.resolve({ id: 'act-1' }) });
    expect(res.status).toBe(200);
    const body = await res.json() as {
      success: boolean;
      data: { name: string; speaker: string; location: string };
    };
    expect(body.success).toBe(true);
    // S4：字段名映射验证
    expect(body.data.name).toBe('金税四期风险识别专题课');
    expect(body.data.speaker).toBe('王老师');
    expect(body.data.location).toBe('上海静安区');
  });
});
