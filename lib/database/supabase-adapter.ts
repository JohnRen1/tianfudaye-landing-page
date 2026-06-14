import { createServiceClient as createSupabaseServiceClient } from '../supabase';
import {
  type AiAnswerBodyDTO,
  type AiChatResponseDTO,
} from '../contracts/ai-chat';
import {
  ASSESSMENT_MODULE_LABEL,
  REPORT_MODULE_LABEL,
  type AssessmentModuleKey,
  type AssessmentReportPublicDTO,
  type AssessmentSubmitDTO,
  type AssessmentSubmitResponseDTO,
  type ModuleScorePublicDTO,
  type QuestionPublicDTO,
  type QuestionType,
  type ReportModuleKey,
  type SaveReportResponseDTO,
  type UnlockReportResponseDTO,
} from '../contracts/assessment';
import type {
  AppointmentCreateDTO,
  AppointmentCreateResponseDTO,
  AppointmentMySummaryDTO,
} from '../contracts/appointment';
import type {
  CurrentUserDTO,
  PhoneLoginResponseDTO,
  SendCodeResponseDTO,
  WechatLoginResponseDTO,
} from '../contracts/auth';
import type {
  MaterialClaimCreateResponseDTO,
} from '../contracts/material';
import type {
  ActivityLandingDetailDTO,
  QrScanTrackResponseDTO,
  TrackingActivityDTO,
} from '../contracts/tracking';
import type { RiskLevel } from '../contracts/shared';

export type DatabaseProvider = 'supabase' | 'cloudbase';

function normalizeProvider(value: string | undefined): DatabaseProvider {
  return value === 'cloudbase' ? 'cloudbase' : 'supabase';
}

export const databaseProvider: DatabaseProvider = normalizeProvider(
  process.env.APP_DATABASE_PROVIDER,
);

function ensureSupabaseProvider(): void {
  if (databaseProvider !== 'supabase') {
    throw new Error('CloudBase PostgreSQL adapter is not implemented for landing-page yet');
  }
}

export function createServiceClient() {
  ensureSupabaseProvider();
  return createSupabaseServiceClient();
}

export async function getCurrentUserById(userId: string): Promise<CurrentUserDTO | null> {
  const serviceClient = createServiceClient();
  const { data: row } = await serviceClient
    .from('users')
    .select('id, phone, name, identity, company, industry, size, registered_at, active_at, is_profile_complete')
    .eq('id', userId)
    .single();

  if (!row) return null;

  return {
    id: row.id as string,
    name: (row.name as string | null) ?? null,
    phone: row.phone as string,
    identity: (row.identity as string | null) ?? null,
    company: (row.company as string | null) ?? null,
    industry: (row.industry as string | null) ?? null,
    size: (row.size as string | null) ?? null,
    registeredAt: row.registered_at as string,
    activeAt: row.active_at as string,
    isProfileComplete: (row.is_profile_complete as boolean) ?? false,
  };
}

const REPORT_MODULE_KEYS: ReportModuleKey[] = [
  'report_invoice',
  'report_fund',
  'report_cost',
  'report_payroll',
  'report_audit',
];

const FIXED_SUGGESTIONS = ['建议咨询专业税务顾问', '定期进行税务自查'];

const MODULE_DESC: Record<ReportModuleKey, string> = {
  report_invoice: '您在发票合规方面存在一定风险，建议进行全面自查。',
  report_fund: '公转私操作需注意合规性，避免资金流水异常。',
  report_cost: '成本费用的归属和票据管理需加强规范。',
  report_payroll: '个税申报及社保缴纳合规性需重点关注。',
  report_audit: '面对税务稽查，建议提前做好风险应对预案。',
};

const MODULE_ADVICE: Record<ReportModuleKey, string> = {
  report_invoice: '建立发票台账，定期核查进销项匹配。',
  report_fund: '规范资金走账流程，保留相关业务凭证。',
  report_cost: '确保成本费用均有合法凭证支撑。',
  report_payroll: '核查社保基数与实际薪资的匹配情况。',
  report_audit: '整理并归档近三年纳税记录和凭证。',
};

function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function parseReportModules(raw: unknown): ModuleScorePublicDTO[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((moduleValue: Record<string, unknown>) => {
    const moduleKey = moduleValue.module_key as ReportModuleKey;
    return {
      moduleKey,
      moduleName:
        (moduleValue.module_name as string | undefined) ??
        REPORT_MODULE_LABEL[moduleKey] ??
        String(moduleKey),
      score: (moduleValue.score as number) ?? 0,
      riskLevel: (moduleValue.risk_level as RiskLevel) ?? 'low',
      desc: (moduleValue.desc as string) ?? '',
      advice: (moduleValue.advice as string) ?? '',
    };
  });
}

