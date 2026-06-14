/**
 * assessment.ts — 落地页测评报告模块契约类型
 *
 * 覆盖：题库（用户视图）、答题提交、报告查看、解锁、保存 DTO。
 * 依赖：./shared.ts（复用 RiskLevel）
 *
 * 安全约定（S5）：
 *   1. 题目选项不含 score 权重（QuestionOptionPublicDTO 故意省略 score）
 *   2. 答题时前端只提交选项索引，不传 score，不传 riskLevel，不传综合分
 *   3. 报告页通过 reportId 从服务端获取报告，绝不从 URL ?score= 读取分数
 *   4. 解锁/保存状态通过后端 API 落库，不依赖本地 state
 */

import type { RiskLevel } from './shared';

// ===========================================================================
// 枚举与常量（与 admin-system/lib/contracts/assessment.ts 保持同步）
// ===========================================================================

/**
 * QuestionType — 题目类型
 * 与 admin 侧保持同步，落地页用于渲染题目 UI
 */
export type QuestionType = 'single' | 'multiple' | 'range';

/**
 * AssessmentModuleKey — 题库模块标识（8 个维度，S4）
 * 落地页用于展示当前题目所属模块名称（答题页头部）
 */
export type AssessmentModuleKey =
  | 'company_basic'       // 企业基础信息
  | 'invoice_compliance'  // 发票合规风险
  | 'fund_transfer'       // 公转私风险
  | 'income_tax'          // 所得税风险
  | 'vat'                 // 增值税风险
  | 'payroll_insurance'   // 个税社保风险
  | 'cost_expense'        // 成本费用风险
  | 'tax_audit';          // 税务稽查应对

/** 题库模块中文展示标签（与 admin 侧保持同步） */
export const ASSESSMENT_MODULE_LABEL: Record<AssessmentModuleKey, string> = {
  company_basic: '企业基础信息',
  invoice_compliance: '发票合规风险',
  fund_transfer: '公转私风险',
  income_tax: '所得税风险',
  vat: '增值税风险',
  payroll_insurance: '个税社保风险',
  cost_expense: '成本费用风险',
  tax_audit: '税务稽查应对',
};

/**
 * ReportModuleKey — 报告模块标识（5 个展示维度，S4）
 * 落地页报告页使用，与 admin 侧 ReportModuleKey 保持同步
 */
export type ReportModuleKey =
  | 'report_invoice'   // 发票合规风险
  | 'report_fund'      // 公转私风险
  | 'report_cost'      // 成本费用风险（含所得税）
  | 'report_payroll'   // 个税社保风险
  | 'report_audit';    // 税务稽查应对风险

/** 报告模块中文展示标签 */
export const REPORT_MODULE_LABEL: Record<ReportModuleKey, string> = {
  report_invoice: '发票合规风险',
  report_fund: '公转私风险',
  report_cost: '成本费用风险',
  report_payroll: '个税社保风险',
  report_audit: '税务稽查应对风险',
};

// ===========================================================================
// 题库 DTO（落地页用户视图，不含 score 权重）
// ===========================================================================

/**
 * QuestionOptionPublicDTO — 题目选项（落地页用户视图）
 * 故意省略 score 字段（S5：防止用户逆向推算高分路径）
 */
export interface QuestionOptionPublicDTO {
  /** 选项在该题中的排序索引（0 起始），提交答案时使用此值 */
  sortOrder: number;
  /** 选项文字 */
  label: string;
}

/**
 * QuestionPublicDTO — 单道题目（落地页用户视图）
 * 对应 GET /api/assessment/questions（无需认证的公开接口）
 */
export interface QuestionPublicDTO {
  id: string;
  /** 所属答题模块（题库 8 模块） */
  moduleKey: AssessmentModuleKey;
  /** 中文模块名（服务端填充，答题页头部展示） */
  moduleName: string;
  type: QuestionType;
  title: string;
  description: string;
  /** 题目在当前题库版本中的全局排序序号（1 起始） */
  sortOrder: number;
  /** 选项列表（不含评分权重，S5） */
  options: QuestionOptionPublicDTO[];
}

// ===========================================================================
// 答题提交 DTO（S5：核心安全约定）
// ===========================================================================

/**
 * SingleAnswerDTO — 单道题的答题记录（提交时格式）
 * 前端只提交题目 id 和选中选项的 sortOrder 索引数组，不传 score
 */
export interface SingleAnswerDTO {
  /** 题目 id（对应 QuestionPublicDTO.id） */
  questionId: string;
  /**
   * 所选选项的 sortOrder 索引数组
   * 单选：[index]；多选：[i, j, ...]；区间选择（range 单选）：[index]
   * S5：不传 score，服务端从题库读取 score 后计算总分
   */
  selectedIndexes: number[];
}

/**
 * AssessmentSubmitDTO — 答题提交请求体
 * 对应 POST /api/assessment/submit
 *
 * S5 安全约定：
 *   - 不含 score（服务端计算）
 *   - 不含 riskLevel（服务端计算）
 *   - reportId 由服务端生成后在响应中返回
 *
 * S5 不确定项 #5：未登录用户也可提交（userId 可为 null），
 * 服务端生成匿名报告记录；登录后通过 phone 绑定 userId 完成实名迁移。
 */
