import { createClient } from '@supabase/supabase-js';

function getSupabaseProjectRef(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname;
    return hostname.endsWith('.supabase.co') ? hostname.split('.')[0] ?? null : hostname;
  } catch {
    return null;
  }
}

function getRequiredEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY' | 'SUPABASE_SERVICE_ROLE_KEY'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

let browserClient:
  | ReturnType<typeof createClient>
  | null = null;

// 浏览器端客户端（anon key，受 RLS 限制）
export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  browserClient = createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  );
  return browserClient;
}

// 服务端客户端（service role key，绕过 RLS）
// 仅在 Route Handlers / Server Actions 中使用，绝不在客户端组件中使用
export function createServiceClient() {
  return createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
    auth: { persistSession: false },
    },
  );
}

export function getSupabaseRuntimeInfo() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return {
    appEnv: process.env.APP_ENV ?? null,
    databaseProvider: process.env.APP_DATABASE_PROVIDER ?? null,
    supabaseProjectRef: getSupabaseProjectRef(supabaseUrl),
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
}