function mapAssessmentReport(row: Record<string, unknown>, includeSuggestions: boolean): AssessmentReportPublicDTO {
  const reportUserId = row.user_id as string | null;
  return {
    id: row.id as string,
    isClaimed: reportUserId !== null,
    isUnlocked: Boolean(row.viewed),
    isSaved: Boolean(row.is_saved),
    score: row.score as number,
    riskLevel: row.risk_level as RiskLevel,
    modules: parseReportModules(row.modules),
    completedAt: row.created_at as string,
    ...(includeSuggestions && {
      suggestions: Array.isArray(row.suggestions) ? (row.suggestions as string[]) : [],
    }),
  };
}

export async function listAssessmentQuestions(): Promise<QuestionPublicDTO[]> {
  const serviceClient = createServiceClient();
  const { data: rows, error } = await serviceClient
    .from('assessment_questions')
    .select('id, module_key, type, title, description, sort_order, options')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);

  return (rows ?? []).map((row) => {
    const moduleKey = row.module_key as AssessmentModuleKey;
    const rawOptions = Array.isArray(row.options) ? row.options : [];
    return {
      id: row.id as string,
      moduleKey,
      moduleName: ASSESSMENT_MODULE_LABEL[moduleKey] ?? moduleKey,
      type: row.type as QuestionType,
      title: row.title as string,
      description: (row.description as string | null) ?? '',
      sortOrder: row.sort_order as number,
      options: rawOptions.map((option: Record<string, unknown>) => ({
        sortOrder: option.sort_order as number,
        label: option.label as string,
      })),
    };
  });
}

export async function submitAssessment(
  payload: AssessmentSubmitDTO,
  userId: string | null,
): Promise<AssessmentSubmitResponseDTO> {
  const serviceClient = createServiceClient();
  const questionIds = payload.answers.map((answer) => answer.questionId);
  const { data: questionRows, error: questionError } = await serviceClient
    .from('assessment_questions')
    .select('id, options')
    .in('id', questionIds);

  if (questionError) throw new Error(questionError.message);

  const questionMap = new Map<string, Array<{ sort_order: number; score: number }>>();
  for (const row of questionRows ?? []) {
    const options = Array.isArray(row.options) ? row.options : [];
    questionMap.set(row.id as string, options as Array<{ sort_order: number; score: number }>);
  }

  let totalScore = 0;
  for (const answer of payload.answers) {
    const options = questionMap.get(answer.questionId);
    if (!options) continue;
    for (const index of answer.selectedIndexes) {
      const selected = options.find((option) => option.sort_order === index);
      if (selected && typeof selected.score === 'number') totalScore += selected.score;
    }
  }

  totalScore = Math.min(100, Math.max(0, totalScore));
  const riskLevel = scoreToRiskLevel(totalScore);
  const modules: ModuleScorePublicDTO[] = REPORT_MODULE_KEYS.map((key) => ({
    moduleKey: key,
    moduleName: REPORT_MODULE_LABEL[key],
    score: totalScore,
    riskLevel,
    desc: MODULE_DESC[key],
    advice: MODULE_ADVICE[key],
  }));

  const reportInsert: Record<string, unknown> = {
    score: totalScore,
    risk_level: riskLevel,
    modules: modules.map((moduleValue) => ({
      module_key: moduleValue.moduleKey,
      module_name: moduleValue.moduleName,
      score: moduleValue.score,
      risk_level: moduleValue.riskLevel,
      desc: moduleValue.desc,
      advice: moduleValue.advice,
    })),
    suggestions: FIXED_SUGGESTIONS,
    viewed: false,
    is_saved: false,
  };

  if (userId) reportInsert.user_id = userId;
  if (payload.sourceQrId) reportInsert.source_qr_id = payload.sourceQrId;
  if (payload.sourceActivityId) reportInsert.source_activity_id = payload.sourceActivityId;

  const { data: report, error: reportError } = await serviceClient
    .from('assessment_reports')
    .insert(reportInsert)
    .select('id')
    .single();

  if (reportError || !report) throw new Error(reportError?.message ?? '报告生成失败');

  const reportId = report.id as string;
  const rawAnswerRows = payload.answers.map((answer) => ({
    report_id: reportId,
    question_id: answer.questionId,
    selected_indexes: answer.selectedIndexes,
  }));

  const { error: rawAnswerError } = await serviceClient
    .from('report_raw_answers')
    .insert(rawAnswerRows);

  if (rawAnswerError) {
    console.error('[assessment/submit] raw answers insert failed:', rawAnswerError.message);
  }

  return { reportId, score: totalScore, riskLevel, modules };
}

