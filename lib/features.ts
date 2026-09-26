export interface MiniProgramFeatureConfig {
  aiChatEnabled: boolean;
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value?.trim()) return fallback;
  return !['0', 'false', 'off', 'disabled', 'no'].includes(value.trim().toLowerCase());
}

export function getMiniProgramFeatureConfig(): MiniProgramFeatureConfig {
  return {
    aiChatEnabled: readBoolean(process.env.MINI_PROGRAM_AI_CHAT_ENABLED, true),
  };
}
