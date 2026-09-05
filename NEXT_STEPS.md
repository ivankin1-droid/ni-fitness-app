# NI FITNESS v6.1 — продолжение после ручного создания таблиц

Эта сборка совместима с тем, что было создано вручную в Supabase на iPhone:
- profiles
- monthly_reviews
- monthly_reviews.month = text
- monthly_reviews.measurement = text
- monthly_reviews.status по умолчанию pending

## Дальше нужны 3 переменные Vercel

1. SUPABASE_URL
2. SUPABASE_SERVICE_ROLE_KEY
3. TELEGRAM_BOT_TOKEN

Не публикуйте SERVICE ROLE KEY и TELEGRAM BOT TOKEN в GitHub, app.js или сообщениях.

## Где найти Supabase URL и service_role
Supabase → Settings / Project Settings → API.

Project URL копируется в SUPABASE_URL.
Секретный ключ service_role копируется в SUPABASE_SERVICE_ROLE_KEY.

## Где взять токен Telegram
@BotFather → /mybots → @nifitnesspro_bot → API Token.
В Vercel он называется TELEGRAM_BOT_TOKEN.

## Vercel
Project nifitnessminiappv3editable → Settings → Environment Variables.
Добавить три переменные выше для Production.

## Потом
Загрузить содержимое этой сборки в GitHub репозиторий ni-fitness-app.
Особенно важно загрузить папку api и файлы:
admin.html
admin.js
index.html
app.js

После deployment открыть Mini App именно через Telegram.

Первый запуск создаст пользователя в profiles.
Затем в Supabase в profiles у своего Telegram ID изменить:
role = admin
subscription_active = true

После повторного открытия Mini App в профиле появится кнопка ADMIN.
