export function getImageReorderAction(activeId, overId) {
  if (!overId || activeId === overId) return null;

  const active = parseSortableImageId(activeId);
  const over = parseSortableImageId(overId);
  if (!active || !over || active.group !== over.group) return null;

  return {
    group: active.group,
    oldIndex: active.index,
    newIndex: over.index,
  };
}

export function getOrderedImageNames(existingImageNames, newImageNames, pendingImagesFirst) {
  const existing = Array.isArray(existingImageNames) ? existingImageNames : [];
  const pending = Array.isArray(newImageNames) ? newImageNames : [];
  return pendingImagesFirst
    ? [...pending, ...existing]
    : [...existing, ...pending];
}

export function getNewlyUploadedImageNames(savedImageNames, existingImageNames) {
  if (!Array.isArray(savedImageNames)) return [];

  const existingCounts = new Map();
  for (const name of Array.isArray(existingImageNames) ? existingImageNames : []) {
    existingCounts.set(name, (existingCounts.get(name) ?? 0) + 1);
  }

  return savedImageNames.filter((name) => {
    const count = existingCounts.get(name) ?? 0;
    if (count <= 0) return true;
    if (count === 1) existingCounts.delete(name);
    else existingCounts.set(name, count - 1);
    return false;
  });
}

export function getImageNamesAfterAppend(
  savedImageNames,
  existingImageNames,
  pendingImagesFirst,
) {
  return getOrderedImageNames(
    existingImageNames,
    getNewlyUploadedImageNames(savedImageNames, existingImageNames),
    pendingImagesFirst,
  );
}

function parseSortableImageId(value) {
  const match = /^(existing|pending)-(\d+)$/.exec(String(value));
  if (!match) return null;
  return {
    group: match[1],
    index: Number(match[2]),
  };
}
