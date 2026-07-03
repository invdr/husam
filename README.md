# HUSAM STROY INVEST

Одностраничный промо‑сайт строительной компании **HUSAM STROY INVEST**, построенный на React, Vite и Tailwind CSS.

## 🚀 Быстрый старт

### Требования

- **Node.js** версии 20+ (рекомендуется LTS)
- **npm** или **yarn** для управления зависимостями

### Установка

```powershell
# Установка зависимостей
npm install
```

### Разработка

```powershell
# Запуск dev-сервера
npm run dev
```

Приложение будет доступно по адресу `http://localhost:5173`

### Переменные окружения (PocketBase)

Для работы каталога проектов и админки нужен бэкенд PocketBase. Скопируйте `.env.example` в `.env` и укажите:

- `VITE_POCKETBASE_URL` — URL API PocketBase (например, `https://api.husam.ru`)
- `VITE_YANDEX_METRIKA_ID` — номер счетчика Яндекс.Метрики; если не задан, аналитика не инициализируется

### Production-сборка

```powershell
# Создание оптимизированной сборки
npm run build

# Предварительный просмотр production-сборки
npm run preview
```

Собранные файлы будут находиться в папке `dist/`. После сборки автоматически запускается генерация `dist/sitemap.xml`; при наличии `POCKETBASE_URL` или `VITE_POCKETBASE_URL` в sitemap добавляются детальные страницы опубликованных проектов.

## 📁 Структура проекта

```
husam/
├── src/
│   ├── components/          # React-компоненты
│   │   ├── common/          # Общие компоненты (Header, Footer, Icon, etc.)
│   │   ├── sections/        # Секции страницы (Hero, Services, FAQ, etc.)
│   │   └── forms/           # Формы (ContactForm, Calculator)
│   ├── hooks/               # Кастомные хуки (useReveal, useCountUp)
│   ├── utils/               # Утилиты (validation, messenger, constants)
│   ├── styles/              # Глобальные стили (index.css)
│   ├── assets/              # Статические ресурсы (изображения)
│   ├── App.jsx              # Главный компонент приложения
│   └── main.jsx             # Точка входа
├── docs/                    # Документация проекта
├── ex/                      # Демо-версия с расширенными функциями
├── index.html               # HTML-шаблон
├── vite.config.js           # Конфигурация Vite
├── tailwind.config.js       # Конфигурация Tailwind CSS
└── package.json             # Зависимости и скрипты
```

## 🛠 Технологический стек

- **React 18** — библиотека для создания UI
- **Vite** — сборщик и dev-сервер
- **Tailwind CSS** — utility-first CSS фреймворк
- **PocketBase** — БД/файлы/аутентификация админки
- **Lucide React** — иконки
- **React Router** — маршрутизация

## ⚙️ Админка и контент

- Админка `/admin` работает с PocketBase-коллекциями проектов, готовых проектов, типов, FAQ, квиза и настроек сайта.
- Проекты и готовые проекты поддерживают загрузку нескольких изображений, drag-and-drop порядок и выбор главного фото.
- Готовые проекты можно массово импортировать из CSV-шаблона, совместимого с реестром: поддерживаются поэтажная экспликация, материалы строительства, площади, цены/скидки, статус публикации и legacy-ссылки на фотографии.
- UI-карточки каталога используют семантический `Card variant="listing"`, чтобы визуальный стиль карточки оставался внутри компонента, а страницы управляли только композицией.

## 📋 Доступные команды

```powershell
# Разработка
npm run dev          # Запуск dev-сервера на http://localhost:5173

# Сборка
npm run build        # Создание production-сборки в папке dist/

# Тестирование сборки
npm run preview      # Предварительный просмотр production-сборки

# Линтинг (если настроен ESLint)
npm run lint         # Проверка кода линтером
npm run test:e2e     # Playwright smoke-тесты основных пользовательских сценариев
```

## 🎨 Особенности

