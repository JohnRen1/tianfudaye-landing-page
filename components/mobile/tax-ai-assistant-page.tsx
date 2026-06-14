"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Bot,
  CalendarCheck,
  Loader2,
  MessageCircle,
  Send,
  ShieldAlert,
  Sparkles,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LoginModal } from "./login-modal";
import { sendMessage } from "@/lib/api/ai-chat";
import type { AiAnswerBodyDTO, ChatMessageDTO } from "@/lib/contracts/ai-chat";
import { RISK_LEVEL_LABEL, type RiskLevel } from "@/lib/contracts/shared";

const quickQuestions = [
  "发票合规怎么判断？",
  "公转私有什么风险？",
  "长期零申报会被查吗？",
  "收到税务检查通知怎么办？",
];
const disclaimer =
  "以上内容由 AI 根据现有知识库生成，仅供参考，不构成正式税务意见。具体处理方案需结合企业实际情况，并由专业税务顾问进一步确认。";

function riskMeta(level: RiskLevel) {
  if (level === "critical")
    return {
      label: RISK_LEVEL_LABEL.critical,
      box: "bg-destructive/10 text-destructive border-destructive/20",
      dot: "bg-destructive",
      isHigh: true,
    };
  if (level === "high")
    return {
      label: RISK_LEVEL_LABEL.high,
      box: "bg-destructive/10 text-destructive border-destructive/20",
      dot: "bg-destructive",
      isHigh: true,
    };
  if (level === "medium")
    return {
      label: RISK_LEVEL_LABEL.medium,
      box: "bg-warning/10 text-warning border-warning/20",
      dot: "bg-warning",
      isHigh: false,
    };
  return {
    label: RISK_LEVEL_LABEL.low,
    box: "bg-primary/10 text-primary border-primary/20",
    dot: "bg-primary",
    isHigh: false,
  };
}

