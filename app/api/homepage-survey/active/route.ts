import { NextRequest } from 'next/server';
import { optionalUser } from '@/lib/auth';
import { fail, ok } from '@/lib/api-response';
import { getHomepageSurveyActive } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ctx = await optionalUser(req);

  try {
    const config = await getHomepageSurveyActive(ctx?.userId);
    if (!config) return fail('HOMEPAGE_SURVEY_NOT_FOUND', '沙龙投票问卷不存在', 404);
    return ok(config);
  } catch (error) {
    return fail('HOMEPAGE_SURVEY_ACTIVE_QUERY_FAILED', '沙龙投票问卷查询失败', 500, error instanceof Error ? error.message : error);
  }
}
