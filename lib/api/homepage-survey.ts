import { apiGet, apiPost } from './client';
import type {
  HomepageSurveyPublicConfigDTO,
  HomepageSurveySubmitDTO,
  HomepageSurveySubmitResponseDTO,
} from '../contracts/homepage-survey';

export function getHomepageSurveyActive(): Promise<HomepageSurveyPublicConfigDTO> {
  return apiGet<HomepageSurveyPublicConfigDTO>('/api/homepage-survey/active');
}

export function submitHomepageSurvey(
  body: HomepageSurveySubmitDTO,
): Promise<HomepageSurveySubmitResponseDTO> {
  return apiPost<HomepageSurveySubmitResponseDTO>('/api/homepage-survey/submissions', body);
}
