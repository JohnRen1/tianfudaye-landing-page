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
  UserProfileCompleteDTO,
  UserProfileCompletedResponseDTO,
  WechatLoginResponseDTO,
} from '../contracts/auth';
import type {
  MaterialClaimCreateResponseDTO,
  MaterialLandingItemDTO,
  MaterialLandingQueryDTO,
} from '../contracts/material';
import type {
  ActivityLandingDetailDTO,
  QrScanTrackResponseDTO,
  TrackingActivityDTO,
} from '../contracts/tracking';
import type {
  ActivityMaterialDisplayDTO,
} from '../contracts/activity';
import { formatShanghaiDate, formatShanghaiTime } from '../activity-time';
import type { PaginatedData, RiskLevel } from '../contracts/shared';

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

const ACTIVITY_COUNTER_COLUMNS = new Set([
  'register',
  'ai_questions',
  'assessments',
  'material_claims',
  'appointments',
  'scan',
  'high_intent_leads',
  'checkin_count',
] as const);

type ActivityCounterColumn = typeof ACTIVITY_COUNTER_COLUMNS extends Set<infer T> ? T : never;

async function incrementActivityCounter(
  client: ReturnType<typeof createSupabaseServiceClient>,
  activityId: string,
  column: ActivityCounterColumn,
): Promise<void> {
  if (!ACTIVITY_COUNTER_COLUMNS.has(column)) return;
  const { error } = await client.rpc('increment_activity_counter', {
    p_activity_id: activityId,
    p_column: column,
  });
  if (error) {
    console.error(`[activity-counter] increment ${column} failed for activity ${activityId}:`, error.message ?? error);
  }
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

const MODULE_TO_REPORT: Record<AssessmentModuleKey, ReportModuleKey> = {
  company_basic: 'report_cost',
  invoice_compliance: 'report_invoice',
  fund_transfer: 'report_fund',
  income_tax: 'report_cost',
  vat: 'report_invoice',
  payroll_insurance: 'report_payroll',
  cost_expense: 'report_cost',
  tax_audit: 'report_audit',
};

const MODULE_COPY: Record<ReportModuleKey, Record<RiskLevel, { desc: string; advice: string }>> = {
  report_invoice: {
    low: {
      desc: '发票开具、取得和抵扣流程整体较规范。',
      advice: '继续维护发票台账，定期核查进销项匹配。',
    },
    medium: {
      desc: '发票合规存在局部薄弱点，需要加强日常复核。',
      advice: '建议补齐合同、物流、验收等业务证明，减少票据与业务不一致。',
    },
    high: {
      desc: '发票合规风险较高，可能影响增值税抵扣和所得税扣除。',
      advice: '建议开展发票专项自查，优先处理异常发票和业务不匹配记录。',
    },
    critical: {
      desc: '发票合规存在严重风险，需尽快进行专项诊断。',
      advice: '建议暂停高风险票据处理，整理完整证据链并预约顾问介入。',
    },
  },
  report_fund: {
    low: {
      desc: '企业资金往来较清晰，公私账户边界较明确。',
      advice: '继续保持资金审批和凭证留存制度。',
    },
    medium: {
      desc: '存在一定公转私或往来款管理风险。',
      advice: '建议清理备用金、股东借款和个人代收代付记录。',
    },
    high: {
      desc: '公转私和资金混同风险较高，可能引发税务关注。',
      advice: '建议规范收付款账户，补齐合同、借款协议和业务说明。',
    },
    critical: {
      desc: '资金往来存在严重异常，可能形成重点稽查线索。',
      advice: '建议立即梳理近两年资金流水，制定整改和解释口径。',
    },
  },
  report_cost: {
    low: {
      desc: '成本费用扣除和企业所得税管理整体较稳定。',
      advice: '继续保持费用审批、凭证归档和税前扣除复核。',
    },
    medium: {
      desc: '成本费用和所得税管理存在局部资料缺口。',
      advice: '建议补充费用审批、验收、成果证明等辅助材料。',
    },
    high: {
      desc: '成本费用税前扣除风险较高，可能导致纳税调整。',
      advice: '建议对大额费用、无票支出和长期低利润情况开展复核。',
    },
    critical: {
      desc: '成本费用和所得税风险严重，需尽快处理历史问题。',
      advice: '建议建立整改清单，优先处理无票成本、替票入账和异常费用。',
    },
  },
  report_payroll: {
    low: {
      desc: '个税申报和社保缴纳匹配度较好。',
      advice: '继续定期核查工资表、个税申报和社保基数。',
    },
    medium: {
      desc: '个税社保存在一定匹配差异。',
      advice: '建议复核薪资结构、劳务用工和社保缴纳基数。',
    },
    high: {
      desc: '个税社保风险较高，可能涉及补缴或纳税调整。',
      advice: '建议梳理员工薪资发放方式，减少私户发放和不合规拆分。',
    },
    critical: {
      desc: '个税社保存在严重异常，需优先整改。',
      advice: '建议对历史工资、个税和社保数据进行专项核对。',
    },
  },
  report_audit: {
    low: {
      desc: '税务资料归档和稽查应对基础较好。',
      advice: '继续维护合同、发票、流水和申报资料归档。',
    },
    medium: {
      desc: '稽查应对资料存在分散或不完整情况。',
      advice: '建议建立资料目录，确保关键资料可快速调取。',
    },
    high: {
      desc: '税务异常信号较明显，稽查应对风险较高。',
      advice: '建议提前准备风险说明和备查资料，必要时开展自查。',
    },
  },
};

function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 65) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function normalizeRiskLevel(value: unknown): RiskLevel {
  if (value === 'critical') return 'high';
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return 'low';
}