export async function getAssessmentReportById(reportId: string): Promise<{
  report: AssessmentReportPublicDTO;
  userId: string | null;
} | null> {
  const serviceClient = createServiceClient();
  const { data: row, error } = await serviceClient
    .from('assessment_reports')
    .select('id, user_id, score, risk_level, modules, suggestions, viewed, is_saved, created_at')
    .eq('id', reportId)
    .single();

  if (error || !row) return null;

  const viewed = Boolean(row.viewed);
  return {
    report: mapAssessmentReport(row as Record<string, unknown>, viewed),
    userId: (row.user_id as string | null) ?? null,
  };
}

export async function saveAssessmentReport(reportId: string): Promise<SaveReportResponseDTO> {
  const serviceClient = createServiceClient();
  const savedAt = new Date().toISOString();
  const { error } = await serviceClient
    .from('assessment_reports')
    .update({ is_saved: true })
    .eq('id', reportId);

  if (error) throw new Error(error.message);
  return { saved: true, savedAt };
}

export async function unlockAssessmentReport(
  reportId: string,
  userId: string,
): Promise<UnlockReportResponseDTO | null> {
  const existing = await getAssessmentReportById(reportId);
  if (!existing) return null;

  const serviceClient = createServiceClient();
  const updatePayload: Record<string, unknown> = { viewed: true };
  if (existing.userId === null) updatePayload.user_id = userId;

  const { error } = await serviceClient
    .from('assessment_reports')
    .update(updatePayload)
    .eq('id', reportId);

  if (error) throw new Error(error.message);

  const updated = await getAssessmentReportById(reportId);
  if (!updated) return null;

  return {
    report: {
      ...updated.report,
      isUnlocked: true,
      suggestions: updated.report.suggestions ?? [],
    },
  };
}

export async function getAppointmentUserProfile(userId: string): Promise<{
  phone: string;
  name: string;
} | null> {
  const serviceClient = createServiceClient();
  const { data: row } = await serviceClient
    .from('users')
    .select('phone, name')
    .eq('id', userId)
    .single();

  if (!row) return null;

  return {
    phone: (row.phone as string | null) ?? '',
    name: (row.name as string | null) ?? '',
  };
}

export async function createAppointment(params: {
  userId: string;
  userPhone: string;
  userName: string;
  body: AppointmentCreateDTO & Record<string, unknown>;
}): Promise<AppointmentCreateResponseDTO> {
  const serviceClient = createServiceClient();
  const appointmentInsert: Record<string, unknown> = {
    user_id: params.userId,
    topic: params.body.topic,
    description: params.body.description.trim(),
    phone: params.userPhone,
    name: params.userName,
    status: 'pending',
  };

  if (typeof params.body.company === 'string' && params.body.company.trim()) {
    appointmentInsert.company = params.body.company.trim();
  }
  if (typeof params.body.industry === 'string' && params.body.industry.trim()) {
    appointmentInsert.industry = params.body.industry.trim();
  }
  if (typeof params.body.contactTime === 'string' && params.body.contactTime.trim()) {
    appointmentInsert.contact_time = params.body.contactTime.trim();
  }
  if (typeof params.body.sourceQrId === 'string' && params.body.sourceQrId) {
    appointmentInsert.source_qr_id = params.body.sourceQrId;
  }
  if (typeof params.body.sourceActivityId === 'string' && params.body.sourceActivityId) {
    appointmentInsert.source_activity_id = params.body.sourceActivityId;
  }

  const { data: newAppointment, error } = await serviceClient
    .from('appointments')
    .insert(appointmentInsert)
    .select('id, created_at')
    .single();

  if (error || !newAppointment) throw new Error(error?.message ?? '预约创建失败');

  const appointmentId = newAppointment.id as string;
  let leadId: string | null = null;

  if (typeof params.body.sourceLeadId === 'string' && params.body.sourceLeadId) {
    const { data: specifiedLead } = await serviceClient
      .from('leads')
      .select('id, status')
      .eq('id', params.body.sourceLeadId)
      .eq('user_id', params.userId)
      .single();

    if (specifiedLead) {
      leadId = specifiedLead.id as string;
      await serviceClient.from('leads').update({ status: 'appointed' }).eq('id', leadId);
    }
  }

  if (!leadId) {
    const { data: existingLead } = await serviceClient
      .from('leads')
      .select('id')
      .eq('user_id', params.userId)
      .not('status', 'in', '("converted","invalid")')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingLead) {
      leadId = existingLead.id as string;
      await serviceClient.from('leads').update({ status: 'appointed' }).eq('id', leadId);
    } else {
      const leadInsert: Record<string, unknown> = {
        user_id: params.userId,
        status: 'appointed',
      };
      if (typeof params.body.sourceActivityId === 'string' && params.body.sourceActivityId) {
        leadInsert.source_activity_id = params.body.sourceActivityId;
      }
      if (typeof params.body.sourceQrId === 'string' && params.body.sourceQrId) {
        leadInsert.source_qr_id = params.body.sourceQrId;
      }

      const { data: newLead } = await serviceClient
        .from('leads')
        .insert(leadInsert)
        .select('id')
        .single();

      if (newLead) leadId = newLead.id as string;
    }
  }

  if (leadId) {
    await serviceClient.from('appointments').update({ lead_id: leadId }).eq('id', appointmentId);
    await serviceClient.from('users').update({ lead_status: 'appointed' }).eq('id', params.userId);
  }

  return {
    id: appointmentId,
    leadId,
    status: 'pending',
    createdAt: newAppointment.created_at as string,
  };
}

