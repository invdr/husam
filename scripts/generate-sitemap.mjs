// Generate sitemap.xml with static routes and published project detail routes.
// When PocketBase is configured, a project-fetch failure aborts generation so
// deploy cannot publish a sitemap that silently omits all dynamic URLs.

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
  { path: "/privacy", priority: "0.5" },
  { path: "/consent", priority: "0.5" },
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
      `sitemap: added ${catalogIds.length} catalog and ${saleIds.length} sale project URLs`,
    );
  } else {
    console.warn("sitemap: POCKETBASE_URL is not set; using static routes only");
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.join("\n") +
    "\n</urlset>\n";

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, xml, "utf8");
  console.log(`sitemap: wrote ${outputPath} (${entries.length} URLs)`);
}

main().catch((error) => {
  console.error(`sitemap: failed — ${error.message}`);
  process.exit(1);
});
