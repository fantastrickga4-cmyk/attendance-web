"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RECIPES } from "@/lib/recipes";
import {
  STAGES,
  CATEGORIES,
  type Stage,
  type Category,
  type Allergen,
} from "@/lib/types";
import { STAGE_STYLE, CATEGORY_EMOJI } from "@/lib/theme";
import { RecipeThumb } from "@/components/recipe-thumb";

export default function Home() {
  const [stage, setStage] = useState<Stage | "전체">("전체");
  const [category, setCategory] = useState<Category | "전체">("전체");
  const [query, setQuery] = useState("");
  const [excluded, setExcluded] = useState<Set<Allergen>>(new Set());

  const usedAllergens = useMemo(() => {
    const s = new Set<Allergen>();
    RECIPES.forEach((r) => r.allergens.forEach((a) => s.add(a)));
    return [...s];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim();
    return RECIPES.filter((r) => {
      if (stage !== "전체" && r.stage !== stage) return false;
      if (category !== "전체" && r.category !== category) return false;
      if (r.allergens.some((a) => excluded.has(a))) return false;
      if (q) {
        const hay = `${r.name} ${r.summary} ${r.tags.join(" ")} ${r.ingredients
          .map((i) => i.name)
          .join(" ")}`;
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [stage, category, query, excluded]);

  function toggleAllergen(a: Allergen) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  }

  const hasActiveFilter =
    stage !== "전체" ||
    category !== "전체" ||
    query.trim() !== "" ||
    excluded.size > 0;

  function resetFilters() {
    setStage("전체");
    setCategory("전체");
    setQuery("");
    setExcluded(new Set());
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 히어로 */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-dark px-6 py-7 text-white card-soft">
        <div
          aria-hidden="true"
          className="absolute -right-6 -top-8 text-[7rem] opacity-20 select-none"
        >
          🥕
        </div>
        <p className="text-sm font-semibold text-white/80">
          단계별 맞춤 이유식 · 유아식
        </p>
        <h1 className="mt-1 text-2xl font-extrabold leading-snug sm:text-3xl">
          오늘은 뭐 먹일까?
        </h1>
        <p className="mt-2 max-w-md text-sm text-white/85">
          우리 아이 개월 수에 맞는 레시피를 찾고, 한 주 식단을 미리 짜보세요.
        </p>
        <Link
          href="/plan"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-brand-dark shadow-sm transition hover:bg-white/90"
        >
          주간 식단 짜기 →
        </Link>
      </section>

      {/* 검색 */}
      <div className="relative">
        <label htmlFor="recipe-search" className="sr-only">
          레시피 검색
        </label>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/40"
        >
          🔍
        </span>
        <input
          id="recipe-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="재료나 이름으로 검색 (예: 소고기, 단호박)"
          className="w-full rounded-2xl border border-black/8 bg-white py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-ink/40 focus:border-brand focus:ring-4 focus:ring-brand/15"
        />
      </div>

      {/* 단계 세그먼트 */}
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/45">
          단계
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="단계 선택">
          <StageChip active={stage === "전체"} onClick={() => setStage("전체")}>
            전체
          </StageChip>
          {STAGES.map((s) => {
            const st = STAGE_STYLE[s.key];
            const active = stage === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setStage(s.key)}
                aria-pressed={active}
                className={`flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-sm font-bold transition ${
                  active
                    ? `${st.solid} border-transparent text-white shadow-sm`
                    : "border-black/8 bg-white text-ink/70 hover:border-black/15"
                }`}
              >
                <span aria-hidden="true">{s.emoji}</span>
                <span className="flex flex-col items-start leading-none">
                  {s.label}
                  <span
                    className={`mt-0.5 text-[10px] font-medium ${
                      active ? "text-white/80" : "text-ink/40"
                    }`}
                  >
                    {s.months}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 카테고리 + 알레르기 */}
      <div className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white/60 p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-ink/45">종류</span>
          <SmallChip active={category === "전체"} onClick={() => setCategory("전체")}>
            전체
          </SmallChip>
          {CATEGORIES.map((c) => (
            <SmallChip
              key={c}
              active={category === c}
              onClick={() => setCategory(c)}
            >
              {CATEGORY_EMOJI[c]} {c}
            </SmallChip>
          ))}
        </div>
        {usedAllergens.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-black/5 pt-3">
            <span className="text-xs font-bold text-ink/45">알레르기 제외</span>
            {usedAllergens.map((a) => (
              <button
                key={a}
                onClick={() => toggleAllergen(a)}
                aria-pressed={excluded.has(a)}
                aria-label={`${a} 알레르기 ${excluded.has(a) ? "제외 해제" : "제외"}`}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  excluded.has(a)
                    ? "border-rose-300 bg-rose-100 text-rose-700 line-through"
                    : "border-black/10 bg-white text-ink/60 hover:border-black/20"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink/50" aria-live="polite">
          총 <span className="text-brand-dark">{filtered.length}</span>개의 레시피
        </p>
        {hasActiveFilter && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-ink/60 transition hover:border-black/20 hover:text-ink"
          >
            <span aria-hidden="true">↺</span> 필터 초기화
          </button>
        )}
      </div>

      {/* 카드 목록 */}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filtered.map((r) => {
          const st = STAGE_STYLE[r.stage];
          return (
            <li key={r.id}>
              <Link
                href={`/recipes/${r.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-black/5 bg-white card-soft transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                {/* 썸네일 영역 */}
                <div
                  className={`relative flex h-28 items-center justify-center ${st.soft}`}
                >
                  <RecipeThumb
                    id={r.id}
                    emoji={CATEGORY_EMOJI[r.category] ?? "🍽️"}
                  />
                  <span
                    className={`absolute left-3 top-3 rounded-full ${st.solid} px-2.5 py-0.5 text-xs font-bold text-white shadow-sm`}
                  >
                    {r.stage}
                  </span>
                  {r.allergens.length > 0 && (
                    <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-rose-500">
                      ⚠ {r.allergens.length}
                    </span>
                  )}
                </div>
                {/* 본문 */}
                <div className="flex flex-1 flex-col gap-1.5 p-4">
                  <h2 className="font-extrabold text-ink transition group-hover:text-brand-dark">
                    {r.name}
                  </h2>
                  <p className="line-clamp-2 text-sm text-ink/60">{r.summary}</p>
                  <div className="mt-auto flex items-center gap-2 pt-2 text-xs font-medium text-ink/50">
                    <span className="inline-flex items-center gap-1">
                      <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                      {r.category}
                    </span>
                    <span>·</span>
                    <span>🕒 {r.timeMinutes}분</span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 && (
        <div className="rounded-3xl border border-dashed border-black/10 py-12 text-center">
          <div className="text-3xl">🍽️</div>
          <p className="mt-2 text-sm text-ink/50">
            조건에 맞는 레시피가 없어요. 필터를 줄여보세요.
          </p>
        </div>
      )}
    </div>
  );
}

function StageChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-2xl border px-4 py-2 text-sm font-bold transition ${
        active
          ? "border-transparent bg-ink text-white shadow-sm"
          : "border-black/8 bg-white text-ink/70 hover:border-black/15"
      }`}
    >
      {children}
    </button>
  );
}

function SmallChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
        active
          ? "border-transparent bg-brand text-white shadow-sm"
          : "border-black/8 bg-white text-ink/60 hover:border-black/15"
      }`}
    >
      {children}
    </button>
  );
}
