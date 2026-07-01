# План миграции с Supabase на PocketBase

> **Цель:** заменить Supabase на PocketBase, сохранив текущий сайт, простую админку `/admin` для заказчика и возможность отката на рабочую Supabase-версию из `main`.

---

## 1. Почему PocketBase Подходит Для Этого Проекта

PocketBase подходит под текущую ситуацию лучше, чем самописный backend, потому что проект небольшой и контентный:

- мало данных;
- нужна простая админка для заказчика;
- нужны проекты, категории, FAQ, настройки, контент и картинки;
- нужен backend на VPS без зависимости от Supabase;
- не нужен сложный realtime;
- не нужен отдельный PostgreSQL;
- не нужен отдельный S3 на первом этапе.

PocketBase уже включает:

- embedded database на SQLite;
- встроенную админ-панель;
- авторизацию;
- хранение файлов;
- REST API;
- JavaScript SDK;
- realtime, если он когда-нибудь понадобится.

Официально PocketBase позиционируется как open source backend “in 1 file” с database, auth, file storage и admin dashboard: <https://pocketbase.io/>.

---

## 2. Итоговая Архитектура

Целевая схема:

```txt
husam.ru
  -> статический React-сайт из dist

api.husam.ru
  -> PocketBase на VPS
```

Кто чем пользуется:

```txt
Посетитель сайта
  -> React
  -> PocketBase API

Заказчик
  -> /admin на сайте
  -> PocketBase API

Разработчик
  -> PocketBase Admin UI
```

Что важно:

- текущую простую админку сайта `/admin` сохраняем;
- встроенную админку PocketBase использует только разработчик;
- Supabase после миграции не нужен в production;
- картинки храним внутри PocketBase;
- realtime не используем;
- сложный fallback `supabase/pocketbase` не делаем, откат через git/main.

---

## 3. Решения По Спорным Моментам

### 3.1 Где хранить изображения

Выбранный вариант: **PocketBase file storage**.

Почему:

- быстрее внедрить;
- меньше инфраструктуры;
- картинки привязаны к записям проектов;
- не нужен отдельный S3/CDN;
- объём данных небольшой.

Позже можно перейти на S3-compatible storage, потому что PocketBase поддерживает внешний S3 storage через настройки dashboard.

### 3.2 Нужен ли realtime

Для этого сайта realtime не нужен.

Realtime был бы нужен, если бы посетитель должен был видеть изменения без перезагрузки страницы:

```txt
Заказчик добавил проект
  -> у посетителя проект появился сам без reload
```

Для каталога строительных проектов достаточно обычного поведения:

```txt
Заказчик добавил проект
  -> посетитель обновил страницу
  -> видит новый проект
```

### 3.3 Нужен ли fallback на Supabase

Внутри этой ветки сложный fallback не нужен.

Откат:

```txt
Если PocketBase-версия не готова:
  -> не деплоим её
  -> остаёмся на main с Supabase

Если уже задеплоили и нашли проблему:
  -> возвращаем старый dist из main
  -> возвращаем Supabase env
```

Supabase-код можно удалить только после полной проверки PocketBase-версии.

---

## 4. Что Нужно Сделать Вручную

Эти шаги выполняет разработчик/владелец проекта, не ИИ.

### 4.1 Купить VPS

Минимально достаточно:

- 1 CPU;
- 1 GB RAM;
- 10-20 GB SSD;
- Ubuntu 22.04/24.04;
- доступ по SSH.

Подойдут обычные российские VPS-провайдеры.

### 4.2 Настроить домен

Создать DNS-запись:

```txt
api.husam.ru -> IP VPS
```

Основной сайт остаётся:

```txt
husam.ru -> текущий сайт
```

### 4.3 Дать ИИ доступные вводные

Перед этапом деплоя PocketBase нужно передать ИИ:

- IP VPS;
- ОС сервера;
- есть ли root SSH;
- какой домен будет у API;
- где лежит текущий сайт на сервере.

Пароли и приватные ключи в чат лучше не вставлять. Если нужно выполнить команды, лучше запускать их у себя в терминале.

---

## 5. Что Может Сделать ИИ

ИИ может выполнить большую часть работы в репозитории:

