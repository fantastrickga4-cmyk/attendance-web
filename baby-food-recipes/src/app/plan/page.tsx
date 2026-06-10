"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ShoppingBasket } from "lucide-react";
import { RECIPES, getRecipe } from "@/lib/recipes";
import { WEEKDAYS, MEAL_SLOTS, type WeeklyPlan, type Weekday } from "@/lib/types";
import { STAGE_STYLE } from "@/lib/theme";
import { RecipeThumb } from "@/components/recipe-thumb";

const STORAGE_KEY = "baby-food-weekly-plan";

function emptyPlan(): WeeklyPlan {
  return WEEKDAYS.reduce((acc, d) => {
    acc[d] = {};
    return acc;
  }, {} as WeeklyPlan);
}

export default function PlanPage() {
  const [plan, setPlan] = useState<WeeklyPlan>(emptyPlan);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPlan({ ...emptyPlan(), ...JSON.parse(raw) });
    } catch {
      /* 무시 */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  }, [plan, loaded]);

  function setSlot(day: Weekday, slot: string, recipeId: string) {
    setPlan((prev) => ({
      ...prev,
      [day]: { ...prev[day], [slot]: recipeId || undefined },
    }));
  }

  function clearAll() {
    if (confirm("전체 식단을 비울까요?")) setPlan(emptyPlan());
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

      <div className="flex justify-end">
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
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#f3f0ec] text-sm font-bold text-ink/70">
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
            이번 주 식단에 들어가는 재료예요. 숫자는 등장하는 레시피 수입니다.
          </p>
          <ul className="flex flex-wrap gap-2">
            {shopping.map(([name, count]) => (
              <li
                key={name}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-3 py-1.5 text-sm font-medium text-ink/75"
              >
                {name}
                {count > 1 && (
                  <span className="rounded-full bg-brand-soft px-1.5 text-xs font-bold text-brand-dark">
                    ×{count}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
