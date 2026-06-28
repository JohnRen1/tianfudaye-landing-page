"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
import { sendMessageStream } from "@/lib/api/ai-chat";
import type { AiAnswerBodyDTO, ChatMessageDTO } from "@/lib/contracts/ai-chat";
import { hydrateClientAuthFromServer, isClientLoggedIn } from "@/lib/client-auth";

const quickQuestions = [
  "发票合规怎么判断？",
  "公转私有什么风险？",
  "长期零申报会被查吗？",
  "收到税务检查通知怎么办？",
];
const disclaimer =
  "以上内容由 AI 根据现有知识库生成，仅供参考，不构成正式税务意见。具体处理方案需结合企业实际情况，并由专业税务顾问进一步确认。";
const showAiDebug = process.env.NEXT_PUBLIC_AI_DEBUG === "true";
const CHAT_STATE_STORAGE_KEY = "tax-ai-chat-state-v1";

interface StoredChatState {
  messages: ChatMessageDTO[];
  sessionId: string | null;
  inputValue: string;
  savedAt: number;
}

function isStoredChatState(value: unknown): value is StoredChatState {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.messages) && "sessionId" in record && typeof record.savedAt === "number";
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function MarkdownAnswer({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let orderedItems: string[] = [];
  let paragraphLines: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    const items = listItems;
    listItems = [];
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="space-y-1 pl-4 text-muted-foreground">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="list-disc leading-relaxed">
            {renderInlineMarkdown(item)}
          </li>
        ))}
      </ul>,
    );
  };

  const flushOrderedList = () => {
    if (orderedItems.length === 0) return;
    const items = orderedItems;
    orderedItems = [];
    blocks.push(
      <ol key={`ol-${blocks.length}`} className="space-y-1 pl-4 text-muted-foreground">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="list-decimal leading-relaxed">
            {renderInlineMarkdown(item)}
          </li>
        ))}
      </ol>,
    );
  };

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const paragraph = paragraphLines.join(" ");
    paragraphLines = [];
    blocks.push(
      <p key={`p-${blocks.length}`} className="leading-relaxed text-muted-foreground">
        {renderInlineMarkdown(paragraph)}
      </p>,
    );
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      flushOrderedList();
      continue;
    }

    if (/^-{3,}$/.test(line)) {
      flushParagraph();
      flushList();
      flushOrderedList();
      blocks.push(<hr key={`hr-${blocks.length}`} className="border-border" />);
      continue;
    }

    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(line);
    if (headingMatch) {
      flushParagraph();
      flushList();
      flushOrderedList();
      const level = headingMatch[1].length;
      const className =
        level <= 2
          ? "pt-1 text-base font-semibold text-foreground"
          : "pt-1 text-sm font-semibold text-foreground";
      blocks.push(
        <h4 key={`h-${blocks.length}`} className={className}>
          {renderInlineMarkdown(headingMatch[2])}
        </h4>,
      );
      continue;
    }

    const orderedMatch = /^\d+\.\s+(.+)$/.exec(line);
    if (orderedMatch) {
      flushParagraph();
      flushList();
      orderedItems.push(orderedMatch[1]);
      continue;
    }

    const bulletMatch = /^[-*]\s+(.+)$/.exec(line);
    if (bulletMatch) {
      flushParagraph();
      flushOrderedList();
      listItems.push(bulletMatch[1]);
      continue;
    }

    flushList();
    flushOrderedList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();
  flushOrderedList();

  return <div className="max-w-full space-y-3 overflow-hidden break-words">{blocks}</div>;
}

