"use client";

import { Heart, Check } from "lucide-react";
import { useRecipeLog } from "@/lib/use-recipe-log";

/** 레시피 상세의 즐겨찾기(♥)·먹어봄(✓) 토글 버튼 */
export function RecipeActions({ id }: { id: string }) {
  const { favs, tried, toggleFav, toggleTried } = useRecipeLog();
  const isFav = favs.has(id);
  const isTried = tried.has(id);

  return (
    <div className="flex gap-2">
      <button
        onClick={() => toggleFav(id)}
        aria-pressed={isFav}
        className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-bold transition active:scale-[0.98] ${
          isFav
            ? "border-brand bg-brand-soft text-brand-dark"
            : "border-line bg-surface text-ink/60 hover:border-ink/25"
        }`}
      >
        <Heart
          className="h-4 w-4"
          strokeWidth={2}
          fill={isFav ? "currentColor" : "none"}
          aria-hidden="true"
        />
        {isFav ? "찜함" : "찜하기"}
      </button>
      <button
        onClick={() => toggleTried(id)}
        aria-pressed={isTried}
        className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-bold transition active:scale-[0.98] ${
          isTried
            ? "border-[#6f8f6a] bg-[#eef2ed] text-[#4f6b4a]"
            : "border-line bg-surface text-ink/60 hover:border-ink/25"
        }`}
      >
        <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        {isTried ? "먹어봤어요" : "먹어봄 기록"}
      </button>
    </div>
  );
}
