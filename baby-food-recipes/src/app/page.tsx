"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Clock,
  Heart,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import { RECIPES } from "@/lib/recipes";
import {
  STAGES,
  CATEGORIES,
  stageForMonth,
  type Stage,
  type Category,
  type Allergen,
  type Recipe,
} from "@/lib/types";
import { STAGE_STYLE, CATEGORY_ICON } from "@/lib/theme";
import { RecipeThumb } from "@/components/recipe-thumb";
import { ProfileBar } from "@/components/profile-bar";
import { StageGuide } from "@/components/stage-guide";
import { useRecipeLog } from "@/lib/use-recipe-log";
import { useProfiles } from "@/lib/use-profiles";

/** 단계 → 월령 표기 */
const STAGE_MONTHS = Object.fromEntries(
  STAGES.map((s) => [s.key, s.months]),
) as Record<Stage, string>;

const QUICK_INGREDIENTS = [
  "소고기",
  "닭고기",
  "두부",
  "달걀",
  "단호박",
  "감자",
  "애호박",
  "브로콜리",
];

const ALLERGEN_KEY = "ibanchan-excluded-allergens";

type SortKey = "추천" | "빠른조리" | "이름";
const SORTS: SortKey[] = ["추천", "빠른조리", "이름"];
const SORT_LABEL: Record<SortKey, string> = {
  추천: "추천순",
  빠른조리: "빠른 조리순",
  이름: "이름순",
};

