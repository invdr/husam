import PocketBase from "pocketbase";

const pocketbaseUrl = import.meta.env.VITE_POCKETBASE_URL;

if (!pocketbaseUrl) {
  console.warn("PocketBase: VITE_POCKETBASE_URL не задан. Проверьте .env");
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
