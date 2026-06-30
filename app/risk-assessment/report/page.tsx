"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BookmarkCheck,
  CalendarCheck,
  CheckCircle2,
  FileLock2,
  FileText,
  Loader2,
  LockKeyhole,
  Radar,
  RefreshCcw,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoginModal } from "@/components/mobile/login-modal";
import { cn } from "@/lib/utils";
import { getReport, unlockReport, saveReport } from "@/lib/api/assessment";
import { RISK_LEVEL_LABEL } from "@/lib/contracts/shared";
import type { AssessmentReportPublicDTO } from "@/lib/contracts/assessment";
import type { RiskLevel } from "@/lib/contracts/shared";
import { getClientAuthToken, hydrateClientAuthFromServer } from "@/lib/client-auth";

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

function getRiskStyle(level: RiskLevel) {
  switch (level) {
    case "low":
      return {
        text: "text-success",
        bg: "bg-success/10",
        border: "border-success/20",
        ring: "#16a34a",
      };
    case "medium":
      return {
        text: "text-warning",
        bg: "bg-warning/10",
        border: "border-warning/20",
        ring: "#f59e0b",
      };
    case "high":
      return {
        text: "text-orange-600",
        bg: "bg-orange-50",
        border: "border-orange-200",
        ring: "#ea580c",
      };
    case "critical":
      return {
        text: "text-destructive",
        bg: "bg-destructive/10",
        border: "border-destructive/20",
        ring: "#dc2626",
      };
  }
}

// ---------------------------------------------------------------------------
// Main report content (wrapped in Suspense by Page)
// ---------------------------------------------------------------------------

function RiskReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = searchParams.get("id") ?? "";

  // Remote state
  const [report, setReport] = useState<AssessmentReportPublicDTO | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Action state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // -------------------------------------------------------------------------
  // Load report
  // -------------------------------------------------------------------------
  const fetchReport = useCallback(async () => {
    if (!reportId) {
      setLoadError("报告 ID 缺失，请重新完成测评");
      setLoadingReport(false);
      return;
    }
    setLoadingReport(true);
    setLoadError(null);
    try {
      const data = await getReport(reportId);
      setReport(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "报告加载失败，请重试");
    } finally {
      setLoadingReport(false);
    }
  }, [reportId]);

  useEffect(() => {
    void hydrateClientAuthFromServer().then((loggedIn) => {
      if (loggedIn) setIsLoggedIn(true);
    });
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // -------------------------------------------------------------------------
  // Unlock
  // -------------------------------------------------------------------------
  const handleUnlock = async () => {
    if (!report || report.isUnlocked) return;
    const token = getClientAuthToken();
    if (!token && !(await hydrateClientAuthFromServer())) {
      setShowLoginModal(true);
      return;
    }
    setIsLoggedIn(true);
    doUnlock();
  };

  const handleFullReportClick = async () => {
    if (!report) return;
    if (report.isUnlocked) {
      document.getElementById("full-report-suggestions")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }
    await handleUnlock();
  };

  const doUnlock = async () => {
    setUnlocking(true);
    setUnlockError(null);
    try {
      const result = await unlockReport(reportId);
      setReport(result.report);
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : "解锁失败，请重试");
    } finally {
      setUnlocking(false);
    }
  };

  // Called after successful login in modal
  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setShowLoginModal(false);
    doUnlock();
  };

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------
  const handleSave = async () => {
    if (!report || report.isSaved || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveReport(reportId);
      setReport((prev) => (prev ? { ...prev, isSaved: true } : prev));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Loading / error states
  // -------------------------------------------------------------------------
  if (loadingReport) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[390px] flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">正在加载风险报告…</p>
      </div>
    );
  }

  if (loadError || !report) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[390px] flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="font-semibold text-foreground">报告加载失败</p>
        <p className="text-sm text-muted-foreground">
          {loadError ?? "未知错误"}
        </p>
        <Button
          variant="outline"
          className="mt-2 h-11 rounded-xl"
          onClick={fetchReport}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          重新加载
        </Button>
        <Button
          variant="ghost"
          className="h-11 rounded-xl text-sm"
          onClick={() => router.push("/risk-assessment/quiz")}
        >
          重新测评
        </Button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Derived display values
  // -------------------------------------------------------------------------
  const { score, riskLevel, modules, isUnlocked, isSaved, suggestions } =
    report;
  const style = getRiskStyle(riskLevel);
  const levelLabel = RISK_LEVEL_LABEL[riskLevel];
  const circumference = 2 * Math.PI * 48;
  const offset = circumference - (score / 100) * circumference;
  const highRisk = riskLevel === "high" || riskLevel === "critical";

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="mx-auto min-h-screen max-w-[390px] bg-background pb-28">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80 px-4 pb-8 pt-4 text-primary-foreground">
        <div className="absolute -right-16 top-10 h-40 w-40 rounded-full border border-white/15" />
        <div className="absolute bottom-8 right-10 h-16 w-16 rounded-full bg-accent/20 blur-sm" />

        <Button
          variant="ghost"
          size="icon"
          className="mb-5 rounded-full text-white hover:bg-white/10 hover:text-white"
          onClick={() => router.push("/")}
          aria-label="返回落地页主页"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="relative">
          <Badge className="mb-3 bg-accent text-accent-foreground hover:bg-accent/90">
            体检报告
          </Badge>
          <h1 className="text-2xl font-bold">企业财税风险初步报告</h1>
          <p className="mt-2 text-sm text-white/75">
            {isLoggedIn ? "已进入联调登录态，可直接查看完整报告能力。" : "基础报告免费展示，完整报告需登录查看"}
          </p>
        </div>
      </div>

      <div className="-mt-5 space-y-4 px-4">
        {/* Score card */}
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
                  {levelLabel}
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

        {/* Module cards */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-foreground">主要风险模块</h2>
              <Badge variant="outline" className="border-primary/20 text-primary">
                {modules.length} 项重点
              </Badge>
            </div>

            <div className="space-y-3">
              {modules.map((item) => {
                const itemStyle = getRiskStyle(item.riskLevel);
                const itemLabel = RISK_LEVEL_LABEL[item.riskLevel];
                return (
                  <div
                    key={item.moduleKey}
                    className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-foreground">
                        {item.moduleName}
                      </h3>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-1 text-xs font-semibold",
                          itemStyle.bg,
                          itemStyle.text
                        )}
                      >
                        {itemLabel}
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
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Suggestions (visible only when unlocked) */}
        {isUnlocked && suggestions && suggestions.length > 0 && (
          <Card id="full-report-suggestions" className="scroll-mt-24 border-success/20 bg-success/5 shadow-sm">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <h2 className="font-semibold text-foreground">完整整改建议</h2>
              </div>
              <ul className="space-y-2">
                {suggestions.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm leading-relaxed text-foreground"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-xs font-bold text-success">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Unlock card (hidden once unlocked) */}
        {!isUnlocked && (
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

              {unlockError && (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {unlockError}
                </div>
              )}

              <Button
                className="h-11 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={unlocking}
                onClick={handleUnlock}
              >
                {unlocking ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LockKeyhole className="mr-2 h-4 w-4" />
                )}
                {unlocking ? "解锁中…" : isLoggedIn ? "查看完整报告" : "手机号登录查看完整报告"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Save & appointment */}
        <Card className="border-0 shadow-sm">
          <CardContent className="space-y-3 p-4">
            {saveError && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {saveError}
              </div>
            )}

            <Button
              variant="outline"
              className="h-11 w-full rounded-xl"
              disabled={isSaved || saving}
              onClick={handleSave}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <BookmarkCheck className="mr-2 h-4 w-4" />
              )}
              {isSaved ? "已保存到我的报告" : saving ? "保存中…" : "保存到我的报告"}
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

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 p-4 shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-[390px] gap-3">
          <Button
            variant="outline"
            className="h-12 flex-1 rounded-xl"
            disabled={unlocking}
            onClick={handleFullReportClick}
          >
            {isUnlocked ? (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            {isUnlocked ? "已解锁报告" : "完整报告"}
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
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-screen max-w-[390px] flex-col items-center justify-center gap-4 bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">正在加载风险报告…</p>
        </div>
      }
    >
      <RiskReportContent />
    </Suspense>
  );
}
