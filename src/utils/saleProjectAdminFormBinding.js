import {
  buildStructuredRoomExplanation,
  isPositiveChoice,
  normalizeAttachmentChoice,
  normalizeYesNoChoice,
  splitSaleProjectRoomExplanation,
} from "@/utils/saleProjectFieldStructure";

export { buildStructuredRoomExplanation };

const STANDARD_SALE_PROJECT_ATTRIBUTE_KEYS = new Set([
  "plot_area",
  "house_area",
  "usable_area",
  "implementation_period",
  "house_dimensions",
  "room_explanation",
  "area",
  "rooms",
  "material",
  "has_garage",
  "has_canopy",
  "has_basement",
  "style",
  "house_style",
  "garage",
  "canopy",
  "basement",
  "terrace",
  "bedrooms",
  "total_built_area",
  "discounted_price",
  "discount",
  "print_price",
  "site_status",
  "source_photo_url",
  "note",
  "explication",
  "constructionMaterials",
  "material_summary",
  "garage_area",
  "canopy_area",
  "сanopy_area",
  "persent_of_sale",
]);

function asText(value) {
  return typeof value === "string" ? value : value?.toString?.() ?? "";
}

function firstText(...values) {
  for (const value of values) {
    const text = asText(value).trim();
    if (text) return text;
  }
  return "";
}

function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

export function pickExtendedSaleProjectFormFields(project) {
  const attrs = objectOrEmpty(project?.attributes);
  const explication = objectOrEmpty(project?.explication ?? attrs.explication);
  const parsedExplication = splitSaleProjectRoomExplanation(
    firstText(project?.room_explanation, project?.roomExplanation),
  );
  const constructionMaterials = objectOrEmpty(
    project?.constructionMaterials ?? attrs.constructionMaterials,
  );
  return {
    style: firstText(project?.style, attrs.style, attrs.house_style),
    garage: normalizeAttachmentChoice(
      firstText(project?.garage, attrs.garage),
      !!(project?.has_garage ?? project?.hasGarage),
    ),
    canopy: normalizeAttachmentChoice(
      firstText(project?.canopy, attrs.canopy),
      !!(project?.has_canopy ?? project?.hasCanopy),
    ),
    basement: normalizeYesNoChoice(
      firstText(project?.basement, attrs.basement),
      !!(project?.has_basement ?? project?.hasBasement) ||
        isPositiveChoice(
          firstText(
            project?.explication_basement,
            explication.basement,
            parsedExplication.basement,
          ),
        ),
    ),
    terrace: normalizeYesNoChoice(
      firstText(project?.terrace, attrs.terrace),
      /террас|веранд/i.test(
        firstText(project?.room_explanation, project?.roomExplanation),
      ),
    ),
    bedrooms: firstText(project?.bedrooms, attrs.bedrooms, project?.rooms),
    total_built_area: firstText(
      project?.total_built_area,
      attrs.total_built_area,
    ),
    note: firstText(project?.note, attrs.note),
    garage_area: firstText(project?.garage_area, attrs.garage_area),
    canopy_area: firstText(
      project?.canopy_area,
      attrs.canopy_area,
      attrs["сanopy_area"],
    ),
    explication_basement: firstText(
      project?.explication_basement,
      explication.basement,
      parsedExplication.basement,
    ),
    explication_floor_1: firstText(
      project?.explication_floor_1,
      explication.floor_1,
      parsedExplication.floor_1,
    ),
    explication_floor_2: firstText(
      project?.explication_floor_2,
      explication.floor_2,
      parsedExplication.floor_2,
    ),
    material_foundation: firstText(
      project?.material_foundation,
      constructionMaterials.foundation,
    ),
    material_walls: firstText(
      project?.material_walls,
      constructionMaterials.walls,
      project?.material,
    ),
    material_roof: firstText(project?.material_roof, constructionMaterials.roof),
    material_facade: firstText(
      project?.material_facade,
      constructionMaterials.facade,
    ),
  };
}

export function cleanStandardSaleProjectAttributes(existingAttrs) {
  const attrs = objectOrEmpty(existingAttrs);
  return Object.fromEntries(
    Object.entries(attrs).filter(
      ([key, value]) =>
        !STANDARD_SALE_PROJECT_ATTRIBUTE_KEYS.has(key) &&
        value != null &&
        value !== "" &&
        !(Array.isArray(value) && value.length === 0),
    ),
  );
}
