# FANTASTRICK 직원 출퇴근 관리

브라우저 기반 직원 출퇴근 관리 시스템. **Neon Postgres + Vercel Functions** 기반.

- 프로덕션: https://attendance-web-navy-three.vercel.app
- Vercel 프로젝트: `attendance-web` (team `fantastrickga4-9692s-projects`)
- 로컬 위치: `D:\test\attendance-web\`
- Windows 설치 파일: `D:\test\installer\AttendanceWebSetup.exe`

---

## 🔑 계정 정보

| 항목 | 값 |
|---|---|
| 기본 admin 아이디 | `admin` |
| 현재 admin 비밀번호 | **`1205`** (변경된 상태) |

---

## ✨ 구현된 기능 (지금까지)

### 직원
- 🔐 회원가입 / 로그인 (bcrypt + 7일 JWT 쿠키, stateful 세션)
- 🟢 출근 / 🔴 퇴근 (찍으면 바로 로그아웃됨)
- 📋 내 출퇴근 기록 — **표 / 캘린더 토글** (월별 그리드, 이전/다음/오늘 이동)
- 🏷️ **근무 유형 본인 체크** — 표의 칩(정상/교육/대타) 클릭으로 변경
  - 기본값 `정상` (출근 찍으면 자동), 예외(교육·대타)만 본인이 표시
  - 대타는 누구 대신인지 직원 드롭다운에서 선택
  - **이번 달**은 즉시 반영, **이전 달**은 기존 "수정 신청"으로 안내
- 📝 **기록 수정 신청** — 누락·오기 신청 → 관리자 승인 시 자동 반영
  - 본인 신청 상태 조회 (대기/승인/반려/취소)
  - 대기 중 신청은 본인이 취소 가능
- 🔑 **내 정보** — 본인 비밀번호 변경 (현재 비번 검증 후)
- 📵 **모바일 직원 로그인 차단** — UA 기반 (관리자만 모바일 가능)

### 관리자
- 👥 **직원 관리** — 검색, 권한 토글, 삭제, 비밀번호 초기화(8자 임시 비번 1회 표시)
- 📋 **전체 기록** — 직원/날짜 필터, 추가/수정/삭제, **CSV 다운로드**
  - "근무 유형" 칼럼 표시, 추가/수정 모달에서 정상/교육/대타 + 대타 대상 직접 지정 가능
- 📝 **신청** — 대기 건 빨간 배지, 상태 필터, 승인/반려(사유 입력)
- 📊 **통계** — 오늘 출근/퇴근/이번달 근무시간 카드 + 직원별 + **월별 캘린더**(직원 선택)
  - 직원별 행에 **정상/교육/대타 일수** 분리 표시
  - **이번 달 대타 현황** — 누가 누구의 대타를 며칠 했는지 집계
- 🖥️ **세션** — 활성 세션 목록(IP·디바이스·시간), **강제 로그아웃**, 본인 세션 표시
- 🧾 **이력** — 모든 변경 작업 audit log (시각·작업자·작업·대상·diff)

### 자동화
- 🔔 **푸시 알림** (관리자 대상): 출근/퇴근, 신청 등록, 미퇴근 (자정 KST cron)
- ⏰ **자정 미퇴근 cron**: 출근만 찍고 퇴근 안 한 직원 → 관리자 푸시
- 🔒 **감사 로그**: 모든 mutation이 자동 기록

---

## 🔐 보안

- bcrypt(cost 10) 해싱
- HS256 JWT + jti claim → DB의 `sessions` 테이블 검증 (강제 로그아웃 즉시 효과)
- HttpOnly + Secure + SameSite=Lax 쿠키
- 401 받으면 프론트 자동으로 로그인 화면 + "세션이 종료되었습니다" 메시지
- 직원은 `requireUser`, 관리자는 `requireAdmin` 가드
- Cron은 `Authorization: Bearer ${CRON_SECRET}` 검증
- 모바일 UA에서 직원 로그인은 서버에서 403 반환

---

## 📁 파일 구성

```
attendance-web/
├── index.html              # 단일 페이지 SPA
├── style.css               # 디자인 토큰 + 컴포넌트 스타일
├── app.js                  # 프론트엔드 (fetch + DOM)
├── sw.js                   # 푸시 서비스 워커
├── manifest.json           # PWA 매니페스트
├── package.json            # web-push, jose, bcryptjs, @neondatabase/serverless
├── schema.sql              # 수동 마이그레이션용
├── vercel.json             # cron 정의
├── api/
│   ├── auth/[action].js    # login, signup, logout, me, checkin, checkout
│   ├── users/index.js      # 직원 목록
│   ├── users/[id].js       # 권한/삭제/비번초기화 + id="me"인 경우 본인 비번변경
│   ├── records/index.js    # 기록 조회/추가/수정/삭제 (admin)
│   ├── record-requests/index.js   # 신청 목록·생성
│   ├── record-requests/[id].js    # 승인/반려/취소
│   ├── sessions/index.js   # 활성 세션 목록
│   ├── sessions/[id].js    # 세션 강제 종료
│   ├── stats.js            # 통계
│   ├── audit.js            # 감사 로그
│   ├── push/[action].js    # vapid-key, subscribe, unsubscribe, status
│   └── cron/auto-checkout.js # 자정 미퇴근 알림 cron
└── lib/
    ├── db.js               # Neon 연결 + 스키마 자동 부트스트랩
    ├── auth.js             # bcrypt, JWT, 세션 발급/검증, 권한 가드
    ├── audit.js            # logAction, ACTIONS 상수
    ├── push.js             # web-push 헬퍼 (sendToAdmins)
    └── device.js           # User-Agent 모바일 감지
