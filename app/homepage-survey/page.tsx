import { Suspense } from "react";
import { HomepageSurveyPage } from "@/components/mobile/homepage-survey-page";

export default function Page() {
  return (
    <Suspense>
      <HomepageSurveyPage />
    </Suspense>
  );
}
