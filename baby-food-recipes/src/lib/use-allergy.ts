"use client";

import { useCallback, useEffect, useState } from "react";
import { todayStr } from "./use-eaten";

const KEY = "ibanchan-allergy";

export type Reaction = "없음" | "의심" | "있음";
export type AllergyEntry = {
  foodId: string;
  foodName: string;
  date: string;
  reaction: Reaction;
};

/** 재료 도입 + 알레르기 반응 기록. localStorage 저장 + 탭 내 동기화 */
export function useAllergy() {
  const [log, setLog] = useState<AllergyEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const read = () => {
      try {
        const r = localStorage.getItem(KEY);
        setLog(r ? (JSON.parse(r) as AllergyEntry[]) : []);
      } catch {
        setLog([]);
      }
    };
    read();
    setLoaded(true);
    window.addEventListener("ibanchan-allergy-change", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("ibanchan-allergy-change", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  const add = useCallback(
    (foodId: string, foodName: string, reaction: Reaction) => {
      setLog((prev) => {
        const next = [
          { foodId, foodName, date: todayStr(), reaction },
          ...prev,
        ];
        localStorage.setItem(KEY, JSON.stringify(next));
        window.dispatchEvent(new Event("ibanchan-allergy-change"));
        return next;
      });
    },
    [],
  );

  const remove = useCallback((entry: AllergyEntry) => {
    setLog((prev) => {
      const next = prev.filter(
        (e) =>
          !(
            e.foodId === entry.foodId &&
            e.date === entry.date &&
            e.reaction === entry.reaction
          ),
      );
      localStorage.setItem(KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("ibanchan-allergy-change"));
      return next;
    });
  }, []);

  return { log, add, remove, loaded };
}
