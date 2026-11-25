"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { gradeAnswers, questions } from "@/lib/folk-quiz/questions";
import { NAME_TAKEN_MESSAGE, eventLimitSeconds, fetchEvent, fetchRecords, formatDuration, formatEventTime, formatSpokenDuration, isNameTaken, leaderboardFrom, submitRecord, validPhone, type QuizEventState } from "@/lib/folk-quiz/records";
import type { RecordRow } from "@/lib/folk-quiz/types";
import "./folk-quiz.css";

const TITLE = "江山市图书馆阅读挑战赛";
const LOCAL_PREVIEW = process.env.NODE_ENV === "development";
type Screen = "intro" | "quiz" | "result";
type EventGate = "loading" | "unset" | "early" | "open" | "closed";

function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M11.5 3.5 6 9l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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

function ResultScreen({ result, total, rows, timedOut }: { result: RecordRow; total: number; rows: RecordRow[]; timedOut: boolean }) {
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
      </div>
    </main>
  );
}

function eventGate(event: QuizEventState | null, now: number): EventGate {
  if (!event) return "loading";
  if (!event.startAt || !event.endAt) return "unset";
  if (now < Date.parse(event.startAt)) return "early";
  if (now >= Date.parse(event.endAt)) return "closed";
  return "open";
}

function gateMessage(event: QuizEventState | null, gate: EventGate) {
  if (gate === "loading") return "正在读取活动时间";
  if (gate === "unset" || !event?.startAt || !event.endAt) return "活动时间尚未设置，暂时不能答题";
  if (gate === "early") return `活动尚未开始，开始时间 ${formatEventTime(event.startAt)}`;
  if (gate === "closed") return "活动已结束";
  return "";
}

function introNotice(event: QuizEventState | null, gate: EventGate, now: number) {
  if (LOCAL_PREVIEW) {
    if (gate === "loading") return "正在读取活动时间";
    if (event?.startAt && event.endAt) return `本场 ${formatEventTime(event.startAt)} 至 ${formatEventTime(event.endAt)}`;
    return "";
  }
  if (gate === "open" && event?.startAt && event.endAt) {
    return `本场 ${formatEventTime(event.startAt)} 至 ${formatEventTime(event.endAt)}，剩余 ${formatDuration(Math.max(0, Math.floor((Date.parse(event.endAt) - now) / 1000)))}`;
  }
  return gateMessage(event, gate);
}

