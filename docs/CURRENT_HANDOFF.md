# Current Handoff

Last updated: 2026-07-05

## Start Here

For a new Codex/session start:

```text
Прочитай только AGENTS.md, если он есть, и docs/CURRENT_HANDOFF.md. Не изучай весь репозиторий заранее. Проверь git status и текущую ветку. Для деталей ищи точечно через rg.
```

There is currently no `AGENTS.md` in this repository.

## Current State

- Branch: `main`
- Latest deployed commit: `cef39d5 Preserve catalog pagination on detail return`
- Production site: `https://husam.ru`
- Production frontend server: `77.222.63.88`
- Production frontend directory: `/var/www/husam-stroy`
- Backend/API/files: PocketBase at `https://api.husam.ru`

The latest deployed code fixes catalog/list return behavior: `/catalog` and `/projects` keep pagination in `page`, pass query params into detail pages, and "Вернуться" links preserve list state.

## Read These First

Use the smallest useful context:

- `docs/CURRENT_HANDOFF.md` - this file.
- `docs/ARCHITECTURE.md` - runtime architecture, routes, data contracts, deploy.
- `docs/DEVELOPMENT.md` - current work rules, checks, deploy procedure.
- `package.json` - commands and dependencies.

For task-specific context:

- Routes: `src/App.jsx`
- PocketBase client: `src/lib/pocketbase.js`
- Public data hooks: `src/hooks/useProjects.js`, `src/hooks/useSaleProjects.js`
- Catalog pages: `src/pages/Catalog.jsx`, `src/pages/Projects.jsx`
- Detail pages: `src/pages/ProjectDetail.jsx`, `src/pages/ProjectSaleDetail.jsx`
- Admin editors/forms: `src/pages/Admin/`, `src/components/admin/`
- Legal pages content: `src/data/legalDocuments.js`
- Sitemap generation: `scripts/generate-sitemap.mjs`
- PocketBase schema import: `docs/pocketbase-collections.import.v2.json`

Avoid reading all `docs/*.md` up front. Several are archive/history docs.

## Current Architecture Notes

- Frontend is a static React/Vite SPA.
- Backend is PocketBase; public pages read PocketBase directly through hooks.
- Admin `/admin` authenticates against PocketBase `admins`.
- `projects` powers `/catalog`; `sale_projects` powers `/projects`.
- `sale_projects` top-level fields are the active contract. `attributes` is for custom fields and `legacy_image_urls`.
- Legal documents are code-backed routes `/privacy` and `/consent`.
- `npm run build` also runs sitemap generation.

## Commands

Local:

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

Deploy frontend:

```bash
npm test
npm run lint
npm run build
rsync -av --delete dist/ root@77.222.63.88:/var/www/husam-stroy/
curl -I https://husam.ru/
curl -fsSL https://husam.ru/ | rg 'assets/index-|assets/vendor-'
```

Do not store server passwords or tokens in this file.

## Last Known Checks

Before deploying `cef39d5` on 2026-07-05:

- `npm test` passed: 151 tests.
- `npm run lint` passed.
- `npm run build` passed.
- Public `https://husam.ru/` returned `200 OK` and served the new hashed bundle.

After the documentation refresh on 2026-07-05:

- `git diff --check` passed.
- `npm test` passed: 151 tests.
- `npm run lint` passed.

## Next Useful Smoke Tests

After catalog/project changes:

- Open `/catalog`, go to page 2+, open a project, return with browser back.
- Open a project from `/catalog`, use "Вернуться в каталог".
- Repeat for `/projects`.
- Check filters/sort/page remain intact.

After admin/data changes:

- Login to `/admin`.
- Create or edit a project with images.
- Reorder images and project order.
- Confirm public page updates from PocketBase.

## Open Risks / Watch Items

- `docs/GOOGLE_SETUP.md`, `docs/QUICK_START.md`, `docs/TEST_DATA.md`, and `docs/MIGRATION_CHECKLIST.md` are archive documents, not current workflow.
- Local `npm run build` writes a static-only sitemap unless `POCKETBASE_URL` or `VITE_POCKETBASE_URL` is available.
- Production deploy is manual `rsync` to VPS, not Vercel/Netlify automation.
- Keep docs updated when deployment path, PocketBase schema, or route/state contracts change.
