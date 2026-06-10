import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { Baby, ShieldCheck } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "아이반찬 — 단계별 이유식·유아식 레시피",
  description:
    "오늘 뭐 먹일까? 초기부터 유아식까지 단계별 맞춤 레시피와 주간 식단. 알레르기 필터까지.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "아이반찬" },
  icons: { icon: "/icon-512.png", apple: "/icon-512.png" },
};

export const viewport: Viewport = {
  themeColor: "#c2603f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} h-full`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ibanchan-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-cream">
        <header className="sticky top-0 z-20 border-b border-line bg-cream/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
                <Baby className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="text-lg font-extrabold tracking-tight text-ink">
                아이반찬
              </span>
            </Link>
            <div className="flex items-center gap-2">
              {/* 데스크탑 nav — 모바일은 하단 탭바 사용 */}
              <nav className="hidden items-center gap-1 text-sm font-semibold sm:flex">
                <Link
                  href="/"
                  className="rounded-full px-3 py-1.5 text-ink/70 transition hover:bg-black/5 hover:text-ink"
                >
                  레시피
                </Link>
                <Link
                  href="/ingredients"
                  className="rounded-full px-3 py-1.5 text-ink/70 transition hover:bg-black/5 hover:text-ink"
                >
                  재료
                </Link>
                <Link
                  href="/plan"
                  className="rounded-full px-3 py-1.5 text-ink/70 transition hover:bg-black/5 hover:text-ink"
                >
                  주간식단
                </Link>
                <Link
                  href="/log"
                  className="rounded-full px-3 py-1.5 text-ink/70 transition hover:bg-black/5 hover:text-ink"
                >
                  기록
                </Link>
                <Link
                  href="/my"
                  className="rounded-full px-3 py-1.5 text-ink/70 transition hover:bg-black/5 hover:text-ink"
                >
                  내 레시피
                </Link>
              </nav>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-6">{children}</main>
        <footer className="mt-8 border-t border-line pb-28 pt-7 text-center text-xs text-ink/50 sm:pb-7">
          <div className="mx-auto flex max-w-md flex-col items-center gap-2 px-5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 font-semibold text-ink/60">
              <ShieldCheck className="h-3.5 w-3.5 text-ink/45" strokeWidth={1.75} aria-hidden="true" />
              식약처 · 대한소아과학회 일반 권고 참고
            </span>
            <p className="leading-relaxed text-ink/45">
              단계·개월수·자르는 법 등은 참고용 일반 정보입니다. 새 재료 도입·알레르기 반응은
              아이마다 다르므로 <strong className="text-ink/55">소아과 상담을 우선</strong>하세요.
            </p>
            <div className="font-semibold text-ink/40">© 아이반찬</div>
          </div>
        </footer>
        <BottomNav />
      </body>
    </html>
  );
}
