// 직원 출퇴근 관리 (웹 버전 - 서버 백엔드)
// 데이터는 Neon Postgres에 저장되고, /api/* 엔드포인트로 통신해요.

let currentUser = null;

// ====== fetch 헬퍼 ======
async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || "GET",
    headers: opts.body ? { "Content-Type": "application/json" } : {},
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "same-origin",
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    if (res.status === 401 && currentUser && !path.startsWith("/api/auth/")) {
      showAuthScreen("세션이 종료되었습니다. 다시 로그인해주세요.");
    }
    const err = new Error((data && data.error) || `오류 (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data || {};
}

// ====== 날짜/시간 ======
function pad(n) { return String(n).padStart(2, "0"); }
function formatDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function formatTime(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
function diffSeconds(start, end) {
  if (!start || !end) return 0;
  const [h1, m1, s1 = 0] = start.split(":").map(Number);
  const [h2, m2, s2 = 0] = end.split(":").map(Number);
  const sec = h2 * 3600 + m2 * 60 + s2 - (h1 * 3600 + m1 * 60 + s1);
  return sec > 0 ? sec : 0;
}
function formatDuration(sec) {
  if (!sec) return "0시간 0분";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}시간 ${m}분`;
}
function diffHours(start, end) {
  if (!start || !end) return "-";
  return formatDuration(diffSeconds(start, end));
}

// ====== 메시지 표시 ======
function showMsg(elementId, text, type = "") {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = text;
  el.className = `msg ${type}`;
  if (type === "success") {
    setTimeout(() => {
      if (el.textContent === text) el.textContent = "";
    }, 3000);
  }
}

function isAdmin(user) { return user && user.role === "admin"; }

// ====== 회원가입 ======
async function handleSignup(event) {
  event.preventDefault();
  const submitBtn = event.submitter || event.target.querySelector('button[type="submit"]');
  const id = document.getElementById("signup-id").value.trim();
  const name = document.getElementById("signup-name").value.trim();
  const password = document.getElementById("signup-pw").value;

  if (!id || !name || password.length < 4) {
    showMsg("auth-msg", "모든 칸을 채워주세요. 비밀번호는 4자 이상이에요.", "error");
    return;
  }
  await withPending(submitBtn, "처리 중...", async () => {
    try {
      await api("/api/auth/signup", { method: "POST", body: { id, name, password } });
      showMsg("auth-msg", `${name}님, 회원가입 완료! 이제 로그인해주세요.`, "success");
      document.getElementById("signup-form").reset();
      switchTab("login");
    } catch (err) {
      showMsg("auth-msg", err.message, "error");
    }
  });
}

// ====== 모바일 감지 ======
const IS_MOBILE = /\b(Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone|webOS|iPad|Tablet)\b/i.test(
  navigator.userAgent || ""
);

