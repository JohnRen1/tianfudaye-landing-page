import {
  ASSESSMENT_MODULE_LABEL,
  type AssessmentModuleKey,
  type QuestionPublicDTO,
  type QuestionType,
} from '../contracts/assessment';
import type { CurrentUserDTO } from '../contracts/auth';
import { queryFirst, queryRows } from './postgres-client';
import type * as SupabaseAdapter from './supabase-adapter';

type QuestionRow = {
  id: string;
  module_key: AssessmentModuleKey;
  type: QuestionType;
  title: string;
  description: string | null;
  sort_order: number;
  options: Array<{ sort_order: number; label: string; score?: number }>;
};

type CurrentUserRow = {
  id: string;
  phone: string;
  name: string | null;
  identity: string | null;
  company: string | null;
  industry: string | null;
  size: string | null;
  registered_at: string;
  active_at: string;
  is_profile_complete: boolean | null;
};

function notImplemented(functionName: string): never {
  throw new Error(`CloudBase PostgreSQL adapter has not implemented ${functionName} yet`);
}

export const databaseProvider: SupabaseAdapter.DatabaseProvider = 'cloudbase';

export function createServiceClient(): ReturnType<typeof SupabaseAdapter.createServiceClient> {
  return {
    provider: 'cloudbase-postgresql',
  } as unknown as ReturnType<typeof SupabaseAdapter.createServiceClient>;
}

export async function getCurrentUserById(userId: string): Promise<CurrentUserDTO | null> {
  const row = await queryFirst<CurrentUserRow>(
    `select id, phone, name, identity, company, industry, size, registered_at, active_at, is_profile_complete
     from public.users
     where id = :userId
     limit 1`,
    { userId },
  );

  if (!row) return null;

  return {
    id: row.id,
    name: row.name ?? null,
    phone: row.phone,
    identity: row.identity ?? null,
    company: row.company ?? null,
    industry: row.industry ?? null,
    size: row.size ?? null,
    registeredAt: row.registered_at,
    activeAt: row.active_at,
    isProfileComplete: Boolean(row.is_profile_complete),
  };
}

export async function listAssessmentQuestions(): Promise<QuestionPublicDTO[]> {
  const rows = await queryRows<QuestionRow>(
    `select id, module_key, type, title, description, sort_order, options
     from public.assessment_questions
     where is_active = true
     order by sort_order asc`,
  );

  return rows.map((row) => ({
    id: row.id,
    moduleKey: row.module_key,
    moduleName: ASSESSMENT_MODULE_LABEL[row.module_key] ?? row.module_key,
    type: row.type,
    title: row.title,
    description: row.description ?? '',
    sortOrder: row.sort_order,
    options: Array.isArray(row.options)
      ? row.options.map((option) => ({
          sortOrder: option.sort_order,
          label: option.label,
        }))
      : [],
  }));
}

export const submitAssessment: typeof SupabaseAdapter.submitAssessment = async () =>
  notImplemented('submitAssessment');

export const getAssessmentReportById: typeof SupabaseAdapter.getAssessmentReportById = async () =>
  notImplemented('getAssessmentReportById');

export const saveAssessmentReport: typeof SupabaseAdapter.saveAssessmentReport = async () =>
  notImplemented('saveAssessmentReport');

export const unlockAssessmentReport: typeof SupabaseAdapter.unlockAssessmentReport = async () =>
  notImplemented('unlockAssessmentReport');

export const getAppointmentUserProfile: typeof SupabaseAdapter.getAppointmentUserProfile = async () =>
  notImplemented('getAppointmentUserProfile');

export const createAppointment: typeof SupabaseAdapter.createAppointment = async () =>
  notImplemented('createAppointment');

export const listUserAppointments: typeof SupabaseAdapter.listUserAppointments = async () =>
  notImplemented('listUserAppointments');

export const createQaRecord: typeof SupabaseAdapter.createQaRecord = async () =>
  notImplemented('createQaRecord');

export const claimMaterial: typeof SupabaseAdapter.claimMaterial = async () =>
  notImplemented('claimMaterial');

export const listLandingMaterials: typeof SupabaseAdapter.listLandingMaterials = async () =>
  notImplemented('listLandingMaterials');

export const getActivityLandingDetail: typeof SupabaseAdapter.getActivityLandingDetail = async () =>
  notImplemented('getActivityLandingDetail');

export const trackQrScan: typeof SupabaseAdapter.trackQrScan = async () =>
  notImplemented('trackQrScan');

export const verifyAndConsumeDevCode: typeof SupabaseAdapter.verifyAndConsumeDevCode = async () =>
  notImplemented('verifyAndConsumeDevCode');

export const sendDevPhoneCode: typeof SupabaseAdapter.sendDevPhoneCode = async () =>
  notImplemented('sendDevPhoneCode');

export const loginOrCreateUserByPhone: typeof SupabaseAdapter.loginOrCreateUserByPhone = async () =>
  notImplemented('loginOrCreateUserByPhone');

export const buildPhoneLoginResponse: typeof SupabaseAdapter.buildPhoneLoginResponse = () =>
  notImplemented('buildPhoneLoginResponse');

export const getUserByWechatOpenId: typeof SupabaseAdapter.getUserByWechatOpenId = async () =>
  notImplemented('getUserByWechatOpenId');

export const buildWechatLoginResponse: typeof SupabaseAdapter.buildWechatLoginResponse = () =>
  notImplemented('buildWechatLoginResponse');
