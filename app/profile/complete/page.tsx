import { Suspense } from "react";
import { ProfileCompletePage } from "@/components/mobile/profile-complete-page";

function Fallback() {
  return (
    <div className="mx-auto min-h-screen max-w-[390px] bg-background">
      <div className="flex min-h-screen items-center justify-center px-6 text-sm text-muted-foreground">
        正在加载企业信息页面...
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Fallback />}>
      <div className="mx-auto min-h-screen max-w-[390px] bg-background">
        <ProfileCompletePage />
      </div>
    </Suspense>
  );
}
