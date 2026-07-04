export const ATTACHMENT_CHOICES = [
  "Нет",
  "Пристроенный",
  "Отдельностоящий",
];

export const YES_NO_CHOICES = ["Нет", "Да"];

function asText(value) {
  return typeof value === "string" ? value : value?.toString?.() ?? "";
}

function normalizeText(value) {
  return asText(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function hasPositiveMeaning(value) {
  const raw = normalizeText(value);
  if (!raw || raw === "-" || raw === "нет" || raw === "no" || raw === "false" || raw === "0") {
    return false;
  }
  return true;
}

export function normalizeAttachmentChoice(value, fallbackHasValue = false) {
  const raw = normalizeText(value);
  if (/отдель/.test(raw)) return "Отдельностоящий";
  if (/пристро/.test(raw)) return "Пристроенный";
  if (raw && !hasPositiveMeaning(raw)) return "Нет";
  if (hasPositiveMeaning(raw) || fallbackHasValue) return "Пристроенный";
  return "Нет";
}

export function normalizeYesNoChoice(value, fallbackHasValue = false) {
  const raw = normalizeText(value);
  if (raw && !hasPositiveMeaning(raw)) return "Нет";
  if (hasPositiveMeaning(raw) || fallbackHasValue) return "Да";
  return "Нет";
}

export function isPositiveChoice(value) {
  return hasPositiveMeaning(value);
}

function sectionKind(label) {
  const raw = normalizeText(label);
  if (/^(1|перв)/.test(raw)) return "floor_1";
  if (/^(2|втор)/.test(raw)) return "floor_2";
  if (/подвал|подваль|цокол/.test(raw)) return "basement";
  return null;
}

function stripSeparatorLines(text) {
  return asText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^[-–—_\s]{3,}$/.test(line))
    .join("\n")
    .trim();
}

function cleanSection(text) {
  return stripSeparatorLines(text).replace(/^[:\s-–—]+/, "").trim();
}

function appendSection(sections, key, value) {
  const clean = cleanSection(value);
  if (!key || !clean) return;
  sections[key] = sections[key] ? `${sections[key]}\n${clean}` : clean;
}

export function splitSaleProjectRoomExplanation(value) {
  const text = asText(value)
    .replace(/\r\n?/g, "\n")
    .replace(/([.;])\s*(?=(?:Подвал|Подвальн|Цокол))/gi, "$1\n")
    .trim();

  const empty = { basement: "", floor_1: "", floor_2: "" };
  if (!text) return empty;

  const markerRe =
    /(^|\n)\s*((?:1\s*(?:[-–—]?\s*)?(?:этаж|й\s*этаж|ый\s*этаж)|первый\s+этаж)|(?:2\s*(?:[-–—]?\s*)?(?:этаж|й\s*этаж|ой\s*этаж)|второй\s+этаж)|(?:подвал(?:ьное|ьные|ьная|ьный)?(?:\s+пом(?:ещение|ещ\.?|\.))?|подвальные?\s+пом\.?|цоколь(?:ный\s+этаж)?))\s*:?\s*/gi;

  const markers = [];
  let match;
  while ((match = markerRe.exec(text)) !== null) {
    const prefix = match[1] ?? "";
    const label = match[2] ?? "";
    markers.push({
      label,
      key: sectionKind(label),
      start: match.index + prefix.length,
      contentStart: markerRe.lastIndex,
    });
  }

  if (markers.length === 0) {
    return { ...empty, floor_1: cleanSection(text) };
  }

  const sections = { ...empty };
  if (markers[0].start > 0) {
    appendSection(sections, "floor_1", text.slice(0, markers[0].start));
  }

  markers.forEach((marker, index) => {
    const next = markers[index + 1]?.start ?? text.length;
    let content = text.slice(marker.contentStart, next);
    if (
      marker.key === "basement" &&
      /пом/i.test(marker.label) &&
      /^[:\s-–—]+/.test(content)
    ) {
      content = `${marker.label} ${content}`;
    }
    appendSection(sections, marker.key, content);
  });

  return sections;
}

export function buildStructuredRoomExplanation({
  explication_basement,
  explication_floor_1,
  explication_floor_2,
}) {
  return [
    ["1 этаж", explication_floor_1],
    ["2 этаж", explication_floor_2],
    ["Подвал", explication_basement],
  ]
    .map(([title, value]) => {
      const text = asText(value).trim();
      return text ? `${title}\n${text}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}
