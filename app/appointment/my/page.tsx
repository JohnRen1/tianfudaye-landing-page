"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck,
  Clock3,
  Loader2,
  MessageSquareText,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMyAppointments } from "@/lib/api/appointments";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_TOPIC_LABEL,
  APPOINTMENT_TYPE_LABEL,
  APPOINTMENT_TYPE_TONE,
  type AppointmentMySummaryDTO,
  type AppointmentStatus,
} from "@/lib/contracts/appointment";
import { hydrateClientAuthFromServer } from "@/lib/client-auth";
import { buildPathWithTracking } from "@/lib/tracking-context";

function getStatusTone(status: AppointmentStatus) {
  switch (status) {
    case "confirmed":
      return "bg-primary/10 text-primary";
    case "completed":
      return "bg-success/10 text-success";
    case "cancelled":
      return "bg-muted text-muted-foreground";
    case "pending":
    default:
      return "bg-warning/10 text-warning";
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("zh-CN", { hour12: false });
}

function AppointmentMyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<AppointmentMySummaryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const loggedIn = await hydrateClientAuthFromServer();
        if (!loggedIn) {
          router.replace("/login");
          return;
        }
        const data = await getMyAppointments();
        setItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "预约记录加载失败，请稍后重试");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [router]);

  return (
    <div className="mx-auto min-h-screen max-w-[390px] bg-background pb-24">
      <div className="mobile-safe-hero relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80 px-4 pb-8 pt-4 text-primary-foreground">
        <div className="absolute -right-16 top-8 h-36 w-36 rounded-full bg-white/10" />
        <Button
          variant="ghost"
          size="icon"
          className="mb-6 rounded-full text-white hover:bg-white/10 hover:text-white"
          onClick={() => router.back()}
          aria-label="返回"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 shadow-inner">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">我的预约</h1>
            <p className="mt-1 text-sm text-white/78">查看顾问预约进度与联系安排。</p>
          </div>
        </div>
      </div>

      <div className="-mt-4 px-4">
        <Card className="border-0 shadow-lg shadow-primary/10">
          <CardContent className="p-4">
            {loading ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                正在加载预约记录...
              </div>
            ) : error ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" className="rounded-xl" onClick={() => router.refresh()}>
                  重新加载
                </Button>
              </div>
            ) : items.length === 0 ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
                <CalendarCheck className="h-8 w-8 text-primary" />
                <p className="text-sm text-muted-foreground">当前还没有预约记录，先去提交一次预约吧。</p>
                <Button className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => router.push(buildPathWithTracking("/appointment", searchParams))}>
                  去预约顾问
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <Card key={item.id} className="border border-border/70 shadow-sm">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="mb-1 flex items-center gap-2">
                            <Badge className={APPOINTMENT_TYPE_TONE[item.appointmentType]}>
                              {APPOINTMENT_TYPE_LABEL[item.appointmentType]}
                            </Badge>
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {APPOINTMENT_TOPIC_LABEL[item.topic]}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            提交于 {formatDateTime(item.createdAt)}
                          </p>
                        </div>
                        <Badge className={getStatusTone(item.status)}>
                          {APPOINTMENT_STATUS_LABEL[item.status]}
                        </Badge>
                      </div>

                      <div className="rounded-xl bg-secondary/60 p-3 text-sm leading-relaxed text-muted-foreground">
                        {item.descriptionSummary || "暂无问题描述"}
                      </div>

                      <div className="grid gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <UserRound className="h-4 w-4 text-primary" />
                          <span>顾问：{item.advisorName ?? "待分配"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-primary" />
                          <span>联系时间：{item.scheduledAt ? formatDateTime(item.scheduledAt) : "待确认"}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <MessageSquareText className="mt-0.5 h-4 w-4 text-primary" />
                          <span className="break-all text-xs">预约编号：{item.id}</span>
                        </div>
                      </div>
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

export default function AppointmentMyPage() {
  return (
    <Suspense>
      <AppointmentMyPageContent />
    </Suspense>
  );
}
