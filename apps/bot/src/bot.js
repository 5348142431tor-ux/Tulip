import { getConfig } from "./config.js";
import { resolveTelegramUser } from "./api.js";
import {
  answerCallbackQuery,
  getUpdates,
  sendMessage,
  setMyCommands,
} from "./telegram.js";

const config = getConfig();
let updateOffset = 0;
const clientAccessSessions = new Map();

function buildCabinetUrl(cabinetPath) {
  return `${config.clientCabinetBaseUrl}${cabinetPath}`;
}

function buildCompanyCabinetUrl(cabinetPath) {
  return `${config.companyCabinetBaseUrl}${cabinetPath}`;
}

function buildPropertySelectionKeyboard(items) {
  return {
    inline_keyboard: items.map((item) => [
      {
        text: `${item.propertyTitle}, кв. ${item.unitNumber}`,
        callback_data: `cabinet:${item.unitCode}`,
      },
    ]),
  };
}

function buildCabinetKeyboard(item) {
  return {
    inline_keyboard: [
      [
        {
          text: "Перейти в личный кабинет",
          url: buildCabinetUrl(item.cabinetPath),
        },
      ],
    ],
  };
}

function buildCompanyCabinetKeyboard(item) {
  return {
    inline_keyboard: [
      [
        {
          text: "Войти в кабинет компании",
          url: buildCompanyCabinetUrl(item.cabinetPath),
        },
      ],
    ],
  };
}

async function replyWithCabinetLinks(message) {
  const telegramId = message.from?.id;
  const telegramUsername = message.from?.username || "";

  if (!telegramId) {
    return sendMessage(
      message.chat.id,
      "Не удалось определить Telegram ID. Попробуйте еще раз."
    );
  }

  const telegramIdNote = `Ваш Telegram ID: <code>${telegramId}</code>`;

  try {
    const resolvedUser = await resolveTelegramUser({
      telegramId,
      telegramUsername,
    });

    if (resolvedUser.actorType === "company") {
      await sendMessage(
        message.chat.id,
        [
          `Здравствуйте, <b>${resolvedUser.company?.name || "компания"}</b>.`,
          "",
          telegramIdNote,
          "",
          `Компания: <b>${resolvedUser.company?.name || "-"}</b>`,
          `Роль: <b>${resolvedUser.role || "company_admin"}</b>`,
          "",
          "Нажмите кнопку ниже, чтобы открыть кабинет компании.",
          resolvedUser.mustChangePassword
            ? "При первом входе система попросит сменить временный пароль."
            : "Вход идет через Telegram и пароль компании.",
        ].join("\n")
        ,
        buildCompanyCabinetKeyboard(resolvedUser)
      );
      return;
    }

    const accessItems = Array.isArray(resolvedUser.items) ? resolvedUser.items : [];

    if (!accessItems.length) {
      await sendMessage(
        message.chat.id,
        [
          telegramIdNote,
          "",
          "Ваш Telegram пока не привязан к клиентскому профилю.",
          "Передайте этот ID в управляющую компанию, чтобы они внесли его в карточку клиента.",
        ].join("\n")
      );
      return;
    }

    clientAccessSessions.set(String(message.chat.id), accessItems);

    const introText =
      accessItems.length === 1
        ? [
            `Здравствуйте, <b>${accessItems[0].clientName}</b>.`,
            "",
            telegramIdNote,
            "",
            "Нажмите на кнопку с квартирой, а затем откройте личный кабинет.",
          ].join("\n")
        : [
            `Здравствуйте, <b>${accessItems[0].clientName}</b>.`,
            "",
            telegramIdNote,
            "",
            "Выберите квартиру, по которой хотите открыть личный кабинет.",
          ].join("\n");

    await sendMessage(
      message.chat.id,
      introText,
      buildPropertySelectionKeyboard(accessItems)
    );
  } catch (error) {
    const isNotFound = error.statusCode === 404;
    await sendMessage(
      message.chat.id,
      isNotFound
        ? [
            telegramIdNote,
            "",
            "Мы не нашли клиента, привязанного к этому Telegram-аккаунту.",
            "Попросите управляющую компанию добавить этот Telegram ID в карточку клиента.",
          ].join("\n")
        : [
            telegramIdNote,
            "",
            "Сейчас не удалось открыть доступ к кабинету.",
            "Но этот Telegram ID уже можно внести в карточку клиента, чтобы связать бота с квартирой.",
            "Попробуйте открыть кабинет чуть позже.",
          ].join("\n")
    );
  }
}

async function replyWithHelp(message) {
  await sendMessage(
    message.chat.id,
    [
      "Этот бот определяет, кто пишет: клиент или компания/сотрудник.",
      "",
      "Команды:",
      "/start - определить ваш доступ",
      "/cabinet - снова показать ваш доступ",
      "/help - показать помощь",
    ].join("\n")
  );
}

async function handleMessage(message) {
  const text = String(message.text || "").trim();

  if (text === "/start" || text === "/cabinet") {
    await replyWithCabinetLinks(message);
    return;
  }

  if (text === "/help") {
    await replyWithHelp(message);
    return;
  }

  await sendMessage(
    message.chat.id,
    "Используйте /start, чтобы бот определил ваш тип доступа и показал нужное меню."
  );
}

async function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message?.chat?.id;
  const callbackData = String(callbackQuery.data || "");

  if (!chatId || !callbackData.startsWith("cabinet:")) {
    await answerCallbackQuery(
      callbackQuery.id,
      "Не удалось обработать выбранную квартиру."
    );
    return;
  }

  const unitCode = callbackData.replace("cabinet:", "");
  const items = clientAccessSessions.get(String(chatId)) || [];
  const selectedItem = items.find((item) => item.unitCode === unitCode);

  if (!selectedItem) {
    await answerCallbackQuery(
      callbackQuery.id,
      "Сессия выбора квартиры устарела. Нажмите /start еще раз."
    );
    await sendMessage(
      chatId,
      "Список квартир обновился. Пожалуйста, нажмите /start еще раз."
    );
    return;
  }

  await answerCallbackQuery(callbackQuery.id, "Квартира выбрана");
  await sendMessage(
    chatId,
    [
      `<b>${selectedItem.propertyTitle}</b>`,
      `Квартира: ${selectedItem.unitNumber}`,
      "",
      "Нажмите кнопку ниже, чтобы перейти в личный кабинет.",
    ].join("\n"),
    buildCabinetKeyboard(selectedItem)
  );
}

async function processUpdates() {
  const updates = await getUpdates(updateOffset);

  for (const update of updates) {
    updateOffset = update.update_id + 1;

    if (update.message?.text) {
      await handleMessage(update.message);
      continue;
    }

    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }
  }
}

async function startBot() {
  if (!config.telegramToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is required to run the bot");
  }

  await setMyCommands();

  while (true) {
    try {
      await processUpdates();
    } catch (error) {
      console.error("[bot] polling error:", error.message);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

startBot().catch((error) => {
  console.error("[bot] fatal error:", error.message);
  process.exit(1);
});
