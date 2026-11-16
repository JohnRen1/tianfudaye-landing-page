import { describe, expect, it } from 'vitest';
import { isNameTaken, nameKey } from '@/lib/folk-quiz/records';

describe('folk quiz name identity', () => {
  it('treats spacing and case as the same name', () => {
    expect(nameKey(' 张 三 ')).toBe(nameKey('张三'));
    expect(nameKey('Tom')).toBe(nameKey(' tom '));
  });

  it('blocks a name that already exists and allows the same phone on another name', () => {
    const rows = [{ name: '张三', phone: '138****0000' }];
    expect(isNameTaken('张三', rows)).toBe(true);
    expect(isNameTaken('张 三', rows)).toBe(true);
    expect(isNameTaken('李四', rows)).toBe(false);
    expect(rows.filter((row) => row.phone === '138****0000')).toHaveLength(1);
  });
});
