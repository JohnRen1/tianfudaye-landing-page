import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 浏览器端客户端（anon key，受 RLS 限制）
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 服务端客户端（service role key，绕过 RLS）
// 仅在 Route Handlers / Server Actions 中使用，绝不在客户端组件中使用
export function createServiceClient() {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}
