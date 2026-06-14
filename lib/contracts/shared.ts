/**
 * shared.ts — 落地页侧共享基础类型
 *
 * 本文件是管理后台 lib/contracts/shared.ts 的落地页副本。
 * 本项目为单 Git 仓库 + 两个独立 Next.js 项目，不存在 packages/ 共享包。
 * 两份文件内容必须保持同步，修改任意一份时须同步更新另一份。
 *
 * 同步检查点：
 *   - RiskLevel 枚举值和顺序
 *   - LeadStatus 枚举值和顺序
 *   - ApiSuccess / ApiFailure / PaginatedData 结构
 */

// ---------------------------------------------------------------------------
// 统一响应包装
// ---------------------------------------------------------------------------

export interface ApiSuccess<T, M = undefined> {
  success: true;
  data: T;
  meta?: M;
}

export interface ApiFailure {
  success: false;
  error: {
    /** 稳定错误码，格式：MODULE_SNAKE_CASE，如 AUTH_INVALID_CODE */
    code: string;
    /** 面向用户或开发者的可读消息，可本地化 */
    message: string;
    /** 详细错误信息，仅开发环境返回 */
    details?: unknown;
    /** 请求追踪 ID */
    requestId?: string;
  };
}

export type ApiResponse<T, M = undefined> = ApiSuccess<T, M> | ApiFailure;

// ---------------------------------------------------------------------------
// 分页
// ---------------------------------------------------------------------------

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}

// ---------------------------------------------------------------------------
// 风险等级枚举（S4：统一两端枚举，与 admin-system/lib/contracts/shared.ts 一致）
// 数据库存英文值，展示层映射中文标签
// ---------------------------------------------------------------------------

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** 展示用中文标签映射，仅前端渲染使用 */
export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  critical: '严重风险',
};

// ---------------------------------------------------------------------------
// 线索状态枚举（S4：补全 'none'；与 admin-system/lib/contracts/shared.ts 一致）
// 落地页通常只读取此枚举（如查看个人报告页），不写入
// ---------------------------------------------------------------------------

export type LeadStatus =
  | 'none'        // 未生成线索
  | 'new'         // 新线索
  | 'pending'     // 待跟进
  | 'assigned'    // 已分配
  | 'following'   // 跟进中
  | 'appointed'   // 已预约
  | 'converted'   // 已成交
  | 'invalid';    // 无效线索
