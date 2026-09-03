const PROTECTED_BUSINESS_ROOTS = [
  '/tax-ai',
  '/tax-ai-pro',
  '/risk-assessment',
  '/materials',
  '/appointment',
  '/support',
  '/profile',
  '/checkin',
  '/homepage-survey',
] as const;

export function isProtectedBusinessPath(pathname: string): boolean {
  return PROTECTED_BUSINESS_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}
