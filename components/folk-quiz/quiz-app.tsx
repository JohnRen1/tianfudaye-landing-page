"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { QUIZ_LIMIT_SECONDS, correctAnswerLabel, gradeAnswers, isCorrectAnswer, questions } from "@/lib/folk-quiz/questions";
import { NAME_TAKEN_MESSAGE, fetchRecords, formatDuration, formatSpokenDuration, isNameTaken, leaderboardFrom, submitRecord, validPhone } from "@/lib/folk-quiz/records";
import type { RecordRow } from "@/lib/folk-quiz/types";
import "./folk-quiz.css";

type Screen = "intro" | "quiz" | "result";

function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M11.5 3.5 6 9l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 8.2 6.4 11l6.1-6.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Trophy() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
      <path d="M11 7h14v8.2a7 7 0 0 1-14 0V7Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11 9H7.5A3.5 3.5 0 0 0 11 14.2M25 9h3.5A3.5 3.5 0 0 1 25 14.2M18 22.2V26M13.5 29h9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ResultScreen({ result, total, rows, timedOut, onAgain }: { result: RecordRow; total: number; rows: RecordRow[]; timedOut: boolean; onAgain: () => void }) {
  const board = leaderboardFrom(rows);
  const rank = Math.max(1, board.findIndex((row) => row.id === result.id) + 1);

  return (
    <main id="main" className="quiz-page finish">
      <div className="frame">
        <div className="finish-hero">
          <span className="trophy"><Trophy /></span>
          <h1>答题完成</h1>
          <p>{result.name}，你已完成全部题目</p>
        </div>
        <section className="rank-card">
          <span>当前排名</span>
          <strong>第 {rank} 名</strong>
        </section>
        <div className="stat-grid">
          <div><span>原始用时</span><b>{formatSpokenDuration(result.baseDuration)}</b></div>
          <div><span>答对题数</span><b className="good">{result.score} / {total}</b></div>
          <div><span>答错题数</span><b className="bad">{result.wrongCount} 道</b></div>
          <div><span>净用时</span><b className="net">{formatSpokenDuration(result.finalDuration)}</b></div>
        </div>
        <p className="formula">净用时 = 原始用时 + 答错题数 × 10 秒<br />（每错一题罚时 10 秒）</p>
        {timedOut && <p className="formula">答题时间已到，未作答的题目按答错计算。</p>}
        <button className="primary" type="button" onClick={onAgain}>再答一次</button>
      </div>
    </main>
  );
}

