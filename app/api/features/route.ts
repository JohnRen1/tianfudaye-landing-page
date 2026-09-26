import { ok } from '@/lib/api-response';
import { getMiniProgramFeatureConfig } from '@/lib/features';

export const dynamic = 'force-dynamic';

export async function GET() {
  const response = ok(getMiniProgramFeatureConfig());
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}
