# HUSAM STROY INVEST — Документация проекта

Проект представляет собой React/Vite SPA для строительной компании **HUSAM STROY INVEST** с backend на PocketBase (`api.husam.ru`).

## Быстрый старт

- Установка: `npm install`
- Разработка: `npm run dev`
- Сборка: `npm run build`
- Прод-превью: `npm run preview`

Для запуска нужен `.env` с `VITE_POCKETBASE_URL`.

## Структура документации

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — структура проекта и технологический стек
- **[FEATURES.md](./FEATURES.md)** — описание всех секций и функций страницы
- **[PORTFOLIO.md](./PORTFOLIO.md)** — описание блока портфолио и карусели (ex/index.html)
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** — рекомендации по развитию и альтернативные варианты
- **[POCKETBASE_MIGRATION_PLAN.md](./POCKETBASE_MIGRATION_PLAN.md)** — план миграции и текущий регламент по PocketBase

## Основные каталоги

- `src/` — frontend-код (hooks, pages, components, contexts).
- `scripts/` — скрипты миграции данных/изображений в PocketBase.
- `docs/` — проектная документация.
- `public/`, `assets/` — статические ресурсы.

