import { describe, expect, it } from "vitest";
import schemaV1 from "../../docs/pocketbase-collections.import.json";
import schemaV2 from "../../docs/pocketbase-collections.import.v2.json";

const ADMIN_RULE = "@request.auth.collectionName = 'admins'";
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
const DICTIONARY_COLLECTIONS = WRITABLE_COLLECTIONS.filter(
  (name) => name.endsWith("types") || name.startsWith("sale_project_") && !name.endsWith("projects"),
);

function collectionByName(schema, name) {
  return schema.find((collection) => collection.name === name);
}

describe("PocketBase schema parity", () => {
  it("restricts every writable application collection to admins in both schemas", () => {
    for (const name of WRITABLE_COLLECTIONS) {
      for (const schema of [schemaV1, schemaV2]) {
        const collection = collectionByName(schema, name);
        expect(collection?.createRule, name).toBe(ADMIN_RULE);
        expect(collection?.updateRule, name).toBe(ADMIN_RULE);
        expect(collection?.deleteRule, name).toBe(ADMIN_RULE);
      }
    }
  });

  it("keeps Unicode-safe dictionary keys and unique indexes in both schemas", () => {
    for (const name of DICTIONARY_COLLECTIONS) {
      for (const schema of [schemaV1, schemaV2]) {
        const collection = collectionByName(schema, name);
        const nameKey = collection?.fields?.find((field) => field.name === "name_key");
        expect(nameKey, name).toBeDefined();
        expect(nameKey?.hidden ?? false, name).toBe(false);
        expect(nameKey?.required, name).toBe(true);
        expect(
          collection?.indexes?.some((index) => index.includes(`${name}_name_key`)),
          name,
        ).toBe(true);
      }
    }
  });
});
