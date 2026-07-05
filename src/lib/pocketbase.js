import PocketBase from "pocketbase";

const DEFAULT_POCKETBASE_URL = "https://api.husam.ru";
const SAME_ORIGIN_POCKETBASE_URL = "/";
const SAME_ORIGIN_HOSTS = new Set(["husam.ru", "www.husam.ru", "77.222.63.88"]);

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function getBrowserLocation() {
  return typeof window === "undefined" ? null : window.location;
}

export function resolvePocketbaseUrl(
  configuredUrl = import.meta.env.VITE_POCKETBASE_URL,
  location = getBrowserLocation()
) {
  const configured = typeof configuredUrl === "string"
    ? trimTrailingSlash(configuredUrl.trim())
    : "";

  if (configured) return configured;

  if (location && SAME_ORIGIN_HOSTS.has(location.hostname)) {
    return SAME_ORIGIN_POCKETBASE_URL;
  }

  return DEFAULT_POCKETBASE_URL;
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
