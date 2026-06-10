import { Info } from "lucide-react";
import { STAGES, SAFETY_NOTE, type Stage } from "@/lib/types";
import { STAGE_STYLE } from "@/lib/theme";

/**
 * 단계 가이드 헤더 — 단계의 월령·농도·횟수와 공통 안전 수칙(새 재료 3일 규칙).
 */
export function StageGuide({ stage }: { stage: Stage }) {
  const meta = STAGES.find((s) => s.key === stage);
  if (!meta) return null;
  const st = STAGE_STYLE[stage];

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${st.dot}`} aria-hidden="true" />
        <span className="font-bold text-ink">{meta.label}</span>
        <span className="text-sm font-medium text-ink/45">{meta.months}</span>
      </div>
      <p className="mt-1.5 text-sm text-ink/70">{meta.guide}</p>
      <p className="mt-2.5 flex gap-2 border-t border-line pt-2.5 text-xs leading-relaxed text-ink/55">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink/35" aria-hidden="true" />
        <span>{SAFETY_NOTE}</span>
      </p>
    </div>
  );
}
