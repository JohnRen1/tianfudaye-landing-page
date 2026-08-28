import { describe, expect, it } from 'vitest';
import { normalizeMarkdownForRender } from '@/lib/markdown';

describe('normalizeMarkdownForRender', () => {
  it('restores escaped bold markers from model output', () => {
    expect(normalizeMarkdownForRender('\\*\\*先说结论：\\*\\*可以先核对资料。')).toBe(
      '**先说结论：**\u00a0可以先核对资料。',
    );
  });

  it('separates CJK text after emphasis so Markdown renders strong text', () => {
    expect(normalizeMarkdownForRender('**先按流程处理：**目前还不能确认')).toBe(
      '**先按流程处理：**\u00a0目前还不能确认',
    );
  });

  it('does not show an unmatched bold marker during streaming', () => {
    expect(normalizeMarkdownForRender('**先说结论：')).toBe('先说结论：');
  });
});
