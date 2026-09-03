import { describe, expect, it } from 'vitest';
import { isProtectedBusinessPath } from '@/lib/route-auth';

describe('landing route authentication policy', () => {
  it.each(['/', '/login', '/auth/wechat/callback', '/tax-code'])('keeps %s public', (path) => {
    expect(isProtectedBusinessPath(path)).toBe(false);
  });

  it.each([
    '/tax-ai',
    '/tax-ai-pro',
    '/risk-assessment',
    '/risk-assessment/quiz',
    '/risk-assessment/report',
    '/materials',
    '/materials/view',
    '/appointment',
    '/appointment/my',
    '/support',
    '/profile/complete',
    '/checkin',
    '/homepage-survey',
  ])('protects %s before rendering', (path) => {
    expect(isProtectedBusinessPath(path)).toBe(true);
  });
});
