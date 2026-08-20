'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, CalendarClock, Hourglass, MessageSquare, RotateCcw, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EventLandingPage } from '@/components/mobile/event-landing-page';
import { getActivityLanding, trackQrScan } from '@/lib/api/tracking';
import type { ActivityLandingDetailDTO } from '@/lib/contracts/tracking';
import { clearTrackingContext, getOrCreateQrScanSessionId, persistTrackingContext } from '@/lib/tracking-context';
import { ApiError } from '@/lib/api/client';
import { ACTIVITY_LANDING_DEFAULTS, displayActivityField, getLandingDocumentTitle } from '@/lib/activity-presentation';

type LandingHomeClientProps = {
  fallback: ReactNode;
};

function QrCodeDisabledNotice() {
  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <Card className="overflow-hidden border-0 shadow-sm">
        <div className="mobile-safe-hero bg-gradient-to-br from-primary via-primary/90 to-primary/80 px-5 py-8 text-primary-foreground">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <QrCode className="h-7 w-7" />
          </div>
          <p className="mb-2 text-sm text-blue-50/80">二维码已停用</p>
          <h1 className="text-xl font-bold leading-tight">活动已结束</h1>
        </div>
        <CardContent className="space-y-5 p-5 text-center">
          <div>
            <h2 className="text-lg font-semibold text-foreground">该活动入口已关闭</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              本次活动的二维码已停用，报名和资料领取入口已关闭。如需了解税务咨询或后续活动，欢迎预约顾问。
            </p>
          </div>
          <Button
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => window.location.assign('/appointment')}
          >
            <Calendar className="mr-2 h-4 w-4" />
            预约顾问
          </Button>
          <Button className="w-full" variant="outline" onClick={() => window.location.replace('/')}>
            <RotateCcw className="mr-2 h-4 w-4" />
            返回首页
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

type ActivityUnavailableStatus = Extract<ActivityLandingDetailDTO['status'], 'draft' | 'closed'>;

function withQrScanTimeout<T>(request: Promise<T>, timeoutMs = 10000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('二维码验证超时')), timeoutMs);
    request.then((value) => {
      window.clearTimeout(timer);
      resolve(value);
    }).catch((error: unknown) => {
      window.clearTimeout(timer);
      reject(error);
    });
  });
}

function buildActivityStatusPath(
  path: string,
  activityId: string,
  searchParams: URLSearchParams,
): string {
  const destination = new URL(path, 'https://local.invalid');
  const qrId = searchParams.get('qr_id') ?? searchParams.get('qr');
  if (qrId) {
    destination.searchParams.set('qr_id', qrId);
    destination.searchParams.set('qr', qrId);
  }
  destination.searchParams.set('activity_id', activityId);
  destination.searchParams.set('activity', activityId);
  destination.searchParams.set('returnTo', `/?${searchParams.toString()}`);
  return `${destination.pathname}${destination.search}`;
}

