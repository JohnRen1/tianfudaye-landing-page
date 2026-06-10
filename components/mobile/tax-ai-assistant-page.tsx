"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, BookOpen, Bot, CalendarCheck, Loader2, MessageCircle, Send, ShieldAlert, Sparkles, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LoginModal } from "./login-modal";

type RiskLevel = "medium" | "high" | "uncertain";
type ChatMessage = { id: number; role: "user"; content: string } | { id: number; role: "ai"; answer: AiAnswer };
interface AiAnswer {
  questionUnderstanding: string;
  initialJudgment: string;
  involvedRisks: string[];
  suggestions: string[];
  riskLevel: RiskLevel;
  advisorRecommended: boolean;
  uncertain: boolean;
}

const quickQuestions = ["发票合规怎么判断？", "公转私有什么风险？", "长期零申报会被查吗？", "收到税务检查通知怎么办？"];
const disclaimer = "以上内容由 AI 根据现有知识库生成，仅供参考，不构成正式税务意见。具体处理方案需结合企业实际情况，并由专业税务顾问进一步确认。";

function buildAiAnswer(question: string): AiAnswer {
  const highRisk = ["稽查", "虚开发票", "虚开", "公转私", "大额", "检查通知", "税务检查"].some((key) => question.includes(key));
  const mediumRisk = ["零申报", "发票", "扣除", "补税"].some((key) => question.includes(key));
  if (highRisk) {
    return {
      questionUnderstanding: `您关注的是“${question}”相关事项，可能涉及资金流、票据流、业务真实性或税务机关核查应对。`,
      initialJudgment: "该类问题通常不能只看单一凭证，需要结合合同、发票、付款记录、业务交付、账务处理和企业实际经营情况综合判断。",
      involvedRisks: ["交易真实性不足时，可能引发进项抵扣、成本费用列支或企业所得税调整风险。", "涉及大额资金往来或税务检查通知时，可能被要求补充说明、提交资料或进一步核查。", "若存在虚开发票、资金回流等情形，风险等级会显著升高。"],
      suggestions: ["先整理合同、发票、付款凭证、物流/交付证明、沟通记录等资料。", "核对账务处理是否与真实业务一致，避免仅凭发票入账。", "如已收到税务机关通知，建议先由专业顾问协助梳理回复口径。"],
      riskLevel: "high",
      advisorRecommended: true,
      uncertain: false,
    };
  }
  if (mediumRisk) {
    return {
      questionUnderstanding: `您想了解“${question}”在日常税务管理中的合规判断和潜在风险。`,
      initialJudgment: "该问题属于企业常见税务合规事项，一般需要结合业务发生频率、金额、凭证完整性和申报记录判断。",
      involvedRisks: ["资料不完整时，可能影响费用扣除、进项抵扣或申报合理性。", "长期异常申报或与经营规模不匹配，可能触发税务风险提示。"],
      suggestions: ["建立定期自查机制，按月核对发票、合同、付款和入账记录。", "对异常事项保留业务说明和证明材料，便于后续解释。", "如金额较大或持续时间较长，建议结合企业实际情况由顾问确认。"],
      riskLevel: "medium",
      advisorRecommended: true,
      uncertain: true,
    };
  }
  return {
    questionUnderstanding: `您咨询的是“${question}”相关基础税务问题。`,
    initialJudgment: "从通用知识库看，该问题需要先明确业务背景、适用税种、发生金额和当前处理方式，再进行更准确判断。",
    involvedRisks: ["业务背景不完整时，AI 只能提供方向性参考，无法替代正式税务判断。", "不同地区执行口径、企业规模和行业特点可能影响最终处理方式。"],
    suggestions: ["补充企业行业、交易金额、业务发生时间和当前入账/申报方式。", "优先对照政策依据和企业内部凭证，判断资料是否完整。", "建议结合企业实际情况由顾问确认。"],
    riskLevel: "uncertain",
    advisorRecommended: true,
    uncertain: true,
  };
}

