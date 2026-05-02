# 직원 출퇴근 관리 (웹 버전)

브라우저에서 동작하는 직원 출퇴근 관리 시스템이에요. **Neon Postgres + Vercel Functions** 기반.

## ✨ 기능

### 직원
- 🔐 회원가입 / 로그인 (서버측 bcrypt + HttpOnly 쿠키 세션)
- 🟢 출근 찍기 / 🔴 퇴근 찍기 (하루 한 번)
- 📋 내 출퇴근 기록 보기 (근무 시간 자동 계산)

### 관리자
- 👥 **직원 관리** — 직원 목록 조회/검색, 권한 변경(직원↔관리자), 삭제 (기록도 함께 삭제)
- 📋 **전체 기록** — 모든 직원의 출퇴근 기록 조회, 직원/날짜 범위 필터
- ✏️ **기록 수정/추가** — 누락되거나 잘못 찍힌 기록을 수동으로 보정
- 📊 **통계** — 전체 직원 수, 오늘 출근/퇴근 인원, 이번 달 직원별 근무시간 집계

## 🔑 기본 관리자 계정
첫 배포 시 자동으로 생성됩니다.

| 항목 | 값 |
|---|---|
| 아이디 | `admin` |
| 비밀번호 | `admin1234` |

> ⚠️ 마지막 관리자 계정은 삭제하거나 강등할 수 없어요.
> ⚠️ 자기 자신은 직원 관리에서 삭제할 수 없어요.
> ⚠️ 운영 환경에서는 admin 비밀번호를 바로 바꾸세요.

## 🚀 배포 방법 (처음 한 번)

### 1. Neon Postgres 프로비저닝
1. https://vercel.com/dashboard 접속 → `attendance-web` 프로젝트 → **Storage** 탭
2. **Create Database** → **Marketplace** → **Neon (Serverless Postgres)** 선택
3. 프로젝트에 연결 (`Production`, `Preview`, `Development` 모두 체크)
4. 자동으로 `DATABASE_URL` 환경변수가 추가됨

### 2. SESSION_SECRET 추가
프로젝트 → **Settings** → **Environment Variables**:
- 이름: `SESSION_SECRET`
- 값: 32자 이상 랜덤 문자열 (예: `openssl rand -hex 32`)
- 환경: Production + Preview + Development 모두 체크

### 3. 로컬 개발 환경 동기화
```bash
vercel link        # 프로젝트 연결 (한 번만)
vercel env pull    # .env.local 받아오기
```

### 4. (선택) 스키마 미리 적용
첫 API 호출 시 자동으로 테이블이 생성되지만, 미리 만들고 싶으면 Neon SQL 에디터에서 `schema.sql` 실행.

### 5. 배포
GitHub `main` 브랜치에 푸시하면 자동 배포되거나, 직접:
```bash
vercel deploy --prod
```

## 📁 파일 구성
- `index.html`, `style.css` — 화면
- `app.js` — 프론트엔드 동작 (fetch 기반)
- `api/` — Vercel Functions
  - `api/auth/[action].js` — login, signup, logout, me, checkin, checkout
  - `api/users/index.js` — 직원 목록 (관리자)
  - `api/users/[id].js` — 직원 권한 변경/삭제 (관리자)
  - `api/records/index.js` — 기록 조회/추가/수정/삭제
  - `api/stats.js` — 통계 (관리자)
- `lib/db.js` — Neon 연결 + 스키마 자동 부트스트랩
- `lib/auth.js` — bcrypt 해싱, JWT 쿠키, 권한 가드
- `schema.sql` — 수동 마이그레이션용

## 🔐 보안 메모
- 비밀번호는 bcrypt(cost 10)로 해싱
- 세션은 HS256 서명 JWT를 HttpOnly + Secure + SameSite=Lax 쿠키로 발급
- 모든 변경 API는 서버측에서 권한 확인 (직원 vs 관리자)

## 🛠️ 로컬에서 실행
```bash
npm install
vercel dev    # http://localhost:3000
```
`.env.local`에 `DATABASE_URL`과 `SESSION_SECRET`이 있어야 해요.
