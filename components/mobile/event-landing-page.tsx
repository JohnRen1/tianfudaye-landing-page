"use client";

import { useState } from "react";
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
  Shield,
  ChevronRight,
  CheckCircle,
  Building2,
  Phone,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LoginModal } from "./login-modal";

interface EventLandingPageProps {
  eventData?: {
    title: string;
    speaker: string;
    speakerTitle: string;
    date: string;
    time: string;
    location: string;
    description: string;
    coverImage?: string;
  };
  isLoggedIn?: boolean;
  onLogin?: () => void;
}

const defaultEventData = {
  title: "企业所得税合规与税务风险防控沙龙",
  speaker: "张明远",
  speakerTitle: "注册税务师 / 高级合伙人",
  date: "2026年6月15日",
  time: "14:00 - 17:00",
  location: "上海市浦东新区陆家嘴金融中心28楼",
  description:
    "本次沙龙聚焦企业所得税合规管理与风险防控，深入解析最新税收政策变化，帮助企业识别潜在税务风险，建立健全的税务管理体系。",
};

const materials = [
  {
    id: 1,
    title: "沙龙课件 PDF",
    type: "PDF",
    size: "2.4 MB",
    icon: FileText,
    downloaded: false,
  },
  {
    id: 2,
    title: "发票合规检查表",
    type: "Excel",
    size: "156 KB",
    icon: ClipboardCheck,
    downloaded: false,
  },
  {
    id: 3,
    title: "税务风险自查表",
    type: "PDF",
    size: "892 KB",
    icon: Shield,
    downloaded: false,
  },
  {
    id: 4,
    title: "政策解读汇编",
    type: "PDF",
    size: "3.1 MB",
    icon: FileText,
    downloaded: true,
  },
];

export function EventLandingPage({
  eventData = defaultEventData,
  isLoggedIn: initialLoggedIn = false,
  onLogin,
}: EventLandingPageProps) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(initialLoggedIn);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [downloadedMaterials, setDownloadedMaterials] = useState<number[]>([4]);

  const handleMaterialClick = (materialId: number) => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    if (!downloadedMaterials.includes(materialId)) {
      setDownloadedMaterials([...downloadedMaterials, materialId]);
    }
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setShowLoginModal(false);
    onLogin?.();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部活动封面区域 - 深蓝渐变 */}
      <div className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground">
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
            {eventData.title}
          </h1>

          {/* 活动信息 */}
          <div className="space-y-2 text-sm text-white/80">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>
                {eventData.speaker} · {eventData.speakerTitle}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{eventData.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{eventData.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{eventData.location}</span>
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
              {eventData.description}
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
              {materials.map((material) => {
                const isDownloaded = downloadedMaterials.includes(material.id);
                const Icon = material.icon;

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
                          {material.type} · {material.size}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isDownloaded ? "outline" : "default"}
                      className={cn(
                        "h-8 min-w-[72px]",
                        !isDownloaded &&
                          "bg-accent text-accent-foreground hover:bg-accent/90"
                      )}
                      onClick={() => handleMaterialClick(material.id)}
                    >
                      {isDownloaded ? (
                        <>
                          <CheckCircle className="mr-1 h-3 w-3" />
                          已领取
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

            {!isLoggedIn && (
              <Button
                className="mt-4 w-full bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => setShowLoginModal(true)}
              >
                <Download className="mr-2 h-4 w-4" />
                立即领取全部资料
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 核心功能入口 */}
      <div className="px-4 py-4">
        <h2 className="mb-3 text-base font-semibold text-foreground">
          专属服务
        </h2>
        <div className="grid grid-cols-1 gap-3">
          {/* AI 税务助手 */}
          <Card
            className="cursor-pointer border-0 shadow-sm transition-all hover:shadow-md"
            onClick={() => router.push("/tax-ai")}
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
            onClick={() => router.push("/risk-assessment")}
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

          {/* 预约顾问 */}
          <Card
            className="cursor-pointer border-0 shadow-sm transition-all hover:shadow-md"
            onClick={() => router.push("/appointment")}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">预约顾问</h3>
                  <Badge
                    variant="secondary"
                    className="bg-secondary text-secondary-foreground hover:bg-secondary"
                  >
                    推荐
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  高风险问题，建议顾问解读
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
              智税财税咨询是一家专注于企业税务风险管理的专业机构，拥有20余位注册税务师、注册会计师，累计服务超过5000家企业客户，帮助企业建立合规税务体系、防控税务风险。
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
            onClick={() => router.push("/support")}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            咨询客服
          </Button>
          <Button
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => router.push("/appointment")}
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
