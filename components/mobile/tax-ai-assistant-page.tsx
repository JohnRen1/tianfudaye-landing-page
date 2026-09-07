"use client";
import { PageLoadingState } from './page-loading-state';

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  ExternalLink,
  Headphones,
  History,
  Plus,
  Loader2,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Square,
  User,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LoginModal } from "./login-modal";
import { getChatHistorySession, saveExpertReview, sendMessageStream, transcribeSpeech } from "@/lib/api/ai-chat";
import { ApiError } from "@/lib/api/client";
import { getExpertStatus, me } from "@/lib/api/auth";
import type { AiAnswerBodyDTO, AiChatRequestDTO, ChatMessageDTO, AiCitationDTO, PolicyRelationDTO } from "@/lib/contracts/ai-chat";
import { getClientAuthToken, hydrateClientAuthFromServer, isClientLoggedIn } from "@/lib/client-auth";
import { normalizeMarkdownForRender } from "@/lib/markdown";
import { buildPathWithTracking } from "@/lib/tracking-context";
import {
  CHAT_STATE_STORAGE_KEY_PREFIX,
  EXPERT_SESSION_STORAGE_KEY,
} from "./tax-ai-chat-state";

const quickQuestions = [
  "员工退休，公司需要怎么处理？",
  "我们能享受哪些税收优惠？",
  "请详细说明收到发票后的处理流程",
  "公转私一般有哪些税务风险？",
];
const showAiDebug = process.env.NEXT_PUBLIC_AI_DEBUG === "true";
const VOICE_SAMPLE_RATE = 16000;
const MAX_VOICE_SECONDS = 60;

type WebAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

type VoiceSupport = "checking" | "supported" | "insecure" | "unsupported";

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

function mergeAudioBuffers(chunks: Float32Array[]): Float32Array {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const result = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function downsampleAudioBuffer(buffer: Float32Array, inputSampleRate: number, outputSampleRate: number): Float32Array {
  if (inputSampleRate === outputSampleRate) return buffer;
  if (inputSampleRate < outputSampleRate) return buffer;

  const ratio = inputSampleRate / outputSampleRate;
  const outputLength = Math.floor(buffer.length / ratio);
  const result = new Float32Array(outputLength);
  for (let index = 0; index < outputLength; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.min(Math.floor((index + 1) * ratio), buffer.length);
    let sum = 0;
    for (let inputIndex = start; inputIndex < end; inputIndex += 1) {
      sum += buffer[inputIndex];
    }
    result[index] = sum / Math.max(1, end - start);
  }
  return result;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const dataLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }
  return new Blob([view], { type: "audio/wav" });
}

function MarkdownAnswer({ content }: { content: string }) {
  const normalizedContent = normalizeMarkdownForRender(content);
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
          <div
            className="my-2 min-w-0 max-w-full touch-pan-x overflow-x-auto overscroll-x-contain rounded-md border border-border"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <table className="w-max min-w-[560px] max-w-none border-collapse text-left text-xs">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-muted text-foreground">{children}</thead>,
        th: ({ children }) => (
          <th className="border-b border-r border-border px-3 py-2 font-semibold last:border-r-0">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-r border-border px-3 py-2 align-top text-muted-foreground last:border-r-0">
            {children}
          </td>
        ),
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
      {normalizedContent}
    </ReactMarkdown>
  );
}

const relationTypeLabel: Record<string, string> = {
  full_repeal: "全文废止",
  partial_repeal: "部分废止/调整",
  extends: "延续执行",
  keeps_conditions: "其他条件不变",
  sets_deadline: "明确执行期限",
  amends: "修改/调整",
  replaces: "替代执行",
  follows: "按照新文件执行",
  conflict_override: "新规优先",
};

const confidenceLabel: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

function getRelationTypeLabel(type: string): string {
  return relationTypeLabel[type] ?? (type || "未标注关系");
}

function getConfidenceLabel(confidence: string): string {
  return confidenceLabel[confidence] ?? (confidence || "未标注");
}

function citationGroupKey(citation: AiCitationDTO): string {
  return citation.documentNo || citation.sourcePath || citation.title || citation.docId || citation.pointId;
}

