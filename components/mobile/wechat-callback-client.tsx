"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type CallbackState =
  | { status: "loading"; message: string }
  | { status: "error"; message: string }
  | { status: "pending"; message: string }
  | { status: "success"; message: string };

const TOKEN_KEY = "user-token";

export function WechatCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<CallbackState>({
    status: "loading",
    message: "正在处理微信登录...",
  });

  useEffect(() => {
    const query = searchParams.toString();
    const requestUrl = `/api/auth/wechat-callback${query ? `?${query}` : ""}`;

    async function run() {
      try {
        const res = await fetch(requestUrl, { method: "GET" });
        const body = (await res.json()) as
          | {
              success: true;
              data: {
                accessToken?: string;
                redirectPath?: string;
                requiresPhoneBinding?: boolean;
              };
            }
          | {
              success: false;
              error: { message: string };
            };

        if (!res.ok || !body.success) {
          setState({
            status: "error",
            message: body.success ? "微信登录失败" : body.error.message,
          });
          return;
        }

        if (body.data.requiresPhoneBinding) {
          setState({
            status: "pending",
            message: "当前微信号尚未绑定手机号，后续接入短信后可继续完成绑定。",
          });
          return;
        }

        if (body.data.accessToken) {
          localStorage.setItem(TOKEN_KEY, body.data.accessToken);
        }

        setState({
          status: "success",
          message: "微信登录成功，正在跳转...",
        });

        const redirectPath = body.data.redirectPath || "/";
        window.setTimeout(() => {
          router.replace(redirectPath);
        }, 300);
      } catch {
        setState({
          status: "error",
          message: "微信登录回调处理失败，请稍后重试。",
        });
      }
    }

    void run();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-3xl border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">微信登录</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{state.message}</p>
      </div>
    </div>
  );
}
