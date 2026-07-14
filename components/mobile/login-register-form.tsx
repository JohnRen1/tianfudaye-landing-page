"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, LockKeyhole, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { sendCode, loginPhone } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { hydrateClientAuthFromServer } from "@/lib/client-auth";

interface LoginRegisterFormProps {
  compact?: boolean;
  submitText?: string;
  onSuccess?: () => void;
}

/** Map backend error codes to user-facing messages. */
function mapErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      // Contract-specified codes
      case "PHONE_CODE_INCORRECT":
        return "验证码错误";
      case "PHONE_CODE_EXPIRED":
        return "验证码已过期，请重新获取";
      case "PHONE_CODE_RATE_LIMITED":
      // Actual server code from send-code/route.ts
      case "CODE_SEND_TOO_FREQUENT":
        return "发送过于频繁，请稍后再试";
      // Actual server code from login-phone/route.ts (covers both incorrect & expired)
      case "AUTH_INVALID_CODE":
        return "验证码错误或已过期";
      default:
        return err.message || "操作失败，请稍后重试";
    }
  }
  return "网络异常，请稍后重试";
}

function getCurrentAuthContext(): { sourceQrId?: string; sourceActivityId?: string; redirectPath: string } {
  if (typeof window === "undefined") return { redirectPath: "/" };

  const currentUrl = new URL(window.location.href);
  const sourceQrId = currentUrl.searchParams.get("qr_id") ?? currentUrl.searchParams.get("qr") ?? undefined;
  const sourceActivityId = currentUrl.searchParams.get("activity_id") ?? currentUrl.searchParams.get("activity") ?? undefined;
  const configuredRedirect = currentUrl.searchParams.get("redirectPath") ?? currentUrl.searchParams.get("redirect");

  if (configuredRedirect?.startsWith("/") && !configuredRedirect.startsWith("//")) {
    return { sourceQrId, sourceActivityId, redirectPath: configuredRedirect };
  }

  if (currentUrl.pathname === "/login") {
    const homeParams = new URLSearchParams();
    if (sourceQrId) homeParams.set("qr_id", sourceQrId);
    if (sourceActivityId) homeParams.set("activity_id", sourceActivityId);
    const query = homeParams.toString();
    return { sourceQrId, sourceActivityId, redirectPath: query ? `/?${query}` : "/" };
  }

  return { sourceQrId, sourceActivityId, redirectPath: `${currentUrl.pathname}${currentUrl.search}` };
}

