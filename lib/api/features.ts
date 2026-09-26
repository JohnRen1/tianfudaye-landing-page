import { apiGet } from './client';

export interface MiniProgramFeatureConfig {
  aiChatEnabled: boolean;
}

export function getMiniProgramFeatureConfig(): Promise<MiniProgramFeatureConfig> {
  return apiGet<MiniProgramFeatureConfig>('/api/features');
}
