function resolveApiBaseUrl() {
  const { protocol, hostname } = window.location;

  if (hostname === "127.0.0.1" || hostname === "localhost") {
    return "http://127.0.0.1:3000";
  }

  const hostParts = hostname.split(".");
  if (hostParts.length >= 2) {
    return `${protocol}//api.${hostParts.slice(-2).join(".")}`;
  }

  return `${protocol}//${hostname}:3000`;
}

const API_BASE_URL = resolveApiBaseUrl();

const loadingPanel = document.getElementById("company-access-loading");
const loginPanel = document.getElementById("company-login-panel");
const changePasswordPanel = document.getElementById("company-change-password-panel");
const dashboardPanel = document.getElementById("company-dashboard-panel");
const loginForm = document.getElementById("company-login-form");
const changePasswordForm = document.getElementById("company-change-password-form");
const loginMessage = document.getElementById("company-login-message");
const changePasswordMessage = document.getElementById("company-change-password-message");
const subtitle = document.getElementById("company-auth-subtitle");
const loginCopy = document.getElementById("company-login-copy");
const dashboardCopy = document.getElementById("company-dashboard-copy");
const dashboardGrid = document.getElementById("company-dashboard-grid");

let accessCode = "";
let currentSession = null;

function setVisiblePanel(panel) {
  [loadingPanel, loginPanel, changePasswordPanel, dashboardPanel].forEach((item) => {
    item.classList.toggle("is-visible", item === panel);
  });
}

function getAccessCode() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get("accessCode") || "").trim();
}

async function fetchJson(path, options = {}) {
  const hasBody = options.body !== undefined && options.body !== null;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message || "API request failed");
    error.statusCode = response.status;
    throw error;
  }

  return payload;
}

function renderDashboard(session) {
  dashboardCopy.textContent = `${session.company.name} • роль ${session.role}`;
  dashboardGrid.innerHTML = `
    <article class="metric-card">
      <span>Компания</span>
      <strong>${session.company.name}</strong>
    </article>
    <article class="metric-card">
      <span>Код компании</span>
      <strong>${session.company.code}</strong>
    </article>
    <article class="metric-card">
      <span>Статус</span>
      <strong class="status-ok">${session.company.status}</strong>
    </article>
    <article class="metric-card">
      <span>Дальше</span>
      <strong>Сотрудники, объекты и заявки</strong>
    </article>
  `;
}

async function loadAccessSession() {
  accessCode = getAccessCode();

  if (!accessCode) {
    subtitle.textContent = "Ссылка входа некорректна: отсутствует accessCode.";
    setVisiblePanel(loginPanel);
    loginCopy.textContent = "Откройте кабинет только по ссылке из Telegram.";
    return;
  }

  try {
    const payload = await fetchJson(`/api/company-auth/access/${accessCode}`);
    currentSession = payload.item;
    subtitle.textContent = `Вход для компании ${currentSession.company.name}.`;
    loginCopy.textContent = `Компания ${currentSession.company.name} входит через Telegram и пароль.`;
    renderDashboard(currentSession);
    setVisiblePanel(loginPanel);
  } catch (error) {
    subtitle.textContent = error.message || "Не удалось открыть ссылку компании.";
    setVisiblePanel(loginPanel);
    loginCopy.textContent = "Попросите отправить новую ссылку из Telegram.";
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(loginForm);
  const password = String(formData.get("password") || "");

  if (!accessCode || !password) {
    loginMessage.textContent = "Введите пароль.";
    return;
  }

  try {
    const payload = await fetchJson("/api/company-auth/login", {
      method: "POST",
      body: JSON.stringify({
        accessCode,
        password,
      }),
    });

    currentSession = payload.item;
    renderDashboard(currentSession);

    if (currentSession.mustChangePassword) {
      changePasswordMessage.textContent = "";
      setVisiblePanel(changePasswordPanel);
      return;
    }

    setVisiblePanel(dashboardPanel);
  } catch (error) {
    loginMessage.textContent = error.message || "Не удалось войти.";
  }
});

changePasswordForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(changePasswordForm);
  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");

  if (!accessCode || !currentPassword || !newPassword) {
    changePasswordMessage.textContent = "Заполните все поля.";
    return;
  }

  try {
    const payload = await fetchJson("/api/company-auth/change-password", {
      method: "POST",
      body: JSON.stringify({
        accessCode,
        currentPassword,
        newPassword,
      }),
    });

    currentSession = payload.item;
    renderDashboard(currentSession);
    setVisiblePanel(dashboardPanel);
  } catch (error) {
    changePasswordMessage.textContent = error.message || "Не удалось сменить пароль.";
  }
});

loadAccessSession();
