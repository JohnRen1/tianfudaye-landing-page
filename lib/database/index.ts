import * as cloudbase from './cloudbase-adapter';
import * as supabase from './supabase-adapter';

export type DatabaseProvider = 'supabase' | 'cloudbase';

function normalizeProvider(value: string | undefined): DatabaseProvider {
  return value === 'cloudbase' ? 'cloudbase' : 'supabase';
}

export const databaseProvider: DatabaseProvider = normalizeProvider(
  process.env.APP_DATABASE_PROVIDER,
);

const adapter = databaseProvider === 'cloudbase' ? cloudbase : supabase;

export const createServiceClient = adapter.createServiceClient;
export const getCurrentUserById = adapter.getCurrentUserById;
export const listAssessmentQuestions = adapter.listAssessmentQuestions;
export const submitAssessment = adapter.submitAssessment;
export const getAssessmentReportById = adapter.getAssessmentReportById;
export const saveAssessmentReport = adapter.saveAssessmentReport;
export const unlockAssessmentReport = adapter.unlockAssessmentReport;
export const getAppointmentUserProfile = adapter.getAppointmentUserProfile;
export const createAppointment = adapter.createAppointment;
export const listUserAppointments = adapter.listUserAppointments;
export const createQaRecord = adapter.createQaRecord;
export const claimMaterial = adapter.claimMaterial;
export const listLandingMaterials = adapter.listLandingMaterials;
export const getActivityLandingDetail = adapter.getActivityLandingDetail;
export const trackQrScan = adapter.trackQrScan;
export const verifyAndConsumeDevCode = adapter.verifyAndConsumeDevCode;
export const sendDevPhoneCode = adapter.sendDevPhoneCode;
export const loginOrCreateUserByPhone = adapter.loginOrCreateUserByPhone;
export const buildPhoneLoginResponse = adapter.buildPhoneLoginResponse;
export const getUserByWechatOpenId = adapter.getUserByWechatOpenId;
export const buildWechatLoginResponse = adapter.buildWechatLoginResponse;