// ====== 비동기 버튼 헬퍼 (즉시 비활성화 + 라벨 표시) ======
async function withPending(btn, pendingLabel, fn) {
  if (!btn) return fn();
  const original = btn.textContent;
  btn.disabled = true;
  if (pendingLabel) btn.textContent = pendingLabel;
  try {
    return await fn();
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

// ====== 로그인 ======
async function handleLogin(event) {
  event.preventDefault();
  const submitBtn = event.submitter || event.target.querySelector('button[type="submit"]');
  const id = document.getElementById("login-id").value.trim();
  const password = document.getElementById("login-pw").value;
  await withPending(submitBtn, "로그인 중...", async () => {
    try {
      const { user } = await api("/api/auth/login", { method: "POST", body: { id, password } });
      currentUser = user;
      document.getElementById("login-form").reset();
      enterApp(user);
    } catch (err) {
      showMsg("auth-msg", err.message, "error");
    }
  });
}

// ====== 로그아웃 (UI 즉시 전환, API는 백그라운드) ======
function showAuthScreen(message) {
  currentUser = null;
  stopIdleTracking();
  document.getElementById("app-section").classList.add("hidden");
  document.getElementById("admin-section").classList.add("hidden");
  document.getElementById("auth-section").classList.remove("hidden");
  if (message) showMsg("auth-msg", message, "success");
}

async function handleLogout() {
  showAuthScreen("로그아웃되었습니다.");
  try { await api("/api/auth/logout", { method: "POST" }); } catch {}
}

function fireLogoutInBackground() {
  api("/api/auth/logout", { method: "POST" }).catch(() => {});
}

// ====== 자동 로그아웃 (5분 idle) ======
const IDLE_TIMEOUT_MS  = 5 * 60 * 1000;     // 5분 무활동 → 로그아웃
const IDLE_WARNING_MS  = 30 * 1000;         // 마지막 30초는 카운트다운 배너
const ACTIVITY_EVENTS  = ["mousedown", "keydown", "touchstart", "scroll", "click"];
let idleLogoutTimer = null;
let idleWarningTimer = null;
let idleCountdownInterval = null;
let idleActivityThrottle = 0;

function startIdleTracking() {
  if (!currentUser) return;
  scheduleIdleLogout();
  ACTIVITY_EVENTS.forEach((ev) => document.addEventListener(ev, onIdleActivity, { passive: true }));
}

function stopIdleTracking() {
  clearTimeout(idleLogoutTimer); idleLogoutTimer = null;
  clearTimeout(idleWarningTimer); idleWarningTimer = null;
  clearInterval(idleCountdownInterval); idleCountdownInterval = null;
  hideIdleWarning();
  ACTIVITY_EVENTS.forEach((ev) => document.removeEventListener(ev, onIdleActivity));
}

function onIdleActivity() {
  const now = Date.now();
  if (now - idleActivityThrottle < 500) return;
  idleActivityThrottle = now;
  scheduleIdleLogout();
  hideIdleWarning();
}

function scheduleIdleLogout() {
  clearTimeout(idleLogoutTimer);
  clearTimeout(idleWarningTimer);
  idleWarningTimer = setTimeout(showIdleWarning, IDLE_TIMEOUT_MS - IDLE_WARNING_MS);
  idleLogoutTimer  = setTimeout(handleIdleLogout, IDLE_TIMEOUT_MS);
}

function showIdleWarning() {
  const banner = document.getElementById("idle-warning");
  if (!banner) return;
  banner.classList.remove("hidden");
  let secs = Math.floor(IDLE_WARNING_MS / 1000);
  document.getElementById("idle-countdown").textContent = secs;
  clearInterval(idleCountdownInterval);
  idleCountdownInterval = setInterval(() => {
    secs--;
    if (secs <= 0) { clearInterval(idleCountdownInterval); idleCountdownInterval = null; return; }
    const el = document.getElementById("idle-countdown");
    if (el) el.textContent = secs;
  }, 1000);
}

function hideIdleWarning() {
  const banner = document.getElementById("idle-warning");
  if (banner) banner.classList.add("hidden");
  if (idleCountdownInterval) { clearInterval(idleCountdownInterval); idleCountdownInterval = null; }
}

function handleIdleLogout() {
  showAuthScreen("5분 동안 활동이 없어 자동 로그아웃되었습니다.");
  fireLogoutInBackground();
}

// ====== 출근 ======
async function handleCheckIn(event) {
  if (!currentUser) return;
  const btn = (event && event.currentTarget) || document.getElementById("checkin-btn");
  await withPending(btn, "처리 중...", async () => {
    try {
      const { time } = await api("/api/auth/checkin", { method: "POST" });
      showAuthScreen(`출근 완료 (${time}) — 로그아웃되었습니다.`);
      fireLogoutInBackground();
    } catch (err) {
      showMsg("action-msg", err.message, "error");
    }
  });
}

// ====== 퇴근 ======
function needsRoundCountPrompt(user) {
  return !!user && typeof user.id === "string" && user.id.endsWith("3");
}

async function handleCheckOut(event) {
  if (!currentUser) return;
  const btn = (event && event.currentTarget) || document.getElementById("checkout-btn");
  await withPending(btn, "처리 중...", async () => {
    try {
      const { time } = await api("/api/auth/checkout", { method: "POST" });
      if (needsRoundCountPrompt(currentUser)) {
        openRoundCountModal(time);
        return;
      }
      showAuthScreen(`퇴근 완료 (${time}) — 수고하셨습니다. 로그아웃되었습니다.`);
      fireLogoutInBackground();
    } catch (err) {
      showMsg("action-msg", err.message, "error");
    }
  });
}

// ====== 오늘 담당한 회차 모달 ======
let roundCountCheckoutTime = null;

function openRoundCountModal(time) {
  roundCountCheckoutTime = time || "";
  const modal = document.getElementById("round-count-modal");
  const input = document.getElementById("round-count-input");
  document.getElementById("round-count-form").reset();
  showMsg("round-count-msg", "");
  modal.classList.remove("hidden");
  setTimeout(() => input.focus(), 50);
}

function closeRoundCountModal() {
  document.getElementById("round-count-modal").classList.add("hidden");
  roundCountCheckoutTime = null;
}

function finishRoundCountCheckout() {
  const time = roundCountCheckoutTime;
  closeRoundCountModal();
  showAuthScreen(`퇴근 완료 (${time}) — 수고하셨습니다. 로그아웃되었습니다.`);
  fireLogoutInBackground();
}

async function handleRoundCountSubmit(e) {
  e.preventDefault();
  const submitBtn = e.submitter || e.target.querySelector('button[type="submit"]');
  const raw = document.getElementById("round-count-input").value.trim();
  if (raw === "") {
    showMsg("round-count-msg", "회차 수를 입력해주세요.", "error");
    return;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    showMsg("round-count-msg", "0 이상의 정수를 입력해주세요.", "error");
    return;
  }
  await withPending(submitBtn, "저장 중...", async () => {
    try {
      await api("/api/auth/round-count", { method: "POST", body: { count: n } });
      finishRoundCountCheckout();
    } catch (err) {
      showMsg("round-count-msg", err.message, "error");
    }
  });
}

function handleRoundCountSkip() {
  finishRoundCountCheckout();
}

// ====== 직원 본인 기록 표시 ======
async function renderMyRecords() {
  const tbody = document.getElementById("records-body");
  const empty = document.getElementById("empty-msg");
  let records = [];
  try {
    const data = await api("/api/records");
    records = data.records || [];
  } catch (err) {
    showMsg("action-msg", err.message, "error");
    return;
  }

  const showRound = needsRoundCountPrompt(currentUser);
  const roundTh = document.getElementById("emp-round-th");
  if (roundTh) roundTh.classList.toggle("hidden", !showRound);

  tbody.innerHTML = "";
  if (records.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  for (const r of records) {
    const tr = document.createElement("tr");
    const work = r.checkIn && r.checkOut ? diffHours(r.checkIn, r.checkOut) : "-";
    const roundCell = showRound
      ? `<td>${r.roundCount == null ? '<span class="muted">-</span>' : `<strong>${Number(r.roundCount)}</strong>`}</td>`
      : "";
    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${r.checkIn || "-"}</td>
      <td>${r.checkOut || "-"}</td>
      <td>${work}</td>
      ${roundCell}
    `;
    tbody.appendChild(tr);
  }
}

// ====== 직원 본인 신청 내역 ======
async function renderMyRequests() {
  const tbody = document.getElementById("my-requests-body");
  const empty = document.getElementById("my-requests-empty");
  if (!tbody) return;
  let entries = [];
  try {
    const data = await api("/api/record-requests");
    entries = data.requests || [];
  } catch (err) {
    return;
  }
  tbody.innerHTML = "";
  if (entries.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  for (const r of entries) {
    const reqIn = r.requestedCheckIn ? r.requestedCheckIn.slice(0, 5) : "-";
    const reqOut = r.requestedCheckOut ? r.requestedCheckOut.slice(0, 5) : "-";
    const status = `<span class="status-badge ${r.status}">${REQUEST_STATUS_LABELS[r.status] || r.status}</span>`;
    const reviewer = r.reviewerName ? `${escapeHtml(r.reviewerName)}` : "-";
    const comment = r.reviewerComment ? `<span class="req-comment">${escapeHtml(r.reviewerComment)}</span>` : "";
    const canCancel = r.status === "pending";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatAuditTime(r.createdAt)}</td>
      <td>${r.targetDate}</td>
      <td class="req-times">↓ ${reqIn} / ↑ ${reqOut}</td>
      <td class="req-reason">${escapeHtml(r.reason || "")}</td>
      <td>${status}${comment}</td>
      <td>${reviewer}</td>
      <td class="row-actions">
        ${canCancel ? `<button class="ghost small" data-cancel-request="${r.id}">취소</button>` : ""}
      </td>
    `;
    tbody.appendChild(tr);
  }
}

async function handleMyRequestsClick(e) {
  const btn = e.target.closest("button[data-cancel-request]");
  if (!btn) return;
  const id = btn.dataset.cancelRequest;
  if (!confirm("이 신청을 취소할까요?")) return;
  try {
    await api(`/api/record-requests/${encodeURIComponent(id)}`, { method: "DELETE" });
    await renderMyRequests();
  } catch (err) {
    alert(err.message);
  }
}

// ====== 직원 수정 신청 모달 ======
function openRequestModal(prefill = {}) {
  const modal = document.getElementById("request-modal");
  document.getElementById("request-form").reset();
  showMsg("request-msg", "");
  const dateInput = document.getElementById("request-date");
  const inInput = document.getElementById("request-checkin");
  const outInput = document.getElementById("request-checkout");
  dateInput.value = prefill.date || formatDate(new Date());
  inInput.value = (prefill.checkIn || "").slice(0, 8);
  outInput.value = (prefill.checkOut || "").slice(0, 8);
  document.getElementById("request-current").textContent = prefill.currentLabel || "현재 기록을 조회하려면 날짜를 선택하세요.";
  modal.classList.remove("hidden");
  setTimeout(() => dateInput.focus(), 50);
}

function closeRequestModal() {
  document.getElementById("request-modal").classList.add("hidden");
}

async function refreshRequestCurrent() {
  const date = document.getElementById("request-date").value;
  const el = document.getElementById("request-current");
  if (!date) {
    el.textContent = "날짜를 선택하세요.";
    return;
  }
  try {
    const data = await api(`/api/records?from=${date}&to=${date}`);
    const r = (data.records || [])[0];
    if (!r) {
      el.textContent = `${date} 현재 기록: 없음`;
    } else {
      el.textContent = `${date} 현재 기록: 출근 ${r.checkIn || "-"} / 퇴근 ${r.checkOut || "-"}`;
    }
  } catch {
    el.textContent = `${date}: 기록 조회 실패`;
  }
}

async function handleRequestSubmit(e) {
  e.preventDefault();
  const submitBtn = e.submitter || e.target.querySelector('button[type="submit"]');
  const date = document.getElementById("request-date").value;
  const inRaw = document.getElementById("request-checkin").value;
  const outRaw = document.getElementById("request-checkout").value;
  const reason = document.getElementById("request-reason").value.trim();
  const requestedCheckIn = inRaw ? normalizeTime(inRaw) : null;
  const requestedCheckOut = outRaw ? normalizeTime(outRaw) : null;

  if (!date) {
    showMsg("request-msg", "날짜를 선택하세요.", "error");
    return;
  }
  if (!requestedCheckIn && !requestedCheckOut) {
    showMsg("request-msg", "출근 또는 퇴근 시간 중 하나는 입력해주세요.", "error");
    return;
  }
  if (requestedCheckIn && requestedCheckOut && diffSeconds(requestedCheckIn, requestedCheckOut) <= 0) {
    showMsg("request-msg", "퇴근 시간은 출근 시간보다 뒤여야 합니다.", "error");
    return;
  }
  if (reason.length < 2) {
    showMsg("request-msg", "사유를 좀 더 구체적으로 입력해주세요.", "error");
    return;
  }

  await withPending(submitBtn, "신청 중...", async () => {
    try {
      await api("/api/record-requests", {
        method: "POST",
        body: { targetDate: date, requestedCheckIn, requestedCheckOut, reason },
      });
      closeRequestModal();
      await renderMyRequests();
    } catch (err) {
      showMsg("request-msg", err.message, "error");
    }
  });
}

// ====== 관리자: 신청 검토 ======
async function renderAllRequests() {
  const tbody = document.getElementById("all-requests-body");
  const empty = document.getElementById("all-requests-empty");
  const count = document.getElementById("req-count");
  const filter = document.getElementById("req-status-filter");
  const status = filter ? filter.value : "pending";
  let entries = [];
  try {
    const url = status ? `/api/record-requests?status=${encodeURIComponent(status)}` : "/api/record-requests";
    const data = await api(url);
    entries = data.requests || [];
  } catch (err) {
    return;
  }
  count.textContent = `${entries.length}건`;
  tbody.innerHTML = "";
  if (entries.length === 0) {
    empty.classList.remove("hidden");
    refreshPendingBadge();
    return;
  }
  empty.classList.add("hidden");
  for (const r of entries) {
    const reqIn = r.requestedCheckIn ? r.requestedCheckIn.slice(0, 5) : "-";
    const reqOut = r.requestedCheckOut ? r.requestedCheckOut.slice(0, 5) : "-";
    const curIn = r.currentCheckIn ? r.currentCheckIn.slice(0, 5) : "-";
    const curOut = r.currentCheckOut ? r.currentCheckOut.slice(0, 5) : "-";
    const statusBadge = `<span class="status-badge ${r.status}">${REQUEST_STATUS_LABELS[r.status] || r.status}</span>`;
    const comment = r.reviewerComment ? `<span class="req-comment">${escapeHtml(r.reviewerComment)}</span>` : "";
    const reviewer = r.reviewerName ? `<span class="req-comment">처리: ${escapeHtml(r.reviewerName)}</span>` : "";
    const actions = r.status === "pending"
      ? `
        <button class="primary small" data-action="approve-request" data-id="${r.id}">승인</button>
        <button class="danger small" data-action="reject-request" data-id="${r.id}">반려</button>
      `
      : "-";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatAuditTime(r.createdAt)}</td>
      <td>${escapeHtml(r.userName)} <span class="muted">(${escapeHtml(r.userId)})</span></td>
      <td>${r.targetDate}</td>
      <td class="req-times">↓ ${curIn} / ↑ ${curOut}</td>
      <td class="req-times">↓ ${reqIn} / ↑ ${reqOut}</td>
      <td class="req-reason">${escapeHtml(r.reason || "")}</td>
      <td>${statusBadge}${comment}${reviewer}</td>
      <td class="row-actions">${actions}</td>
    `;
    tbody.appendChild(tr);
  }
  refreshPendingBadge();
}

async function handleAllRequestsClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === "approve-request") await approveRequest(id);
  else if (btn.dataset.action === "reject-request") openRejectModal(id);
}

async function approveRequest(id) {
  if (!confirm("이 신청을 승인하고 기록에 반영할까요?")) return;
  try {
    await api(`/api/record-requests/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { decision: "approve" },
    });
    await renderAllRequests();
    await refreshPendingBadge();
  } catch (err) {
    alert(err.message);
  }
}

