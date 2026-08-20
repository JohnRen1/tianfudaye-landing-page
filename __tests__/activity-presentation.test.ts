import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_LANDING_DEFAULTS,
  displayActivityField,
  getActivityCoverPresentation,
  getLandingDocumentTitle,
} from '@/lib/activity-presentation';

describe('活动封面展示规则', () => {
  it.each([
    ['masterclass', '知识分享', '精品大课'],
    ['offline', '线下沙龙', '免费参加'],
    ['online', '线上直播', '免费参加'],
    ['hybrid', '融合分享', '免费参加'],
    [null, '知识分享', '免费参加'],
  ] as const)('活动形式 %s 显示正确标签', (type, primaryTag, secondaryTag) => {
    expect(getActivityCoverPresentation(type)).toEqual({ primaryTag, secondaryTag });
  });

  it('空字段使用活动页默认值', () => {
    expect(displayActivityField('  ', ACTIVITY_LANDING_DEFAULTS.title)).toBe('天赋领航活动宝');
    expect(displayActivityField(null, ACTIVITY_LANDING_DEFAULTS.description)).toBe('更多活动详情，敬请期待。');
  });

  it('二维码对应页签标题', () => {
    expect(getLandingDocumentTitle(false)).toBe('天赋大业');
    expect(getLandingDocumentTitle(true)).toBe('天赋领航活动宝');
  });
});
