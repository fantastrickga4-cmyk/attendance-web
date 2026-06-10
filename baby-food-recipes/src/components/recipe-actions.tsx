"use client";

import { useRecipeLog } from "@/lib/use-recipe-log";

/** 레시피 상세의 즐겨찾기(♥)·먹어봄(✓) 토글 버튼 */
export function RecipeActions({ id }: { id: string }) {
  const { favs, tried, toggleFav, toggleTried, loaded } = useRecipeLog();
  const isFav = favs.has(id);
  const isTried = tried.has(id);

  return (
    <div className="flex gap-2">
      <button
        onClick={() => toggleFav(id)}
        aria-pressed={isFav}
        className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition ${
          isFav
            ? "border-rose-300 bg-rose-100 text-rose-600"
            : "border-black/10 bg-white text-ink/60 hover:border-black/20"
        }`}
      >
        <span aria-hidden="true">{isFav ? "♥" : "♡"}</span>
        {isFav ? "찜함" : "찜하기"}
      </button>
      <button
        onClick={() => toggleTried(id)}
        aria-pressed={isTried}
        className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition ${
          isTried
            ? "border-emerald-300 bg-emerald-100 text-emerald-700"
            : "border-black/10 bg-white text-ink/60 hover:border-black/20"
        }`}
      >
        <span aria-hidden="true">{isTried ? "✓" : "○"}</span>
        {isTried ? "먹어봤어요" : "먹어봄 기록"}
      </button>
      {/* 로딩 전 깜빡임 방지용 placeholder 없음 — 초기 무표시 상태가 자연스러움 */}
      <span className="sr-only">{loaded ? "" : "불러오는 중"}</span>
    </div>
  );
}
