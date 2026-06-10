"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Info,
  LockKeyhole,
  ScrollText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type MaterialCategory = "courseware" | "policy" | "checklist" | "case";

type MaterialStatus = "available" | "claimed" | "needs_company_info";

interface MaterialItem {
  id: number;
  category: MaterialCategory;
  name: string;
  type: string;
  description: string;
  format: "PDF" | "Excel";
  downloads: number;
  needsCompanyInfo: boolean;
  status: MaterialStatus;
}

const categoryTabs: Array<{
  value: MaterialCategory;
  label: string;
  icon: typeof FileText;
}> = [
  { value: "courseware", label: "沙龙课件", icon: BookOpen },
  { value: "policy", label: "政策解读", icon: ScrollText },
  { value: "checklist", label: "自查表", icon: ClipboardCheck },
  { value: "case", label: "案例资料", icon: FolderOpen },
];

const initialMaterials: MaterialItem[] = [
  {
    id: 1,
    category: "courseware",
    name: "企业所得税合规与风险防控沙龙课件",
    type: "课程课件",
    description: "覆盖企业所得税汇算清缴、税前扣除、风险事项识别等核心内容。",
    format: "PDF",
    downloads: 238,
    needsCompanyInfo: false,
    status: "available",
  },
  {
    id: 2,
    category: "courseware",
    name: "沙龙重点问题答疑纪要",
    type: "答疑整理",
    description: "整理现场高频问题与顾问答复，便于会后复盘与内部培训。",
    format: "PDF",
    downloads: 126,
    needsCompanyInfo: false,
    status: "claimed",
  },
  {
    id: 3,
    category: "policy",
    name: "2026 企业所得税政策变化解读",
    type: "政策资料",
    description: "按业务场景拆解最新政策口径，标注企业常见理解误区。",
    format: "PDF",
    downloads: 189,
    needsCompanyInfo: false,
    status: "available",
  },
  {
    id: 4,
    category: "policy",
    name: "研发费用加计扣除实务指南",
    type: "专题指南",
    description: "说明归集口径、辅助账管理、留存备查材料与风险提醒。",
    format: "PDF",
    downloads: 97,
    needsCompanyInfo: true,
    status: "needs_company_info",
  },
  {
    id: 5,
    category: "checklist",
    name: "发票合规风险自查表",
    type: "工具表",
    description: "用于快速检查发票取得、开具、入账和抵扣环节的合规风险。",
    format: "Excel",
    downloads: 312,
    needsCompanyInfo: false,
    status: "available",
  },
  {
    id: 6,
    category: "checklist",
    name: "企业所得税税前扣除自查清单",
    type: "工具表",
    description: "按费用类型列出扣除条件、凭证要求和常见调整事项。",
    format: "Excel",
    downloads: 205,
    needsCompanyInfo: true,
    status: "needs_company_info",
  },
];

function getMaterialIcon(format: MaterialItem["format"]) {
  return format === "Excel" ? FileSpreadsheet : FileText;
}

function getActionCopy(status: MaterialStatus) {
  if (status === "claimed") return "已领取";
  if (status === "needs_company_info") return "补充信息后领取";
  return "领取资料";
}