function buildSuggestions(modules: ModuleScorePublicDTO[], totalRiskLevel: RiskLevel): string[] {
  const riskyModules = [...modules]
    .filter((moduleValue) => moduleValue.riskLevel === 'high')
    .sort((a, b) => b.score - a.score);

  const suggestions = riskyModules.slice(0, 3).map((moduleValue) => `${moduleValue.moduleName}：${moduleValue.advice}`);

  if (totalRiskLevel === 'high') {
    suggestions.unshift('建议优先预约专业税务顾问，对高风险事项进行专项诊断。');
  }

  if (suggestions.length === 0) {
    suggestions.push('建议保持季度税务自查，持续维护合同、发票、流水和申报资料。');
  }

  return suggestions;
}

function logAssessmentDb(message: string, data?: unknown): void {
  if (process.env.NODE_ENV === 'production') return;
  console.log(`[assessment/db] ${message}`, data ?? '');
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
      riskLevel: normalizeRiskLevel(moduleValue.risk_level),
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
    riskLevel: normalizeRiskLevel(row.risk_level),
    modules: parseReportModules(row.modules),
    completedAt: (row.completed_at as string | undefined) ?? (row.created_at as string),
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
  logAssessmentDb('question lookup start', {
    userId,
    questionIds,
    answersCount: payload.answers.length,
  });
  const { data: questionRows, error: questionError } = await serviceClient
    .from('assessment_questions')
    .select('id, module_key, options')
    .in('id', questionIds);

  if (questionError) {
    logAssessmentDb('question lookup failed', questionError);
    throw new Error(questionError.message);
  }

  logAssessmentDb('question lookup success', {
    requested: questionIds.length,
    found: questionRows?.length ?? 0,
    missingQuestionIds: questionIds.filter(
      (questionId) => !(questionRows ?? []).some((row) => row.id === questionId),
    ),
    sampleQuestion: questionRows?.[0] ?? null,
  });

  const questionMap = new Map<string, {
    reportModuleKey: ReportModuleKey;
    options: Array<{ sort_order: number; score: number }>;
    maxScore: number;
  }>();
  for (const row of questionRows ?? []) {
    const options = Array.isArray(row.options) ? row.options : [];
    const typedOptions = options as Array<{ sort_order: number; score: number }>;
    const moduleKey = row.module_key as AssessmentModuleKey;
    questionMap.set(row.id as string, {
      reportModuleKey: MODULE_TO_REPORT[moduleKey] ?? 'report_cost',
      options: typedOptions,
      maxScore: typedOptions.reduce((max, option) => Math.max(max, Number(option.score ?? 0)), 0),
    });
  }
  logAssessmentDb('question map built', {
    size: questionMap.size,
    modules: Array.from(questionMap.entries()).map(([questionId, question]) => ({
      questionId,
      reportModuleKey: question.reportModuleKey,
      optionsCount: question.options.length,
      maxScore: question.maxScore,
    })),
  });

  const moduleScores = new Map<ReportModuleKey, { score: number; maxScore: number }>();
  for (const key of REPORT_MODULE_KEYS) {
    moduleScores.set(key, { score: 0, maxScore: 0 });
  }

  for (const answer of payload.answers) {
    const question = questionMap.get(answer.questionId);
    if (!question) continue;
    const currentModule = moduleScores.get(question.reportModuleKey) ?? { score: 0, maxScore: 0 };
    currentModule.maxScore += question.maxScore;
    for (const index of answer.selectedIndexes) {
      const selected = question.options.find((option) => option.sort_order === index);
      if (selected && typeof selected.score === 'number') currentModule.score += selected.score;
    }
    moduleScores.set(question.reportModuleKey, currentModule);
  }

  const modules: ModuleScorePublicDTO[] = REPORT_MODULE_KEYS.map((key) => {
    const moduleValue = moduleScores.get(key) ?? { score: 0, maxScore: 0 };
    const score = moduleValue.maxScore > 0
      ? Math.round((moduleValue.score / moduleValue.maxScore) * 100)
      : 0;
    const riskLevel = scoreToRiskLevel(score);
    const copy = MODULE_COPY[key][riskLevel];
    return {
      moduleKey: key,
      moduleName: REPORT_MODULE_LABEL[key],
      score: Math.min(100, Math.max(0, score)),
      riskLevel,
      desc: copy.desc,
      advice: copy.advice,
    };
  });

  const activeModules = modules.filter((moduleValue) => {
    const score = moduleScores.get(moduleValue.moduleKey);
    return score && score.maxScore > 0;
  });
  const totalScore = activeModules.length > 0
    ? Math.round(activeModules.reduce((sum, moduleValue) => sum + moduleValue.score, 0) / activeModules.length)
    : 0;
  const riskLevel = scoreToRiskLevel(totalScore);
  const suggestions = buildSuggestions(modules, riskLevel);
  logAssessmentDb('score calculated', {
    totalScore,
    riskLevel,
    modules,
    suggestions,
  });

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
    suggestions,
    viewed: false,
    is_saved: false,
  };

  if (userId) reportInsert.user_id = userId;
  if (payload.sourceQrId) reportInsert.source_qr_id = payload.sourceQrId;
  if (payload.sourceActivityId) reportInsert.source_activity_id = payload.sourceActivityId;
  logAssessmentDb('report insert payload', reportInsert);

  const { data: report, error: reportError } = await serviceClient
    .from('assessment_reports')
    .insert(reportInsert)
    .select('id')
    .single();

  if (reportError || !report) {
    logAssessmentDb('report insert failed', reportError);
    throw new Error(reportError?.message ?? '报告生成失败');
  }

  const reportId = report.id as string;
  logAssessmentDb('report insert success', { reportId });
  const rawAnswerRows = payload.answers.map((answer) => ({
    report_id: reportId,
    question_id: answer.questionId,
    selected_indexes: answer.selectedIndexes,
  }));
  logAssessmentDb('raw answers insert payload', {
    count: rawAnswerRows.length,
    sample: rawAnswerRows[0] ?? null,
  });

  const { error: rawAnswerError } = await serviceClient
    .from('report_raw_answers')
    .insert(rawAnswerRows);

  if (rawAnswerError) {
    console.error('[assessment/db] raw answers insert failed', rawAnswerError);
  }

  if (payload.sourceActivityId) {
    await incrementActivityCounter(serviceClient, payload.sourceActivityId, 'assessments');
  }

  return { reportId, score: totalScore, riskLevel, modules };
}

