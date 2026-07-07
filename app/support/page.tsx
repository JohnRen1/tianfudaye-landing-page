"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle, Bot, CalendarCheck, CheckCircle2, ChevronDown, Clock, Headphones, MessageCircle, Phone, Send, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitAppointment } from "@/lib/api/appointments";
import { buildPathWithTracking } from "@/lib/tracking-context";

const faqs = [
  {
    question: "如何领取沙龙资料？",
    answer: "进入活动页面后，在“沙龙资料”区域点击领取即可。若资料要求补充企业信息，请先按提示完善后再领取。",
    action: "去资料页",
    href: "/materials",
  },
  {
    question: "风险测评报告怎么看？",
    answer: "完成测评后会生成基础报告，包含综合得分、风险等级和模块分析。完整报告建议结合企业实际资料由顾问进一步解读。",
    action: "重新测评",
    href: "/risk-assessment",
  },
  {
    question: "AI 回答可以作为税务意见吗？",
    answer: "AI 回答仅基于现有知识库提供参考，不构成正式税务、法律或财务意见。涉及申报、稽查、重大交易等事项，建议预约人工顾问确认。",
    action: "预约顾问",
    href: "/appointment",
  },
  {
    question: "如何预约人工顾问？",
    answer: "点击“预约顾问”后填写手机号、企业信息和咨询主题即可提交。顾问会在工作时间内联系您确认具体问题。",
    action: "立即预约",
    href: "/appointment",
  },
];

function SupportPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [messagePhone, setMessagePhone] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [openFaq, setOpenFaq] = useState<string | null>(faqs[0]?.question ?? null);

  const isMessagePhoneValid = messagePhone === "" || /^1[3-9]\d{9}$/.test(messagePhone);

  const handleSubmitMessage = async () => {
    if (!messageContent.trim()) {
      setSubmitError("请填写问题描述");
      return;
    }
    if (messagePhone && !/^1[3-9]\d{9}$/.test(messagePhone)) {
      setSubmitError("手机号格式不正确，请输入 11 位手机号");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitAppointment({
        name: "",
        phone: messagePhone.trim() || "",
        topic: "other",
        description: messageContent.trim(),
        company: "",
        industry: "",
        contactTime: "",
        appointmentType: "message",
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "提交失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-[390px] bg-background pb-8">
      <div className="mobile-safe-hero relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80 px-4 pb-8 pt-4 text-primary-foreground">
        <div className="absolute -right-16 top-8 h-36 w-36 rounded-full bg-white/10" />
        <Button variant="ghost" size="icon" className="mb-6 rounded-full text-white hover:bg-white/10 hover:text-white" onClick={() => router.push(buildPathWithTracking("/", searchParams))} aria-label="返回首页">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 shadow-inner">
            <Headphones className="h-7 w-7" />
          </div>
          <div>
            <Badge className="mb-2 bg-accent text-accent-foreground hover:bg-accent/90">在线支持</Badge>
            <h1 className="text-2xl font-bold">咨询客服</h1>
            <p className="mt-1 text-sm text-white/78">资料领取、AI 助手、风险报告问题都可以咨询</p>
          </div>
        </div>
      </div>

      <div className="-mt-4 space-y-4 px-4">
        <Card className="border-0 shadow-lg shadow-primary/10">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2 leading-none">
              <ShieldCheck className="h-5 w-5 shrink-0 text-success" />
              <h2 className="font-semibold text-foreground">服务时间</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-secondary/70 p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-primary" />
                  <p className="font-medium text-foreground">工作日</p>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">08:30 - 17:30</p>
              </div>
              <div className="rounded-2xl bg-secondary/70 p-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  <p className="font-medium text-foreground">客服热线</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">0531-82055700</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <h2 className="mb-3 font-semibold text-foreground">常见问题</h2>
            <div className="space-y-2">
              {faqs.map((faq) => (
                <div key={faq.question} className="rounded-2xl bg-secondary/60">
                  <button
                    className="flex w-full items-center justify-between gap-3 p-3 text-left text-sm text-foreground"
                    onClick={() => setOpenFaq((current) => current === faq.question ? null : faq.question)}
                    aria-expanded={openFaq === faq.question}
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${openFaq === faq.question ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFaq === faq.question && (
                    <div className="border-t border-border/60 px-3 pb-3 text-sm leading-relaxed text-muted-foreground">
                      <p className="pt-3">{faq.answer}</p>
                      <Button
                        variant="outline"
                        className="mt-3 h-9 rounded-xl border-primary/20 px-3 text-primary"
                        onClick={() => router.push(buildPathWithTracking(faq.href, searchParams))}
                      >
                        {faq.action}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">留言咨询</h2>
            </div>
            {submitted ? (
              <div className="rounded-2xl bg-success/10 p-4 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-success" />
                <p className="font-semibold text-foreground">留言已提交</p>
                <p className="mt-1 text-sm text-muted-foreground">客服将在工作时间尽快回复您。</p>
              </div>
            ) : (
              <>
                <Input
                  className={`h-12 rounded-xl${!isMessagePhoneValid ? " border-destructive" : ""}`}
                  placeholder="手机号，方便客服联系（选填）"
                  type="tel"
                  inputMode="numeric"
                  value={messagePhone}
                  onChange={(e) => setMessagePhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                />
                <Textarea
                  className="min-h-24 rounded-xl"
                  placeholder="请描述您遇到的问题，例如无法领取资料、报告解读、预约顾问等"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                />
                {submitError && (
                  <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {submitError}
                  </div>
                )}
                <Button
                  className="h-11 w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={submitting || !messageContent.trim()}
                  onClick={() => void handleSubmitMessage()}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {submitting ? "提交中…" : "提交留言"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-12 rounded-xl" onClick={() => router.push(buildPathWithTracking("/tax-ai", searchParams))}>
            <Bot className="mr-2 h-4 w-4" />继续问 AI
          </Button>
          <Button className="h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => router.push(buildPathWithTracking("/appointment", searchParams))}>
            <CalendarCheck className="mr-2 h-4 w-4" />预约顾问
          </Button>
        </div>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">客服咨询仅用于处理平台使用和服务咨询问题，不构成正式税务意见。</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <SupportPageContent />
    </Suspense>
  );
}
