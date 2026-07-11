# Current Handoff

Last updated: 2026-07-11

## Start Here

For a new Codex/session start:

```text
Прочитай только AGENTS.md, если он есть, и docs/CURRENT_HANDOFF.md. Не изучай весь репозиторий заранее. Проверь git status и текущую ветку. Для деталей ищи точечно через rg.
```

There is currently no `AGENTS.md` in this repository.

## Current State

- Branch: `main`
- Latest deployed frontend commit: `7eba089 fix: make project cards fully clickable`.
- Project images, titles, and non-interactive card content link to detail pages in
  the home portfolio, `/catalog`, and `/projects`; carousel controls and project
  CTA buttons remain independent.
- Production site: `https://husam.ru` and `http://husam.ru`
- Production frontend server: `77.222.63.88`
- Production frontend directory: `/var/www/husam-stroy`
- Backend/API/files: PocketBase via nginx at `https://husam.ru/api/` and `https://api.husam.ru/`; HTTP equivalents remain available.
- Current production frontend bundle: `assets/index-CgGF1gMN.js`
- PocketBase client resolves to same-origin `/` on `husam.ru`, `www.husam.ru`, and `77.222.63.88`; PocketBase SDK appends `/api/...` itself. Other hosts fall back to `https://api.husam.ru` unless `VITE_POCKETBASE_URL` is set.

## Critical TLS Note

- Production HTTPS must stay **TLS 1.2-only**.
- Do not change `ops/production/nginx/snippets/husam-tls-policy.conf` to enable TLS 1.3 without repeating the affected mobile validation.
- The affected mobile route fails with TLS 1.3, including for a bare `OK` response. It works after forcing `ssl_protocols TLSv1.2;`.
- HTTP is redirected to HTTPS by the maintained nginx configuration. Keep this policy aligned with HSTS and re-run the TLS 1.2 mobile check after any TLS or redirect change.

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

After the full-card navigation fix on 2026-07-11:

- `npm test` passed: 185 tests.
- `npm run lint` passed.
- `npm run build` passed locally; the production workflow generated the full
  sitemap using `https://api.husam.ru`.
- Unit coverage confirms that non-interactive card content navigates while the
  `Хочу` CTA remains independent.
- GitHub Actions verify and deploy passed on run `29152591695`.
- Production browser smoke on `/projects?type=all&sort=default` loaded
  `assets/index-CgGF1gMN.js`; clicking the `Площадь дома` field in the first card
  navigated to `/projects/W-312-GNT?type=all&sort=default`.
- Production `/`, `/catalog/DV-114`, `/projects/W-312-GNT`, and both PocketBase
  health endpoints returned `200`; HTTP redirects to HTTPS with `301`.
- `/var/www/husam-stroy` and its deployed directories are owned by
  `deploy:deploy` with mode `755`, so automated rsync can preserve metadata.

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
- Production `index.html` currently has no explicit `Cache-Control` header, so a
  browser tab opened shortly before a deploy may need one reload to receive the
  new hashed bundle.
- Production deploy runs through `.github/workflows/deploy-frontend.yml` on pushes
  to `main`; the documented manual `rsync` command is the fallback path.
- Keep docs updated when deployment path, PocketBase schema, or route/state contracts change.
