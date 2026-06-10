"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, LockKeyhole, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface LoginRegisterFormProps {
  compact?: boolean;
  submitText?: string;
  onSuccess?: () => void;
}

export function LoginRegisterForm({
  compact = false,
  submitText = "登录 / 注册",
  onSuccess,
}: LoginRegisterFormProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginType, setLoginType] = useState<"wechat" | "phone" | null>(null);

  const isPhoneValid = phone.length === 11;
  const isCodeValid = code.length === 6;
  const canSubmit = isPhoneValid && isCodeValid && agreed && !isLoading;

  const startCountdown = () => {
    setCountdown(60);
    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = () => {
    if (!isPhoneValid || countdown > 0) return;
    startCountdown();
  };

  const handlePhoneLogin = async () => {
    if (!canSubmit) return;
    setLoginType("phone");
    setIsLoading(true);
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    setIsLoading(false);
    setLoginType(null);
    onSuccess?.();
  };

  const handleWechatLogin = async () => {
    if (!agreed || isLoading) return;
    setLoginType("wechat");
    setIsLoading(true);
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    setIsLoading(false);
    setLoginType(null);
    onSuccess?.();
  };

  return (
    <div className={cn("space-y-5", compact && "space-y-4")}>
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
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 11))}
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
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-12 rounded-xl pl-10 text-base tracking-wider"
              />
            </div>
            <Button
              variant="outline"
              className="h-12 min-w-[104px] rounded-xl px-3 text-sm"
              disabled={!isPhoneValid || countdown > 0}
              onClick={handleSendCode}
            >
              {countdown > 0 ? `${countdown}s` : "获取验证码"}
            </Button>
          </div>
        </div>
      </div>

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
