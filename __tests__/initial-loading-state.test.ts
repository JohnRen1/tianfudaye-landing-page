import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/tax-ai',
}));

import { HomepageSurveyPage } from '@/components/mobile/homepage-survey-page';
import { EventLandingPage } from '@/components/mobile/event-landing-page';
import { MaterialsPage } from '@/components/mobile/materials-page';
import { TaxAiAssistantPage } from '@/components/mobile/tax-ai-assistant-page';
import { PageLoadingState } from '@/components/mobile/page-loading-state';

describe('首次读取完成前不展示默认业务结论', () => {
  it('加载提示显示在内容流中，不引入整页占位或拦截点击', () => {
    const html = renderToStaticMarkup(createElement(PageLoadingState));
    expect(html).toContain('正在读取页面信息');
    expect(html).toContain('gap-2');
    expect(html).not.toContain('min-h-screen');
    expect(html).not.toContain('<main');
  });
  it('投票不先显示默认课题、轮次和未提交按钮', () => {
    const html = renderToStaticMarkup(createElement(HomepageSurveyPage));
    expect(html).toContain('正在读取问卷');
    expect(html).not.toContain('金税四期下企业财税合规');
    expect(html).not.toContain('当前轮次 V');
    expect(html).not.toContain('提交投票');
  });

  it('首页等待身份恢复，不先提供未登录状态的操作', () => {
    const html = renderToStaticMarkup(createElement(EventLandingPage));
    expect(html).toContain('正在确认登录状态');
    expect(html).toContain('role="status"');
    expect(html).toContain('天赋大业税务师事务所');
    expect(html).not.toContain('motion-safe:animate-pulse');
  });

  it('资料统计不把初始空数组显示成真实零值', () => {
    const html = renderToStaticMarkup(createElement(MaterialsPage));
    expect(html).toContain('正在加载资料');
    expect(html.match(/>—<\/p>/g)).toHaveLength(3);
    expect(html).not.toMatch(/>0<\/p>/);
  });

  it('问答恢复前不显示需登录提示和空会话快捷问题', () => {
    const html = renderToStaticMarkup(createElement(TaxAiAssistantPage));
    expect(html).toContain('正在恢复对话');
    expect(html).not.toContain('点击后需登录');
    expect(html).not.toContain('快捷问题');
  });
});
