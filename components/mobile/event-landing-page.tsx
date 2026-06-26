"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  MessageSquare,
  ClipboardCheck,
  Calendar,
  Download,
  MapPin,
  Clock,
  User,
  ChevronRight,
  CheckCircle,
  LockKeyhole,
  Building2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LoginModal } from "./login-modal";
import { hydrateClientAuthFromServer } from "@/lib/client-auth";
import { claimMaterial } from "@/lib/api/materials";
import type { MaterialClaimStatus } from "@/lib/contracts/material";

interface EventMaterial {
  id: string;
  title: string;
  format: string;
  fileSize: string | null;
  needLogin: boolean;
  needCompanyInfo: boolean;
  claimStatus?: MaterialClaimStatus;
}

interface EventLandingPageProps {
  eventData?: {
    id?: string;
    title: string;
    speaker: string;
    speakerTitle: string;
    date: string;
    time: string;
    location: string;
    description: string;
    coverImage?: string;
    materials?: EventMaterial[];
  } | null;
  isLoggedIn?: boolean;
  onLogin?: () => void;
  showActivitySections?: boolean;
}

export function EventLandingPage({
  eventData = null,
  isLoggedIn: initialLoggedIn = false,
  onLogin,
  showActivitySections = false,
}: EventLandingPageProps) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [downloadedMaterials, setDownloadedMaterials] = useState<string[]>([]);
  const [claimingMaterialId, setClaimingMaterialId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const isLoggedInRef = useRef(false);
  const materials = eventData?.materials ?? [];
  const isGeneralLanding = !showActivitySections;

  useEffect(() => {
    setDownloadedMaterials((eventData?.materials ?? []).filter((material) => material.claimStatus === "claimed").map((material) => material.id));
  }, [eventData?.materials]);

  useEffect(() => {
    if (initialLoggedIn) {
      isLoggedInRef.current = true;
      setIsLoggedIn(true);
      return;
    }
    void hydrateClientAuthFromServer().then((loggedIn) => {
      isLoggedInRef.current = loggedIn;
      if (loggedIn) setIsLoggedIn(true);
    });
  }, [initialLoggedIn]);

  const requireLogin = (action: () => void) => {
    if (isLoggedInRef.current) {
      action();
      return;
    }
    setPendingAction(() => action);
    setShowLoginModal(true);
  };

  const goToProfileComplete = () => {
    const redirect = `${window.location.pathname}${window.location.search}`;
    router.push(`/profile/complete?redirect=${encodeURIComponent(redirect)}`);
  };

  const handleMaterialClick = async (material: EventMaterial) => {
    if (!isLoggedInRef.current) {
      setPendingAction(() => () => void handleMaterialClick(material));
      setShowLoginModal(true);
      return;
    }

    if (material.claimStatus === "needs_company_info" || material.needCompanyInfo) {
      goToProfileComplete();
      return;
    }

    setClaimingMaterialId(material.id);
    try {
      const result = await claimMaterial(material.id, eventData?.id ?? null);
      setDownloadedMaterials((current) => current.includes(material.id) ? current : [...current, material.id]);
      window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      const message = error instanceof Error ? error.message : "领取资料失败";
      if (message.includes("企业信息") || message.includes("CLAIM_COMPANY_INFO_REQUIRED")) {
        goToProfileComplete();
        return;
      }
      window.alert(message);
    } finally {
      setClaimingMaterialId(null);
    }
  };

  const handleLoginSuccess = () => {
    isLoggedInRef.current = true;
    setIsLoggedIn(true);
    setShowLoginModal(false);
    onLogin?.();
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {isGeneralLanding && (
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground">
          <div className="absolute -right-16 top-8 h-40 w-40 rounded-full bg-amber-400/20 blur-2xl" />
          <div className="absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-blue-400/15 blur-3xl" />
          <div className="relative px-4 pb-8 pt-12">
            <div className="mb-5 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-blue-50 backdrop-blur">
              AA级税务师事务所
            </div>
            <h1 className="text-2xl font-bold leading-tight text-balance">
              天赋大业律师事务所
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-blue-50/85">
              以专业税务服务、财税咨询与企业培训为基础，帮助企业识别风险、规范管理、提升经营决策质量。
            </p>
            <div className="mt-6 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-white/10 p-3 text-center backdrop-blur">
                <strong className="block text-lg text-amber-300">2006</strong>
                <span className="text-[11px] text-blue-50/75">成立年份</span>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 text-center backdrop-blur">
                <strong className="block text-lg text-amber-300">5000+</strong>
                <span className="text-[11px] text-blue-50/75">服务企业</span>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 text-center backdrop-blur">
                <strong className="block text-lg text-amber-300">AA</strong>
                <span className="text-[11px] text-blue-50/75">行业评级</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showActivitySections && eventData && (
        <>
          {/* 顶部活动封面区域 - 深蓝渐变 */}
          <div
            className={cn(
              "relative bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground",
              eventData.coverImage && "bg-cover bg-center",
            )}
            style={eventData?.coverImage ? { backgroundImage: `url("${eventData.coverImage}")` } : undefined}
          >
            {eventData?.coverImage ? <div className="absolute inset-0 bg-primary/15" /> : null}
            {/* 装饰图案 */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-white/5" />
              <div className="absolute top-20 -left-10 h-24 w-24 rounded-full bg-white/5" />
              <div className="absolute bottom-10 right-10 h-16 w-16 rounded-full bg-accent/20" />
            </div>

            <div className="relative px-4 pb-8 pt-12">
              {/* 活动标签 */}
              <div className="mb-4 flex items-center gap-2">
                <Badge className="bg-accent text-accent-foreground hover:bg-accent/90">
                  线下沙龙
                </Badge>
                <Badge variant="outline" className="border-white/30 text-white">
                  免费参加
                </Badge>
              </div>

              {/* 活动标题 */}
              <h1 className="mb-4 text-xl font-bold leading-tight text-balance">
                {eventData?.title}
              </h1>

              {/* 活动信息 */}
              <div className="space-y-2 text-sm text-white/80">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>
                    {eventData?.speaker} · {eventData?.speakerTitle}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{eventData?.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{eventData?.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{eventData?.location}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 活动简介 */}
          <div className="px-4 py-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-foreground">
                  <Building2 className="h-4 w-4 text-primary" />
                  活动简介
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {eventData?.description}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 资料领取模块 */}
          <div className="px-4 py-2">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <FileText className="h-4 w-4 text-primary" />
                    沙龙资料
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    共{materials.length}份资料
                  </span>
                </div>

                <div className="space-y-3">
                  {materials.length === 0 ? (
                    <div className="rounded-lg bg-secondary/50 p-4 text-center text-sm text-muted-foreground">
                      当前活动暂无绑定资料
                    </div>
                  ) : materials.map((material) => {
                    const isDownloaded = downloadedMaterials.includes(material.id) || material.claimStatus === "claimed";
                    const needsCompanyInfo = material.claimStatus === "needs_company_info" || material.needCompanyInfo;
                    const Icon = material.format === "Excel" ? ClipboardCheck : FileText;
                    const isClaiming = claimingMaterialId === material.id;

                    return (
                      <div
                        key={material.id}
                        className="flex items-center justify-between rounded-lg bg-secondary/50 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {material.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {material.format} · {material.fileSize ?? "大小未知"}
                            </p>
                            {needsCompanyInfo ? (
                              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] text-warning">
                                <LockKeyhole className="h-3 w-3" />
                                需要补充企业信息
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={isDownloaded ? "outline" : "default"}
                          className={cn(
                            "h-8 min-w-[72px]",
                            !isDownloaded && needsCompanyInfo && "bg-primary text-primary-foreground hover:bg-primary/90",
                            !isDownloaded && !needsCompanyInfo &&
                              "bg-accent text-accent-foreground hover:bg-accent/90"
                          )}
                          onClick={() => void handleMaterialClick(material)}
                          disabled={isClaiming}
                        >
                          {isDownloaded ? (
                            <>
                              <CheckCircle className="mr-1 h-3 w-3" />
                              已领取
                            </>
                          ) : needsCompanyInfo ? (
                            <>
                              <LockKeyhole className="mr-1 h-3 w-3" />
                              补充后领取
                            </>
                          ) : (
                            <>
                              <Download className="mr-1 h-3 w-3" />
                              领取
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {!isLoggedIn && materials.length > 0 && (
                  <Button
                    className="mt-4 w-full bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => {
                      setShowLoginModal(true);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    立即领取全部资料
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* 核心功能入口 */}
      <div className="px-4 py-4">
        <h2 className="mb-3 text-base font-semibold text-foreground">
          专属服务
        </h2>
        <div className="grid grid-cols-1 gap-3">
          {/* AI 税务助手 */}
          <Card
            className="cursor-pointer border-0 shadow-sm transition-all hover:shadow-md"
            onClick={() => requireLogin(() => router.push("/tax-ai"))}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">AI 税务助手</h3>
                <p className="text-sm text-muted-foreground">
                  有税务问题？立即问 AI
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          {/* 财税风险测评 */}
          <Card
            className="cursor-pointer border-0 shadow-sm transition-all hover:shadow-md"
            onClick={() => requireLogin(() => router.push("/risk-assessment"))}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-warning to-warning/80">
                <ClipboardCheck className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">财税风险测评</h3>
                <p className="text-sm text-muted-foreground">
                  3 分钟评估企业风险
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          {/* 资料领取 */}
          <Card
            className="cursor-pointer border-0 shadow-sm transition-all hover:shadow-md"
            onClick={() => requireLogin(() => router.push("/materials"))}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">资料领取</h3>
                  <Badge
                    variant="secondary"
                    className="bg-secondary text-secondary-foreground hover:bg-secondary"
                  >
                    推荐
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  领取通用财税资料
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 公司介绍 */}
      <div className="px-4 py-2">
        <Card className="border-0 bg-secondary/30 shadow-sm">
          <CardContent className="p-4">
            <h2 className="mb-2 text-sm font-semibold text-foreground">
              关于我们
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              山东天赋大业税务师事务所成立于2006年，是经批准设立的专业税务服务机构，获评“AA级税务师事务所”“山东省规范化税务师事务所”等称号。
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              我们隶属于山东天赋大业财税集团，长期专注税务指导、教育培训与财税咨询，累计服务5000家企业，致力于帮助企业规范财务管理、降低财税风险、实现稳健发展。
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 免责声明 */}
      <div className="px-4 py-4">
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium">免责声明：</span>
            本平台提供的 AI
            咨询、风险评估结果及相关建议仅供参考，不构成任何法律、税务或财务建议。具体问题请咨询专业顾问，以实际业务情况和法规要求为准。
          </p>
        </div>
      </div>

      {/* 底部固定按钮 */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card p-4 shadow-lg">
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => requireLogin(() => router.push("/support"))}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            咨询客服
          </Button>
          <Button
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => requireLogin(() => router.push("/appointment"))}
          >
            <Calendar className="mr-2 h-4 w-4" />
            立即预约
          </Button>
        </div>
      </div>

      {/* 登录弹窗 */}
      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
