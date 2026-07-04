import PocketBase from "pocketbase";

const DEFAULT_POCKETBASE_URL = "https://api.husam.ru";

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

export function resolvePocketbaseUrl(
  configuredUrl = import.meta.env.VITE_POCKETBASE_URL
) {
  const configured = typeof configuredUrl === "string"
    ? trimTrailingSlash(configuredUrl.trim())
    : "";

  return configured || DEFAULT_POCKETBASE_URL;
}

const pocketbaseUrl = resolvePocketbaseUrl();

if (!import.meta.env.VITE_POCKETBASE_URL) {
  console.warn(
    `PocketBase: VITE_POCKETBASE_URL не задан. Используется ${pocketbaseUrl}`
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
