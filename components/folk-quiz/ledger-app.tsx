"use client";

import { useEffect, useState } from "react";
import { formatDuration, leaderboardRows, loadStoredRows } from "@/lib/folk-quiz/records";
import type { RecordRow } from "@/lib/folk-quiz/types";
import "./folk-quiz.css";

function readLedger() {
  return {
    rows: leaderboardRows(),
    sample: loadStoredRows().length === 0,
  };
}

export function LedgerApp() {
  const [ledger, setLedger] = useState<ReturnType<typeof readLedger> | null>(null);

  useEffect(() => {
    const sync = () => setLedger(readLedger());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const rows = ledger?.rows ?? [];

  return (
    <div className="folk-quiz">
      <a className="skip" href="#main">跳到主要内容</a>
      <main id="main" className="ledger">
        <header className="ledger-head">
          <h1>参赛台账</h1>
          <p>{ledger == null ? "正在读取记录" : ledger.sample ? "当前是示例记录" : `共 ${rows.length} 条`}</p>
        </header>
        {ledger != null && rows.length === 0 ? (
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
                    <td>{row.score} / 20</td>
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