export async function getAssessmentReportById(reportId: string): Promise<{
  report: AssessmentReportPublicDTO;
  userId: string | null;
} | null> {
  const serviceClient = createServiceClient();
  logAssessmentDb('report lookup start', { reportId });
  const { data: row, error } = await serviceClient
    .from('assessment_reports')
    .select('id, user_id, score, risk_level, modules, suggestions, viewed, is_saved, completed_at')
    .eq('id', reportId)
    .maybeSingle();

  if (error) {
    logAssessmentDb('report lookup failed', {
      reportId,
      error,
    });
    throw new Error(error.message);
  }

  if (!row) {
    logAssessmentDb('report lookup not found', { reportId });
    return null;
  }

  logAssessmentDb('report lookup success', {
    reportId,
    userId: row.user_id,
    score: row.score,
    riskLevel: row.risk_level,
  });

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
  logAssessmentDb('appointment create start', {
    userId: params.userId,
    userPhone: params.userPhone,
    userName: params.userName,
    body: params.body,
  });
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
  if (typeof params.body.wechat === 'string' && params.body.wechat.trim()) {
    appointmentInsert.wechat = params.body.wechat.trim();
  }
  if (typeof params.body.uploadIntent === 'string' && params.body.uploadIntent.trim()) {
    appointmentInsert.upload_intent = params.body.uploadIntent.trim();
  }
  appointmentInsert.appointment_type = (typeof params.body.appointmentType === 'string' && params.body.appointmentType)
    ? params.body.appointmentType
    : 'consult';
  if (typeof params.body.sourceQrId === 'string' && params.body.sourceQrId) {
    appointmentInsert.source_qr_id = params.body.sourceQrId;
  }
  if (typeof params.body.sourceActivityId === 'string' && params.body.sourceActivityId) {
    appointmentInsert.source_activity_id = params.body.sourceActivityId;
  }
  if (typeof params.body.sourceLeadId === 'string' && params.body.sourceLeadId) {
    appointmentInsert.source_lead_id = params.body.sourceLeadId;
  }
  logAssessmentDb('appointment insert payload', appointmentInsert);

  const { data: newAppointment, error } = await serviceClient
    .from('appointments')
    .insert(appointmentInsert)
    .select('id, created_at')
    .single();

  if (error || !newAppointment) {
    logAssessmentDb('appointment insert failed', error);
    throw new Error(error?.message ?? '预约创建失败');
  }

  const appointmentId = newAppointment.id as string;
  logAssessmentDb('appointment insert success', { appointmentId });

  await serviceClient
    .from('users')
    .update({
      name: params.userName,
      company: typeof params.body.company === 'string' ? params.body.company.trim() : null,
      industry: typeof params.body.industry === 'string' ? params.body.industry.trim() : null,
      active_at: new Date().toISOString(),
    })
    .eq('id', params.userId);

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
      logAssessmentDb('appointment source lead linked', { appointmentId, leadId });
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
      logAssessmentDb('appointment existing lead linked', { appointmentId, leadId });
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
      logAssessmentDb('appointment new lead created', { appointmentId, leadId, leadInsert });
    }
  }

  if (leadId) {
    await serviceClient.from('appointments').update({ lead_id: leadId }).eq('id', appointmentId);
    await serviceClient.from('users').update({ lead_status: 'appointed' }).eq('id', params.userId);
    logAssessmentDb('appointment lead status synced', { appointmentId, leadId, userId: params.userId });
  }

  const apptActivityId = typeof params.body.sourceActivityId === 'string' && params.body.sourceActivityId
    ? params.body.sourceActivityId
    : null;
  if (apptActivityId) {
    await incrementActivityCounter(serviceClient, apptActivityId, 'appointments');
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
  logAssessmentDb('appointments list start', { userId });
  const { data: rows, error } = await serviceClient
    .from('appointments')
    .select('id, topic, description, status, scheduled_at, created_at, appointment_type, advisor_id, admin_users!advisor_id(display_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logAssessmentDb('appointments list failed', { userId, error });
    throw new Error(error.message);
  }

  logAssessmentDb('appointments list success', {
    userId,
    count: rows?.length ?? 0,
  });

  return (rows ?? []).map((row) => {
    const description = (row.description as string) ?? '';
    const advisorJoin = (row as Record<string, unknown>).admin_users as
      | { display_name: string }[]
      | { display_name: string }
      | null;
    let advisorName: string | null = null;
    if (Array.isArray(advisorJoin)) {
      advisorName = advisorJoin[0]?.display_name ?? null;
    } else if (advisorJoin && typeof advisorJoin === 'object') {
      advisorName = (advisorJoin as { display_name: string }).display_name ?? null;
    }
    return {
      id: row.id as string,
      appointmentType: ((row.appointment_type as string | null) ?? 'consult') as AppointmentMySummaryDTO['appointmentType'],
      topic: row.topic as AppointmentMySummaryDTO['topic'],
      descriptionSummary: description.slice(0, 100),
      status: row.status as AppointmentMySummaryDTO['status'],
      advisorName,
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

  if (params.activityId) {
    await incrementActivityCounter(serviceClient, params.activityId, 'ai_questions');
  }

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

  const storageKey = material.storage_key as string | null;
  if (!storageKey) throw new Error('MATERIAL_NOT_FOUND');

  const expiresInSeconds = 3600;
  const storageRelativeKey = storageKey.replace(/^materials\//, '');

  const generateSignedUrl = async (): Promise<{ url: string; expiresAt: string }> => {
    const { data: signed, error: signError } = await serviceClient
      .storage
      .from('materials')
      .createSignedUrl(storageRelativeKey, expiresInSeconds);
    if (signError || !signed?.signedUrl) {
      throw new Error(`生成下载链接失败：${signError?.message ?? '未知错误'}`);
    }
    return {
      url: signed.signedUrl,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    };
  };

  if (existing) {
    const urlExpiresAt = existing.url_expires_at as string | null;
    const isExpired = !urlExpiresAt || new Date(urlExpiresAt) <= new Date(Date.now() + 300_000);
    if (isExpired) {
      const { url, expiresAt } = await generateSignedUrl();
      await serviceClient
        .from('material_claims')
        .update({ download_url: url, url_expires_at: expiresAt, downloaded_at: new Date().toISOString() })
        .eq('id', existing.id as string)
        .is('downloaded_at', null);
      return {
        claimId: existing.id as string,
        materialId: params.materialId,
        claimedAt: existing.claimed_at as string,
        downloadUrl: url,
        downloadUrlExpiresAt: expiresAt,
      };
    }
    await serviceClient
      .from('material_claims')
      .update({ downloaded_at: new Date().toISOString() })
      .eq('id', existing.id as string)
      .is('downloaded_at', null);
    return {
      claimId: existing.id as string,
      materialId: params.materialId,
      claimedAt: existing.claimed_at as string,
      downloadUrl: (existing.download_url as string | null) ?? '',
      downloadUrlExpiresAt: urlExpiresAt,
    };
  }

  const { url: signedUrl, expiresAt } = await generateSignedUrl();
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

  await serviceClient
    .from('material_claims')
    .update({ downloaded_at: new Date().toISOString() })
    .eq('id', claim.id as string)
    .is('downloaded_at', null);

  if (params.activityId) {
    await incrementActivityCounter(serviceClient, params.activityId, 'material_claims');
  }

  return {
    claimId: claim.id as string,
    materialId: params.materialId,
    claimedAt: claim.claimed_at as string,
    downloadUrl: signedUrl,
    downloadUrlExpiresAt: expiresAt,
  };
}

export async function listLandingMaterials(params: {
  query: MaterialLandingQueryDTO;
  userId?: string | null;
  isProfileComplete?: boolean;
}): Promise<PaginatedData<MaterialLandingItemDTO>> {
  const serviceClient = createServiceClient();
  const page = Math.max(1, Number(params.query.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(params.query.pageSize ?? 20)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = serviceClient
    .from('materials')
    .select(
      'id, name, type, sub_type, format, storage_key, description, downloads, need_login, need_company_info, file_size_bytes',
      { count: 'exact' },
    )
    .eq('status', 'published')
    .not('storage_key', 'like', 'seed/%')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (params.query.category) query = query.eq('type', params.query.category);
  query = query.is('activity_id', null);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Record<string, unknown>[];
  const materialIds = rows.map((row) => row.id as string);
  const claimedIds = new Set<string>();

  if (params.userId && materialIds.length > 0) {
    const { data: claims, error: claimsError } = await serviceClient
      .from('material_claims')
      .select('material_id')
      .eq('user_id', params.userId)
      .in('material_id', materialIds);

    if (claimsError) throw new Error(claimsError.message);
    for (const claim of (claims ?? []) as Record<string, unknown>[]) {
      if (typeof claim.material_id === 'string') claimedIds.add(claim.material_id);
    }
  }

  const items: MaterialLandingItemDTO[] = rows.map((row) => {
    const id = row.id as string;
    const needLogin = Boolean(row.need_login);
    const needCompanyInfo = Boolean(row.need_company_info);
    const claimStatus = claimedIds.has(id)
      ? 'claimed'
      : needCompanyInfo && !params.isProfileComplete
        ? 'needs_company_info'
        : needLogin && !params.userId
          ? 'needs_login'
          : 'available';

    return {
      id,
      name: row.name as string,
      subType: (row.sub_type as string | null) ?? null,
      category: row.type as MaterialLandingItemDTO['category'],
      format: row.format as MaterialLandingItemDTO['format'],
      description: (row.description as string | null) ?? null,
      downloads: Number(row.downloads ?? 0),
      needCompanyInfo,
      claimStatus,
      fileSizeBytes: row.file_size_bytes === null ? null : Number(row.file_size_bytes ?? 0),
    };
  });

  return {
    items,
    pagination: {
      page,
      pageSize,
      total: count ?? items.length,
      totalPages: Math.max(1, Math.ceil((count ?? items.length) / pageSize)),
    },
  };
}

function formatFileSize(bytes: unknown): string | null {
  const size = typeof bytes === 'number' ? bytes : Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return null;
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

const FILE_FORMAT_LABEL: Record<string, string> = {
  pdf: 'PDF',
  xlsx: 'Excel',
  pptx: 'PPT',
  docx: 'Word',
};

async function listActivityLandingMaterials(
  activityId: string,
  userId?: string | null,
  isProfileComplete = false,
): Promise<ActivityMaterialDisplayDTO[]> {
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from('activity_materials')
    .select(`
      material_id,
      materials!material_id(
        id, name, format, file_size_bytes, need_login, need_company_info, status
      )
    `)
    .eq('activity_id', activityId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  const materialRows = ((data ?? []) as Record<string, unknown>[])
    .map((row) => {
      const join = row.materials as Record<string, unknown>[] | Record<string, unknown> | null;
      const material = Array.isArray(join) ? (join[0] ?? null) : join;
      if (!material || material.status !== 'published') return null;
      return material;
    })
    .filter((material): material is Record<string, unknown> => material !== null);

  const claimedIds = new Set<string>();
  if (userId && materialRows.length > 0) {
    const materialIds = materialRows.map((material) => material.id as string);
    const { data: claims, error: claimsError } = await serviceClient
      .from('material_claims')
      .select('material_id')
      .eq('user_id', userId)
      .in('material_id', materialIds);

    if (claimsError) throw new Error(claimsError.message);
    for (const claim of (claims ?? []) as Record<string, unknown>[]) {
      if (typeof claim.material_id === 'string') claimedIds.add(claim.material_id);
    }
  }

  return materialRows
    .map((material) => {
      const needLogin = Boolean(material.need_login);
      const needCompanyInfo = Boolean(material.need_company_info);
      const id = material.id as string;
      const format = String(material.format ?? 'pdf');
      const claimStatus = claimedIds.has(id)
        ? 'claimed'
        : needCompanyInfo && !isProfileComplete
          ? 'needs_company_info'
          : needLogin && !userId
            ? 'needs_login'
            : 'available';

      return {
        id,
        title: material.name as string,
        format: FILE_FORMAT_LABEL[format] ?? format.toUpperCase(),
        fileSize: formatFileSize(material.file_size_bytes),
        needLogin,
        needCompanyInfo,
        claimStatus,
      };
    })
    .filter((item): item is ActivityMaterialDisplayDTO => item !== null);
}

function mapTrackingActivity(
  row: Record<string, unknown>,
  materials: ActivityMaterialDisplayDTO[] = [],
  checkinWindowStatus?: TrackingActivityDTO['checkinWindowStatus'],
  checkinQrId?: string | null,
  alreadyCheckedIn?: boolean,
): TrackingActivityDTO {
  const startAt = row.start_at as string;
  const endAt = (row.end_at as string | null) ?? null;
  const timeStart = formatShanghaiTime(startAt);

  return {
    id: row.id as string,
    name: row.name as string,
    speaker: row.teacher as string,
    speakerTitle: (row.speaker_title as string) ?? '',
    date: formatShanghaiDate(startAt),
    time: endAt ? `${timeStart} - ${formatShanghaiTime(endAt)}` : timeStart,
    location: row.place as string,
    description: (row.description as string) ?? '',
    coverImage: (row.cover_image as string | null) ?? null,
    status: row.status as 'published' | 'draft' | 'closed',
    ...(checkinWindowStatus !== undefined && { checkinWindowStatus }),
    ...(checkinQrId !== undefined && { checkinQrId }),
    ...(alreadyCheckedIn !== undefined && { alreadyCheckedIn }),
    materials,
  };
}

export async function getActivityLandingDetail(
  activityId: string,
  userId?: string | null,
  isProfileComplete = false,
): Promise<ActivityLandingDetailDTO | null> {
  const serviceClient = createServiceClient();
  const { data: activity, error } = await serviceClient
    .from('activities')
    .select('id, name, start_at, end_at, place, teacher, speaker_title, description, cover_image, status')
    .eq('id', activityId)
    .single();

  if (error || !activity) return null;
  const activityStatus = activity.status as 'published' | 'draft' | 'closed';
  const materials = activityStatus === 'published'
    ? await listActivityLandingMaterials(activityId, userId, isProfileComplete)
    : [];

  // 查签到窗口状态和活动二维码（仅 published 活动需要）
  let checkinWindowStatus: TrackingActivityDTO['checkinWindowStatus'] | undefined;
  let checkinQrId: string | null | undefined;
  let alreadyCheckedIn: boolean | undefined;
  if (activityStatus === 'published') {
    const [windowRes, qrRes, checkinRes] = await Promise.all([
      serviceClient.rpc('get_checkin_window_status', { p_activity_id: activityId }),
      serviceClient
        .from('qr_codes')
        .select('id')
        .eq('activity_id', activityId)
        .eq('type', 'activity')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      userId
        ? serviceClient
            .from('activity_checkins')
            .select('id')
            .eq('activity_id', activityId)
            .eq('user_id', userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    checkinWindowStatus = (windowRes.data as TrackingActivityDTO['checkinWindowStatus'] | null) ?? undefined;
    checkinQrId = (qrRes.data as { id: string } | null)?.id ?? null;
    alreadyCheckedIn = Boolean(checkinRes.data);
  }

  return mapTrackingActivity(activity as Record<string, unknown>, materials, checkinWindowStatus, checkinQrId, alreadyCheckedIn);
}

export async function trackQrScan(params: {
  qrCodeId: string;
  sessionId?: string | null;
  userAgent?: string | null;
  userId?: string | null;
  isProfileComplete?: boolean;
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

  let shouldIncrementScan = true;
  if (params.sessionId) {
    const { data: existingEvent, error: existingEventError } = await serviceClient
      .from('qr_scan_events')
      .select('id')
      .eq('qr_code_id', params.qrCodeId)
      .eq('session_id', params.sessionId)
      .maybeSingle();

    if (existingEventError) throw new Error(existingEventError.message);
    shouldIncrementScan = !existingEvent;
  }

  if (shouldIncrementScan) {
    const { error: scanEventError } = await serviceClient.from('qr_scan_events').insert({
      qr_code_id: params.qrCodeId,
      user_id: params.userId ?? null,
      user_agent: params.userAgent ?? null,
      session_id: params.sessionId ?? null,
    });

    if (scanEventError) {
      if (scanEventError.code === '23505' && params.sessionId) {
        shouldIncrementScan = false;
      } else {
        throw new Error(scanEventError.message);
      }
    }
  }

  if (shouldIncrementScan) {
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
      const { data: activityQrCodes } = await serviceClient
        .from('qr_codes')
        .select('scans')
        .eq('activity_id', qrCode.activity_id as string);

      const activityScan = ((activityQrCodes ?? []) as Record<string, unknown>[]).reduce(
        (total, item) => total + ((item.scans as number | null) ?? 0),
        0,
      );

      await serviceClient
        .from('activities')
        .update({ scan: activityScan })
        .eq('id', qrCode.activity_id as string);
    }
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
  const activityStatus = activity?.status as 'published' | 'draft' | 'closed' | undefined;
  const materials = activity && qrCode.activity_id && activityStatus === 'published'
    ? await listActivityLandingMaterials(
        qrCode.activity_id as string,
        params.userId ?? null,
        params.isProfileComplete ?? false,
      )
    : [];

  // 查签到窗口状态（仅 published 活动且有 activity_id 时查询）
  let checkinWindowStatus: TrackingActivityDTO['checkinWindowStatus'] | undefined;
  let alreadyCheckedInForScan: boolean | undefined;
  if (activity && qrCode.activity_id && activityStatus === 'published') {
    const [windowRes, checkinRes] = await Promise.all([
      serviceClient.rpc('get_checkin_window_status', { p_activity_id: qrCode.activity_id as string }),
      params.userId
        ? serviceClient
            .from('activity_checkins')
            .select('id')
            .eq('activity_id', qrCode.activity_id as string)
            .eq('user_id', params.userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    checkinWindowStatus = (windowRes.data as TrackingActivityDTO['checkinWindowStatus'] | null) ?? undefined;
    alreadyCheckedInForScan = Boolean(checkinRes.data);
  }

  return {
    valid: true,
    status: qrCode.status as 'active' | 'paused',
    advisorId: (qrCode.advisor_id as string | null) ?? null,
    advisorName,
    activity: activity
      ? mapTrackingActivity(activity, materials, checkinWindowStatus, qrCode.activity_id ? (qrCode.id as string) : null, alreadyCheckedInForScan)
      : null,
  };
}

const VERIFICATION_CODE_TTL_MS = 300_000; // 5 minutes
const VERIFICATION_CODE_COOLDOWN_MS = 60_000; // 60 seconds
const VERIFICATION_CODE_DAILY_LIMIT = 30;

export async function verifyAndConsumeDevCode(phone: string, code: string): Promise<boolean> {
  const serviceClient = createServiceClient();
  const now = new Date().toISOString();

  const { data: record } = await serviceClient
    .from('phone_verification_codes')
    .select('id, code')
    .eq('phone', phone)
    .eq('purpose', 'login')
    .is('consumed_at', null)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!record || record.code !== code) return false;

  await serviceClient
    .from('phone_verification_codes')
    .update({ consumed_at: now })
    .eq('id', record.id);

  return true;
}

export async function sendDevPhoneCode(phone: string): Promise<SendCodeResponseDTO & { _devCode?: string }> {
  const serviceClient = createServiceClient();
  const now = new Date();

  // Rate limit: 60s cooldown
  const cooldownThreshold = new Date(now.getTime() - VERIFICATION_CODE_COOLDOWN_MS).toISOString();
  const { data: recentCodes } = await serviceClient
    .from('phone_verification_codes')
    .select('id')
    .eq('phone', phone)
    .gt('created_at', cooldownThreshold)
    .limit(1);

  if (recentCodes && recentCodes.length > 0) {
    throw new Error('CODE_SEND_TOO_FREQUENT');
  }

  // Daily limit: 30 codes per phone per day
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const { count: dailyCount } = await serviceClient
    .from('phone_verification_codes')
    .select('id', { count: 'exact', head: true })
    .eq('phone', phone)
    .gt('created_at', dayStart);

  if ((dailyCount ?? 0) >= VERIFICATION_CODE_DAILY_LIMIT) {
    throw new Error('CODE_DAILY_LIMIT_EXCEEDED');
  }

  // Check if user exists
  const { data: user } = await serviceClient
    .from('users')
    .select('id')
    .eq('phone', phone)
    .single();

  // Generate and persist code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(now.getTime() + VERIFICATION_CODE_TTL_MS).toISOString();

  await serviceClient
    .from('phone_verification_codes')
    .insert({ phone, code, purpose: 'login', expires_at: expiresAt });

  return {
    expiresInSeconds: 300,
    isRegistered: !!user,
    _devCode: code,
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

    if (params.sourceActivityId) {
      try {
        await incrementActivityCounter(serviceClient, params.sourceActivityId, 'register');
      } catch (counterErr) {
        console.error('[loginOrCreateUserByPhone] incrementActivityCounter failed:', counterErr instanceof Error ? counterErr.message : counterErr);
      }
    }
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

export async function updateUserProfile(
  userId: string,
  body: UserProfileCompleteDTO,
): Promise<UserProfileCompletedResponseDTO> {
  const serviceClient = createServiceClient();
  const company = body.company?.trim();
  const industry = body.industry?.trim();

  if (!company) throw new Error('COMPANY_REQUIRED');
  if (!industry) throw new Error('INDUSTRY_REQUIRED');

  const payload: Record<string, unknown> = {
    company,
    industry,
    is_profile_complete: true,
    updated_at: new Date().toISOString(),
  };
  if (body.name?.trim()) payload.name = body.name.trim();
  if (body.identity?.trim()) payload.identity = body.identity.trim();
  if (body.size?.trim()) payload.size = body.size.trim();

  const { data, error } = await serviceClient
    .from('users')
    .update(payload)
    .eq('id', userId)
    .select('id, phone, name, identity, company, industry, size, registered_at, active_at, is_profile_complete')
    .single();

  if (error || !data) throw new Error(error?.message ?? '企业信息保存失败');
  return { user: mapCurrentUser(data as Record<string, unknown>) };
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

// ============================================================================
// 签到模块
// ============================================================================

import type {
  CheckinPageDTO,
  CheckinSubmitDTO,
  CheckinSubmitResponseDTO,
  CheckinWindowStatus,
} from '../contracts/checkin';

/**
 * 查询活动二维码签到信息，返回落地页签到页所需全部数据。
 * 同时查当前用户是否已签到（userId 为 null 时 alreadyCheckedIn = false）。
 */
export async function getCheckinPageData(
  qrCodeId: string,
  userId: string | null,
): Promise<CheckinPageDTO> {
  const serviceClient = createServiceClient();

  // 查活动二维码（签到复用活动二维码）
  const { data: qr, error: qrError } = await serviceClient
    .from('qr_codes')
    .select('id, type, status, activity_id')
    .eq('id', qrCodeId)
    .single();

  if (qrError || !qr) throw new Error('CHECKIN_QR_NOT_FOUND');
  if ((qr.type as string) !== 'activity') throw new Error('CHECKIN_QR_NOT_ACTIVITY_TYPE');
  if ((qr.status as string) !== 'active') throw new Error('CHECKIN_QR_NOT_FOUND');

  const activityId = qr.activity_id as string;
  if (!activityId) throw new Error('CHECKIN_ACTIVITY_NOT_FOUND');

  // 查活动信息
  const { data: activity, error: actError } = await serviceClient
    .from('activities')
    .select('id, name, start_at, end_at, place, checkin_window_before_minutes, checkin_window_after_minutes, checkin_force_open, checkin_force_closed, checkin_count')
    .eq('id', activityId)
    .single();

  if (actError || !activity) throw new Error('CHECKIN_ACTIVITY_NOT_FOUND');

  // 调用数据库函数获取窗口状态
  const { data: windowResult } = await serviceClient
    .rpc('get_checkin_window_status', { p_activity_id: activityId });
  const windowStatus: CheckinWindowStatus = (windowResult as CheckinWindowStatus | null) ?? 'activity_not_found';

  // 计算窗口时间（展示用）
  const startAt = new Date(activity.start_at as string);
  const endAt = activity.end_at ? new Date(activity.end_at as string) : new Date(startAt.getTime() + 3 * 60 * 60 * 1000);
  const beforeMin = (activity.checkin_window_before_minutes as number) ?? 30;
  const afterMin = (activity.checkin_window_after_minutes as number) ?? 60;
  const windowOpenAt = new Date(startAt.getTime() - beforeMin * 60 * 1000);
  const windowCloseAt = new Date(endAt.getTime() + afterMin * 60 * 1000);

  // 查当前用户是否已签到
  let alreadyCheckedIn = false;
  if (userId) {
    const { data: existing } = await serviceClient
      .from('activity_checkins')
      .select('id')
      .eq('activity_id', activityId)
      .eq('user_id', userId)
      .maybeSingle();
    alreadyCheckedIn = Boolean(existing);
  }

  // 格式化活动时间展示
  const dateStr = startAt.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Shanghai' });
  const timeStr = `${startAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Shanghai' })} - ${endAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Shanghai' })}`;

  return {
    activityId,
    activityName: activity.name as string,
    activityDate: dateStr,
    activityTime: timeStr,
    activityLocation: activity.place as string,
    windowStatus,
    windowOpenAt: (activity.checkin_force_open as boolean) ? null : windowOpenAt.toISOString(),
    windowCloseAt: (activity.checkin_force_closed as boolean) ? null : windowCloseAt.toISOString(),
    checkinCount: (activity.checkin_count as number) ?? 0,
    alreadyCheckedIn,
    checkinQrId: qrCodeId,
  };
}

/**
 * 提交签到。
 * 校验窗口 → 防重复 → 写入记录 → 计数器 +1。
 */
export async function submitCheckin(
  params: CheckinSubmitDTO & { userId: string; ipAddress?: string },
): Promise<CheckinSubmitResponseDTO> {
  const serviceClient = createServiceClient();

  // 查活动二维码和活动
  const { data: qr, error: qrError } = await serviceClient
    .from('qr_codes')
    .select('id, type, status, activity_id')
    .eq('id', params.checkinQrId)
    .single();

  if (qrError || !qr) throw new Error('CHECKIN_QR_NOT_FOUND');
  if ((qr.type as string) !== 'activity') throw new Error('CHECKIN_QR_NOT_ACTIVITY_TYPE');
  if ((qr.status as string) !== 'active') throw new Error('CHECKIN_QR_NOT_FOUND');

  const activityId = qr.activity_id as string;
  if (!activityId) throw new Error('CHECKIN_ACTIVITY_NOT_FOUND');

  // 检查窗口
  const { data: windowResult } = await serviceClient
    .rpc('get_checkin_window_status', { p_activity_id: activityId });
  if (windowResult !== 'open') throw new Error('CHECKIN_WINDOW_NOT_OPEN');

  // 防重复：尝试插入，UNIQUE 约束冲突即已签到
  const { data: newCheckin, error: insertError } = await serviceClient
    .from('activity_checkins')
    .insert({
      activity_id: activityId,
      user_id: params.userId,
      checkin_qr_id: params.checkinQrId,
      ip_address: params.ipAddress ?? null,
    })
    .select('id, checked_in_at')
    .single();

  if (insertError) {
    if (insertError.code === '23505') throw new Error('CHECKIN_ALREADY_DONE');
    throw new Error(insertError.message ?? '签到失败');
  }

  // 计数器 +1
  await incrementActivityCounter(serviceClient, activityId, 'checkin_count');

  // 查最新计数
  const { data: updated } = await serviceClient
    .from('activities')
    .select('name, checkin_count')
    .eq('id', activityId)
    .single();

  return {
    checkinId: newCheckin.id as string,
    activityId,
    activityName: (updated?.name as string | null) ?? '',
    checkedInAt: newCheckin.checked_in_at as string,
    checkinCount: (updated?.checkin_count as number | null) ?? 0,
  };
}
