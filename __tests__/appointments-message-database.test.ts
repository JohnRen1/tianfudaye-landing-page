import { beforeEach, describe, expect, it, vi } from 'vitest';

const userUpdates: Array<Record<string, unknown>> = [];

function buildChain(table: string) {
  let operation: 'insert' | 'select' | 'update' | null = null;
  const chain = {
    insert: vi.fn((payload: Record<string, unknown>) => {
      operation = 'insert';
      return chain;
    }),
    update: vi.fn((payload: Record<string, unknown>) => {
      operation = 'update';
      if (table === 'users') userUpdates.push(payload);
      return chain;
    }),
    select: vi.fn(() => {
      if (operation === null) operation = 'select';
      return chain;
    }),
    eq: vi.fn(() => chain),
    not: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(async () => {
      if (table === 'appointments' && operation === 'insert') {
        return {
          data: { id: 'appointment-1', created_at: '2026-08-03T00:00:00Z' },
          error: null,
        };
      }
      if (table === 'leads' && operation === 'select') {
        return { data: { id: 'lead-1' }, error: null };
      }
      return { data: null, error: null };
    }),
  };
  return chain;
}

vi.mock('@/lib/supabase', () => ({
  createServiceClient: () => ({
    from: (table: string) => buildChain(table),
  }),
}));

describe('留言咨询数据库写入', () => {
  beforeEach(() => {
    userUpdates.length = 0;
  });

  it('不使用留言占位信息覆盖用户资料', async () => {
    const { createAppointment } = await import('@/lib/database/supabase-adapter');

    await createAppointment({
      userId: 'user-uuid-1',
      userPhone: '13800138001',
      userName: '留言用户',
      body: {
        name: '留言用户',
        phone: '13800138001',
        topic: 'other',
        description: '无法领取资料，请客服协助',
        company: '',
        industry: '',
        contactTime: '',
        appointmentType: 'message',
      },
    });

    expect(userUpdates[0]).toEqual({ active_at: expect.any(String) });
    expect(userUpdates[0]).not.toHaveProperty('name');
    expect(userUpdates[0]).not.toHaveProperty('company');
    expect(userUpdates[0]).not.toHaveProperty('industry');
  });
});
