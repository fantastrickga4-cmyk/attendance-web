"use client";

import { useState } from "react";
import { CATEGORY_ICON } from "@/lib/theme";
import { PHOTO_IDS } from "@/lib/photos";
import type { Category } from "@/lib/types";

/**
 * 레시피 썸네일.
 * 사진이 있는 레시피(PHOTO_IDS)만 public/recipes/{id}.png 를 보여주고,
 * 사진이 없으면 처음부터 카테고리 라인 아이콘을 보여준다(깨진 이미지 방지).
 */
export function RecipeThumb({
  id,
  category,
  emoji = "",
  iconClassName = "h-8 w-8 text-ink/30",
  emojiClassName = "text-5xl drop-shadow-sm",
  imgClassName = "absolute inset-0 h-full w-full object-cover",
}: {
  id: string;
  category?: Category;
  emoji?: string;
  iconClassName?: string;
  emojiClassName?: string;
  imgClassName?: string;
}) {
  const hasPhoto = PHOTO_IDS.has(id);
  const [failed, setFailed] = useState(false);

  if (!hasPhoto || failed) {
    if (category) {
      const Icon = CATEGORY_ICON[category];
      return <Icon className={iconClassName} strokeWidth={1.5} aria-hidden="true" />;
    }
    return (
      <span aria-hidden="true" className={emojiClassName}>
        {emoji}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/recipes/${id}.png`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={imgClassName}
    />
  );
}
