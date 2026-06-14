import { NextRequest } from 'next/server';
import { createAppointment, getAppointmentUserProfile } from '@/lib/db';
import { ok, fail } from '@/lib/api-response';
import { requireUser } from '@/lib/auth';
import type { AppointmentCreateDTO } from '@/lib/contracts/appointment';
import { APPOINTMENT_ERROR_CODES } from '@/lib/contracts/appointment';

export const dynamic = 'force-dynamic';

const VALID_TOPICS = new Set([
  'tax_risk_check',
  'invoice_compliance',
  'public_to_private_risk',
  'corporate_income_tax',
  'individual_tax_social',
  'tax_audit_response',
  'company_structure',
  'other',
]);

export async function POST(req: NextRequest) {
  // 认证：端用户必须登录
  const ctx = await requireUser(req);
  if (!ctx) {
    return fail(
      APPOINTMENT_ERROR_CODES.APPOINTMENT_AUTH_REQUIRED,
      '请先登录后再预约顾问',
      401,
    );
  }
  const { userId, user } = ctx;

  // 解析请求体
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('INVALID_REQUEST_BODY', '请求体格式错误', 400);
  }

  const {
    topic,
    description,
    company,
    industry,
    contactTime,
    sourceQrId,
    sourceActivityId,
    sourceLeadId,
  } = body as AppointmentCreateDTO & Record<string, unknown>;

  // 验证 topic
  if (typeof topic !== 'string' || !VALID_TOPICS.has(topic)) {
    return fail(
      APPOINTMENT_ERROR_CODES.APPOINTMENT_TOPIC_INVALID,
      '咨询主题值无效',
      400,
    );
  }

  // 验证 description
  if (typeof description !== 'string' || description.trim().length === 0) {
    return fail('APPOINTMENT_DESCRIPTION_REQUIRED', '问题描述不能为空', 400);
  }

  // 从 users 表读取 phone 和 name（以服务端数据为准）
  const userRow = await getAppointmentUserProfile(userId);
  if (!userRow) {
    return fail('USER_NOT_FOUND', '用户不存在', 404);
  }

  try {
    const appointmentBody: AppointmentCreateDTO & Record<string, unknown> = {
      name: userRow.name,
      phone: userRow.phone || user.phone,
      topic,
      description,
      company,
      industry,
      contactTime,
      sourceQrId,
      sourceActivityId,
      sourceLeadId,
    };

    const response = await createAppointment({
      userId,
      userPhone: userRow.phone || user.phone,
      userName: userRow.name,
      body: appointmentBody,
    });
    return ok(response, 201);
  } catch (error) {
    return fail('APPOINTMENT_CREATE_FAILED', '预约创建失败', 500, error instanceof Error ? error.message : error);
  }
}