export function LoginRegisterForm({
  compact = false,
  submitText = "登录 / 注册",
  onSuccess,
}: LoginRegisterFormProps) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [loginType, setLoginType] = useState<"wechat" | "phone" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    void hydrateClientAuthFromServer().then((loggedIn) => {
      if (loggedIn) onSuccess?.();
    });
  }, [onSuccess]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  const isPhoneValid = /^1[3-9]\d{9}$/.test(phone);
  const isCodeValid = code.length === 6;
  const canSubmit = isPhoneValid && isCodeValid && agreed && !isLoading;

  const startCountdown = () => {
    setCountdown(60);
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    if (!isPhoneValid || countdown > 0 || isSending) return;
    setError(null);
    setIsSending(true);
    try {
      const result = await sendCode(phone);
      startCountdown();
      // Dev mode: auto-fill verification code when _devCode is present
      if (result._devCode) {
        setCode(result._devCode);
      }
    } catch (err) {
      setError(mapErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  };

  const handlePhoneLogin = async () => {
    if (!canSubmit) return;
    setError(null);
    setLoginType("phone");
    setIsLoading(true);
    try {
      const { sourceQrId, sourceActivityId, redirectPath } = getCurrentAuthContext();
      await loginPhone(phone, code, sourceQrId, sourceActivityId);
      if (onSuccess) {
        onSuccess();
      } else {
        router.replace(redirectPath || "/");
      }
    } catch (err) {
      setError(mapErrorMessage(err));
    } finally {
      setIsLoading(false);
      setLoginType(null);
    }
  };

  const handleWechatLogin = async () => {
    if (!agreed || isLoading) return;
    setLoginType("wechat");
    setIsLoading(true);
    try {
      const currentUrl = new URL(window.location.href);
      const redirectPath = `${currentUrl.pathname}${currentUrl.search}`;
      const sourceQrId = currentUrl.searchParams.get("qr_id") ?? currentUrl.searchParams.get("qr") ?? "";
      const sourceActivityId =
        currentUrl.searchParams.get("activity_id") ?? currentUrl.searchParams.get("activity") ?? "";

      const startUrl = new URL("/api/auth/wechat/start", window.location.origin);
      startUrl.searchParams.set("redirectPath", redirectPath);
      if (sourceQrId) startUrl.searchParams.set("sourceQrId", sourceQrId);
      if (sourceActivityId) startUrl.searchParams.set("sourceActivityId", sourceActivityId);

      window.location.href = startUrl.toString();
      return;
    } catch {
      setError("微信授权发起失败，请稍后重试");
    }
    setIsLoading(false);
    setLoginType(null);
  };

  return (
    <div className={cn("space-y-5", compact && "space-y-4")}>
      {/* 微信授权登录暂未开放，隐藏按钮和分隔线 */}
      {false && (
        <>
          <Button
            className="h-12 w-full rounded-xl bg-[#07C160] text-base font-semibold text-white shadow-sm hover:bg-[#06ad56]"
            disabled={!agreed || isLoading}
            onClick={handleWechatLogin}
          >
            {isLoading && loginType === "wechat" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="mr-2 h-5 w-5" />
            )}
            微信授权登录
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>或使用手机号验证码登录</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor={compact ? "modal-phone" : "login-phone"} className="text-sm font-medium">
            手机号
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={compact ? "modal-phone" : "login-phone"}
              type="tel"
              inputMode="numeric"
              placeholder="请输入手机号"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value.replace(/\D/g, "").slice(0, 11));
                setError(null);
              }}
              className="h-12 rounded-xl pl-10 text-base"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={compact ? "modal-code" : "login-code"} className="text-sm font-medium">
            验证码
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={compact ? "modal-code" : "login-code"}
                type="text"
                inputMode="numeric"
                placeholder="6位验证码"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setError(null);
                }}
                className="h-12 rounded-xl pl-10 text-base tracking-wider"
              />
            </div>
            <Button
              variant="outline"
              className="h-12 min-w-[104px] rounded-xl px-3 text-sm"
              disabled={!isPhoneValid || countdown > 0 || isSending}
              onClick={handleSendCode}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : countdown > 0 ? (
                `${countdown}s`
              ) : (
                "获取验证码"
              )}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <label className="flex items-start gap-2 rounded-xl bg-secondary/50 p-3 text-xs leading-relaxed text-muted-foreground">
        <Checkbox
          checked={agreed}
          onCheckedChange={(checked) => setAgreed(checked === true)}
          className="mt-0.5"
        />
        <span>
          我已阅读并同意
          <button type="button" className="px-0.5 text-primary underline-offset-2 hover:underline">
            《用户协议》
          </button>
          和
          <button type="button" className="px-0.5 text-primary underline-offset-2 hover:underline">
            《隐私政策》
          </button>
        </span>
      </label>

      <Button
        className={cn(
          "h-12 w-full rounded-xl text-base font-semibold",
          canSubmit
            ? "bg-accent text-accent-foreground hover:bg-accent/90"
            : "bg-muted text-muted-foreground"
        )}
        disabled={!canSubmit}
        onClick={handlePhoneLogin}
      >
        {isLoading && loginType === "phone" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            登录中...
          </>
        ) : (
          submitText
        )}
      </Button>

      <div className="flex items-start gap-2 rounded-xl border border-primary/10 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>登录后可查看资料、报告和预约记录。</span>
      </div>

      {!compact && (
        <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
          <div className="rounded-xl bg-card/70 p-2 shadow-sm">
            <CheckCircle2 className="mx-auto mb-1 h-4 w-4 text-primary" />
            沙龙资料
          </div>
          <div className="rounded-xl bg-card/70 p-2 shadow-sm">
            <CheckCircle2 className="mx-auto mb-1 h-4 w-4 text-primary" />
            风险报告
          </div>
          <div className="rounded-xl bg-card/70 p-2 shadow-sm">
            <CheckCircle2 className="mx-auto mb-1 h-4 w-4 text-primary" />
            预约记录
          </div>
        </div>
      )}
    </div>
  );
}
