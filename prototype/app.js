const screens = {
  overview: {
    title: "Обзор платформы",
    description:
      "Система объединяет Telegram, клиентский кабинет и кабинет управляющей компании через единый backend и PostgreSQL.",
    features: [
      "Telegram как точка входа",
      "Client cabinet для деталей",
      "Admin cabinet для ежедневной работы",
      "Backend как единый слой логики",
      "PostgreSQL как основная база",
    ],
  },
  client: {
    title: "Кабинет клиента",
    description:
      "Клиент видит только свои объекты, заявки, платежи и документы. Это спокойный и понятный интерфейс для собственника или арендатора.",
    features: [
      "Мои объекты",
      "История начислений и оплат",
      "Статусы заявок",
      "Документы из Google Drive",
      "Профиль и язык интерфейса",
    ],
  },
  bot: {
    title: "Telegram-бот",
    description:
      "Бот покрывает быстрые сценарии: запуск, идентификацию клиента, уведомления, создание заявок и переходы в веб-кабинет.",
    features: [
      "Привязка Telegram ID",
      "Быстрый просмотр платежей",
      "Создание заявок в 2-3 шага",
      "Push-уведомления по статусам",
      "Deep link в кабинет клиента",
    ],
  },
  admin: {
    title: "Кабинет управляющей компании",
    description:
      "Рабочее место менеджеров, бухгалтерии и поддержки. Здесь живут клиенты, объекты, оплаты, заявки и внутренний контроль.",
    features: [
      "Очередь заявок",
      "Карточка клиента",
      "Платежные статусы",
      "Сотрудники и назначение задач",
      "Операционный журнал действий",
    ],
  },
  data: {
    title: "PostgreSQL",
    description:
      "PostgreSQL используется как основное операционное хранилище проекта, а все действия проходят через backend.",
    features: [
      "management_companies",
      "properties",
      "units",
      "ownerships",
      "charges",
      "requests",
      "documents",
      "activity_logs",
    ],
  },
};

const chatScenarios = {
  start: [
    { role: "bot", text: "Здравствуйте. Я бот Tulip. Помогу с объектами, оплатами и заявками." },
    { role: "bot", text: "Для входа отправьте номер телефона или нажмите кнопку привязки профиля." },
    { role: "user", text: "Привязать мой аккаунт" },
    { role: "bot", text: "Профиль найден: Elena Petrova. Доступны объекты: Sunset Residence A-12, Olive Garden Villa 4." },
  ],
  payments: [
    { role: "user", text: "Мои платежи" },
    { role: "bot", text: "На апрель 2026 начислено 18,400 TRY. Ближайший срок оплаты: 15 апреля 2026." },
    { role: "bot", text: "Хотите открыть детальную разбивку в личном кабинете?" },
  ],
  request: [
    { role: "user", text: "Создать заявку" },
    { role: "bot", text: "Выберите категорию: ремонт, документы, платежи, другое." },
    { role: "user", text: "Ремонт" },
    { role: "bot", text: "Опишите проблему. После отправки менеджер получит заявку, а вы увидите статус в кабинете." },
  ],
};

const navItems = document.querySelectorAll(".nav-item");
const panels = document.querySelectorAll(".screen-panel");
const screenTitle = document.getElementById("screen-title");
const screenDescription = document.getElementById("screen-description");
const featureStack = document.getElementById("feature-stack");
const chatThread = document.getElementById("chat-thread");
const botActions = document.querySelectorAll(".bot-action");

function renderFeatures(screenKey) {
  featureStack.innerHTML = "";
  screens[screenKey].features.forEach((feature) => {
    const item = document.createElement("span");
    item.textContent = feature;
    featureStack.appendChild(item);
  });
}

function setScreen(screenKey) {
  navItems.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.screen === screenKey);
  });

  panels.forEach((panel) => {
    panel.classList.toggle("is-visible", panel.dataset.panel === screenKey);
  });

  screenTitle.textContent = screens[screenKey].title;
  screenDescription.textContent = screens[screenKey].description;
  renderFeatures(screenKey);
}

function renderChat(name) {
  chatThread.innerHTML = "";
  chatScenarios[name].forEach((message) => {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${message.role}`;
    bubble.textContent = message.text;
    chatThread.appendChild(bubble);
  });
}

navItems.forEach((item) => {
  item.addEventListener("click", () => setScreen(item.dataset.screen));
});

botActions.forEach((action) => {
  action.addEventListener("click", () => {
    botActions.forEach((btn) => btn.classList.toggle("is-selected", btn === action));
    renderChat(action.dataset.chat);
  });
});

setScreen("overview");
renderChat("start");
