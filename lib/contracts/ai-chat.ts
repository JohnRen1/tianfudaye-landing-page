/**
 * ai-chat.ts — 落地页 AI 问答模块契约类型
 *
 * 覆盖：AI Chat 请求/响应 DTO、AI 回答内容 DTO、聊天消息 DTO、快捷问题 DTO、
 *       问答历史 DTO、错误码。
 * 依赖：./shared.ts（RiskLevel、ApiSuccess、ApiFailure）
 *
 * 设计决策遵守审计总纲：
 *   S1  — 请求体携带 activityId 外键（S2 归因），不传活动名称字符串
 *   S3  — POST /api/ai/chat 触发服务端落库，替代原纯客户端 buildAiAnswer() 逻辑
 *   S4  — 字段命名统一（camelCase 全称），与管理后台 qa-record.ts 保持一致
 *
 * uncertain 映射规则（已决策，与管理后台 qa-record.ts 一致）：
 *   落地页 AI 回答中"需结合实际确认"状态不再使用独立枚举值 "uncertain"，
 *   而是通过 riskLevel="medium" + needsConfirmation=true 表达。
 *   展示层：needsConfirmation=true 时显示黄色"建议结合实际确认"提示块。
 *   RiskLevel 枚举保持 low/medium/high/critical 四值（复用 shared.ts）。
 *
 * 注意：此文件不定义后台管理侧的列表/详情/统计 DTO，那些定义在
 *       管理后台 lib/contracts/qa-record.ts 中。
 *
 * 非 Monorepo 同步约定：
 *   AiAnswerBodyDTO 的结构与管理后台 qa-record.ts 中的 AiAnswerBodyDTO 必须保持一致。
 *   两份文件需人工同步，修改任意一份时须同步更新另一份。
 */

import type { RiskLevel } from './shared';

// ===========================================================================
// AI 回答内容 DTO（与管理后台 AiAnswerBodyDTO 结构一致）
// ===========================================================================

/**
 * AiAnswerBodyDTO — AI 回答完整内容体
 *
 * 字段统一方案（S4）：
 *   落地页旧字段名              → 本 DTO 统一字段名
 *   questionUnderstanding      → questionUnderstanding（保留）
 *   initialJudgment            → initialJudgment（保留）
 *   involvedRisks: string[]    → involvedRisks: string[]（保留数组类型）
 *   suggestions: string[]      → suggestions: string[]（保留数组类型，复数）
 *   advisorRecommended         → advisorRecommended（保留，语义最清晰）
 *   uncertain: boolean         → needsConfirmation: boolean（语义映射，不丢失信息）
 *   riskLevel="uncertain"      → riskLevel="medium" + needsConfirmation=true
 *
 *   admin mock 旧字段（仅供迁移参考）：
 *   understanding              → questionUnderstanding
 *   judgment                   → initialJudgment
 *   risks: string              → involvedRisks: string[]（改为数组）
 *   suggestion: string         → suggestions: string[]（改为数组，复数）
 *   manual: boolean            → advisorRecommended: boolean
 *
 * 与管理后台同步约定：
 *   此接口结构需与 管理后台/lib/contracts/qa-record.ts > AiAnswerBodyDTO 保持一致。
 */
export interface AiAnswerBodyDTO {
  /** RAG 原始回答正文；真实 RAG 调用时优先使用此字段渲染完整回答 */
  answerText?: string;
  /** AI 对用户问题的理解说明（对应落地页 section "问题理解"） */
  questionUnderstanding: string;
  /** AI 初步判断文本（对应落地页 section "初步判断"） */
  initialJudgment: string;
  /**
   * AI 识别的涉及风险列表（对应落地页 section "涉及风险"，列表渲染）
   * S4：统一为 string[]；admin mock 中的单字符串 risks 字段在本契约中改为数组。
   */
  involvedRisks: string[];
  /**
   * AI 处理建议列表（对应落地页 section "处理建议"，列表渲染）
   * S4：统一为 string[]，复数；admin mock 中的单字符串 suggestion 字段改为数组。
   */
  suggestions: string[];
  /**
   * 风险等级（S4：统一英文四值枚举，复用 shared.ts RiskLevel）
   * 落地页原 "uncertain" 枚举值已废弃，改为 riskLevel="medium" + needsConfirmation=true。
   * 展示层通过 RISK_LEVEL_LABEL 映射中文标签。
   */
  riskLevel: RiskLevel;
  /**
   * 是否建议人工顾问介入
   * S4：对应落地页旧字段 advisorRecommended，含义不变。
   * 对应 admin mock 旧字段 manual（语义相同，统一为全称）。
   */
  advisorRecommended: boolean;
  /**
   * 是否为"建议结合实际确认"状态（uncertain 映射字段）
   * true  → 显示黄色"建议结合实际确认"提示块（替代原 uncertain=true 的 riskLevel="uncertain" 逻辑）
   * false → 不显示额外提示
   *
   * 对应落地页原 AiAnswer.uncertain 字段，语义一致，字段名更明确。
   * 落地页 riskLevel="uncertain" 在调用 API 时应映射为：
   *   riskLevel="medium" + needsConfirmation=true（由服务端处理，前端不需要手动映射）
   */
  needsConfirmation: boolean;
  /** 引用的知识库条目 id 列表（RAG 预留） */
  knowledgeItemIds: string[];
  /** RAG 检索引用来源，用于展示参考依据 */
  citations?: AiCitationDTO[];
}

