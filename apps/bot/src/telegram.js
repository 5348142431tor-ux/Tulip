import { getConfig } from "./config.js";

const config = getConfig();

async function telegramRequest(method, payload = {}) {
  if (!config.telegramApiBaseUrl) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  const response = await fetch(`${config.telegramApiBaseUrl}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ok === false) {
    const error = new Error(data.description || "Telegram API request failed");
    error.statusCode = response.status;
    throw error;
  }

  return data.result;
}

export async function getUpdates(offset) {
  return telegramRequest("getUpdates", {
    timeout: config.pollingTimeoutSeconds,
    offset,
    allowed_updates: ["message", "callback_query"],
  });
}

export async function sendMessage(chatId, text, replyMarkup) {
  return telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup,
    parse_mode: "HTML",
  });
}

export async function answerCallbackQuery(callbackQueryId, text = "") {
  return telegramRequest("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

export async function setMyCommands() {
  return telegramRequest("setMyCommands", {
    commands: [
      { command: "start", description: "Открыть доступ к кабинету" },
      { command: "cabinet", description: "Показать ссылки на кабинет" },
      { command: "help", description: "Показать помощь" },
    ],
  });
}
