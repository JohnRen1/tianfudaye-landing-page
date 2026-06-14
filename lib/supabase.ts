import { createClient } from '@supabase/supabase-js';

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
