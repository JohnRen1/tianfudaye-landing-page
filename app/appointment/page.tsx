"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, CalendarCheck, CheckCircle2, Clock, FileUp, MessageCircle, MessageSquare, Phone, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { submitAppointment } from "@/lib/api/appointments";
import { APPOINTMENT_TOPIC_LABEL, type AppointmentTopic } from "@/lib/contracts/appointment";
import { ApiError } from "@/lib/api/client";

const topics = ["税务风险排查", "发票合规", "公转私风险", "企业所得税筹划", "个税社保合规", "税务稽查应对", "公司架构设计", "其他问题"];
const industries = ["制造业", "批发零售", "互联网/科技服务", "建筑工程", "餐饮服务", "贸易进出口", "专业服务", "其他行业"];
const contactTimes = ["工作日上午", "工作日下午", "工作日晚上", "周末", "均可"];
const uploadOptions = ["愿意，后续顾问联系后上传", "暂不上传", "视情况而定"];

// 中文标签 → AppointmentTopic 枚举值的反向映射
const TOPIC_LABEL_TO_ENUM = Object.fromEntries(
  Object.entries(APPOINTMENT_TOPIC_LABEL).map(([enumValue, label]) => [label, enumValue as AppointmentTopic]),
) as Record<string, AppointmentTopic>;

type FormState = {
  name: string;
  phone: string;
  topic: string;
  description: string;
  company: string;
  industry: string;
  contactTime: string;
  wechat: string;
  uploadIntent: string;
};

type ErrorState = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  name: "",
  phone: "",
  topic: "",
  description: "",
  company: "",
  industry: "",
  contactTime: "",
  wechat: "",
  uploadIntent: "",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

function AppointmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceLeadId = searchParams.get("leadId") ?? undefined;

  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<ErrorState>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setApiError(null);
  };

  const validate = () => {
    const nextErrors: ErrorState = {};
    if (!form.name.trim()) nextErrors.name = "请填写姓名";
    if (!form.phone.trim()) nextErrors.phone = "请填写手机号";
    else if (!/^1\d{10}$/.test(form.phone)) nextErrors.phone = "请输入 11 位有效手机号";
    if (!form.topic) nextErrors.topic = "请选择咨询主题";
    if (!form.description.trim()) nextErrors.description = "请填写问题描述";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    // topic 字段：中文标签 → AppointmentTopic 枚举值
    const topicEnum = TOPIC_LABEL_TO_ENUM[form.topic];
    if (!topicEnum) {
      setApiError("咨询主题无效，请重新选择");
      return;
    }

    setSubmitting(true);
    setApiError(null);

    try {
      const result = await submitAppointment({
        name: form.name.trim(),
        phone: form.phone,
        topic: topicEnum,
        description: form.description.trim(),
        ...(form.company.trim() && { company: form.company.trim() }),
        ...(form.industry && { industry: form.industry }),
        ...(form.contactTime && { contactTime: form.contactTime }),
        ...(form.wechat.trim() && { wechat: form.wechat.trim() }),
        ...(form.uploadIntent && { uploadIntent: form.uploadIntent }),
        ...(sourceLeadId && { sourceLeadId }),
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

  if (submitted) {
    return (
      <div className="mx-auto min-h-screen max-w-[390px] bg-background px-4 py-8">
        <Card className="border-0 shadow-lg shadow-primary/10">
          <CardContent className="flex min-h-[520px] flex-col items-center justify-center p-6 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-success/10">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">预约提交成功</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              预约提交成功，顾问将在 1 个工作日内联系您。
            </p>
            <div className="mt-6 w-full space-y-3">
              <Button className="h-12 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => router.push("/")}>返回首页</Button>
              <Button variant="outline" className="h-12 w-full rounded-xl" onClick={() => router.push("/appointment/my")}>查看我的预约</Button>
              <Button variant="outline" className="h-12 w-full rounded-xl border-primary/20 text-primary" onClick={() => router.push("/tax-ai")}>继续问 AI</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-[390px] bg-background pb-28">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80 px-4 pb-8 pt-4 text-primary-foreground">
        <div className="absolute -right-16 top-8 h-36 w-36 rounded-full bg-white/10" />
        <Button variant="ghost" size="icon" className="mb-6 rounded-full text-white hover:bg-white/10 hover:text-white" onClick={() => router.back()} aria-label="返回">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 shadow-inner">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">预约顾问</h1>
            <p className="mt-1 text-sm text-white/78">提交信息后，专业财税顾问将与您联系。</p>
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
              <Label className="mb-2 flex items-center gap-1 text-sm font-medium">咨询主题 <span className="text-destructive">*</span></Label>
              <Select value={form.topic} onValueChange={(value) => updateField("topic", value)}>
                <SelectTrigger className={cn("h-12 w-full rounded-xl", errors.topic && "border-destructive")}>
                  <SelectValue placeholder="请选择咨询主题" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((topic) => <SelectItem key={topic} value={topic}>{topic}</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldError message={errors.topic} />
            </div>

            <div>
              <Label className="mb-2 flex items-center gap-1 text-sm font-medium">问题描述 <span className="text-destructive">*</span></Label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea className={cn("min-h-28 rounded-xl pl-10 pt-3", errors.description && "border-destructive")} placeholder="请描述您希望顾问协助判断的问题，例如发票、公转私、稽查应对等" value={form.description} onChange={(event) => updateField("description", event.target.value)} />
              </div>
              <FieldError message={errors.description} />
            </div>

            <div>
              <Label className="mb-2 text-sm font-medium">企业名称 <span className="text-muted-foreground">选填</span></Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-12 rounded-xl pl-10" placeholder="请输入企业名称" value={form.company} onChange={(event) => updateField("company", event.target.value)} />
              </div>
            </div>

            <div>
              <Label className="mb-2 text-sm font-medium">所属行业 <span className="text-muted-foreground">选填</span></Label>
              <Select value={form.industry} onValueChange={(value) => updateField("industry", value)}>
                <SelectTrigger className="h-12 w-full rounded-xl"><SelectValue placeholder="请选择所属行业" /></SelectTrigger>
                <SelectContent>{industries.map((industry) => <SelectItem key={industry} value={industry}>{industry}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 text-sm font-medium">方便联系时间 <span className="text-muted-foreground">选填</span></Label>
              <Select value={form.contactTime} onValueChange={(value) => updateField("contactTime", value)}>
                <SelectTrigger className="h-12 w-full rounded-xl"><SelectValue placeholder="请选择方便联系时间" /></SelectTrigger>
                <SelectContent>{contactTimes.map((time) => <SelectItem key={time} value={time}>{time}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 text-sm font-medium">微信号 <span className="text-muted-foreground">选填</span></Label>
              <div className="relative">
                <MessageCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-12 rounded-xl pl-10" placeholder="请输入微信号" value={form.wechat} onChange={(event) => updateField("wechat", event.target.value)} />
              </div>
            </div>

            <div>
              <Label className="mb-2 text-sm font-medium">是否愿意上传资料 <span className="text-muted-foreground">选填</span></Label>
              <Select value={form.uploadIntent} onValueChange={(value) => updateField("uploadIntent", value)}>
                <SelectTrigger className="h-12 w-full rounded-xl"><SelectValue placeholder="请选择是否愿意上传资料" /></SelectTrigger>
                <SelectContent>{uploadOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-2 rounded-2xl bg-secondary/70 p-3 text-xs leading-relaxed text-muted-foreground">
              <FileUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>如选择愿意上传资料，顾问联系后会告知安全上传方式。</span>
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">您的信息仅用于顾问联系和服务咨询。</p>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 p-4 shadow-lg backdrop-blur">
        <div className="mx-auto max-w-[390px]">
          <Button
            className="h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
            onClick={handleSubmit}
            disabled={submitting}
          >
            <Send className="mr-2 h-4 w-4" />
            {submitting ? "提交中..." : "提交预约"}
          </Button>
          <div className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
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
