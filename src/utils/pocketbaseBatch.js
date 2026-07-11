export const MAX_RENAME_BATCH_REQUESTS = 2000;

export function canRenameWithBatch(projectCount) {
  return projectCount + 1 <= MAX_RENAME_BATCH_REQUESTS;
}
