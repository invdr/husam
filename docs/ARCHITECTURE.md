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
- Списки проектов подписываются на realtime-события PocketBase через общий helper `subscribeToPocketbaseCollections`; ошибки autocancel/abort фильтруются через `isPocketbaseAbortError`.
- Готовые проекты нормализуются в `useSaleProjects`: top-level поля PocketBase остаются основным контрактом, а расширенные данные реестра (`explication`, `constructionMaterials`, `style`, `bedrooms`, `total_built_area` и т.д.) читаются из `attributes`.

## Админка `/admin`

- Авторизация:
  - `AuthContext` использует `pb.authStore`;
  - вход через `pb.collection("admins").authWithPassword(...)`;
  - защита роутов через `ProtectedRoute`.
- CRUD:
  - редакторы каталога и готовых проектов работают с коллекциями PocketBase;
  - формы `ProjectForm` и `SaleProjectForm` сохраняют записи и загружают изображения в file-поля;
  - порядок изображений меняется drag-and-drop и через выбор главного фото; после `images+` формы используют имена файлов, возвращённые PocketBase, а затем отдельным update сохраняют итоговый порядок `images`;
  - `TypesEditor`/`SaleTypesEditor`, `FAQEditor`, `SaleProjectsImportModal` переведены на PocketBase API.
- CSV-импорт готовых проектов принимает расширенный шаблон по реестру: поэтажную экспликацию, материалы строительства, цены/скидки, статус публикации, ссылки на фото и дополнительные площади. URL изображений из CSV не загружаются как файлы автоматически, а сохраняются в `attributes.legacy_image_urls` для последующей миграции.
- При ручном редактировании импортированного готового проекта форма сохраняет структурированную экспликацию, если общий текст экспликации не менялся, синхронизирует материал стен и текстовые признаки гаража/навеса/подвала с текущими полями формы.

## UI-компоненты

- Базовый `Card` поддерживает семантические варианты, включая `variant="listing"` для карточек каталога и готовых проектов.
- Визуальный skin карточки (фон, бордеры, hover, типографика заголовка, внутренние отступы header/content) живёт внутри `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`; страницы и карточки используют variants вместо косметических override-классов.
- `className` у общих компонентов сохранён для обратной совместимости старых вызовов, но новые каталожные карточки должны предпочитать семантические variants.

## Основные UX-функции

- Интеграция форм с мессенджером сохранена.
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

