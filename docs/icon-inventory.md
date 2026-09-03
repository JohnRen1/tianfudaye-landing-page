# 落地页图标盘点

盘点范围：`拓客系统-落地页/app`、`拓客系统-落地页/components` 和 `public`。业务层与 UI 基础层分开统计，避免把 16–24px 的操作图标误当作小程序业务图标。

## 业务层图标

| 文件 | 图标 | 主要语义 |
| --- | --- | --- |
| `app/appointment/my/page.tsx` | AlertCircle, ArrowLeft, CalendarCheck, Clock3, Loader2, MessageSquareText, UserRound | 我的预约、状态、返回、加载 |
| `app/appointment/page.tsx` | ArrowLeft, Building2, CalendarCheck, CheckCircle2, Clock, MessageCircle, MessageSquare, Phone, Send, User | 预约顾问、企业、时间、联系 |
| `app/checkin/page.tsx` | AlertCircle, ArrowLeft, CalendarCheck, CalendarDays, CheckCircle2, Clock, Loader2, MapPin, QrCode, RefreshCcw, Sparkles, Users | 活动签到、二维码、地点、刷新 |
| `app/landing-home-client.tsx` | Calendar, CalendarClock, Hourglass, MessageSquare, QrCode, RotateCcw | 首页活动入口与二维码 |
| `app/risk-assessment/quiz/page.tsx` | Loader2 | 测评提交加载 |
| `app/risk-assessment/report/page.tsx` | AlertCircle, ArrowLeft, BookmarkCheck, CalendarCheck, CheckCircle2, FileLock2, FileText, Loader2, LockKeyhole, Radar, RefreshCcw, ShieldAlert | 测评报告、风险、报告锁定 |
| `app/support/page.tsx` | ArrowLeft, AlertCircle, Bot, CalendarCheck, CheckCircle2, ChevronDown, Clock, Headphones, MessageCircle, Phone, Send, ShieldCheck | 客服、AI、预约、联系 |
| `app/tax-code/page.tsx` | ChevronDown, ChevronUp, Search | 税法检索与展开 |
| `components/mobile/event-landing-page.tsx` | FileText, MessageSquare, ClipboardCheck, Calendar, Download, MapPin, Clock, User, ChevronRight, CheckCircle, LockKeyhole, Building2, Sparkles | 活动落地页、资料、测评、预约 |
| `components/mobile/homepage-survey-page.tsx` | ArrowLeft, Building2, Clock, ClipboardList, Loader2, MessageCircle, Send, User, Vote | 首页调研 |
| `components/mobile/login-modal.tsx` | X, Shield | 登录弹窗与隐私安全 |
| `components/mobile/login-page.tsx` | ArrowLeft, FileText, Shield, Sparkles | 登录页 |
| `components/mobile/login-register-form.tsx` | CheckCircle2, Loader2, LockKeyhole, MessageCircle, Phone, ShieldCheck | 注册、验证码、安全 |
| `components/mobile/material-viewer-page.tsx` | ArrowLeft, FileText, LoaderCircle, TriangleAlert | 资料查看与错误 |
| `components/mobile/materials-page.tsx` | ArrowLeft, BookOpen, CheckCircle, ClipboardCheck, Download, FileSpreadsheet, FileText, FolderOpen, Info, LockKeyhole, ScrollText | 资料中心与资料类型 |
| `components/mobile/profile-complete-page.tsx` | ArrowLeft, AlertCircle, Building2, BriefcaseBusiness, CheckCircle2, ChevronDown, Clock, MessageCircle | 企业资料补全 |
| `components/mobile/risk-assessment-quiz-page.tsx` | AlertCircle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Info, Loader2, LockKeyhole, RefreshCcw | 测评答题 |
| `components/mobile/risk-assessment-start-page.tsx` | ArrowLeft, BadgeCheck, BarChart3, Building2, ChevronRight, ClipboardCheck, Clock, FileCheck2, FileWarning, Landmark, PieChart, Radar, ReceiptText, ShieldCheck, Siren, Users, WalletCards | 测评入口与 8 个风险维度 |
| `components/mobile/tax-ai-assistant-page.tsx` | AlertTriangle, ArrowLeft, Bot, ExternalLink, Headphones, Loader2, Mic, MicOff, Send, Sparkles, Square, User | AI 税务问答 |

## UI 基础层图标

`components/ui` 中使用的是 shadcn/Radix 控件配套图标：ChevronDownIcon、ChevronRight、MoreHorizontal、ChevronLeftIcon、ChevronRightIcon、ArrowLeft、ArrowRight、CheckIcon、SearchIcon、CircleIcon、XIcon、MinusIcon、GripVerticalIcon、ChevronUpIcon、PanelLeftIcon、Loader2Icon、X。它们承担返回、关闭、翻页、选择、展开、拖拽、加载等高频小尺寸操作，不纳入 PNG 业务图标包。

## 非 Lucide 图形资源

- `public/icon.svg`：站点默认黑白品牌 favicon。
- `public/icon-light-32x32.png`、`public/icon-dark-32x32.png`、`public/apple-icon.png`：站点 favicon/app icon。
- `app/risk-assessment/report/page.tsx`：一处内联 SVG，用于测评报告环形进度图。
- `event-landing-page.tsx` 的活动封面是后端提供的 `coverImage`，不是固定图标。

## 本次生成的小程序业务图标

运行时资源归属当前项目 `拓客系统-小程序V2/src/assets/icons/business/`；原始图标板、样式规范和 QA 文件归档在 `拓客系统-小程序V2/artifacts/icon-refactor/`。已作废的 `拓客系统-小程序` 不再作为资源目标。

1. `home` — 深蓝圆角入口牌与金色星点
2. `tax-ai` — 对话气泡中的税务闪光
3. `risk-assessment` — 雷达/仪表盘测评
4. `materials` — 资料文件夹与文档
5. `appointment` — 日历与顾问对话
6. `my-appointment` — 日历上的用户头像
7. `checkin` — 签到卡片与勾选
8. `activity` — 活动日历与旗标
9. `company` — 企业楼宇
10. `invoice-compliance` — 发票与合规勾
11. `private-transfer` — 钱包与安全箭头
12. `income-tax` — 税务账本与建筑地标
13. `vat` — 增值税票据与加号
14. `social-security` — 用户群组与保障盾牌
15. `cost-expense` — 成本清单与计算器
16. `tax-inspection` — 税务检查文件与警示标记
