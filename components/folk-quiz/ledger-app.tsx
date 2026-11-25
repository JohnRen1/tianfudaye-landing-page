"use client";

import { FormEvent, useEffect, useState } from "react";
import { questions } from "@/lib/folk-quiz/questions";
import { fetchEvent, fetchRecords, formatDuration, formatEventTime, fromDatetimeLocalValue, leaderboardFrom, saveEvent, toDatetimeLocalValue } from "@/lib/folk-quiz/records";
import type { RecordRow } from "@/lib/folk-quiz/types";
import "./folk-quiz.css";

type LedgerState = { rows: RecordRow[]; sample: boolean; failed: boolean };

export function LedgerApp() {
  const [ledger, setLedger] = useState<LedgerState | null>(null);
  const [startValue, setStartValue] = useState("");
  const [endValue, setEndValue] = useState("");
  const [eventMessage, setEventMessage] = useState("正在读取活动时间");
  const [savingEvent, setSavingEvent] = useState(false);

  useEffect(() => {
    let active = true;
    const sync = () => {
      void fetchRecords()
        .then((stored) => {
          if (!active) return;
          setLedger({ rows: leaderboardFrom(stored), sample: stored.length === 0, failed: false });
        })
        .catch(() => {
          if (!active) return;
          setLedger({ rows: [], sample: false, failed: true });
        });
    };
    sync();
    void fetchEvent()
      .then((data) => {
        if (!active) return;
        if (data.startAt && data.endAt) {
          setStartValue(toDatetimeLocalValue(data.startAt));
          setEndValue(toDatetimeLocalValue(data.endAt));
          setEventMessage(`当前场次 ${formatEventTime(data.startAt)} 至 ${formatEventTime(data.endAt)}`);
          return;
        }
        setEventMessage("还没有设置活动时间，设置后参赛者才能答题");
      })
      .catch(() => {
        if (active) setEventMessage("活动时间读取失败");
      });
    window.addEventListener("focus", sync);
    return () => {
      active = false;
      window.removeEventListener("focus", sync);
    };
  }, []);

  const rows = ledger?.rows ?? [];

  async function saveWindow(event: FormEvent) {
    event.preventDefault();
    if (!startValue || !endValue) {
      setEventMessage("请填写开始和结束时间");
      return;
    }
    setSavingEvent(true);
    try {
      const saved = await saveEvent(fromDatetimeLocalValue(startValue), fromDatetimeLocalValue(endValue));
      setEventMessage(saved.startAt && saved.endAt ? `已保存：${formatEventTime(saved.startAt)} 至 ${formatEventTime(saved.endAt)}` : "活动时间没有保存");
    } catch (cause) {
      setEventMessage(cause instanceof Error ? cause.message : "活动时间没有保存");
    } finally {
      setSavingEvent(false);
    }
  }

  return (
    <div className="folk-quiz">
      <a className="skip" href="#main">跳到主要内容</a>
      <main id="main" className="ledger">
        <form className="event-form" onSubmit={(event) => void saveWindow(event)}>
          <h2>活动时间</h2>
          <p>整场共用一个截止时间。4 点开始、4 点半结束时，4 点进入剩 30 分钟，4 点 10 分进入剩 20 分钟。时间之外不能答题。</p>
          <label>开始时间<input type="datetime-local" value={startValue} onChange={(event) => setStartValue(event.target.value)} required /></label>
          <label>结束时间<input type="datetime-local" value={endValue} onChange={(event) => setEndValue(event.target.value)} required /></label>
          <p>{eventMessage}</p>
          <button className="primary" type="submit" disabled={savingEvent}>保存活动时间</button>
        </form>
        <header className="ledger-head">
          <h1>参赛台账</h1>
          <p>{ledger == null ? "正在读取记录" : ledger.failed ? "记录读取失败" : ledger.sample ? "当前是示例记录" : `共 ${rows.length} 条`}</p>
        </header>
        {ledger?.failed ? null : ledger != null && rows.length === 0 ? (
          <p className="empty">还没有参赛记录</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>排名</th>
                  <th>姓名</th>
                  <th>手机号</th>
                  <th>答对</th>
                  <th>错题</th>
                  <th>用时</th>
                  <th>提交时间</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: RecordRow, index) => (
                  <tr key={row.id}>
                    <td>{index + 1}</td>
                    <td>{row.name}</td>
                    <td>{row.phone}</td>
                    <td>{row.score} / {questions.length}</td>
                    <td>{row.wrongCount}</td>
                    <td>
                      {formatDuration(row.finalDuration)}
                      {row.penaltySeconds > 0 && <small>含惩罚 {row.penaltySeconds} 秒</small>}
                    </td>
                    <td>{row.submittedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
