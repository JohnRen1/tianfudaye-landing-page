import { Suspense } from "react";
import { EventLandingPage } from "@/components/mobile/event-landing-page";
import { LandingHomeClient } from "./landing-home-client";

export default function Page() {
  return (
    <div className="mx-auto max-w-[390px] min-h-screen bg-background">
      <Suspense fallback={<EventLandingPage />}>
        <LandingHomeClient fallback={<EventLandingPage />} />
      </Suspense>
    </div>
  );
}
