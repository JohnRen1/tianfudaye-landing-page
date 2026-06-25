"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoginRegisterForm } from "./login-register-form";
import { hydrateClientAuthFromServer } from "@/lib/client-auth";

interface LoginPageProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export function LoginPage({ onBack, onSuccess }: LoginPageProps) {
  const router = useRouter();

  useEffect(() => {
    void hydrateClientAuthFromServer().then((loggedIn) => {
      if (loggedIn) {
        onSuccess?.();
        router.replace("/");
      }
    });
  }, [onSuccess, router]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-primary/10 via-background to-secondary/40 px-4 pb-8 pt-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-br from-primary via-primary/90 to-primary/70" />
      <div className="pointer-events-none absolute -right-20 top-10 h-44 w-44 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute left-8 top-32 h-16 w-16 rounded-full bg-accent/30 blur-sm" />

      <div className="relative z-10">
        <div className="mb-6 flex h-10 items-center">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-white hover:bg-white/10 hover:text-white"
            onClick={onBack}
            aria-label="返回"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        <div className="mb-6 text-white">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 shadow-inner backdrop-blur">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-balance">
            AI 财税体检助手
          </h1>
          <p className="mt-2 max-w-[300px] text-sm leading-relaxed text-white/78">
            领取沙龙资料，获取企业财税风险初步诊断
          </p>
        </div>

        <Card className="border-0 bg-card/95 shadow-xl shadow-primary/10 backdrop-blur">
          <CardContent className="p-5">
            <LoginRegisterForm submitText="登录 / 注册" onSuccess={onSuccess} />
          </CardContent>
        </Card>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur">
            <FileText className="mb-2 h-5 w-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">领取沙龙资料</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              课件、合规清单和风险自查表统一查看。
            </p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur">
            <Sparkles className="mb-2 h-5 w-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">查看风险报告</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              登录后保存诊断结果和预约记录。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
