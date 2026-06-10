"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Info, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type QuestionType = "single" | "multiple" | "range";

interface QuestionOption {
  label: string;
  score: number;
}

interface Question {
  id: number;
  module: string;
  type: QuestionType;
  title: string;
  description: string;
  options: QuestionOption[];
}

const questions: Question[] = [
  { id: 1, module: "企业基础信息", type: "single", title: "企业所属行业是什么？", description: "请选择最接近企业主营业务的行业类型。", options: [{ label: "制造业", score: 2 }, { label: "批发零售", score: 2 }, { label: "互联网/科技服务", score: 1 }, { label: "建筑工程", score: 4 }, { label: "其他行业", score: 2 }] },
  { id: 2, module: "企业基础信息", type: "range", title: "企业年营业收入区间是多少？", description: "用于判断企业规模和常见税务关注点。", options: [{ label: "100 万以下", score: 1 }, { label: "100 万-500 万", score: 2 }, { label: "500 万-2000 万", score: 3 }, { label: "2000 万-1 亿", score: 4 }, { label: "1 亿以上", score: 5 }] },
  { id: 3, module: "发票合规风险", type: "single", title: "是否存在大额无票支出？", description: "例如采购、服务费、咨询费等支出无法取得合规发票。", options: [{ label: "不存在", score: 0 }, { label: "偶尔存在，金额较小", score: 2 }, { label: "经常存在，金额较大", score: 5 }, { label: "不确定", score: 3 }] },
  { id: 4, module: "发票合规风险", type: "multiple", title: "企业发票管理中存在以下哪些情况？", description: "可多选，系统会综合识别发票合规风险。", options: [{ label: "供应商开票内容与实际业务不完全一致", score: 4 }, { label: "发票入账前缺少合同或验收记录", score: 3 }, { label: "存在长期未认证或异常发票", score: 4 }, { label: "发票管理较规范", score: 0 }] },
  { id: 5, module: "公转私风险", type: "single", title: "是否存在频繁公户转个人账户？", description: "包括转给老板、股东、员工或外部个人。", options: [{ label: "基本不存在", score: 0 }, { label: "偶尔发生且有清晰用途", score: 2 }, { label: "频繁发生且用途说明不足", score: 5 }, { label: "不确定", score: 3 }] },
  { id: 6, module: "公转私风险", type: "multiple", title: "公转私通常用于哪些场景？", description: "请选择符合企业实际情况的场景。", options: [{ label: "工资/报销", score: 1 }, { label: "备用金", score: 2 }, { label: "股东借款或分红", score: 4 }, { label: "支付个人供应商", score: 5 }, { label: "几乎没有公转私", score: 0 }] },
  { id: 7, module: "所得税风险", type: "single", title: "成本费用是否都有真实业务凭证？", description: "包括合同、付款记录、发票、交付证明等。", options: [{ label: "基本完整", score: 0 }, { label: "部分费用资料不完整", score: 3 }, { label: "较多费用仅有发票", score: 5 }, { label: "不确定", score: 3 }] },
  { id: 8, module: "所得税风险", type: "single", title: "是否存在长期亏损但经营仍持续扩大？", description: "该情况可能引发所得税申报合理性关注。", options: [{ label: "不存在", score: 0 }, { label: "存在但原因清晰", score: 2 }, { label: "存在且原因解释不足", score: 5 }, { label: "不确定", score: 3 }] },
  { id: 9, module: "增值税风险", type: "single", title: "销项和进项税额是否与业务规模匹配？", description: "例如收入增长但开票、进项结构明显异常。", options: [{ label: "比较匹配", score: 0 }, { label: "偶尔异常", score: 2 }, { label: "经常异常", score: 5 }, { label: "不确定", score: 3 }] },
  { id: 10, module: "增值税风险", type: "multiple", title: "是否存在以下增值税异常情况？", description: "可多选，用于识别进销项和申报风险。", options: [{ label: "进项来源集中于少数供应商", score: 3 }, { label: "开票品类与经营范围差异较大", score: 4 }, { label: "长期留抵或税负波动明显", score: 3 }, { label: "暂无明显异常", score: 0 }] },
  { id: 11, module: "个税社保风险", type: "single", title: "是否所有员工依法缴纳社保？", description: "关注劳动用工、社保和个税申报一致性。", options: [{ label: "全部依法缴纳", score: 0 }, { label: "部分人员未缴或基数偏低", score: 4 }, { label: "大量人员未缴", score: 5 }, { label: "不确定", score: 3 }] },
  { id: 12, module: "个税社保风险", type: "single", title: "工资薪金和个税申报是否一致？", description: "包括工资表、银行流水、个税申报和社保基数。", options: [{ label: "基本一致", score: 0 }, { label: "存在少量差异", score: 2 }, { label: "差异较大", score: 5 }, { label: "不确定", score: 3 }] },
  { id: 13, module: "成本费用风险", type: "multiple", title: "企业常见费用中哪些较难说明业务真实性？", description: "可多选，例如咨询费、会议费、差旅费等。", options: [{ label: "咨询服务费", score: 4 }, { label: "会议/培训费", score: 3 }, { label: "差旅和招待费", score: 3 }, { label: "广告推广费", score: 2 }, { label: "均可清晰说明", score: 0 }] },
  { id: 14, module: "税务稽查应对", type: "single", title: "是否收到过税务检查或约谈通知？", description: "包括税务风险提示、协查、约谈、稽查通知等。", options: [{ label: "没有", score: 0 }, { label: "收到过风险提示", score: 3 }, { label: "收到过约谈或检查通知", score: 5 }, { label: "不确定", score: 3 }] },
  { id: 15, module: "税务稽查应对", type: "single", title: "企业是否有固定人员负责税务资料归档？", description: "资料归档会影响后续风险解释和检查应对效率。", options: [{ label: "有，且定期归档", score: 0 }, { label: "有人负责但不定期", score: 2 }, { label: "没有固定负责人", score: 4 }, { label: "不确定", score: 3 }] },
];