function relationKey(relation: PolicyRelationDTO): string {
  return [
    relation.sourceDocNo,
    relation.targetDocNo,
    relation.relationType,
    relation.scope,
    relation.evidenceText,
  ].join("|");
}

function mergeCitationsBySource(citations: AiCitationDTO[]): AiCitationDTO[] {
  const groups = new Map<string, AiCitationDTO>();

  for (const citation of citations) {
    const key = citationGroupKey(citation);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        ...citation,
        policyRelations: [...(citation.policyRelations ?? [])],
      });
      continue;
    }

    const existingRelations = existing.policyRelations ?? [];
    const relationKeys = new Set(existingRelations.map(relationKey));
    const nextRelations = (citation.policyRelations ?? []).filter((relation) => !relationKeys.has(relationKey(relation)));
    existing.policyRelations = [...existingRelations, ...nextRelations];
    existing.score = Math.max(existing.score, citation.score);
    existing.section = existing.section === citation.section ? existing.section : "多处正文";
    existing.status = existing.status || citation.status;
    existing.evidenceLevel = existing.evidenceLevel || citation.evidenceLevel;
  }

  return Array.from(groups.values());
}

async function isCurrentUserExpert(): Promise<boolean> {
  try {
    const status = await getExpertStatus();
    return status.isExpert;
  } catch {
    return false;
  }
}

