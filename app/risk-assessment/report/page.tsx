"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookmarkCheck,
  CalendarCheck,
  CheckCircle2,
  FileLock2,
  FileText,
  LockKeyhole,
  Radar,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoginModal } from "@/components/mobile/login-modal";
import { cn } from "@/lib/utils";

type RiskLevel = "低风险" | "中风险" | "高风险" | "严重风险";

const modules = [
  {
    name: "发票合规风险",
    score: 76,
    desc: "存在部分发票资料链条不完整，建议核查合同、交付证明与发票内容一致性。",
    advice: "优先补齐大额发票对应的合同、验收、付款和业务说明。",
  },
  {
    name: "公转私风险",
    score: 82,
    desc: "存在较高频率公户转个人账户场景，需确认用途和凭证留存情况。",
    advice: "对股东借款、备用金、个人供应商付款建立审批和归档规则。",
  },
  {
    name: "个税社保风险",
    score: 58,
    desc: "员工社保、个税申报与工资发放存在一定一致性风险。",
    advice: "核对工资表、银行流水、个税申报和社保基数是否匹配。",
  },
  {
    name: "成本费用风险",
    score: 69,
    desc: "部分费用真实性证明材料不足，可能影响企业所得税税前扣除。",
    advice: "重点梳理咨询费、会议费、推广费等费用的业务证明。",
  },
  {
    name: "税务稽查应对风险",
    score: 72,
    desc: "资料归档和检查应对机制仍需完善，建议提前建立风险说明底稿。",
    advice: "建立年度税务资料归档清单，保留异常事项说明。",
  },
];

function getRiskLevel(score: number): RiskLevel {
  if (score >= 85) return "严重风险";
  if (score >= 65) return "高风险";
  if (score >= 35) return "中风险";
  return "低风险";
}

function getRiskStyle(level: RiskLevel) {
  if (level === "低风险") {
    return {
      text: "text-success",
      bg: "bg-success/10",
      border: "border-success/20",
      ring: "#16a34a",
    };
  }

  if (level === "中风险") {
    return {
      text: "text-warning",
      bg: "bg-warning/10",
      border: "border-warning/20",
      ring: "#f59e0b",
    };
  }

  if (level === "高风险") {
    return {
      text: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200",
      ring: "#ea580c",
    };
  }

  return {
    text: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/20",
    ring: "#dc2626",
  };
}

function RiskReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const score = Math.min(
    100,
    Math.max(0, Number(searchParams.get("score") ?? 72))
  );
  const level = getRiskLevel(score);
  const style = getRiskStyle(level);
  const circumference = 2 * Math.PI * 48;
  const offset = circumference - (score / 100) * circumference;
  const highRisk = level === "高风险" || level === "严重风险";

  const moduleList = useMemo(
    () =>
      modules.map((item) => {
        const itemLevel = getRiskLevel(item.score);

        return {
          ...item,
          level: itemLevel,
          style: getRiskStyle(itemLevel),
        };
      }),
    []
  );

  const handleUnlock = () => {
    if (isUnlocked) return;
    setShowLoginModal(true);
  };

  return (
    <div className="mx-auto min-h-screen max-w-[390px] bg-background pb-28">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80 px-4 pb-8 pt-4 text-primary-foreground">
        <div className="absolute -right-16 top-10 h-40 w-40 rounded-full border border-white/15" />
        <div className="absolute bottom-8 right-10 h-16 w-16 rounded-full bg-accent/20 blur-sm" />

        <Button
          variant="ghost"
          size="icon"
          className="mb-5 rounded-full text-white hover:bg-white/10 hover:text-white"
          onClick={() => router.push("/risk-assessment/quiz")}
          aria-label="返回答题页"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="relative">
          <Badge className="mb-3 bg-accent text-accent-foreground hover:bg-accent/90">
            体检报告
          </Badge>
          <h1 className="text-2xl font-bold">企业财税风险初步报告</h1>
          <p className="mt-2 text-sm text-white/75">
            基础报告免费展示，完整报告需登录查看
          </p>
        </div>
      </div>

      <div className="-mt-5 space-y-4 px-4">
        <Card className={cn("border shadow-xl shadow-primary/10", style.border)}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">综合风险分数</p>
                <div className="mt-1 flex items-end gap-1">
                  <span className={cn("text-4xl font-bold", style.text)}>
                    {score}
                  </span>
                  <span className="pb-1 text-sm text-muted-foreground">分</span>
                </div>
                <div
                  className={cn(
                    "mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold",
                    style.bg,
                    style.text
                  )}
                >
                  {level}
                </div>
              </div>

              <div className="relative h-28 w-28">
                <svg className="h-28 w-28 -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    className="text-secondary"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke={style.ring}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Radar className={cn("h-6 w-6", style.text)} />
                  <span className="mt-1 text-xs text-muted-foreground">
                    风险体检
                  </span>
                </div>
              </div>
            </div>

            {highRisk && (
              <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm leading-relaxed text-orange-700">
                当前风险较高，建议预约顾问进行一对一解读，优先确认高风险事项的处理口径。
              </div>
            )}

            {highRisk && (
              <Button
                className="mt-4 h-11 w-full rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => router.push("/appointment")}
              >
                <CalendarCheck className="mr-2 h-4 w-4" />
                预约顾问解读
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-foreground">主要风险模块</h2>
              <Badge variant="outline" className="border-primary/20 text-primary">
                5 项重点
              </Badge>
            </div>

            <div className="space-y-3">
              {moduleList.map((item) => (
                <div
                  key={item.name}
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-foreground">{item.name}</h3>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-1 text-xs font-semibold",
                        item.style.bg,
                        item.style.text
                      )}
                    >
                      {item.level}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                  <div className="mt-3 rounded-xl bg-secondary/60 p-3 text-sm leading-relaxed text-foreground">
                    <span className="font-semibold">初步建议：</span>
                    {item.advice}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/15 bg-primary/5 shadow-sm">
          <CardContent className="p-4">
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <FileLock2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">解锁完整报告</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  解锁完整报告，查看详细风险说明和整改建议。
                </p>
              </div>
            </div>

            <Button
              className="h-11 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleUnlock}
            >
              {isUnlocked ? (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              ) : (
                <LockKeyhole className="mr-2 h-4 w-4" />
              )}
              {isUnlocked ? "已解锁完整报告" : "手机号登录查看完整报告"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="space-y-3 p-4">
            <Button
              variant="outline"
              className="h-11 w-full rounded-xl"
              onClick={() => setIsSaved(true)}
            >
              <BookmarkCheck className="mr-2 h-4 w-4" />
              {isSaved ? "已保存到我的报告" : "保存到我的报告"}
            </Button>

            <Button
              className="h-11 w-full rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => router.push("/appointment")}
            >
              <CalendarCheck className="mr-2 h-4 w-4" />
              预约顾问解读
            </Button>
          </CardContent>
        </Card>

        <div className="rounded-2xl bg-muted/70 p-3 text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">免责声明：</span>
          本报告由系统根据测评答案生成，仅作为初步风险识别，不构成正式税务意见。具体处理方案需结合企业实际情况，并由专业税务顾问进一步确认。
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 p-4 shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-[390px] gap-3">
          <Button
            variant="outline"
            className="h-12 flex-1 rounded-xl"
            onClick={handleUnlock}
          >
            <FileText className="mr-2 h-4 w-4" />
            完整报告
          </Button>

          <Button
            className="h-12 flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => router.push("/appointment")}
          >
            <ShieldAlert className="mr-2 h-4 w-4" />
            顾问解读
          </Button>
        </div>
      </div>

      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        onSuccess={() => setIsUnlocked(true)}
      />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto min-h-screen max-w-[390px] bg-background p-6 text-sm text-muted-foreground">
          正在加载风险报告...
        </div>
      }
    >
      <RiskReportContent />
    </Suspense>
  );
}