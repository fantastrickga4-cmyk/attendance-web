import Link from "next/link";
import type { Metadata } from "next";
import { FOODS } from "@/lib/foods";

export const metadata: Metadata = {
  title: "재료 백과 — 식재료 도입 시기·자르는 법 | 아이반찬",
  description:
    "이유식 재료별 시작 월령, 알레르기 여부, 연령별 자르는 법과 도입 순서를 한눈에.",
};

/** 도입 타임라인 구간 */
const PHASES = [
  { label: "이유식 시작", months: "만 4~6개월", emoji: "🍼", test: (m: number) => m <= 6, soft: "bg-emerald-100", solid: "bg-emerald-500" },
  { label: "단백질·다양한 채소", months: "만 7개월~", emoji: "🥣", test: (m: number) => m >= 7 && m < 12, soft: "bg-sky-100", solid: "bg-sky-500" },
  { label: "돌 이후", months: "만 12개월~", emoji: "🧒", test: (m: number) => m >= 12, soft: "bg-amber-100", solid: "bg-amber-500" },
];

export default function IngredientsPage() {
  const sorted = [...FOODS].sort((a, b) => a.startMonth - b.startMonth);

  return (
    <div className="flex flex-col gap-7">
      {/* 헤더 */}
      <section className="rounded-3xl bg-gradient-to-br from-brand to-brand-dark px-6 py-7 text-white card-soft">
        <h1 className="text-2xl font-extrabold sm:text-3xl">🧺 재료 백과</h1>
        <p className="mt-2 max-w-md text-sm text-white/85">
          재료별 시작 월령과 자르는 법, 알레르기 여부를 확인하고 어떤 순서로
          도입하면 좋을지 살펴보세요.
        </p>
      </section>

      {/* 도입 타임라인 */}
      <section>
        <h2 className="mb-3 text-base font-extrabold text-ink">
          🗺️ 식재료 도입 순서
        </h2>
        <ol className="flex flex-col gap-3">
          {PHASES.map((p) => {
            const foods = sorted.filter((f) => p.test(f.startMonth));
            if (foods.length === 0) return null;
            return (
              <li
                key={p.label}
                className={`rounded-2xl border border-black/5 ${p.soft} p-4`}
              >
                <div className="mb-2.5 flex items-center gap-2">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${p.solid} text-sm text-white`}
                    aria-hidden="true"
                  >
                    {p.emoji}
                  </span>
                  <span className="font-extrabold text-ink">{p.label}</span>
                  <span className="text-xs font-semibold text-ink/50">
                    {p.months}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {foods.map((f) => (
                    <Link
                      key={f.id}
                      href={`/ingredients/${f.id}`}
                      className="inline-flex items-center gap-1 rounded-full border border-black/8 bg-white px-2.5 py-1 text-sm font-semibold text-ink/70 transition hover:border-brand/40 hover:text-brand-dark"
                    >
                      <span aria-hidden="true">{f.emoji}</span> {f.name}
                    </Link>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-xs text-ink/40">
          ※ 도입 시기는 일반적 기준이며 아이마다 달라요. 새 재료는 3일 간격으로
          관찰하세요.
        </p>
      </section>

      {/* 재료 그리드 */}
      <section>
        <h2 className="mb-3 text-base font-extrabold text-ink">
          전체 재료 ({FOODS.length})
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sorted.map((f) => (
            <li key={f.id}>
              <Link
                href={`/ingredients/${f.id}`}
                className="group flex h-full items-center gap-3 rounded-2xl border border-black/5 bg-white p-3.5 card-soft transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cream text-2xl"
                >
                  {f.emoji}
                </span>
                <div className="min-w-0">
                  <div className="font-extrabold text-ink transition group-hover:text-brand-dark">
                    {f.name}
                  </div>
                  <div className="text-xs font-medium text-ink/50">
                    만 {f.startMonth}개월~
                    {f.allergens.length > 0 && (
                      <span className="ml-1 text-rose-500">
                        · ⚠ {f.allergens.join("·")}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
