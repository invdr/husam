const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Returns a normalized absolute web URL or null for values that must never be
 * assigned to an external link href (for example javascript: and data: URLs).
 */
export function safeExternalUrl(value) {
  if (typeof value !== "string") return null;

  const candidate = value.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (!ALLOWED_PROTOCOLS.has(url.protocol) || !url.hostname) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function isSafeExternalUrl(value) {
  return safeExternalUrl(value) !== null;
}
