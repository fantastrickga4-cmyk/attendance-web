// 이유식·유아반찬 도메인 타입

/** 이유식/유아식 단계 */
export type Stage =
  | "초기"
  | "중기"
  | "후기"
  | "완료기"
  | "유아 1세"
  | "유아 2~3세"
  | "유아 4~5세";

/** 단계별 권장 개월수 메타 (guide: 농도·횟수 한 줄 일반 가이드) */
export const STAGES: { key: Stage; label: string; months: string; range: [number, number]; emoji: string; guide: string }[] = [
  { key: "초기", label: "초기", months: "만 4~6개월", range: [4, 6], emoji: "🍼", guide: "묽은 미음~고운 죽 · 하루 1~2회 · 1~2작은술부터 천천히" },
  { key: "중기", label: "중기", months: "만 7~9개월", range: [7, 9], emoji: "🥣", guide: "으깬 죽 · 하루 2회 · 입자를 조금씩 키워요" },
  { key: "후기", label: "후기", months: "만 10~12개월", range: [10, 12], emoji: "🍚", guide: "진밥·무른밥 · 하루 3회 · 잘게 썬 재료" },
  { key: "완료기", label: "완료기", months: "만 12~15개월", range: [12, 15], emoji: "🍽️", guide: "진밥에서 밥으로 · 하루 3회+간식 · 부드러운 가족식" },
  { key: "유아 1세", label: "유아 1세", months: "만 12~24개월", range: [12, 24], emoji: "🧒", guide: "유아식 시작 · 3끼+간식 · 아주 약한 간" },
  { key: "유아 2~3세", label: "유아 2~3세", months: "만 2~3세", range: [24, 48], emoji: "🍱", guide: "다양한 식감 · 자기주도 식사 · 가족식 변형" },
  { key: "유아 4~5세", label: "유아 4~5세", months: "만 4~5세", range: [48, 72], emoji: "🥗", guide: "거의 어른식 · 균형 잡힌 한 끼 · 편식 대응" },
];

/** 개월 수로 해당 단계를 찾는다(범위 매칭, 경계 밖은 최근접). 월령 개인화에 사용 */
export function stageForMonth(m: number): Stage {
  const hit = STAGES.find((s) => m >= s.range[0] && m <= s.range[1]);
  if (hit) return hit.key;
  if (m < STAGES[0].range[0]) return STAGES[0].key;
  return STAGES[STAGES.length - 1].key;
}

/** 새 재료 도입 공통 안전 안내 */
export const SAFETY_NOTE =
  "새로운 재료는 한 가지씩, 3일 간격으로 이상반응(발진·구토·설사)을 살펴요. 도입 시기는 아이 상태에 따라 다르니 소아과 상담을 우선하세요.";

/** 레시피 분류 */
export type Category = "죽/미음" | "밥/진밥" | "국/찌개" | "반찬" | "간식" | "핑거푸드";

export const CATEGORIES: Category[] = ["죽/미음", "밥/진밥", "국/찌개", "반찬", "간식", "핑거푸드"];

/** 식약처 알레르기 유발식품 표시 대상 (유아식 관련 위주) */
export const ALLERGENS = [
  "계란", "우유", "밀", "대두", "땅콩", "견과류", "메밀",
  "고등어", "게", "새우", "오징어", "조개류", "생선",
  "돼지고기", "닭고기", "쇠고기", "복숭아", "토마토",
] as const;

export type Allergen = (typeof ALLERGENS)[number];

/** 알레르겐별 대체 안내 (참고용 일반 가이드). 상세에서 레시피 알레르겐에 맞춰 자동 표시 */
export const ALLERGEN_SUBSTITUTE: Partial<Record<Allergen, string>> = {
  계란: "으깬 두부나 잘 익은 바나나로 부침·반죽의 농도를 대신할 수 있어요.",
  우유: "분유나 두유(콩 알레르기가 없을 때)로 바꾸거나, 치즈를 빼고 만들어요.",
  밀: "밀가루 대신 쌀가루·오트밀가루로 대체해요.",
  대두: "두부 대신 닭안심·흰살생선으로 단백질을 채워요. 간장은 생략하세요.",
  쇠고기: "소고기 대신 닭고기·돼지고기·두부로 대체해요.",
  닭고기: "닭고기 대신 소고기·흰살생선·두부로 대체해요.",
  생선: "생선 대신 소고기·닭고기·두부로 단백질을 채워요.",
  돼지고기: "돼지고기 대신 소고기·닭고기로 대체해요.",
};

export interface Ingredient {
  name: string;
  amount: string;
}

export interface Recipe {
  id: string;
  name: string;
  stage: Stage;
  /** 권장 개월 범위 [최소, 최대] */
  ageMonths: [number, number];
  category: Category;
  /** 한 줄 소개 */
  summary: string;
  ingredients: Ingredient[];
  /** 포함된 알레르기 유발 재료 태그 */
  allergens: Allergen[];
  steps: string[];
  timeMinutes: number;
  servings: string;
  tips?: string;
  tags: string[];
}

/** 주간 식단 한 칸: 요일 x 끼니 -> recipeId */
export type MealSlot = "아침" | "점심" | "저녁" | "간식";
export const MEAL_SLOTS: MealSlot[] = ["아침", "점심", "저녁", "간식"];
export const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** plan[weekday][slot] = recipeId | null */
export type WeeklyPlan = Record<Weekday, Partial<Record<MealSlot, string>>>;