- подготовить схему коллекций PocketBase;
- написать скрипт миграции Supabase -> PocketBase;
- написать скрипт скачивания/переноса изображений;
- подключить PocketBase JS SDK;
- переписать публичные хуки;
- переписать `AuthContext`;
- сохранить текущую `/admin` админку;
- обновить `.env.example`;
- добавить инструкции деплоя;
- прогнать `npm run lint`, `npm run build`, `npm test`;
- подготовить команды для VPS.

ИИ не может сам:

- купить VPS;
- настроить DNS у регистратора;
- создать production-домен без доступов;
- зайти в панель хостинга без твоего участия;
- безопасно хранить секреты вместо тебя.

---

## 6. Этапы Миграции

## Этап 0. Подготовка И Снимок Текущего Состояния

**Цель:** иметь возможность откатиться.

Делает ИИ:

- Проверяет текущие Supabase-зависимости.
- Фиксирует список таблиц и полей.
- Проверяет текущие скрипты.
- Готовит список env-переменных.

Делаешь ты:

- Убеждаешься, что `main` ветка содержит рабочую Supabase-версию.
- Не удаляешь Supabase-проект до конца миграции.
- По возможности сохраняешь экспорт текущих данных.

Проверка:

```powershell
npm run lint
npm run build
```

---

## Этап 1. Поднять PocketBase На VPS

**Цель:** получить рабочий backend по адресу `https://api.husam.ru`.

Делаешь ты:

1. Покупаешь VPS.
2. Создаёшь DNS-запись `api.husam.ru`.
3. Подключаешься к серверу по SSH.
4. Выполняешь команды установки, которые подготовит ИИ.
5. Создаёшь первого администратора PocketBase.

Делает ИИ:

- Готовит команды установки PocketBase.
- Готовит `systemd` service.
- Готовит nginx reverse proxy.
- Готовит инструкцию по HTTPS.

Примерная схема установки:

```txt
/opt/pocketbase/
  pocketbase
  pb_data/
  pb_migrations/
```

Важный момент:

- `pb_data` нельзя удалять;
- в `pb_data` будут база и файлы;
- эту папку нужно бэкапить.

---

## Этап 2. Создать Коллекции PocketBase

**Цель:** воссоздать структуру данных Supabase в PocketBase.

Коллекции:

```txt
projects
project_types
sale_projects
sale_project_types
site_settings
faq
page_content
admins или users
```

### `projects`

Поля:

- `slug` или `external_id` — старый `id` из Supabase;
- `title` — text;
- `description` — text;
- `type` — text;
- `area` — text;
- `duration` — text;
- `budget` — text;
- `location` — text;
- `scope` — json;
- `images` — file, multiple;
- `testimonial` — text;
- `client_name` — text;
- `sort_order` — number;
- `sort_order_in_category` — number;
- `featured` — bool;
- `published` — bool;
- `attributes` — json.

### `project_types`

Поля:

- `name` — text;
- `sort_order` — number.

### `sale_projects`

Поля:

- `slug` или `external_id` — старый `id`;
- `title` — text;
- `description` — text;
- `has_garage` — bool;
- `has_canopy` — bool;
- `has_basement` — bool;
- `room_explanation` — text;
- `type` — text;
- `area` — text;
- `rooms` — text;
- `floors` — text;
- `material` — text;
- `price` — text;
- `old_price` — text;
- `construction_price_from` — text;
- `status` — text;
- `images` — file, multiple;
- `sort_order` — number;
- `sort_order_in_category` — number;
- `featured` — bool;
- `published` — bool;
- `attributes` — json;
- `plot_area` — text;
- `house_area` — text;
- `usable_area` — text;
- `implementation_period` — text;
- `house_dimensions` — text.

### `sale_project_types`

Поля:

- `name` — text;
- `sort_order` — number.

### `site_settings`

Поля:

- `key` — text;
- `value` — text.

### `faq`

Поля:

- `question` — text;
- `answer` — text;
- `sort_order` — number.

### `page_content`

Поля:

- `key` — text;
- `value` — text.

Делает ИИ:

- Готовит точную схему коллекций.
- Может подготовить PocketBase migrations, если будем вести схему кодом.

Делаешь ты:

- Проверяешь коллекции в PocketBase Admin UI.

---

## Этап 3. Настроить Правила Доступа

