import { Suspense } from "react";
import { WechatCallbackClient } from "@/components/mobile/wechat-callback-client";

function Fallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-3xl border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">微信登录</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">正在处理微信登录...</p>
      </div>
    </div>
  );
}

export default function WechatCallbackPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <WechatCallbackClient />
    </Suspense>
  );
}
