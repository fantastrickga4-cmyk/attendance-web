"use client";

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
  // 4~60개월 옵션 (이유식 시작 ~ 만 5세)
  const options = Array.from({ length: 57 }, (_, i) => i + 4);

  if (months == null) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-brand/30 bg-brand-soft/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span aria-hidden="true" className="text-lg">👶</span>
          <span className="font-bold text-ink/80">
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
            className="rounded-full border border-brand/30 bg-white px-3 py-1.5 text-sm font-semibold text-brand-dark outline-none focus:ring-4 focus:ring-brand/15"
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
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/5 bg-white p-4 card-soft">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${st.soft} text-xl`}
        aria-hidden="true"
      >
        👶
      </span>
      <div className="flex-1">
        <div className="text-xs font-semibold text-ink/45">우리 아이</div>
        <div className="text-sm font-extrabold text-ink">
          만 {months}개월
          <span className={`ml-2 rounded-full ${st.solid} px-2 py-0.5 text-xs text-white`}>
            {stage}
          </span>
        </div>
      </div>
      <label className="flex items-center gap-1.5">
        <span className="sr-only">아이 개월 수 변경</span>
        <select
          value={months}
          onChange={(e) => onChange(Number(e.target.value))}
          className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-semibold text-ink/70 outline-none focus:ring-4 focus:ring-brand/15"
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
        className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-semibold text-ink/50 transition hover:text-ink"
      >
        해제
      </button>
    </div>
  );
}