let rejectingRequestId = null;
function openRejectModal(id) {
  rejectingRequestId = id;
  const modal = document.getElementById("reject-modal");
  document.getElementById("reject-form").reset();
  showMsg("reject-msg", "");
  modal.classList.remove("hidden");
  setTimeout(() => document.getElementById("reject-comment").focus(), 50);
}

function closeRejectModal() {
  document.getElementById("reject-modal").classList.add("hidden");
  rejectingRequestId = null;
}

async function handleRejectSubmit(e) {
  e.preventDefault();
  const submitBtn = e.submitter || e.target.querySelector('button[type="submit"]');
  const comment = document.getElementById("reject-comment").value.trim();
  if (!rejectingRequestId) {
    closeRejectModal();
    return;
  }
  if (comment.length < 2) {
    showMsg("reject-msg", "반려 사유를 입력해주세요.", "error");
    return;
  }
  await withPending(submitBtn, "처리 중...", async () => {
    try {
      await api(`/api/record-requests/${encodeURIComponent(rejectingRequestId)}`, {
        method: "PATCH",
        body: { decision: "reject", comment },
      });
      closeRejectModal();
      await renderAllRequests();
      await refreshPendingBadge();
    } catch (err) {
      showMsg("reject-msg", err.message, "error");
    }
  });
}

// ====== 세션 ======
function describeUA(ua) {
  if (!ua) return "Unknown";
  let device = "PC";
  if (/iPhone|iPod/i.test(ua)) device = "iPhone";
  else if (/iPad/i.test(ua)) device = "iPad";
  else if (/Android/i.test(ua)) device = /Mobile/i.test(ua) ? "Android Phone" : "Android";
  else if (/Windows/i.test(ua)) device = "Windows";
  else if (/Mac OS X/i.test(ua)) device = "Mac";
  else if (/Linux/i.test(ua)) device = "Linux";

  let browser = "Browser";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\//i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua)) browser = "Safari";

  return `${browser} · ${device}`;
}

function relativeTime(iso) {
  if (!iso) return "-";
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 30) return "방금";
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