- ⚡ **Быстрая загрузка** — code splitting, локальные шрифты и приоритетная загрузка hero-изображения
- 🎯 **Оптимизация бандлов** — разделение vendor-бандлов (react, router, icons)
- 📱 **Адаптивный дизайн** — корректная работа на всех устройствах
- 🎭 **Анимации** — плавные появления элементов при скролле
- 📊 **Счетчики** — анимированные счетчики статистики
- 📈 **Яндекс.Метрика** — SPA-хиты и цели `click_phone`, `click_messenger`, `contact_form_submit`, `quiz_submit`, `project_open`, `project_cta_click`
- 💬 **Интеграция с мессенджером** — формы формируют сообщение с UTM-метками, URL страницы и контекстом заявки
- 📄 **Юридические страницы** — `/privacy` и `/consent` доступны из футера и форм

## 🚢 Деплой

### Статический хостинг

Для деплоя на статический хостинг (Vercel, Netlify, GitHub Pages):

1. Выполните сборку проекта:

   ```powershell
   npm run build
   ```

2. Загрузите содержимое папки `dist/` на хостинг

### Vercel

В настройках проекта добавьте переменную окружения `VITE_POCKETBASE_URL`.
Для аналитики добавьте `VITE_YANDEX_METRIKA_ID`.

```powershell
# Установка Vercel CLI (опционально)
npm i -g vercel

# Деплой
vercel
```

Или подключите репозиторий в панели Vercel — автоматический деплой настроится сам.

### Netlify

```powershell
# Установка Netlify CLI (опционально)
npm i -g netlify-cli

# Деплой
netlify deploy --prod --dir=dist
```

Или используйте drag-and-drop интерфейс на сайте Netlify.

## 📚 Документация

Подробная документация в папке `docs/`:

- **[README.md](./docs/README.md)** — общая информация о проекте
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — архитектура и технический стек
- **[POCKETBASE_MIGRATION_PLAN.md](./docs/POCKETBASE_MIGRATION_PLAN.md)** — пошаговый план миграции и эксплуатации PocketBase
- **[IMPROVEMENTS_PLAN.md](./docs/IMPROVEMENTS_PLAN.md)** — план улучшений и статус задач
- **[FEATURES.md](./docs/FEATURES.md)** — описание секций и функций
- **[PORTFOLIO.md](./docs/PORTFOLIO.md)** — описание блока портфолио (ex/index.html)
- **[DEVELOPMENT.md](./docs/DEVELOPMENT.md)** — рекомендации по развитию
- **[MIGRATION_CHECKLIST.md](./docs/MIGRATION_CHECKLIST.md)** — чеклист миграции на Vite

## 🔧 Конфигурация

### Алиасы путей

В проекте настроены алиасы для удобного импорта:

```javascript
import Header from "@/components/common/Header";
import { useReveal } from "@/hooks/useReveal";
import logo from "@/assets/logo.png";
```

Доступные алиасы:

- `@/` → `src/`
- `@components/` → `src/components/`
- `@sections/` → `src/components/sections/`
- `@common/` → `src/components/common/`
- `@forms/` → `src/components/forms/`
- `@hooks/` → `src/hooks/`
- `@utils/` → `src/utils/`
- `@styles/` → `src/styles/`
- `@assets/` → `src/assets/`
- `@data/` → `src/data/`

### Tailwind CSS

Кастомные цвета и шрифты настроены в `tailwind.config.js`:

- **Цвета**: `brand` (#FDD900), `ink` (#1D1D1B)
- **Шрифты**: `Play` (заголовки), `Mulish` (основной текст)

## 🐛 Устранение неполадок

### Проблемы с установкой зависимостей

```powershell
# Очистка кэша и переустановка
rm -rf node_modules package-lock.json
npm install
```

### Проблемы с путями к ресурсам

Убедитесь, что изображения находятся в `src/assets/` и импортируются правильно:

```javascript
import image from "@/assets/image.jpg";
```

### Проблемы с Tailwind CSS

Если стили не применяются, проверьте:

1. Конфигурацию в `tailwind.config.js`
2. Импорт стилей в `src/main.jsx`:
   ```javascript
   import "./styles/index.css";
   ```

## 📄 Лицензия

Проект является частной собственностью HUSAM STROY INVEST.

---

**Последнее обновление:** Декабрь 2024