export default function Home() {
  const [stage, setStage] = useState<Stage | "전체">("전체");
  const [category, setCategory] = useState<Category | "전체">("전체");
  const [query, setQuery] = useState("");
  const [excluded, setExcluded] = useState<Set<Allergen>>(new Set());
  const [sort, setSort] = useState<SortKey>("추천");
  const [onlyFav, setOnlyFav] = useState(false);
  const [fridge, setFridge] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const { favs, toggleFav } = useRecipeLog();
  const profileApi = useProfiles();
  const babyMonths = profileApi.active?.months ?? null;

  useEffect(() => {
    try {
      const a = localStorage.getItem(ALLERGEN_KEY);
      if (a) setExcluded(new Set(JSON.parse(a) as Allergen[]));
    } catch {
      /* 무시 */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(ALLERGEN_KEY, JSON.stringify([...excluded]));
  }, [excluded, loaded]);

  const usedAllergens = useMemo(() => {
    const s = new Set<Allergen>();
    RECIPES.forEach((r) => r.allergens.forEach((a) => s.add(a)));
    return [...s];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim();
    const list = RECIPES.filter((r) => {
      if (onlyFav && !favs.has(r.id)) return false;
      if (stage !== "전체" && r.stage !== stage) return false;
      if (category !== "전체" && r.category !== category) return false;
      if (r.allergens.some((a) => excluded.has(a))) return false;
      if (fridge.size > 0) {
        const has = r.ingredients.some((i) =>
          [...fridge].some((f) => i.name.includes(f)),
        );
        if (!has) return false;
      }
      if (q) {
        const hay = `${r.name} ${r.summary} ${r.tags.join(" ")} ${r.ingredients
          .map((i) => i.name)
          .join(" ")}`;
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const sorted = [...list];
    if (sort === "빠른조리") sorted.sort((a, b) => a.timeMinutes - b.timeMinutes);
    else if (sort === "이름") sorted.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    return sorted;
  }, [stage, category, query, excluded, sort, onlyFav, favs, fridge]);

  const recommended = useMemo(() => {
    if (babyMonths == null) return [];
    const s = stageForMonth(babyMonths);
    return RECIPES.filter(
      (r) => r.stage === s && !r.allergens.some((a) => excluded.has(a)),
    );
  }, [babyMonths, excluded]);

  function toggleAllergen(a: Allergen) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  }

  function toggleFridge(ing: string) {
    setFridge((prev) => {
      const n = new Set(prev);
      if (n.has(ing)) n.delete(ing);
      else n.add(ing);
      return n;
    });
  }

  const hasActiveFilter =
    stage !== "전체" ||
    category !== "전체" ||
    query.trim() !== "" ||
    excluded.size > 0 ||
    onlyFav ||
    fridge.size > 0;

  function resetFilters() {
    setStage("전체");
    setCategory("전체");
    setQuery("");
    setExcluded(new Set());
    setOnlyFav(false);
    setFridge(new Set());
  }

  return (
    <div className="flex flex-col gap-9">
      {/* 히어로 */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-surface px-7 py-12 sm:px-10 sm:py-16">
        {/* 미묘한 배경 악센트 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-soft/60 blur-2xl"
        />
        <div className="relative">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
            <span className="h-px w-6 bg-brand/50" />
            단계별 이유식 · 유아식
          </div>
          <h1 className="mt-4 text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl">
            오늘은<br />뭐 먹일까?
          </h1>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink/55">
            우리 아이 개월 수에 맞는 레시피를 찾고, 한 주 식단을 미리 짜보세요.
          </p>
          <Link
            href="/plan"
            className="group mt-7 inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white transition hover:bg-brand"
          >
            <CalendarDays className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            주간 식단 짜기
            <ChevronRight
              className="h-4 w-4 transition group-hover:translate-x-0.5"
              strokeWidth={2}
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>

      {/* 아이 프로필 (월령 개인화) */}
      <ProfileBar
        profiles={profileApi.profiles}
        active={profileApi.active}
        addProfile={profileApi.addProfile}
        removeProfile={profileApi.removeProfile}
        setActive={profileApi.setActive}
        setMonths={profileApi.setMonths}
      />

      {/* 월령 맞춤 추천 */}
      {babyMonths != null && recommended.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink">
              <Sparkles className="h-4 w-4 text-brand" strokeWidth={2} aria-hidden="true" />
              만 {babyMonths}개월에게 맞는 레시피
            </h2>
            <button
              onClick={() => setStage(stageForMonth(babyMonths))}
              className="shrink-0 text-xs font-semibold text-brand transition hover:underline"
            >
              이 단계 전체
            </button>
          </div>
          <ul className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {recommended.map((r) => (
              <li key={r.id} className="w-40 shrink-0 snap-start">
                <MiniCard r={r} isFav={favs.has(r.id)} onToggleFav={toggleFav} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 검색 */}
      <div>
        <div className="relative">
          <label htmlFor="recipe-search" className="sr-only">
            레시피 검색
          </label>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35"
            aria-hidden="true"
          />
          <input
            id="recipe-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="재료나 이름으로 검색 (예: 소고기, 단호박)"
            className="w-full rounded-xl border border-line bg-surface py-3 pl-10 pr-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-brand"
          />
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-ink/35">냉장고 재료</span>
          {QUICK_INGREDIENTS.map((ing) => {
            const active = fridge.has(ing);
            return (
              <button
                key={ing}
                onClick={() => toggleFridge(ing)}
                aria-pressed={active}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold transition ${
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-surface text-ink/55 hover:border-ink/25"
                }`}
              >
                {ing}
              </button>
            );
          })}
          {fridge.size > 0 && (
            <span className="text-xs font-semibold text-brand">
              {fridge.size}개 재료로 검색
            </span>
          )}
        </div>
      </div>

      {/* 단계 세그먼트 */}
      <div>
        <div className="mb-2.5 text-xs font-bold uppercase tracking-wide text-ink/40">
          단계
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="단계 선택">
          <button
            onClick={() => setStage("전체")}
            aria-pressed={stage === "전체"}
            className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
              stage === "전체"
                ? "border-ink bg-ink text-white"
                : "border-line bg-surface text-ink/65 hover:border-ink/25"
            }`}
          >
            전체
          </button>
          {STAGES.map((s) => {
            const st = STAGE_STYLE[s.key];
            const active = stage === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setStage(s.key)}
                aria-pressed={active}
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-bold transition ${
                  active
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-surface text-ink/65 hover:border-ink/25"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white" : st.dot}`}
                />
                <span className="flex flex-col items-start leading-none">
                  {s.label}
                  <span
                    className={`mt-1 text-[10px] font-medium ${
                      active ? "text-white/70" : "text-ink/40"
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

      {/* 단계 가이드 */}
      {stage !== "전체" && <StageGuide stage={stage} />}

      {/* 카테고리 + 알레르기 */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-ink/40">종류</span>
          <SmallChip active={category === "전체"} onClick={() => setCategory("전체")}>
            전체
          </SmallChip>
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICON[c];
            return (
              <SmallChip
                key={c}
                active={category === c}
                onClick={() => setCategory(c)}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                {c}
              </SmallChip>
            );
          })}
        </div>
        {usedAllergens.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <span className="text-xs font-bold text-ink/40">알레르기 제외</span>
            {usedAllergens.map((a) => (
              <button
                key={a}
                onClick={() => toggleAllergen(a)}
                aria-pressed={excluded.has(a)}
                aria-label={`${a} 알레르기 ${excluded.has(a) ? "제외 해제" : "제외"}`}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  excluded.has(a)
                    ? "border-rose-300 bg-rose-50 text-rose-600 line-through"
                    : "border-line bg-surface text-ink/55 hover:border-ink/25"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 결과 수 + 정렬 + 초기화 */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink/55" aria-live="polite">
          총 <span className="text-ink">{filtered.length}</span>개
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnlyFav((v) => !v)}
            aria-pressed={onlyFav}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
              onlyFav
                ? "border-brand bg-brand-soft text-brand-dark"
                : "border-line bg-surface text-ink/55 hover:border-ink/25"
            }`}
          >
            <Heart
              className="h-3.5 w-3.5"
              strokeWidth={2}
              fill={onlyFav ? "currentColor" : "none"}
              aria-hidden="true"
            />
            찜만
          </button>
          <label htmlFor="sort" className="sr-only">
            정렬 기준
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink/70 outline-none focus:border-brand"
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {SORT_LABEL[s]}
              </option>
            ))}
          </select>
          {hasActiveFilter && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink/55 transition hover:border-ink/25 hover:text-ink"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              초기화
            </button>
          )}
        </div>
      </div>

      {/* 카드 목록 */}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filtered.map((r) => (
          <li key={r.id}>
            <RecipeCard r={r} isFav={favs.has(r.id)} onToggleFav={toggleFav} />
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line py-12 text-center">
          <Search className="mx-auto h-7 w-7 text-ink/30" strokeWidth={1.5} aria-hidden="true" />
          <p className="mt-2 text-sm text-ink/50">
            조건에 맞는 레시피가 없어요. 필터를 줄여보세요.
          </p>
        </div>
      )}
    </div>
  );
}

/** 레시피 카드 (목록) */
function RecipeCard({
  r,
  isFav,
  onToggleFav,
}: {
  r: Recipe;
  isFav: boolean;
  onToggleFav: (id: string) => void;
}) {
  const st = STAGE_STYLE[r.stage];
  const Icon = CATEGORY_ICON[r.category];
  return (
    <Link
      href={`/recipes/${r.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-ink/20"
    >
      {/* 썸네일 */}
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden thumb-bg bg-[#f3f0ec]">
        <RecipeThumb
          id={r.id}
          category={r.category}
          iconClassName="h-9 w-9 text-ink/30"
          imgClassName="absolute inset-0 h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.04]"
        />
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleFav(r.id);
          }}
          aria-pressed={isFav}
          aria-label={isFav ? "찜 해제" : "찜하기"}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface/85 backdrop-blur transition hover:scale-105"
        >
          <Heart
            className={`h-4 w-4 ${isFav ? "text-brand" : "text-ink/35"}`}
            strokeWidth={2}
            fill={isFav ? "currentColor" : "none"}
            aria-hidden="true"
          />
        </button>
      </div>
      {/* 본문 */}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-ink/45">
          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
          {r.stage}
          <span className="text-ink/25">·</span>
          {STAGE_MONTHS[r.stage]}
        </div>
        <h2 className="text-base font-bold leading-snug tracking-tight text-ink transition group-hover:text-brand-dark">
          {r.name}
        </h2>
        <p className="line-clamp-2 text-sm leading-relaxed text-ink/55">{r.summary}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs font-medium text-ink/50">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            {r.timeMinutes}분
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            {r.category}
          </span>
          {r.allergens.length > 0 && (
            <span className="inline-flex items-center gap-1 text-rose-500">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              {r.allergens.slice(0, 2).join("·")}
              {r.allergens.length > 2 ? ` +${r.allergens.length - 2}` : ""}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/** 작은 레시피 카드 (추천 캐러셀) */
function MiniCard({
  r,
  isFav,
  onToggleFav,
}: {
  r: Recipe;
  isFav: boolean;
  onToggleFav: (id: string) => void;
}) {
  return (
    <Link
      href={`/recipes/${r.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition hover:border-ink/20"
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden thumb-bg bg-[#f3f0ec]">
        <RecipeThumb
          id={r.id}
          category={r.category}
          iconClassName="h-6 w-6 text-ink/30"
          imgClassName="absolute inset-0 h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.04]"
        />
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleFav(r.id);
          }}
          aria-pressed={isFav}
          aria-label={isFav ? "찜 해제" : "찜하기"}
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface/90 backdrop-blur"
        >
          <Heart
            className={`h-3 w-3 ${isFav ? "text-brand" : "text-ink/35"}`}
            strokeWidth={2}
            fill={isFav ? "currentColor" : "none"}
            aria-hidden="true"
          />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <h3 className="line-clamp-2 text-xs font-bold leading-snug text-ink transition group-hover:text-brand-dark">
          {r.name}
        </h3>
        <span className="mt-auto inline-flex items-center gap-1 text-[10px] font-semibold text-ink/45">
          <Clock className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
          {r.timeMinutes}분
        </span>
      </div>
    </Link>
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
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition ${
        active
          ? "border-ink bg-ink text-white"
          : "border-line bg-surface text-ink/60 hover:border-ink/25"
      }`}
    >
      {children}
    </button>
  );
}
