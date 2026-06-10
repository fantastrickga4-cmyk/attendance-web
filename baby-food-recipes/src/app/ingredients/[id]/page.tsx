import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Scissors, Lightbulb, Info, Clock } from "lucide-react";
import { FOODS, getFood, recipesForFood } from "@/lib/foods";
import { SAFETY_NOTE } from "@/lib/types";
import { RecipeThumb } from "@/components/recipe-thumb";

export function generateStaticParams() {
  return FOODS.map((f) => ({ id: f.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const food = getFood(id);
  if (!food) return { title: "재료를 찾을 수 없어요" };
  return {
    title: `${food.name} — 시작 월령·자르는 법 | 아이반찬`,
    description: food.summary,
  };
}

export default async function FoodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const food = getFood(id);
  if (!food) notFound();

  const related = recipesForFood(food);

  return (
    <article className="flex flex-col gap-6">
      <Link
        href="/ingredients"
        className="inline-flex w-fit items-center gap-0.5 text-sm font-semibold text-ink/50 transition hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        재료 목록
      </Link>

      {/* 헤더 */}
      <header className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5">
        <span
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl thumb-bg bg-[#f3f0ec] text-2xl font-extrabold text-ink/40"
        >
          {food.name[0]}
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">{food.name}</h1>
          <p className="mt-0.5 text-sm text-ink/60">{food.summary}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand-dark">
              만 {food.startMonth}개월~
            </span>
            {food.allergens.length > 0 ? (
              food.allergens.map((a) => (
                <span
                  key={a}
                  className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-500"
                >
                  {a}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-[#cfe0ca] bg-[#eef2ed] px-2.5 py-0.5 text-xs font-bold text-[#4f6b4a]">
                알레르기 표시대상 아님
              </span>
            )}
          </div>
        </div>
      </header>

      {/* 자르는 법 */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-base font-bold text-ink">
          <Scissors className="h-4 w-4 text-ink/40" strokeWidth={1.75} aria-hidden="true" />
          연령별 자르는 법·제공 형태
        </h2>
        <p className="rounded-2xl border border-line bg-surface p-4 text-sm leading-relaxed text-ink/75">
          {food.form}
        </p>
      </section>

      {/* 도입 팁 */}
      <section className="flex gap-2.5 rounded-2xl border border-line bg-brand-soft/50 p-4">
        <Lightbulb
          className="mt-0.5 h-4 w-4 shrink-0 text-brand"
          strokeWidth={2}
          aria-hidden="true"
        />
        <div>
          <h2 className="text-sm font-bold text-brand-dark">도입 팁</h2>
          <p className="mt-0.5 text-sm leading-relaxed text-ink/70">{food.note}</p>
        </div>
      </section>

      {/* 안전 안내 */}
      <p className="flex gap-2.5 rounded-2xl border border-line bg-cream p-4 text-xs leading-relaxed text-ink/55">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink/35" strokeWidth={1.75} aria-hidden="true" />
        <span>{SAFETY_NOTE}</span>
      </p>

      {/* 연관 레시피 */}
      {related.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold text-ink">
            {food.name}로 만드는 레시피 <span className="text-ink/40">{related.length}</span>
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {related.map((r) => {
              return (
                <li key={r.id}>
                  <Link
                    href={`/recipes/${r.id}`}
                    className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition hover:border-ink/20"
                  >
                    <span className="relative flex aspect-[4/3] items-center justify-center overflow-hidden thumb-bg bg-[#f3f0ec]">
                      <RecipeThumb
                        id={r.id}
                        category={r.category}
                        iconClassName="h-6 w-6 text-ink/20"
                        imgClassName="absolute inset-0 h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.04]"
                      />
                    </span>
                    <span className="flex flex-1 flex-col gap-1 p-2.5">
                      <span className="line-clamp-2 text-xs font-bold leading-snug text-ink transition group-hover:text-brand-dark">
                        {r.name}
                      </span>
                      <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-medium text-ink/45">
                        <Clock className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
                        {r.stage} · {r.timeMinutes}분
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </article>
  );
}