```

> ⚠️ **Vercel Hobby 플랜은 함수 12개 한도**. 현재 정확히 12개. 새 엔드포인트 추가 시 통합 필요.

---

## 🗄️ DB 스키마 (요약)

| 테이블 | 핵심 컬럼 |
|---|---|
| `users` | id, name, password_hash, role(employee\|admin), created_at |
| `records` | user_id, date, check_in, check_out, round_count, **work_type**(`normal`\|`training`\|`cover`), **cover_for_user_id** (PK: user_id+date) |
| `push_subscriptions` | id, user_id, endpoint, p256dh, auth |
| `audit_log` | id, actor_id, action, target_user_id, target_date, before, after, created_at |
| `record_requests` | id, user_id, target_date, requested_check_in/out, reason, status, reviewer_*, created_at |
| `sessions` | jti(PK), user_id, ip, user_agent, created_at, last_seen_at |

전체 DDL은 `schema.sql`. `lib/db.js`가 첫 호출 시 자동 부트스트랩.

### Audit log 액션 종류
`record.create/update/delete/tag_change`, `user.role_change/delete/password_reset/password_change`, `request.create/approve/reject/cancel`, `session.revoke`

---

## 🔧 환경 변수 (Vercel)

| 이름 | 용도 | 어디서 |
|---|---|---|
| `DATABASE_URL` | Neon Postgres 연결 | Marketplace로 자동 |
| `SESSION_SECRET` | JWT 서명 (32자+) | 수동 |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | 웹 푸시 | 수동 (`npx web-push generate-vapid-keys`) |
| `CRON_SECRET` | cron 인증 | 수동 (랜덤 hex) |

**Production + Development 모두 등록되어 있음.** Preview는 git branch 인자 요구로 미설정.

로컬에서 받아오려면:
```powershell
cd D:\test\attendance-web
vercel env pull
```

---

## 🚀 자주 쓰는 커맨드

```powershell
cd D:\test\attendance-web

# 배포
vercel deploy --prod --yes

# 로그 확인 (500만)
vercel logs --no-follow --no-branch --status-code 500 -n 20 -x

