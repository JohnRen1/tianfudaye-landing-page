'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarClock, Hourglass, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EventLandingPage } from '@/components/mobile/event-landing-page';
import { getActivityLanding, trackQrScan } from '@/lib/api/tracking';
import type { ActivityLandingDetailDTO } from '@/lib/contracts/tracking';
import { clearTrackingContext, getOrCreateQrScanSessionId, persistTrackingContext } from '@/lib/tracking-context';

type LandingHomeClientProps = {
  fallback: ReactNode;
};

type ActivityUnavailableStatus = Extract<ActivityLandingDetailDTO['status'], 'draft' | 'closed'>;

function ActivityStatusNotice({ activity, status }: { activity: ActivityLandingDetailDTO; status: ActivityUnavailableStatus }) {
  const isDraft = status === 'draft';
  const Icon = isDraft ? Hourglass : CalendarClock;

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <Card className="overflow-hidden border-0 shadow-sm">
        <div className="mobile-safe-hero bg-gradient-to-br from-primary via-primary/90 to-primary/80 px-5 py-8 text-primary-foreground">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Icon className="h-7 w-7" />
          </div>
          <p className="mb-2 text-sm text-blue-50/80">{isDraft ? '活动筹备中' : '活动已结束'}</p>
          <h1 className="text-xl font-bold leading-tight text-balance">{activity.name}</h1>
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
              <strong className="text-foreground">{activity.date}</strong>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>活动时间</span>
              <strong className="text-foreground">{activity.time}</strong>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>活动地点</span>
              <strong className="text-right text-foreground">{activity.location}</strong>
            </div>
          </div>

          <Button className="w-full" variant="outline" onClick={() => window.location.assign('/')}>
            <RotateCcw className="mr-2 h-4 w-4" />
            返回首页
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function LandingHomeClient({ fallback }: LandingHomeClientProps) {
  const searchParams = useSearchParams();
  const [activity, setActivity] = useState<ActivityLandingDetailDTO | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const qrId = searchParams.get('qr_id');
    const activityId = searchParams.get('activity_id');

    async function loadLandingActivity() {
      try {
        if (qrId) {
          persistTrackingContext({ qrId, activityId, source: activityId ? 'activity' : 'home' });
          const scanSessionId = getOrCreateQrScanSessionId(qrId);
          const result = await trackQrScan(qrId, scanSessionId, navigator.userAgent);
          if (result.activity) {
            persistTrackingContext({ qrId, activityId: result.activity.id, source: 'activity' });
            setActivity(result.activity);
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

  if (!loaded && (searchParams.get('qr_id') || searchParams.get('activity_id'))) {
    return <div className="px-4 py-12 text-center text-sm text-muted-foreground">正在加载活动信息...</div>;
  }

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
