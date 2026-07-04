export const SALE_PROJECT_OPTION_DICTIONARIES = [
  {
    key: "style",
    label: "Стиль",
    collection: "sale_project_styles",
    projectField: "style",
    placeholder: "Современная классика",
  },
  {
    key: "material_foundation",
    label: "Тип фундамента",
    collection: "sale_project_foundation_types",
    projectField: "material_foundation",
    placeholder: "Ленточный",
  },
  {
    key: "material_walls",
    label: "Стены",
    collection: "sale_project_wall_materials",
    projectField: "material_walls",
    placeholder: "Газобетонные блоки",
  },
  {
    key: "material_roof",
    label: "Кровля",
    collection: "sale_project_roof_materials",
    projectField: "material_roof",
    placeholder: "Металлочерепица",
  },
  {
    key: "material_facade",
    label: "Облицовка фасада",
    collection: "sale_project_facade_materials",
    projectField: "material_facade",
    placeholder: "Декоративная штукатурка",
  },
];

export const SALE_PROJECT_OPTION_DICTIONARY_BY_KEY =
  Object.fromEntries(SALE_PROJECT_OPTION_DICTIONARIES.map((item) => [item.key, item]));
