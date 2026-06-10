import Link from "next/link";
import type { Metadata } from "next";
import { ShoppingBasket, Map as MapIcon } from "lucide-react";
import { FOODS } from "@/lib/foods";

export const metadata: Metadata = {
  title: "재료 백과 — 식재료 도입 시기·자르는 법 | 아이반찬",
  description:
    "이유식 재료별 시작 월령, 알레르기 여부, 연령별 자르는 법과 도입 순서를 한눈에.",
};

/** 도입 타임라인 구간 (뮤트 어스톤) */
const PHASES = [
  { label: "이유식 시작", months: "만 4~6개월", test: (m: number) => m <= 6, dot: "bg-[#6f8f6a]" },
  { label: "단백질·다양한 채소", months: "만 7개월~", test: (m: number) => m >= 7 && m < 12, dot: "bg-[#b07a55]" },
  { label: "돌 이후", months: "만 12개월~", test: (m: number) => m >= 12, dot: "bg-[#b8924f]" },
];

export default function IngredientsPage() {
  const sorted = [...FOODS].sort((a, b) => a.startMonth - b.startMonth);

  return (
    <div className="flex flex-col gap-8">
      {/* 헤더 */}
      <section className="rounded-2xl border border-line bg-surface px-7 py-9">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
          <span className="h-px w-6 bg-brand/50" />
          재료 백과
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          무엇을 언제, 어떻게
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-ink/55">
          재료별 시작 월령과 자르는 법, 알레르기 여부를 확인하고 어떤 순서로
          도입하면 좋을지 살펴보세요.
        </p>
      </section>

      {/* 도입 타임라인 */}
      <section>
        <h2 className="mb-3 flex items-center gap-1.5 text-base font-bold text-ink">
          <MapIcon className="h-4 w-4 text-ink/40" strokeWidth={1.75} aria-hidden="true" />
          식재료 도입 순서
        </h2>
        <ol className="flex flex-col gap-2.5">
          {PHASES.map((p) => {
            const foods = sorted.filter((f) => p.test(f.startMonth));
            if (foods.length === 0) return null;
            return (
              <li key={p.label} className="rounded-2xl border border-line bg-surface p-4">
                <div className="mb-2.5 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${p.dot}`} aria-hidden="true" />
                  <span className="font-bold text-ink">{p.label}</span>
                  <span className="text-xs font-semibold text-ink/45">{p.months}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {foods.map((f) => (
                    <Link
                      key={f.id}
                      href={`/ingredients/${f.id}`}
                      className="rounded-full border border-line bg-cream px-2.5 py-1 text-sm font-semibold text-ink/70 transition hover:border-brand/40 hover:text-brand-dark"
                    >
                      {f.name}
                    </Link>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-xs text-ink/40">
          ※ 도입 시기는 일반적 기준이며 아이마다 달라요. 새 재료는 3일 간격으로 관찰하세요.
        </p>
      </section>

      {/* 재료 그리드 */}
      <section>
        <h2 className="mb-3 flex items-center gap-1.5 text-base font-bold text-ink">
          <ShoppingBasket className="h-4 w-4 text-ink/40" strokeWidth={1.75} aria-hidden="true" />
          전체 재료 <span className="text-ink/40">{FOODS.length}</span>
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sorted.map((f) => (
            <li key={f.id}>
              <Link
                href={`/ingredients/${f.id}`}
                className="group flex h-full items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition hover:border-ink/20"
              >
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl thumb-bg bg-[#f3f0ec] text-base font-extrabold text-ink/40"
                >
                  {f.name[0]}
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-ink transition group-hover:text-brand-dark">
                    {f.name}
                  </div>
                  <div className="text-xs font-medium text-ink/50">
                    만 {f.startMonth}개월~
                    {f.allergens.length > 0 && (
                      <span className="ml-1 text-rose-500">· {f.allergens.join("·")}</span>
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