# 환경변수 보기
vercel env ls

# DB 직접 쿼리는 Vercel 대시보드 → Storage → Neon 콘솔
```

로컬 개발은 `vercel dev` 가능하지만 함수 호출당 ~2.5초 오버헤드(콜드스타트)라 사실상 production에서 테스트하는 게 빠름.

---

## 🪟 Windows 설치 파일

- 위치: `D:\test\installer\AttendanceWebSetup.exe` (84KB) + `.zip` (62KB)
- NSIS 기반, URL 바로가기 + 아이콘 + 시작메뉴/바탕화면 단축
- 변경 시: `D:\test\installer\installer.nsi` 수정 → `"C:/Program Files (x86)/NSIS/makensis.exe" installer.nsi`
- 아이콘 재생성: `powershell -ExecutionPolicy Bypass -File D:\test\installer\make-icon.ps1`

---

## 📋 다음에 추가하면 좋을 것 (우선순위)

### 강력 추천
1. **휴가 관리** ⭐⭐⭐ — 연차/병가/반차 신청·승인, 잔여 연차. 신청/승인 인프라 재사용 가능 (3~4시간)
2. **표준 근무시간 + 지각·조퇴 자동 판정** — 회사 설정 + 통계에 ⚠️ 표시 (2시간)
3. **공휴일 관리** — 통계 정확도, 캘린더 가독성

### 작은데 효과 큰 것
4. **다크 모드** — CSS 변수만 분기 (1시간)
5. **본인 알림 (직원도 푸시)** — 신청 승인/반려, 기록 변경 시 본인 푸시
6. **출근 누락 리마인더** — 출근 안 찍은 직원 본인에게 cron 푸시
7. **출/퇴근 메모** — 직원이 "외근/재택" 등 짧은 메모

### 보안·안정성
8. **로그인 실패 잠금** — N회 실패 시 잠금
9. **IP 화이트리스트** — 회사 IP에서만 출근

### 운영 자동화
10. **월간 자동 리포트 푸시** — 매월 1일 cron
11. **개인별 근태 카드 PDF**
12. **통계 그래프 (Chart.js)**

### 고급
13. **GPS 기반 출근 제한** — 회사 좌표 + 반경
14. **부서/팀 관리**
15. **CSV 직원 일괄 등록**

---

## ⚠️ 알아둘 점

- 함수 한도(12) 거의 다 씀 → 새 기능은 기존 [action].js 패턴으로 통합 필요
- preview 환경 envs 없음 → preview 배포는 동작 안 함 (production만 사용 중)
- 첫 호출 후 Neon 콜드스타트 ~600ms, 이후 ~150ms
- Korean 한글 콘솔에서 curl 테스트 시 인코딩 깨짐 — 실제 브라우저는 UTF-8 정상

---

## 📌 작업 메모 (이어서 시작할 때 참고)

- `vercel logs` 명령어가 가장 유용 — 에러 디버깅 시 첫 번째로 볼 곳
- `audit_log` 테이블이 모든 변경 추적 — 디버깅·검증 시 신뢰할 수 있는 출처
- 새 audit action 추가 시 `lib/audit.js` 의 `ACTIONS`와 `app.js`의 `AUDIT_ACTION_LABELS` 양쪽 수정 필요
- 새 admin 탭 추가 시 `index.html`(탭+pane), `app.js`의 `switchAdminTab` 의 배열 모두 수정
- `records.work_type` 자기 변경(`PATCH /api/records?action=self-tag`)은 KST 기준 **이번 달만 허용**. 이전 달 변경은 의도적으로 막아 `record_requests` 흐름으로 우회시킴
- 새 `work_type` 값 추가 시: 백엔드 `WORK_TYPES` 배열(`api/records/index.js`), 프론트 `WORK_TYPE_LABELS`/CSS `.work-type-chip.<value>`, stats `byUser` FILTER 모두 수정
