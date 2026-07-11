export function normalizeDictionaryName(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("ru-RU");
}

export function buildDictionaryCreatePayload(name, sortOrder) {
  const trimmedName = String(name ?? "").trim();

  return {
    name: trimmedName,
    name_key: normalizeDictionaryName(trimmedName),
    sort_order: sortOrder,
  };
}
