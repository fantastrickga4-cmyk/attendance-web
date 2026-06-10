"use client";

import { useCallback, useEffect, useState } from "react";

const FAV_KEY = "ibanchan-favorites";
const TRIED_KEY = "ibanchan-tried";

function load(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* 무시 */
  }
  return new Set();
}

/**
 * 레시피 즐겨찾기(♥)·먹어봄(✓) 로깅 훅. 로그인 없이 localStorage로 저장.
 * 같은 탭 내 여러 컴포넌트가 동기화되도록 window 커스텀 이벤트로 브로드캐스트한다.
 */
export function useRecipeLog() {
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [tried, setTried] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFavs(load(FAV_KEY));
    setTried(load(TRIED_KEY));
    setLoaded(true);
    const sync = () => {
      setFavs(load(FAV_KEY));
      setTried(load(TRIED_KEY));
    };
    window.addEventListener("ibanchan-log-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ibanchan-log-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback(
    (key: string, setFn: typeof setFavs, id: string) => {
      setFn((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        localStorage.setItem(key, JSON.stringify([...next]));
        window.dispatchEvent(new Event("ibanchan-log-change"));
        return next;
      });
    },
    [],
  );

  const toggleFav = useCallback(
    (id: string) => toggle(FAV_KEY, setFavs, id),
    [toggle],
  );
  const toggleTried = useCallback(
    (id: string) => toggle(TRIED_KEY, setTried, id),
    [toggle],
  );

  return { favs, tried, toggleFav, toggleTried, loaded };
}
