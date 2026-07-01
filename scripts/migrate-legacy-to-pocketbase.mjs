import { createClient } from "@supabase/supabase-js";

const REQUIRED_ENV = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
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
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  pocketbaseUrl: process.env.POCKETBASE_URL.replace(/\/+$/, ""),
  pocketbaseEmail: process.env.POCKETBASE_SUPERUSER_EMAIL,
  pocketbasePassword: process.env.POCKETBASE_SUPERUSER_PASSWORD,
  dryRun: process.env.DRY_RUN === "1",
  batchSize: Number(process.env.BATCH_SIZE || 200),
};

const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);

function toText(value) {
  if (value == null) return "";
  return String(value);
}

function asJsonObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return {};
}

function toPageContentValue(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function withLegacyImages(attributes, images) {
  const list = Array.isArray(images)
    ? images.filter((item) => typeof item === "string" && item.trim())
    : [];
  if (list.length === 0) return attributes;
  return {
    ...attributes,
    legacy_image_urls: list,
  };
}

function normalizeProject(row) {
  const baseAttributes = asJsonObject(row.attributes);
  return {
    external_id: toText(row.id),
    title: toText(row.title),
    description: row.description ?? "",
    type: toText(row.type),
    area: toText(row.area),
    duration: toText(row.duration),
    budget: toText(row.budget),
    location: toText(row.location),
    scope: Array.isArray(row.scope) ? row.scope : [],
    images: [],
    testimonial: row.testimonial ?? "",
    client_name: toText(row.client_name),
    sort_order: Number.isFinite(row.sort_order) ? row.sort_order : 999,
    sort_order_in_category: Number.isFinite(row.sort_order_in_category)
      ? row.sort_order_in_category
      : 999,
    featured: Boolean(row.featured),
    published: row.published !== false,
    attributes: withLegacyImages(baseAttributes, row.images),
  };
}

function normalizeSaleProject(row) {
  const baseAttributes = asJsonObject(row.attributes);
  return {
    external_id: toText(row.id),
    title: toText(row.title),
    description: row.description ?? "",
    has_garage: Boolean(row.has_garage),
    has_canopy: Boolean(row.has_canopy),
    has_basement: Boolean(row.has_basement),
    room_explanation: row.room_explanation ?? "",
    type: toText(row.type),
    area: toText(row.area),
    rooms: toText(row.rooms),
    floors: toText(row.floors),
    material: toText(row.material),
    price: toText(row.price),
    old_price: toText(row.old_price),
    construction_price_from: toText(row.construction_price_from),
    status: toText(row.status),
    images: [],
    sort_order: Number.isFinite(row.sort_order) ? row.sort_order : 999,
    sort_order_in_category: Number.isFinite(row.sort_order_in_category)
      ? row.sort_order_in_category
      : 999,
    featured: Boolean(row.featured),
    published: row.published !== false,
    attributes: withLegacyImages(baseAttributes, row.images),
    plot_area: toText(row.plot_area),
    house_area: toText(row.house_area),
    usable_area: toText(row.usable_area),
    implementation_period: toText(row.implementation_period),
    house_dimensions: toText(row.house_dimensions),
  };
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

async function pbRequest(path, token, init = {}) {
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

async function fetchAllSupabaseRows(table, orderField = null) {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + config.batchSize - 1;
    let query = supabase.from(table).select("*").range(from, to);
    if (orderField) {
      query = query.order(orderField, { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Supabase read failed for ${table}: ${error.message}`);
    }

    const batch = data ?? [];
    rows.push(...batch);

    if (batch.length < config.batchSize) break;
    from += config.batchSize;
  }

  return rows;
}

async function fetchPocketbaseMapByField(collection, field, token) {
  const map = new Map();
  let page = 1;

  while (true) {
    const data = await pbRequest(
      `/api/collections/${collection}/records?page=${page}&perPage=${config.batchSize}&skipTotal=1`,
      token
    );

    for (const item of data.items ?? []) {
      const key = item[field];
      if (key != null && key !== "") map.set(String(key), item);
    }

    if (!data.items?.length || data.items.length < config.batchSize) break;
    page += 1;
  }

  return map;
}

async function createOrUpdate(collection, payload, token, id = null) {
  if (config.dryRun) return { action: id ? "update" : "create" };

  if (id) {
    await pbRequest(`/api/collections/${collection}/records/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return { action: "update" };
  }

  await pbRequest(`/api/collections/${collection}/records`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return { action: "create" };
}

async function migrateByField({
  table,
  collection,
  keyField,
  sourceOrderField = null,
  mapRow,
  token,
}) {
  const sourceRows = await fetchAllSupabaseRows(
    table,
    sourceOrderField ?? keyField
  );
  const existingMap = await fetchPocketbaseMapByField(collection, keyField, token);
  let created = 0;
  let updated = 0;

  for (const row of sourceRows) {
    const payload = mapRow(row);
    const key = payload[keyField];
    if (key == null || key === "") {
      continue;
    }
    const existing = existingMap.get(String(key));
    const result = await createOrUpdate(collection, payload, token, existing?.id);
    if (result.action === "create") created += 1;
    if (result.action === "update") updated += 1;
  }

  return { table, collection, total: sourceRows.length, created, updated };
}

async function run() {
  console.log("Stage 4 migration started");
  console.log(`Dry run: ${config.dryRun ? "yes" : "no"}`);

  const token = await pbAuth();
  const tasks = [
    {
      table: "project_types",
      collection: "project_types",
      keyField: "name",
      mapRow: (row) => ({
        name: toText(row.name),
        sort_order: Number.isFinite(row.sort_order) ? row.sort_order : 999,
      }),
    },
    {
      table: "sale_project_types",
      collection: "sale_project_types",
      keyField: "name",
      mapRow: (row) => ({
        name: toText(row.name),
        sort_order: Number.isFinite(row.sort_order) ? row.sort_order : 999,
      }),
    },
    {
      table: "site_settings",
      collection: "site_settings",
      keyField: "key",
      mapRow: (row) => ({
        key: toText(row.key),
        value: row.value == null ? "" : String(row.value),
      }),
    },
    {
      table: "page_content",
      collection: "page_content",
      keyField: "key",
      mapRow: (row) => ({
        key: toText(row.key),
        value: toPageContentValue(row.value),
      }),
    },
    {
      table: "faq",
      collection: "faq",
      keyField: "question",
      mapRow: (row) => ({
        question: toText(row.question),
        answer: row.answer ?? "",
        sort_order: Number.isFinite(row.sort_order) ? row.sort_order : 999,
      }),
    },
    {
      table: "projects",
      collection: "projects",
      keyField: "external_id",
      sourceOrderField: "id",
      mapRow: normalizeProject,
    },
    {
      table: "sale_projects",
      collection: "sale_projects",
      keyField: "external_id",
      sourceOrderField: "id",
      mapRow: normalizeSaleProject,
    },
  ];

  const summary = [];
  for (const task of tasks) {
    console.log(`Migrating ${task.table} -> ${task.collection}`);
    const result = await migrateByField({ ...task, token });
    summary.push(result);
    console.log(
      `Done ${task.table}: total=${result.total}, created=${result.created}, updated=${result.updated}`
    );
  }

  console.log("Migration summary:");
  console.table(summary);
  console.log("Stage 4 migration completed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
