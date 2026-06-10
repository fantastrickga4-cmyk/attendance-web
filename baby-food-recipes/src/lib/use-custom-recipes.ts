"use client";

import { useCallback, useEffect, useState } from "react";
import type { Stage, Category } from "./types";

const KEY = "ibanchan-my-recipes";

export type CustomRecipe = {
  id: string;
  name: string;
  stage: Stage;
  category: Category;
  timeMinutes: number;
  ingredients: string; // 줄바꿈 구분
  steps: string; // 줄바꿈 구분
};

/** 사용자가 직접 등록한 레시피 (로컬 저장) */
export function useCustomRecipes() {
  const [recipes, setRecipes] = useState<CustomRecipe[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const r = localStorage.getItem(KEY);
      if (r) setRecipes(JSON.parse(r) as CustomRecipe[]);
    } catch {
      /* 무시 */
    }
    setLoaded(true);
  }, []);

  const persist = (next: CustomRecipe[]) => {
    setRecipes(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  const add = useCallback(
    (r: Omit<CustomRecipe, "id">) => {
      const entry: CustomRecipe = { ...r, id: `my-${Date.now()}` };
      setRecipes((prev) => {
        const next = [entry, ...prev];
        localStorage.setItem(KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setRecipes((prev) => {
      const next = prev.filter((r) => r.id !== id);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { recipes, add, remove, loaded, persist };
}
