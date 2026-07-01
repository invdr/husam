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
