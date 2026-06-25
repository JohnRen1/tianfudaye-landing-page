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

function logAppointmentApi(message: string, data?: unknown): void {
  if (process.env.NODE_ENV === 'production') return;
  console.log(`[appointments/api] ${message}`, data ?? '');
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(req: NextRequest) {
  // 认证：端用户必须登录
  const ctx = await requireUser(req);
  logAppointmentApi('auth resolved', {
    hasUser: Boolean(ctx),
    userId: ctx?.userId ?? null,
    userPhone: ctx?.user.phone ?? null,
  });
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
    logAppointmentApi('invalid request body');
    return fail('INVALID_REQUEST_BODY', '请求体格式错误', 400);
  }

  const {
    name,
    phone,
    topic,
    description,
    company,
    industry,
    contactTime,
    sourceQrId,
    sourceActivityId,
    sourceLeadId,
  } = body as AppointmentCreateDTO & Record<string, unknown>;
  logAppointmentApi('request parsed', {
    topic,
    hasDescription: typeof description === 'string' && description.trim().length > 0,
    name,
    phone,
    company,
    industry,
    contactTime,
    sourceQrId,
    sourceActivityId,
    sourceLeadId,
  });

  // 验证 topic
  if (typeof topic !== 'string' || !VALID_TOPICS.has(topic)) {
    logAppointmentApi('invalid topic', { topic });
    return fail(
      APPOINTMENT_ERROR_CODES.APPOINTMENT_TOPIC_INVALID,
      '咨询主题值无效',
      400,
    );
  }

  // 验证 description
  if (typeof description !== 'string' || description.trim().length === 0) {
    logAppointmentApi('invalid description', { description });
    return fail('APPOINTMENT_DESCRIPTION_REQUIRED', '问题描述不能为空', 400);
  }

  // 从 users 表读取 phone 和 name（以服务端数据为准）
  const userRow = await getAppointmentUserProfile(userId);
  if (!userRow) {
    logAppointmentApi('user profile not found', { userId });
    return fail('USER_NOT_FOUND', '用户不存在', 404);
  }

  const submittedName = normalizeString(name);
  const submittedPhone = normalizeString(phone);
  const submittedCompany = normalizeString(company);
  const submittedIndustry = normalizeString(industry);
  const submittedContactTime = normalizeString(contactTime);
  const snapshotName = submittedName || normalizeString(userRow.name) || normalizeString(user.name);
  const snapshotPhone = submittedPhone || normalizeString(userRow.phone) || normalizeString(user.phone);

  if (!snapshotName) {
    logAppointmentApi('invalid name', { submittedName, userName: userRow.name });
    return fail('APPOINTMENT_NAME_REQUIRED', '姓名不能为空', 400);
  }

  if (!/^1\d{10}$/.test(snapshotPhone)) {
    logAppointmentApi('invalid phone', { submittedPhone, userPhone: userRow.phone });
    return fail(APPOINTMENT_ERROR_CODES.APPOINTMENT_PHONE_INVALID, '手机号格式不正确', 400);
  }

  if (!submittedCompany) {
    logAppointmentApi('invalid company', { company });
    return fail('APPOINTMENT_COMPANY_REQUIRED', '企业名称不能为空', 400);
  }

  if (!submittedIndustry) {
    logAppointmentApi('invalid industry', { industry });
    return fail('APPOINTMENT_INDUSTRY_REQUIRED', '所属行业不能为空', 400);
  }

  if (!submittedContactTime) {
    logAppointmentApi('invalid contact time', { contactTime });
    return fail('APPOINTMENT_CONTACT_TIME_REQUIRED', '方便联系时间不能为空', 400);
  }

  try {
    const appointmentBody: AppointmentCreateDTO & Record<string, unknown> = {
      name: snapshotName,
      phone: snapshotPhone,
      topic,
      description,
      company: submittedCompany,
      industry: submittedIndustry,
      contactTime: submittedContactTime,
      sourceQrId,
      sourceActivityId,
      sourceLeadId,
    };
    logAppointmentApi('create start', {
      userId,
      appointmentBody,
      userProfile: userRow,
    });

    const response = await createAppointment({
      userId,
      userPhone: snapshotPhone,
      userName: snapshotName,
      body: appointmentBody,
    });
    logAppointmentApi('create success', response);
    return ok(response, 201);
  } catch (error) {
    logAppointmentApi('create failed', {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return fail('APPOINTMENT_CREATE_FAILED', '预约创建失败', 500, error instanceof Error ? error.message : error);
  }
}
