import { describe, expect, it } from 'vitest';
import { buildHistorySessionPath, getHistoryContext } from '@/lib/chat-navigation';

describe('历史与当前对话导航', () => {
  it('识别来自问答页的当前会话并保留业务返回入口', () => {
    const previous = '/tax-ai?session=current&returnTo=%2Fmaterials';
    const context = getHistoryContext(previous, '/tax-ai');
    expect(context).toEqual({ backPath: previous, currentSession: 'current', returnTo: '/materials' });
    const target = new URL(buildHistorySessionPath('/tax-ai?activity_id=a', 'older', context.returnTo), 'https://local.invalid');
    expect(target.searchParams.get('session')).toBe('older');
    expect(target.searchParams.get('returnTo')).toBe('/materials');
    expect(target.searchParams.get('activity_id')).toBe('a');
  });

  it.each([null, '//evil.example/tax-ai?session=a', '/tax-ai/history?session=a', '/other?session=a'])('入口 %s 不会误标当前会话', (previous) => {
    expect(getHistoryContext(previous, '/tax-ai')).toEqual({ backPath: '/tax-ai', currentSession: null, returnTo: null });
  });

  it('旧记录标识保持原样，不会误识别为新会话', () => {
    expect(getHistoryContext('/tax-ai?session=record%3A123', '/tax-ai').currentSession).toBe('record:123');
  });
});
