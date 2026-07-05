"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, Clock, ClipboardList, Loader2, MessageCircle, Send, User, Vote } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getHomepageSurveyActive, submitHomepageSurvey } from "@/lib/api/homepage-survey";
import { me } from "@/lib/api/auth";
import { hydrateClientAuthFromServer } from "@/lib/client-auth";
import type { HomepageSurveyPublicConfigDTO } from "@/lib/contracts/homepage-survey";

type FormState = {
  name: string;
  phone: string;
  company: string;
  industry: string;
  companySize: string;
  wechat: string;
  contactTime: string;
  note: string;
  topicId: string;
};

const emptyForm: FormState = {
  name: "",
  phone: "",
  company: "",
  industry: "",
  companySize: "",
  wechat: "",
  contactTime: "",
  note: "",
  topicId: "",
};

const industries = ["制造业", "批发零售", "互联网/科技服务", "建筑工程", "餐饮服务", "贸易进出口", "专业服务", "其他行业"];
const companySizes = ["10人以下", "10-50人", "51-100人", "101-300人", "300人以上"];
const contactTimes = ["工作日上午", "工作日下午", "工作日晚上", "周末", "均可"];

const defaultSurveyConfig: HomepageSurveyPublicConfigDTO = {
  id: "e0000000-0000-0000-0000-000000000001",
  title: "沙龙主题调研",
  description: "请选择您最关注的财税沙龙主题，帮助我们安排后续活动内容。",
  version: 1,
  hasSubmitted: false,
  submittedTopicIds: [],
  topics: [
    {
      id: "e1000000-0000-0000-0000-000000000001",
      title: "金税四期下企业财税合规",
      description: "围绕发票、资金流水、公转私等高频风险，梳理企业日常合规重点。",
      sortOrder: 10,
      voteCount: 0,
    },
    {
      id: "e1000000-0000-0000-0000-000000000002",
      title: "企业所得税汇算清缴风险排查",
      description: "聚焦收入确认、成本费用、优惠政策和纳税调整的自查方法。",
      sortOrder: 20,
      voteCount: 0,
    },
    {
      id: "e1000000-0000-0000-0000-000000000003",
      title: "老板个人税务与公私账边界",
      description: "讲解股东借款、分红、报销、公转私等场景下的风险边界。",
      sortOrder: 30,
      voteCount: 0,
    },
    {
      id: "e1000000-0000-0000-0000-000000000004",
      title: "研发费用加计扣除实务",
      description: "适合科技型企业了解研发项目归集、资料留存和申报注意事项。",
      sortOrder: 40,
      voteCount: 0,
    },
    {
      id: "e1000000-0000-0000-0000-000000000005",
      title: "企业用工社保与个税合规",
      description: "覆盖薪酬、劳务、灵活用工、社保基数和个税申报常见问题。",
      sortOrder: 50,
      voteCount: 0,
    },
    {
      id: "e1000000-0000-0000-0000-000000000006",
      title: "高收入企业利润管控与税务筹划",
      description: "从利润结构、成本合规和政策适配角度，讨论企业增值服务方案。",
      sortOrder: 60,
      voteCount: 0,
    },
  ],
};

function readSourceQrId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const url = new URL(window.location.href);
  return url.searchParams.get("qr_id") ?? url.searchParams.get("qr") ?? localStorage.getItem("qr_id") ?? undefined;
}

