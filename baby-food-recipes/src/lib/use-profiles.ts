"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "ibanchan-profiles";
const OLD_MONTHS = "ibanchan-baby-months";

export type Profile = { id: string; name: string; months: number };
type Store = { profiles: Profile[]; activeId: string | null };

/** 아이 프로필 다중 관리 (이름·월령). 기존 단일 월령은 첫 로드 시 프로필로 마이그레이션 */
export function useProfiles() {
  const [store, setStore] = useState<Store>({ profiles: [], activeId: null });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const r = localStorage.getItem(KEY);
      if (r) {
        setStore(JSON.parse(r) as Store);
      } else {
        const old = localStorage.getItem(OLD_MONTHS);
        if (old) {
          const p: Profile = { id: `p-${Date.now()}`, name: "우리 아이", months: Number(old) };
          const next = { profiles: [p], activeId: p.id };
          setStore(next);
          localStorage.setItem(KEY, JSON.stringify(next));
        }
      }
    } catch {
      /* 무시 */
    }
    setLoaded(true);
  }, []);

  const commit = (next: Store) => {
    setStore(next);
    localStorage.setItem(KEY, JSON.stringify(next));
    // 다른 곳(자동 식단 등)이 참조하는 단일 월령도 활성 값으로 유지
    const active = next.profiles.find((p) => p.id === next.activeId);
    if (active) localStorage.setItem(OLD_MONTHS, String(active.months));
  };

  const addProfile = useCallback((name: string, months: number) => {
    setStore((prev) => {
      const p: Profile = { id: `p-${Date.now()}`, name, months };
      const next = { profiles: [...prev.profiles, p], activeId: p.id };
      localStorage.setItem(KEY, JSON.stringify(next));
      localStorage.setItem(OLD_MONTHS, String(months));
      return next;
    });
  }, []);

  const removeProfile = useCallback((id: string) => {
    setStore((prev) => {
      const profiles = prev.profiles.filter((p) => p.id !== id);
      const activeId = prev.activeId === id ? (profiles[0]?.id ?? null) : prev.activeId;
      const next = { profiles, activeId };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setActive = useCallback((id: string) => {
    setStore((prev) => {
      const next = { ...prev, activeId: id };
      localStorage.setItem(KEY, JSON.stringify(next));
      const active = next.profiles.find((p) => p.id === id);
      if (active) localStorage.setItem(OLD_MONTHS, String(active.months));
      return next;
    });
  }, []);

  const setMonths = useCallback((id: string, months: number) => {
    setStore((prev) => {
      const profiles = prev.profiles.map((p) => (p.id === id ? { ...p, months } : p));
      const next = { ...prev, profiles };
      localStorage.setItem(KEY, JSON.stringify(next));
      if (prev.activeId === id) localStorage.setItem(OLD_MONTHS, String(months));
      return next;
    });
  }, []);

  const active = store.profiles.find((p) => p.id === store.activeId) ?? null;
  return { profiles: store.profiles, active, addProfile, removeProfile, setActive, setMonths, loaded };
}
