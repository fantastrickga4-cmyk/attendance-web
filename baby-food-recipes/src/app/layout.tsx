import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "아이반찬 — 단계별 이유식·유아식 레시피",
  description:
    "오늘 뭐 먹일까? 초기부터 유아식까지 단계별 맞춤 레시피와 주간 식단. 알레르기 필터까지.",
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
      </head>
      <body className="min-h-full flex flex-col bg-cream">
        <header className="sticky top-0 z-20 border-b border-black/5 bg-cream/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand text-lg shadow-sm">
                🍼
              </span>
              <span className="text-lg font-extrabold tracking-tight text-ink">
                아이반찬
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm font-semibold">
              <Link
                href="/"
                className="rounded-full px-3 py-1.5 text-ink/70 transition hover:bg-black/5 hover:text-ink"
              >
                레시피
              </Link>
              <Link
                href="/plan"
                className="rounded-full px-3 py-1.5 text-ink/70 transition hover:bg-black/5 hover:text-ink"
              >
                주간식단
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-6">{children}</main>
        <footer className="mt-8 border-t border-black/5 py-6 text-center text-xs text-ink/50">
          단계·개월수는 일반 가이드입니다. 새 재료 도입은 소아과 상담을 우선하세요.
          <div className="mt-1 font-semibold text-ink/40">© 아이반찬</div>
        </footer>
      </body>
    </html>
  );
}
