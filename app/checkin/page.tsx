"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  QrCode,
  RefreshCcw,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LoginModal } from "@/components/mobile/login-modal";
import { getCheckinPage, submitCheckin } from "@/lib/api/checkin";
import { hydrateClientAuthFromServer } from "@/lib/client-auth";
import type { CheckinPageDTO } from "@/lib/contracts/checkin";
import { CHECKIN_WINDOW_STATUS_LABEL } from "@/lib/contracts/checkin";
import { ApiError } from "@/lib/api/client";

function CheckinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrId = searchParams.get("qr_id") ?? searchParams.get("qr");
  const redirectPath = searchParams.get("redirect");
  const activityId = searchParams.get("activity_id") ?? searchParams.get("activity");
  const landingReturnPath = (() => {
    if (redirectPath) return redirectPath;
    const params = new URLSearchParams();
    if (qrId) params.set("qr_id", qrId);
    if (activityId) params.set("activity_id", activityId);
    return params.size > 0 ? `/?${params.toString()}` : "/";
  })();

  const [pageData, setPageData] = useState<CheckinPageDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [checkinCount, setCheckinCount] = useState(0);

  const loadPage = useCallback(async () => {
    if (!qrId) {
      setLoadError("无效的签到码，请重新扫码");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getCheckinPage(qrId);
      setPageData(data);
      setCheckinCount(data.checkinCount);
      if (data.alreadyCheckedIn) setSuccess(true);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "签到信息加载失败，请重试");
    } finally {
      setLoading(false);
    }
  }, [qrId]);

  useEffect(() => {
    void hydrateClientAuthFromServer().then((loggedIn) => {
      setIsLoggedIn(loggedIn);
    });
    void loadPage();
  }, [loadPage]);

  const doCheckin = async () => {
    if (!pageData) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitCheckin(pageData.checkinQrId);
      setCheckinCount(result.checkinCount);
      setSuccess(true);
      // 签到成功后跳回活动落地页（携带 checkedIn=1 标记）
      const redirectUrl = new URL(landingReturnPath, window.location.origin);
      redirectUrl.searchParams.set("checkedIn", "1");
      router.replace(redirectUrl.pathname + redirectUrl.search);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "CHECKIN_ALREADY_DONE") {
          setSuccess(true);
          const redirectUrl = new URL(landingReturnPath, window.location.origin);
          redirectUrl.searchParams.set("checkedIn", "1");
          router.replace(redirectUrl.pathname + redirectUrl.search);
          return;
        }
        setSubmitError(err.message);
      } else {
        setSubmitError("签到失败，请重试");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckinClick = async () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    await doCheckin();
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setShowLoginModal(false);
    void doCheckin();
  };

  // ——— 加载中 ———
  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[390px] flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">正在读取签到信息…</p>
      </div>
    );
  }

  // ——— 加载失败 ———
  if (loadError || !pageData) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[390px] flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-lg font-bold text-foreground">签到码无效</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {loadError ?? "未知错误，请重新扫码"}
        </p>
        <Button variant="outline" className="mt-2 h-11 rounded-xl" onClick={loadPage}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          重新加载
        </Button>
      </div>
    );
  }

  const isWindowOpen = pageData.windowStatus === "open";
  const alreadyDone = success;

  // ——— 签到成功 ———
  if (alreadyDone) {
    return (
      <div className="mx-auto min-h-screen max-w-[390px] bg-background">
        <div className="relative overflow-hidden bg-gradient-to-br from-success via-success/90 to-emerald-600 px-4 pb-10 pt-4 text-white">
          <div className="absolute -right-12 top-6 h-32 w-32 rounded-full bg-white/10" />
          <Button
            variant="ghost"
            size="icon"
            className="mb-6 rounded-full text-white hover:bg-white/10"
            onClick={() => router.push(landingReturnPath)}
            aria-label="返回活动页"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col items-center gap-3 pb-2 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 shadow-inner">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h1 className="text-2xl font-bold">签到成功</h1>
            <p className="text-sm text-white/80">欢迎参加本场活动，祝您收获满满！</p>
          </div>
        </div>

        <div className="-mt-4 space-y-4 px-4">
          <Card className="border-0 shadow-lg">
            <CardContent className="space-y-3 p-5">
              <h2 className="font-semibold text-foreground">{pageData.activityName}</h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                  <span>{pageData.activityDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-primary" />
                  <span>{pageData.activityTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <span>{pageData.activityLocation}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-success/10 px-4 py-3">
                <Users className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-success">
                  已有 {checkinCount} 人完成签到
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12 rounded-xl" onClick={() => {
              const aiUrl = new URL('/tax-ai', window.location.origin);
              if (qrId) aiUrl.searchParams.set('qr_id', qrId);
              if (activityId) aiUrl.searchParams.set('activity_id', activityId);
              router.push(aiUrl.pathname + aiUrl.search);
            }}>
              <Sparkles className="mr-2 h-4 w-4" />AI税务助手
            </Button>
            <Button className="h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => {
              const appointmentUrl = new URL('/appointment', window.location.origin);
              if (qrId) appointmentUrl.searchParams.set('qr_id', qrId);
              if (activityId) appointmentUrl.searchParams.set('activity_id', activityId);
              router.push(appointmentUrl.pathname + appointmentUrl.search);
            }}>
              <CalendarCheck className="mr-2 h-4 w-4" />预约顾问
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ——— 签到主界面 ———
  return (
    <div className="mx-auto min-h-screen max-w-[390px] bg-background pb-28">
      {/* 顶部渐变 */}
      <div className="mobile-safe-hero relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80 px-4 pb-8 pt-4 text-primary-foreground">
        <div className="absolute -right-16 top-8 h-40 w-40 rounded-full bg-white/5" />
        <Button
          variant="ghost"
          size="icon"
          className="mb-5 rounded-full text-white hover:bg-white/10"
          onClick={() => router.back()}
          aria-label="返回"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">活动签到</h1>
            <p className="mt-0.5 text-sm text-white/75">{pageData.activityName}</p>
          </div>
        </div>
      </div>

      <div className="-mt-4 space-y-4 px-4">
        {/* 活动信息卡 */}
        <Card className="border-0 shadow-lg">
          <CardContent className="space-y-3 p-5">
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                <span>{pageData.activityDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-primary" />
                <span>{pageData.activityTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span>{pageData.activityLocation}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-secondary/60 px-4 py-2.5">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                已签到 <strong className="text-foreground">{checkinCount}</strong> 人
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 窗口未开放提示 */}
        {!isWindowOpen && (
          <Card className={cn(
            "border shadow-sm",
            pageData.windowStatus === "not_started" && "border-warning/30 bg-warning/5",
            (pageData.windowStatus === "ended" || pageData.windowStatus === "force_closed") && "border-muted bg-muted/30",
          )}>
            <CardContent className="flex items-start gap-3 p-4">
              <AlertCircle className={cn(
                "mt-0.5 h-5 w-5 shrink-0",
                pageData.windowStatus === "not_started" ? "text-warning" : "text-muted-foreground",
              )} />
              <div>
                <p className="font-semibold text-foreground">
                  {CHECKIN_WINDOW_STATUS_LABEL[pageData.windowStatus]}
                </p>
                {pageData.windowStatus === "not_started" && pageData.windowOpenAt && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    签到开放时间：{new Date(pageData.windowOpenAt).toLocaleString("zh-CN", {
                      month: "long", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                      timeZone: "Asia/Shanghai",
                    })}
                  </p>
                )}
                {pageData.windowStatus === "ended" && (
                  <p className="mt-1 text-sm text-muted-foreground">本场活动签到已关闭</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 错误提示 */}
        {submitError && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {submitError}
          </div>
        )}
      </div>

      {/* 底部签到按钮 */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 p-4 shadow-lg backdrop-blur">
        <div className="mx-auto max-w-[390px]">
          <Button
            className={cn(
              "h-13 w-full rounded-xl text-base font-semibold",
              isWindowOpen
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "cursor-not-allowed bg-muted text-muted-foreground",
            )}
            disabled={!isWindowOpen || submitting}
            onClick={handleCheckinClick}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                签到中…
              </>
            ) : isWindowOpen ? (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                {isLoggedIn ? "立即签到" : "登录后签到"}
              </>
            ) : (
              CHECKIN_WINDOW_STATUS_LABEL[pageData.windowStatus]
            )}
          </Button>
          {isWindowOpen && !isLoggedIn && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              需要手机号登录后完成签到
            </p>
          )}
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

export default function CheckinPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-screen max-w-[390px] flex-col items-center justify-center gap-4 bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">正在读取签到信息…</p>
        </div>
      }
    >
      <CheckinContent />
    </Suspense>
  );
}
