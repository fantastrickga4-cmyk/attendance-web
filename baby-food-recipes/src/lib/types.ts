// 이유식·유아반찬 도메인 타입

/** 이유식/유아식 단계 */
export type Stage = "초기" | "중기" | "후기" | "완료기" | "유아식";

/** 단계별 권장 개월수 메타 */
export const STAGES: { key: Stage; label: string; months: string; range: [number, number]; emoji: string }[] = [
  { key: "초기", label: "초기", months: "만 4~6개월", range: [4, 6], emoji: "🍼" },
  { key: "중기", label: "중기", months: "만 7~9개월", range: [7, 9], emoji: "🥣" },
  { key: "후기", label: "후기", months: "만 10~12개월", range: [10, 12], emoji: "🍚" },
  { key: "완료기", label: "완료기", months: "만 12~15개월", range: [12, 15], emoji: "🍽️" },
  { key: "유아식", label: "유아식", months: "만 15개월+", range: [15, 48], emoji: "🧒" },
];

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
