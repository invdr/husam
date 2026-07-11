/* global migrate, TextField */

const DICTIONARY_COLLECTIONS = [
  "project_types",
  "sale_project_types",
  "sale_project_styles",
  "sale_project_foundation_types",
  "sale_project_wall_materials",
  "sale_project_roof_materials",
  "sale_project_facade_materials",
];

const LEGACY_NAME_INDEXES = [
  "CREATE UNIQUE INDEX idx_project_types_name_lower ON project_types (LOWER(name))",
  "CREATE UNIQUE INDEX idx_sale_project_types_name_lower ON sale_project_types (LOWER(name))",
  "CREATE UNIQUE INDEX idx_sale_project_styles_name_lower ON sale_project_styles (LOWER(name))",
  "CREATE UNIQUE INDEX idx_sale_project_foundation_types_name_lower ON sale_project_foundation_types (LOWER(name))",
  "CREATE UNIQUE INDEX idx_sale_project_wall_materials_name_lower ON sale_project_wall_materials (LOWER(name))",
  "CREATE UNIQUE INDEX idx_sale_project_roof_materials_name_lower ON sale_project_roof_materials (LOWER(name))",
  "CREATE UNIQUE INDEX idx_sale_project_facade_materials_name_lower ON sale_project_facade_materials (LOWER(name))",
];

function normalizeDictionaryName(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("ru-RU");
}

function keyIndex(collectionName) {
  return `CREATE UNIQUE INDEX idx_${collectionName}_name_key ON ${collectionName} (name_key)`;
}

migrate((app) => {
  for (const collectionName of DICTIONARY_COLLECTIONS) {
    const collection = app.findCollectionByNameOrId(collectionName);
    const nameKeyField = collection.fields.getByName("name_key");

    if (!nameKeyField) {
      collection.fields.add(
        new TextField({
          name: "name_key",
          required: false,
          max: 255,
        }),
      );
      app.save(collection);
    }

    const currentNameKeyField = collection.fields.getByName("name_key");
    currentNameKeyField.hidden = false;
    currentNameKeyField.max = 255;
    currentNameKeyField.required = true;

    const records = app.findAllRecords(collectionName);
    for (const record of records) {
      record.set("name_key", normalizeDictionaryName(record.getString("name")));
      app.save(record);
    }

    const index = keyIndex(collectionName);
    collection.indexes = collection.indexes.filter(
      (item) => !item.includes("LOWER(name)") && item !== index,
    );
    collection.indexes.push(index);
    collection.fields.getByName("name_key").required = true;
    app.save(collection);
  }
}, (app) => {
  for (const collectionName of DICTIONARY_COLLECTIONS) {
    const collection = app.findCollectionByNameOrId(collectionName);
    collection.indexes = collection.indexes.filter(
      (item) => item !== keyIndex(collectionName),
    );
    const nameKeyField = collection.fields.getByName("name_key");
    if (nameKeyField) collection.fields.removeByName("name_key");
    const legacyIndex = LEGACY_NAME_INDEXES.find((item) => item.startsWith(`CREATE UNIQUE INDEX idx_${collectionName}_`));
    if (legacyIndex && !collection.indexes.includes(legacyIndex)) {
      collection.indexes.push(legacyIndex);
    }
    app.save(collection);
  }
});
