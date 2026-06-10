"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ClipboardList, Trash2, ChevronRight } from "lucide-react";
import { useEaten, type EatenEntry } from "@/lib/use-eaten";
import { getRecipe } from "@/lib/recipes";
import { STAGE_STYLE } from "@/lib/theme";

function fmtDate(d: string): string {
  const [, m, day] = d.split("-");
  return `${Number(m)}월 ${Number(day)}일`;
}

export default function LogPage() {
  const { log, remove } = useEaten();

  const groups = useMemo(() => {
    const m = new Map<string, EatenEntry[]>();
    log.forEach((e) => {
      if (!m.has(e.date)) m.set(e.date, []);
      m.get(e.date)!.push(e);
    });
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [log]);

  const days = groups.length;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-line bg-surface px-7 py-8">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
          <span className="h-px w-6 bg-brand/50" />
          먹은 기록
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">
          우리 아이 식사 일지
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/55">
          {log.length > 0
            ? `총 ${log.length}번 · ${days}일 기록됐어요.`
            : "레시피 상세에서 '오늘 먹였어요'를 누르면 여기 쌓여요."}
        </p>
      </section>

      {log.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line py-14 text-center">
          <ClipboardList
            className="mx-auto h-8 w-8 text-ink/20"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <p className="mt-3 text-sm text-ink/50">아직 기록이 없어요.</p>
          <Link
            href="/"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand transition hover:underline"
          >
            레시피 둘러보기
            <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(([date, entries]) => (
            <section key={date}>
              <h2 className="mb-2 text-sm font-bold text-ink/70">{fmtDate(date)}</h2>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {entries.map((e) => {
                  const r = getRecipe(e.id);
                  const st = r ? STAGE_STYLE[r.stage] : undefined;
                  return (
                    <li
                      key={`${e.id}-${e.date}`}
                      className="flex items-center gap-2 px-4 py-3"
                    >
                      {st && (
                        <span
                          aria-hidden="true"
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${st.dot}`}
                        />
                      )}
                      <Link
                        href={`/recipes/${e.id}`}
                        className="flex-1 text-sm font-semibold text-ink transition hover:text-brand-dark"
                      >
                        {r?.name ?? e.id}
                      </Link>
                      <button
                        onClick={() => remove(e.id, e.date)}
                        aria-label="기록 삭제"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink/30 transition hover:text-rose-500"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