export interface AiCitationDTO {
  title: string;
  sourcePath: string;
  section: string;
  score: number;
  pointId: string;
  docId: string;
}

// ===========================================================================
// AI Chat 请求/响应 DTO（S3：落地页问答落库）
// ===========================================================================

/**
 * AiChatRequestDTO — 落地页发起 AI 问答请求体
 * 对应 POST /api/ai/chat
 * 认证：Bearer token（端用户，已登录）
 *
 * 服务端接收后：
 *   1. 调用 AI 模型（或 RAG 检索）生成结构化回答
 *   2. 将问答落库到 qa_records 表（S3：替代原纯客户端 buildAiAnswer() 逻辑）
 *   3. 响应前端，前端替换本地 state 中的客户端生成结果
 */
export interface AiChatRequestDTO {
  /** 用户提问原文，不超过 2000 字符 */
  question: string;
  /**
   * 会话 id（可选，多轮对话支持）
   * 前端首次提问不传，服务端生成后在响应中返回；
   * 后续提问携带此 id 以实现多轮上下文关联。
   * null 或不传 → 服务端创建新会话 id。
   */
  sessionId?: string | null;
  /**
   * 来源活动 id（可选，S2 归因）
   * 落地页从 URL 参数 ?activity_id= 读取后传入。
   * 服务端写入 qa_records.activity_id，不传则为 null。
   */
  activityId?: string | null;
  /**
   * 是否使用流式响应。
   * true 时服务端返回 text/event-stream，前端逐段渲染；不传或 false 保持原 JSON 响应。
   */
  stream?: boolean;
}

/**
 * AiChatResponseDTO — 落地页 AI 问答响应体
 * 对应 POST /api/ai/chat 的成功响应 data 字段。
 * 服务端同步落库后返回，前端用此响应替换本地 state 中的临时消息。
 */
export interface AiChatResponseDTO {
  /**
   * 落库生成的问答记录 id（UUID）
   * 前端可用于后续"预约顾问"等操作的关联字段（如 POST /api/appointments 时携带）。
   */
  qaRecordId: string;
  /**
   * 会话 id（本轮所属会话，服务端维护）
   * 前端将此 id 缓存后，下次提问时携带以实现多轮上下文。
   */
  sessionId: string;
  /** AI 结构化回答体（用于渲染 AiAnswerCard 组件） */
  answer: AiAnswerBodyDTO;
  /**
   * AI 生成的问题摘要（用于历史记录展示，不需要前端自行截断）
   */
  summary: string;
  /**
   * AI 自动打标的标签列表（可选展示，admin 端用于筛选和检索）
   */
  tags: string[];
}

// ===========================================================================
// 聊天消息 DTO（落地页本地 state 结构）
// ===========================================================================

/**
 * ChatUserMessageDTO — 用户消息（聊天气泡渲染用）
 * 对应落地页 ChatMessage 联合类型中 role="user" 的分支。
 * 此类型仅在前端 state 中使用，不需要落库或通过 API 传递。
 */
export interface ChatUserMessageDTO {
  /** 消息唯一 id（前端生成，如 Date.now()） */
  id: number;
  role: 'user';
  /** 用户提问原文 */
  content: string;
}

/**
 * ChatAiMessageDTO — AI 回答消息（聊天气泡渲染用）
 * 对应落地页 ChatMessage 联合类型中 role="ai" 的分支。
 * answer 字段在调用 API 前由临时值填充（loading 态），API 响应后替换为正式 AiAnswerBodyDTO。
 */
