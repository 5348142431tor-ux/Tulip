function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

export function getConfig() {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN || "";

  return {
    telegramToken,
    telegramApiBaseUrl: telegramToken
      ? `https://api.telegram.org/bot${telegramToken}`
      : "",
    apiBaseUrl: trimTrailingSlash(
      process.env.API_BASE_URL || "http://127.0.0.1:3000"
    ),
    clientCabinetBaseUrl: trimTrailingSlash(
      process.env.CLIENT_CABINET_BASE_URL || "http://127.0.0.1:4173"
    ),
    companyCabinetBaseUrl: trimTrailingSlash(
      process.env.COMPANY_CABINET_BASE_URL || "http://127.0.0.1:4174"
    ),
    pollingTimeoutSeconds: Math.max(
      10,
      Number(process.env.TELEGRAM_POLLING_TIMEOUT || 30)
    ),
  };
}
