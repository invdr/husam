# Архитектура проекта

## Технологический стек (runtime)

- **React 18 + Vite** — SPA и сборка.
- **Tailwind CSS** — стили и UI-слои.
- **React Router** — маршруты, включая `/admin`.
- **PocketBase** — единый backend:
  - коллекции данных (`projects`, `sale_projects`, `faq`, `site_settings`, `page_content`, `*_types`);
  - файловое хранилище (поля `images`);
  - auth для админки через коллекцию `admins`.
- **Яндекс.Метрика** — опциональная аналитика через `VITE_YANDEX_METRIKA_ID`.

## Данные и API

- Клиент PocketBase находится в `src/lib/pocketbase.js`.
- Если `VITE_POCKETBASE_URL` не задан, клиент использует fallback `https://api.husam.ru`.
- Публичные хуки читают данные напрямую из PocketBase:
  - `useProjects`, `useSaleProjects`;
  - `useProjectTypes`, `useSaleProjectTypes`;
  - `useSiteSettings`, `useFaq`, `usePageContent`, `useQuiz`.
- Для файлов используется `pb.files.getURL(record, filename)`.
- Списки проектов подписываются на realtime-события PocketBase через общий helper `subscribeToPocketbaseCollections`; ошибки autocancel/abort фильтруются через `isPocketbaseAbortError`.
- Готовые проекты нормализуются в `useSaleProjects`: top-level поля PocketBase являются основным контрактом, включая расширенные данные реестра (`explication_*`, `material_*`, `style`, `bedrooms`, `total_built_area` и т.д.). Legacy-дубли готовых проектов (`area`, `rooms`, `material`, `room_explanation`, `has_*`, ручной `discount`, `discounted_price`, `print_price`, `site_status`) не входят в актуальную схему; старые ответы читаются только как fallback.

## Роуты

- `/` — главная страница с секциями Hero, Services, Results, Calculator, Portfolio, Process, FAQ, Contacts.
- `/catalog` и `/catalog/:projectId` — каталог выполненных работ.
- `/projects` и `/projects/:projectId` — готовые проекты на продажу.
- `/admin` и `/admin/login` — клиентская админка поверх PocketBase.
- `/privacy` и `/consent` — юридические страницы из `src/data/legalDocuments.js`.

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
- CSV-импорт готовых проектов принимает расширенный шаблон по реестру: поэтажную экспликацию, материалы строительства, текущую/старую стоимость, статус публикации, ссылки на фото и дополнительные площади. Эти значения пишутся в top-level поля `sale_projects`; скидка считается автоматически из `old_price` и `price`, а URL изображений из CSV не загружаются как файлы автоматически и сохраняются в `attributes.legacy_image_urls` для последующей миграции.
- При ручном добавлении и редактировании готового проекта форма показывает те же реестровые поля, что и CSV-шаблон, и сохраняет их в top-level поля PocketBase. `attributes` используется для дополнительных пользовательских полей и технического `legacy_image_urls`.

## UI-компоненты

- Базовый `Card` поддерживает семантические варианты, включая `variant="listing"` для карточек каталога и готовых проектов.
- Визуальный skin карточки (фон, бордеры, hover, типографика заголовка, внутренние отступы header/content) живёт внутри `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`; страницы и карточки используют variants вместо косметических override-классов.
- `className` у общих компонентов сохранён для обратной совместимости старых вызовов, но новые каталожные карточки должны предпочитать семантические variants.

## Основные UX-функции

- Интеграция форм с мессенджером сохранена.
- Перед открытием заявки текст дополняется контекстом источника: URL страницы, форма/проект и UTM-метки.
- Юридические страницы `/privacy` и `/consent` подключены как обычные React Router routes.
- Пагинация `/catalog` и `/projects` хранит страницу в query-параметре `page`, а переход в детальную карточку сохраняет query-строку. Это нужно, чтобы браузерная кнопка назад и ссылки "Вернуться" возвращали пользователя на ту же страницу списка.
- `AnalyticsBridge` и `src/lib/analytics.js` отвечают за инициализацию Метрики, SPA-хиты и цели.
- Анимации и визуальные хуки (`useReveal`, `useCountUp`) не зависят от backend.
- В админке работают:
  - create/update/delete;
  - reorder внутри категории;
  - переключение `featured` и `published`.

## Окружение и деплой

- Для frontend достаточно:
  - `VITE_POCKETBASE_URL=https://api.husam.ru`
- Для аналитики:
  - `VITE_YANDEX_METRIKA_ID=<номер счетчика>`
- Frontend остается статическим (`dist/`), backend живет отдельно на VPS (`api.husam.ru`).
- После `npm run build` запускается `scripts/generate-sitemap.mjs`, который пишет `dist/sitemap.xml` и добавляет детальные страницы из PocketBase при доступном API.
- Текущий production frontend раздаётся из `/var/www/husam-stroy` на сервере `77.222.63.88`.
- Текущий деплой frontend: `npm run build`, затем `rsync -av --delete dist/ root@77.222.63.88:/var/www/husam-stroy/`.
- Проверка после деплоя: `curl -I https://husam.ru/` и проверка, что `index.html` ссылается на свежие hashed assets.

## Источники истины

- Быстрый вход в новую сессию: `docs/CURRENT_HANDOFF.md`.
- Актуальная схема и runtime-контракты: этот файл и `docs/DEVELOPMENT.md`.
- Исторический план миграции и rollback по PocketBase: `docs/POCKETBASE_MIGRATION_PLAN.md`.
