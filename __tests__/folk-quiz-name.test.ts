import { describe, expect, it } from 'vitest';
import { gradeAnswers, isCorrectAnswer, questions, QUIZ_LIMIT_SECONDS } from '@/lib/folk-quiz/questions';
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

  it('keeps all 50 source questions and treats unfinished answers as wrong when time is up', () => {
    expect(questions).toHaveLength(50);
    expect(questions.filter((question) => question.kind === 'choice')).toHaveLength(30);
    expect(questions.filter((question) => question.kind === 'judge')).toHaveLength(10);
    expect(questions.filter((question) => question.kind === 'blank')).toHaveLength(10);
    expect(isCorrectAnswer(questions[40], ' 贺村 庙会 ')).toBe(true);
    const graded = gradeAnswers([0], QUIZ_LIMIT_SECONDS + 5);
    expect(graded.baseDuration).toBe(QUIZ_LIMIT_SECONDS);
    expect(graded.score).toBe(1);
    expect(graded.wrongCount).toBe(49);
    expect(graded.finalDuration).toBe(QUIZ_LIMIT_SECONDS + 49 * 10);
  });
});
