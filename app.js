// 직원 출퇴근 관리 (웹 버전)
// 데이터는 브라우저 localStorage에 저장돼요.

const USERS_KEY = "attendance.users";
const RECORDS_KEY = "attendance.records";
const SESSION_KEY = "attendance.session";

const DEFAULT_ADMIN = {
  id: "admin",
  name: "관리자",
  password: "admin1234",
};

// ====== localStorage 도우미 ======
function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ====== 비밀번호 해시 (Web Crypto API) ======
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ====== 날짜/시간 도우미 ======
function pad(n) {
  return String(n).padStart(2, "0");
}
function formatDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function formatTime(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function diffSeconds(start, end) {
  if (!start || !end) return 0;
  const [h1, m1, s1] = start.split(":").map(Number);
  const [h2, m2, s2] = end.split(":").map(Number);
  const sec = h2 * 3600 + m2 * 60 + (s2 || 0) - (h1 * 3600 + m1 * 60 + (s1 || 0));
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

// ====== 사용자 헬퍼 ======
function getUsers() {
  return load(USERS_KEY).map((u) => ({ role: "employee", ...u }));
}
function getUser(id) {
  return getUsers().find((u) => u.id === id);
}
function isAdmin(user) {
  return user && user.role === "admin";
}

// ====== 기본 관리자 시드 ======
async function ensureDefaultAdmin() {
  const users = load(USERS_KEY);
  const hasAdmin = users.some((u) => u.role === "admin");
  if (hasAdmin) return;

  users.push({
    id: DEFAULT_ADMIN.id,
    name: DEFAULT_ADMIN.name,
    passwordHash: await hashPassword(DEFAULT_ADMIN.password),
    role: "admin",
    createdAt: new Date().toISOString(),
  });
  save(USERS_KEY, users);
}

// ====== 회원가입 ======
async function handleSignup(event) {
  event.preventDefault();
  const id = document.getElementById("signup-id").value.trim();
  const name = document.getElementById("signup-name").value.trim();
  const pw = document.getElementById("signup-pw").value;

  if (!id || !name || pw.length < 4) {
    showMsg("auth-msg", "모든 칸을 채워주세요. 비밀번호는 4자 이상이에요.", "error");
    return;
  }

  const users = load(USERS_KEY);
  if (users.find((u) => u.id === id)) {
    showMsg("auth-msg", "이미 사용 중인 아이디예요.", "error");
    return;
  }

  users.push({
    id,
    name,
    passwordHash: await hashPassword(pw),
    role: "employee",
    createdAt: new Date().toISOString(),
  });
  save(USERS_KEY, users);
  showMsg("auth-msg", `${name}님, 회원가입 완료! 이제 로그인해주세요.`, "success");
  document.getElementById("signup-form").reset();
  switchTab("login");
}

// ====== 로그인 ======
async function handleLogin(event) {
  event.preventDefault();
  const id = document.getElementById("login-id").value.trim();
  const pw = document.getElementById("login-pw").value;

  const user = getUser(id);
  if (!user || user.passwordHash !== (await hashPassword(pw))) {
    showMsg("auth-msg", "아이디 또는 비밀번호가 틀렸어요.", "error");
    return;
  }

  save(SESSION_KEY, { id: user.id, name: user.name, role: user.role });
  document.getElementById("login-form").reset();
  enterApp(user);
}

// ====== 로그아웃 ======
function handleLogout() {
  localStorage.removeItem(SESSION_KEY);
  document.getElementById("app-section").classList.add("hidden");
  document.getElementById("admin-section").classList.add("hidden");
  document.getElementById("auth-section").classList.remove("hidden");
  showMsg("auth-msg", "로그아웃 되었어요.", "success");
}

// ====== 출근 ======
function handleCheckIn() {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  if (!session) return;

  const records = load(RECORDS_KEY);
  const today = formatDate(new Date());
  const existing = records.find((r) => r.userId === session.id && r.date === today);

  if (existing && existing.checkIn) {
    showMsg("action-msg", `이미 ${existing.checkIn}에 출근을 찍었어요.`, "error");
    return;
  }

  const time = formatTime(new Date());
  if (existing) {
    existing.checkIn = time;
  } else {
    records.push({
      userId: session.id,
      name: session.name,
      date: today,
      checkIn: time,
      checkOut: null,
    });
  }
  save(RECORDS_KEY, records);
  showMsg("action-msg", `🟢 출근 완료! (${time})`, "success");
  renderRecords(session);
}

// ====== 퇴근 ======
function handleCheckOut() {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  if (!session) return;

  const records = load(RECORDS_KEY);
  const today = formatDate(new Date());
  const existing = records.find((r) => r.userId === session.id && r.date === today);

  if (!existing || !existing.checkIn) {
    showMsg("action-msg", "오늘 출근 기록이 없어요. 먼저 출근을 찍어주세요.", "error");
    return;
  }
  if (existing.checkOut) {
    showMsg("action-msg", `이미 ${existing.checkOut}에 퇴근을 찍었어요.`, "error");
    return;
  }

  existing.checkOut = formatTime(new Date());
  save(RECORDS_KEY, records);
  showMsg("action-msg", `🔴 퇴근 완료! 오늘도 수고하셨어요. (${existing.checkOut})`, "success");
  renderRecords(session);
}

// ====== 직원 본인 기록 표시 ======
function renderRecords(session) {
  const tbody = document.getElementById("records-body");
  const empty = document.getElementById("empty-msg");
  const records = load(RECORDS_KEY)
    .filter((r) => r.userId === session.id)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

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
    refreshUserFilter();
  } else {
    document.getElementById("admin-section").classList.add("hidden");
    document.getElementById("app-section").classList.remove("hidden");
    document.getElementById("user-name").textContent = user.name;
    renderRecords(user);
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

function switchAdminTab(name) {
  const tabs = document.querySelectorAll(".admin-tabs .tab");
  tabs.forEach((t) => t.classList.toggle("active", t.dataset.adminTab === name));
  ["employees", "records", "stats"].forEach((n) => {
    const pane = document.getElementById(`admin-tab-${n}`);
    if (pane) pane.classList.toggle("hidden", n !== name);
  });
  if (name === "employees") renderEmployees();
  else if (name === "records") {
    refreshUserFilter();
    renderAllRecords();
  } else if (name === "stats") renderStats();
}

function renderAdmin() {
  refreshUserFilter();
  renderEmployees();
  renderAllRecords();
  renderStats();
}

// ---- 직원 관리 ----
function renderEmployees() {
  const search = (document.getElementById("employee-search")?.value || "")
    .trim()
    .toLowerCase();
  const users = getUsers();
  const records = load(RECORDS_KEY);

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
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");

  for (const u of filtered) {
    const totalSec = records
      .filter((r) => r.userId === u.id)
      .reduce((sum, r) => sum + diffSeconds(r.checkIn, r.checkOut), 0);
    const created = u.createdAt ? u.createdAt.slice(0, 10) : "-";
    const isSelf = session && session.id === u.id;
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
      <td>${formatDuration(totalSec)}</td>
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

function handleEmployeesClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === "delete-user") deleteUser(id);
  else if (btn.dataset.action === "toggle-role") toggleRole(id);
}

function deleteUser(id) {
  const users = load(USERS_KEY);
  const target = users.find((u) => u.id === id);
  if (!target) return;
  if (!confirm(`'${target.name}'(${id}) 직원을 삭제할까요?\n출퇴근 기록도 함께 삭제돼요.`)) return;

  const newUsers = users.filter((u) => u.id !== id);
  const newRecords = load(RECORDS_KEY).filter((r) => r.userId !== id);
  save(USERS_KEY, newUsers);
  save(RECORDS_KEY, newRecords);
  renderAdmin();
}

function toggleRole(id) {
  const users = load(USERS_KEY);
  const target = users.find((u) => u.id === id);
  if (!target) return;

  const adminCount = users.filter((u) => u.role === "admin").length;
  if (target.role === "admin" && adminCount <= 1) {
    alert("마지막 관리자는 강등할 수 없어요.");
    return;
  }

  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  const demotingSelf = session && session.id === id && target.role === "admin";

  target.role = target.role === "admin" ? "employee" : "admin";
  save(USERS_KEY, users);

  if (demotingSelf) {
    alert("자신을 직원으로 강등했어요. 다시 로그인해주세요.");
    handleLogout();
    return;
  }
  renderAdmin();
}

// ---- 전체 기록 ----
function refreshUserFilter() {
  const select = document.getElementById("filter-user");
  if (!select) return;
  const current = select.value;
  const users = getUsers().filter((u) => u.role !== "admin");
  select.innerHTML =
    '<option value="">전체</option>' +
    users
      .map(
        (u) => `<option value="${escapeAttr(u.id)}">${escapeHtml(u.name)} (${escapeHtml(u.id)})</option>`
      )
      .join("");
  if (current && users.some((u) => u.id === current)) select.value = current;
}

function renderAllRecords() {
  const userId = document.getElementById("filter-user")?.value || "";
  const from = document.getElementById("filter-from")?.value || "";
  const to = document.getElementById("filter-to")?.value || "";

  const records = load(RECORDS_KEY)
    .filter((r) => !userId || r.userId === userId)
    .filter((r) => !from || r.date >= from)
    .filter((r) => !to || r.date <= to)
    .sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : a.userId.localeCompare(b.userId)
    );

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

function handleAllRecordsClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const userId = btn.dataset.user;
  const date = btn.dataset.date;
  if (btn.dataset.action === "edit-record") openRecordModal({ mode: "edit", userId, date });
  else if (btn.dataset.action === "delete-record") deleteRecord(userId, date);
}

function deleteRecord(userId, date) {
  if (!confirm(`${date}의 ${userId} 기록을 삭제할까요?`)) return;
  const newRecords = load(RECORDS_KEY).filter((r) => !(r.userId === userId && r.date === date));
  save(RECORDS_KEY, newRecords);
  renderAdmin();
}

// ---- 기록 추가/수정 모달 ----
function openRecordModal(opts) {
  const modal = document.getElementById("record-modal");
  const title = document.getElementById("record-modal-title");
  const userSel = document.getElementById("record-user");
  const dateInput = document.getElementById("record-date");
  const inInput = document.getElementById("record-checkin");
  const outInput = document.getElementById("record-checkout");

  const employees = getUsers().filter((u) => u.role !== "admin");
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
    const r = load(RECORDS_KEY).find((x) => x.userId === opts.userId && x.date === opts.date);
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

function handleRecordSubmit(e) {
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

  const records = load(RECORDS_KEY);
  const user = getUser(userId);
  const name = user ? user.name : "";

  if (mode === "add") {
    const dup = records.find((r) => r.userId === userId && r.date === date);
    if (dup) {
      showMsg("record-modal-msg", "같은 직원의 같은 날짜 기록이 이미 있어요. 수정 버튼을 사용하세요.", "error");
      return;
    }
    records.push({ userId, name, date, checkIn, checkOut });
  } else {
    const r = records.find(
      (x) => x.userId === modal.dataset.originalUser && x.date === modal.dataset.originalDate
    );
    if (!r) {
      showMsg("record-modal-msg", "기록을 찾을 수 없어요.", "error");
      return;
    }
    r.checkIn = checkIn;
    r.checkOut = checkOut;
  }

  save(RECORDS_KEY, records);
  closeRecordModal();
  renderAdmin();
}

function normalizeTime(value) {
  if (!value) return null;
  const parts = value.split(":");
  while (parts.length < 3) parts.push("00");
  return parts.map((p) => p.padStart(2, "0")).join(":");
}

// ---- 통계 ----
function renderStats() {
  const users = getUsers().filter((u) => u.role !== "admin");
  const records = load(RECORDS_KEY);
  const today = formatDate(new Date());
  const monthPrefix = today.slice(0, 7);

  document.getElementById("stat-total-employees").textContent = users.length;
  document.getElementById("stat-today-checkin").textContent = records.filter(
    (r) => r.date === today && r.checkIn
  ).length;
  document.getElementById("stat-today-checkout").textContent = records.filter(
    (r) => r.date === today && r.checkOut
  ).length;

  const monthRecords = records.filter((r) => r.date.startsWith(monthPrefix));
  const monthSec = monthRecords.reduce((sum, r) => sum + diffSeconds(r.checkIn, r.checkOut), 0);
  document.getElementById("stat-month-hours").textContent = formatDuration(monthSec);

  const tbody = document.getElementById("stat-by-user-body");
  tbody.innerHTML = "";
  for (const u of users) {
    const userMonth = monthRecords.filter((r) => r.userId === u.id);
    const days = userMonth.filter((r) => r.checkIn).length;
    const totalSec = userMonth.reduce((sum, r) => sum + diffSeconds(r.checkIn, r.checkOut), 0);
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
  await ensureDefaultAdmin();

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

  // 자동 로그인
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  if (session) {
    const user = getUser(session.id);
    if (user) enterApp(user);
  }

  setInterval(updateNow, 1000);
  updateNow();
}

document.addEventListener("DOMContentLoaded", init);
