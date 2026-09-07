const origin = 'https://local.invalid';

export function getHistoryContext(previous: string | null, fallback: string) {
  const safe = previous?.startsWith('/') && !previous.startsWith('//') && !previous.includes('\\');
  const url = new URL(safe && previous ? previous : fallback, origin);
  const isChat = url.pathname === '/tax-ai';
  return {
    backPath: isChat ? `${url.pathname}${url.search}` : fallback,
    currentSession: isChat ? url.searchParams.get('session') : null,
    returnTo: isChat ? url.searchParams.get('returnTo') : null,
  };
}

export function buildHistorySessionPath(chatPath: string, session: string, returnTo: string | null) {
  const url = new URL(chatPath, origin);
  url.searchParams.set('session', session);
  if (returnTo?.startsWith('/') && !returnTo.startsWith('//') && !returnTo.includes('\\')) {
    url.searchParams.set('returnTo', returnTo);
  }
  return `${url.pathname}${url.search}`;
}
