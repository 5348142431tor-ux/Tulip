# Telegram Bot

Основной клиентский канал для MVP.

Базовые сценарии:

- `/start`
- идентификация клиента
- мои объекты
- мои платежи
- мои заявки
- создать заявку

Новый контур входа:

- клиент открывает Telegram-бот
- бот отправляет `telegramId` в `POST /api/client-auth/telegram/start`
- API находит клиента по `clients.telegram_id`
- API возвращает одну или несколько ссылок входа по квартирам
- каждая ссылка содержит 16-ричный код доступа, привязанный к конкретной квартире
- бот показывает кнопку `Войти в личный кабинет`
- в `/start` бот также показывает сам `Telegram ID`, чтобы его можно было внести в карточку клиента

Пример ссылки:

- `/client-cabinet/access/4f7a9d1c2b33e0aa8c44f9ab01d2c7ef`

## Что уже реализовано

- long polling без внешних зависимостей
- команды `/start`, `/cabinet`, `/help`
- вызов `POST /api/client-auth/telegram/start`
- кнопки входа в кабинет по hex-ссылке на конкретную квартиру
- показ `Telegram ID` в ответе на `/start`

## Запуск

Нужны переменные окружения:

- `TELEGRAM_BOT_TOKEN`
- `API_BASE_URL`
- `CLIENT_CABINET_BASE_URL`

Команды:

```bash
npm run bot:dev
```

или

```bash
npm run bot:start
```
