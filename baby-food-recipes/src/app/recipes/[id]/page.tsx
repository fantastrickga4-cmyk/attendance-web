import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Clock,
  Users,
  Baby,
  AlertTriangle,
  ShoppingBasket,
  ChefHat,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import { RECIPES, getRecipe } from "@/lib/recipes";
import { STAGES } from "@/lib/types";
import { STAGE_STYLE } from "@/lib/theme";
import { RecipeThumb } from "@/components/recipe-thumb";
import { RecipeActions } from "@/components/recipe-actions";
import { CookTimer } from "@/components/cook-timer";

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

  const related = RECIPES.filter(
    (r) => r.stage === recipe.stage && r.id !== recipe.id,
  ).slice(0, 4);

  return (
    <article className="flex flex-col gap-6">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-0.5 text-sm font-semibold text-ink/50 transition hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        목록으로
      </Link>

      {/* 사진 배너 */}
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-line thumb-bg bg-[#f3f0ec]">
        <RecipeThumb
          id={recipe.id}
          category={recipe.category}
          iconClassName="h-14 w-14 text-ink/20"
        />
      </div>

      {/* 정보 헤더 */}
      <header>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink/50">
          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
          {recipe.stage}
          <span className="text-ink/25">·</span>
          {stageMeta?.months}
          <span className="text-ink/25">·</span>
          {recipe.category}
        </div>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-ink">
          {recipe.name}
        </h1>
        <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink/60">
          {recipe.summary}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat icon={Clock} label="조리시간" value={`${recipe.timeMinutes}분`} />
          <Stat icon={Users} label="분량" value={recipe.servings} />
          <Stat
            icon={Baby}
            label="권장 개월"
            value={`${recipe.ageMonths[0]}~${recipe.ageMonths[1]}개월`}
          />
        </div>
      </header>

      <RecipeActions id={recipe.id} />

      {recipe.allergens.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-rose-500"
            strokeWidth={2}
            aria-hidden="true"
          />
          <div>
            <strong>알레르기 유발 재료: {recipe.allergens.join(", ")}</strong>
            <p className="mt-0.5 text-rose-600/80">
              처음 도입하는 재료는 소량부터, 3일 간격으로 반응을 확인하세요.
            </p>
          </div>
        </div>
      )}

      <section>
        <SectionTitle icon={ShoppingBasket}>재료</SectionTitle>
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {recipe.ingredients.map((ing) => (
            <li key={ing.name} className="flex justify-between px-4 py-3 text-sm">
              <span className="font-medium text-ink">{ing.name}</span>
              <span className="text-ink/55">{ing.amount}</span>
            </li>
          ))}
        </ul>
      </section>

      <CookTimer minutes={recipe.timeMinutes} />

      <section>
        <SectionTitle icon={ChefHat}>만드는 법</SectionTitle>
        <ol className="flex flex-col gap-2.5">
          {recipe.steps.map((step, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-2xl border border-line bg-surface p-4"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
                {i + 1}
              </span>
              <p className="pt-0.5 text-sm leading-relaxed text-ink/80">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {recipe.tips && (
        <section className="flex gap-2.5 rounded-2xl border border-line bg-brand-soft/50 p-4">
          <Lightbulb
            className="mt-0.5 h-4 w-4 shrink-0 text-brand"
            strokeWidth={2}
            aria-hidden="true"
          />
          <div>
            <h2 className="text-sm font-bold text-brand-dark">팁</h2>
            <p className="mt-0.5 text-sm leading-relaxed text-ink/70">{recipe.tips}</p>
          </div>
        </section>
      )}

      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recipe.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink/55"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {related.length > 0 && (
        <section className="mt-1 border-t border-line pt-6">
          <h2 className="mb-3 text-base font-bold text-ink">같은 단계 레시피</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                        {r.timeMinutes}분
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

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
      <Icon className="h-4 w-4 text-ink/35" strokeWidth={1.75} aria-hidden="true" />
      <div className="mt-1.5 text-[11px] font-medium text-ink/45">{label}</div>
      <div className="text-sm font-bold text-ink">{value}</div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <h2 className="mb-2.5 flex items-center gap-1.5 text-base font-bold text-ink">
      <Icon className="h-4 w-4 text-ink/40" strokeWidth={1.75} aria-hidden="true" />
      {children}
    </h2>
  );
}
