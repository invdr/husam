import PocketBase from "pocketbase";

const DEFAULT_POCKETBASE_URL = "https://api.husam.ru";
const pocketbaseUrl = import.meta.env.VITE_POCKETBASE_URL || DEFAULT_POCKETBASE_URL;

if (!import.meta.env.VITE_POCKETBASE_URL) {
  console.warn(
    `PocketBase: VITE_POCKETBASE_URL не задан. Используется ${DEFAULT_POCKETBASE_URL}`
  );
}

export const pb = new PocketBase(pocketbaseUrl);
pb.autoCancellation(false);

export function getPocketbaseFileUrl(record, filename) {
  if (!filename) return null;
  if (typeof filename === "string" && /^https?:\/\//i.test(filename)) {
    return filename;
  }
  return pb.files.getURL(record, filename);
}