function AiAnswerCard({
  answer,
  onAppointmentClick,
  onMaterialsClick,
}: {
  answer: AiAnswerBodyDTO;
  onAppointmentClick: () => void;
  onMaterialsClick: () => void;
}) {
  useEffect(() => {
    if (showAiDebug && answer.citations && answer.citations.length > 0) {
      console.debug("[tax-ai] reference citations", answer.citations);
    }
  }, [answer.citations]);

  return (
    <div className="max-w-full space-y-3 overflow-hidden">
      <Card className="border-0 bg-card shadow-sm">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold">AI 知识库回答</span>
          </div>
          <div className="space-y-3 text-sm">
            {answer.answerText ? (
              <section>
                <h3 className="mb-1 font-semibold text-foreground">回答内容</h3>
                <MarkdownAnswer content={answer.answerText} />
              </section>
            ) : (
              <>
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
              </>
            )}
            <p className="rounded-xl bg-muted/70 p-3 text-xs leading-relaxed text-muted-foreground">
              {disclaimer}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 bg-card shadow-sm">
        <CardContent className="space-y-3 p-4 text-sm">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/60 p-3">
            <span className="text-muted-foreground">是否建议人工顾问介入</span>
            <span className={cn("font-semibold", answer.advisorRecommended ? "text-destructive" : "text-primary")}>
              {answer.advisorRecommended ? "建议介入" : "暂不需要"}
            </span>
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
                onClick={onAppointmentClick}
              >
                <CalendarCheck className="mr-1.5 h-4 w-4" />
                预约顾问解读
              </Button>
              <Button
                variant="outline"
                className="rounded-xl border-primary/20 text-primary"
                onClick={onMaterialsClick}
              >
                <BookOpen className="mr-1.5 h-4 w-4" />
                查看相关资料
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
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
  const fromUrl =
    searchParams.get("activity_id") ?? searchParams.get("activity");

  const [activityId, setActivityId] = useState<string | null>(fromUrl ?? null);

  useEffect(() => {
    if (fromUrl) {
      setActivityId(fromUrl);
      return;
    }
    const stored = localStorage.getItem("activity_id");
    if (stored) setActivityId(stored);
  }, [fromUrl]);

  return activityId;
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
  const [isChatStateRestored, setIsChatStateRestored] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void hydrateClientAuthFromServer().then((loggedIn) => {
      if (loggedIn) setIsLoggedIn(true);
    });
  }, []);

  useEffect(() => {
    const rawState = sessionStorage.getItem(CHAT_STATE_STORAGE_KEY);
    if (!rawState) {
      setIsChatStateRestored(true);
      return;
    }

    try {
      const parsed: unknown = JSON.parse(rawState);
      if (!isStoredChatState(parsed)) {
        setIsChatStateRestored(true);
        return;
      }
      const completedMessages = parsed.messages.filter(
        (message) => message.role === "user" || message.answer !== null,
      );
      setMessages(completedMessages);
      setSessionId(parsed.sessionId);
      setInputValue(parsed.inputValue);
    } catch {
      sessionStorage.removeItem(CHAT_STATE_STORAGE_KEY);
    } finally {
      setIsChatStateRestored(true);
    }
  }, []);

  useEffect(() => {
    if (!isChatStateRestored) return;

    const completedMessages = messages.filter(
      (message) => message.role === "user" || message.answer !== null,
    );
    const storedState: StoredChatState = {
      messages: completedMessages,
      sessionId,
      inputValue,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(CHAT_STATE_STORAGE_KEY, JSON.stringify(storedState));
  }, [inputValue, isChatStateRestored, messages, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const requireLogin = () => {
    if (isLoggedIn) return true;
    setShowLoginModal(true);
    return false;
  };

  const persistCurrentChatState = () => {
    const completedMessages = messages.filter(
      (message) => message.role === "user" || message.answer !== null,
    );
    const storedState: StoredChatState = {
      messages: completedMessages,
      sessionId,
      inputValue,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(CHAT_STATE_STORAGE_KEY, JSON.stringify(storedState));
  };

  const openAppointment = () => {
    if (!requireLogin()) return;
    persistCurrentChatState();
    router.push("/appointment");
  };

  const openMaterials = () => {
    if (!requireLogin()) return;
    persistCurrentChatState();
    router.push("/materials");
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
      let streamedText = "";
      await sendMessageStream(text, sessionId, activityId, {
        onDelta: (delta) => {
          streamedText += delta;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMsgId
                ? {
                    ...msg,
                    answer: {
                      answerText: streamedText,
                      questionUnderstanding: `您询问的是：${text.slice(0, 80)}${text.length > 80 ? "..." : ""}`,
                      initialJudgment: streamedText,
                      involvedRisks: [],
                      suggestions: [],
                      riskLevel: "low",
                      advisorRecommended: false,
                      needsConfirmation: false,
                      knowledgeItemIds: [],
                    },
                  }
                : msg,
            ),
          );
        },
        onDone: (response) => {
          setSessionId(response.sessionId);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMsgId
                ? { ...msg, answer: response.answer, qaRecordId: response.qaRecordId }
                : msg,
            ),
          );
        },
      });
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

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  };

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-background">
      <header className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80 px-4 pb-6 pt-4 text-primary-foreground">
        <div className="absolute -right-20 top-5 h-44 w-44 rounded-full border border-white/15" />
        <div className="absolute -right-8 top-16 h-24 w-24 rounded-full border border-white/20" />
        <div className="absolute bottom-5 right-12 h-16 w-16 rounded-full bg-accent/20 blur-sm" />
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="mb-6 rounded-full text-white hover:bg-white/10 hover:text-white"
            aria-label="返回"
            onClick={handleBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 shadow-inner backdrop-blur">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <Badge className="mb-2 bg-accent text-accent-foreground hover:bg-accent/90">
                知识库
              </Badge>
              <h1 className="text-2xl font-bold tracking-tight">AI 税务助手</h1>
            </div>
          </div>

          <p className="mt-4 max-w-[300px] text-sm leading-relaxed text-white/80">
            基于财税知识库快速答疑，仅供参考，不构成正式税务意见
          </p>
        </div>
      </header>

      <main className="min-w-0 flex-1 space-y-4 px-4 pb-36 pt-4">
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
              <div key={message.id} className="flex min-w-0 justify-end gap-2">
                <div className="min-w-0 max-w-[78%] break-words rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground shadow-sm">
                  {message.content}
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <User className="h-4 w-4" />
                </div>
              </div>
            ) : (
              <div key={message.id} className="flex min-w-0 gap-2 overflow-hidden">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  {message.answer ? (
                    <AiAnswerCard
                      answer={message.answer}
                      onAppointmentClick={openAppointment}
                      onMaterialsClick={openMaterials}
                    />
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

      <div className="fixed bottom-0 left-1/2 right-auto w-full max-w-[390px] -translate-x-1/2 border-t border-border bg-card/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lg backdrop-blur">
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
