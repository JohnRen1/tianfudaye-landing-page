"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { questions } from "@/lib/folk-quiz/questions";
import { formatDuration, formatSpokenDuration, leaderboardRows, loadStoredRows, maskPhone, saveRows, validPhone } from "@/lib/folk-quiz/records";
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

function ResultScreen({ result, total, onAgain }: { result: RecordRow; total: number; onAgain: () => void }) {
  const board = leaderboardRows();
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
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [result, setResult] = useState<RecordRow | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const current = questions[index];
  const answered = selected !== null;
  const correct = answered && selected === current.answer;

  useEffect(() => {
    if (screen !== "quiz") return;
    const timer = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
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

  function start(event: FormEvent) {
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
    setError("");
    setAnswers([]);
    setIndex(0);
    setSelected(null);
    setResult(null);
    setStartedAt(Date.now());
    setSeconds(0);
    setScreen("quiz");
  }

  function choose(optionIndex: number) {
    if (selected !== null) return;
    setSelected(optionIndex);
  }

  function next() {
    if (selected === null) return;
    const allAnswers = [...answers, selected];
    if (index === questions.length - 1) {
      const penaltySeconds = allAnswers.reduce((sum, answer, questionIndex) => sum + (answer === questions[questionIndex].answer ? 0 : 10), 0);
      const row: RecordRow = {
        id: crypto.randomUUID(),
        name: name.trim(),
        phone: maskPhone(phone),
        score: allAnswers.reduce((count, answer, questionIndex) => count + (answer === questions[questionIndex].answer ? 1 : 0), 0),
        wrongCount: allAnswers.filter((answer, questionIndex) => answer !== questions[questionIndex].answer).length,
        baseDuration: seconds,
        penaltySeconds,
        finalDuration: seconds + penaltySeconds,
        submittedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      };
      saveRows([...loadStoredRows(), row]);
      setResult(row);
      setScreen("result");
      return;
    }
    setAnswers((value) => [...value, selected]);
    setIndex((value) => value + 1);
    setSelected(null);
  }

  function leaveQuiz() {
    if (!window.confirm("离开后，这次答题不会保存。")) return;
    setScreen("intro");
    setSelected(null);
    setAnswers([]);
    setIndex(0);
  }

  function reset() {
    setScreen("intro");
    setName("");
    setPhone("");
    setError("");
    setResult(null);
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
            <button className="primary" type="submit">开始答题</button>
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
              <span>用时 {formatDuration(seconds)}</span>
              <span>{index + 1}/{questions.length}</span>
            </div>
            <section className="sheet">
              <h2>{current.text}</h2>
              <div className="options">
                {current.options.map((option, optionIndex) => {
                  const state = !answered ? "" : optionIndex === current.answer ? "correct" : optionIndex === selected ? "wrong" : "";
                  return (
                    <button
                      key={option}
                      type="button"
                      className={`option ${state}`}
                      onClick={() => choose(optionIndex)}
                      disabled={answered}
                    >
                      <span>{String.fromCharCode(65 + optionIndex)} {option}</span>
                      {answered && optionIndex === current.answer && <Check />}
                    </button>
                  );
                })}
              </div>
              {answered && (
                <div className="explain" aria-live="polite">
                  <h3>答案解析</h3>
                  <p>正确答案：{String.fromCharCode(65 + current.answer)}</p>
                  <p>{correct ? current.note : `答错，用时增加 10 秒。${current.note}`}</p>
                </div>
              )}
              {answered && (
                <button className="primary" type="button" onClick={next}>
                  {index === questions.length - 1 ? "完成" : "下一题"}
                </button>
              )}
            </section>
          </div>
        </main>
      )}
      {screen === "result" && result && (
        <ResultScreen result={result} total={questions.length} onAgain={reset} />
      )}
    </div>
  );
}
