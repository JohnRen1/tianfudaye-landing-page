import { NextResponse } from 'next/server';

import { getSupabaseRuntimeInfo } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getSupabaseRuntimeInfo(), {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
