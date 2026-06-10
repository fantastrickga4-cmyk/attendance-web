"use client";

import { Baby, Plus, X } from "lucide-react";
import { STAGES, stageForMonth } from "@/lib/types";
import { STAGE_STYLE } from "@/lib/theme";
import type { Profile } from "@/lib/use-profiles";

const MONTH_OPTIONS = Array.from({ length: 57 }, (_, i) => i + 4);

export function ProfileBar({
  profiles,
  active,
  addProfile,
  removeProfile,
  setActive,
  setMonths,
}: {
  profiles: Profile[];
  active: Profile | null;
  addProfile: (name: string, months: number) => void;
  removeProfile: (id: string) => void;
  setActive: (id: string) => void;
  setMonths: (id: string, months: number) => void;
}) {
  function handleAdd() {
    const name = prompt("아이 이름(별칭)을 입력해주세요");
    if (!name?.trim()) return;
    addProfile(name.trim(), 6);
  }

  if (profiles.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 text-sm">
          <Baby className="h-5 w-5 text-brand" strokeWidth={1.75} aria-hidden="true" />
          <span className="font-semibold text-ink/80">
            아이를 추가하면 월령에 맞는 레시피를 추천해요
          </span>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-bold text-white transition hover:bg-brand-dark active:scale-95"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          아이 추가
        </button>
      </div>
    );
  }

  const stage = active ? stageForMonth(active.months) : null;
  const st = stage ? STAGE_STYLE[stage] : null;
  const idx = stage ? STAGES.findIndex((s) => s.key === stage) : -1;
  const meta = idx >= 0 ? STAGES[idx] : null;
  const next = idx >= 0 ? STAGES[idx + 1] : null;
  const soon = next && meta && active && active.months >= meta.range[1];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      {/* 프로필 선택 */}
      <div className="flex flex-wrap items-center gap-2">
        {profiles.map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p.id)}
            aria-pressed={active?.id === p.id}
            className={`rounded-full border px-3 py-1 text-sm font-bold transition ${
              active?.id === p.id
                ? "border-brand bg-brand text-white"
                : "border-line bg-surface text-ink/60 hover:border-ink/25"
            }`}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={handleAdd}
          aria-label="아이 추가"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink/45 transition hover:text-ink"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>

      {/* 활성 프로필 상세 */}
      {active && (
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
          <Baby className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} aria-hidden="true" />
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-bold text-ink">
              {active.name}
              {st && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/55">
                  <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} aria-hidden="true" />
                  {stage}
                </span>
              )}
            </div>
            {soon && next && (
              <div className="mt-0.5 text-[11px] font-semibold text-brand">
                곧 {next.label} 단계예요 — 새 레시피를 둘러보세요
              </div>
            )}
          </div>
          <label className="flex items-center gap-1.5">
            <span className="sr-only">{active.name} 개월 수</span>
            <select
              value={active.months}
              onChange={(e) => setMonths(active.id, Number(e.target.value))}
              className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink/70 outline-none focus:border-brand"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  만 {m}개월
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => {
              if (confirm(`'${active.name}' 프로필을 삭제할까요?`)) removeProfile(active.id);
            }}
            aria-label="프로필 삭제"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink/40 transition hover:text-rose-500"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
