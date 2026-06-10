"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, ShoppingBasket, Bookmark, X, Share2 } from "lucide-react";
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

/** canvas에 레시피명을 최대 2줄로 그린다 */
function drawName(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxw: number,
) {
  if (ctx.measureText(text).width <= maxw) {
    ctx.fillText(text, x, y);
    return;
  }
  const chars = [...text];
  let line = "";
  const lines: string[] = [];
  for (const c of chars) {
    if (ctx.measureText(line + c).width > maxw && line) {
      lines.push(line);
      line = c;
    } else line += c;
  }
  if (line) lines.push(line);
  const top = lines.slice(0, 2);
  if (lines.length > 2) top[1] = top[1].slice(0, -1) + "…";
  top.forEach((l, i) => ctx.fillText(l, x, y - 6 + i * 14));
}

const CHECKED_KEY = "ibanchan-shopping-checked";
const TEMPLATE_KEY = "ibanchan-plan-templates";

type Template = { name: string; plan: WeeklyPlan };

export default function PlanPage() {
  const [plan, setPlan] = useState<WeeklyPlan>(emptyPlan);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPlan({ ...emptyPlan(), ...JSON.parse(raw) });
      const c = localStorage.getItem(CHECKED_KEY);
      if (c) setChecked(new Set(JSON.parse(c) as string[]));
      const t = localStorage.getItem(TEMPLATE_KEY);
      if (t) setTemplates(JSON.parse(t) as Template[]);
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

  useEffect(() => {
    if (loaded) localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates));
  }, [templates, loaded]);

  function saveTemplate() {
    const name = prompt("이 식단의 이름을 정해주세요 (예: 6개월 1주차)");
    if (!name) return;
    setTemplates((prev) => [...prev.filter((t) => t.name !== name), { name, plan }]);
  }

  function loadTemplate(t: Template) {
    if (confirm(`'${t.name}' 식단을 불러올까요? 현재 식단을 덮어써요.`))
      setPlan({ ...emptyPlan(), ...t.plan });
  }

  function deleteTemplate(name: string) {
    setTemplates((prev) => prev.filter((t) => t.name !== name));
  }

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

  // 주간 식단을 한 장 이미지로 그려 공유/저장
  async function shareImage() {
    const cols = MEAL_SLOTS.length;
    const lead = 56;
    const cw = 168;
    const ch = 62;
    const head = 84;
    const W = lead + cols * cw + 16;
    const H = head + WEEKDAYS.length * ch + 24;
    const canvas = document.createElement("canvas");
    canvas.width = W * 2;
    canvas.height = H * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(2, 2);
    const F = "Pretendard, sans-serif";

    ctx.fillStyle = "#faf8f5";
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillStyle = "#2b2520";
    ctx.font = `800 22px ${F}`;
    ctx.fillText("우리 아이 주간 식단", 16, 38);
    ctx.fillStyle = "#c2603f";
    ctx.font = `700 12px ${F}`;
    ctx.fillText("아이반찬 · ibanchan", 16, 58);

    ctx.textAlign = "center";
    MEAL_SLOTS.forEach((s, i) => {
      ctx.fillStyle = "#8a7f74";
      ctx.font = `700 13px ${F}`;
      ctx.fillText(s, lead + i * cw + cw / 2, head - 10);
    });

    WEEKDAYS.forEach((d, r) => {
      const y = head + r * ch;
      ctx.fillStyle = "#2b2520";
      ctx.font = `800 14px ${F}`;
      ctx.textAlign = "left";
      ctx.fillText(d, 16, y + ch / 2 + 5);
      ctx.textAlign = "center";
      MEAL_SLOTS.forEach((s, i) => {
        const x = lead + i * cw;
        ctx.strokeStyle = "#e7e2db";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 4, y + 4, cw - 8, ch - 8);
        const id = plan[d]?.[s];
        const rec = id ? getRecipe(id) : null;
        if (rec) {
          ctx.fillStyle = "#2b2520";
          ctx.font = `600 12px ${F}`;
          drawName(ctx, rec.name, x + cw / 2, y + ch / 2 + 4, cw - 18);
        }
      });
    });

    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob((b) => res(b), "image/png"),
    );
    if (!blob) return;
    const file = new File([blob], "ibanchan-weekly-plan.png", { type: "image/png" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "우리 아이 주간 식단" });
        return;
      }
    } catch {
      /* 공유 취소 등 → 다운로드로 폴백 */
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "아이반찬-주간식단.png";
    a.click();
    URL.revokeObjectURL(a.href);
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

      <div className="flex flex-wrap justify-end gap-2">
        <button
          onClick={autoFill}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-brand-dark active:scale-95"
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          자동 채우기
        </button>
        {filledCount > 0 && (
          <button
            onClick={shareImage}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink/65 transition hover:border-ink/25 hover:text-ink"
          >
            <Share2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            이미지
          </button>
        )}
        {filledCount > 0 && (
          <button
            onClick={saveTemplate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink/65 transition hover:border-ink/25 hover:text-ink"
          >
            <Bookmark className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            저장
          </button>
        )}
        <button
          onClick={clearAll}
          className="rounded-lg border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink/55 transition hover:border-ink/25 hover:text-ink"
        >
          전체 비우기
        </button>
      </div>

      {/* 저장된 식단 템플릿 */}
      {templates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-ink/45">저장된 식단</span>
          {templates.map((t) => (
            <span
              key={t.name}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-surface py-1 pl-3 pr-1 text-xs font-semibold text-ink/70"
            >
              <button onClick={() => loadTemplate(t)} className="hover:text-brand-dark">
                {t.name}
              </button>
              <button
                onClick={() => deleteTemplate(t.name)}
                aria-label={`${t.name} 삭제`}
                className="flex h-5 w-5 items-center justify-center rounded-full text-ink/35 hover:text-rose-500"
              >
                <X className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

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