function AiAnswerCard({
  answer,
  onSupportClick,
  expertMode = false,
  question = "",
  sessionId,
  qaRecordId,
  onReviewStarted,
}: {
  answer: AiAnswerBodyDTO;
  onSupportClick: (qaRecordId: string | null) => void;
  expertMode?: boolean;
  question?: string;
  sessionId: string | null;
  qaRecordId: string | null;
  onReviewStarted?: () => void;
}) {
  const [reviewKind, setReviewKind] = useState<"incorrect" | "needs_revision" | null>(null);
  const [expertComment, setExpertComment] = useState("");
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [reviewSaved, setReviewSaved] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  useEffect(() => {
    if (showAiDebug && answer.citations && answer.citations.length > 0) {
      console.debug("[tax-ai] reference citations", answer.citations);
    }
  }, [answer.citations]);
  const evidenceCitations = answer.citations ? mergeCitationsBySource(answer.citations) : [];

  return (
    <div className="min-w-0 max-w-full space-y-3 overflow-hidden rounded-2xl rounded-tl-sm bg-card px-4 py-3 text-sm shadow-sm">
      <div className="min-w-0 max-w-full space-y-3 break-words">
        <MarkdownAnswer content={answer.answerText || answer.initialJudgment} />
      </div>
      {expertMode && evidenceCitations.length > 0 && (
        <details className="rounded-xl border border-border bg-muted/30 p-3 text-xs">
          <summary className="cursor-pointer font-medium text-foreground">查看法规证据</summary>
          <div className="mt-2 space-y-3 text-muted-foreground">
            {evidenceCitations.map((citation, index) => (
              <div
                key={`${citation.pointId || citation.docId || citation.title}-${index}`}
                className="space-y-2 rounded-lg border border-border bg-background/70 p-2.5"
              >
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{citation.title || "未命名来源"}</p>
                  <p>
                    当前引用依据：{citation.documentNo || "未提供文号"} · {citation.section || "正文"}
                  </p>
                </div>
                {citation.policyRelations && citation.policyRelations.length > 0 && (
                  <div className="space-y-1 rounded-md bg-primary/5 p-2 text-primary">
                    <p className="font-medium">政策关系（新文件 → 被影响文件）</p>
                    {citation.policyRelations.map((relation, relationIndex) => (
                      <div key={`${relation.relationType}-${relation.targetDocNo}-${relationIndex}`} className="space-y-0.5">
                        <p>
                          政策关系：{relation.sourceDocNo || "当前依据"} → {relation.targetDocNo || "相关文件"}（
                          {getRelationTypeLabel(relation.relationType)}，置信度：
                          {getConfidenceLabel(relation.confidence)}）
                        </p>
                        {relation.evidenceText && (
                          <details className="rounded-md bg-background/70 p-2 text-muted-foreground">
                            <summary className="cursor-pointer font-medium text-foreground">查看依据摘录</summary>
                            <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed">
                              {relation.evidenceText}
                            </p>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
      <div className="border-t border-border pt-2">
        {expertMode ? (
          <div className="space-y-2">
            {!reviewKind && !reviewSaved && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onReviewStarted?.();
                    setReviewKind("incorrect");
                  }}
                >
                  回答有误
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onReviewStarted?.();
                    setReviewKind("needs_revision");
                  }}
                >
                  需要修正
                </Button>
              </div>
            )}
            {reviewKind && !reviewSaved && (
              <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs font-medium text-primary">请指出回答哪里有误，或补充需要修正的判断依据。</p>
                <textarea
                  value={expertComment}
                  onChange={(event) => setExpertComment(event.target.value)}
                  placeholder="例如：这里把排除条件当成充分条件了；还需要确认是否属于改制重组背景。"
                  className="min-h-32 w-full rounded-lg border border-border bg-background p-2 text-sm leading-relaxed outline-none focus:border-primary"
                  aria-label="专家意见"
                />
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReviewKind(null);
                      setReviewError(null);
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSavingReview || !expertComment.trim()}
                    onClick={async () => {
                      const comment = expertComment.trim();
                      const aiAnswer = answer.answerText || answer.initialJudgment;
                      const reviewSessionId = sessionId?.trim() || qaRecordId || `expert-review-${Date.now()}`;
                      if (!comment) {
                        setReviewError("请先填写专家意见。");
                        return;
                      }
                      if (!question.trim() || !aiAnswer.trim()) {
                        setReviewError("当前回答信息不完整，请刷新页面后重试。");
                        return;
                      }
                      setIsSavingReview(true);
                      setReviewError(null);
                      try {
                        await saveExpertReview({
                          sessionId: reviewSessionId,
                          qaRecordId,
                          question,
                          aiAnswer,
                          expertAnswer: comment,
                          reviewKind,
                          reason: comment,
                        });
                        setReviewSaved(true);
                      } catch (error) {
                        setReviewError(error instanceof Error ? error.message : "专家意见提交失败，请稍后重试。");
                      } finally {
                        setIsSavingReview(false);
                      }
                    }}
                  >
                    {isSavingReview ? "提交中..." : "提交专家意见"}
                  </Button>
                </div>
                {reviewError && (
                  <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-2 py-1.5 text-xs text-destructive">
                    {reviewError}
                  </p>
                )}
              </div>
            )}
            {reviewSaved && (
              <Button type="button" variant="outline" size="sm" disabled className="h-8 text-xs">
                已提交专家意见
              </Button>
            )}
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-primary"
            onClick={() => onSupportClick(qaRecordId)}
          >
            <Headphones className="mr-1.5 h-3.5 w-3.5" />
            联系人工客服
          </Button>
        )}
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

export function TaxAiAssistantPage({ expertMode = false }: { expertMode?: boolean }) {
  const params = useSearchParams();
  return <TaxAiConversation key={`${expertMode}:${params.get("session") ?? "current"}`} expertMode={expertMode} />;
}

function TaxAiConversation({ expertMode = false }: { expertMode?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activityId = searchParams.get("activity_id") ?? searchParams.get("activity");
  const requestedSession = expertMode ? null : searchParams.get("session");
  const [restoreAttempt, setRestoreAttempt] = useState(0);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(expertMode);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReviewLocked, setIsReviewLocked] = useState(false);
  const [isChatStateRestored, setIsChatStateRestored] = useState(false);
  const [chatStateStorageKey, setChatStateStorageKey] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceSupport, setVoiceSupport] = useState<VoiceSupport>("checking");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const recordingStartedAtRef = useRef<number>(0);

  const cleanupVoiceInput = async () => {
    audioProcessorRef.current?.disconnect();
    audioSourceRef.current?.disconnect();
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      await audioContextRef.current.close().catch(() => undefined);
    }
    audioProcessorRef.current = null;
    audioSourceRef.current = null;
    audioStreamRef.current = null;
    audioContextRef.current = null;
    recordingStartedAtRef.current = 0;
  };

  useEffect(() => {
    if (expertMode) {
      setIsLoggedIn(true);
      setChatStateStorageKey(EXPERT_SESSION_STORAGE_KEY);
      setIsAuthReady(true);
      return;
    }
    void hydrateClientAuthFromServer().then(async (loggedIn) => {
      setIsLoggedIn(loggedIn);
      setIsAuthReady(true);
      if (loggedIn) {
        const user = await me();
        setChatStateStorageKey(`${CHAT_STATE_STORAGE_KEY_PREFIX}user:${user.id}`);
      }
      if (loggedIn && await isCurrentUserExpert()) {
        const targetPath = `/tax-ai-pro${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
        router.replace(targetPath);
      }
    }).catch(() => {
      setIsAuthReady(true);
      setErrorMessage("登录状态加载失败，请刷新后重试");
    });
  }, [expertMode, router, searchParams]);

  useEffect(() => {
    if (chatStateStorageKey === null) return;
    let active = true;
    setIsChatStateRestored(false);
    setErrorMessage(null);
    async function restore() {
      const rootState = getStoredChatState(chatStateStorageKey!);
      const selected = requestedSession ?? rootState?.sessionId ?? null;
      const stored = (selected ? getStoredChatState(`${chatStateStorageKey}:session:${selected}`) : rootState)
        ?? (rootState?.sessionId === selected ? rootState : null)
        ?? (expertMode ? findLegacyChatState(getClientAuthToken()) : null);
      let restoredMessages = stored?.messages ?? [];
      // The cache key belongs to the server-verified user. Show it while revalidating.
      if (active && stored) {
        setMessages(restoredMessages);
        setInputValue(stored.inputValue);
      }
      if (!expertMode && selected) {
        try {
          const turns = await getChatHistorySession(selected);
          restoredMessages = turns.flatMap((turn, index): ChatMessageDTO[] => [
            { id: index * 2, role: "user", content: turn.question },
            { id: index * 2 + 1, role: "ai", answer: turn.answer, qaRecordId: turn.id },
          ]);
        } catch (error) {
          // A local, not-yet-sent conversation has no server record yet.
          if (!(error instanceof ApiError && error.status === 404 && stored && stored.messages.every((message) => message.role === "user"))) throw error;
        }
      }
      if (!active) return;
      setMessages(restoredMessages);
      setSessionId(selected?.startsWith("record:") ? null : selected ?? (expertMode ? null : crypto.randomUUID()));
      setInputValue(stored?.inputValue ?? "");
      setIsChatStateRestored(true);
    }
    void restore().catch((error: unknown) => {
      if (active) setErrorMessage(error instanceof Error ? error.message : "对话加载失败，请重试");
    });
    return () => { active = false; };
  }, [chatStateStorageKey, requestedSession, expertMode, restoreAttempt]);

  useEffect(() => {
    if (!isChatStateRestored || chatStateStorageKey === null) return;
    const storedSessionId = sessionId ?? requestedSession;
    persistChatState(chatStateStorageKey, messages, storedSessionId, inputValue);
    if (!expertMode && (requestedSession || sessionId)) {
      persistChatState(`${chatStateStorageKey}:session:${storedSessionId}`, messages, storedSessionId, inputValue);
    }
    if (!expertMode && sessionId && requestedSession !== sessionId) {
      const url = new URL(window.location.href);
      url.searchParams.set("session", sessionId);
      router.replace(`${url.pathname}${url.search}`);
    }
  }, [chatStateStorageKey, inputValue, isChatStateRestored, messages, sessionId, requestedSession, expertMode, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  useEffect(() => {
    const input = chatInputRef.current;
    if (!input) return;

    input.style.height = "0px";
    const nextHeight = Math.min(input.scrollHeight, 128);
    input.style.height = `${Math.max(nextHeight, 48)}px`;
    input.style.overflowY = input.scrollHeight > 128 ? "auto" : "hidden";
  }, [inputValue]);

  useEffect(() => {
    return () => {
      void cleanupVoiceInput();
    };
  }, []);

  useEffect(() => {
    const audioContextConstructor = window.AudioContext || (window as WebAudioWindow).webkitAudioContext;
    if (!window.isSecureContext) {
      setVoiceSupport("insecure");
    } else if (!navigator.mediaDevices?.getUserMedia || !audioContextConstructor) {
      setVoiceSupport("unsupported");
    } else {
      setVoiceSupport("supported");
    }
  }, []);

  const requireLogin = () => {
    if (expertMode) return true;
    if (!isAuthReady) return false;
    if (isLoggedIn) return true;
    setShowLoginModal(true);
    return false;
  };

  const buildTrackedPath = (path: string) => buildPathWithTracking(path, searchParams);
  const fallbackBackPath = buildTrackedPath("/");
  const requestedBackPath = searchParams.get("returnTo");
  const backPath = isSafeInternalPath(requestedBackPath) ? requestedBackPath : fallbackBackPath;
  const currentPath = `${expertMode ? "/tax-ai-pro" : "/tax-ai"}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const openSupport = (qaRecordId: string | null) => {
    if (chatStateStorageKey !== null) {
      persistChatState(chatStateStorageKey, messages, sessionId, inputValue);
    }
    const supportUrl = new URL(buildTrackedPath("/support"), "https://local.invalid");
    supportUrl.searchParams.set("returnTo", currentPath);
    if (qaRecordId) supportUrl.searchParams.set("qaRecordId", qaRecordId);
    router.push(`${supportUrl.pathname}${supportUrl.search}`);
  };
  const restoreChatStateForCurrentUser = () => {
    void me().then((user) => setChatStateStorageKey(`${CHAT_STATE_STORAGE_KEY_PREFIX}user:${user.id}`))
      .catch(() => setErrorMessage("登录状态加载失败，请刷新后重试"));
  };
  const redirectExpertUserIfNeeded = async () => {
    if (expertMode) return;
    if (!await isCurrentUserExpert()) return;
    const targetPath = `/tax-ai-pro${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    router.replace(targetPath);
  };

  const startVoiceInput = async () => {
    if (!isChatStateRestored || isThinking || isReviewLocked || isTranscribing || !requireLogin()) return;
    if (voiceSupport === "insecure") {
      setErrorMessage("当前页面不是 HTTPS，暂时无法使用麦克风，请改用文字输入。");
      return;
    }
    if (voiceSupport !== "supported") {
      setErrorMessage("当前浏览器不支持语音输入，请改用文字输入。");
      return;
    }

    try {
      setErrorMessage(null);
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextConstructor = window.AudioContext || (window as WebAudioWindow).webkitAudioContext;
      const audioContext = new AudioContextConstructor();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (event) => {
        audioChunksRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
        if (Date.now() - recordingStartedAtRef.current >= MAX_VOICE_SECONDS * 1000) {
          void stopVoiceInput();
        }
      };
      source.connect(processor);
      processor.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      audioSourceRef.current = source;
      audioProcessorRef.current = processor;
      audioStreamRef.current = stream;
      recordingStartedAtRef.current = Date.now();
      setIsRecording(true);
    } catch {
      await cleanupVoiceInput();
      setIsRecording(false);
      setErrorMessage("无法使用麦克风，请检查浏览器麦克风权限。");
    }
  };

  const stopVoiceInput = async () => {
    if (!isRecording || isTranscribing) return;
    const audioContext = audioContextRef.current;
    const inputSampleRate = audioContext?.sampleRate ?? VOICE_SAMPLE_RATE;
    const recordedMs = Date.now() - recordingStartedAtRef.current;
    const chunks = [...audioChunksRef.current];
    setIsRecording(false);
    setIsTranscribing(true);
    await cleanupVoiceInput();

    try {
      if (recordedMs < 500 || chunks.length === 0) {
        setErrorMessage("录音时间太短，请说完整问题后再试。");
        return;
      }
      const merged = mergeAudioBuffers(chunks);
      const downsampled = downsampleAudioBuffer(merged, inputSampleRate, VOICE_SAMPLE_RATE);
      const wavBlob = encodeWav(downsampled, VOICE_SAMPLE_RATE);
      const result = await transcribeSpeech(wavBlob);
      setInputValue((prev) => {
        const prefix = prev.trim();
        return prefix ? `${prefix} ${result.text}` : result.text;
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "语音识别失败，请改用文字输入。");
    } finally {
      setIsTranscribing(false);
      audioChunksRef.current = [];
    }
  };

  const submitQuestion = async (question: string) => {
    const text = question.trim();
    if (!text || !isChatStateRestored || isThinking || isReviewLocked || isRecording || isTranscribing || !requireLogin()) return;

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
      }, expertMode ? "expert_review" : "customer");
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

  const switchLocked = isThinking || isRecording || isTranscribing || isReviewLocked;
  const hasCompletedTurn = messages.some((message) => message.role === "ai" && message.answer !== null);
  const canStartNewConversation = Boolean(chatStateStorageKey) && isChatStateRestored && hasCompletedTurn && !switchLocked;
  const openHistory = () => {
    if (switchLocked) return;
    if (chatStateStorageKey && isChatStateRestored) {
      const selected = sessionId ?? requestedSession;
      persistChatState(chatStateStorageKey, messages, selected, inputValue);
      if (selected) persistChatState(`${chatStateStorageKey}:session:${selected}`, messages, selected, inputValue);
    }
    const url = new URL(buildTrackedPath("/tax-ai/history"), "https://local.invalid");
    url.searchParams.set("returnTo", currentPath);
    router.push(`${url.pathname}${url.search}`);
  };
  const startNewConversation = () => {
    if (!canStartNewConversation || !chatStateStorageKey) return;
    const nextSession = crypto.randomUUID();
    const selected = sessionId ?? requestedSession;
    if (selected) persistChatState(`${chatStateStorageKey}:session:${selected}`, messages, selected, inputValue);
    persistChatState(`${chatStateStorageKey}:session:${nextSession}`, [], nextSession, "");
    const url = new URL(buildTrackedPath("/tax-ai"), "https://local.invalid");
    url.searchParams.set("session", nextSession);
    url.searchParams.set("returnTo", backPath);
    router.push(`${url.pathname}${url.search}`);
  };

  return (
    <div className="relative flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-background">
      {!isChatStateRestored && !errorMessage && <PageLoadingState message="正在恢复对话…" />}
      <header className="mobile-safe-hero relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80 px-4 pb-6 pt-4 text-primary-foreground">
        <div className="absolute -right-20 top-5 h-44 w-44 rounded-full border border-white/15" />
        <div className="absolute -right-8 top-16 h-24 w-24 rounded-full border border-white/20" />
        <div className="absolute bottom-5 right-12 h-16 w-16 rounded-full bg-accent/20 blur-sm" />
        <div className="relative">
          <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-white hover:bg-white/10 hover:text-white"
            disabled={switchLocked}
            aria-label="返回"
            onClick={handleBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {!expertMode && <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="h-9 rounded-xl border border-white/20 bg-white/10 px-3 text-sm text-white shadow-sm backdrop-blur-sm hover:bg-white/15 hover:text-white"
              disabled={switchLocked}
              onClick={openHistory}
              aria-label="打开历史对话"
            >
              <History className="mr-1 h-4 w-4 shrink-0" />
              历史对话
            </Button>
            <Button
              variant="ghost"
              className="h-9 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white/90 shadow-sm backdrop-blur-sm hover:bg-white/15 hover:text-white"
              disabled={!canStartNewConversation}
              onClick={startNewConversation}
              aria-label="开始新对话"
            >
              <Plus className="mr-1 h-4 w-4 shrink-0" />
              新对话
            </Button>
          </div>}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 shadow-inner backdrop-blur">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight">{expertMode ? "专家问答" : "AI 客服助手"}</h1>
            </div>
          </div>

          <p className="mt-4 max-w-[300px] text-sm leading-relaxed text-white/80">
            {expertMode ? "用于审阅法规问答，发现错误后直接修正" : "可以直接提问，也可以接着上一轮自然交流"}
          </p>
        </div>
      </header>

      <main className="min-w-0 flex-1 space-y-4 px-4 pb-36 pt-4">
        {!isChatStateRestored && errorMessage && <Button variant="outline" onClick={() => setRestoreAttempt((value) => value + 1)}>重新加载对话</Button>}
        {isChatStateRestored && <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">快捷问题</h2>
            {!isLoggedIn && <span className="text-xs text-muted-foreground">点击后需登录</span>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {quickQuestions.map((question) => (
              <button
                key={question}
                disabled={!isChatStateRestored || switchLocked}
                className="rounded-2xl border border-border bg-card p-3 text-left text-sm leading-snug shadow-sm transition hover:border-primary/30 hover:bg-primary/5"
                onClick={() => submitQuestion(question)}
              >
                {question}
              </button>
            ))}
          </div>
        </section>}

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
                    <AiAnswerCard
                      answer={message.answer}
                      onSupportClick={openSupport}
                      expertMode={expertMode}
                      question={(() => {
                        const index = messages.findIndex((item) => item.id === message.id);
                        const previous = index > 0 ? messages[index - 1] : null;
                        return previous?.role === "user" ? previous.content : "";
                      })()}
                      sessionId={sessionId}
                      qaRecordId={message.qaRecordId}
                      onReviewStarted={expertMode ? () => setIsReviewLocked(true) : undefined}
                    />
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
        <div className="mx-auto flex max-w-[390px] items-end gap-2">
          <Button
            variant={isRecording ? "destructive" : "outline"}
            className="h-12 w-12 shrink-0 rounded-xl"
            onClick={() => {
              if (isRecording) {
                void stopVoiceInput();
              } else {
                void startVoiceInput();
              }
            }}
            disabled={!isChatStateRestored || isThinking || isReviewLocked || isTranscribing || voiceSupport !== "supported"}
            aria-label={isRecording ? "结束语音输入" : "语音输入"}
            title={
              isRecording
                ? "结束语音输入"
                : voiceSupport === "insecure"
                  ? "语音输入需要 HTTPS，请改用文字输入"
                  : voiceSupport === "unsupported"
                    ? "当前浏览器不支持语音输入，请改用文字输入"
                    : "语音输入"
            }
          >
            {isTranscribing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isRecording ? (
              <Square className="h-5 w-5" />
            ) : voiceSupport === "supported" ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
          <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-input bg-background pr-1 transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
            {!inputValue && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center px-3 py-3 text-[10px] leading-6 text-muted-foreground/55 sm:text-xs"
              >
                {isReviewLocked
                  ? "该回答已进入修正，请重新开始会话"
                  : isRecording
                    ? "正在听，请说出您的问题"
                      : isTranscribing
                        ? "正在识别语音..."
                      : "直接描述问题；需要展开可说“详细说明”"}
              </span>
            )}
            <Textarea
              ref={chatInputRef}
              placeholder=""
              value={inputValue}
              disabled={!isChatStateRestored || !isAuthReady || isReviewLocked || isTranscribing}
              onChange={(event) => setInputValue(event.target.value)}
              onFocus={requireLogin}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitQuestion(inputValue);
                }
              }}
              rows={1}
              aria-label="问题输入"
              className="chat-input-scroll min-h-12 w-full resize-none border-0 px-3 py-3 text-base leading-6 shadow-none placeholder:text-[10px] placeholder:text-muted-foreground/55 focus-visible:border-transparent focus-visible:ring-0 sm:placeholder:text-xs"
            />
          </div>
          <Button
            className="h-12 w-12 shrink-0 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => submitQuestion(inputValue)}
            disabled={!isChatStateRestored || isThinking || isReviewLocked || isRecording || isTranscribing}
            aria-label="发送"
          >
            {isThinking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
        {voiceSupport === "insecure" && (
          <p className="mx-auto mt-2 max-w-[390px] text-xs text-muted-foreground">
            当前为局域网 HTTP 地址，语音输入需要 HTTPS；现在可以直接使用文字输入。
          </p>
        )}
        {voiceSupport === "unsupported" && (
          <p className="mx-auto mt-2 max-w-[390px] text-xs text-muted-foreground">
            当前浏览器不支持语音输入，可以直接使用文字输入。
          </p>
        )}
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
          void redirectExpertUserIfNeeded();
        }}
      />
    </div>
  );
}
