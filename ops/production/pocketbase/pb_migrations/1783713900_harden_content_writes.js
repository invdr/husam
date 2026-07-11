/* global migrate */

const ADMIN_RULE = '@request.auth.collectionName = "admins"';

const WRITABLE_COLLECTIONS = [
  "projects",
  "project_types",
  "sale_projects",
  "sale_project_types",
  "sale_project_styles",
  "sale_project_foundation_types",
  "sale_project_wall_materials",
  "sale_project_roof_materials",
  "sale_project_facade_materials",
  "site_settings",
  "faq",
  "page_content",
];

const UNIQUE_NAME_INDEXES = [
  {
    collection: "project_types",
    index: "CREATE UNIQUE INDEX idx_project_types_name_lower ON project_types (LOWER(name))",
  },
  {
    collection: "sale_project_types",
    index: "CREATE UNIQUE INDEX idx_sale_project_types_name_lower ON sale_project_types (LOWER(name))",
  },
  {
    collection: "sale_project_styles",
    index: "CREATE UNIQUE INDEX idx_sale_project_styles_name_lower ON sale_project_styles (LOWER(name))",
  },
  {
    collection: "sale_project_foundation_types",
    index: "CREATE UNIQUE INDEX idx_sale_project_foundation_types_name_lower ON sale_project_foundation_types (LOWER(name))",
  },
  {
    collection: "sale_project_wall_materials",
    index: "CREATE UNIQUE INDEX idx_sale_project_wall_materials_name_lower ON sale_project_wall_materials (LOWER(name))",
  },
  {
    collection: "sale_project_roof_materials",
    index: "CREATE UNIQUE INDEX idx_sale_project_roof_materials_name_lower ON sale_project_roof_materials (LOWER(name))",
  },
  {
    collection: "sale_project_facade_materials",
    index: "CREATE UNIQUE INDEX idx_sale_project_facade_materials_name_lower ON sale_project_facade_materials (LOWER(name))",
  },
];

migrate((app) => {
  for (const name of WRITABLE_COLLECTIONS) {
    const collection = app.findCollectionByNameOrId(name);
    collection.createRule = ADMIN_RULE;
    collection.updateRule = ADMIN_RULE;
    collection.deleteRule = ADMIN_RULE;

    if (name === "projects" || name === "sale_projects") {
      collection.listRule = `published = true || ${ADMIN_RULE}`;
      collection.viewRule = `published = true || ${ADMIN_RULE}`;
    }

    app.save(collection);
  }

  for (const { collection: name, index } of UNIQUE_NAME_INDEXES) {
    const collection = app.findCollectionByNameOrId(name);
    if (!collection.indexes.includes(index)) {
      collection.indexes = [...collection.indexes, index];
      app.save(collection);
    }
  }

  const settings = app.settings();
  settings.batch.enabled = true;
  settings.batch.maxRequests = 2000;
  settings.batch.timeout = 30;
  app.save(settings);
}, (app) => {
  for (const name of WRITABLE_COLLECTIONS) {
    const collection = app.findCollectionByNameOrId(name);
    collection.createRule = "@request.auth.id != ''";
    collection.updateRule = "@request.auth.id != ''";
    collection.deleteRule = "@request.auth.id != ''";

    if (name === "projects" || name === "sale_projects") {
      collection.listRule = "published = true || @request.auth.id != ''";
      collection.viewRule = "published = true || @request.auth.id != ''";
    }

    app.save(collection);
  }

  for (const { collection: name, index } of UNIQUE_NAME_INDEXES) {
    const collection = app.findCollectionByNameOrId(name);
    collection.indexes = collection.indexes.filter((item) => item !== index);
    app.save(collection);
  }

  const settings = app.settings();
  settings.batch.enabled = false;
  settings.batch.maxRequests = 50;
  settings.batch.timeout = 3;
  app.save(settings);
});
