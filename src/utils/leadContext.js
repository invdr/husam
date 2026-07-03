const TRACKING_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "yclid",
  "ymclid",
  "gclid",
];

function getBrowserContext() {
  if (typeof window === "undefined") {
    return { url: "", title: "" };
  }

  return {
    url: window.location.href,
    title: document.title || window.location.pathname,
  };
}

export function getTrackingParams() {
  if (typeof window === "undefined") return [];

  const params = new URLSearchParams(window.location.search);
  return TRACKING_KEYS
    .map((key) => [key, params.get(key)])
    .filter(([, value]) => value);
}

export function buildLeadContext({
  source = "Сайт",
  form,
  projectId,
  projectTitle,
  service,
} = {}) {
  const { url, title } = getBrowserContext();
  const trackingParams = getTrackingParams();
  const lines = [
    "",
    "Источник заявки:",
    `Канал: ${source}`,
    title && `Страница: ${title}`,
    url && `URL: ${url}`,
    form && `Форма: ${form}`,
    service && `Услуга: ${service}`,
    projectId && `Проект: ${projectId}`,
    projectTitle && `Название проекта: ${projectTitle}`,
  ].filter(Boolean);

  if (trackingParams.length > 0) {
    lines.push(
      `Метки: ${trackingParams
        .map(([key, value]) => `${key}=${value}`)
        .join("; ")}`
    );
  }

  return lines.join("\n");
}

export function appendLeadContext(message, context) {
  const base = (message || "").trim();
  const suffix = buildLeadContext(context);
  return [base, suffix].filter(Boolean).join("\n");
}

