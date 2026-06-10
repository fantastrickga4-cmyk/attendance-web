"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/** 다크/라이트 토글 (localStorage + 시스템 설정) */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
    setReady(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("ibanchan-theme", next ? "dark" : "light");
    } catch {
      /* 무시 */
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "라이트 모드로" : "다크 모드로"}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink/60 transition hover:text-ink"
    >
      {ready && dark ? (
        <Sun className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      )}
    </button>
  );
}
