export type LandingSource = 'activity' | 'home';

export interface TrackingParams {
  qrId: string | null;
  activityId: string | null;
  source: LandingSource;
}

const QR_ID_KEY = 'qr_id';
const ACTIVITY_ID_KEY = 'activity_id';
const LANDING_SOURCE_KEY = 'landing_source';
const QR_SCAN_SESSION_PREFIX = 'qr_scan_session:';

function createClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateQrScanSessionId(qrId: string): string {
  if (typeof window === 'undefined') return createClientId();
  const key = `${QR_SCAN_SESSION_PREFIX}${qrId}`;
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const sessionId = createClientId();
  localStorage.setItem(key, sessionId);
  return sessionId;
}

interface SearchParamsLike {
  get(name: string): string | null;
}

function getParam(searchParams: SearchParamsLike, primary: string, alias: string): string | null {
  return searchParams.get(primary) ?? searchParams.get(alias);
}

export function getTrackingParams(searchParams: SearchParamsLike): TrackingParams {
  const qrId = getParam(searchParams, 'qr_id', 'qr');
  const activityId = getParam(searchParams, 'activity_id', 'activity');
  return {
    qrId,
    activityId,
    source: activityId ? 'activity' : 'home',
  };
}

export function buildPathWithTracking(path: string, searchParams: SearchParamsLike): string {
  const { qrId, activityId } = getTrackingParams(searchParams);
  if (!activityId) return path;

  const url = new URL(path, 'https://local.invalid');
  if (qrId) {
    url.searchParams.set('qr', qrId);
    url.searchParams.set('qr_id', qrId);
  }
  url.searchParams.set('activity', activityId);
  url.searchParams.set('activity_id', activityId);
  return `${url.pathname}${url.search}`;
}

export function persistTrackingContext(params: TrackingParams): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(LANDING_SOURCE_KEY, params.source);
  if (params.source === 'activity' && params.activityId) {
    if (params.qrId) localStorage.setItem(QR_ID_KEY, params.qrId);
    localStorage.setItem(ACTIVITY_ID_KEY, params.activityId);
    return;
  }

  localStorage.removeItem(QR_ID_KEY);
  localStorage.removeItem(ACTIVITY_ID_KEY);
}

export function clearTrackingContext(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LANDING_SOURCE_KEY, 'home');
  localStorage.removeItem(QR_ID_KEY);
  localStorage.removeItem(ACTIVITY_ID_KEY);
}
