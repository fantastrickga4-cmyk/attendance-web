"use client";

import { useState } from "react";
import type { Ingredient } from "@/lib/types";

/** 재료 양의 첫 숫자에 배율을 곱한다 (분수·"약간" 등은 원본 유지) */
function scale(amount: string, mul: number): string {
  if (mul === 1) return amount;
  if (amount.includes("/")) return amount; // 분수는 환산 생략
  let replaced = false;
  const out = amount.replace(/(\d+\.?\d*)/, (m) => {
    replaced = true;
    const n = parseFloat(m) * mul;
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  });
  return replaced ? out : amount;
}

const MULTS = [1, 2, 3];

/** 재료 + 인분 배율 계산기 */
export function ServingsCalc({ ingredients }: { ingredients: Ingredient[] }) {
  const [mul, setMul] = useState(1);

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold text-ink/45">분량</span>
        {MULTS.map((m) => (
          <button
            key={m}
            onClick={() => setMul(m)}
            aria-pressed={mul === m}
            className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
              mul === m
                ? "border-brand bg-brand text-white"
                : "border-line bg-surface text-ink/55 hover:border-ink/25"
            }`}
          >
            ×{m}
          </button>
        ))}
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {ingredients.map((ing) => (
          <li key={ing.name} className="flex justify-between px-4 py-3 text-sm">
            <span className="font-medium text-ink">{ing.name}</span>
            <span className={mul === 1 ? "text-ink/55" : "font-semibold text-brand-dark"}>
              {scale(ing.amount, mul)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