export function QuizApp() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | string | null>(null);
  const [answers, setAnswers] = useState<Array<number | string>>([]);
  const [blankDraft, setBlankDraft] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [result, setResult] = useState<RecordRow | null>(null);
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [saveError, setSaveError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const blankRef = useRef<HTMLInputElement>(null);
  const snapshotRef = useRef({ answers, selected, index });
  const finishingRef = useRef(false);
  const submitRef = useRef<(elapsed: number, timeout: boolean) => Promise<void>>(async () => {});
  snapshotRef.current = { answers, selected, index };
  const current = questions[index];
  const answered = selected !== null;
  const correct = answered && isCorrectAnswer(current, selected);
  const remaining = Math.max(0, QUIZ_LIMIT_SECONDS - seconds);

  useEffect(() => {
    if (screen !== "quiz") return;
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      if (elapsed >= QUIZ_LIMIT_SECONDS) {
        window.clearInterval(timer);
        setSeconds(QUIZ_LIMIT_SECONDS);
        void submitRef.current(QUIZ_LIMIT_SECONDS, true);
        return;
      }
      setSeconds(elapsed);
    }, 250);
    return () => window.clearInterval(timer);
  }, [screen, startedAt]);

  useEffect(() => {
    if (screen !== "quiz") return;
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [screen]);

  async function start(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("请填写姓名");
      nameRef.current?.focus();
      return;
    }
    if (!validPhone(phone)) {
      setError("请输入有效的 11 位手机号");
      phoneRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const existing = await fetchRecords();
      if (isNameTaken(name, existing)) {
        setError(NAME_TAKEN_MESSAGE);
        nameRef.current?.focus();
        return;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "暂时无法核对该姓名，请稍后再试");
      return;
    } finally {
      setBusy(false);
    }
    setError("");
    setSaveError("");
    setAnswers([]);
    setIndex(0);
    setSelected(null);
    setBlankDraft("");
    setTimedOut(false);
    finishingRef.current = false;
    setResult(null);
    setStartedAt(Date.now());
    setSeconds(0);
    setScreen("quiz");
  }

  async function submitQuiz(elapsed: number, timeout: boolean) {
    if (finishingRef.current) return;
    finishingRef.current = true;
    if (timeout) setTimedOut(true);
    const snap = snapshotRef.current;
    const given = [...snap.answers];
    if (snap.selected !== null && given.length === snap.index) given.push(snap.selected);
    const graded = gradeAnswers(given, elapsed);
    setBusy(true);
    setSaveError("");
    try {
      const row = await submitRecord({
        name: name.trim(),
        phone,
        ...graded,
      });
      setRows(await fetchRecords());
      setResult(row);
      setScreen("result");
    } catch (cause) {
      finishingRef.current = false;
      setSaveError(cause instanceof Error ? cause.message : "成绩没有保存");
    } finally {
      setBusy(false);
    }
  }
  submitRef.current = submitQuiz;

  function choose(value: number | string) {
    if (selected !== null || timedOut) return;
    setSelected(value);
  }

  function confirmBlank() {
    const value = blankDraft.trim();
    if (!value) {
      blankRef.current?.focus();
      return;
    }
    choose(value);
  }

  function skipBlank() {
    if (busy || timedOut || current.kind !== "blank" || selected !== null) return;
    setBlankDraft("");
    setSelected("");
  }

  async function next() {
    if (selected === null || busy || timedOut) return;
    if (index === questions.length - 1) {
      await submitQuiz(seconds, false);
      return;
    }
    setAnswers((value) => [...value, selected]);
    setIndex((value) => value + 1);
    setSelected(null);
    setBlankDraft("");
  }

  function leaveQuiz() {
    if (!window.confirm("离开后，这次答题不会保存。")) return;
    finishingRef.current = true;
    setScreen("intro");
    setSelected(null);
    setAnswers([]);
    setIndex(0);
    setBlankDraft("");
  }

  function reset() {
    setScreen("intro");
    setName("");
    setPhone("");
    setError("");
    setResult(null);
    setTimedOut(false);
    setBlankDraft("");
    finishingRef.current = false;
  }

  return (
    <div className="folk-quiz">
      <a className="skip" href="#main">跳到主要内容</a>
      {screen === "intro" && (
        <main id="main" className="login-page">
          <form className="login" onSubmit={start}>
            <h1>民俗知识挑战</h1>
            <label>
              <span className="visually-hidden">姓名</span>
              <input
                ref={nameRef}
                value={name}
                onChange={(event) => setName(event.target.value)}
                name="name"
                placeholder="姓名"
                autoComplete="name"
                maxLength={60}
                aria-invalid={error === "请填写姓名"}
              />
            </label>
            <label>
              <span className="visually-hidden">手机号</span>
              <input
                ref={phoneRef}
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 11))}
                type="tel"
                name="phone"
                inputMode="numeric"
                maxLength={11}
                placeholder="手机号"
                autoComplete="tel"
                spellCheck={false}
                aria-invalid={error.startsWith("请输入有效")}
              />
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="primary" type="submit" disabled={busy}>开始答题</button>
          </form>
        </main>
      )}
      {screen === "quiz" && (
        <main id="main" className="quiz-page">
          <div className="frame">
            <header className="top">
              <button className="back" type="button" aria-label="返回" onClick={leaveQuiz}>
                <Chevron />
              </button>
              <h1>民俗知识挑战</h1>
              <span />
            </header>
            <div className="status">
              <span className={remaining <= 60 ? "urgent" : ""}>剩余 {formatDuration(remaining)}</span>
              <span>{index + 1}/{questions.length}</span>
            </div>
            <section className="sheet">
              <p className="kind">{current.kind === "choice" ? "选择题" : current.kind === "judge" ? "判断题" : "填空题"}</p>
              <h2>{current.text}</h2>
              {current.kind === "blank" ? (
                <label className="blank">
                  <span className="visually-hidden">答案</span>
                  <input
                    ref={blankRef}
                    value={blankDraft}
                    onChange={(event) => setBlankDraft(event.target.value)}
                    placeholder="填写答案"
                    disabled={answered || timedOut}
                    maxLength={40}
                  />
                </label>
              ) : (
                <div className="options">
                  {current.options.map((option, optionIndex) => {
                    const chosen = typeof selected === "number" ? selected : null;
                    const state = !answered ? "" : optionIndex === current.answer ? "correct" : optionIndex === chosen ? "wrong" : "";
                    return (
                      <button
                        key={option}
                        type="button"
                        className={`option ${state}`}
                        onClick={() => choose(optionIndex)}
                        disabled={answered || timedOut}
                      >
                        <span>{current.kind === "judge" ? option : `${String.fromCharCode(65 + optionIndex)} ${option}`}</span>
                        {answered && optionIndex === current.answer && <Check />}
                      </button>
                    );
                  })}
                </div>
              )}
              {current.kind === "blank" && !answered && !timedOut && (
                <div className="blank-actions">
                  <button className="secondary" type="button" onClick={skipBlank}>跳过</button>
                  <button className="primary" type="button" onClick={confirmBlank}>确定</button>
                </div>
              )}
              {answered && !timedOut && (
                <div className="explain" aria-live="polite">
                  <h3>答案解析</h3>
                  <p>正确答案：{correctAnswerLabel(current)}</p>
                  <p>{correct ? current.note : `答错，用时增加 10 秒。${current.note}`}</p>
                </div>
              )}
              {timedOut && <p className="error" role="alert">答题时间已到，未作答的题目按答错计算。</p>}
              {saveError && <p className="error" role="alert">{saveError}</p>}
              {timedOut && saveError && (
                <button className="primary" type="button" onClick={() => void submitQuiz(QUIZ_LIMIT_SECONDS, true)} disabled={busy}>提交成绩</button>
              )}
              {answered && !timedOut && (
                <button className="primary" type="button" onClick={() => void next()} disabled={busy}>
                  {index === questions.length - 1 ? "完成" : "下一题"}
                </button>
              )}
            </section>
          </div>
        </main>
      )}
      {screen === "result" && result && (
        <ResultScreen result={result} total={questions.length} rows={rows} timedOut={timedOut} onAgain={reset} />
      )}
    </div>
  );
}
