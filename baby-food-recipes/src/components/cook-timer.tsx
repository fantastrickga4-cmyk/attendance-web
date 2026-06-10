"use client";

import { useEffect, useRef, useState } from "react";
import { Timer, Play, Pause, RotateCcw } from "lucide-react";

/** 조리 타이머 — 레시피 조리시간 기준 카운트다운 */
export function CookTimer({ minutes }: { minutes: number }) {
  const total = minutes * 60;
  const [sec, setSec] = useState(total);
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setSec((s) => {
          if (s <= 1) {
            if (ref.current) clearInterval(ref.current);
            setRunning(false);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
      return () => {
        if (ref.current) clearInterval(ref.current);
      };
    }
  }, [running]);

  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  const done = sec === 0;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
      <Timer
        className={`h-5 w-5 shrink-0 ${done ? "text-brand" : "text-ink/40"}`}
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <div className="flex-1">
        <div className="text-xs font-semibold text-ink/45">조리 타이머</div>
        <div
          className={`text-2xl font-extrabold tabular-nums tracking-tight ${
            done ? "text-brand" : "text-ink"
          }`}
        >
          {mm}:{ss}
        </div>
      </div>
      {done ? (
        <button
          onClick={() => {
            setSec(total);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-bold text-white"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          완료! 리셋
        </button>
      ) : (
        <div className="flex gap-1.5">
          <button
            onClick={() => setRunning((v) => !v)}
            aria-label={running ? "일시정지" : "시작"}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-white transition active:scale-95"
          >
            {running ? (
              <Pause className="h-4 w-4" strokeWidth={2} fill="currentColor" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" strokeWidth={2} fill="currentColor" aria-hidden="true" />
            )}
          </button>
          <button
            onClick={() => {
              setRunning(false);
              setSec(total);
            }}
            aria-label="리셋"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink/55 transition hover:text-ink active:scale-95"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