export function RiskAssessmentQuizPage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const currentQuestion = questions[currentIndex];
  const selectedIndexes = answers[currentQuestion.id] ?? [];
  const progress = Math.round(((currentIndex + 1) / questions.length) * 100);
  const isLastQuestion = currentIndex === questions.length - 1;

  const totalScore = useMemo(
    () => questions.reduce((sum, question) => sum + (answers[question.id] ?? []).reduce((innerSum, optionIndex) => innerSum + question.options[optionIndex].score, 0), 0),
    [answers]
  );

  const handleSelect = (optionIndex: number) => {
    setError("");
    setAnswers((currentAnswers) => {
      const previous = currentAnswers[currentQuestion.id] ?? [];
      if (currentQuestion.type === "multiple") {
        const next = previous.includes(optionIndex) ? previous.filter((item) => item !== optionIndex) : [...previous, optionIndex];
        return { ...currentAnswers, [currentQuestion.id]: next };
      }
      return { ...currentAnswers, [currentQuestion.id]: [optionIndex] };
    });
  };

  const handleNext = async () => {
    if (selectedIndexes.length === 0) {
      setError("请选择后继续");
      return;
    }
    if (!isLastQuestion) {
      setCurrentIndex((index) => index + 1);
      setError("");
      return;
    }
    setIsGenerating(true);
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
    router.push(`/risk-assessment/report?score=${totalScore}`);
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mb-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => router.push("/risk-assessment")} aria-label="返回测评起始页">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">第 {currentIndex + 1} / {questions.length} 题</p>
            <p className="text-xs text-primary">{currentQuestion.module}</p>
          </div>
          <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{progress}%</div>
        </div>
        <Progress value={progress} className="h-2" />
      </header>

      <main className="space-y-4 px-4 pt-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="mb-4 inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {currentQuestion.type === "multiple" ? "多选题" : currentQuestion.type === "range" ? "区间选择" : "单选题"}
            </div>
            <h1 className="text-xl font-bold leading-snug text-foreground">{currentQuestion.title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{currentQuestion.description}</p>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {currentQuestion.options.map((option, optionIndex) => {
            const selected = selectedIndexes.includes(optionIndex);
            return (
              <button
                key={option.label}
                className={cn(
                  "flex min-h-16 w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition",
                  selected ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "border-border hover:border-primary/30"
                )}
                onClick={() => handleSelect(optionIndex)}
              >
                <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border", selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30")}>{selected && <CheckCircle2 className="h-4 w-4" />}</div>
                <span className="flex-1 text-base font-medium text-foreground">{option.label}</span>
              </button>
            );
          })}
        </div>

        {error && <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <div className="flex items-start gap-2 rounded-2xl bg-secondary/70 p-3 text-xs leading-relaxed text-muted-foreground">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>答案将用于生成风险报告，不会公开展示。</span>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 p-4 shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-[390px] gap-3">
          <Button variant="outline" className="h-12 flex-1 rounded-xl" disabled={currentIndex === 0 || isGenerating} onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            上一步
          </Button>
          <Button className="h-12 flex-[1.4] rounded-xl bg-accent text-accent-foreground hover:bg-accent/90" disabled={isGenerating} onClick={handleNext}>
            {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />正在计算风险分并生成报告...</> : <>{isLastQuestion ? "生成报告" : "下一步"}<ChevronRight className="ml-1 h-4 w-4" /></>}
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