**Цель:** публичный сайт может читать опубликованные данные, а писать может только авторизованный админ сайта.

Рекомендуемые правила:

### Для публичных коллекций

Для чтения:

```txt
published = true
```

или для коллекций без `published`:

```txt
публичное чтение разрешено
```

Публичное чтение нужно для:

- `projects`;
- `project_types`;
- `sale_projects`;
- `sale_project_types`;
- `site_settings`;
- `faq`;
- `page_content`.

Для записи:

```txt
только авторизованный админ/пользователь
```

Вариант проще:

- создать auth collection для заказчика, например `admins`;
- логин `/admin` на сайте работает через эту коллекцию;
- все create/update/delete разрешить только авторизованным из `admins`.

Делает ИИ:

- Подсказывает точные rules под выбранную схему.
- Переписывает `ProtectedRoute`/`AuthContext`.

Делаешь ты:

- Создаёшь админа заказчика вручную или через UI.
- Проверяешь вход в `/admin`.

---

## Этап 4. Перенести Данные Из Supabase

**Цель:** скопировать все записи из Supabase в PocketBase.

Делает ИИ:

- Пишет скрипт миграции:

```txt
Supabase -> JSON -> PocketBase
```

или напрямую:

```txt
Supabase -> PocketBase API
```

- Переносит:
  - `projects`;
  - `project_types`;
  - `sale_projects`;
  - `sale_project_types`;
  - `site_settings`;
  - `faq`;
  - `page_content`.

Делаешь ты:

- Запускаешь скрипт локально с VPN, если Supabase без VPN не открывается.
- Проверяешь данные в PocketBase Admin UI.

Рекомендация:

- На первом прогоне переносить в тестовый PocketBase.
- Не удалять Supabase.

---

## Этап 5. Перенести Изображения

**Цель:** картинки должны храниться в PocketBase, а не в Supabase Storage.

Делает ИИ:

- Пишет скрипт:
  1. читает `images` из Supabase;
  2. скачивает файлы;
  3. загружает их в file-поля PocketBase;
  4. связывает файлы с нужными проектами.

Делаешь ты:

- Запускаешь скрипт с VPN, если Supabase недоступен без него.
- Проверяешь, что карточки и детальные страницы показывают картинки.

Важно:

- Для `projects.images` и `sale_projects.images` в PocketBase лучше использовать file-поле с multiple files.
- В React нужно будет получать URL файла через PocketBase API/SDK.

---

## Этап 6. Подключить PocketBase SDK Во Фронте

**Цель:** заменить Supabase SDK на PocketBase SDK.

Делает ИИ:

- Устанавливает JS SDK:

```powershell
npm install pocketbase
```

- Создаёт клиент:

```txt
src/lib/pocketbase.js
```

- Добавляет env:

```txt
VITE_POCKETBASE_URL=https://api.husam.ru
```

- Переписывает публичные хуки:
  - `useProjects`;
  - `useSaleProjects`;
  - `useProjectTypes`;
  - `useSaleProjectTypes`;
  - `useSiteSettings`;
  - `useFaq`;
  - `usePageContent`;
  - `useQuiz`.

Пример чтения:

```js
await pb.collection("projects").getFullList({
  filter: "published = true",
  sort: "sort_order,sort_order_in_category",
});
```

PocketBase JS SDK поддерживает `getList`, `create`, `update`, `delete` и file upload через `FormData`.

Делаешь ты:

- Проверяешь главную, каталог, готовые проекты, FAQ, контакты.

---

## Этап 7. Сохранить И Переподключить Админку `/admin`

**Цель:** заказчик продолжает пользоваться вашей простой админкой, не PocketBase dashboard.

Делает ИИ:

- Переписывает:
  - `AuthContext`;
  - `AdminLogin`;
  - `ProtectedRoute`;
  - `CatalogEditor`;
  - `SaleProjectsEditor`;
  - `ProjectForm`;
  - `SaleProjectForm`;
  - `TypesEditor`;
  - `SaleTypesEditor`;
  - `FAQEditor`;
  - `SettingsEditor`;
  - `QuizEditor`;
  - `SaleProjectsImportModal`.

Операции:

- create;
- update;
- delete;
- upload images;
- reorder;
- toggle `featured`;
- toggle `published`.

Делаешь ты:

