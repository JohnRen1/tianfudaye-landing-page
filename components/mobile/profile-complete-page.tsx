"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, BriefcaseBusiness, CheckCircle2, ChevronDown, Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { me, updateProfile } from "@/lib/api/auth";
import { hydrateClientAuthFromServer } from "@/lib/client-auth";

const INDUSTRY_OPTIONS = [
  "制造业",
  "批发零售",
  "互联网/软件",
  "建筑工程",
  "房地产",
  "餐饮服务",
  "教育培训",
  "医疗健康",
  "专业服务",
  "其他",
];

const CONTACT_TIME_OPTIONS = [
  "工作日 09:00 - 12:00",
  "工作日 14:00 - 18:00",
  "工作日 18:00 - 20:00",
  "周末方便联系",
];

function getSafeRedirect(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/materials";
  return value;
}

export function ProfileCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = useMemo(() => getSafeRedirect(searchParams.get("redirect")), [searchParams]);
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [contactTime, setContactTime] = useState("");
  const [wechat, setWechat] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void hydrateClientAuthFromServer().then(async (loggedIn) => {
      if (!loggedIn) {
        const currentPath = `/profile/complete?redirect=${encodeURIComponent(redirectPath)}`;
        router.replace(`/login?redirectPath=${encodeURIComponent(currentPath)}`);
        return;
      }

      try {
        const user = await me();
        setCompany(user.company ?? "");
        setIndustry(user.industry ?? "");
        setContactTime(user.size ?? "");
      } catch {
        setError("用户信息加载失败，请重新登录后再试");
      } finally {
        setLoading(false);
      }
    });
  }, [redirectPath, router]);

  const handleSubmit = async () => {
    if (!company.trim()) {
      setError("请填写企业名称");
      return;
    }
    if (!industry) {
      setError("请选择所属行业");
      return;
    }
    if (!contactTime) {
      setError("请选择方便联系时间");
      return;
    }

    setError("");
    setSaving(true);
    try {
      await updateProfile({
        company: company.trim(),
        industry,
        size: contactTime,
        ...(wechat.trim() ? { identity: `微信号：${wechat.trim()}` } : {}),
      });
      router.replace(redirectPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "企业信息保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80 px-4 pb-7 pt-4 text-primary-foreground">
        <div className="absolute -right-16 top-8 h-36 w-36 rounded-full border border-white/15" />
        <div className="absolute bottom-5 right-10 h-14 w-14 rounded-full bg-accent/25 blur-sm" />
        <div className="relative">
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
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 shadow-inner backdrop-blur">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm text-white/75">领取加密资料前</p>
              <h1 className="text-2xl font-bold tracking-tight">补充企业信息</h1>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            仅用于资料领取、顾问联系和风险服务匹配，不会公开展示。
          </p>
        </div>
      </div>

      <div className="-mt-4 px-4">
        <Card className="border-0 shadow-lg shadow-primary/10">
          <CardContent className="space-y-5 p-4">
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">正在加载企业信息...</div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-sm font-medium">
                    企业名称 <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="company"
                      value={company}
                      onChange={(event) => setCompany(event.target.value)}
                      placeholder="请输入企业名称"
                      className="h-12 rounded-xl pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-sm font-medium">
                    所属行业 <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <select
                      id="industry"
                      value={industry}
                      onChange={(event) => setIndustry(event.target.value)}
                      className="h-12 w-full appearance-none rounded-lg border border-input bg-background px-3 pr-11 text-sm text-foreground shadow-sm outline-none focus:border-primary"
                    >
                      <option value="">请选择所属行业</option>
                      {INDUSTRY_OPTIONS.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactTime" className="text-sm font-medium">
                    方便联系时间 <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <select
                      id="contactTime"
                      value={contactTime}
                      onChange={(event) => setContactTime(event.target.value)}
                      className="h-12 w-full appearance-none rounded-lg border border-input bg-background px-3 pr-11 text-sm text-foreground shadow-sm outline-none focus:border-primary"
                    >
                      <option value="">请选择方便联系时间</option>
                      {CONTACT_TIME_OPTIONS.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wechat" className="text-sm font-medium">
                    微信号 <span className="text-xs text-muted-foreground">选填</span>
                  </Label>
                  <div className="relative">
                    <MessageCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="wechat"
                      value={wechat}
                      onChange={(event) => setWechat(event.target.value)}
                      placeholder="请输入微信号"
                      className="h-12 rounded-xl pl-10"
                    />
                  </div>
                </div>

                {error ? (
                  <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
                ) : null}

                <div className="rounded-2xl bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
                  <div className="mb-1 flex items-center gap-1 font-medium text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    保存后自动返回资料页
                  </div>
                  补充完成后，可继续领取需要企业信息的资料。
                </div>

                <Button
                  className="h-12 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => void handleSubmit()}
                  disabled={saving}
                >
                  <BriefcaseBusiness className="mr-2 h-4 w-4" />
                  {saving ? "保存中..." : "保存并继续领取"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-card p-3 text-xs text-muted-foreground shadow-sm">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          企业信息仅需补充一次，后续刷新页面会保留领取状态。
        </div>
      </div>
    </div>
  );
}
