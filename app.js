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
  const id = document.getElementById("signup-id").value.trim();
  const name = document.getElementById("signup-name").value.trim();
  const password = document.getElementById("signup-pw").value;

  if (!id || !name || password.length < 4) {
    showMsg("auth-msg", "모든 칸을 채워주세요. 비밀번호는 4자 이상이에요.", "error");
    return;
  }
  try {
    await api("/api/auth/signup", { method: "POST", body: { id, name, password } });
    showMsg("auth-msg", `${name}님, 회원가입 완료! 이제 로그인해주세요.`, "success");
    document.getElementById("signup-form").reset();
    switchTab("login");
  } catch (err) {
    showMsg("auth-msg", err.message, "error");
  }
}

// ====== 로그인 ======
async function handleLogin(event) {
  event.preventDefault();
  const id = document.getElementById("login-id").value.trim();
  const password = document.getElementById("login-pw").value;
  try {
    const { user } = await api("/api/auth/login", { method: "POST", body: { id, password } });
    currentUser = user;
    document.getElementById("login-form").reset();
    enterApp(user);
  } catch (err) {
    showMsg("auth-msg", err.message, "error");
  }
}

// ====== 로그아웃 ======
async function handleLogout() {
  try { await api("/api/auth/logout", { method: "POST" }); } catch {}
  currentUser = null;
  document.getElementById("app-section").classList.add("hidden");
  document.getElementById("admin-section").classList.add("hidden");
  document.getElementById("auth-section").classList.remove("hidden");
  showMsg("auth-msg", "로그아웃 되었어요.", "success");
}

// ====== 출근 ======
async function handleCheckIn() {
  if (!currentUser) return;
  try {
    const { time } = await api("/api/auth/checkin", { method: "POST" });
    showMsg("action-msg", `🟢 출근 완료! (${time})`, "success");
    await renderMyRecords();
  } catch (err) {
    showMsg("action-msg", err.message, "error");
  }
}

// ====== 퇴근 ======
async function handleCheckOut() {
  if (!currentUser) return;
  try {
    const { time } = await api("/api/auth/checkout", { method: "POST" });
    showMsg("action-msg", `🔴 퇴근 완료! 오늘도 수고하셨어요. (${time})`, "success");
    await renderMyRecords();
  } catch (err) {
    showMsg("action-msg", err.message, "error");
  }
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

  tbody.innerHTML = "";
  if (records.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  for (const r of records) {
    const tr = document.createElement("tr");
    const work = r.checkIn && r.checkOut ? diffHours(r.checkIn, r.checkOut) : "-";
    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${r.checkIn || "-"}</td>
      <td>${r.checkOut || "-"}</td>
      <td>${work}</td>
    `;
    tbody.appendChild(tr);
  }
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
    switchAdminTab("employees");
  } else {
    document.getElementById("admin-section").classList.add("hidden");
    document.getElementById("app-section").classList.remove("hidden");
    document.getElementById("user-name").textContent = user.name;
    renderMyRecords();
  }
}

// ====== 현재 시각 표시 ======
function updateNow() {
  const now = new Date();
  const text = `현재 시각: ${formatDate(now)} ${formatTime(now)}`;
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
  ["employees", "records", "stats"].forEach((n) => {
    const pane = document.getElementById(`admin-tab-${n}`);
    if (pane) pane.classList.toggle("hidden", n !== name);
  });
  if (name === "employees") await renderEmployees();
  else if (name === "records") {
    await refreshUserFilter();
    await renderAllRecords();
  } else if (name === "stats") await renderStats();
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

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(u.id)}</td>
      <td>${escapeHtml(u.name || "")}</td>
      <td>${u.role === "admin" ? '<span class="badge">관리자</span>' : "직원"}</td>
      <td>${created}</td>
      <td>${formatDuration(Number(u.total_seconds) || 0)}</td>
      <td class="row-actions">
        <button class="ghost small" data-action="toggle-role" data-id="${escapeAttr(u.id)}"
          ${isLastAdmin ? `disabled title="마지막 관리자는 강등할 수 없어요"` : ""}>
          ${u.role === "admin" ? "직원으로" : "관리자로"}
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
    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${escapeHtml(r.userId)}</td>
      <td>${escapeHtml(r.name || "")}</td>
      <td>${r.checkIn || "-"}</td>
      <td>${r.checkOut || "-"}</td>
      <td>${diffHours(r.checkIn, r.checkOut)}</td>
      <td class="row-actions">
        <button class="ghost small" data-action="edit-record" data-user="${escapeAttr(r.userId)}" data-date="${r.date}">수정</button>
        <button class="danger small" data-action="delete-record" data-user="${escapeAttr(r.userId)}" data-date="${r.date}">삭제</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
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
  const checkIn = checkInRaw ? normalizeTime(checkInRaw) : null;
  const checkOut = checkOutRaw ? normalizeTime(checkOutRaw) : null;

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
        body: { userId, date, checkIn, checkOut },
      });
    } else {
      const params = new URLSearchParams({
        userId: modal.dataset.originalUser,
        date: modal.dataset.originalDate,
      });
      await api(`/api/records?${params.toString()}`, {
        method: "PATCH",
        body: { checkIn, checkOut },
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

  // 관리자 화면
  document.getElementById("admin-logout-btn").addEventListener("click", handleLogout);
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

  // 모달
  document.getElementById("record-form").addEventListener("submit", handleRecordSubmit);
  document.querySelectorAll("#record-modal [data-close]").forEach((el) => {
    el.addEventListener("click", closeRecordModal);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeRecordModal();
  });

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
