"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  ExternalLink,
  Headphones,
  Loader2,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoginModal } from "./login-modal";
import { sendMessageStream } from "@/lib/api/ai-chat";
import type { AiAnswerBodyDTO, AiChatRequestDTO, ChatMessageDTO } from "@/lib/contracts/ai-chat";
import { getClientAuthToken, hydrateClientAuthFromServer, isClientLoggedIn } from "@/lib/client-auth";
import { buildPathWithTracking } from "@/lib/tracking-context";
import {
  CHAT_STATE_STORAGE_KEY_PREFIX,
  getChatStateStorageKey,
} from "./tax-ai-chat-state";

const quickQuestions = [
  "员工退休，公司需要怎么处理？",
  "我们能享受哪些税收优惠？",
  "收到发票后应该怎么处理？",
  "公转私一般有哪些税务风险？",
];
const showAiDebug = process.env.NEXT_PUBLIC_AI_DEBUG === "true";

function isSafeInternalPath(value: string | null): value is string {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\"));
}

interface StoredChatState {
  messages: ChatMessageDTO[];
  sessionId: string | null;
  inputValue: string;
  savedAt: number;
}

function isStoredChatState(value: unknown): value is StoredChatState {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.messages) &&
    "sessionId" in record &&
    typeof record.inputValue === "string" &&
    typeof record.savedAt === "number"
  );
}

function getStoredChatState(storageKey: string): StoredChatState | null {
  const rawState = sessionStorage.getItem(storageKey);
  if (!rawState) return null;

  try {
    const parsed: unknown = JSON.parse(rawState);
    return isStoredChatState(parsed) ? parsed : null;
  } catch {
    sessionStorage.removeItem(storageKey);
    return null;
  }
}

function findLegacyChatState(token: string | null): StoredChatState | null {
  if (!token) return null;

  let userId: string;
  try {
    const decodedToken = atob(token);
    const separatorIndex = decodedToken.lastIndexOf(":");
    userId = decodedToken.slice(0, separatorIndex);
    if (separatorIndex <= 0 || userId.length < 10) return null;
  } catch {
    return null;
  }

  const candidates = Object.keys(sessionStorage)
    .filter((key) => {
      if (!key.startsWith(CHAT_STATE_STORAGE_KEY_PREFIX)) return false;
      const legacyToken = key.slice(CHAT_STATE_STORAGE_KEY_PREFIX.length);
      try {
        const decodedLegacyToken = atob(legacyToken);
        return decodedLegacyToken.startsWith(`${userId}:`);
      } catch {
        return false;
      }
    })
    .map(getStoredChatState)
    .filter((state): state is StoredChatState => state !== null);

  const meaningfulCandidates = candidates.filter(
    (state) => state.messages.length > 0 || state.inputValue.trim().length > 0 || state.sessionId !== null,
  );
  return (meaningfulCandidates.length > 0 ? meaningfulCandidates : candidates).sort(
    (left, right) => right.savedAt - left.savedAt,
  )[0] ?? null;
}

function persistChatState(
  storageKey: string,
  messages: ChatMessageDTO[],
  sessionId: string | null,
  inputValue: string,
): void {
  const completedMessages = messages.filter(
    (message) => message.role === "user" || message.answer !== null,
  );
  const storedState: StoredChatState = {
    messages: completedMessages,
    sessionId,
    inputValue,
    savedAt: Date.now(),
  };
  sessionStorage.setItem(storageKey, JSON.stringify(storedState));
}

function MarkdownAnswer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h3 className="pt-1 text-base font-semibold text-foreground">{children}</h3>,
        h2: ({ children }) => <h3 className="pt-1 text-base font-semibold text-foreground">{children}</h3>,
        h3: ({ children }) => <h4 className="pt-1 text-sm font-semibold text-foreground">{children}</h4>,
        h4: ({ children }) => <h4 className="pt-1 text-sm font-semibold text-foreground">{children}</h4>,
        p: ({ children }) => <p className="leading-relaxed text-muted-foreground">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        ul: ({ children }) => <ul className="list-disc space-y-1 pl-5 text-muted-foreground">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">{children}</ol>,
        li: ({ children }) => <li className="pl-0.5 leading-relaxed">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary/40 pl-3 text-muted-foreground">{children}</blockquote>
        ),
        hr: () => <hr className="border-border" />,
        table: ({ children }) => (
          <div className="max-w-full overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[480px] border-collapse text-left text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-muted text-foreground">{children}</thead>,
        th: ({ children }) => <th className="border-b border-r border-border px-3 py-2 font-semibold last:border-r-0">{children}</th>,
        td: ({ children }) => <td className="border-b border-r border-border px-3 py-2 align-top text-muted-foreground last:border-r-0">{children}</td>,
        code: ({ children }) => (
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">{children}</code>
        ),
        a: ({ href, children }) =>
          href?.startsWith("https://") ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 break-all font-medium text-primary underline underline-offset-2"
            >
              {children}
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
            </a>
          ) : (
            <span>{children}</span>
          ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function AiAnswerCard({
  answer,
  onSupportClick,
}: {
  answer: AiAnswerBodyDTO;
  onSupportClick: () => void;
}) {
  useEffect(() => {
    if (showAiDebug && answer.citations && answer.citations.length > 0) {
      console.debug("[tax-ai] reference citations", answer.citations);
    }
  }, [answer.citations]);

  return (
    <div className="max-w-full space-y-3 rounded-2xl rounded-tl-sm bg-card px-4 py-3 text-sm shadow-sm">
      <div className="max-w-full space-y-3 overflow-hidden break-words">
        <MarkdownAnswer content={answer.answerText || answer.initialJudgment} />
      </div>
      <div className="border-t border-border pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-primary"
          onClick={onSupportClick}
        >
          <Headphones className="mr-1.5 h-3.5 w-3.5" />
          联系人工客服
        </Button>
      </div>
    </div>
  );
}

function AiLoadingCard() {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      正在思考...
    </div>
  );
}

