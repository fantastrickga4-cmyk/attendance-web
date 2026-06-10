"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UtensilsCrossed,
  Carrot,
  CalendarDays,
  ClipboardList,
  ChefHat,
  type LucideIcon,
} from "lucide-react";

type Item = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (p: string) => boolean;
};

const ITEMS: Item[] = [
  {
    href: "/",
    label: "레시피",
    icon: UtensilsCrossed,
    match: (p) => p === "/" || p.startsWith("/recipes"),
  },
  {
    href: "/ingredients",
    label: "재료",
    icon: Carrot,
    match: (p) => p.startsWith("/ingredients"),
  },
  {
    href: "/plan",
    label: "식단",
    icon: CalendarDays,
    match: (p) => p.startsWith("/plan"),
  },
  {
    href: "/log",
    label: "기록",
    icon: ClipboardList,
    match: (p) => p.startsWith("/log"),
  },
  {
    href: "/my",
    label: "마이",
    icon: ChefHat,
    match: (p) => p.startsWith("/my"),
  },
];

/** 모바일 전용 하단 탭바 (sm 이상에서는 숨김, 상단 nav 사용) */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="하단 메뉴"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream/90 backdrop-blur-md sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex w-full max-w-md">
        {ITEMS.map((it) => {
          const active = it.match(pathname);
          const Icon = it.icon;
          return (
            <li key={it.href} className="min-w-0 flex-1">
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition active:scale-95 ${
                  active ? "text-brand" : "text-ink/45"
                }`}
              >
                <Icon
                  className="h-[22px] w-[22px]"
                  strokeWidth={active ? 2.2 : 1.75}
                  aria-hidden="true"
                />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