- Создаёшь аккаунт заказчика.
- Проверяешь, что заказчик может:
  - войти;
  - добавить проект;
  - загрузить картинки;
  - изменить FAQ;
  - изменить контакты;
  - выйти.

---

## Этап 8. Проверка Перед Деплоем

Делает ИИ:

```powershell
npm run lint
npm run build
npm test
```

Проверяет:

- нет импортов Supabase в runtime;
- нет прямых запросов к Supabase на публичных страницах;
- `dist` собирается;
- картинки открываются с `api.husam.ru`;
- `/admin` работает.

Делаешь ты:

- Тестируешь глазами:
  - главная;
  - каталог;
  - готовые проекты;
  - детальные страницы;
  - FAQ;
  - контакты;
  - квиз;
  - `/admin/login`;
  - создание/редактирование проекта.

---

## Этап 9. Деплой

Делаешь ты:

1. Загружаешь `dist` на сервер сайта, как раньше.
2. Проверяешь, что `api.husam.ru` открывается.
3. Проверяешь, что в production env есть:

```txt
VITE_POCKETBASE_URL=https://api.husam.ru
```

4. Проверяешь сайт в браузере.

Делает ИИ:

- Готовит список файлов для деплоя.
- Готовит nginx/server config, если понадобится.
- Помогает по ошибкам из браузера/Network/Console.

---

## Этап 10. После Миграции

Что оставить временно:

- Supabase-проект;
- Supabase env;
- main-ветку с рабочим Supabase-кодом.

Что можно удалить позже:

- `@supabase/supabase-js`;
- `src/lib/supabase.js`;
- Supabase-хуки/скрипты экспорта;
- Supabase setup docs, если они больше не нужны.

Удалять только после нескольких успешных production-проверок.

---

## 7. Минимальные Бэкапы

Сложные бэкапы не нужны, но минимальный регламент нужен.

PocketBase хранит данные в:

```txt
pb_data/
```

Минимально:

- раз в неделю скачивать `pb_data`;
- перед крупными изменениями скачивать `pb_data`;
- хранить 2-3 последние копии.

Простой ручной backup:

```txt
остановить PocketBase
скачать/заархивировать pb_data
запустить PocketBase
```

Позже можно автоматизировать.

---

## 8. План Отката

Если PocketBase-версия не готова:

```txt
не деплоим её
остаёмся на main с Supabase
```

Если PocketBase-версия уже задеплоена и сломалась:

```txt
1. вернуть старый dist из main
2. вернуть старые Supabase env
3. оставить PocketBase для диагностики
```

Если проблема только в данных:

```txt
1. зайти в PocketBase Admin UI
2. исправить запись
3. обновить страницу сайта
```

---

## 9. Критерии Готовности

Миграция считается завершённой, если:

- [ ] PocketBase доступен по `https://api.husam.ru`.
- [ ] Созданы все коллекции.
- [ ] Данные перенесены из Supabase.
- [ ] Картинки перенесены в PocketBase.
- [ ] Публичный сайт читает данные из PocketBase.
- [ ] `/admin` сайта работает через PocketBase.
- [ ] Заказчик может добавлять/редактировать проекты.
- [ ] `npm run lint` проходит.
- [ ] `npm run build` проходит.
- [ ] На публичных страницах нет запросов к Supabase.
- [ ] Есть простой план отката на Supabase/main.

---

## 10. Рекомендуемый Порядок Работы С ИИ

1. Попросить ИИ подготовить PocketBase schema.
2. Вручную поднять PocketBase на VPS.
3. Попросить ИИ написать migration script.
4. Вручную запустить migration script.
5. Попросить ИИ подключить публичные хуки к PocketBase.
6. Проверить сайт.
7. Попросить ИИ переписать `/admin`.
8. Проверить админку.
9. Попросить ИИ убрать Supabase-зависимости.
10. Деплой.

---

## 11. Итоговое Решение

Для этого проекта оптимальный вариант:

```txt
PocketBase на VPS
+ картинки внутри PocketBase
+ текущая /admin админка сайта
+ PocketBase Admin UI только для разработчика
+ откат через main/Supabase
```

Это быстрее и проще, чем писать свой backend, и надёжнее для аудитории сайта, чем зависимость от Supabase Cloud.