async function renderSessions() {
  const tbody = document.getElementById("sessions-body");
  const empty = document.getElementById("sessions-empty");
  const count = document.getElementById("sessions-count");
  let entries = [];
  try {
    const data = await api("/api/sessions");
    entries = data.sessions || [];
  } catch (err) {
    return;
  }
  count.textContent = `${entries.length}건`;
  tbody.innerHTML = "";
  if (entries.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  for (const s of entries) {
    const userLabel = `${escapeHtml(s.userName)} <span class="muted">(${escapeHtml(s.userId)})</span>`;
    const roleBadge = s.userRole === "admin" ? ' <span class="badge">관리자</span>' : "";
    const currentMark = s.current ? ' <span class="status-badge approved">현재 세션</span>' : "";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${userLabel}${roleBadge}${currentMark}</td>
      <td>${escapeHtml(describeUA(s.userAgent))}</td>
      <td><span class="req-times">${escapeHtml(s.ip || "-")}</span></td>
      <td>${formatAuditTime(s.createdAt)}</td>
      <td>${escapeHtml(relativeTime(s.lastSeenAt))}</td>
      <td class="row-actions">
        <button class="danger small" data-revoke="${escapeAttr(s.jti)}" data-current="${s.current ? "1" : "0"}">
          ${s.current ? "로그아웃" : "강제 로그아웃"}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

async function handleSessionsClick(e) {
  const btn = e.target.closest("button[data-revoke]");
  if (!btn) return;
  const jti = btn.dataset.revoke;
  const isCurrent = btn.dataset.current === "1";
  const msg = isCurrent
    ? "현재 세션을 종료하면 즉시 로그아웃됩니다. 계속할까요?"
    : "이 세션을 강제 종료할까요? 해당 사용자는 다음 요청에서 자동 로그아웃됩니다.";
  if (!confirm(msg)) return;
  try {
    const res = await api(`/api/sessions/${encodeURIComponent(jti)}`, { method: "DELETE" });
    if (res.revokedSelf) {
      showAuthScreen("로그아웃되었습니다.");
      return;
    }
    await renderSessions();
  } catch (err) {
    alert(err.message);
  }
}

async function refreshPendingBadge() {
  const badge = document.getElementById("pending-badge");
  if (!badge) return;
  if (!isAdmin(currentUser)) { badge.classList.add("hidden"); return; }
  try {
    const data = await api("/api/record-requests?status=pending");
    const n = (data.requests || []).length;
    if (n > 0) {
      badge.textContent = String(n);
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  } catch {}
}

// ====== 화면 전환 ======
function switchTab(which) {
  const tabLogin = document.getElementById("tab-login");
  const tabSignup = document.getElementById("tab-signup");
  const formLogin = document.getElementById("login-form");
  const formSignup = document.getElementById("signup-form");

  if (which === "login") {
    tabLogin.classList.add("active");
    tabSignup.classList.remove("active");
    formLogin.classList.remove("hidden");
    formSignup.classList.add("hidden");
  } else {
    tabSignup.classList.add("active");
    tabLogin.classList.remove("active");
    formSignup.classList.remove("hidden");
    formLogin.classList.add("hidden");
  }
}

function enterApp(user) {
  document.getElementById("auth-section").classList.add("hidden");
  if (isAdmin(user)) {
    document.getElementById("app-section").classList.add("hidden");
    document.getElementById("admin-section").classList.remove("hidden");
    document.getElementById("admin-name").textContent = user.name;
    switchAdminTab("working");
    refreshPushButton();
    refreshPendingBadge();
    refreshWorkingBadge();
  } else {
    document.getElementById("admin-section").classList.add("hidden");
    document.getElementById("app-section").classList.remove("hidden");
    document.getElementById("user-name").textContent = user.name;
    renderMyRecords();
    renderEmpCalendar();
    renderMyRequests();
  }
  startIdleTracking();
}

// ====== 현재 시각 표시 ======
function updateNow() {
  const now = new Date();
  const text = `${formatDate(now)} ${formatTime(now)}`;
  const el = document.getElementById("now-display");
  const adminEl = document.getElementById("admin-now-display");
  if (el) el.textContent = text;
  if (adminEl) adminEl.textContent = text;
}

// ============================================================
// 관리자 모드
// ============================================================

async function switchAdminTab(name) {
  const tabs = document.querySelectorAll(".admin-tabs .tab");
  tabs.forEach((t) => t.classList.toggle("active", t.dataset.adminTab === name));
  ["working", "employees", "records", "requests", "stats", "sessions", "audit"].forEach((n) => {
    const pane = document.getElementById(`admin-tab-${n}`);
    if (pane) pane.classList.toggle("hidden", n !== name);
  });
  if (name === "working") await renderWorkingNow();
  else if (name === "employees") await renderEmployees();
  else if (name === "records") {
    await refreshUserFilter();
    await renderAllRecords();
  } else if (name === "requests") {
    await renderAllRequests();
  } else if (name === "stats") {
    await renderStats();
    await refreshAdminCalUserSelect();
    renderAdminCalendar();
  } else if (name === "sessions") {
    await renderSessions();
  } else if (name === "audit") {
    await renderAuditLog();
  }
}

async function renderAdmin() {
  await refreshUserFilter();
  await renderEmployees();
  await renderAllRecords();
  await renderStats();
}

// ---- 직원 관리 ----
let cachedEmployees = [];

async function renderEmployees() {
  let users = [];
  try {
    const data = await api("/api/users");
    users = data.users || [];
  } catch (err) {
    return;
  }
  cachedEmployees = users;

  const search = (document.getElementById("employee-search")?.value || "")
    .trim()
    .toLowerCase();
  const filtered = users.filter(
    (u) =>
      !search ||
      u.id.toLowerCase().includes(search) ||
      (u.name || "").toLowerCase().includes(search)
  );

  const tbody = document.getElementById("employees-body");
  const empty = document.getElementById("employees-empty");
  const count = document.getElementById("employee-count");
  count.textContent = `총 ${users.length}명${search ? ` (검색 ${filtered.length}명)` : ""}`;

  tbody.innerHTML = "";
  if (filtered.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  const adminCount = users.filter((u) => u.role === "admin").length;

  for (const u of filtered) {
    const created = u.created_at ? u.created_at.slice(0, 10) : "-";
    const isSelf = currentUser && currentUser.id === u.id;
    const isLastAdmin = u.role === "admin" && adminCount <= 1;
    const cannotDelete = isSelf || isLastAdmin;
    const deleteTitle = isSelf
      ? "자기 자신은 삭제할 수 없어요"
      : isLastAdmin
      ? "마지막 관리자는 삭제할 수 없어요"
      : "";

    const firstIn = u.first_check_in_date || "-";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(u.id)}</td>
      <td>${escapeHtml(u.name || "")}</td>
      <td>${u.role === "admin" ? '<span class="badge">관리자</span>' : "직원"}</td>
      <td>${created}</td>
      <td>${firstIn}</td>
      <td>${formatDuration(Number(u.total_seconds) || 0)}</td>
      <td class="row-actions">
        <button class="ghost small" data-action="toggle-role" data-id="${escapeAttr(u.id)}"
          ${isLastAdmin ? `disabled title="마지막 관리자는 강등할 수 없어요"` : ""}>
          ${u.role === "admin" ? "직원으로" : "관리자로"}
        </button>
        <button class="ghost small" data-action="reset-password" data-id="${escapeAttr(u.id)}">
          비밀번호 초기화
        </button>
        <button class="danger small" data-action="delete-user" data-id="${escapeAttr(u.id)}"
          ${cannotDelete ? `disabled title="${deleteTitle}"` : ""}>
          삭제
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

async function handleEmployeesClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === "delete-user") await deleteUser(id);
  else if (btn.dataset.action === "toggle-role") await toggleRole(id);
  else if (btn.dataset.action === "reset-password") await resetPassword(id);
}

async function resetPassword(id) {
  const target = cachedEmployees.find((u) => u.id === id);
  if (!target) return;
  if (!confirm(`'${target.name}'(${id}) 직원의 비밀번호를 초기화할까요?\n임시 비밀번호가 생성되고 화면에 1회 표시됩니다.`)) return;
  try {
    const res = await api(`/api/users/${encodeURIComponent(id)}?action=reset-password`, { method: "POST" });
    showTempPassword(res.tempPassword, target);
  } catch (err) {
    alert(err.message);
  }
}

function showTempPassword(password, target) {
  const modal = document.getElementById("temp-password-modal");
  const box = document.getElementById("temp-password-box");
  box.textContent = password;
  box.dataset.userId = target.id;
  box.dataset.userName = target.name || "";
  modal.classList.remove("hidden");
}

function closeTempPasswordModal() {
  document.getElementById("temp-password-modal").classList.add("hidden");
}

async function deleteUser(id) {
  const target = cachedEmployees.find((u) => u.id === id);
  if (!target) return;
  if (!confirm(`'${target.name}'(${id}) 직원을 삭제할까요?\n출퇴근 기록도 함께 삭제돼요.`)) return;
  try {
    await api(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" });
    await renderAdmin();
  } catch (err) {
    alert(err.message);
  }
}

async function toggleRole(id) {
  const target = cachedEmployees.find((u) => u.id === id);
  if (!target) return;
  const newRole = target.role === "admin" ? "employee" : "admin";
  try {
    const result = await api(`/api/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { role: newRole },
    });
    if (result.demotedSelf) {
      alert("자신을 직원으로 강등했어요. 다시 로그인해주세요.");
      await handleLogout();
      return;
    }
    await renderAdmin();
  } catch (err) {
    alert(err.message);
  }
}

// ---- 전체 기록 ----
async function refreshUserFilter() {
  const select = document.getElementById("filter-user");
  if (!select) return;
  const current = select.value;
  let users = cachedEmployees.length ? cachedEmployees : [];
  if (users.length === 0) {
    try {
      const data = await api("/api/users");
      users = data.users || [];
      cachedEmployees = users;
    } catch {}
  }
  const employees = users.filter((u) => u.role !== "admin");
  select.innerHTML =
    '<option value="">전체</option>' +
    employees
      .map(
        (u) => `<option value="${escapeAttr(u.id)}">${escapeHtml(u.name)} (${escapeHtml(u.id)})</option>`
      )
      .join("");
  if (current && employees.some((u) => u.id === current)) select.value = current;
}

async function renderAllRecords() {
  const userId = document.getElementById("filter-user")?.value || "";
  const from = document.getElementById("filter-from")?.value || "";
  const to = document.getElementById("filter-to")?.value || "";

  const params = new URLSearchParams();
  if (userId) params.set("userId", userId);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  let records = [];
  try {
    const data = await api(`/api/records?${params.toString()}`);
    records = data.records || [];
  } catch (err) {
    return;
  }

  const tbody = document.getElementById("all-records-body");
  const empty = document.getElementById("all-records-empty");
  tbody.innerHTML = "";
  if (records.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  for (const r of records) {
    const tr = document.createElement("tr");
    const roundCell = formatRoundCount(r);
    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${escapeHtml(r.userId)}</td>
      <td>${escapeHtml(r.name || "")}</td>
      <td>${r.checkIn || "-"}</td>
      <td>${r.checkOut || "-"}</td>
      <td>${diffHours(r.checkIn, r.checkOut)}</td>
      <td>${roundCell}</td>
      <td class="row-actions">
        <button class="ghost small" data-action="edit-record" data-user="${escapeAttr(r.userId)}" data-date="${r.date}">수정</button>
        <button class="danger small" data-action="delete-record" data-user="${escapeAttr(r.userId)}" data-date="${r.date}">삭제</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

function formatRoundCount(r) {
  // 회차 입력 대상이 아닌 직원은 빈 칸으로 표시
  if (!r || typeof r.userId !== "string" || !r.userId.endsWith("3")) return "-";
  if (r.roundCount == null) {
    return '<span class="muted">미입력</span>';
  }
  return `<strong>${Number(r.roundCount)}</strong>`;
}

let lastRecords = [];

async function handleAllRecordsClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const userId = btn.dataset.user;
  const date = btn.dataset.date;
  if (btn.dataset.action === "edit-record") await openRecordModal({ mode: "edit", userId, date });
  else if (btn.dataset.action === "delete-record") await deleteRecord(userId, date);
}

async function deleteRecord(userId, date) {
  if (!confirm(`${date}의 ${userId} 기록을 삭제할까요?`)) return;
  try {
    await api(`/api/records?userId=${encodeURIComponent(userId)}&date=${encodeURIComponent(date)}`, {
      method: "DELETE",
    });
    await renderAdmin();
  } catch (err) {
    alert(err.message);
  }
}

// ---- 기록 추가/수정 모달 ----
async function openRecordModal(opts) {
  const modal = document.getElementById("record-modal");
  const title = document.getElementById("record-modal-title");
  const userSel = document.getElementById("record-user");
  const dateInput = document.getElementById("record-date");
  const inInput = document.getElementById("record-checkin");
  const outInput = document.getElementById("record-checkout");
  const roundInput = document.getElementById("record-round-count");

  if (cachedEmployees.length === 0) {
    try {
      const data = await api("/api/users");
      cachedEmployees = data.users || [];
    } catch {}
  }
  const employees = cachedEmployees.filter((u) => u.role !== "admin");
  if (employees.length === 0) {
    alert("등록된 직원이 없어요. 먼저 직원이 회원가입해야 해요.");
    return;
  }
  userSel.innerHTML = employees
    .map(
      (u) => `<option value="${escapeAttr(u.id)}">${escapeHtml(u.name)} (${escapeHtml(u.id)})</option>`
    )
    .join("");

  if (opts.mode === "edit") {
    const params = new URLSearchParams({ userId: opts.userId, from: opts.date, to: opts.date });
    let r = null;
    try {
      const data = await api(`/api/records?${params.toString()}`);
      r = (data.records || []).find((x) => x.userId === opts.userId && x.date === opts.date);
    } catch (err) {
      alert(err.message);
      return;
    }
    if (!r) return;
    title.textContent = "기록 수정";
    userSel.value = r.userId;
    userSel.disabled = true;
    dateInput.value = r.date;
    dateInput.disabled = true;
    inInput.value = (r.checkIn || "").slice(0, 8);
    outInput.value = (r.checkOut || "").slice(0, 8);
    roundInput.value = r.roundCount == null ? "" : String(r.roundCount);
    modal.dataset.mode = "edit";
    modal.dataset.originalUser = r.userId;
    modal.dataset.originalDate = r.date;
  } else {
    title.textContent = "기록 추가";
    userSel.disabled = false;
    dateInput.disabled = false;
    dateInput.value = formatDate(new Date());
    inInput.value = "";
    outInput.value = "";
    roundInput.value = "";
    modal.dataset.mode = "add";
    delete modal.dataset.originalUser;
    delete modal.dataset.originalDate;
  }
  showMsg("record-modal-msg", "");
  modal.classList.remove("hidden");
}

function closeRecordModal() {
  document.getElementById("record-modal").classList.add("hidden");
}

async function handleRecordSubmit(e) {
  e.preventDefault();
  const modal = document.getElementById("record-modal");
  const mode = modal.dataset.mode;
  const userId = document.getElementById("record-user").value;
  const date = document.getElementById("record-date").value;
  const checkInRaw = document.getElementById("record-checkin").value;
  const checkOutRaw = document.getElementById("record-checkout").value;
  const roundRaw = document.getElementById("record-round-count").value.trim();
  const checkIn = checkInRaw ? normalizeTime(checkInRaw) : null;
  const checkOut = checkOutRaw ? normalizeTime(checkOutRaw) : null;
  let roundCount = null;
  if (roundRaw !== "") {
    const n = Number(roundRaw);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      showMsg("record-modal-msg", "회차는 0 이상의 정수만 입력할 수 있어요.", "error");
      return;
    }
    roundCount = n;
  }

  if (!userId || !date) {
    showMsg("record-modal-msg", "직원과 날짜는 필수예요.", "error");
    return;
  }
  if (checkIn && checkOut && diffSeconds(checkIn, checkOut) <= 0) {
    showMsg("record-modal-msg", "퇴근 시간은 출근 시간보다 뒤여야 해요.", "error");
    return;
  }

  try {
    if (mode === "add") {
      await api("/api/records", {
        method: "POST",
        body: { userId, date, checkIn, checkOut, roundCount },
      });
    } else {
      const params = new URLSearchParams({
        userId: modal.dataset.originalUser,
        date: modal.dataset.originalDate,
      });
      await api(`/api/records?${params.toString()}`, {
        method: "PATCH",
        body: { checkIn, checkOut, roundCount },
      });
    }
    closeRecordModal();
    await renderAdmin();
  } catch (err) {
    showMsg("record-modal-msg", err.message, "error");
  }
}

function normalizeTime(value) {
  if (!value) return null;
  const parts = value.split(":");
  while (parts.length < 3) parts.push("00");
  return parts.map((p) => p.padStart(2, "0")).join(":");
}

// ---- 근무중 ----
async function renderWorkingNow() {
  const tbody = document.getElementById("working-now-body");
  const empty = document.getElementById("working-now-empty");
  const meta  = document.getElementById("working-now-meta");
  let data;
  try { data = await api("/api/stats"); } catch { return; }
  const list = data.workingNow || [];
  meta.textContent = `${data.today || ""} 기준 · ${list.length}명 근무중`;
  refreshWorkingBadge(list.length);

  tbody.innerHTML = "";
  if (list.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  for (const r of list) {
    const inT = (r.check_in || "").slice(0, 5);
    const elapsed = r.check_in ? formatElapsedKST(r.check_in) : "-";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(r.name)}</strong></td>
      <td>${escapeHtml(r.id)}</td>
      <td>${inT}</td>
      <td>${elapsed}</td>
    `;
    tbody.appendChild(tr);
  }
}

// 입력: "HH:MM:SS" (KST 기준 출근 시각). 출력: "X시간 Y분"
function formatElapsedKST(checkInStr) {
  const [h, m, s = 0] = checkInStr.split(":").map(Number);
  const checkInSec = h * 3600 + m * 60 + Number(s);
  const k = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const nowSec = k.getUTCHours() * 3600 + k.getUTCMinutes() * 60 + k.getUTCSeconds();
  let diff = nowSec - checkInSec;
  if (diff < 0) diff += 24 * 3600;  // 자정 넘김
  const hh = Math.floor(diff / 3600);
  const mm = Math.floor((diff % 3600) / 60);
  return `${hh}시간 ${mm}분`;
}

async function refreshWorkingBadge(countOverride) {
  const badge = document.getElementById("working-badge");
  if (!badge) return;
  if (!isAdmin(currentUser)) { badge.classList.add("hidden"); return; }
  let n = countOverride;
  if (n == null) {
    try { const data = await api("/api/stats"); n = (data.workingNow || []).length; }
    catch { return; }
  }
  if (n > 0) { badge.textContent = String(n); badge.classList.remove("hidden"); }
  else badge.classList.add("hidden");
}

// ---- 통계 ----
async function renderStats() {
  let s;
  try {
    s = await api("/api/stats");
  } catch (err) {
    return;
  }
  document.getElementById("stat-total-employees").textContent = s.totalEmployees;
  document.getElementById("stat-today-checkin").textContent = s.todayCheckin;
  document.getElementById("stat-today-checkout").textContent = s.todayCheckout;
  document.getElementById("stat-month-hours").textContent = formatDuration(s.monthSeconds || 0);

  const tbody = document.getElementById("stat-by-user-body");
  tbody.innerHTML = "";
  for (const u of s.byUser || []) {
    const totalSec = Number(u.total_seconds) || 0;
    const days = Number(u.days) || 0;
    const avgSec = days > 0 ? Math.floor(totalSec / days) : 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(u.name)} <span class="muted">(${escapeHtml(u.id)})</span></td>
      <td>${days}일</td>
      <td>${formatDuration(totalSec)}</td>
      <td>${formatDuration(avgSec)}</td>
    `;
    tbody.appendChild(tr);
  }
}

// ---- 보안 헬퍼 ----
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function escapeAttr(str) {
  return escapeHtml(str);
}

// ====== 푸시 알림 (관리자 전용) ======
let swRegistration = null;
let pushSupported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

async function initPush() {
  if (!pushSupported) return;
  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.warn("[push] sw register failed:", err);
    pushSupported = false;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function getCurrentSubscription() {
  if (!swRegistration) return null;
  return await swRegistration.pushManager.getSubscription();
}

function setPushButton(state, label) {
  const btn = document.getElementById("push-toggle-btn");
  if (!btn) return;
  btn.dataset.state = state;
  btn.textContent = label;
  btn.hidden = false;
}

async function refreshPushButton() {
  const btn = document.getElementById("push-toggle-btn");
  if (!btn) return;
  if (!isAdmin(currentUser)) { btn.hidden = true; return; }
  if (!pushSupported) {
    setPushButton("unsupported", "알림 미지원");
    btn.disabled = true;
    return;
  }
  btn.disabled = false;
  if (Notification.permission === "denied") {
    setPushButton("denied", "알림 차단됨");
    btn.disabled = true;
    return;
  }
  const sub = await getCurrentSubscription();
  if (sub) setPushButton("on", "알림 끄기");
  else setPushButton("off", "알림 켜기");
}

async function handlePushToggle() {
  if (!pushSupported) return;
  const btn = document.getElementById("push-toggle-btn");
  const state = btn.dataset.state;
  btn.disabled = true;
  try {
    if (state === "on") {
      const sub = await getCurrentSubscription();
      if (sub) {
        await sub.unsubscribe();
        try { await api("/api/push/unsubscribe", { method: "POST", body: { endpoint: sub.endpoint } }); } catch {}
      }
      showMsg("push-msg", "알림이 꺼졌어요.", "success");
    } else {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        showMsg("push-msg", "알림 권한이 거부됐어요.", "error");
        return;
      }
      const { publicKey } = await api("/api/push/vapid-key");
      const sub = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await api("/api/push/subscribe", {
        method: "POST",
        body: { subscription: sub.toJSON() },
      });
      showMsg("push-msg", "알림이 켜졌어요. 직원이 출/퇴근 찍으면 푸시가 옵니다.", "success");
    }
  } catch (err) {
    console.error(err);
    showMsg("push-msg", `알림 설정 실패: ${err.message}`, "error");
  } finally {
    btn.disabled = false;
    await refreshPushButton();
  }
}

// ====== 내 정보 (비밀번호 변경) ======
function openProfileModal() {
  const modal = document.getElementById("profile-modal");
  document.getElementById("profile-form").reset();
  showMsg("profile-msg", "");
  modal.classList.remove("hidden");
  setTimeout(() => document.getElementById("profile-current").focus(), 50);
}

function closeProfileModal() {
  document.getElementById("profile-modal").classList.add("hidden");
}

async function handleProfileSubmit(e) {
  e.preventDefault();
  const submitBtn = e.submitter || e.target.querySelector('button[type="submit"]');
  const cur = document.getElementById("profile-current").value;
  const next = document.getElementById("profile-new").value;
  const conf = document.getElementById("profile-confirm").value;

  if (next !== conf) {
    showMsg("profile-msg", "새 비밀번호 확인이 일치하지 않습니다.", "error");
    return;
  }
  if (next.length < 4) {
    showMsg("profile-msg", "새 비밀번호는 4자 이상이어야 합니다.", "error");
    return;
  }
  await withPending(submitBtn, "변경 중...", async () => {
    try {
      await api("/api/users/me", { method: "PATCH", body: { currentPassword: cur, newPassword: next } });
      showMsg("profile-msg", "비밀번호가 변경되었습니다.", "success");
      document.getElementById("profile-form").reset();
      setTimeout(closeProfileModal, 1200);
    } catch (err) {
      showMsg("profile-msg", err.message, "error");
    }
  });
}

// ====== CSV 내보내기 ======
function csvCell(v) {
  const s = String(v == null ? "" : v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function exportRecordsCsv() {
  const userId = document.getElementById("filter-user")?.value || "";
  const from = document.getElementById("filter-from")?.value || "";
  const to = document.getElementById("filter-to")?.value || "";
  const params = new URLSearchParams();
  if (userId) params.set("userId", userId);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  let records = [];
  try {
    const data = await api(`/api/records?${params.toString()}`);
    records = data.records || [];
  } catch (err) {
    alert(err.message);
    return;
  }

  const header = ["날짜", "아이디", "이름", "출근", "퇴근", "근무시간(시:분)", "회차"];
  const rows = records.map((r) => {
    const work = r.checkIn && r.checkOut ? formatDuration(diffSeconds(r.checkIn, r.checkOut)) : "";
    const round = r.userId && r.userId.endsWith("3") && r.roundCount != null ? String(r.roundCount) : "";
    return [r.date, r.userId, r.name || "", r.checkIn || "", r.checkOut || "", work, round].map(csvCell).join(",");
  });
  const csv = "﻿" + [header.map(csvCell).join(","), ...rows].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = formatDate(new Date());
  const tag = userId ? `_${userId}` : "_all";
  a.href = url;
  a.download = `attendance${tag}_${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ====== 이력 ======
const AUDIT_ACTION_LABELS = {
  "record.create": "기록 추가",
  "record.update": "기록 수정",
  "record.delete": "기록 삭제",
  "user.role_change": "권한 변경",
  "user.delete": "직원 삭제",
  "user.password_reset": "비밀번호 초기화",
  "user.password_change": "비밀번호 변경",
  "request.create": "신청 등록",
  "request.approve": "신청 승인",
  "request.reject": "신청 반려",
  "request.cancel": "신청 취소",
  "session.revoke": "세션 강제 종료",
};

const REQUEST_STATUS_LABELS = {
  pending: "대기",
  approved: "승인",
  rejected: "반려",
  cancelled: "취소",
};

function formatAuditTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function summarizeDiff(action, before, after) {
  if (!before && !after) return "-";
  if (action === "record.create") {
    return `→ in:${after?.checkIn || "-"} / out:${after?.checkOut || "-"}`;
  }
  if (action === "record.update") {
    return `${before?.checkIn || "-"}/${before?.checkOut || "-"} → ${after?.checkIn || "-"}/${after?.checkOut || "-"}`;
  }
  if (action === "record.delete") {
    return `삭제: ${before?.checkIn || "-"}/${before?.checkOut || "-"}`;
  }
  if (action === "user.role_change") {
    return `${before?.role || "-"} → ${after?.role || "-"}`;
  }
  if (action === "user.delete") {
    return `삭제: ${before?.name || ""}(${before?.id || ""}, ${before?.role || ""})`;
  }
  return "-";
}

async function renderAuditLog() {
  const tbody = document.getElementById("audit-body");
  const empty = document.getElementById("audit-empty");
  const count = document.getElementById("audit-count");
  let entries = [];
  try {
    const data = await api("/api/audit?limit=200");
    entries = data.entries || [];
  } catch (err) {
    alert(err.message);
    return;
  }
  count.textContent = `최근 ${entries.length}건`;
  tbody.innerHTML = "";
  if (entries.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  for (const e of entries) {
    const actor = e.actor_name ? `${e.actor_name}(${e.actor_id || "-"})` : (e.actor_id || "시스템");
    const targetName = e.target_user_name || "";
    const targetId = e.target_user_id || "";
    const target = targetId
      ? (targetName ? `${targetName}(${targetId})` : targetId) + (e.target_date ? ` · ${e.target_date}` : "")
      : "-";
    const label = AUDIT_ACTION_LABELS[e.action] || e.action;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatAuditTime(e.created_at)}</td>
      <td>${escapeHtml(actor)}</td>
      <td class="audit-action">${escapeHtml(label)}</td>
      <td>${escapeHtml(target)}</td>
      <td class="audit-diff">${escapeHtml(summarizeDiff(e.action, e.before, e.after))}</td>
    `;
    tbody.appendChild(tr);
  }
}

// ====== 캘린더 ======
const calState = {
  emp: { year: null, month: null },
  admin: { year: null, month: null, userId: null },
};

const DOW_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function ymKey(y, m) { return `${y}-${pad(m + 1)}`; }
function firstOfMonth(y, m) { return new Date(y, m, 1); }
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

function buildCalendarFrame(year, month, todayStr, recordsByDate, opts = {}) {
  const head = `<div class="cal-head">
    <div class="cal-title">${year}년 ${month + 1}월</div>
    <div class="cal-nav">
      <button data-cal-nav="${opts.target}" data-dir="prev">‹ 이전</button>
      <button data-cal-nav="${opts.target}" data-dir="today">오늘</button>
      <button data-cal-nav="${opts.target}" data-dir="next">다음 ›</button>
    </div>
  </div>`;

  const dows = DOW_LABELS.map((d, i) => {
    const cls = i === 0 ? "sun" : i === 6 ? "sat" : "";
    return `<div class="cal-dow ${cls}">${d}</div>`;
  }).join("");

  const start = firstOfMonth(year, month).getDay();
  const days = daysInMonth(year, month);
  const cells = [];
  for (let i = 0; i < start; i++) cells.push(`<div class="cal-cell empty"></div>`);
  for (let d = 1; d <= days; d++) {
    const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
    const dow = new Date(year, month, d).getDay();
    const dowCls = dow === 0 ? "sun" : dow === 6 ? "sat" : "";
    const isToday = dateStr === todayStr;
    const r = recordsByDate.get(dateStr);
    const noData = !r;
    const inT = r && r.checkIn ? r.checkIn.slice(0, 5) : "-";
    const outT = r && r.checkOut ? r.checkOut.slice(0, 5) : "-";
    const work = r && r.checkIn && r.checkOut
      ? formatDuration(diffSeconds(r.checkIn, r.checkOut))
      : "";
    cells.push(`
      <div class="cal-cell ${dowCls} ${isToday ? "today" : ""} ${noData ? "no-data" : ""}">
        <div class="cal-day">${d}</div>
        <div class="cal-times">
          ${noData ? "-" : `↓ ${inT}<br/>↑ ${outT}${work ? `<span class="work">${work}</span>` : ""}`}
        </div>
      </div>
    `);
  }
  return head + `<div class="cal-grid">${dows}${cells.join("")}</div>`;
}

async function renderEmpCalendar() {
  const root = document.querySelector('.calendar[data-cal="emp"]');
  if (!root) return;
  const today = new Date();
  if (calState.emp.year == null) {
    calState.emp.year = today.getFullYear();
    calState.emp.month = today.getMonth();
  }
  const { year, month } = calState.emp;

  const from = `${year}-${pad(month + 1)}-01`;
  const to = `${year}-${pad(month + 1)}-${pad(daysInMonth(year, month))}`;
  let records = [];
  try {
    const data = await api(`/api/records?from=${from}&to=${to}`);
    records = data.records || [];
  } catch (err) {
    root.innerHTML = `<div class="empty">${escapeHtml(err.message)}</div>`;
    return;
  }
  const map = new Map(records.map((r) => [r.date, r]));
  const todayStr = formatDate(today);
  root.innerHTML = buildCalendarFrame(year, month, todayStr, map, { target: "emp" });
}

async function refreshAdminCalUserSelect() {
  const sel = document.getElementById("admin-cal-user");
  if (!sel) return;
  let users = cachedEmployees;
  if (!users || users.length === 0) {
    try {
      const data = await api("/api/users");
      users = data.users || [];
      cachedEmployees = users;
    } catch {}
  }
  const previous = calState.admin.userId || sel.value;
  sel.innerHTML = users
    .map((u) => `<option value="${escapeAttr(u.id)}">${escapeHtml(u.name)} (${escapeHtml(u.id)})</option>`)
    .join("");
  if (previous && users.some((u) => u.id === previous)) sel.value = previous;
  calState.admin.userId = sel.value || (users[0] && users[0].id) || null;
}

async function renderAdminCalendar() {
  const root = document.querySelector('.calendar[data-cal="admin"]');
  if (!root) return;
  if (!calState.admin.userId) {
    root.innerHTML = `<div class="empty">조회할 직원을 선택해주세요.</div>`;
    return;
  }
  const today = new Date();
  if (calState.admin.year == null) {
    calState.admin.year = today.getFullYear();
    calState.admin.month = today.getMonth();
  }
  const { year, month, userId } = calState.admin;

  const from = `${year}-${pad(month + 1)}-01`;
  const to = `${year}-${pad(month + 1)}-${pad(daysInMonth(year, month))}`;
  let records = [];
  try {
    const data = await api(`/api/records?userId=${encodeURIComponent(userId)}&from=${from}&to=${to}`);
    records = data.records || [];
  } catch (err) {
    root.innerHTML = `<div class="empty">${escapeHtml(err.message)}</div>`;
    return;
  }
  const map = new Map(records.map((r) => [r.date, r]));
  const todayStr = formatDate(today);
  root.innerHTML = buildCalendarFrame(year, month, todayStr, map, { target: "admin" });
}

function navCalendar(target, dir) {
  const st = calState[target];
  if (!st) return;
  if (dir === "today") {
    const t = new Date();
    st.year = t.getFullYear();
    st.month = t.getMonth();
  } else if (dir === "prev") {
    if (st.month === 0) { st.year--; st.month = 11; } else { st.month--; }
  } else if (dir === "next") {
    if (st.month === 11) { st.year++; st.month = 0; } else { st.month++; }
  }
  if (target === "emp") renderEmpCalendar();
  else renderAdminCalendar();
}

function handleCalendarClick(e) {
  const btn = e.target.closest("button[data-cal-nav]");
  if (!btn) return;
  navCalendar(btn.dataset.calNav, btn.dataset.dir);
}

// ====== 보기 토글 (표/캘린더) ======
function applyEmpView(view) {
  const buttons = document.querySelectorAll('.view-toggle [data-view-target="emp"]');
  buttons.forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  document.getElementById("emp-table-view").classList.toggle("hidden", view !== "table");
  document.getElementById("emp-calendar-view").classList.toggle("hidden", view !== "calendar");
  if (view === "calendar") renderEmpCalendar();
}

function handleViewToggleClick(e) {
  const btn = e.target.closest('button[data-view-target]');
  if (!btn) return;
  if (btn.dataset.viewTarget === "emp") applyEmpView(btn.dataset.view);
}

// ====== 시작 ======
async function init() {
  // 인증 화면
  document.getElementById("tab-login").addEventListener("click", () => switchTab("login"));
  document.getElementById("tab-signup").addEventListener("click", () => switchTab("signup"));
  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document.getElementById("signup-form").addEventListener("submit", handleSignup);

  // 직원 화면
  document.getElementById("logout-btn").addEventListener("click", handleLogout);
  document.getElementById("checkin-btn").addEventListener("click", handleCheckIn);
  document.getElementById("checkout-btn").addEventListener("click", handleCheckOut);

  // 자동 로그아웃 — "계속 사용" 버튼 (배너의 카운트다운 중 클릭 시 idle 타이머 리셋)
  document.getElementById("idle-stay-btn").addEventListener("click", () => {
    scheduleIdleLogout();
    hideIdleWarning();
  });

  // 관리자 화면
  document.getElementById("admin-logout-btn").addEventListener("click", handleLogout);
  document.getElementById("push-toggle-btn").addEventListener("click", handlePushToggle);
  await initPush();
  document.querySelectorAll(".admin-tabs .tab").forEach((tab) => {
    tab.addEventListener("click", () => switchAdminTab(tab.dataset.adminTab));
  });
  document.getElementById("employees-body").addEventListener("click", handleEmployeesClick);
  document.getElementById("employee-search").addEventListener("input", renderEmployees);
  document.getElementById("all-records-body").addEventListener("click", handleAllRecordsClick);
  document.getElementById("filter-user").addEventListener("change", renderAllRecords);
  document.getElementById("filter-from").addEventListener("change", renderAllRecords);
  document.getElementById("filter-to").addEventListener("change", renderAllRecords);
  document.getElementById("filter-reset").addEventListener("click", () => {
    document.getElementById("filter-user").value = "";
    document.getElementById("filter-from").value = "";
    document.getElementById("filter-to").value = "";
    renderAllRecords();
  });
  document.getElementById("add-record-btn").addEventListener("click", () => openRecordModal({ mode: "add" }));

  // CSV 내보내기 + 이력 탭
  document.getElementById("csv-export-btn").addEventListener("click", exportRecordsCsv);
  document.getElementById("audit-refresh").addEventListener("click", renderAuditLog);
  document.getElementById("working-refresh").addEventListener("click", renderWorkingNow);

  // 직원 수정 신청
  document.getElementById("open-request-btn").addEventListener("click", () => openRequestModal());
  document.getElementById("request-form").addEventListener("submit", handleRequestSubmit);
  document.getElementById("request-date").addEventListener("change", refreshRequestCurrent);
  document.querySelectorAll("#request-modal [data-close]").forEach((el) =>
    el.addEventListener("click", closeRequestModal)
  );
  document.getElementById("my-requests-body").addEventListener("click", handleMyRequestsClick);

  // 관리자 세션 관리
  document.getElementById("sessions-body").addEventListener("click", handleSessionsClick);
  document.getElementById("sessions-refresh").addEventListener("click", renderSessions);

  // 관리자 신청 검토
  document.getElementById("all-requests-body").addEventListener("click", handleAllRequestsClick);
  document.getElementById("req-status-filter").addEventListener("change", renderAllRequests);
  document.getElementById("req-refresh").addEventListener("click", () => {
    renderAllRequests();
    refreshPendingBadge();
  });
  document.getElementById("reject-form").addEventListener("submit", handleRejectSubmit);
  document.querySelectorAll("#reject-modal [data-close]").forEach((el) =>
    el.addEventListener("click", closeRejectModal)
  );

  // 캘린더 (직원 + 관리자)
  document.querySelectorAll(".calendar").forEach((el) => {
    el.addEventListener("click", handleCalendarClick);
  });
  document.querySelectorAll(".view-toggle").forEach((el) => {
    el.addEventListener("click", handleViewToggleClick);
  });
  document.getElementById("admin-cal-user").addEventListener("change", (e) => {
    calState.admin.userId = e.target.value;
    renderAdminCalendar();
  });

  // 내 정보 (양쪽 화면 모두)
  document.querySelectorAll(".open-profile-btn").forEach((b) =>
    b.addEventListener("click", openProfileModal)
  );
  document.getElementById("profile-form").addEventListener("submit", handleProfileSubmit);
  document.querySelectorAll("#profile-modal [data-close]").forEach((el) =>
    el.addEventListener("click", closeProfileModal)
  );
  document.querySelectorAll("#temp-password-modal [data-close]").forEach((el) =>
    el.addEventListener("click", closeTempPasswordModal)
  );
  document.getElementById("temp-password-copy").addEventListener("click", async () => {
    const text = document.getElementById("temp-password-box").textContent;
    try {
      await navigator.clipboard.writeText(text);
      const btn = document.getElementById("temp-password-copy");
      const orig = btn.textContent;
      btn.textContent = "복사됨";
      setTimeout(() => { btn.textContent = orig; }, 1500);
    } catch {}
  });

  // 모달
  document.getElementById("record-form").addEventListener("submit", handleRecordSubmit);
  document.querySelectorAll("#record-modal [data-close]").forEach((el) => {
    el.addEventListener("click", closeRecordModal);
  });
  // 오늘 담당한 회차 모달
  document.getElementById("round-count-form").addEventListener("submit", handleRoundCountSubmit);
  document.getElementById("round-count-skip").addEventListener("click", handleRoundCountSkip);
  document.querySelectorAll("#round-count-modal [data-close]").forEach((el) =>
    el.addEventListener("click", handleRoundCountSkip)
  );

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeRecordModal();
      closeProfileModal();
      closeTempPasswordModal();
      closeRequestModal();
      closeRejectModal();
      // 회차 모달은 ESC로도 건너뛰기 처리 (세션 정리 포함)
      const roundModal = document.getElementById("round-count-modal");
      if (roundModal && !roundModal.classList.contains("hidden")) handleRoundCountSkip();
    }
  });

  // 모바일에서는 안내 문구 표시
  if (IS_MOBILE) {
    const notice = document.getElementById("mobile-notice");
    if (notice) notice.classList.remove("hidden");
  }

  // 자동 로그인 시도
  try {
    const { user } = await api("/api/auth/me");
    if (user) {
      currentUser = user;
      enterApp(user);
    }
  } catch {
    // 비로그인 상태면 그냥 로그인 화면 유지
  }

  setInterval(updateNow, 1000);
  updateNow();
}

document.addEventListener("DOMContentLoaded", init);
