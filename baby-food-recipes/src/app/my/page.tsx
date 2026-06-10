"use client";

import { useState } from "react";
import { Plus, Trash2, ChefHat, Clock, X } from "lucide-react";
import { STAGES, CATEGORIES, type Stage, type Category } from "@/lib/types";
import { STAGE_STYLE } from "@/lib/theme";
import { useCustomRecipes } from "@/lib/use-custom-recipes";

export default function MyRecipesPage() {
  const { recipes, add, remove } = useCustomRecipes();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [stage, setStage] = useState<Stage>("초기");
  const [category, setCategory] = useState<Category>("죽/미음");
  const [time, setTime] = useState("15");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");

  function reset() {
    setName("");
    setStage("초기");
    setCategory("죽/미음");
    setTime("15");
    setIngredients("");
    setSteps("");
  }

  function submit() {
    if (!name.trim()) {
      alert("레시피 이름을 입력해주세요.");
      return;
    }
    add({
      name: name.trim(),
      stage,
      category,
      timeMinutes: Number(time) || 0,
      ingredients: ingredients.trim(),
      steps: steps.trim(),
    });
    reset();
    setOpen(false);
  }

  const inputCls =
    "w-full rounded-lg border border-line bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-brand";

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-line bg-surface px-7 py-8">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
          <span className="h-px w-6 bg-brand/50" />
          내 레시피
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">
          우리집 레시피
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/55">
          우리 아이가 잘 먹은 나만의 레시피를 직접 등록해두세요. (이 기기에 저장됩니다)
        </p>
      </section>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark active:scale-95"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          레시피 추가
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-ink">새 레시피</h2>
            <button
              onClick={() => {
                reset();
                setOpen(false);
              }}
              aria-label="닫기"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-ink/40 hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="레시피 이름 (예: 단호박 치즈 매시)"
            className={inputCls}
          />
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-xs font-semibold text-ink/45">단계</span>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as Stage)}
                className={inputCls}
              >
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-xs font-semibold text-ink/45">종류</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className={inputCls}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="w-24">
              <span className="mb-1 block text-xs font-semibold text-ink/45">시간(분)</span>
              <input
                type="number"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>
          <label>
            <span className="mb-1 block text-xs font-semibold text-ink/45">
              재료 (한 줄에 하나)
            </span>
            <textarea
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              rows={3}
              placeholder={"단호박 30g\n아기치즈 1/2장"}
              className={inputCls}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-ink/45">
              만드는 법 (한 줄에 하나)
            </span>
            <textarea
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              rows={4}
              placeholder={"단호박을 쪄서 으깬다\n치즈를 섞어 데운다"}
              className={inputCls}
            />
          </label>
          <button
            onClick={submit}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark active:scale-[0.98]"
          >
            저장
          </button>
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line py-14 text-center">
          <ChefHat className="mx-auto h-8 w-8 text-ink/20" strokeWidth={1.5} aria-hidden="true" />
          <p className="mt-3 text-sm text-ink/50">아직 등록한 레시피가 없어요.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {recipes.map((r) => {
            const st = STAGE_STYLE[r.stage];
            return (
              <li
                key={r.id}
                className="rounded-2xl border border-line bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink/45">
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} aria-hidden="true" />
                      {r.stage}
                      <span className="text-ink/25">·</span>
                      {r.category}
                      <span className="text-ink/25">·</span>
                      <Clock className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
                      {r.timeMinutes}분
                    </div>
                    <h3 className="mt-1 text-base font-bold text-ink">{r.name}</h3>
                  </div>
                  <button
                    onClick={() => remove(r.id)}
                    aria-label="삭제"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink/30 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </div>
                {r.ingredients && (
                  <div className="mt-3">
                    <div className="text-xs font-bold text-ink/45">재료</div>
                    <ul className="mt-1 flex flex-wrap gap-1.5">
                      {r.ingredients.split("\n").filter(Boolean).map((ing, i) => (
                        <li
                          key={i}
                          className="rounded-full border border-line bg-cream px-2.5 py-0.5 text-xs text-ink/70"
                        >
                          {ing}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {r.steps && (
                  <div className="mt-3">
                    <div className="text-xs font-bold text-ink/45">만드는 법</div>
                    <ol className="mt-1 flex flex-col gap-1.5">
                      {r.steps.split("\n").filter(Boolean).map((step, i) => (
                        <li key={i} className="flex gap-2 text-sm text-ink/80">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
