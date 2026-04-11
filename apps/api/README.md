# API

Backend для:

- Telegram-бота
- кабинета клиента
- кабинета управляющей компании

## Что уже заложено

- подключение к PostgreSQL через `DATABASE_URL`
- REST API для домов, помещений и собственников
- health-check
- нормализация структуры ответов для frontend

## Базовые маршруты

- `GET /health`
- `GET /api/properties`
- `GET /api/properties/:propertyCode`
- `POST /api/properties`
- `PUT /api/units/:unitCode/owners`

## Запуск

После установки зависимостей:

```bash
npm install
npm run api:dev
```

## Переменные окружения

- `PORT`
- `DATABASE_URL`
