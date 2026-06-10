"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Building2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileCheck2,
  FileWarning,
  Landmark,
  PieChart,
  Radar,
  ReceiptText,
  ShieldCheck,
  Siren,
  Users,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const valueItems = [
  "识别发票合规风险",
  "识别公转私风险",
  "识别企业所得税风险",
  "识别个税社保风险",
  "获取初步整改建议",
];

const dimensions = [
  { title: "企业基础信息", icon: Building2, color: "bg-primary/10 text-primary" },
  { title: "发票合规", icon: ReceiptText, color: "bg-success/10 text-success" },
  { title: "公转私", icon: WalletCards, color: "bg-warning/10 text-warning" },
  { title: "所得税", icon: Landmark, color: "bg-primary/10 text-primary" },
  { title: "增值税", icon: FileCheck2, color: "bg-success/10 text-success" },
  { title: "个税社保", icon: Users, color: "bg-warning/10 text-warning" },
  { title: "成本费用", icon: ClipboardCheck, color: "bg-primary/10 text-primary" },
  { title: "税务稽查应对", icon: Siren, color: "bg-destructive/10 text-destructive" },
];

export function RiskAssessmentStartPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80 px-4 pb-8 pt-4 text-primary-foreground">
        <div className="absolute -right-20 top-8 h-44 w-44 rounded-full border border-white/15" />
        <div className="absolute -right-10 top-18 h-28 w-28 rounded-full border border-white/20" />
        <div className="absolute bottom-8 right-12 h-16 w-16 rounded-full bg-accent/20 blur-sm" />
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="mb-6 rounded-full text-white hover:bg-white/10 hover:text-white"
            onClick={() => router.push("/")}
            aria-label="返回落地页"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 shadow-inner backdrop-blur">
              <Radar className="h-7 w-7" />
            </div>
            <div>
              <Badge className="mb-2 bg-accent text-accent-foreground hover:bg-accent/90">
                风险体检
              </Badge>
              <h1 className="text-2xl font-bold tracking-tight">企业财税风险测评</h1>
            </div>
          </div>

          <p className="max-w-[300px] text-sm leading-relaxed text-white/80">
            3-5 分钟完成，获取企业风险初步报告
          </p>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
              <PieChart className="mb-2 h-5 w-5 text-accent" />
              <p className="text-lg font-bold">8项</p>
              <p className="text-xs text-white/70">测评维度</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
              <Clock className="mb-2 h-5 w-5 text-accent" />
              <p className="text-lg font-bold">3-5</p>
              <p className="text-xs text-white/70">分钟完成</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
              <FileWarning className="mb-2 h-5 w-5 text-accent" />
              <p className="text-lg font-bold">报告</p>
              <p className="text-xs text-white/70">初步建议</p>
            </div>
          </div>
        </div>
      </div>

      <div className="-mt-4 space-y-4 px-4">
        <Card className="border-0 shadow-lg shadow-primary/10">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">测评价值</h2>
            </div>
            <div className="space-y-2">
              {valueItems.map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-xl bg-secondary/60 p-3 text-sm text-foreground">
                  <BadgeCheck className="h-4 w-4 shrink-0 text-success" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">测评维度</h2>
              </div>
              <Badge variant="outline" className="border-primary/20 text-primary">
                体检报告感
              </Badge>
            </div>
            <div className="relative mb-4 rounded-2xl bg-gradient-to-br from-primary/8 to-secondary p-4">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-primary/15 bg-card shadow-inner">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/20 bg-primary/5">
                  <Radar className="h-9 w-9 text-primary" />
                </div>
              </div>
              <div className="absolute left-5 top-5 h-2 w-2 rounded-full bg-success" />
              <div className="absolute right-8 top-8 h-2 w-2 rounded-full bg-warning" />
              <div className="absolute bottom-7 left-10 h-2 w-2 rounded-full bg-destructive" />
              <p className="mt-3 text-center text-xs text-muted-foreground">
                从多维度扫描企业常见财税风险点
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {dimensions.map((dimension) => {
                const Icon = dimension.icon;
                return (
                  <div key={dimension.title} className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${dimension.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{dimension.title}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="rounded-2xl border border-warning/20 bg-warning/10 p-3 text-xs leading-relaxed text-warning">
          测评结果仅作为初步风险识别，不构成正式税务意见。
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 p-4 shadow-lg backdrop-blur">
        <div className="mx-auto max-w-[390px]">
          <div className="mb-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            预计耗时：约 3-5 分钟
          </div>
          <Button
            className="h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-foreground hover:bg-accent/90"
            onClick={() => router.push("/risk-assessment/quiz")}
          >
            开始测评
            <ChevronRight className="ml-1 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