export async function listUserAppointments(userId: string): Promise<AppointmentMySummaryDTO[]> {
  const serviceClient = createServiceClient();
  const { data: rows, error } = await serviceClient
    .from('appointments')
    .select('id, topic, description, status, advisor_name, scheduled_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (rows ?? []).map((row) => {
    const description = (row.description as string) ?? '';
    return {
      id: row.id as string,
      topic: row.topic as AppointmentMySummaryDTO['topic'],
      descriptionSummary: description.slice(0, 100),
      status: row.status as AppointmentMySummaryDTO['status'],
      advisorName: (row.advisor_name as string | null) ?? null,
      scheduledAt: (row.scheduled_at as string | null) ?? null,
      createdAt: row.created_at as string,
    };
  });
}

export async function createQaRecord(params: {
  userId: string | null;
  sessionId: string;
  activityId: string | null;
  question: string;
  answer: AiAnswerBodyDTO;
}): Promise<AiChatResponseDTO> {
  const serviceClient = createServiceClient();
  const summary = params.question.trim().slice(0, 100);
  const { data: record, error } = await serviceClient
    .from('qa_records')
    .insert({
      user_id: params.userId,
      session_id: params.sessionId,
      activity_id: params.activityId,
      question: params.question.trim(),
      summary,
      ai_answer: params.answer,
      risk_level: params.answer.riskLevel,
      advisor_recommended: params.answer.advisorRecommended,
      needs_confirmation: params.answer.needsConfirmation,
      tags: [],
      type: '税务咨询',
    })
    .select('id')
    .single();

  if (error || !record) throw new Error(error?.message ?? '问答记录保存失败');

  return {
    qaRecordId: record.id as string,
    sessionId: params.sessionId,
    answer: params.answer,
    summary,
    tags: [],
  };
}

