import { STAGES, SAFETY_NOTE, type Stage } from "@/lib/types";
import { STAGE_STYLE } from "@/lib/theme";

/**
 * 단계 가이드 헤더 — 특정 단계를 선택했을 때 그 단계의 월령·농도·횟수와
 * 공통 안전 수칙(새 재료 3일 규칙)을 보여준다. 베베쿡/엘빈즈식 단계 안내.
 */
export function StageGuide({ stage }: { stage: Stage }) {
  const meta = STAGES.find((s) => s.key === stage);
  if (!meta) return null;
  const st = STAGE_STYLE[stage];

  return (
    <div className={`rounded-2xl border border-black/5 ${st.soft} p-4`}>
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="text-lg">
          {meta.emoji}
        </span>
        <span className="font-extrabold text-ink">
          {meta.label}
          <span className="ml-1.5 text-sm font-semibold text-ink/55">
            {meta.months}
          </span>
        </span>
      </div>
      <p className="mt-1.5 text-sm font-medium text-ink/75">{meta.guide}</p>
      <p className="mt-2 flex gap-1.5 rounded-xl bg-white/70 p-2.5 text-xs leading-relaxed text-ink/60">
        <span aria-hidden="true">⚠️</span>
        <span>{SAFETY_NOTE}</span>
      </p>
    </div>
  );
}
