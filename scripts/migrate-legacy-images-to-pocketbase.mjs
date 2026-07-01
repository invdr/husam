const REQUIRED_ENV = [
  "POCKETBASE_URL",
  "POCKETBASE_SUPERUSER_EMAIL",
  "POCKETBASE_SUPERUSER_PASSWORD",
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`Missing required env: ${key}`);
  }
}

const config = {
  pocketbaseUrl: process.env.POCKETBASE_URL.replace(/\/+$/, ""),
  pocketbaseEmail: process.env.POCKETBASE_SUPERUSER_EMAIL,
  pocketbasePassword: process.env.POCKETBASE_SUPERUSER_PASSWORD,
  dryRun: process.env.DRY_RUN === "1",
  perPage: Number(process.env.BATCH_SIZE || 100),
  forceReupload: process.env.FORCE_REUPLOAD === "1",
  clearLegacyAfterSuccess: process.env.CLEAR_LEGACY_URLS === "1",
};

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function getFilenameFromUrl(url, fallback) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname || "";
    const last = pathname.split("/").pop();
    if (last && last.includes(".")) return decodeURIComponent(last);
  } catch {
    // ignore and use fallback
  }
  return fallback;
}

async function pbAuth() {
  const response = await fetch(
    `${config.pocketbaseUrl}/api/collections/_superusers/auth-with-password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity: config.pocketbaseEmail,
        password: config.pocketbasePassword,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PocketBase auth failed: ${response.status} ${text}`);
  }

  const body = await response.json();
  return body.token;
}

async function pbJson(path, token, init = {}) {
  const response = await fetch(`${config.pocketbaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PocketBase request failed: ${response.status} ${path} ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function pbForm(path, token, formData) {
  const response = await fetch(`${config.pocketbaseUrl}${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PocketBase file upload failed: ${response.status} ${path} ${text}`);
  }

  return response.json();
}

async function listCollectionRecords(collection, token) {
  const rows = [];
  let page = 1;

  while (true) {
    const data = await pbJson(
      `/api/collections/${collection}/records?page=${page}&perPage=${config.perPage}&skipTotal=1`,
      token
    );
    const items = data.items ?? [];
    rows.push(...items);
    if (items.length < config.perPage) break;
    page += 1;
  }

  return rows;
}

function extractLegacyUrls(record) {
  const attrs =
    record?.attributes && typeof record.attributes === "object"
      ? record.attributes
      : {};
  const urls = attrs.legacy_image_urls;
  if (!Array.isArray(urls)) return [];
  return urls.filter(isHttpUrl);
}

async function downloadAsFile(url, index) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed ${response.status} for ${url}`);
  }

  const type = response.headers.get("content-type") || "application/octet-stream";
  const ext =
    type.includes("jpeg") ? ".jpg" :
    type.includes("png") ? ".png" :
    type.includes("webp") ? ".webp" :
    type.includes("gif") ? ".gif" :
    type.includes("svg") ? ".svg" : "";

  const fallback = `legacy-image-${index + 1}${ext}`;
  const filename = getFilenameFromUrl(url, fallback);
  const blob = await response.blob();
  return new File([blob], filename, { type });
}

async function migrateCollectionImages(collection, token) {
  const records = await listCollectionRecords(collection, token);

  let scanned = 0;
  let skipped = 0;
  let uploaded = 0;
  let failed = 0;

  for (const record of records) {
    scanned += 1;
    const legacyUrls = extractLegacyUrls(record);
    if (legacyUrls.length === 0) {
      skipped += 1;
      continue;
    }

    const currentImages = Array.isArray(record.images) ? record.images : [];
    if (!config.forceReupload && currentImages.length > 0) {
      skipped += 1;
      continue;
    }

    try {
      if (config.dryRun) {
        uploaded += 1;
        continue;
      }

      const files = [];
      for (let i = 0; i < legacyUrls.length; i += 1) {
        files.push(await downloadAsFile(legacyUrls[i], i));
      }

      const form = new FormData();
      if (config.forceReupload) {
        form.append("images", "");
      }
      for (const file of files) {
        form.append("images+", file, file.name);
      }

      if (config.clearLegacyAfterSuccess) {
        const attrs =
          record?.attributes && typeof record.attributes === "object"
            ? { ...record.attributes }
            : {};
        delete attrs.legacy_image_urls;
        form.append("attributes", JSON.stringify(attrs));
      }

      await pbForm(`/api/collections/${collection}/records/${record.id}`, token, form);
      uploaded += 1;
    } catch (error) {
      failed += 1;
      console.error(
        `Failed ${collection}/${record.id}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return { collection, scanned, skipped, uploaded, failed };
}

async function run() {
  console.log("Stage 5 image migration started");
  console.log(`Dry run: ${config.dryRun ? "yes" : "no"}`);
  console.log(`Force reupload: ${config.forceReupload ? "yes" : "no"}`);
  console.log(
    `Clear legacy_image_urls after upload: ${config.clearLegacyAfterSuccess ? "yes" : "no"}`
  );

  const token = await pbAuth();

  const summary = [];
  for (const collection of ["projects", "sale_projects"]) {
    console.log(`Migrating images for ${collection}`);
    const result = await migrateCollectionImages(collection, token);
    summary.push(result);
    console.log(
      `Done ${collection}: scanned=${result.scanned}, uploaded=${result.uploaded}, skipped=${result.skipped}, failed=${result.failed}`
    );
  }

  console.log("Image migration summary:");
  console.table(summary);
  console.log("Stage 5 image migration completed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
