"use client";

import { Heart, CalendarPlus, Check } from "lucide-react";
import { useRecipeLog } from "@/lib/use-recipe-log";
import { useEaten, todayStr } from "@/lib/use-eaten";

/** 레시피 상세의 즐겨찾기(♥)·오늘 먹였어요(기록) 버튼 */
export function RecipeActions({ id }: { id: string }) {
  const { favs, toggleFav } = useRecipeLog();
  const { log, addToday } = useEaten();
  const isFav = favs.has(id);
  const eatenToday = log.some((e) => e.id === id && e.date === todayStr());

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
        onClick={() => addToday(id)}
        disabled={eatenToday}
        className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-bold transition active:scale-[0.98] ${
          eatenToday
            ? "border-[#6f8f6a] bg-[#eef2ed] text-[#4f6b4a]"
            : "border-line bg-surface text-ink/60 hover:border-ink/25"
        }`}
      >
        {eatenToday ? (
          <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        ) : (
          <CalendarPlus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        )}
        {eatenToday ? "오늘 먹였어요" : "오늘 먹였어요 기록"}
      </button>
    </div>
  );
}
