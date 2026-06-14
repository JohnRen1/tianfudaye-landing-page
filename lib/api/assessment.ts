/**
 * assessment.ts — 落地页测评模块 API 客户端
 *
 * 封装：获取题目列表、提交答题、获取报告、解锁报告、保存报告。
 */

import { apiGet, apiPost } from './client';
import type {
  QuestionPublicDTO,
  AssessmentSubmitDTO,
  AssessmentSubmitResponseDTO,
  AssessmentReportPublicDTO,
  UnlockReportResponseDTO,
  SaveReportResponseDTO,
} from '../contracts/assessment';

/**
 * 获取题目列表
 * GET /api/assessment/questions
 */
export async function getQuestions(): Promise<QuestionPublicDTO[]> {
  return apiGet<QuestionPublicDTO[]>('/api/assessment/questions');
}

/**
 * 提交答题
 * POST /api/assessment/submit
 */
export async function submitAssessment(
  answers: AssessmentSubmitDTO['answers'],
  sourceQrId?: string | null,
  sourceActivityId?: string | null,
): Promise<AssessmentSubmitResponseDTO> {
  const body: AssessmentSubmitDTO = {
    answers,
    ...(sourceQrId !== undefined ? { sourceQrId } : {}),
    ...(sourceActivityId !== undefined ? { sourceActivityId } : {}),
  };
  return apiPost<AssessmentSubmitResponseDTO>('/api/assessment/submit', body);
}

/**
 * 获取报告
 * GET /api/assessment/report/:id
 */
export async function getReport(id: string): Promise<AssessmentReportPublicDTO> {
  return apiGet<AssessmentReportPublicDTO>(`/api/assessment/report/${id}`);
}

/**
 * 解锁完整报告
 * POST /api/assessment/report/:id/unlock
 */
export async function unlockReport(id: string): Promise<{ report: AssessmentReportPublicDTO }> {
  return apiPost<UnlockReportResponseDTO>(`/api/assessment/report/${id}/unlock`);
}

/**
 * 保存报告到"我的报告"
 * POST /api/assessment/report/:id/save
 */
export async function saveReport(id: string): Promise<{ saved: true; savedAt: string }> {
  return apiPost<SaveReportResponseDTO>(`/api/assessment/report/${id}/save`);
}
