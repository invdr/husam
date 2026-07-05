# HUSAM STROY INVEST — Документация проекта

Проект представляет собой React/Vite SPA для строительной компании **HUSAM STROY INVEST** с backend на PocketBase (`api.husam.ru`).

## Быстрый старт

- Установка: `npm install`
- Разработка: `npm run dev`
- Сборка: `npm run build`
- Проверки: `npm test`, `npm run lint`
- Прод-превью: `npm run preview`

Для локальной разработки можно задать `.env` с `VITE_POCKETBASE_URL=https://api.husam.ru`. Если переменная не задана, frontend использует этот URL как fallback.

## Структура документации

### Читать в новой сессии

- **[CURRENT_HANDOFF.md](./CURRENT_HANDOFF.md)** — короткое актуальное состояние проекта, последние изменения, проверки, деплой и что смотреть первым.
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — текущая архитектура runtime, данные, админка, UX и production.
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** — текущий регламент разработки, тестов и деплоя.

### Справка по текущему продукту

- **[FEATURES.md](./FEATURES.md)** — описание секций и функций сайта.
- **[IMPROVEMENTS_PLAN.md](./IMPROVEMENTS_PLAN.md)** — статус выполненных улучшений и оставшиеся идеи.
- **[pocketbase-collections.import.v2.json](./pocketbase-collections.import.v2.json)** — актуальный импорт схемы PocketBase.

### Архив / исторический контекст

- **[POCKETBASE_MIGRATION_PLAN.md](./POCKETBASE_MIGRATION_PLAN.md)** — исторический план миграции с Supabase на PocketBase; полезен для rollback/backups, но не является текущим чеклистом.
- **[MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md)** — архив миграции на Vite/React.
- **[GOOGLE_SETUP.md](./GOOGLE_SETUP.md)**, **[QUICK_START.md](./QUICK_START.md)**, **[TEST_DATA.md](./TEST_DATA.md)** — архив старого варианта Google Forms/Sheets.
- **[PORTFOLIO.md](./PORTFOLIO.md)** и **[DESKTOP_SECTIONS_AND_SCROLL_SNAP_PLAN.md](./DESKTOP_SECTIONS_AND_SCROLL_SNAP_PLAN.md)** — справочные/плановые документы.

## Основные каталоги

- `src/` — frontend-код (hooks, pages, components, contexts).
- `scripts/` — скрипты миграции данных/изображений в PocketBase.
- `docs/` — проектная документация.
- `public/`, `assets/` — статические ресурсы.

## Production

- Домен сайта: `https://husam.ru`
- Backend/API: `https://api.husam.ru`
- Сервер frontend: `77.222.63.88`
- Папка раздачи: `/var/www/husam-stroy`
- Деплой frontend: `npm run build`, затем `rsync -av --delete dist/ root@77.222.63.88:/var/www/husam-stroy/`