export interface AssessmentSubmitDTO {
  /**
   * 端用户 id（可选，S5：未登录时为 null）
   * 已登录用户由服务端从 session/token 中读取，此字段主要用于匿名转实名场景
   */
  userId?: string | null;
  /** 答题记录，每道题一条，按作答顺序排列 */
  answers: SingleAnswerDTO[];
  /** 来源二维码 id（S2：归因链，落地页从 URL 读取后传入） */
  sourceQrId?: string | null;
  /** 来源活动 id（S2：归因链） */
  sourceActivityId?: string | null;
}

// ===========================================================================
// 报告 DTO（落地页用户视图）
// ===========================================================================

/**
 * ModuleScorePublicDTO — 报告中单个风险模块（落地页用户视图）
 * 对应落地页报告展示页的模块卡片
 */
export interface ModuleScorePublicDTO {
  moduleKey: ReportModuleKey;
  /** 中文展示名称 */
  moduleName: string;
  /** 该模块风险分（0–100，服务端计算，S5） */
  score: number;
  /** 该模块风险等级（服务端计算，S5） */
  riskLevel: RiskLevel;
  /** 风险说明 */
  desc: string;
  /** 初步建议 */
  advice: string;
}

/**
 * AssessmentSubmitResponseDTO — 答题提交成功响应
 * 对应 POST /api/assessment/submit 的成功响应体
 *
 * S5：报告 id 由服务端生成并返回，前端用此 id 跳转报告页（替代 URL ?score= 方案）
 */
export interface AssessmentSubmitResponseDTO {
  /** 服务端生成的报告 UUID（S5：非 URL 传入） */
  reportId: string;
  /**
   * 综合风险分（S5：服务端计算）
   * 前端可用于报告页初始展示，但报告页必须通过 reportId 重新从 API 获取完整报告
   * 此值仅作展示用，不作为后续业务决策依据
   */
  score: number;
  /** 风险等级（S5：服务端计算） */
  riskLevel: RiskLevel;
  /** 各风险模块评分（S4：结构化，替代落地页硬编码常量） */
  modules: ModuleScorePublicDTO[];
}

/**
 * AssessmentReportPublicDTO — 完整报告（落地页报告页）
 * 对应 GET /api/assessment/report/:id
 *
 * 基础版（未解锁）：返回 score / riskLevel / modules，不含 suggestions
 * 完整版（已解锁）：返回全部字段（需登录认证）
 *
 * S5：score / riskLevel 全部来自服务端计算，与提交时一致
 */
export interface AssessmentReportPublicDTO {
  id: string;
  /** 报告是否已被用户认领（userId 非 null） */
  isClaimed: boolean;
  /** 报告是否已解锁完整版（viewed = true，S3：后端落库） */
  isUnlocked: boolean;
  /** 报告是否已被用户保存到"我的报告"（S3：后端落库） */
  isSaved: boolean;
  /** 综合风险分（S5：服务端计算） */
  score: number;
  /** 风险等级（S5：服务端计算） */
  riskLevel: RiskLevel;
  /** 各风险模块评分（S4：结构化数据，替代硬编码常量） */
  modules: ModuleScorePublicDTO[];
  /**
   * 整改建议（仅已解锁用户可见，S3）
   * 未解锁时此字段不返回（undefined），而非返回 null 或空数组
   */
  suggestions?: string[];
  /** ISO 8601 字符串（测评完成时间） */
  completedAt: string;
}

// ===========================================================================
// 解锁与保存 DTO
// ===========================================================================

/**
 * UnlockReportResponseDTO — 解锁完整报告响应
 * 对应 POST /api/assessment/report/:id/unlock（S3：后端落库 viewed=true）
 */
export interface UnlockReportResponseDTO {
  /** 解锁后的完整报告（包含 suggestions） */
  report: AssessmentReportPublicDTO;
}

/**
 * SaveReportResponseDTO — 保存报告响应
 * 对应 POST /api/assessment/report/:id/save（S3：后端落库 isSaved=true）
 */
export interface SaveReportResponseDTO {
  saved: true;
  /** ISO 8601 字符串 */
  savedAt: string;
}

/**
 * ClaimReportDTO — 匿名报告认领（登录后绑定 userId）
 * 对应 POST /api/assessment/report/:id/claim
 * S5 不确定项 #5：允许未登录用户先做测评，登录后通过此接口将报告绑定到账号
 */
export interface ClaimReportDTO {
  /**
   * 用户 id（服务端从已登录 session 中读取，此字段仅备用）
   * 服务端校验：报告的 userId 为 null 时才允许认领
   */
  userId?: string;
}

/**
 * ClaimReportResponseDTO — 认领报告响应
 */
export interface ClaimReportResponseDTO {
  claimed: true;
  reportId: string;
}
