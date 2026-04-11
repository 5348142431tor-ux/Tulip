# Деплой На Публичный Адрес

Рекомендуемая схема для проекта:

- VPS
- Docker Compose
- Caddy
- поддомены для API и кабинетов

## Поддомены

Рекомендуемый набор:

- `api.example.com`
- `admin.example.com`
- `company.example.com`

## Что уже подготовлено в проекте

- production compose: [deploy/compose.production.yml](/Users/aidima/Documents/Tulip/deploy/compose.production.yml)
- production env example: [deploy/.env.production.example](/Users/aidima/Documents/Tulip/deploy/.env.production.example)
- Caddy config: [deploy/Caddyfile](/Users/aidima/Documents/Tulip/deploy/Caddyfile)
- Dockerfile для API: [apps/api/Dockerfile](/Users/aidima/Documents/Tulip/apps/api/Dockerfile)
- Dockerfile для бота: [apps/bot/Dockerfile](/Users/aidima/Documents/Tulip/apps/bot/Dockerfile)
- Dockerfile для публичных кабинетов: [deploy/caddy/Dockerfile](/Users/aidima/Documents/Tulip/deploy/caddy/Dockerfile)

## Что нужно сделать на VPS

1. установить Docker и Docker Compose
2. скопировать проект на сервер
3. настроить DNS:
   - `api.<домен>` -> IP сервера
   - `admin.<домен>` -> IP сервера
   - `company.<домен>` -> IP сервера
4. создать файл `deploy/.env.production` по примеру
5. выполнить запуск:

```bash
cd /path/to/Tulip
cp deploy/.env.production.example deploy/.env.production
docker compose --env-file deploy/.env.production -f deploy/compose.production.yml up -d --build
```

## Что получится после запуска

- Caddy автоматически поднимет HTTPS
- API будет доступен на `https://api.<домен>`
- админ-кабинет будет доступен на `https://admin.<домен>`
- кабинет компании будет доступен на `https://company.<домен>`
- Telegram-бот будет выдавать кнопки уже на публичный адрес

## Важно

- `client.example.com` пока не включен в production compose, потому что клиентский кабинет еще не реализован как отдельное приложение
- PostgreSQL в production compose не опубликован наружу
- для первого боевого запуска стоит проверить firewall и открыть порты `80` и `443`
