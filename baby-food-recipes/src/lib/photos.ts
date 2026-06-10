/**
 * 사진(public/recipes/{id}.png)이 있는 레시피 id 목록.
 * 여기 없는 레시피는 썸네일에서 이미지 로드를 시도하지 않고 바로 라인 아이콘을 보여준다.
 * (사진을 새로 추가하면 이 목록에 id를 더한다)
 */
export const PHOTO_IDS = new Set<string>([
  "banana-pancake",
  "beef-fried-rice",
  "beef-seaweed-soup",
  "beef-veggie-porridge",
  "chicken-veg-rice",
  "chicken-veggie-porridge",
  "egg-tofu-steam",
  "fish-radish-soup",
  "mild-curry-rice",
  "mild-doenjang-soup",
  "potato-puree",
  "pumpkin-puree",
  "rice-puree",
  "soft-rice-egg",
  "soy-beef-bites",
  "tofu-steak",
  "tofu-veggie-porridge",
  "veggie-jeon",
]);