function AiAnswerCard({
  answer,
  onProtectedClick,
}: {
  answer: AiAnswerBodyDTO;
  onProtectedClick: () => void;
}) {
  const meta = riskMeta(answer.riskLevel);
  return (
    <Card className={cn("border-0 bg-card shadow-sm", meta.isHigh && "ring-1 ring-destructive/20")}>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold">AI 知识库回答</span>
          </div>
          <Badge variant="outline" className={cn("rounded-full", meta.box)}>
            <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", meta.dot)} />
            {meta.label}
          </Badge>
        </div>
        <div className="space-y-3 text-sm">
          <section>
            <h3 className="mb-1 font-semibold text-foreground">问题理解</h3>
            <p className="leading-relaxed text-muted-foreground">{answer.questionUnderstanding}</p>
          </section>
          <section>
            <h3 className="mb-1 font-semibold text-foreground">初步判断</h3>
            <p className="leading-relaxed text-muted-foreground">{answer.initialJudgment}</p>
          </section>
          <section>
            <h3 className="mb-1 font-semibold text-foreground">涉及风险</h3>
            <ul className="space-y-1 text-muted-foreground">
              {answer.involvedRisks.map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-destructive/70" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="mb-1 font-semibold text-foreground">处理建议</h3>
            <ul className="space-y-1 text-muted-foreground">
              {answer.suggestions.map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
          <div className="space-y-2 rounded-xl bg-secondary/60 p-3">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">风险等级</span>
              <span className={cn("font-semibold", meta.isHigh ? "text-destructive" : "text-primary")}>
                {meta.label}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">是否建议人工顾问介入</span>
              <span className="font-semibold text-destructive">
                {answer.advisorRecommended ? "建议介入" : "暂不需要"}
              </span>
            </div>
          </div>
          {answer.needsConfirmation && (
            <div className="rounded-xl border border-warning/20 bg-warning/10 p-3 text-warning">
              建议结合企业实际情况由顾问确认。
            </div>
          )}
          {answer.advisorRecommended && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={onProtectedClick}
              >
                <CalendarCheck className="mr-1.5 h-4 w-4" />
                预约顾问解读
              </Button>
              <Button
                variant="outline"
                className="rounded-xl border-primary/20 text-primary"
                onClick={onProtectedClick}
              >
                <BookOpen className="mr-1.5 h-4 w-4" />
                查看相关资料
              </Button>
            </div>
          )}
          <p className="rounded-xl bg-muted/70 p-3 text-xs leading-relaxed text-muted-foreground">
            {disclaimer}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function AiLoadingCard() {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      正在检索知识库并生成回答...
    </div>
  );
}

function useActivityId(): string | null {
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("activity_id");
  if (fromUrl) return fromUrl;
  if (typeof window !== "undefined") {
    return localStorage.getItem("activity_id");
  }
  return null;
}

export function TaxAiAssistantPage() {
  const router = useRouter();
  const activityId = useActivityId();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const requireLogin = () => {
    if (isLoggedIn) return true;
    setShowLoginModal(true);
    return false;
  };

  const submitQuestion = async (question: string) => {
    const text = question.trim();
    if (!text || isThinking || !requireLogin()) return;

    const userMsgId = Date.now();
    const aiMsgId = userMsgId + 1;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: text },
      { id: aiMsgId, role: "ai", answer: null, qaRecordId: null },
    ]);
    setInputValue("");
    setIsThinking(true);
    setErrorMessage(null);

    try {
      const response = await sendMessage(text, sessionId, activityId);

      // Persist sessionId for multi-turn conversation
      setSessionId(response.sessionId);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? { ...msg, answer: response.answer, qaRecordId: response.qaRecordId }
            : msg,
        ),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "请求失败，请稍后重试";
      setErrorMessage(message);
      // Remove the placeholder AI message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== aiMsgId));
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            aria-label="返回"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold">AI 税务助手</h1>
            <p className="text-xs text-muted-foreground">基于财税知识库，仅供参考</p>
          </div>
          <Badge className="bg-success/10 text-success hover:bg-success/10">知识库</Badge>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 pb-28 pt-4">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm leading-relaxed text-destructive">
          <div className="flex gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            涉及稽查、虚开发票、大额公转私等问题，建议预约顾问进一步确认。
          </div>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">快捷问题</h2>
            {!isLoggedIn && <span className="text-xs text-muted-foreground">点击后需登录</span>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {quickQuestions.map((question) => (
              <button
                key={question}
                className="rounded-2xl border border-border bg-card p-3 text-left text-sm leading-snug shadow-sm transition hover:border-primary/30 hover:bg-primary/5"
                onClick={() => submitQuestion(question)}
              >
                <MessageCircle className="mb-2 h-4 w-4 text-primary" />
                {question}
              </button>
            ))}
          </div>
        </section>

        {errorMessage && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {errorMessage}
            </div>
          </div>
        )}

        <section className="space-y-4">
          {messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end gap-2">
                <div className="max-w-[78%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground shadow-sm">
                  {message.content}
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <User className="h-4 w-4" />
                </div>
              </div>
            ) : (
              <div key={message.id} className="flex gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  {message.answer ? (
                    <AiAnswerCard answer={message.answer} onProtectedClick={requireLogin} />
                  ) : (
                    <AiLoadingCard />
                  )}
                </div>
              </div>
            ),
          )}
          {isThinking && messages.at(-1)?.role !== "ai" && (
            <div className="flex gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <AiLoadingCard />
            </div>
          )}
          <div ref={messagesEndRef} />
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 p-4 shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-[390px] gap-2">
          <Input
            placeholder="请输入您的税务问题"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onFocus={requireLogin}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitQuestion(inputValue);
            }}
            className="h-12 rounded-xl"
          />
          <Button
            className="h-12 w-12 shrink-0 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => submitQuestion(inputValue)}
            disabled={isThinking}
            aria-label="发送"
          >
            {isThinking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
        <div className="mx-auto mt-2 flex max-w-[390px] items-center justify-center gap-1 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" />
          AI 回答仅供参考，高风险事项建议顾问确认
        </div>
      </div>

      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        onSuccess={() => setIsLoggedIn(true)}
      />
    </div>
  );
}
