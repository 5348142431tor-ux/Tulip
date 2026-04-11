# Telegram Client Auth

Поток входа клиента:

1. Клиент открывает Telegram-бота.
2. Бот определяет `telegramId`.
3. Бот вызывает `POST /api/client-auth/telegram/start`.
4. Backend находит клиента по `clients.telegram_id`.
5. Backend поднимает список квартир клиента.
6. Для каждой квартиры backend возвращает ссылку с 16-ричным кодом доступа.
7. Клиент нажимает кнопку `Войти в личный кабинет`.
8. Кабинет открывается по ссылке `/client-cabinet/access/:accessCode`.
9. Backend валидирует `accessCode` и возвращает только данные этой квартиры.

Зачем так:

- Telegram подтверждает, кто клиент.
- Web-кабинет не получает прямой Telegram ID как ключ доступа.
- Каждая квартира может иметь свою отдельную ссылку.
- Доступ можно отозвать, деактивировав запись в `client_access_links`.

Новые API endpoints:

- `POST /api/client-auth/telegram/start`
- `GET /api/client-auth/access/:accessCode`

Структура хранения:

- `clients.telegram_id` связывает Telegram с клиентом
- `client_access_links.access_code` хранит 16-ричный код входа
- `client_access_links.unit_id` привязывает ссылку к конкретной квартире