function ActivityStatusNotice({ activity, status }: { activity: ActivityLandingDetailDTO; status: ActivityUnavailableStatus }) {
  const isDraft = status === 'draft';
  const Icon = isDraft ? Hourglass : CalendarClock;
  const searchParams = useSearchParams();
  const supportPath = buildActivityStatusPath('/support', activity.id, searchParams);

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <Card className="overflow-hidden border-0 shadow-sm">
        <div className="mobile-safe-hero bg-gradient-to-br from-primary via-primary/90 to-primary/80 px-5 py-8 text-primary-foreground">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Icon className="h-7 w-7" />
          </div>
          <p className="mb-2 text-sm text-blue-50/80">{isDraft ? '活动筹备中' : '活动已结束'}</p>
          <h1 className="text-xl font-bold leading-tight text-balance">{displayActivityField(activity.name, ACTIVITY_LANDING_DEFAULTS.title)}</h1>
        </div>
        <CardContent className="space-y-5 p-5 text-center">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {isDraft ? '活动准备中，敬请期待' : '活动已结束，敬请期待下一次活动'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {isDraft
                ? '当前活动信息正在完善中，暂未开放报名和资料领取。请稍后再扫码查看最新安排。'
                : '本次活动报名和预约入口已关闭，后续活动开放后我们会第一时间更新。'}
            </p>
          </div>

          <div className="rounded-2xl bg-secondary/50 p-4 text-left text-sm text-muted-foreground">
            <div className="flex items-center justify-between gap-3">
              <span>活动日期</span>
              <strong className="text-foreground">{displayActivityField(activity.date, ACTIVITY_LANDING_DEFAULTS.date)}</strong>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>活动时间</span>
              <strong className="text-foreground">{displayActivityField(activity.time, ACTIVITY_LANDING_DEFAULTS.time)}</strong>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>活动地点</span>
              <strong className="text-right text-foreground">{displayActivityField(activity.location, ACTIVITY_LANDING_DEFAULTS.location)}</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button className="w-full" variant="outline" onClick={() => window.location.assign(supportPath)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              咨询客服
            </Button>
            <Button className="w-full" onClick={() => window.location.replace('/')}>
              <RotateCcw className="mr-2 h-4 w-4" />
              返回首页
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function LandingHomeClient({ fallback }: LandingHomeClientProps) {
  const searchParams = useSearchParams();
  const [activity, setActivity] = useState<ActivityLandingDetailDTO | null>(null);
  const [qrDisabled, setQrDisabled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const qrId = searchParams.get('qr_id');
    const activityId = searchParams.get('activity_id');

    async function loadLandingActivity() {
      try {
        if (qrId) {
          persistTrackingContext({ qrId, activityId, source: activityId ? 'activity' : 'home' });
          const scanSessionId = getOrCreateQrScanSessionId(qrId);
          try {
            const result = await withQrScanTimeout(trackQrScan(qrId, scanSessionId, navigator.userAgent));
            if (result.activity) {
              persistTrackingContext({ qrId, activityId: result.activity.id, source: 'activity' });
              setActivity(result.activity);
            } else {
              // 有效的公司主页码不绑定活动，验证完成后直接展示通用首页。
              setActivity(null);
            }
          } catch (err: unknown) {
            // 二维码不存在或已停用 → 展示停用提示页，不降级到通用首页
            if (err instanceof ApiError && (err.code === 'QR_CODE_NOT_FOUND' || err.status === 404)) {
              setQrDisabled(true);
            }
          }
          return;
        }

        if (activityId) {
          persistTrackingContext({ qrId: null, activityId, source: 'activity' });
          const result = await getActivityLanding(activityId);
          setActivity(result);
          return;
        }

        clearTrackingContext();
      } catch {
        setActivity(null);
      } finally {
        setLoaded(true);
      }
    }

    void loadLandingActivity();
  }, [searchParams]);

  useEffect(() => {
    document.title = getLandingDocumentTitle(Boolean(searchParams.get('qr_id')) && Boolean(activity));
  }, [activity, searchParams]);

  if (!loaded && (searchParams.get('qr_id') || searchParams.get('activity_id'))) {
    return <div className="px-4 py-12 text-center text-sm text-muted-foreground">正在加载活动信息...</div>;
  }

  if (qrDisabled) return <QrCodeDisabledNotice />;

  if (!activity) return fallback;

  if (activity.status === 'draft' || activity.status === 'closed') {
    return <ActivityStatusNotice activity={activity} status={activity.status} />;
  }

  return (
    <EventLandingPage
      showActivitySections
      eventData={{
        id: activity.id,
        title: activity.name,
        type: activity.type,
        speaker: activity.speaker,
        speakerTitle: activity.speakerTitle,
        date: activity.date,
        time: activity.time,
        location: activity.location,
        description: activity.description,
        materials: activity.materials ?? [],
        checkinWindowStatus: activity.checkinWindowStatus,
        checkinQrId: activity.checkinQrId,
        alreadyCheckedIn: activity.alreadyCheckedIn,
      }}
    />
  );
}