export function HomepageSurveyPage() {
  const router = useRouter();
  const [config, setConfig] = useState<HomepageSurveyPublicConfigDTO>(defaultSurveyConfig);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [syncing, setSyncing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedTopicText = useMemo(() => {
    if (!config) return "";
    return config.topics.find((topic) => topic.id === form.topicId)?.title ?? "";
  }, [config, form.topicId]);

  useEffect(() => {
    let ignored = false;
    setSyncing(true);

    void hydrateClientAuthFromServer().then(async (loggedIn) => {
      if (loggedIn && !ignored) {
        try {
          const user = await me();
          setForm((prev) => ({
            ...prev,
            name: prev.name || user.name || "",
            company: prev.company || user.company || "",
            industry: prev.industry || user.industry || "",
            contactTime: prev.contactTime || user.size || "",
          }));
        } catch {
          // 静默失败，用户手动填写即可
        }
      }
    });

    getHomepageSurveyActive()
      .then((result) => {
        if (ignored) return;
        setConfig(result);
        setForm((prev) => ({ ...prev, topicId: result.submittedTopicIds[0] ?? "" }));
      })
      .catch((error) => {
        if (!ignored) {
          console.warn("[homepage-survey] sync active survey failed", error);
        }
      })
      .finally(() => {
        if (!ignored) setSyncing(false);
      });
    return () => { ignored = true; };
  }, []);

  const update = (key: keyof FormState, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!config) return;
    if (!form.name.trim()) return setMessage("请填写姓名");
    if (!/^1[3-9]\d{9}$/.test(form.phone.trim())) return setMessage("请填写正确的 11 位手机号");
    if (!form.company.trim()) return setMessage("请填写公司名称");
    if (!form.industry.trim()) return setMessage("请填写所属行业");
    if (!form.topicId) return setMessage("请选择候选课题");

    setSubmitting(true);
    setMessage(null);
    try {
      await submitHomepageSurvey({
        surveyConfigId: config.id,
        surveyVersion: config.version,
        topicIds: [form.topicId],
        name: form.name.trim(),
        phone: form.phone.trim(),
        company: form.company.trim(),
        industry: form.industry.trim(),
        companySize: form.companySize.trim() || undefined,
        wechat: form.wechat.trim() || undefined,
        contactTime: form.contactTime.trim() || undefined,
        note: form.note.trim() || undefined,
        sourceQrId: readSourceQrId(),
      });
      setMessage("提交成功，我们会根据大家关注的主题安排后续沙龙内容。");
      try {
        const latest = await getHomepageSurveyActive();
        setConfig(latest);
        setForm((prev) => ({ ...prev, topicId: latest.submittedTopicIds[0] ?? prev.topicId }));
      } catch (error) {
        console.warn("[homepage-survey] sync active survey after submit failed", error);
        setConfig((current) => ({ ...current, hasSubmitted: true, submittedTopicIds: [form.topicId] }));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "提交失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  const submitted = Boolean(config?.hasSubmitted);

  return (
    <main className="mx-auto min-h-screen max-w-[390px] bg-background pb-8">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80 px-4 pb-8 pt-4 text-primary-foreground">
          <div className="absolute -right-16 top-8 h-36 w-36 rounded-full bg-white/10" />
          <Button variant="ghost" size="icon" className="relative mb-6 rounded-full text-white hover:bg-white/10 hover:text-white" onClick={() => router.back()} aria-label="返回">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 shadow-inner">
              <Vote className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">沙龙投票</h1>
              <p className="mt-1 text-sm text-white/78">选择您关注的财税主题，帮助我们安排后续沙龙。</p>
            </div>
          </div>
      </section>

      <section className="-mt-4 space-y-4 px-4">
          {syncing ? <div className="flex items-center justify-center rounded-2xl bg-card/80 px-4 py-2 text-xs text-muted-foreground shadow-sm"><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />正在同步最新课题</div> : null}
          {config ? (
            <>
              <div className="rounded-3xl border-0 bg-card p-5 shadow-lg shadow-primary/10">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ClipboardList className="h-4 w-4 shrink-0 text-primary" />
                  <span>{config.title}</span>
                </div>
                {config.description ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{config.description}</p> : null}
                <p className="mt-2 text-xs text-muted-foreground">当前轮次 V{config.version}</p>
              </div>

              {submitted ? <div className="rounded-2xl bg-primary/10 p-3 text-sm text-primary">本轮已提交：{selectedTopicText || "已记录"}</div> : (
                <div className="space-y-5 rounded-3xl bg-card p-5 shadow-lg shadow-primary/10">
                  <div>
                    <Label className="mb-2 gap-1 text-sm font-medium">姓名 <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input className="h-12 rounded-xl pl-10" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="请输入姓名" />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 gap-1 text-sm font-medium">手机号 <span className="text-destructive">*</span></Label>
                    <Input className="h-12 rounded-xl" value={form.phone} onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="请输入手机号" inputMode="tel" />
                  </div>

                  <div>
                    <Label className="mb-2 gap-1 text-sm font-medium">公司名称 <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input className="h-12 rounded-xl pl-10" value={form.company} onChange={(e) => update("company", e.target.value)} placeholder="请输入公司名称" />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 gap-1 text-sm font-medium">所属行业 <span className="text-destructive">*</span></Label>
                    <Select value={form.industry} onValueChange={(value) => update("industry", value)}>
                      <SelectTrigger className="h-12 w-full rounded-xl"><SelectValue placeholder="请选择所属行业" /></SelectTrigger>
                      <SelectContent>{industries.map((industry) => <SelectItem key={industry} value={industry}>{industry}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-2 text-sm font-medium">企业规模 <span className="text-muted-foreground">选填</span></Label>
                    <Select value={form.companySize} onValueChange={(value) => update("companySize", value)}>
                      <SelectTrigger className="h-12 w-full rounded-xl"><SelectValue placeholder="请选择企业规模" /></SelectTrigger>
                      <SelectContent>{companySizes.map((size) => <SelectItem key={size} value={size}>{size}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-2 text-sm font-medium">微信号 <span className="text-muted-foreground">选填</span></Label>
                    <div className="relative">
                      <MessageCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input className="h-12 rounded-xl pl-10" value={form.wechat} onChange={(e) => update("wechat", e.target.value)} placeholder="请输入微信号" />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 text-sm font-medium">方便联系时间 <span className="text-muted-foreground">选填</span></Label>
                    <Select value={form.contactTime} onValueChange={(value) => update("contactTime", value)}>
                      <SelectTrigger className="h-12 w-full rounded-xl"><SelectValue placeholder="请选择方便联系时间" /></SelectTrigger>
                      <SelectContent>{contactTimes.map((time) => <SelectItem key={time} value={time}>{time}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-2 text-sm font-medium">关注问题 / 备注 <span className="text-muted-foreground">选填</span></Label>
                    <Textarea className="min-h-24 rounded-xl" value={form.note} onChange={(e) => update("note", e.target.value)} placeholder="如有特别关注的问题，可在此补充" />
                  </div>

                  <div>
                    <Label className="mb-2 gap-1 text-sm font-medium">候选课题 <span className="text-destructive">*</span></Label>
                    <Select value={form.topicId} onValueChange={(value) => update("topicId", value)}>
                      <SelectTrigger className={cn("h-12 w-full rounded-xl", !config.topics.length && "text-muted-foreground")}>
                        <SelectValue placeholder={config.topics.length ? "请选择您关注的沙龙课题" : "暂无可选课题"} />
                      </SelectTrigger>
                      <SelectContent>
                        {config.topics.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id}>
                            {topic.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </>
          ) : null}

          {message ? <div className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">{message}</div> : null}
          <Button className="h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-60" disabled={submitting || submitted || !config} onClick={() => void handleSubmit()}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {!submitting && !submitted ? <Send className="mr-2 h-4 w-4" /> : null}
            {submitted ? "本轮已提交" : "提交投票"}
          </Button>
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />我们会根据投票结果安排后续沙龙
          </div>
      </section>
    </main>
  );
}
