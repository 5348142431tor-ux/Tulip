import { getConfig } from "./config.js";

const { apiBaseUrl } = getConfig();

async function fetchJson(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
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

export async function resolveTelegramClientAccess({ telegramId, telegramUsername }) {
  const payload = await fetchJson("/api/client-auth/telegram/start", {
    method: "POST",
    body: JSON.stringify({
      telegramId,
      telegramUsername,
    }),
  });

  return Array.isArray(payload.items) ? payload.items : [];
}

export async function resolveTelegramUser({ telegramId, telegramUsername }) {
  return fetchJson("/api/telegram/resolve-user", {
    method: "POST",
    body: JSON.stringify({
      telegramId,
      telegramUsername,
    }),
  });
}
