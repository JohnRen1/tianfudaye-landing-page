"use client";

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CLIENT_AUTH_REQUIRED_EVENT, hydrateClientAuthFromServer, isClientLoggedIn } from '@/lib/client-auth';
import { isProtectedBusinessPath } from '@/lib/route-auth';
import { LoginModal } from './login-modal';

function safeReturnPath(): string {
  if (typeof window === 'undefined') return '/';
  const raw = new URL(window.location.href).searchParams.get('returnTo');
  if (!raw) return '/';
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch { decoded = raw; }
  return decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.includes('\\') ? decoded : '/';
}

export function RouteAuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const protectedRoute = isProtectedBusinessPath(pathname);
  const [allowed, setAllowed] = useState(!protectedRoute);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (!protectedRoute) {
      setAllowed(true);
      setLoginOpen(false);
      return () => { active = false; };
    }
    if (isClientLoggedIn()) {
      setAllowed(true);
      setLoginOpen(false);
      return () => { active = false; };
    }
    setAllowed(false);
    void hydrateClientAuthFromServer().then((loggedIn) => {
      if (!active) return;
      setAllowed(loggedIn);
      setLoginOpen(!loggedIn);
    });
    return () => { active = false; };
  }, [pathname, protectedRoute]);

  useEffect(() => {
    const requireLogin = () => {
      if (!isProtectedBusinessPath(window.location.pathname)) return;
      setAllowed(false);
      setLoginOpen(true);
    };
    window.addEventListener(CLIENT_AUTH_REQUIRED_EVENT, requireLogin);
    return () => window.removeEventListener(CLIENT_AUTH_REQUIRED_EVENT, requireLogin);
  }, []);

  if (!protectedRoute) return children;

  return <>
    {allowed ? children : <main className='min-h-screen bg-background' aria-busy='true' />}
    <LoginModal
      open={loginOpen}
      onOpenChange={(open) => {
        setLoginOpen(open);
        if (!open && !allowed) router.replace(safeReturnPath());
      }}
      onSuccess={() => {
        setAllowed(true);
        setLoginOpen(false);
      }}
    />
  </>;
}
