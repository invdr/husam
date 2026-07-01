# Архитектура проекта

## Технологический стек (runtime)

- **React 18 + Vite** — SPA и сборка.
- **Tailwind CSS** — стили и UI-слои.
- **React Router** — маршруты, включая `/admin`.
- **PocketBase** — единый backend:
  - коллекции данных (`projects`, `sale_projects`, `faq`, `site_settings`, `page_content`, `*_types`);
  - файловое хранилище (поля `images`);
  - auth для админки через коллекцию `admins`.

## Данные и API

- Клиент PocketBase находится в `src/lib/pocketbase.js`.
- Публичные хуки читают данные напрямую из PocketBase:
  - `useProjects`, `useSaleProjects`;
  - `useProjectTypes`, `useSaleProjectTypes`;
  - `useSiteSettings`, `useFaq`, `usePageContent`, `useQuiz`.
- Для файлов используется `pb.files.getURL(record, filename)`.

## Админка `/admin`

- Авторизация:
  - `AuthContext` использует `pb.authStore`;
  - вход через `pb.collection("admins").authWithPassword(...)`;
  - защита роутов через `ProtectedRoute`.
- CRUD:
  - редакторы каталога и готовых проектов работают с коллекциями PocketBase;
  - формы `ProjectForm` и `SaleProjectForm` сохраняют записи и загружают изображения в file-поля;
  - `TypesEditor`/`SaleTypesEditor`, `FAQEditor`, `SaleProjectsImportModal` переведены на PocketBase API.

## Основные UX-функции

- WhatsApp-интеграция форм сохранена.
- Анимации и визуальные хуки (`useReveal`, `useCountUp`) не зависят от backend.
- В админке работают:
  - create/update/delete;
  - reorder внутри категории;
  - переключение `featured` и `published`.

## Окружение и деплой

- Для frontend нужен только:
  - `VITE_POCKETBASE_URL=https://api.husam.ru`
- Frontend остается статическим (`dist/`), backend живет отдельно на VPS (`api.husam.ru`).

## Источник истины по миграции

- Операционный план, этапы и rollback описаны в `docs/POCKETBASE_MIGRATION_PLAN.md`.

