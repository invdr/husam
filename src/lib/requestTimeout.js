export const DEFAULT_REQUEST_TIMEOUT_MS = 12000;

export class RequestTimeoutError extends Error {
  constructor(label, timeoutMs) {
    super(`${label} timed out after ${timeoutMs}ms`);
    this.name = "RequestTimeoutError";
  }
}

export function withRequestTimeout(
  promise,
  label = "request",
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS
) {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new RequestTimeoutError(label, timeoutMs));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}
