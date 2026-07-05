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
- Latest deployed base commit: `cef39d5 Preserve catalog pagination on detail return`
- Production also has the 2026-07-05 same-origin PocketBase hotfix from this worktree deployed; commit still pending.
- Production site: `https://husam.ru` and `http://husam.ru`
- Production frontend server: `77.222.63.88`
- Production frontend directory: `/var/www/husam-stroy`
- Backend/API/files: PocketBase via nginx at `https://husam.ru/api/` and `https://api.husam.ru/`; HTTP equivalents remain available.
- Current production frontend bundle: `assets/index-BylOFq6A.js`
- PocketBase client resolves to same-origin `/` on `husam.ru`, `www.husam.ru`, and `77.222.63.88`; PocketBase SDK appends `/api/...` itself. Other hosts fall back to `https://api.husam.ru` unless `VITE_POCKETBASE_URL` is set.

## Critical TLS Note

- Production HTTPS must stay **TLS 1.2-only**.
- Do not switch `/etc/letsencrypt/options-ssl-nginx.conf` back to `ssl_protocols TLSv1.2 TLSv1.3;`.
- The affected mobile route fails with TLS 1.3, including for a bare `OK` response. It works after forcing `ssl_protocols TLSv1.2;`.
- HTTP is intentionally still available. Do not enable HTTP-to-HTTPS redirect without a fresh mobile check.

Current required server state:

```nginx
ssl_protocols TLSv1.2;
```

## Current Architecture Notes

- Frontend is a static React/Vite SPA.
- Backend is PocketBase; public pages read PocketBase directly through hooks.
- Admin `/admin` authenticates against PocketBase `admins`.
- `projects` powers `/catalog`; `sale_projects` powers `/projects`.
- `sale_projects` top-level fields are the active contract. `attributes` is for custom fields and `legacy_image_urls`.
- Legal documents are code-backed routes `/privacy` and `/consent`.
- `npm run build` also runs sitemap generation.

## Key Files

- Runtime routes: `src/App.jsx`
- PocketBase client: `src/lib/pocketbase.js`
- Public data hooks: `src/hooks/useProjects.js`, `src/hooks/useSaleProjects.js`
- Catalog pages: `src/pages/Catalog.jsx`, `src/pages/Projects.jsx`
- Detail pages: `src/pages/ProjectDetail.jsx`, `src/pages/ProjectSaleDetail.jsx`
- Admin editors/forms: `src/pages/Admin/`, `src/components/admin/`
- Legal pages content: `src/data/legalDocuments.js`
- Sitemap generation: `scripts/generate-sitemap.mjs`
- PocketBase schema import: `docs/pocketbase-collections.import.v2.json`

Avoid reading all `docs/*.md` up front. Several are archive/history docs.

## Commands

Local:

```bash
npm install
npm run dev
npm test
npm run lint
POCKETBASE_URL=https://api.husam.ru npm run build
```

Deploy frontend:

```bash
npm test
npm run lint
POCKETBASE_URL=https://api.husam.ru npm run build
rsync -av --delete dist/ root@77.222.63.88:/var/www/husam-stroy/
curl --tlsv1.2 --tls-max 1.2 -I https://husam.ru/
curl --tlsv1.2 --tls-max 1.2 -fsSL https://husam.ru/ | rg 'assets/index-|assets/vendor-'
```

Production smoke tests:

```bash
curl -I http://husam.ru/
curl --tlsv1.2 --tls-max 1.2 -I https://husam.ru/
curl -fsSL http://husam.ru/api/health
curl --tlsv1.2 --tls-max 1.2 -fsSL https://husam.ru/api/health
curl --tlsv1.2 --tls-max 1.2 -fsSL https://api.husam.ru/api/health
```

Do not store SSH passwords, tokens, or private keys in docs or code.

## Last Known Checks

After the same-origin PocketBase hotfix on 2026-07-05:

- `npm test` passed: 154 tests.
- `npm run lint` passed.
- `POCKETBASE_URL=https://api.husam.ru npm run build` passed after rerunning sitemap generation; final `dist/sitemap.xml` has 187 URLs.
- Deployed with `rsync -av --delete dist/ root@77.222.63.88:/var/www/husam-stroy/`.

After the TLS fix on 2026-07-05:

- Fresh Let's Encrypt certificate `husam.ru` covers `husam.ru`, `www.husam.ru`, and `api.husam.ru`; expires `2026-10-03 14:52:02 UTC`.
- nginx listens on 80/443; UFW allows only 22/80/443.
- PocketBase is active on `127.0.0.1:8090`.
- `certbot renew --dry-run --cert-name husam.ru` passed.
- `https://husam.ru/` works on the affected phone after forcing TLS 1.2-only.
- Server cleanup removed temporary TLS test files, disabled includes, and custom TLS logs.

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

- Do not re-enable TLS 1.3 on production HTTPS.
- `docs/GOOGLE_SETUP.md`, `docs/QUICK_START.md`, `docs/TEST_DATA.md`, and `docs/MIGRATION_CHECKLIST.md` are archive documents, not current workflow.
- Local `npm run build` writes a static-only sitemap unless `POCKETBASE_URL` or `VITE_POCKETBASE_URL` is available.
- Production deploy is manual `rsync` to VPS, not Vercel/Netlify automation.
- Keep docs updated when deployment path, PocketBase schema, or route/state contracts change.