export function MaterialsPage() {
  const [activeCategory, setActiveCategory] = useState<MaterialCategory>("courseware");
  const [materials, setMaterials] = useState(initialMaterials);

  // MVP 演示阶段默认视为已登录，跳过登录弹窗/登录页拦截。
  // 后续恢复登录时，可将该值改为真实 auth 状态，并在 handleClaim 中未登录时唤起 LoginModal 或跳转 /login。
  const isLoggedIn = true;

  const visibleMaterials = useMemo(
    () => materials.filter((material) => material.category === activeCategory),
    [activeCategory, materials]
  );

  const totalClaimed = materials.filter((material) => material.status === "claimed").length;

  const handleClaim = (materialId: number) => {
    if (!isLoggedIn) {
      return;
    }

    setMaterials((currentMaterials) =>
      currentMaterials.map((material) => {
        if (material.id !== materialId || material.status !== "available") {
          return material;
        }

        return {
          ...material,
          downloads: material.downloads + 1,
          status: "claimed",
        };
      })
    );
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80 px-4 pb-6 pt-4 text-primary-foreground">
        <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-white/10" />
        <div className="absolute bottom-6 right-10 h-14 w-14 rounded-full bg-accent/25" />
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="mb-5 rounded-full text-white hover:bg-white/10 hover:text-white"
            aria-label="返回"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <Badge className="mb-3 bg-accent text-accent-foreground hover:bg-accent/90">
            资料领取
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight">沙龙资料领取</h1>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white/82 backdrop-blur">
            <Info className="h-4 w-4 shrink-0" />
            <span>来自：企业所得税合规沙龙</span>
          </div>
        </div>
      </div>

      <div className="-mt-4 px-4">
        <Card className="border-0 shadow-lg shadow-primary/10">
          <CardContent className="grid grid-cols-3 gap-3 p-4 text-center">
            <div>
              <p className="text-lg font-bold text-foreground">{materials.length}</p>
              <p className="text-xs text-muted-foreground">资料总数</p>
            </div>
            <div>
              <p className="text-lg font-bold text-success">{totalClaimed}</p>
              <p className="text-xs text-muted-foreground">已领取</p>
            </div>
            <div>
              <p className="text-lg font-bold text-primary">
                {materials.filter((material) => material.needsCompanyInfo).length}
              </p>
              <p className="text-xs text-muted-foreground">需补充信息</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={activeCategory}
        onValueChange={(value) => setActiveCategory(value as MaterialCategory)}
        className="px-4 pt-4"
      >
        <TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-2xl bg-secondary/70 p-2">
          {categoryTabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="min-w-fit rounded-xl px-3 py-2 text-xs data-[state=active]:bg-card data-[state=active]:text-primary"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categoryTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4 space-y-3">
            {visibleMaterials.length > 0 ? (
              visibleMaterials.map((material) => {
                const Icon = getMaterialIcon(material.format);
                const isClaimed = material.status === "claimed";
                const needsInfo = material.status === "needs_company_info";

                return (
                  <Card key={material.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-start gap-3">
                        <div
                          className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                            material.format === "Excel" ? "bg-success/10" : "bg-primary/10"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-5 w-5",
                              material.format === "Excel" ? "text-success" : "text-primary"
                            )}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <Badge variant="outline" className="rounded-md px-1.5 py-0 text-[10px]">
                              {material.type}
                            </Badge>
                            <Badge className="rounded-md bg-secondary px-1.5 py-0 text-[10px] text-secondary-foreground hover:bg-secondary">
                              {material.format}
                            </Badge>
                          </div>
                          <h2 className="text-base font-semibold leading-snug text-foreground">
                            {material.name}
                          </h2>
                        </div>
                      </div>

                      <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                        {material.description}
                      </p>

                      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Download className="h-3.5 w-3.5" />
                          下载 {material.downloads} 次
                        </span>
                        <span
                          className={cn(
                            "flex items-center gap-1 rounded-full px-2 py-1",
                            material.needsCompanyInfo
                              ? "bg-warning/10 text-warning"
                              : "bg-success/10 text-success"
                          )}
                        >
                          {material.needsCompanyInfo ? (
                            <LockKeyhole className="h-3.5 w-3.5" />
                          ) : (
                            <CheckCircle className="h-3.5 w-3.5" />
                          )}
                          {material.needsCompanyInfo ? "需要补充企业信息" : "无需补充信息"}
                        </span>
                      </div>

                      <Button
                        className={cn(
                          "h-10 w-full rounded-xl",
                          isClaimed && "border-success/20 bg-success/10 text-success hover:bg-success/10",
                          needsInfo && "bg-primary text-primary-foreground hover:bg-primary/90",
                          material.status === "available" &&
                            "bg-accent text-accent-foreground hover:bg-accent/90"
                        )}
                        variant={isClaimed ? "outline" : "default"}
                        disabled={isClaimed}
                        onClick={() => handleClaim(material.id)}
                      >
                        {isClaimed && <CheckCircle className="mr-2 h-4 w-4" />}
                        {!isClaimed && !needsInfo && <Download className="mr-2 h-4 w-4" />}
                        {needsInfo && <LockKeyhole className="mr-2 h-4 w-4" />}
                        {getActionCopy(material.status)}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                    <FolderOpen className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <h2 className="text-base font-semibold text-foreground">暂无资料</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    当前分类下暂未上传资料，请稍后再查看。
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 p-4 shadow-lg backdrop-blur">
        <div className="mx-auto max-w-[390px]">
          <Button className="h-12 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
            <BarChart3 className="mr-2 h-5 w-5" />
            做一次企业财税风险测评，获取专属报告
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
