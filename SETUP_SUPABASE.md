# NI FITNESS v6 — подключение Supabase

Эта версия делает реальный доступ по Telegram ID. Клиент не может сам выбрать другой рацион.

## 1. Создайте Supabase
1. Откройте https://supabase.com и создайте проект.
2. В проекте откройте **SQL Editor → New query**.
3. Откройте файл `database.sql`, скопируйте всё → **Run**.

## 2. Возьмите 2 значения Supabase
В Supabase откройте **Project Settings → API**:
- `Project URL` → понадобится как `SUPABASE_URL`.
- `service_role` secret key → понадобится как `SUPABASE_SERVICE_ROLE_KEY`.

**service_role нельзя вставлять в app.js, GitHub или отправлять клиентам.**
Он вводится только в Vercel Environment Variables.

## 3. Добавьте 3 секрета в Vercel
Vercel → проект `nifitnessminiappv3editable` → **Settings → Environment Variables**.

Создайте:
- `SUPABASE_URL` = Project URL
- `SUPABASE_SERVICE_ROLE_KEY` = service_role key
- `TELEGRAM_BOT_TOKEN` = токен @nifitnesspro_bot от BotFather

Выберите Production / Preview / Development или хотя бы Production.
Сохраните.

## 4. Загрузите v6 в GitHub
Загрузите содержимое этого ZIP в корень `ivankin1-droid/ni-fitness-app` поверх текущих файлов.

Папку `api` тоже нужно загрузить. GitHub на iPhone может не позволить выбрать папку целиком — тогда создайте её через Add file → Create new file, например `api/session.js`, или загрузите файлы через компьютер. Самый удобный вариант — GitHub Desktop/веб с компьютера.

После коммита Vercel сделает новый deployment.

## 5. Первый запуск
Откройте Mini App через @nifitnesspro_bot.
v6 автоматически создаст строку клиента в Supabase.

В профиле приложения появится его **Telegram ID**.

### Сделать себя администратором
Supabase → Table Editor → `profiles`.
Найдите строку со своим Telegram ID и поменяйте `role` с `client` на `admin`.
Также включите `subscription_active = true`.

Закройте Mini App и откройте снова.
В профиле появится кнопка **«Открыть ADMIN»**.

## 6. Как выдавать доступ клиенту
Клиент один раз открывает Mini App → появляется в ADMIN.
Вы открываете клиента и назначаете:
- калорийность;
- активна ли подписка;
- дату окончания;
- доступные материалы.

После сохранения клиент закрывает и заново открывает Mini App — он видит только свой назначенный план.

## 7. Разбор месяца
Клиент → Профиль → «Разбор прогресса от Никиты» → отправляет отчёт.
В ADMIN он появляется в разделе «Разборы месяца».
Вы пишете ответ → «Отправить разбор».
После следующего открытия клиент увидит ваш ответ.

## Важно про оплату
v6 уже умеет хранить статус подписки, но пока вы включаете/выключаете её вручную в ADMIN.
Следующим этапом можно связать Т-Банк с webhook: успешный автоплатёж автоматически продлевает `subscription_until`, отмена/неуспешное списание приостанавливает доступ.