export function QuizApp() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Array<number | string>>([]);
  const [blankDraft, setBlankDraft] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<RecordRow | null>(null);
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [eventState, setEventState] = useState<QuizEventState | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const snapshotRef = useRef({ answers, selected: null as number | string | null, index });
  const finishingRef = useRef(false);
  const submitRef = useRef<(elapsed: number, timeout: boolean) => Promise<void>>(async () => {});
  const clockOffsetRef = useRef(0);
  const startedAtRef = useRef(0);
  const eventEndRef = useRef(0);
  const limitRef = useRef(30 * 60);
  snapshotRef.current = { answers, selected, index };
  const current = questions[index];
  const now = Date.now() + clockOffset;
  const gate = eventGate(eventState, now);
  const notice = introNotice(eventState, gate, now);
  const canAnswer = current.kind === "blank" ? blankDraft.trim().length > 0 : selected !== null;

  useEffect(() => {
    let active = true;
    const load = () => {
      void fetchEvent()
        .then((data) => {
          if (!active) return;
          const offset = Date.parse(data.serverNow) - Date.now();
          clockOffsetRef.current = offset;
          setClockOffset(offset);
          setEventState(data);
        })
        .catch(() => {
          if (!active) return;
          setEventState({ startAt: null, endAt: null, serverNow: new Date().toISOString() });
        });
    };
    load();
    const timer = window.setInterval(load, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (screen !== "quiz") return;
    const timer = window.setInterval(() => {
      const aligned = Date.now() + clockOffsetRef.current;
      const left = Math.max(0, Math.floor((eventEndRef.current - aligned) / 1000));
      const elapsed = Math.max(0, Math.floor((Math.min(aligned, eventEndRef.current) - startedAtRef.current) / 1000));
      setRemaining(left);
      setSeconds(elapsed);
      if (left <= 0) {
        window.clearInterval(timer);
        void submitRef.current(elapsed, true);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [screen]);

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
      const latest = await fetchEvent();
      const offset = Date.parse(latest.serverNow) - Date.now();
      clockOffsetRef.current = offset;
      setClockOffset(offset);
      setEventState(latest);
      const aligned = Date.now() + offset;
      const nextGate = eventGate(latest, aligned);
      const sharedClock = !LOCAL_PREVIEW || nextGate === "open";
      if (!LOCAL_PREVIEW && (nextGate !== "open" || !latest.endAt)) {
        setError(gateMessage(latest, nextGate));
        return;
      }
      const existing = await fetchRecords();
      if (isNameTaken(name, existing)) {
        setError(NAME_TAKEN_MESSAGE);
        nameRef.current?.focus();
        return;
      }
      startedAtRef.current = aligned;
      eventEndRef.current = sharedClock && latest.endAt ? Date.parse(latest.endAt) : aligned + 30 * 60 * 1000;
      limitRef.current = sharedClock ? eventLimitSeconds(latest) : 30 * 60;
      setError("");
      setSaveError("");
      setAnswers([]);
      setIndex(0);
      setSelected(null);
      setBlankDraft("");
      setTimedOut(false);
      finishingRef.current = false;
      setResult(null);
      setSeconds(0);
      setRemaining(Math.max(0, Math.floor((eventEndRef.current - aligned) / 1000)));
      setScreen("quiz");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "暂时无法开始答题，请稍后再试");
    } finally {
      setBusy(false);
    }
  }

  async function submitQuiz(elapsed: number, timeout: boolean) {
    if (finishingRef.current) return;
    finishingRef.current = true;
    if (timeout) setTimedOut(true);
    const snap = snapshotRef.current;
    const given = [...snap.answers];
    if (!timeout && snap.selected !== null && given.length === snap.index) given.push(snap.selected);
    const graded = gradeAnswers(given, elapsed, limitRef.current);
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

  function choose(optionIndex: number) {
    if (timedOut) return;
    setSelected(optionIndex);
  }

  async function advance(value: number | string) {
    if (busy || timedOut) return;
    if (index === questions.length - 1) {
      snapshotRef.current = { answers, selected: value, index };
      const aligned = Date.now() + clockOffsetRef.current;
      const elapsed = Math.max(0, Math.floor((Math.min(aligned, eventEndRef.current) - startedAtRef.current) / 1000));
      await submitQuiz(elapsed, false);
      return;
    }
    setAnswers((currentAnswers) => [...currentAnswers, value]);
    setIndex((currentIndex) => currentIndex + 1);
    setSelected(null);
    setBlankDraft("");
  }

  function skipBlank() {
    if (busy || timedOut || current.kind !== "blank") return;
    void advance("");
  }

  function next() {
    if (busy || timedOut) return;
    if (current.kind === "blank") {
      const text = blankDraft.trim();
      if (!text) return;
      void advance(text);
      return;
    }
    if (selected === null) return;
    void advance(selected);
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

  return (
    <div className="folk-quiz">
      <a className="skip" href="#main">跳到主要内容</a>
      {screen === "intro" && (
        <main id="main" className="login-page">
          <form className="login" onSubmit={start}>
            <h1>{TITLE}</h1>
            {notice && <p className="notice">{notice}</p>}
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
            <button className="primary" type="submit" disabled={busy || (!LOCAL_PREVIEW && gate !== "open")}>开始答题</button>
            <p className="once">每位参赛选手仅限一次答题机会，请核对好自己的名字</p>
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
              <h1>{TITLE}</h1>
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
                    value={blankDraft}
                    onChange={(event) => setBlankDraft(event.target.value)}
                    placeholder="填写答案"
                    disabled={timedOut}
                    maxLength={40}
                  />
                </label>
              ) : (
                <div className="options">
                  {current.options.map((option, optionIndex) => (
                    <button
                      key={option}
                      type="button"
                      className={`option ${selected === optionIndex ? "selected" : ""}`}
                      onClick={() => choose(optionIndex)}
                      disabled={timedOut}
                      aria-pressed={selected === optionIndex}
                    >
                      <span>{current.kind === "judge" ? option : `${String.fromCharCode(65 + optionIndex)} ${option}`}</span>
                    </button>
                  ))}
                </div>
              )}
              {timedOut && <p className="error" role="alert">答题时间已到，未作答的题目按答错计算。</p>}
              {saveError && <p className="error" role="alert">{saveError}</p>}
              {timedOut && saveError && (
                <button className="primary" type="button" onClick={() => void submitQuiz(seconds, true)} disabled={busy}>提交成绩</button>
              )}
              {!timedOut && (
                <div className={current.kind === "blank" ? "blank-actions" : undefined}>
                  {current.kind === "blank" && (
                    <button className="secondary" type="button" onClick={skipBlank} disabled={busy}>跳过</button>
                  )}
                  <button className="primary" type="button" onClick={next} disabled={busy || !canAnswer}>
                    {index === questions.length - 1 ? "完成" : "下一题"}
                  </button>
                </div>
              )}
            </section>
          </div>
        </main>
      )}
      {screen === "result" && result && (
        <ResultScreen result={result} total={questions.length} rows={rows} timedOut={timedOut} />
      )}
    </div>
  );
}
