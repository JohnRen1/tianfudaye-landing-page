import * as cloudbase from './cloudbase-adapter';
import * as homepageSupabase from './homepage-supabase';
import * as supabase from './supabase-adapter';

export type DatabaseProvider = 'supabase' | 'cloudbase';

function normalizeProvider(value: string | undefined): DatabaseProvider {
  if (value === 'cloudbase') {
    throw new Error('落地页二维码追踪目前仅支持 APP_DATABASE_PROVIDER=supabase');
  }
  return 'supabase';
}

export const databaseProvider: DatabaseProvider = normalizeProvider(
  process.env.APP_DATABASE_PROVIDER,
);

const adapter = databaseProvider === 'cloudbase' ? cloudbase : supabase;

export const createServiceClient = adapter.createServiceClient;
export const getCurrentUserById = adapter.getCurrentUserById;
export const isExpertUserPhone = adapter.isExpertUserPhone;
export const listAssessmentQuestions = adapter.listAssessmentQuestions;
export const submitAssessment = adapter.submitAssessment;
export const getAssessmentReportById = adapter.getAssessmentReportById;
export const saveAssessmentReport = adapter.saveAssessmentReport;
export const unlockAssessmentReport = adapter.unlockAssessmentReport;
export const getAppointmentUserProfile = adapter.getAppointmentUserProfile;
export const createAppointment = adapter.createAppointment;
export const listUserAppointments = adapter.listUserAppointments;
export const createQaRecord = adapter.createQaRecord;
export const createExpertReview = adapter.createExpertReview;
export const claimMaterial = adapter.claimMaterial;
export const getClaimedMaterialViewUrl = adapter.getClaimedMaterialViewUrl;
export const listLandingMaterials = adapter.listLandingMaterials;
export const getActivityLandingDetail = adapter.getActivityLandingDetail;
export const trackQrScan = adapter.trackQrScan;
export const verifyAndConsumeDevCode = adapter.verifyAndConsumeDevCode;
export const sendDevPhoneCode = adapter.sendDevPhoneCode;
export const loginOrCreateUserByPhone = adapter.loginOrCreateUserByPhone;
export const buildPhoneLoginResponse = adapter.buildPhoneLoginResponse;
export const updateUserProfile = adapter.updateUserProfile;
export const getUserByWechatOpenId = adapter.getUserByWechatOpenId;
// 微信小程序入口只支持 Supabase（normalizeProvider 已拒绝 cloudbase），
// 因此显式使用该适配器，避免把小程序身份能力错误暴露给未实现的提供方。
export const bindWechatOpenIdToUser = supabase.bindWechatOpenIdToUser;
export const buildWechatLoginResponse = adapter.buildWechatLoginResponse;
export const getCheckinPageData = adapter.getCheckinPageData;
export const submitCheckin = adapter.submitCheckin;
export const getHomepageSurveyActive = homepageSupabase.getHomepageSurveyActive;
export const submitHomepageSurvey = homepageSupabase.submitHomepageSurvey;