export async function claimMaterial(params: {
  userId: string;
  isProfileComplete: boolean;
  materialId: string;
  activityId?: string | null;
}): Promise<MaterialClaimCreateResponseDTO> {
  const serviceClient = createServiceClient();
  const { data: material, error: materialError } = await serviceClient
    .from('materials')
    .select('id, name, status, need_login, need_company_info, storage_key, format')
    .eq('id', params.materialId)
    .single();

  if (materialError || !material) throw new Error('MATERIAL_NOT_FOUND');
  if (material.status !== 'published') throw new Error('MATERIAL_NOT_PUBLISHED');
  if (material.need_company_info && !params.isProfileComplete) {
    throw new Error('CLAIM_COMPANY_INFO_REQUIRED');
  }

  const { data: existing } = await serviceClient
    .from('material_claims')
    .select('id, claimed_at, download_url, url_expires_at')
    .eq('user_id', params.userId)
    .eq('material_id', params.materialId)
    .single();

  if (existing) {
    return {
      claimId: existing.id as string,
      materialId: params.materialId,
      claimedAt: existing.claimed_at as string,
      downloadUrl: (existing.download_url as string | null) ?? '',
      downloadUrlExpiresAt:
        (existing.url_expires_at as string | null) ??
        new Date(Date.now() + 3600_000).toISOString(),
    };
  }

  const signedUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/sign/${material.storage_key}?token=dev-placeholder`;
  const expiresAt = new Date(Date.now() + 3600_000).toISOString();
  const { data: claim, error: claimError } = await serviceClient
    .from('material_claims')
    .insert({
      user_id: params.userId,
      material_id: params.materialId,
      download_url: signedUrl,
      url_expires_at: expiresAt,
      ...(params.activityId ? { activity_id: params.activityId } : {}),
    })
    .select('id, claimed_at')
    .single();

  if (claimError || !claim) throw new Error(claimError?.message ?? '领取失败');

  return {
    claimId: claim.id as string,
    materialId: params.materialId,
    claimedAt: claim.claimed_at as string,
    downloadUrl: signedUrl,
    downloadUrlExpiresAt: expiresAt,
  };
}

function mapTrackingActivity(row: Record<string, unknown>): TrackingActivityDTO {
  const startAt = row.start_at as string;
  const endAt = (row.end_at as string | null) ?? null;
  const timeStart = startAt.slice(11, 16);

  return {
    id: row.id as string,
    name: row.name as string,
    speaker: row.teacher as string,
    speakerTitle: (row.speaker_title as string) ?? '',
    date: startAt.slice(0, 10),
    time: endAt ? `${timeStart} - ${endAt.slice(11, 16)}` : timeStart,
    location: row.place as string,
    description: (row.description as string) ?? '',
    coverImage: (row.cover_image as string | null) ?? null,
    status: row.status as 'published' | 'draft' | 'closed',
  };
}

export async function getActivityLandingDetail(activityId: string): Promise<ActivityLandingDetailDTO | null> {
  const serviceClient = createServiceClient();
  const { data: activity, error } = await serviceClient
    .from('activities')
    .select('id, name, start_at, end_at, place, teacher, speaker_title, description, cover_image, status')
    .eq('id', activityId)
    .eq('status', 'published')
    .single();

  if (error || !activity) return null;
  return mapTrackingActivity(activity as Record<string, unknown>);
}

export async function trackQrScan(params: {
  qrCodeId: string;
  sessionId?: string | null;
  userAgent?: string | null;
}): Promise<QrScanTrackResponseDTO | null> {
  const serviceClient = createServiceClient();
  const { data: qrCode, error } = await serviceClient
    .from('qr_codes')
    .select(`
      id, name, type, status, invite_code, activity_id, advisor_id,
      activities!activity_id(
        id, name, theme, start_at, end_at, place, teacher, speaker_title,
        description, cover_image, status
      )
    `)
    .eq('id', params.qrCodeId)
    .eq('status', 'active')
    .single();

  if (error || !qrCode) return null;

  await serviceClient.from('qr_scan_events').insert({
    qr_code_id: params.qrCodeId,
    user_agent: params.userAgent ?? null,
    session_id: params.sessionId ?? null,
  });

  const { data: currentQr } = await serviceClient
    .from('qr_codes')
    .select('scans')
    .eq('id', params.qrCodeId)
    .single();

  await serviceClient
    .from('qr_codes')
    .update({ scans: ((currentQr?.scans as number | null) ?? 0) + 1 })
    .eq('id', params.qrCodeId);

  if (qrCode.activity_id) {
    await serviceClient
      .from('activities')
      .update({ scan: (qrCode as Record<string, unknown>).scan as number ?? 0 })
      .eq('id', qrCode.activity_id as string);
  }

  let advisorName: string | null = null;
  if (qrCode.advisor_id) {
    const { data: advisor } = await serviceClient
      .from('admin_users')
      .select('display_name')
      .eq('id', qrCode.advisor_id as string)
      .single();
    advisorName = (advisor?.display_name as string | null) ?? null;
  }

  const activityJoin = qrCode.activities as Record<string, unknown>[] | Record<string, unknown> | null;
  const activity = Array.isArray(activityJoin) ? (activityJoin[0] ?? null) : activityJoin;

  return {
    valid: true,
    status: qrCode.status as 'active' | 'paused',
    advisorId: (qrCode.advisor_id as string | null) ?? null,
    advisorName,
    activity: activity ? mapTrackingActivity(activity) : null,
  };
}

declare global {
  // eslint-disable-next-line no-var
  var _devCodeStore: Map<string, { code: string; expiresAt: number }> | undefined;
}

function getDevCodeStore(): Map<string, { code: string; expiresAt: number }> {
  if (!globalThis._devCodeStore) {
    globalThis._devCodeStore = new Map();
  }
  return globalThis._devCodeStore;
}

export function verifyAndConsumeDevCode(phone: string, code: string): boolean {
  const store = getDevCodeStore();
  const stored = store.get(phone);
  const isValid = Boolean(stored && stored.code === code && stored.expiresAt > Date.now());
  if (isValid) store.delete(phone);
  return isValid;
}

export async function sendDevPhoneCode(phone: string): Promise<SendCodeResponseDTO & { _devCode?: string }> {
  const store = getDevCodeStore();
  const existing = store.get(phone);
  if (existing && existing.expiresAt - 240_000 > Date.now()) {
    throw new Error('CODE_SEND_TOO_FREQUENT');
  }

  const serviceClient = createServiceClient();
  const { data: user } = await serviceClient
    .from('users')
    .select('id')
    .eq('phone', phone)
    .single();

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  store.set(phone, { code, expiresAt: Date.now() + 300_000 });

  return {
    expiresInSeconds: 300,
    isRegistered: !!user,
    ...(process.env.NODE_ENV !== 'production' && { _devCode: code }),
  };
}

function mapCurrentUser(row: Record<string, unknown>): CurrentUserDTO {
  return {
    id: row.id as string,
    name: (row.name as string | null) ?? null,
    phone: row.phone as string,
    identity: (row.identity as string | null) ?? null,
    company: (row.company as string | null) ?? null,
    industry: (row.industry as string | null) ?? null,
    size: (row.size as string | null) ?? null,
    registeredAt: row.registered_at as string,
    activeAt: row.active_at as string,
    isProfileComplete: (row.is_profile_complete as boolean) ?? false,
  };
}

export async function loginOrCreateUserByPhone(params: {
  phone: string;
  sourceQrId?: string;
  sourceActivityId?: string;
}): Promise<{ user: CurrentUserDTO; isNew: boolean }> {
  const serviceClient = createServiceClient();
  const userFields = 'id, phone, name, identity, company, industry, size, registered_at, active_at, is_profile_complete';
  const { data: existingUser } = await serviceClient
    .from('users')
    .select(userFields)
    .eq('phone', params.phone)
    .single();

  let userId: string;
  let isNew = false;

  if (existingUser) {
    userId = existingUser.id as string;
    await serviceClient
      .from('users')
      .update({ active_at: new Date().toISOString() })
      .eq('id', userId);
  } else {
    isNew = true;
    const insertData: Record<string, unknown> = {
      phone: params.phone,
      is_profile_complete: false,
    };
    if (params.sourceQrId) insertData.source_qr_id = params.sourceQrId;
    if (params.sourceActivityId) insertData.source_activity_id = params.sourceActivityId;

    const { data: newUser, error } = await serviceClient
      .from('users')
      .insert(insertData)
      .select(userFields)
      .single();

    if (error || !newUser) throw new Error(error?.message ?? '用户创建失败');
    userId = newUser.id as string;
  }

  const { data: userData } = await serviceClient
    .from('users')
    .select(userFields)
    .eq('id', userId)
    .single();

  if (!userData) throw new Error('用户数据获取失败');
  return { user: mapCurrentUser(userData as Record<string, unknown>), isNew };
}

export function buildPhoneLoginResponse(params: {
  user: CurrentUserDTO;
  isNew: boolean;
  accessToken: string;
}): PhoneLoginResponseDTO {
  return {
    accessToken: params.accessToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    user: params.user,
    isNew: params.isNew,
  };
}

export async function getUserByWechatOpenId(openid: string): Promise<CurrentUserDTO | null> {
  const serviceClient = createServiceClient();
  const { data: row } = await serviceClient
    .from('users')
    .select('id, phone, name, identity, company, industry, size, registered_at, active_at, is_profile_complete')
    .eq('openid', openid)
    .single();

  if (!row) return null;
  return mapCurrentUser(row as Record<string, unknown>);
}

export function buildWechatLoginResponse(params: {
  user: CurrentUserDTO;
  isNew: boolean;
  accessToken: string;
}): WechatLoginResponseDTO {
  return {
    accessToken: params.accessToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    user: params.user,
    isNew: params.isNew,
  };
}
