# Регламент разработки

Этот документ описывает текущее состояние проекта и правила безопасной работы с кодом. Исторические планы миграции лежат отдельно в `MIGRATION_CHECKLIST.md`, `POCKETBASE_MIGRATION_PLAN.md` и Google-документах.

## Быстрый вход

Для новой сессии сначала читать:

1. `docs/CURRENT_HANDOFF.md`
2. `docs/ARCHITECTURE.md`
3. `git status --short --branch`

Не нужно заранее перечитывать все документы. Для деталей искать точечно через `rg`.

## Локальная разработка

Требования:

- Node.js 20+
- npm

Команды:

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

`npm run build` запускает `scripts/generate-sitemap.mjs`. Если `POCKETBASE_URL` или `VITE_POCKETBASE_URL` не заданы, sitemap будет содержать только статические маршруты. Для полного sitemap с детальными проектами укажите `VITE_POCKETBASE_URL=https://api.husam.ru`.

## Окружение

Основные переменные:

- `VITE_POCKETBASE_URL=https://api.husam.ru`
- `VITE_YANDEX_METRIKA_ID=<id счетчика>` - опционально
- `SITE_URL=https://husam.ru` - используется генератором sitemap

Если `VITE_POCKETBASE_URL` не задан, frontend использует fallback `https://api.husam.ru` из `src/lib/pocketbase.js`.

## Данные и PocketBase

PocketBase является текущим backend для публичного сайта и админки:

- `projects` - каталог выполненных работ.
- `sale_projects` - готовые проекты на продажу.
- `project_types`, `sale_project_types` - категории и порядок.
- `faq`, `quiz`, `page_content`, `site_settings` - редактируемый контент.
- `admins` - авторизация клиентской админки.

Актуальный импорт схемы: `docs/pocketbase-collections.import.v2.json`.

При изменении полей PocketBase обновлять вместе:

- нормализацию в `src/hooks/useProjects.js` или `src/hooks/useSaleProjects.js`;
- формы админки в `src/components/admin/ProjectForm.jsx` или `SaleProjectForm.jsx`;
- карточки и детальные страницы;
- CSV/import helpers и тесты, если поле участвует в импорте;
- `docs/ARCHITECTURE.md` и `docs/CURRENT_HANDOFF.md`, если меняется контракт.

## Админка и загрузка изображений

Для `ProjectForm` и `SaleProjectForm` сохранять текущий контракт PocketBase:

- новые файлы загружаются через `images+`;
- после ответа PocketBase форма использует имена файлов, которые вернул backend;
- если менялся порядок, отдельным update сохраняется итоговый массив `images`.

Для готовых проектов top-level поля `sale_projects` являются основным контрактом. `attributes` использовать только для дополнительных пользовательских полей и технических `legacy_image_urls`. Не дублировать стандартные реестровые значения в legacy-колонках.

## UI и маршруты

Основные маршруты:

- `/`
- `/catalog`, `/catalog/:projectId`
- `/projects`, `/projects/:projectId`
- `/admin`, `/admin/login`
- `/privacy`, `/consent`

Карточки каталога и готовых проектов должны использовать семантические варианты `Card` (`variant="listing"`), чтобы visual skin жил внутри общих компонентов, а страницы управляли только layout.

Пагинация `/catalog` и `/projects` хранит страницу в query-параметре `page`. При переходе в детальную карточку query-строка сохраняется, чтобы возврат приводил пользователя на ту же страницу списка.

## Проверки перед merge/deploy

Минимум для обычных frontend-правок:

```bash
npm test
npm run lint
npm run build
```

Для пользовательских сценариев дополнительно:

```bash
npm run test:e2e
```

После изменений каталога или готовых проектов вручную проверить:

- открыть список;
- перейти на страницу 2+;
- открыть карточку;
- вернуться назад браузером и ссылкой "Вернуться";
- убедиться, что страница, фильтры и сортировка не сброшены.

## Production deploy

Текущий production frontend:

- домен: `https://husam.ru`
- сервер: `77.222.63.88`
- папка раздачи: `/var/www/husam-stroy`
- backend: `https://api.husam.ru`

Порядок:

```bash
npm test
npm run lint
npm run build
rsync -av --delete dist/ root@77.222.63.88:/var/www/husam-stroy/
curl -I https://husam.ru/
curl -fsSL https://husam.ru/ | rg 'assets/index-|assets/vendor-'
```

Не хранить SSH-пароли, токены и приватные ключи в документах или коде.

## Юридические страницы

Тексты `/privacy` и `/consent` находятся в `src/data/legalDocuments.js`. Сейчас оба документа датированы `30 июня 2026 г.`.

Если юридический текст меняется, проверить:

- ссылки в футере и формах;
- e2e/smoke на юридические страницы;
- дату `updatedAt`.

## Архивные документы

Эти файлы не являются текущей инструкцией разработки:

- `docs/MIGRATION_CHECKLIST.md` - историческая миграция на Vite/React.
- `docs/GOOGLE_SETUP.md`, `docs/QUICK_START.md`, `docs/TEST_DATA.md` - старый вариант Google Forms/Sheets.
- `docs/PORTFOLIO.md` - справка по старому/отдельному портфолио.
- `docs/DESKTOP_SECTIONS_AND_SCROLL_SNAP_PLAN.md` - план, не активный регламент.
