import { NextResponse } from 'next/server';

import { databaseProvider } from '@/lib/db';
import { getSmsRuntimeInfo } from '@/lib/sms';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      appEnv: process.env.APP_ENV ?? null,
      nodeEnv: process.env.NODE_ENV ?? null,
      databaseProvider,
      sms: getSmsRuntimeInfo(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
