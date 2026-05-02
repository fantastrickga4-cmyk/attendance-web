// 직원 출퇴근 관리 (웹 버전)
// 데이터는 브라우저 localStorage에 저장돼요.

const USERS_KEY = "attendance.users";
const RECORDS_KEY = "attendance.records";
const SESSION_KEY = "attendance.session";

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
function diffHours(start, end) {
  const [h1, m1, s1] = start.split(":").map(Number);
  const [h2, m2, s2] = end.split(":").map(Number);
  const diffSec = h2 * 3600 + m2 * 60 + s2 - (h1 * 3600 + m1 * 60 + s1);
  if (diffSec <= 0) return "-";
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  return `${h}시간 ${m}분`;
}

// ====== 메시지 표시 ======
function showMsg(elementId, text, type = "") {
  const el = document.getElementById(elementId);
  el.textContent = text;
  el.className = `msg ${type}`;
  if (type === "success") {
    setTimeout(() => {
      if (el.textContent === text) el.textContent = "";
    }, 3000);
  }
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

  const users = load(USERS_KEY);
  const user = users.find((u) => u.id === id);
  if (!user || user.passwordHash !== (await hashPassword(pw))) {
    showMsg("auth-msg", "아이디 또는 비밀번호가 틀렸어요.", "error");
    return;
  }

  save(SESSION_KEY, { id: user.id, name: user.name });
  document.getElementById("login-form").reset();
  enterApp(user);
}

// ====== 로그아웃 ======
function handleLogout() {
  localStorage.removeItem(SESSION_KEY);
  document.getElementById("app-section").classList.add("hidden");
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

// ====== 기록 표시 ======
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
  document.getElementById("app-section").classList.remove("hidden");
  document.getElementById("user-name").textContent = user.name;
  renderRecords(user);
}

// ====== 현재 시각 표시 ======
function updateNow() {
  const el = document.getElementById("now-display");
  if (!el) return;
  const now = new Date();
  el.textContent = `현재 시각: ${formatDate(now)} ${formatTime(now)}`;
}

// ====== 시작 ======
function init() {
  document.getElementById("tab-login").addEventListener("click", () => switchTab("login"));
  document.getElementById("tab-signup").addEventListener("click", () => switchTab("signup"));
  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document.getElementById("signup-form").addEventListener("submit", handleSignup);
  document.getElementById("logout-btn").addEventListener("click", handleLogout);
  document.getElementById("checkin-btn").addEventListener("click", handleCheckIn);
  document.getElementById("checkout-btn").addEventListener("click", handleCheckOut);

  // 이전에 로그인 상태였으면 자동 진입
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  if (session) {
    const users = load(USERS_KEY);
    const user = users.find((u) => u.id === session.id);
    if (user) enterApp(user);
  }

  setInterval(updateNow, 1000);
  updateNow();
}

document.addEventListener("DOMContentLoaded", init);
