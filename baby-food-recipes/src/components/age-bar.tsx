"use client";

import { Baby, X } from "lucide-react";
import { STAGES, stageForMonth } from "@/lib/types";
import { STAGE_STYLE } from "@/lib/theme";

/**
 * 월령 선택 바 — 아이 개월 수를 고르면 localStorage에 저장되고(부모 page에서),
 * 그 월령에 맞는 단계를 안내한다. 가입 없는 1탭 개인화.
 */
export function AgeBar({
  months,
  onChange,
}: {
  months: number | null;
  onChange: (m: number | null) => void;
}) {
  const options = Array.from({ length: 57 }, (_, i) => i + 4);

  if (months == null) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 text-sm">
          <Baby className="h-5 w-5 text-brand" strokeWidth={1.75} aria-hidden="true" />
          <span className="font-semibold text-ink/80">
            우리 아이 개월 수를 알려주시면 맞는 레시피를 추천해요
          </span>
        </div>
        <label className="flex items-center gap-2">
          <span className="sr-only">아이 개월 수 선택</span>
          <select
            defaultValue=""
            onChange={(e) =>
              onChange(e.target.value ? Number(e.target.value) : null)
            }
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brand"
          >
            <option value="" disabled>
              개월 수 선택
            </option>
            {options.map((m) => (
              <option key={m} value={m}>
                만 {m}개월{m >= 24 ? ` (${Math.floor(m / 12)}세)` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  const stage = stageForMonth(months);
  const st = STAGE_STYLE[stage];

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-4">
      <Baby className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} aria-hidden="true" />
      <div className="flex-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-ink/40">
          우리 아이
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-sm font-bold text-ink">
          만 {months}개월
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/55">
            <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} aria-hidden="true" />
            {stage}
          </span>
        </div>
      </div>
      <label className="flex items-center gap-1.5">
        <span className="sr-only">아이 개월 수 변경</span>
        <select
          value={months}
          onChange={(e) => onChange(Number(e.target.value))}
          className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink/70 outline-none focus:border-brand"
        >
          {options.map((m) => (
            <option key={m} value={m}>
              만 {m}개월
            </option>
          ))}
        </select>
      </label>
      <button
        onClick={() => onChange(null)}
        aria-label="월령 해제"
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink/40 transition hover:text-ink"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
