"use client";

import { useState } from "react";
import { CalendarPlus, Trash2 } from "lucide-react";
import { useAllergy, type Reaction } from "@/lib/use-allergy";

const REACTIONS: { key: Reaction; cls: string; activeCls: string }[] = [
  { key: "없음", cls: "text-[#4f6b4a]", activeCls: "border-[#6f8f6a] bg-[#eef2ed] text-[#4f6b4a]" },
  { key: "의심", cls: "text-[#8a6c33]", activeCls: "border-[#b8924f] bg-[#f4eede] text-[#8a6c33]" },
  { key: "있음", cls: "text-rose-600", activeCls: "border-rose-300 bg-rose-50 text-rose-600" },
];

function fmt(d: string) {
  const [, m, day] = d.split("-");
  return `${Number(m)}월 ${Number(day)}일`;
}

/** 재료 상세의 알레르기 도입·반응 기록 */
export function AllergyRecorder({
  foodId,
  foodName,
}: {
  foodId: string;
  foodName: string;
}) {
  const { log, add, remove } = useAllergy();
  const [reaction, setReaction] = useState<Reaction>("없음");
  const mine = log.filter((e) => e.foodId === foodId);

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="text-base font-bold text-ink">도입·반응 기록</h2>
      <p className="mt-0.5 text-xs text-ink/50">
        {foodName}을(를) 먹인 날과 반응을 기록해 3일 관찰에 활용하세요.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold text-ink/45">반응</span>
        {REACTIONS.map((r) => (
          <button
            key={r.key}
            onClick={() => setReaction(r.key)}
            aria-pressed={reaction === r.key}
            className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
              reaction === r.key
                ? r.activeCls
                : "border-line bg-surface text-ink/55 hover:border-ink/25"
            }`}
          >
            {r.key}
          </button>
        ))}
        <button
          onClick={() => add(foodId, foodName, reaction)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-dark active:scale-95"
        >
          <CalendarPlus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          오늘 기록
        </button>
      </div>

      {mine.length > 0 && (
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {mine.map((e, i) => {
            const rc = REACTIONS.find((r) => r.key === e.reaction);
            return (
              <li key={i} className="flex items-center gap-2 py-2 text-sm">
                <span className="text-ink/55">{fmt(e.date)}</span>
                <span className={`font-bold ${rc?.cls}`}>{e.reaction}</span>
                <button
                  onClick={() => remove(e)}
                  aria-label="기록 삭제"
                  className="ml-auto flex h-6 w-6 items-center justify-center rounded text-ink/30 hover:text-rose-500"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
