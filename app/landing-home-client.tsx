'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { EventLandingPage } from '@/components/mobile/event-landing-page';
import { getActivityLanding, trackQrScan } from '@/lib/api/tracking';
import type { ActivityLandingDetailDTO } from '@/lib/contracts/tracking';

type LandingHomeClientProps = {
  fallback: ReactNode;
};

export function LandingHomeClient({ fallback }: LandingHomeClientProps) {
  const searchParams = useSearchParams();
  const [activity, setActivity] = useState<ActivityLandingDetailDTO | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const qrId = searchParams.get('qr_id');
    const activityId = searchParams.get('activity_id');
    let ignored = false;

    async function loadLandingActivity() {
      try {
        if (qrId) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('qr_id', qrId);
            if (activityId) localStorage.setItem('activity_id', activityId);
          }
          const result = await trackQrScan(qrId, undefined, navigator.userAgent);
          if (!ignored && result.activity) {
            if (typeof window !== 'undefined') localStorage.setItem('activity_id', result.activity.id);
            setActivity(result.activity);
          }
          return;
        }

        if (activityId) {
          if (typeof window !== 'undefined') localStorage.setItem('activity_id', activityId);
          const result = await getActivityLanding(activityId);
          if (!ignored) {
            setActivity(result);
          }
        }
      } catch {
        if (!ignored) {
          setActivity(null);
        }
      } finally {
        if (!ignored) {
          setLoaded(true);
        }
      }
    }

    void loadLandingActivity();

    return () => {
      ignored = true;
    };
  }, [searchParams]);

  if (!loaded && (searchParams.get('qr_id') || searchParams.get('activity_id'))) {
    return <div className="px-4 py-12 text-center text-sm text-muted-foreground">正在加载活动信息...</div>;
  }

  if (!activity) return fallback;

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
      }}
    />
  );
}