export interface ChatAiMessageDTO {
  /** 消息唯一 id */
  id: number;
  role: 'ai';
  /**
   * AI 回答内容（S4：与管理后台 AiAnswerBodyDTO 对齐）
   * loading 态下此字段为 null，渲染加载动画；API 响应后填充。
   */
  answer: AiAnswerBodyDTO | null;
  /**
   * 落库后的问答记录 id
   * loading 态为 null，API 响应后填充（用于"预约顾问"按钮跳转关联）。
   */
  qaRecordId: string | null;
}

/** 落地页聊天消息联合类型 */
export type ChatMessageDTO = ChatUserMessageDTO | ChatAiMessageDTO;

// ===========================================================================
// 问答历史 DTO（落地页可选展示用户历史问答）
// ===========================================================================

/**
 * QaHistoryItemDTO — 用户历史问答摘要（落地页历史记录展示用）
 * 对应 GET /api/ai/history 的响应数组元素。
 * 仅返回摘要信息，不返回完整 AI 回答（减少流量开销）。
 */
export interface QaHistoryItemDTO {
  /** 问答记录 id（UUID） */
  id: string;
  /** 问题摘要 */
  summary: string;
  /** 风险等级 */
  riskLevel: RiskLevel;
  /** 是否建议顾问介入 */
  advisorRecommended: boolean;
  /** 是否为"建议结合实际确认"状态 */
  needsConfirmation: boolean;
  /** 提问时间，ISO 8601 字符串 */
  createdAt: string;
  /**
   * 所属会话 id（用于按会话分组展示历史）
   * null 表示单次独立问答。
   */
  sessionId: string | null;
}

/**
 * QaHistoryQueryDTO — 历史问答查询参数
 * 对应 GET /api/ai/history 的 query string
 */
export interface QaHistoryQueryDTO {
  /** 页码，从 1 开始，默认 1 */
  page?: number;
  /** 每页条数，默认 10，最大 50 */
  pageSize?: number;
  /** 会话 id 筛选（查询某次会话的全部问答） */
  sessionId?: string;
}

// ===========================================================================
// 快捷问题 DTO（可选，将来快捷问题改为服务端配置时使用）
// ===========================================================================

/**
 * QuickQuestionDTO — 快捷问题单条数据
 * 当前阶段：落地页 quickQuestions 为硬编码数组（tax-ai-assistant-page.tsx:25）。
 * 后续可由 GET /api/ai/quick-questions 动态返回，替代硬编码。
 */
export interface QuickQuestionDTO {
  id: string;
  /** 问题文本，用于渲染快捷问题按钮 */
  content: string;
  /** 排序权重（小值优先），前端按此排序 */
  order: number;
}

// ===========================================================================
// 错误码
// ===========================================================================

/**
 * AI_CHAT 模块错误码（落地页侧）
 * 格式规范：{MODULE}_{VERB}_{REASON}
 * 错误码稳定，message 可本地化。
 * 与管理后台 QA_RECORD_ERROR_CODES 中 AI_ 开头的错误码保持一致。
 */
export const AI_CHAT_ERROR_CODES = {
  /** 问题内容为空或全为空白字符 */
  AI_CHAT_QUESTION_EMPTY: 'AI_CHAT_QUESTION_EMPTY',           // 400
  /** 问题内容超出长度限制（2000 字符） */
  AI_CHAT_QUESTION_TOO_LONG: 'AI_CHAT_QUESTION_TOO_LONG',     // 400
  /** 问题内容触发安全规则，拒绝回答 */
  AI_CHAT_CONTENT_BLOCKED: 'AI_CHAT_CONTENT_BLOCKED',         // 422
  /** 请求频率超限（同一用户短时间内超过频次限制） */
  AI_CHAT_RATE_LIMIT_EXCEEDED: 'AI_CHAT_RATE_LIMIT_EXCEEDED', // 429
  /** AI 服务不可用（上游错误） */
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',           // 502
  /** AI 服务响应超时 */
  AI_SERVICE_TIMEOUT: 'AI_SERVICE_TIMEOUT',                   // 504
  /** 未登录（端用户 token 缺失或无效） */
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',                   // 401
  /** token 已过期 */
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',                   // 401
  /** 通用校验错误 */
  VALIDATION_ERROR: 'VALIDATION_ERROR',                       // 400
  /** 服务器内部错误 */
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',             // 500
} as const;

export type AiChatErrorCode = (typeof AI_CHAT_ERROR_CODES)[keyof typeof AI_CHAT_ERROR_CODES];
