import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/api-response';
import { submitHomepageSurvey } from '@/lib/db';
import type { HomepageSurveySubmitDTO } from '@/lib/contracts/homepage-survey';
import { HOMEPAGE_SURVEY_ERROR_CODES } from '@/lib/contracts/homepage-survey';

export const dynamic = 'force-dynamic';

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(req: NextRequest) {
  const ctx = await requireUser(req);
  if (!ctx) {
    return fail(HOMEPAGE_SURVEY_ERROR_CODES.HOMEPAGE_SURVEY_AUTH_REQUIRED, '请先登录后再提交沙龙投票', 401);
  }

  let body: HomepageSurveySubmitDTO;
  try {
    body = (await req.json()) as HomepageSurveySubmitDTO;
  } catch {
    return fail('INVALID_REQUEST_BODY', '请求体格式错误', 400);
  }

  if (!Array.isArray(body.topicIds) || body.topicIds.length === 0) {
    return fail(HOMEPAGE_SURVEY_ERROR_CODES.HOMEPAGE_SURVEY_TOPIC_REQUIRED, '请选择至少一个沙龙课题', 400);
  }
  if (!normalize(body.name)) return fail(HOMEPAGE_SURVEY_ERROR_CODES.HOMEPAGE_SURVEY_NAME_REQUIRED, '姓名不能为空', 400);
  if (!/^1[3-9]\d{9}$/.test(normalize(body.phone))) {
    return fail(HOMEPAGE_SURVEY_ERROR_CODES.HOMEPAGE_SURVEY_PHONE_INVALID, '手机号格式不正确（需为 11 位手机号）', 400);
  }
  if (!normalize(body.company)) return fail(HOMEPAGE_SURVEY_ERROR_CODES.HOMEPAGE_SURVEY_COMPANY_REQUIRED, '公司名称不能为空', 400);
  if (!normalize(body.industry)) return fail(HOMEPAGE_SURVEY_ERROR_CODES.HOMEPAGE_SURVEY_INDUSTRY_REQUIRED, '所属行业不能为空', 400);

  try {
    return ok(await submitHomepageSurvey(ctx.userId, body), 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('duplicate key') || message.includes('unique')) {
      return fail(HOMEPAGE_SURVEY_ERROR_CODES.HOMEPAGE_SURVEY_ALREADY_SUBMITTED, '本轮投票已提交', 409, message);
    }
    if (message.includes('版本已更新')) {
      return fail(HOMEPAGE_SURVEY_ERROR_CODES.HOMEPAGE_SURVEY_VERSION_EXPIRED, message, 409);
    }
    if (message.includes('课题不存在') || message.includes('已下架')) {
      return fail(HOMEPAGE_SURVEY_ERROR_CODES.HOMEPAGE_SURVEY_TOPIC_NOT_FOUND, message, 400);
    }
    return fail('HOMEPAGE_SURVEY_SUBMIT_FAILED', '沙龙投票提交失败', 500, message);
  }
}