function riskMeta(level: RiskLevel) {
  if (level === "high") return { label: "高风险", box: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" };
  if (level === "medium") return { label: "中风险", box: "bg-warning/10 text-warning border-warning/20", dot: "bg-warning" };
  return { label: "需结合实际确认", box: "bg-primary/10 text-primary border-primary/20", dot: "bg-primary" };
}

function AiAnswerCard({ answer, onProtectedClick }: { answer: AiAnswer; onProtectedClick: () => void }) {
  const meta = riskMeta(answer.riskLevel);
  const isHigh = answer.riskLevel === "high";
  return (
    <Card className={cn("border-0 bg-card shadow-sm", isHigh && "ring-1 ring-destructive/20")}>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10"><Bot className="h-4 w-4 text-primary" /></div><span className="text-sm font-semibold">AI 知识库回答</span></div>
          <Badge variant="outline" className={cn("rounded-full", meta.box)}><span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", meta.dot)} />{meta.label}</Badge>
        </div>
        <div className="space-y-3 text-sm">
          <section><h3 className="mb-1 font-semibold text-foreground">问题理解</h3><p className="leading-relaxed text-muted-foreground">{answer.questionUnderstanding}</p></section>
          <section><h3 className="mb-1 font-semibold text-foreground">初步判断</h3><p className="leading-relaxed text-muted-foreground">{answer.initialJudgment}</p></section>
          <section><h3 className="mb-1 font-semibold text-foreground">涉及风险</h3><ul className="space-y-1 text-muted-foreground">{answer.involvedRisks.map((item) => <li key={item} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-destructive/70" />{item}</li>)}</ul></section>
          <section><h3 className="mb-1 font-semibold text-foreground">处理建议</h3><ul className="space-y-1 text-muted-foreground">{answer.suggestions.map((item) => <li key={item} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/70" />{item}</li>)}</ul></section>
          <div className="space-y-2 rounded-xl bg-secondary/60 p-3"><div className="flex justify-between gap-3"><span className="text-muted-foreground">风险等级</span><span className={cn("font-semibold", isHigh ? "text-destructive" : "text-primary")}>{meta.label}</span></div><div className="flex justify-between gap-3"><span className="text-muted-foreground">是否建议人工顾问介入</span><span className="font-semibold text-destructive">{answer.advisorRecommended ? "建议介入" : "暂不需要"}</span></div></div>
          {answer.uncertain && <div className="rounded-xl border border-warning/20 bg-warning/10 p-3 text-warning">建议结合企业实际情况由顾问确认。</div>}
          {isHigh && <div className="grid grid-cols-2 gap-2"><Button className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onProtectedClick}><CalendarCheck className="mr-1.5 h-4 w-4" />预约顾问解读</Button><Button variant="outline" className="rounded-xl border-primary/20 text-primary" onClick={onProtectedClick}><BookOpen className="mr-1.5 h-4 w-4" />查看相关资料</Button></div>}
          <p className="rounded-xl bg-muted/70 p-3 text-xs leading-relaxed text-muted-foreground">{disclaimer}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function TaxAiAssistantPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 1, role: "ai", answer: buildAiAnswer("如何开始咨询基础税务问题？") }]);
  const requireLogin = () => { if (isLoggedIn) return true; setShowLoginModal(true); return false; };
  const submitQuestion = async (question: string) => {
    const text = question.trim();
    if (!text || isThinking || !requireLogin()) return;
    const id = Date.now();
    setMessages((list) => [...list, { id, role: "user", content: text }]);
    setInputValue("");
    setIsThinking(true);
    await new Promise((resolve) => window.setTimeout(resolve, 1100));
    setMessages((list) => [...list, { id: id + 1, role: "ai", answer: buildAiAnswer(text) }]);
    setIsThinking(false);
  };
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 py-3 backdrop-blur"><div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="返回" onClick={() => router.push("/")}><ArrowLeft className="h-5 w-5" /></Button><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10"><Sparkles className="h-5 w-5 text-primary" /></div><div className="min-w-0 flex-1"><h1 className="text-base font-bold">AI 税务助手</h1><p className="text-xs text-muted-foreground">基于财税知识库，仅供参考</p></div><Badge className="bg-success/10 text-success hover:bg-success/10">知识库</Badge></div></header>
      <main className="flex-1 space-y-4 px-4 pb-28 pt-4">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm leading-relaxed text-destructive"><div className="flex gap-2"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />涉及稽查、虚开发票、大额公转私等问题，建议预约顾问进一步确认。</div></div>
        <section><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">快捷问题</h2>{!isLoggedIn && <span className="text-xs text-muted-foreground">点击后需登录</span>}</div><div className="grid grid-cols-2 gap-2">{quickQuestions.map((question) => <button key={question} className="rounded-2xl border border-border bg-card p-3 text-left text-sm leading-snug shadow-sm transition hover:border-primary/30 hover:bg-primary/5" onClick={() => submitQuestion(question)}><MessageCircle className="mb-2 h-4 w-4 text-primary" />{question}</button>)}</div></section>
        <section className="space-y-4">{messages.map((message) => message.role === "user" ? <div key={message.id} className="flex justify-end gap-2"><div className="max-w-[78%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground shadow-sm">{message.content}</div><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><User className="h-4 w-4" /></div></div> : <div key={message.id} className="flex gap-2"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10"><Bot className="h-4 w-4 text-primary" /></div><div className="min-w-0 flex-1"><AiAnswerCard answer={message.answer} onProtectedClick={requireLogin} /></div></div>)}{isThinking && <div className="flex gap-2"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10"><Bot className="h-4 w-4 text-primary" /></div><div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm"><Loader2 className="h-4 w-4 animate-spin text-primary" />正在检索知识库并生成回答...</div></div>}</section>
      </main>
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 p-4 shadow-lg backdrop-blur"><div className="mx-auto flex max-w-[390px] gap-2"><Input placeholder="请输入您的税务问题" value={inputValue} onChange={(event) => setInputValue(event.target.value)} onFocus={requireLogin} onKeyDown={(event) => { if (event.key === "Enter") submitQuestion(inputValue); }} className="h-12 rounded-xl" /><Button className="h-12 w-12 shrink-0 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => submitQuestion(inputValue)} disabled={isThinking} aria-label="发送">{isThinking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}</Button></div><div className="mx-auto mt-2 flex max-w-[390px] items-center justify-center gap-1 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" />AI 回答仅供参考，高风险事项建议顾问确认</div></div>
      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} onSuccess={() => setIsLoggedIn(true)} />
    </div>
  );
}
