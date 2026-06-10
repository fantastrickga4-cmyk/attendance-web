"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, ShoppingBasket } from "lucide-react";
import { RECIPES, getRecipe } from "@/lib/recipes";
import {
  WEEKDAYS,
  MEAL_SLOTS,
  stageForMonth,
  type WeeklyPlan,
  type Weekday,
  type Allergen,
} from "@/lib/types";
import { STAGE_STYLE } from "@/lib/theme";
import { RecipeThumb } from "@/components/recipe-thumb";

const STORAGE_KEY = "baby-food-weekly-plan";

function emptyPlan(): WeeklyPlan {
  return WEEKDAYS.reduce((acc, d) => {
    acc[d] = {};
    return acc;
  }, {} as WeeklyPlan);
}

const CHECKED_KEY = "ibanchan-shopping-checked";

export default function PlanPage() {
  const [plan, setPlan] = useState<WeeklyPlan>(emptyPlan);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPlan({ ...emptyPlan(), ...JSON.parse(raw) });
      const c = localStorage.getItem(CHECKED_KEY);
      if (c) setChecked(new Set(JSON.parse(c) as string[]));
    } catch {
      /* 무시 */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  }, [plan, loaded]);

  useEffect(() => {
    if (loaded) localStorage.setItem(CHECKED_KEY, JSON.stringify([...checked]));
  }, [checked, loaded]);

  function setSlot(day: Weekday, slot: string, recipeId: string) {
    setPlan((prev) => ({
      ...prev,
      [day]: { ...prev[day], [slot]: recipeId || undefined },
    }));
  }

  function clearAll() {
    if (confirm("전체 식단을 비울까요?")) setPlan(emptyPlan());
  }

  // 월령(있으면)·알레르기 제외를 반영해 한 주를 자동으로 채운다
  function autoFill() {
    if (!confirm("월령에 맞는 레시피로 한 주를 자동으로 채울까요? 기존 식단은 덮어써요."))
      return;
    let months: number | null = null;
    let excluded = new Set<Allergen>();
    try {
      const m = localStorage.getItem("ibanchan-baby-months");
      if (m) months = Number(m);
      const a = localStorage.getItem("ibanchan-excluded-allergens");
      if (a) excluded = new Set(JSON.parse(a) as Allergen[]);
    } catch {
      /* 무시 */
    }
    const stage = months != null ? stageForMonth(months) : null;
    let pool = RECIPES.filter(
      (r) =>
        (stage ? r.stage === stage : true) &&
        !r.allergens.some((a) => excluded.has(a)),
    );
    if (pool.length === 0) pool = RECIPES;
    const next = emptyPlan();
    WEEKDAYS.forEach((d) =>
      MEAL_SLOTS.forEach((s) => {
        next[d][s] = pool[Math.floor(Math.random() * pool.length)].id;
      }),
    );
    setPlan(next);
  }

  function toggleChecked(name: string) {
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });
  }

  const filledCount = WEEKDAYS.reduce(
    (n, d) => n + MEAL_SLOTS.filter((s) => plan[d]?.[s]).length,
    0,
  );

  const shopping = useMemo(() => {
    const map = new Map<string, number>();
    WEEKDAYS.forEach((d) =>
      MEAL_SLOTS.forEach((s) => {
        const id = plan[d]?.[s];
        if (!id) return;
        const r = getRecipe(id);
        if (!r) return;
        r.ingredients.forEach((ing) =>
          map.set(ing.name, (map.get(ing.name) ?? 0) + 1),
        );
      }),
    );
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [plan]);

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <section className="rounded-2xl border border-line bg-surface px-7 py-8">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
          <span className="h-px w-6 bg-brand/50" />
          주간 식단
        </div>
        <h1 className="mt-3 flex items-center gap-2 text-3xl font-extrabold tracking-tight text-ink">
          한 주 식단표
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/55">
          요일·끼니별 레시피를 골라두면 자동 저장돼요. 현재 {filledCount}칸 채움.
        </p>
      </section>

      <div className="flex justify-end gap-2">
        <button
          onClick={autoFill}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-brand-dark active:scale-95"
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          자동 채우기
        </button>
        <button
          onClick={clearAll}
          className="rounded-lg border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink/55 transition hover:border-ink/25 hover:text-ink"
        >
          전체 비우기
        </button>
      </div>

      <p className="-mb-2 text-center text-[11px] text-ink/40 sm:hidden">
        좌우로 밀어 끼니를 채워보세요 →
      </p>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface p-2 [scrollbar-width:thin]">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-12 p-2"></th>
              {MEAL_SLOTS.map((slot) => (
                <th
                  key={slot}
                  className="p-2 text-center text-xs font-bold text-ink/55"
                >
                  {slot}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((day) => (
              <tr key={day}>
                <th className="p-2 text-center">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg thumb-bg bg-[#f3f0ec] text-sm font-bold text-ink/70">
                    {day}
                  </span>
                </th>
                {MEAL_SLOTS.map((slot) => {
                  const selected = plan[day]?.[slot] ?? "";
                  const recipe = selected ? getRecipe(selected) : undefined;
                  const st = recipe ? STAGE_STYLE[recipe.stage] : undefined;
                  return (
                    <td key={slot} className="p-1.5 align-top">
                      <div
                        className={`flex flex-col items-center gap-1 rounded-xl border p-1.5 transition ${
                          recipe ? "border-line bg-cream" : "border-dashed border-line"
                        }`}
                      >
                        {recipe && (
                          <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-surface">
                            <RecipeThumb
                              id={recipe.id}
                              category={recipe.category}
                              iconClassName="h-4 w-4 text-ink/30"
                            />
                          </span>
                        )}
                        <select
                          value={selected}
                          onChange={(e) => setSlot(day, slot, e.target.value)}
                          aria-label={`${day}요일 ${slot} 레시피 선택`}
                          className={`w-full rounded-md bg-transparent px-1 py-1 text-center text-xs font-semibold outline-none ${
                            recipe ? st?.text : "text-ink/40"
                          }`}
                        >
                          <option value="">＋ 추가</option>
                          {RECIPES.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                        {recipe && (
                          <Link
                            href={`/recipes/${recipe.id}`}
                            className="block px-1 text-[10px] font-semibold text-ink/40 hover:text-ink/70"
                          >
                            상세 →
                          </Link>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 장보기 리스트 */}
      {shopping.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-1 flex items-center gap-1.5 text-base font-bold text-ink">
            <ShoppingBasket className="h-4 w-4 text-ink/40" strokeWidth={1.75} aria-hidden="true" />
            장보기 리스트
            <span className="text-sm font-semibold text-ink/40">재료 {shopping.length}종</span>
          </h2>
          <p className="mb-3 text-xs text-ink/45">
            탭하면 체크돼요. 숫자는 등장하는 레시피 수입니다.
          </p>
          <ul className="flex flex-wrap gap-2">
            {shopping.map(([name, count]) => {
              const isChecked = checked.has(name);
              return (
                <li key={name}>
                  <button
                    onClick={() => toggleChecked(name)}
                    aria-pressed={isChecked}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      isChecked
                        ? "border-line bg-cream text-ink/35 line-through"
                        : "border-line bg-cream text-ink/75 hover:border-ink/25"
                    }`}
                  >
                    {name}
                    {count > 1 && (
                      <span className="rounded-full bg-brand-soft px-1.5 text-xs font-bold text-brand-dark">
                        ×{count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
