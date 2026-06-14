import { Suspense } from "react";
import { MaterialsPage } from "@/components/mobile/materials-page";

function Fallback() {
  return (
    <div className="mx-auto min-h-screen max-w-[390px] bg-background">
      <div className="flex min-h-screen items-center justify-center px-6 text-sm text-muted-foreground">
        正在加载资料页面...
      </div>
    </div>
  );
}

export default function Page() {
  // MVP 阶段默认已登录，跳过登录界面，直接进入资料领取页面。
  // 后续恢复登录时，可在此处读取真实登录态，未登录则 redirect('/login') 或展示 LoginModal。
  return (
    <Suspense fallback={<Fallback />}>
      <div className="mx-auto min-h-screen max-w-[390px] bg-background">
        <MaterialsPage />
      </div>
    </Suspense>
  );
}
