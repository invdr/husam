# План улучшений проекта HUSAM

Документ описывает функционал после перехода на PocketBase.

---

## Фаза 1. Реалтайм-обновления ✅

### Цель
Каталог на главной и странице каталога обновляется автоматически при изменениях в админке (без перезагрузки).

### Шаги
- [x] Включить realtime-обновления из PocketBase для коллекции `projects`
- [x] Добавить в `useProjects` подписку `pb.collection("projects").subscribe(...)`
- [x] При событии INSERT/UPDATE/DELETE — перезапросить список проектов
- [x] Очистить подписку при размонтировании хука

### Зависимости
- PocketBase realtime (встроено)

---

## Фаза 2. Улучшения админ-панели

### 2.1 Поиск по проектам ✅
- [x] Добавить поле поиска над списком проектов
- [x] Фильтрация по title, id, type, location (debounce 300 ms)
- [x] Показывать количество найденных

### 2.2 Drag-and-drop порядка проектов ✅
- [x] Установить библиотеку (@dnd-kit/core, @dnd-kit/sortable)
- [x] Добавить drag-handle на карточки в CatalogEditor
- [x] При drop — обновлять `sort_order` в PocketBase через batch update

### 2.3 Drag-and-drop загрузка изображений ✅
- [x] В ProjectForm — зона drop для файлов (помимо input)
- [x] Подсветка при наведении с файлами
- [x] Валидация: только image/*, лимит размера (5 MB)

### 2.4 Модальное подтверждение удаления ✅
- [x] Создать компонент `ConfirmModal` (title, message, onConfirm, onCancel)
- [x] Заменить `confirm()` в CatalogEditor на этот модал
- [x] Стилизовать под дизайн проекта

### 2.5 Пагинация ✅
- [x] При количестве проектов > 12 — показывать пагинацию (12 на страницу)
- [x] Пагинация в каталоге и в админке (client-side slice)

---

## Фаза 3. SEO ✅

### 3.1 Meta-теги и Open Graph
- [x] Добавить react-helmet-async или аналог
- [x] Динамические meta для `/catalog` и при открытии модалки проекта (og:title, og:image, og:description)
- [x] Базовые meta для главной (title, description)

### 3.2 JSON-LD
- [x] Добавить JSON-LD Product/Project schema для карточек проектов
- [x] Внедрять скрипт в head при рендере каталога

---

## Фаза 4. Производительность ✅

### 4.1 Lazy load админки
- [x] Обернуть роуты `/admin`, `/admin/login` в `React.lazy()`
- [x] Добавить `Suspense` с fallback (спиннер или skeleton)

### 4.2 Lazy load изображений
- [x] Атрибут `loading="lazy"` для `<img>` в ProjectImage
- [ ] Опционально: Intersection Observer для отложенной загрузки

### 4.3 Skeleton при загрузке
- [x] Создать компонент `ProjectCardSkeleton`
- [x] Показывать 6 skeleton-карточек вместо спиннера в Portfolio и Catalog

---

## Фаза 5. UX ✅

### 5.1 Toast-уведомления
- [x] Установить react-hot-toast или sonner
- [x] Заменить `alert()` и inline-сообщения об ошибках на toast
- [x] Показывать success toast при сохранении/удалении в админке

### 5.2 Breadcrumbs в админке
- [x] Компонент Breadcrumbs: Админка > Каталог > [Редактировать проект]
- [x] Отображать над заголовком в Admin.jsx

### 5.3 Черновик / опубликован (опционально) ✅
- [x] Добавить поле `published: boolean` в таблицу `projects`
- [x] В админке — переключатель "Опубликован"
- [x] useProjects — фильтровать только `published = true` для публичных страниц

---

## Фаза 6. Финализация и чистка

### 6.1 Удаление fallback ✅
- [x] После стабилизации — убрать fallback на `portfolio.js` из useProjects
- [x] Удалить или архивировать `src/data/portfolio.js`

### 6.2 Тесты
- [ ] Unit-тесты для useProjects (mock PocketBase)
- [ ] Тесты для ProjectForm (валидация, submit)

### 6.3 Документация ✅
- [x] Обновить README — стек, PocketBase, env, деплой
- [x] Добавить ссылки на ARCHITECTURE.md и POCKETBASE_MIGRATION_PLAN.md

---

## Приоритеты

| Приоритет | Фаза                     | Оценка      |
|----------|---------------------------|-------------|
| Высокий  | 1. Реалтайм               | 1–2 часа    |
| Высокий  | 2.4 Модал удаления        | ~30 мин     |
| Средний  | 5.1 Toast                 | ~30 мин     |
| Средний  | 4.3 Skeleton              | ~1 час      |
| Средний  | 2.1 Поиск                 | ~1 час      |
| Низкий   | 2.2 Drag порядок          | 2–3 часа    |
| Низкий   | 2.3 Drag загрузка         | ~1 час      |
| Низкий   | 3. SEO                    | 2–3 часа    |
| Низкий   | 4.1 Lazy admin            | ~30 мин     |
| Низкий   | 5.2 Breadcrumbs           | ~30 мин     |
