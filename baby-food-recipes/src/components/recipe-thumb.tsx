"use client";

import { useState } from "react";

/**
 * 레시피 썸네일.
 * public/recipes/{id}.png 가 있으면 사진을, 없으면(404) 카테고리 이모지를 보여준다.
 * → 사용자가 이미지 파일만 떨구면 자동으로 사진으로 바뀐다(코드 수정 불필요).
 */
export function RecipeThumb({
  id,
  emoji,
  emojiClassName = "text-5xl drop-shadow-sm",
  imgClassName = "absolute inset-0 h-full w-full object-cover",
}: {
  id: string;
  emoji: string;
  emojiClassName?: string;
  imgClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
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
