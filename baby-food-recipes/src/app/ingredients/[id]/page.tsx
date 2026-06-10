import Link from "next/link";
import { notFound } from "next/navigation";
import { FOODS, getFood, recipesForFood } from "@/lib/foods";
import { SAFETY_NOTE } from "@/lib/types";
import { STAGE_STYLE, CATEGORY_EMOJI } from "@/lib/theme";
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
        className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-ink/50 transition hover:text-ink"
      >
        ← 재료 목록
      </Link>

      {/* 헤더 */}
      <header className="flex items-center gap-4 rounded-3xl border border-black/5 bg-white p-5 card-soft">
        <span
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-cream text-4xl"
        >
          {food.emoji}
        </span>
        <div>
          <h1 className="text-2xl font-extrabold text-ink">{food.name}</h1>
          <p className="mt-0.5 text-sm text-ink/65">{food.summary}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand-dark">
              만 {food.startMonth}개월~
            </span>
            {food.allergens.length > 0 ? (
              food.allergens.map((a) => (
                <span
                  key={a}
                  className="rounded-full border border-rose-100 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-500"
                >
                  ⚠ {a}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
                알레르기 표시대상 아님
              </span>
            )}
          </div>
        </div>
      </header>

      {/* 자르는 법 */}
      <section>
        <h2 className="mb-2 text-base font-extrabold text-ink">
          ✂️ 연령별 자르는 법·제공 형태
        </h2>
        <p className="rounded-2xl border border-black/5 bg-white p-4 text-sm leading-relaxed text-ink/75">
          {food.form}
        </p>
      </section>

      {/* 도입 팁 */}
      <section>
        <h2 className="mb-2 text-base font-extrabold text-ink">💡 도입 팁</h2>
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800/80">
          {food.note}
        </p>
      </section>

      {/* 안전 안내 */}
      <p className="flex gap-2 rounded-2xl border border-black/5 bg-cream p-4 text-xs leading-relaxed text-ink/55">
        <span aria-hidden="true">⚠️</span>
        <span>{SAFETY_NOTE}</span>
      </p>

      {/* 연관 레시피 */}
      {related.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-extrabold text-ink">
            🍽️ {food.name}로 만드는 레시피 ({related.length})
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {related.map((r) => {
              const st = STAGE_STYLE[r.stage];
              return (
                <li key={r.id}>
                  <Link
                    href={`/recipes/${r.id}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-black/5 bg-white card-soft transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div
                      className={`relative flex h-16 items-center justify-center ${st.soft}`}
                    >
                      <RecipeThumb
                        id={r.id}
                        emoji={CATEGORY_EMOJI[r.category] ?? "🍽️"}
                        emojiClassName="text-2xl"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-2.5">
                      <h3 className="line-clamp-2 text-xs font-bold leading-snug text-ink transition group-hover:text-brand-dark">
                        {r.name}
                      </h3>
                      <span className="mt-auto text-[10px] font-semibold text-ink/45">
                        {r.stage} · ⏱ {r.timeMinutes}분
                      </span>
                    </div>
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