export function TaxAiAssistantPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activityId = searchParams.get("activity_id") ?? searchParams.get("activity");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isChatStateRestored, setIsChatStateRestored] = useState(false);
  const [chatStateStorageKey, setChatStateStorageKey] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void hydrateClientAuthFromServer().then((loggedIn) => {
      setIsLoggedIn(loggedIn);
      const token = getClientAuthToken();
      setChatStateStorageKey(loggedIn ? getChatStateStorageKey(token) : null);
    });
  }, []);

  useEffect(() => {
    if (chatStateStorageKey === null) return;
    const storedState =
      getStoredChatState(chatStateStorageKey) ?? findLegacyChatState(getClientAuthToken());
    if (!storedState) {
      setIsChatStateRestored(true);
      return;
    }

    const completedMessages = storedState.messages.filter(
      (message) => message.role === "user" || message.answer !== null,
    );
    setMessages(completedMessages);
    setSessionId(storedState.sessionId);
    setInputValue(storedState.inputValue);
    sessionStorage.setItem(chatStateStorageKey, JSON.stringify(storedState));
    setIsChatStateRestored(true);
  }, [chatStateStorageKey]);

  useEffect(() => {
    if (!isChatStateRestored || chatStateStorageKey === null) return;
    persistChatState(chatStateStorageKey, messages, sessionId, inputValue);
  }, [chatStateStorageKey, inputValue, isChatStateRestored, messages, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const requireLogin = () => {
    if (isLoggedIn) return true;
    setShowLoginModal(true);
    return false;
  };

  const buildTrackedPath = (path: string) => buildPathWithTracking(path, searchParams);
  const fallbackBackPath = buildTrackedPath("/");
  const requestedBackPath = searchParams.get("returnTo");
  const backPath = isSafeInternalPath(requestedBackPath) ? requestedBackPath : fallbackBackPath;
  const currentPath = `/tax-ai${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const openSupport = () => {
    if (chatStateStorageKey !== null) {
      persistChatState(chatStateStorageKey, messages, sessionId, inputValue);
    }
    const supportUrl = new URL(buildTrackedPath("/support"), "https://local.invalid");
    supportUrl.searchParams.set("returnTo", currentPath);
    router.push(`${supportUrl.pathname}${supportUrl.search}`);
  };
  const restoreChatStateForCurrentUser = () => {
    const token = getClientAuthToken();
    setChatStateStorageKey(getChatStateStorageKey(token));
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
      const recentHistory: NonNullable<AiChatRequestDTO["recentHistory"]> = [];
      for (const message of messages) {
        if (message.role === "user") {
          recentHistory.push({ role: "user", content: message.content });
        } else if (message.answer) {
          recentHistory.push({
            role: "assistant",
            content: message.answer.answerText || message.answer.initialJudgment,
          });
        }
      }
      await sendMessageStream(text, sessionId, activityId, recentHistory.slice(-10), {
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
    router.replace(backPath);
  };

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-background">
      <header className="mobile-safe-hero relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80 px-4 pb-6 pt-4 text-primary-foreground">
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
              <h1 className="text-2xl font-bold tracking-tight">AI 客服助手</h1>
            </div>
          </div>

          <p className="mt-4 max-w-[300px] text-sm leading-relaxed text-white/80">
            可以直接提问，也可以接着上一轮自然交流
          </p>
        </div>
      </header>

      <main className="min-w-0 flex-1 space-y-4 px-4 pb-36 pt-4">
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
              <div key={message.id} className="-ml-2 flex min-w-0 gap-1.5 overflow-hidden">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  {message.answer ? (
                    <AiAnswerCard answer={message.answer} onSupportClick={openSupport} />
                  ) : (
                    <AiLoadingCard />
                  )}
                </div>
              </div>
            ),
          )}
          {isThinking && messages.at(-1)?.role !== "ai" && (
            <div className="-ml-2 flex gap-1.5">
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
            placeholder="请输入消息"
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
          AI 可能出错，请核对重要信息
        </div>
      </div>

      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        onSuccess={() => {
          setIsLoggedIn(true);
          restoreChatStateForCurrentUser();
        }}
      />
    </div>
  );
}
