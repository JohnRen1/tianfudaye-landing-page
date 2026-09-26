import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMiniProgramFeatureConfig } from './features';

describe('getMiniProgramFeatureConfig', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('defaults to enabled when the switch is absent', () => {
    vi.stubEnv('MINI_PROGRAM_AI_CHAT_ENABLED', '');
    expect(getMiniProgramFeatureConfig()).toEqual({ aiChatEnabled: true });
  });

  it('disables the AI entry for explicit false-like values', () => {
    vi.stubEnv('MINI_PROGRAM_AI_CHAT_ENABLED', 'false');
    expect(getMiniProgramFeatureConfig()).toEqual({ aiChatEnabled: false });
  });

  it('enables the AI entry for other non-empty values', () => {
    vi.stubEnv('MINI_PROGRAM_AI_CHAT_ENABLED', 'true');
    expect(getMiniProgramFeatureConfig()).toEqual({ aiChatEnabled: true });
  });
});
