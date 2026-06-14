import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { RiskAssessmentQuizPage } from "@/components/mobile/risk-assessment-quiz-page";

export default function Page() {
  return (
    <div className="mx-auto min-h-screen max-w-[390px] bg-background">
      <Suspense
        fallback={
          <div className="flex min-h-screen flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">加载中…</p>
          </div>
        }
      >
        <RiskAssessmentQuizPage />
      </Suspense>
    </div>
  );
}
