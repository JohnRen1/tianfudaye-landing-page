import { Suspense } from "react";
import { TaxAiAssistantPage } from "@/components/mobile/tax-ai-assistant-page";

function Fallback() {
  return (
    <div className="mx-auto min-h-screen max-w-[390px] bg-background">
      <div className="flex min-h-screen items-center justify-center px-6 text-sm text-muted-foreground">
        正在加载 AI 助手...
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Fallback />}>
      <div className="mx-auto min-h-screen max-w-[390px] bg-background">
        <TaxAiAssistantPage />
      </div>
    </Suspense>
  );
}
