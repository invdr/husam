// Генерирует sitemap.xml со статическими маршрутами и детальными страницами
// каталога (/catalog/:id) и готовых проектов (/projects/:id) из PocketBase.
// Использование: node scripts/generate-sitemap.mjs [путь к файлу, по умолчанию dist/sitemap.xml]
// Env: SITE_URL (по умолчанию https://husam.ru), POCKETBASE_URL или VITE_POCKETBASE_URL.
// При недоступности PocketBase пишет sitemap только со статическими маршрутами.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const siteUrl = (process.env.SITE_URL || "https://husam.ru").replace(/\/+$/, "");
const pocketbaseUrl = (
  process.env.POCKETBASE_URL ||
  process.env.VITE_POCKETBASE_URL ||
  ""
).replace(/\/+$/, "");
const outputPath = process.argv[2] || "dist/sitemap.xml";

const STATIC_ROUTES = [
  { path: "/", priority: "1.0" },
  { path: "/catalog", priority: "0.9" },
  { path: "/projects", priority: "0.9" },
];

async function fetchPublishedIds(collection) {
  const ids = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const url =
      `${pocketbaseUrl}/api/collections/${collection}/records` +
      `?page=${page}&perPage=500&filter=${encodeURIComponent("published = true")}` +
      `&fields=${encodeURIComponent("id,external_id")}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${collection}: HTTP ${response.status}`);
    }
    const data = await response.json();
    totalPages = data.totalPages ?? 1;
    for (const item of data.items ?? []) {
      const id = item.external_id || item.id;
      if (id) ids.push(id);
    }
    page += 1;
  }
  return ids;
}

function urlEntry(routePath, priority) {
  return [
    "  <url>",
    `    <loc>${siteUrl}${routePath}</loc>`,
    "    <changefreq>weekly</changefreq>",
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
}

async function main() {
  const entries = STATIC_ROUTES.map((route) => urlEntry(route.path, route.priority));

  if (pocketbaseUrl) {
    try {
      const [catalogIds, saleIds] = await Promise.all([
        fetchPublishedIds("projects"),
        fetchPublishedIds("sale_projects"),
      ]);
      for (const id of catalogIds) {
        entries.push(urlEntry(`/catalog/${encodeURIComponent(id)}`, "0.7"));
      }
      for (const id of saleIds) {
        entries.push(urlEntry(`/projects/${encodeURIComponent(id)}`, "0.7"));
      }
      console.log(
        `sitemap: добавлено ${catalogIds.length} страниц каталога и ${saleIds.length} готовых проектов`
      );
    } catch (error) {
      console.warn(`sitemap: не удалось получить проекты из PocketBase (${error.message}), пишем только статические маршруты`);
    }
  } else {
    console.warn("sitemap: POCKETBASE_URL не задан, пишем только статические маршруты");
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.join("\n") +
    "\n</urlset>\n";

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, xml, "utf8");
  console.log(`sitemap: записан ${outputPath} (${entries.length} URL)`);
}

main().catch((error) => {
  console.error(`sitemap: ошибка — ${error.message}`);
  process.exit(1);
});
