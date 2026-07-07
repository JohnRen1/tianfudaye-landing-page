"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
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
import { claimMaterial, getMaterials } from "@/lib/api/materials";
import { hydrateClientAuthFromServer, isClientLoggedIn } from "@/lib/client-auth";
import { buildPathWithTracking } from "@/lib/tracking-context";
import { LoginModal } from "./login-modal";
import {
  FILE_FORMAT_LABEL,
  MATERIAL_TYPE_TAB_LABEL,
  type FileFormat,
  type MaterialClaimStatus,
  type MaterialLandingItemDTO,
  type MaterialType,
} from "@/lib/contracts/material";

const categoryTabs: Array<{
  value: MaterialType;
  label: string;
  icon: typeof FileText;
}> = [
  { value: "courseware", label: MATERIAL_TYPE_TAB_LABEL.courseware, icon: BookOpen },
  { value: "policy", label: MATERIAL_TYPE_TAB_LABEL.policy, icon: ScrollText },
  { value: "checklist", label: MATERIAL_TYPE_TAB_LABEL.checklist, icon: ClipboardCheck },
  { value: "case", label: MATERIAL_TYPE_TAB_LABEL.case, icon: FolderOpen },
];

function getMaterialIcon(format: FileFormat) {
  return format === "xlsx" ? FileSpreadsheet : FileText;
}

function getActionCopy(status: MaterialClaimStatus) {
  if (status === "claimed") return "已领取";
  if (status === "needs_company_info") return "补充信息后领取";
  if (status === "needs_login") return "登录后领取";
  return "领取资料";
}

