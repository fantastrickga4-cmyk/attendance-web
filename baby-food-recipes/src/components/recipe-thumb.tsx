"use client";

import { useState } from "react";
import { CATEGORY_ICON } from "@/lib/theme";
import type { Category } from "@/lib/types";

/**
 * 레시피 썸네일.
 * public/recipes/{id}.png 가 있으면 사진을, 없으면 카테고리 라인 아이콘(없으면 이모지)을 보여준다.
 * 서버 컴포넌트에서도 쓰므로 아이콘 컴포넌트 대신 category(문자열)를 받아 내부에서 매핑한다.
 */
export function RecipeThumb({
  id,
  category,
  emoji = "",
  iconClassName = "h-8 w-8 text-ink/25",
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
  const [failed, setFailed] = useState(false);

  if (failed) {
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
