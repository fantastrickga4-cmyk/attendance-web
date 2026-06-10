"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "ibanchan-eaten";

export type EatenEntry = { id: string; date: string };

/** 오늘 날짜 YYYY-MM-DD */
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** 먹은 기록 로그 (레시피별 날짜). localStorage 저장 + 탭 내 동기화 */
export function useEaten() {
  const [log, setLog] = useState<EatenEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const read = () => {
      try {
        const r = localStorage.getItem(KEY);
        setLog(r ? (JSON.parse(r) as EatenEntry[]) : []);
      } catch {
        setLog([]);
      }
    };
    read();
    setLoaded(true);
    window.addEventListener("ibanchan-eaten-change", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("ibanchan-eaten-change", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  const addToday = useCallback((id: string) => {
    setLog((prev) => {
      const date = todayStr();
      if (prev.some((e) => e.id === id && e.date === date)) return prev;
      const next = [{ id, date }, ...prev];
      localStorage.setItem(KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("ibanchan-eaten-change"));
      return next;
    });
  }, []);

  const remove = useCallback((id: string, date: string) => {
    setLog((prev) => {
      const next = prev.filter((e) => !(e.id === id && e.date === date));
      localStorage.setItem(KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("ibanchan-eaten-change"));
      return next;
    });
  }, []);

  return { log, addToday, remove, loaded };
}