function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "大小未知";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function MaterialsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlActivityId = searchParams.get("activity") ?? searchParams.get("activity_id");
  const [activityId] = useState<string | null>(urlActivityId ?? null);
  const [activeCategory, setActiveCategory] = useState<MaterialType>("courseware");
  const [materials, setMaterials] = useState<MaterialLandingItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingMaterial, setPendingMaterial] = useState<MaterialLandingItemDTO | null>(null);

  const visibleMaterials = useMemo(
    () => materials.filter((material) => material.category === activeCategory),
    [activeCategory, materials]
  );

  const totalClaimed = materials.filter((material) => material.claimStatus === "claimed").length;

  const loadMaterials = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await getMaterials({ page: 1, pageSize: 50 });
      setMaterials(result.items);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "资料加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void hydrateClientAuthFromServer().then(() => {
      void loadMaterials();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId]);

  const goToProfileComplete = () => {
    const redirect = `${window.location.pathname}${window.location.search}`;
    router.push(`/profile/complete?redirect=${encodeURIComponent(redirect)}`);
  };

  const handleClaim = async (material: MaterialLandingItemDTO) => {
    if (material.claimStatus === "claimed") return;
    if (material.claimStatus === "needs_login" || !isClientLoggedIn()) {
      setPendingMaterial(material);
      setShowLoginModal(true);
      return;
    }
    if (material.claimStatus === "needs_company_info") {
      goToProfileComplete();
      return;
    }

    setClaimingId(material.id);
    try {
      const result = await claimMaterial(material.id, activityId ?? null);
      setMaterials((currentMaterials) =>
        currentMaterials.map((item) =>
          item.id === material.id
            ? { ...item, downloads: item.downloads + 1, claimStatus: "claimed" }
            : item,
        ),
      );
      window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      const message = error instanceof Error ? error.message : "领取资料失败";
      if (message.includes("企业信息") || message.includes("CLAIM_COMPANY_INFO_REQUIRED")) {
        goToProfileComplete();
        return;
      }
      window.alert(message);
    } finally {
      setClaimingId(null);
    }
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    void loadMaterials();
    if (pendingMaterial) {
      const material = pendingMaterial;
      setPendingMaterial(null);
      void handleClaim({ ...material, claimStatus: "available" });
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(buildPathWithTracking("/", searchParams));
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="mobile-safe-hero relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80 px-4 pb-6 pt-4 text-primary-foreground">
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
              <FolderOpen className="h-7 w-7" />
            </div>
            <div>
              <Badge className="mb-2 bg-accent text-accent-foreground hover:bg-accent/90">
                资料领取
              </Badge>
              <h1 className="text-2xl font-bold tracking-tight">沙龙资料领取</h1>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white/82 backdrop-blur">
            <Info className="h-4 w-4 shrink-0" />
            <span>通用财税资料，可按分类领取</span>
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
                {materials.filter((material) => material.needCompanyInfo).length}
              </p>
              <p className="text-xs text-muted-foreground">需补充信息</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={activeCategory}
        onValueChange={(value) => setActiveCategory(value as MaterialType)}
        className="px-4 pt-4"
      >
        <TabsList className="grid h-auto w-full grid-cols-4 gap-1 rounded-2xl bg-secondary/70 p-1.5">
          {categoryTabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="min-w-0 justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] leading-none data-[state=active]:bg-card data-[state=active]:text-primary"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categoryTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4 space-y-3">
            {loading ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="px-6 py-12 text-center text-sm text-muted-foreground">
                  正在加载资料...
                </CardContent>
              </Card>
            ) : errorMessage ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="space-y-3 px-6 py-12 text-center">
                  <p className="text-sm text-destructive">{errorMessage}</p>
                  <Button variant="outline" className="rounded-xl" onClick={() => void loadMaterials()}>
                    重新加载
                  </Button>
                </CardContent>
              </Card>
            ) : visibleMaterials.length > 0 ? (
              visibleMaterials.map((material) => {
                const Icon = getMaterialIcon(material.format);
                const isClaimed = material.claimStatus === "claimed";
                const needsInfo = material.claimStatus === "needs_company_info";
                const isNeedsLogin = material.claimStatus === "needs_login";
                const isClaiming = claimingId === material.id;
                const formatLabel = FILE_FORMAT_LABEL[material.format];

                return (
                  <Card key={material.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-start gap-3">
                        <div
                          className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                            material.format === "xlsx" ? "bg-success/10" : "bg-primary/10"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-5 w-5",
                              material.format === "xlsx" ? "text-success" : "text-primary"
                            )}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <Badge variant="outline" className="rounded-md px-1.5 py-0 text-[10px]">
                              {material.subType ?? MATERIAL_TYPE_TAB_LABEL[material.category]}
                            </Badge>
                            <Badge className="rounded-md bg-secondary px-1.5 py-0 text-[10px] text-secondary-foreground hover:bg-secondary">
                              {formatLabel}
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
                          下载 {material.downloads} 次 · {formatFileSize(material.fileSizeBytes)}
                        </span>
                        <span
                          className={cn(
                            "flex items-center gap-1 rounded-full px-2 py-1",
                            material.needCompanyInfo && material.claimStatus !== "claimed"
                              ? "bg-warning/10 text-warning"
                              : "bg-success/10 text-success"
                          )}
                        >
                          {material.needCompanyInfo && material.claimStatus !== "claimed" ? (
                            <LockKeyhole className="h-3.5 w-3.5" />
                          ) : (
                            <CheckCircle className="h-3.5 w-3.5" />
                          )}
                          {material.needCompanyInfo && material.claimStatus !== "claimed"
                            ? "需要补充企业信息"
                            : material.needCompanyInfo
                            ? "已补充企业信息"
                            : "无需补充信息"}
                        </span>
                      </div>

                      <Button
                        className={cn(
                          "h-10 w-full rounded-xl",
                          isClaimed && "border-success/20 bg-success/10 text-success hover:bg-success/10",
                          (needsInfo || isNeedsLogin) && "bg-primary text-primary-foreground hover:bg-primary/90",
                          material.claimStatus === "available" &&
                            "bg-accent text-accent-foreground hover:bg-accent/90"
                        )}
                        variant={isClaimed ? "outline" : "default"}
                        disabled={isClaimed || isClaiming}
                        onClick={() => void handleClaim(material)}
                      >
                        {isClaimed && <CheckCircle className="mr-2 h-4 w-4" />}
                        {!isClaimed && !needsInfo && !isNeedsLogin && <Download className="mr-2 h-4 w-4" />}
                        {(needsInfo || isNeedsLogin) && <LockKeyhole className="mr-2 h-4 w-4" />}
                        {isClaiming ? "领取中..." : getActionCopy(material.claimStatus)}
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

      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
