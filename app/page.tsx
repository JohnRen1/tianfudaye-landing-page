import { Suspense } from "react";
import { EventLandingPage } from "@/components/mobile/event-landing-page";
import { LandingHomeClient } from "./landing-home-client";

function GeneralLandingPage() {
  return (
    <Suspense>
      <EventLandingPage eventData={null} />
    </Suspense>
  );
}

export default function Page() {
  return (
    <div className="mx-auto max-w-[390px] min-h-screen bg-background">
      <Suspense fallback={<GeneralLandingPage />}>
        <LandingHomeClient fallback={<GeneralLandingPage />} />
      </Suspense>
    </div>
  );
}
