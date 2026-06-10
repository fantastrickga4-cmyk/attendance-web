import type { Stage, Category } from "./types";
import {
  CookingPot,
  Utensils,
  Soup,
  UtensilsCrossed,
  Cookie,
  Hand,
  type LucideIcon,
} from "lucide-react";

/**
 * 단계별 컬러 — 모던 미니멀: 채도를 낮춘 뮤트 어스톤.
 * 큰 색면 대신 배지·점·라벨에 절제해서 쓴다.
 * Tailwind가 스캔하도록 클래스명은 항상 리터럴 문자열.
 */
export type StageStyle = {
  soft: string;
  text: string;
  solid: string;
  ring: string;
  dot: string;
  grad: string;
};

export const STAGE_STYLE: Record<Stage, StageStyle> = {
  초기: {
    soft: "bg-[#eef2ed]",
    text: "text-[#4f6b4a]",
    solid: "bg-[#6f8f6a]",
    ring: "ring-[#c5d4c2]",
    dot: "bg-[#6f8f6a]",
    grad: "from-[#eef2ed] to-[#f8faf7]",
  },
  중기: {
    soft: "bg-[#eceff3]",
    text: "text-[#4d6178]",
    solid: "bg-[#6f87a0]",
    ring: "ring-[#c3cfdb]",
    dot: "bg-[#6f87a0]",
    grad: "from-[#eceff3] to-[#f7f9fb]",
  },
  후기: {
    soft: "bg-[#f3ebe4]",
    text: "text-[#875738]",
    solid: "bg-[#b07a55]",
    ring: "ring-[#e0cdbd]",
    dot: "bg-[#b07a55]",
    grad: "from-[#f3ebe4] to-[#fbf7f3]",
  },
  완료기: {
    soft: "bg-[#f1ebee]",
    text: "text-[#74556a]",
    solid: "bg-[#9b7689]",
    ring: "ring-[#d9c8d2]",
    dot: "bg-[#9b7689]",
    grad: "from-[#f1ebee] to-[#faf6f8]",
  },
  "유아 1세": {
    soft: "bg-[#f4eede]",
    text: "text-[#8a6c33]",
    solid: "bg-[#b8924f]",
    ring: "ring-[#e2d4b3]",
    dot: "bg-[#b8924f]",
    grad: "from-[#f4eede] to-[#fbf8f0]",
  },
  "유아 2~3세": {
    soft: "bg-[#eef0e4]",
    text: "text-[#656a3a]",
    solid: "bg-[#8a8f58]",
    ring: "ring-[#d0d3b8]",
    dot: "bg-[#8a8f58]",
    grad: "from-[#eef0e4] to-[#f8f9f2]",
  },
  "유아 4~5세": {
    soft: "bg-[#e9f1ef]",
    text: "text-[#426862]",
    solid: "bg-[#5f8f86]",
    ring: "ring-[#bcd6d0]",
    dot: "bg-[#5f8f86]",
    grad: "from-[#e9f1ef] to-[#f6faf9]",
  },
};

/** 카테고리별 라인 아이콘 (이모지 대체) */
export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  "죽/미음": CookingPot,
  "밥/진밥": Utensils,
  "국/찌개": Soup,
  반찬: UtensilsCrossed,
  간식: Cookie,
  핑거푸드: Hand,
};

/** 카테고리별 대표 이모지 (구버전 폴백 — 점진적으로 아이콘으로 대체 중) */
export const CATEGORY_EMOJI: Record<string, string> = {
  "죽/미음": "🥣",
  "밥/진밥": "🍚",
  "국/찌개": "🍲",
  반찬: "🥢",
  간식: "🍪",
  핑거푸드: "🤏",
};
