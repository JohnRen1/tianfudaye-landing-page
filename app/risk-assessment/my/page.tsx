"use client";
import { PageLoadingState } from '@/components/mobile/page-loading-state';

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ClipboardList,
  FileSearch,
  Loader2,
  Radar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMyReports } from "@/lib/api/assessment";
import { hydrateClientAuthFromServer } from "@/lib/client-auth";
import type { UserMeAssessmentSummaryDTO } from "@/lib/contracts/auth";
import { RISK_LEVEL_LABEL, type RiskLevel } from "@/lib/contracts/shared";
import { buildPathWithTracking } from "@/lib/tracking-context";
import { cn } from "@/lib/utils";

function isSafeInternalPath(value: string | null): value is string {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\"));
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间待确认";
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getRiskTone(level: RiskLevel): string {
  switch (level) {
    case "low":
      return "bg-success/10 text-success";
    case "medium":
      return "bg-warning/10 text-warning";
    case "high":
      return "bg-orange-50 text-orange-600";
  }
}

function MyReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fallbackBackPath = buildPathWithTracking("/", searchParams);
  const requestedBackPath = searchParams.get("returnTo");
  const backPath = isSafeInternalPath(requestedBackPath) ? requestedBackPath : fallbackBackPath;
  const currentPath = `/risk-assessment/my${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const assessmentPath = buildPathWithTracking("/risk-assessment", searchParams);
  const [reports, setReports] = useState<UserMeAssessmentSummaryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadReports() {
      setLoading(true);
      setError(null);
      try {
        const loggedIn = await hydrateClientAuthFromServer();
        if (!active) return;
        if (!loggedIn) {
          setError('尚未确认登录状态，请登录后重新加载报告');
          return;
        }
        const data = await getMyReports();
        if (active) setReports(data);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "报告列表加载失败，请稍后重试");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadReports();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  function openReport(reportId: string) {
    const url = new URL(buildPathWithTracking("/risk-assessment/report", searchParams), "https://local.invalid");
    url.searchParams.set("id", reportId);
    url.searchParams.set("returnTo", currentPath);
    router.push(`${url.pathname}${url.search}`);
  }

  return (
    <div className="relative mx-auto min-h-screen max-w-[390px] bg-background pb-10">
      <div className="mobile-safe-hero relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80 px-4 pb-8 pt-4 text-primary-foreground">
        <div className="absolute -right-16 top-8 h-36 w-36 rounded-full bg-white/10" />
        <Button
          variant="ghost"
          size="icon"
          className="mb-6 rounded-full text-white hover:bg-white/10 hover:text-white"
          onClick={() => router.replace(backPath)}
          aria-label="返回"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 shadow-inner">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">我的报告</h1>
            <p className="mt-1 text-sm text-white/78">查看已保存的财税风险体检结果。</p>
          </div>
        </div>
      </div>

      <div className="-mt-4 px-4">
        <Card className="border-0 shadow-lg shadow-primary/10">
          <CardContent className="p-4">
            {loading && <PageLoadingState message="正在加载我的报告…" variant="center" />}
            {loading && reports.length === 0 ? null : error ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" className="rounded-xl" onClick={() => setReloadKey((value) => value + 1)}>
                  重新加载
                </Button>
              </div>
            ) : reports.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
                <FileSearch className="h-9 w-9 text-primary" />
                <div>
                  <p className="font-medium text-foreground">还没有保存的报告</p>
                  <p className="mt-1 text-sm text-muted-foreground">完成一次财税风险体检后，可将报告保存到这里。</p>
                </div>
                <Button className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => router.push(assessmentPath)}>
                  开始风险体检
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <Card key={report.id} className="border border-border/70 shadow-sm">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Radar className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">财税风险体检报告</p>
                            <p className="mt-1 text-xs text-muted-foreground">{formatDate(report.completedAt)}</p>
                          </div>
                        </div>
                        <Badge className={cn("shrink-0", getRiskTone(report.riskLevel))}>
                          {RISK_LEVEL_LABEL[report.riskLevel]}
                        </Badge>
                      </div>

                      <div className="flex items-end justify-between rounded-xl bg-secondary/60 p-3">
                        <div>
                          <p className="text-xs text-muted-foreground">综合风险分数</p>
                          <p className="mt-1 text-2xl font-bold text-foreground">{report.score}<span className="ml-1 text-sm font-normal text-muted-foreground">分</span></p>
                        </div>
                        <p className="max-w-[190px] text-right text-xs leading-relaxed text-muted-foreground">
                          {report.modules.length > 0 ? report.modules.join("、") : "暂无重点风险模块"}
                        </p>
                      </div>

                      <Button className="h-11 w-full rounded-xl" onClick={() => openReport(report.id)}>
                        查看报告
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function MyReportsPage() {
  return (
    <Suspense>
      <MyReportsContent />
    </Suspense>
  );
}
