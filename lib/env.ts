export function getAppEnv(): string {
  return process.env.APP_ENV?.trim().toLowerCase() || process.env.NODE_ENV || 'dev';
}

export function isProdEnv(): boolean {
  const appEnv = getAppEnv();
  return appEnv === 'prod' || appEnv === 'production';
}

export function isTruthyEnv(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function pickEnvByStage(localValue: string | undefined, cloudValue: string | undefined): string | undefined {
  const local = localValue?.trim();
  const cloud = cloudValue?.trim();
  return isProdEnv() ? cloud : local;
}

export function pickTruthyEnvByStage(localValue: string | undefined, cloudValue: string | undefined): boolean {
  return isTruthyEnv(pickEnvByStage(localValue, cloudValue));
}
