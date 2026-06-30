import { describe, expect, it } from 'vitest';

import { formatShanghaiDate, formatShanghaiTime } from '@/lib/activity-time';

describe('activity time formatting', () => {
  it('formats Supabase UTC timestamptz values as Shanghai activity time', () => {
    expect(formatShanghaiDate('2026-07-01T00:30:00+00:00')).toBe('2026-07-01');
    expect(formatShanghaiTime('2026-07-01T00:30:00+00:00')).toBe('08:30');
  });

  it('keeps admin +08:00 timestamps visually unchanged', () => {
    expect(formatShanghaiDate('2026-07-01T08:30:00+08:00')).toBe('2026-07-01');
    expect(formatShanghaiTime('2026-07-01T08:30:00+08:00')).toBe('08:30');
  });
});
