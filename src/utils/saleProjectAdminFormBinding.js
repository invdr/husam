/**
 * Поля экспликации и чекбоксов гараж/навес/подвал для инициализации SaleProjectForm.
 * Принимает либо строку из БД (snake_case), либо объект после normalizeSaleProject (camelCase).
 */
export function pickExplicationAndFacetsForSaleProjectForm(project) {
  if (!project || typeof project !== "object") {
    return {
      room_explanation: "",
      has_garage: false,
      has_canopy: false,
      has_basement: false,
    };
  }

  return {
    room_explanation: project.room_explanation ?? project.roomExplanation ?? "",
    has_garage: !!(project.has_garage ?? project.hasGarage),
    has_canopy: !!(project.has_canopy ?? project.hasCanopy),
    has_basement: !!(project.has_basement ?? project.hasBasement),
  };
}

export function syncImportedStructuredSaleProjectAttributes(
  existingAttrs,
  material,
  {
    hasGarage,
    hasCanopy,
    hasBasement,
    roomExplanationChanged = false,
  } = {},
) {
  const attrs =
    existingAttrs && typeof existingAttrs === "object" ? { ...existingAttrs } : {};
  if (roomExplanationChanged) {
    delete attrs.explication;
  }

  attrs.garage = hasGarage ? (attrs.garage || "Да") : null;
  attrs.canopy = hasCanopy ? (attrs.canopy || "Да") : null;
  attrs.basement = hasBasement ? (attrs.basement || "Да") : null;

  if (
    attrs.constructionMaterials &&
    typeof attrs.constructionMaterials === "object" &&
    !Array.isArray(attrs.constructionMaterials)
  ) {
    const constructionMaterials = {
      ...attrs.constructionMaterials,
      walls: material || null,
    };
    attrs.constructionMaterials = Object.values(constructionMaterials).some(
      (value) => value != null && String(value).trim() !== "",
    )
      ? constructionMaterials
      : null;
  }

  return attrs;
}
