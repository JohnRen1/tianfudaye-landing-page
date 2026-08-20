import type { LandingActivityType } from './contracts/tracking';

export type ActivityCoverPresentation = {
  primaryTag: string;
  secondaryTag: string;
};

/**
 * 活动封面固定展示的业务文案。
 * 历史活动没有 type 时按免费知识分享展示，避免出现空标签。
 */
export function getActivityCoverPresentation(type: LandingActivityType | null | undefined): ActivityCoverPresentation {
  switch (type) {
    case 'masterclass':
      return { primaryTag: '知识分享', secondaryTag: '精品大课' };
    case 'offline':
      return { primaryTag: '线下沙龙', secondaryTag: '免费参加' };
    case 'online':
      return { primaryTag: '线上直播', secondaryTag: '免费参加' };
    case 'hybrid':
      return { primaryTag: '融合分享', secondaryTag: '免费参加' };
    default:
      return { primaryTag: '知识分享', secondaryTag: '免费参加' };
  }
}

export const ACTIVITY_LANDING_DEFAULTS = {
  title: '天赋领航活动宝',
  speaker: '特邀讲师',
  speakerTitle: '财税专家',
  date: '时间待定',
  time: '时间待定',
  location: '地点待定',
  description: '更多活动详情，敬请期待。',
} as const;

export function displayActivityField(value: string | null | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

export function getLandingDocumentTitle(hasActivityQr: boolean): string {
  return hasActivityQr ? '天赋领航活动宝' : '天赋大业';
}
