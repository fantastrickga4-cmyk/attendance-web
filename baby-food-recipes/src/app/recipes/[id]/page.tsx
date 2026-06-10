import Link from "next/link";
import { notFound } from "next/navigation";
import { RECIPES, getRecipe } from "@/lib/recipes";
import { STAGES } from "@/lib/types";
import { STAGE_STYLE, CATEGORY_EMOJI } from "@/lib/theme";
import { RecipeThumb } from "@/components/recipe-thumb";

export function generateStaticParams() {
  return RECIPES.map((r) => ({ id: r.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = getRecipe(id);
  if (!recipe) return { title: "레시피를 찾을 수 없어요" };
  return { title: `${recipe.name} | 아이반찬`, description: recipe.summary };
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = getRecipe(id);
  if (!recipe) notFound();

  const stageMeta = STAGES.find((s) => s.key === recipe.stage);
  const st = STAGE_STYLE[recipe.stage];

  // 같은 단계의 다른 레시피 (탐색 동선) — 최대 4개
  const related = RECIPES.filter(
    (r) => r.stage === recipe.stage && r.id !== recipe.id,
  ).slice(0, 4);

  return (
    <article className="flex flex-col gap-6">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-ink/50 transition hover:text-ink"
      >
        ← 목록으로
      </Link>

      {/* 사진 배너 (이미지 없으면 카테고리 이모지) */}
      <div
        className={`relative flex aspect-video items-center justify-center overflow-hidden rounded-3xl card-soft ${st.soft}`}
      >
        <RecipeThumb
          id={recipe.id}
          emoji={CATEGORY_EMOJI[recipe.category] ?? "🍽️"}
          emojiClassName="text-7xl drop-shadow-sm"
        />
      </div>

      {/* 컬러 히어로 */}
      <header
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${st.grad} p-6 card-soft`}
      >
        <span
          aria-hidden="true"
          className="absolute -right-3 -top-4 text-8xl opacity-25 select-none"
        >
          {CATEGORY_EMOJI[recipe.category] ?? "🍽️"}
        </span>
        <div className="relative flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full ${st.solid} px-3 py-0.5 text-xs font-bold text-white shadow-sm`}
          >
            {stageMeta?.emoji} {recipe.stage}
          </span>
          <span className="rounded-full bg-white/70 px-3 py-0.5 text-xs font-semibold text-ink/70">
            {recipe.category}
          </span>
        </div>
        <h1 className="relative mt-3 text-2xl font-extrabold text-ink sm:text-3xl">
          {recipe.name}
        </h1>
        <p className="relative mt-1.5 max-w-md text-sm text-ink/70">
          {recipe.summary}
        </p>
        <div className="relative mt-4 flex flex-wrap gap-2">
          <Stat label="조리시간" value={`${recipe.timeMinutes}분`} />
          <Stat label="분량" value={recipe.servings} />
          <Stat
            label="권장 개월"
            value={`만 ${recipe.ageMonths[0]}~${recipe.ageMonths[1]}개월`}
          />
        </div>
      </header>

      {recipe.allergens.length > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <span className="text-base leading-none">⚠️</span>
          <div>
            <strong>알레르기 유발 재료: {recipe.allergens.join(", ")}</strong>
            <p className="mt-0.5 text-rose-600/80">
              처음 도입하는 재료는 소량부터, 3일 간격으로 반응을 확인하세요.
            </p>
          </div>
        </div>
      )}

      <section>
        <h2 className="mb-2.5 text-base font-extrabold text-ink">🧺 재료</h2>
        <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/5 bg-white">
          {recipe.ingredients.map((ing) => (
            <li
              key={ing.name}
              className="flex justify-between px-4 py-3 text-sm"
            >
              <span className="font-medium text-ink">{ing.name}</span>
              <span className="text-ink/55">{ing.amount}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-base font-extrabold text-ink">👩‍🍳 만드는 법</h2>
        <ol className="flex flex-col gap-3">
          {recipe.steps.map((step, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-2xl border border-black/5 bg-white p-3.5"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${st.solid} text-sm font-bold text-white`}
              >
                {i + 1}
              </span>
              <p className="pt-0.5 text-sm leading-relaxed text-ink/80">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {recipe.tips && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-1 text-sm font-extrabold text-amber-800">💡 팁</h2>
          <p className="text-sm leading-relaxed text-amber-800/80">{recipe.tips}</p>
        </section>
      )}

      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {recipe.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-ink/60"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {related.length > 0 && (
        <section className="mt-2 border-t border-black/5 pt-5">
          <h2 className="mb-3 text-base font-extrabold text-ink">
            <span aria-hidden="true">{stageMeta?.emoji} </span>
            같은 단계 레시피
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {related.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/recipes/${r.id}`}
                  className="group flex h-full flex-col gap-2 rounded-2xl border border-black/5 bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span
                    className={`relative flex h-14 items-center justify-center overflow-hidden rounded-xl ${st.soft}`}
                  >
                    <RecipeThumb
                      id={r.id}
                      emoji={CATEGORY_EMOJI[r.category] ?? "🍽️"}
                      emojiClassName="text-3xl"
                    />
                  </span>
                  <span className="line-clamp-2 text-xs font-bold leading-snug text-ink transition group-hover:text-brand-dark">
                    {r.name}
                  </span>
                  <span className="mt-auto text-[11px] font-medium text-ink/45">
                    🕒 {r.timeMinutes}분
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/70 px-3.5 py-2">
      <div className="text-[11px] font-medium text-ink/45">{label}</div>
      <div className="text-sm font-bold text-ink">{value}</div>
    </div>
  );
}
