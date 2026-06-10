import type { Stage } from "./types";

/**
 * 단계별 컬러 시스템.
 * 카드·배지·세그먼트·상세 헤더에서 동일한 색을 써서 "분류 시스템" 느낌을 준다.
 * Tailwind가 스캔할 수 있도록 클래스명은 항상 리터럴 문자열로 둔다.
 */
export type StageStyle = {
  /** 연한 배경 (썸네일/배지 바탕) */
  soft: string;
  /** 텍스트 색 */
  text: string;
  /** 진한 배경 (활성 알약/상단 액센트 바) */
  solid: string;
  /** 활성 링 */
  ring: string;
  /** 작은 점 */
  dot: string;
  /** 그라데이션 (상세 히어로) */
  grad: string;
};

export const STAGE_STYLE: Record<Stage, StageStyle> = {
  초기: {
    soft: "bg-emerald-100",
    text: "text-emerald-700",
    solid: "bg-emerald-500",
    ring: "ring-emerald-300",
    dot: "bg-emerald-500",
    grad: "from-emerald-100 to-emerald-50",
  },
  중기: {
    soft: "bg-sky-100",
    text: "text-sky-700",
    solid: "bg-sky-500",
    ring: "ring-sky-300",
    dot: "bg-sky-500",
    grad: "from-sky-100 to-sky-50",
  },
  후기: {
    soft: "bg-violet-100",
    text: "text-violet-700",
    solid: "bg-violet-500",
    ring: "ring-violet-300",
    dot: "bg-violet-500",
    grad: "from-violet-100 to-violet-50",
  },
  완료기: {
    soft: "bg-pink-100",
    text: "text-pink-700",
    solid: "bg-pink-500",
    ring: "ring-pink-300",
    dot: "bg-pink-500",
    grad: "from-pink-100 to-pink-50",
  },
  유아식: {
    soft: "bg-amber-100",
    text: "text-amber-700",
    solid: "bg-amber-500",
    ring: "ring-amber-300",
    dot: "bg-amber-500",
    grad: "from-amber-100 to-amber-50",
  },
};

/** 카테고리별 대표 이모지 (사진 대신 썸네일 역할) */
export const CATEGORY_EMOJI: Record<string, string> = {
  "죽/미음": "🥣",
  "밥/진밥": "🍚",
  "국/찌개": "🍲",
  반찬: "🥢",
  간식: "🍪",
  핑거푸드: "🤏",
};
