"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  LockKeyhole,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getQuestions, submitAssessment } from "@/lib/api/assessment";
import type { QuestionPublicDTO } from "@/lib/contracts/assessment";

export function RiskAssessmentQuizPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 从 URL 读取归因参数（由活动二维码落地页写入）
  const sourceQrId = searchParams.get("qr") ?? null;
  const sourceActivityId = searchParams.get("activity") ?? null;

  // 题目加载状态
  const [questions, setQuestions] = useState<QuestionPublicDTO[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 答题状态（key = questionId）
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 加载题目
  const fetchQuestions = async () => {
    setLoadingQuestions(true);
    setLoadError(null);
    try {
      const data = await getQuestions();
      setQuestions(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "题目加载失败，请重试");
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  // 加载中
  if (loadingQuestions) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">题目加载中，请稍候…</p>
      </div>
    );
  }

  // 加载失败
  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="font-semibold text-foreground">题目加载失败</p>
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <Button
          variant="outline"
          className="mt-2 h-11 rounded-xl"
          onClick={fetchQuestions}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          重新加载
        </Button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">暂无题目，请稍后再试</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const selectedIndexes = answers[currentQuestion.id] ?? [];
  const progress = Math.round(((currentIndex + 1) / questions.length) * 100);
  const isLastQuestion = currentIndex === questions.length - 1;

  const handleSelect = (optionIndex: number) => {
    setValidationError("");
    setSubmitError(null);
    setAnswers((prev) => {
      const previous = prev[currentQuestion.id] ?? [];
      if (currentQuestion.type === "multiple") {
        const next = previous.includes(optionIndex)
          ? previous.filter((i) => i !== optionIndex)
          : [...previous, optionIndex];
        return { ...prev, [currentQuestion.id]: next };
      }
      return { ...prev, [currentQuestion.id]: [optionIndex] };
    });
  };

  const handleNext = async () => {
    if (selectedIndexes.length === 0) {
      setValidationError("请选择后继续");
      return;
    }
    if (!isLastQuestion) {
      setCurrentIndex((i) => i + 1);
      setValidationError("");
      return;
    }

    // 最后一题：提交
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const submitAnswers = questions.map((q) => ({
        questionId: q.id,
        selectedIndexes: answers[q.id] ?? [],
      }));
      const result = await submitAssessment(submitAnswers, sourceQrId, sourceActivityId);
      router.push(`/risk-assessment/report?id=${result.reportId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "提交失败，请重试");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mb-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => router.push("/risk-assessment")}
            aria-label="返回测评起始页"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              第 {currentIndex + 1} / {questions.length} 题
            </p>
            <p className="text-xs text-primary">{currentQuestion.moduleName}</p>
          </div>
          <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {progress}%
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </header>

      <main className="space-y-4 px-4 pt-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="mb-4 inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {currentQuestion.type === "multiple"
                ? "多选题"
                : currentQuestion.type === "range"
                  ? "区间选择"
                  : "单选题"}
            </div>
            <h1 className="text-xl font-bold leading-snug text-foreground">
              {currentQuestion.title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {currentQuestion.description}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {currentQuestion.options.map((option) => {
            const selected = selectedIndexes.includes(option.sortOrder);
            return (
              <button
                key={option.sortOrder}
                className={cn(
                  "flex min-h-16 w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition",
                  selected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/15"
                    : "border-border hover:border-primary/30"
                )}
                onClick={() => handleSelect(option.sortOrder)}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30"
                  )}
                >
                  {selected && <CheckCircle2 className="h-4 w-4" />}
                </div>
                <span className="flex-1 text-base font-medium text-foreground">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>

        {validationError && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {validationError}
          </div>
        )}

        {submitError && (
          <div className="flex items-start gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-2xl bg-secondary/70 p-3 text-xs leading-relaxed text-muted-foreground">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>答案将用于生成风险报告，不会公开展示。</span>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 p-4 shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-[390px] gap-3">
          <Button
            variant="outline"
            className="h-12 flex-1 rounded-xl"
            disabled={currentIndex === 0 || isSubmitting}
            onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            上一步
          </Button>
          <Button
            className="h-12 flex-[1.4] rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={isSubmitting}
            onClick={handleNext}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在生成报告…
              </>
            ) : (
              <>
                {isLastQuestion ? "生成报告" : "下一步"}
                <ChevronRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
        <div className="mx-auto mt-2 flex max-w-[390px] items-center justify-center gap-1 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          轻量自测，约 3-5 分钟完成
        </div>
      </div>
    </div>
  );
}
