"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, CalendarCheck, CheckCircle2, Clock, MessageCircle, MessageSquare, Phone, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { submitAppointment } from "@/lib/api/appointments";
import { me } from "@/lib/api/auth";
import { APPOINTMENT_TOPIC_LABEL, type AppointmentTopic } from "@/lib/contracts/appointment";
import { ApiError } from "@/lib/api/client";
import { buildPathWithTracking } from "@/lib/tracking-context";


const consultTopics = ["税务风险排查", "发票合规", "公转私风险", "企业所得税筹划", "个税社保合规", "税务稽查应对", "公司架构设计", "其他问题"];
const enrollPurposes = ["学习税务合规知识", "了解最新政策动态", "解决企业实际税务问题", "与同行交流经验", "了解专业税务服务", "其他"];
const industries = ["制造业", "批发零售", "互联网/科技服务", "建筑工程", "餐饮服务", "贸易进出口", "专业服务", "其他"];
const contactTimes = ["工作日上午", "工作日下午", "工作日晚上", "周末", "均可"];

// 中文标签 → AppointmentTopic 枚举值的反向映射
const TOPIC_LABEL_TO_ENUM = Object.fromEntries(
  Object.entries(APPOINTMENT_TOPIC_LABEL).map(([enumValue, label]) => [label, enumValue as AppointmentTopic]),
) as Record<string, AppointmentTopic>;

type FormState = {
  name: string;
  phone: string;
  topic: string;
  topicOther: string;
  description: string;
  company: string;
  industry: string;
  industryOther: string;
  contactTime: string;
  wechat: string;
};

type ErrorState = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  name: "",
  phone: "",
  topic: "",
  topicOther: "",
  description: "",
  company: "",
  industry: "",
  industryOther: "",
  contactTime: "",
  wechat: "",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

function AppointmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceLeadId = searchParams.get("leadId") ?? undefined;
  const activityName = searchParams.get("activity_name") ?? undefined;
  const prefillTopic = searchParams.get("topic") ?? "";
  const prefillDescription = searchParams.get("description") ?? "";

  const urlQrId = searchParams.get("qr") ?? searchParams.get("qr_id");
  const urlActivityId = searchParams.get("activity") ?? searchParams.get("activity_id");

  const [sourceQrId] = useState<string | undefined>(urlQrId ?? undefined);
  const [sourceActivityId] = useState<string | undefined>(urlActivityId ?? undefined);

  // 活动报名模式：只有明确传 enroll=1 才启用（活动页"报名参加"按钮传此参数）
  // 从活动页"立即预约"跳过来时不传 enroll，默认显示完整预约顾问表单
  const isEnrollMode = searchParams.get("enroll") === "1";

  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<ErrorState>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    me().then((user) => {
      setForm((prev) => ({
        ...prev,
        topic: prev.topic || prefillTopic || "",
        description: prev.description || prefillDescription || "",
        company: prev.company || user.company || "",
        industry: prev.industry || user.industry || "",
        contactTime: prev.contactTime || user.size || "",
      }));
    }).catch(() => {
      setForm((prev) => ({
        ...prev,
        topic: prev.topic || prefillTopic || "",
        description: prev.description || prefillDescription || "",
      }));
    });
  }, [prefillDescription, prefillTopic]);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setApiError(null);
  };

  const validate = () => {
    const nextErrors: ErrorState = {};
    if (!form.name.trim()) nextErrors.name = "请填写姓名";
    if (!form.phone.trim()) nextErrors.phone = "请填写手机号";
    else if (!/^1[3-9]\d{9}$/.test(form.phone)) nextErrors.phone = "手机号格式不正确，请输入 11 位手机号";
    if (!isEnrollMode && !form.topic) nextErrors.topic = "请选择咨询主题";
    if (!isEnrollMode && !form.description.trim()) nextErrors.description = "请填写问题描述";
    if (!form.company.trim()) nextErrors.company = "请填写企业名称";
    if (!form.industry) nextErrors.industry = "请选择所属行业";
    if (form.industry === "其他" && !form.industryOther.trim()) nextErrors.industryOther = "请填写所属行业";
    if (!form.contactTime) nextErrors.contactTime = "请选择方便联系时间";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    // topic 字段：中文标签 → AppointmentTopic 枚举值
    // 报名模式下 topic 是自由文本目的，映射不到枚举时用 'other'
    const topicEnum = form.topic ? (TOPIC_LABEL_TO_ENUM[form.topic] ?? (isEnrollMode ? "other" as AppointmentTopic : undefined)) : undefined;
    if (!isEnrollMode && !topicEnum) {
      setApiError("咨询主题无效，请重新选择");
      return;
    }

    // 行业：选"其他"时用用户输入值
    const industryValue = form.industry === "其他" ? form.industryOther.trim() : form.industry;

    setSubmitting(true);
    setApiError(null);

    try {
      const result = await submitAppointment({
        name: form.name.trim(),
        phone: form.phone,
        ...(topicEnum && { topic: topicEnum }),
        description: form.description.trim() || (isEnrollMode ? `报名参加活动${activityName ? `：${activityName}` : ""}${form.topic ? `，目的：${form.topic}` : ""}` : ""),
        company: form.company.trim(),
        industry: industryValue,
        contactTime: form.contactTime,
        appointmentType: isEnrollMode ? "enroll" : "consult",
        ...(form.wechat.trim() && { wechat: form.wechat.trim() }),
        ...(sourceLeadId && { sourceLeadId }),
        ...(sourceQrId && { sourceQrId }),
        ...(sourceActivityId && { sourceActivityId }),
      });

      // 持久化预约 ID 供"查看我的预约"页使用
      localStorage.setItem("appointmentId", result.id);

      setSubmitted(true);
    } catch (error) {
      if (error instanceof ApiError) {
        setApiError(error.message);
      } else {
        setApiError("提交失败，请稍后重试");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const activityLandingPath = buildPathWithTracking("/", searchParams);
  const taxAiPath = buildPathWithTracking("/tax-ai", searchParams);

  if (submitted) {
    return (
      <div className="mx-auto min-h-screen max-w-[390px] bg-background px-4 py-8">
        <Card className="border-0 shadow-lg shadow-primary/10">
          <CardContent className="flex min-h-[520px] flex-col items-center justify-center p-6 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-success/10">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{isEnrollMode ? "报名提交成功" : "预约提交成功"}</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {isEnrollMode ? "报名已提交，顾问将在 1 个工作日内与您确认参会详情。" : "预约提交成功，顾问将在 1 个工作日内联系您。"}
            </p>
            <div className="mt-6 w-full space-y-3">
              <Button className="h-12 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => router.push(activityLandingPath)}>{isEnrollMode ? "返回活动页" : "返回首页"}</Button>
              <Button variant="outline" className="h-12 w-full rounded-xl" onClick={() => router.push("/appointment/my")}>查看我的预约</Button>
              <Button variant="outline" className="h-12 w-full rounded-xl border-primary/20 text-primary" onClick={() => router.push(taxAiPath)}>继续问 AI</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-[390px] bg-background pb-44">
      <div className="mobile-safe-hero relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80 px-4 pb-8 pt-4 text-primary-foreground">
        <div className="absolute -right-16 top-8 h-36 w-36 rounded-full bg-white/10" />
        <Button variant="ghost" size="icon" className="mb-6 rounded-full text-white hover:bg-white/10 hover:text-white" onClick={() => router.back()} aria-label="返回">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 shadow-inner">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{isEnrollMode ? "活动报名" : "预约顾问"}</h1>
            <p className="mt-1 text-sm text-white/78">
              {isEnrollMode
                ? activityName
                  ? `报名参加：${activityName}`
                  : "提交信息，顾问将与您确认参会详情。"
                : "提交信息后，专业财税顾问将与您联系。"}
            </p>
          </div>
        </div>
      </div>

      <div className="-mt-4 px-4">
        <Card className="border-0 shadow-lg shadow-primary/10">
          <CardContent className="space-y-5 p-5">
            {apiError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {apiError}
              </div>
            )}

            <div>
              <Label className="mb-2 flex items-center gap-1 text-sm font-medium">姓名 <span className="text-destructive">*</span></Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className={cn("h-12 rounded-xl pl-10", errors.name && "border-destructive")} placeholder="请输入姓名" value={form.name} onChange={(event) => updateField("name", event.target.value)} />
              </div>
              <FieldError message={errors.name} />
            </div>

            <div>
              <Label className="mb-2 flex items-center gap-1 text-sm font-medium">手机号 <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className={cn("h-12 rounded-xl pl-10", errors.phone && "border-destructive")} placeholder="请输入手机号" type="tel" inputMode="numeric" value={form.phone} onChange={(event) => updateField("phone", event.target.value.replace(/\D/g, "").slice(0, 11))} />
              </div>
              <FieldError message={errors.phone} />
            </div>

            <div>
              <Label className="mb-2 flex items-center gap-1 text-sm font-medium">
                {isEnrollMode ? "参加目的" : "咨询主题"}
                {!isEnrollMode && <span className="text-destructive">*</span>}
                {isEnrollMode && <span className="text-muted-foreground">选填</span>}
              </Label>
              <Select value={form.topic} onValueChange={(value) => {
                updateField("topic", value);
                if (value !== "其他") updateField("topicOther", "");
              }}>
                <SelectTrigger className={cn("h-12 w-full rounded-xl", errors.topic && "border-destructive")}>
                  <SelectValue placeholder={isEnrollMode ? "请选择参加目的" : "请选择咨询主题"} />
                </SelectTrigger>
                <SelectContent>
                  {(isEnrollMode ? enrollPurposes : consultTopics).map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEnrollMode && form.topic === "其他" && (
                <Input
                  className="mt-2 h-12 rounded-xl"
                  placeholder="请输入参加目的"
                  value={form.topicOther}
                  onChange={(event) => updateField("topicOther", event.target.value)}
                />
              )}
              <FieldError message={errors.topic} />
            </div>

            <div>
              <Label className="mb-2 flex items-center gap-1 text-sm font-medium">
                {isEnrollMode ? "备注" : "问题描述"}
                {!isEnrollMode && <span className="text-destructive">*</span>}
                {isEnrollMode && <span className="text-muted-foreground">选填</span>}
              </Label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  className={cn("min-h-28 rounded-xl pl-10 pt-3", errors.description && "border-destructive")}
                  placeholder={isEnrollMode ? "如有特别想了解的内容，或需要提前告知的情况，可在此填写" : "请描述您希望顾问协助判断的问题，例如发票、公转私、稽查应对等"}
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                />
              </div>
              <FieldError message={errors.description} />
            </div>

            <div>
              <Label className="mb-2 flex items-center gap-1 text-sm font-medium">企业名称 <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className={cn("h-12 rounded-xl pl-10", errors.company && "border-destructive")} placeholder="请输入企业名称" value={form.company} onChange={(event) => updateField("company", event.target.value)} />
              </div>
              <FieldError message={errors.company} />
            </div>

            <div>
              <Label className="mb-2 flex items-center gap-1 text-sm font-medium">所属行业 <span className="text-destructive">*</span></Label>
              <Select value={form.industry} onValueChange={(value) => {
                updateField("industry", value);
                if (value !== "其他") updateField("industryOther", "");
              }}>
                <SelectTrigger className={cn("h-12 w-full rounded-xl", errors.industry && "border-destructive")}><SelectValue placeholder="请选择所属行业" /></SelectTrigger>
                <SelectContent>{industries.map((industry) => <SelectItem key={industry} value={industry}>{industry}</SelectItem>)}</SelectContent>
              </Select>
              {form.industry === "其他" && (
                <Input
                  className={cn("mt-2 h-12 rounded-xl", errors.industryOther && "border-destructive")}
                  placeholder="请输入所属行业"
                  value={form.industryOther}
                  onChange={(event) => updateField("industryOther", event.target.value)}
                />
              )}
              <FieldError message={errors.industry} />
              <FieldError message={errors.industryOther} />
            </div>

            <div>
              <Label className="mb-2 flex items-center gap-1 text-sm font-medium">方便联系时间 <span className="text-destructive">*</span></Label>
              <Select value={form.contactTime} onValueChange={(value) => updateField("contactTime", value)}>
                <SelectTrigger className={cn("h-12 w-full rounded-xl", errors.contactTime && "border-destructive")}><SelectValue placeholder="请选择方便联系时间" /></SelectTrigger>
                <SelectContent>{contactTimes.map((time) => <SelectItem key={time} value={time}>{time}</SelectItem>)}</SelectContent>
              </Select>
              <FieldError message={errors.contactTime} />
            </div>

            <div>
              <Label className="mb-2 text-sm font-medium">微信号 <span className="text-muted-foreground">选填</span></Label>
              <div className="relative">
                <MessageCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-12 rounded-xl pl-10" placeholder="请输入微信号" value={form.wechat} onChange={(event) => updateField("wechat", event.target.value)} />
              </div>
            </div>

          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">您的信息仅用于顾问联系和服务咨询。</p>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 p-4 shadow-lg backdrop-blur">
        <div className="mx-auto max-w-[390px] space-y-2">
          <Button
            className="h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
            onClick={handleSubmit}
            disabled={submitting}
          >
            <Send className="mr-2 h-4 w-4" />
            {submitting ? "提交中..." : isEnrollMode ? "提交报名" : "提交预约"}
          </Button>
          <Button
            variant="outline"
            className="h-10 w-full rounded-xl text-sm"
            onClick={() => router.push("/appointment/my")}
          >
            <CalendarCheck className="mr-2 h-4 w-4" />
            我的预约
          </Button>
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />顾问通常将在 1 个工作日内联系
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <AppointmentForm />
    </Suspense>
  );
}
