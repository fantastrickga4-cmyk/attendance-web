import type { Allergen } from "./types";
import { RECIPES } from "./recipes";

/**
 * 음식(재료) 미니 DB.
 * 시작 월령·자르는 법은 일반적인 이유식 가이드(보수적 기준)이며, 알레르겐은 식약처 표시 대상 기준.
 * 실제 도입은 아이 상태·소아과 상담을 우선한다. (Solid Starts·식약처 일반 권고 참고)
 */
export interface FoodInfo {
  id: string;
  name: string;
  emoji: string;
  /** 일반적으로 시작 가능한 월령(개월) — 보수적 기준 */
  startMonth: number;
  /** 포함/연관 알레르겐 */
  allergens: Allergen[];
  /** 한 줄 소개 */
  summary: string;
  /** 연령별 제공 형태/자르는 법 */
  form: string;
  /** 도입 팁·주의 */
  note: string;
  /** 레시피 매칭용 키워드(재료명 부분일치) */
  keywords: string[];
}

export const FOODS: FoodInfo[] = [
  { id: "rice", name: "쌀", emoji: "🍚", startMonth: 4, allergens: [], summary: "이유식의 첫 시작, 가장 무난한 곡물.", form: "초기엔 곱게 갈아 미음 → 중기 죽 → 후기 진밥 → 완료기 밥으로 농도를 높여요.", note: "알레르기 위험이 낮아 첫 이유식 재료로 적합해요.", keywords: ["쌀", "밥", "미음", "진밥"] },
  { id: "potato", name: "감자", emoji: "🥔", startMonth: 5, allergens: [], summary: "포만감 좋고 부드러운 뿌리채소.", form: "푹 삶아 으깨기 → 후기엔 작게 깍둑.", note: "단독으로 먼저 테스트한 뒤 다른 재료와 섞어요.", keywords: ["감자"] },
  { id: "pumpkin", name: "단호박", emoji: "🎃", startMonth: 5, allergens: [], summary: "자연 단맛으로 아기가 잘 먹는 채소.", form: "쪄서 곱게 으깨기 → 후기엔 작은 조각.", note: "단맛이 강하니 다른 채소와 번갈아 주세요.", keywords: ["단호박", "호박"] },
  { id: "carrot", name: "당근", emoji: "🥕", startMonth: 6, allergens: [], summary: "베타카로틴이 풍부한 주황 채소.", form: "푹 익혀 으깨기 → 잘게 다지기. 생당근은 질식 위험.", note: "생으로는 돌 이후에도 곱게 갈거나 익혀 주세요.", keywords: ["당근"] },
  { id: "zucchini", name: "애호박", emoji: "🥒", startMonth: 6, allergens: [], summary: "부드럽게 익는 순한 채소.", form: "껍질 벗겨 익힌 뒤 다지기 → 작은 조각.", note: "수분이 많아 죽·전에 두루 쓰기 좋아요.", keywords: ["애호박", "호박"] },
  { id: "broccoli", name: "브로콜리", emoji: "🥦", startMonth: 7, allergens: [], summary: "비타민이 풍부한 초록 채소.", form: "꽃 부분을 데쳐 잘게 → 후기엔 작은 송이.", note: "줄기보다 부드러운 꽃 부분부터 시작해요.", keywords: ["브로콜리"] },
  { id: "spinach", name: "시금치", emoji: "🥬", startMonth: 7, allergens: [], summary: "철분·엽산이 많은 잎채소.", form: "잎만 데쳐 곱게 다지기.", note: "질산염이 있어 너무 이른 시기·과량은 피하고 잎 위주로.", keywords: ["시금치"] },
  { id: "onion", name: "양파", emoji: "🧅", startMonth: 6, allergens: [], summary: "익히면 단맛이 나는 향채소.", form: "충분히 익혀 곱게 다지기.", note: "익히면 매운맛이 사라져 감칠맛을 더해요.", keywords: ["양파"] },
  { id: "beef", name: "소고기", emoji: "🥩", startMonth: 6, allergens: ["쇠고기"], summary: "중기 철분 보충의 대표 재료.", form: "기름기 적은 부위를 곱게 다져 → 후기엔 잘게.", note: "생후 6개월경 철분 필요가 커져 일찍 도입해요. 간 없이.", keywords: ["소고기", "쇠고기", "한우"] },
  { id: "chicken", name: "닭고기", emoji: "🍗", startMonth: 7, allergens: ["닭고기"], summary: "담백한 흰살 단백질.", form: "안심을 삶아 잘게 찢거나 다지기.", note: "기름·껍질을 빼고 안심·가슴살 위주로.", keywords: ["닭", "닭고기", "닭안심"] },
  { id: "tofu", name: "두부", emoji: "🧈", startMonth: 7, allergens: ["대두"], summary: "부드러운 식물성 단백질.", form: "데쳐서 으깨기 → 후기엔 작은 깍둑.", note: "콩(대두) 알레르기를 3일 간격으로 확인해요.", keywords: ["두부"] },
  { id: "egg", name: "달걀", emoji: "🥚", startMonth: 7, allergens: ["계란"], summary: "완전식품에 가까운 단백질.", form: "완전히 익혀 노른자부터 → 흰자는 돌 전후 소량씩.", note: "반숙은 피하고 완숙으로. 알레르기 관찰을 충분히.", keywords: ["달걀", "계란", "노른자"] },
  { id: "whitefish", name: "흰살생선", emoji: "🐟", startMonth: 7, allergens: ["생선"], summary: "대구 등 담백한 흰살 생선.", form: "가시를 완전히 제거하고 익혀 잘게.", note: "가시 제거를 꼼꼼히, 완전히 익혀서 주세요.", keywords: ["대구", "생선", "흰살"] },
  { id: "seaweed", name: "미역", emoji: "🌿", startMonth: 7, allergens: [], summary: "칼슘·철분이 풍부한 해조류.", form: "충분히 불려 잘게 잘라 푹 끓이기.", note: "염분을 충분히 헹구고, 국은 연하게 끓여요.", keywords: ["미역"] },
  { id: "banana", name: "바나나", emoji: "🍌", startMonth: 6, allergens: [], summary: "달콤하고 부드러운 첫 생과일.", form: "으깨기 → 후기엔 작게 잘라 손가락 음식으로.", note: "익은 것으로, 설탕 없이 단맛 간식에 좋아요.", keywords: ["바나나"] },
  { id: "cheese", name: "치즈", emoji: "🧀", startMonth: 12, allergens: ["우유"], summary: "칼슘이 풍부한 유제품.", form: "아기용 저염 치즈를 잘게 또는 녹여서.", note: "나트륨이 있어 돌 이후 아기 전용 저염 제품으로.", keywords: ["치즈"] },
];

/** id로 음식 찾기 */
export function getFood(id: string): FoodInfo | undefined {
  return FOODS.find((f) => f.id === id);
}

/** 해당 음식을 사용하는 레시피들 */
export function recipesForFood(food: FoodInfo) {
  return RECIPES.filter(
    (r) =>
      r.ingredients.some((ing) =>
        food.keywords.some((k) => ing.name.includes(k)),
      ) || food.keywords.some((k) => r.name.includes(k)),
  );
}
