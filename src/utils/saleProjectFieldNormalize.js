const SQUARE_SUFFIX = " м²";
const PLOT_SUFFIX = " соток";

/** Из строки вида "95 м²" извлекает последнее число и возвращает "N м²". */
export function normalizeSquareField(value) {
  const v = (value ?? "").trim();
  if (!v) return v;
  const numbers = v.replace(/,/g, ".").match(/[\d.]+/g);
  if (!numbers || numbers.length === 0) return v;
  const lastNum = numbers[numbers.length - 1];
  return lastNum + SQUARE_SUFFIX;
}

/** Для площади участка: если в строке только число — добавляем сотки; текстовые значения не трогаем. */
function ensurePlotSuffixIfNumeric(value) {
  const v = (value ?? "").trim();
  if (!v) return v;
  if (/сот/i.test(v)) return v;
  if (/^\d+([.,]\d+)?\s*$/.test(v)) return v.replace(",", ".") + PLOT_SUFFIX;
  return v;
}

function formatPlotNumber(value) {
  return Number.parseFloat(value)
    .toFixed(2)
    .replace(/\.?0+$/, "");
}

/** Площадь участка: число или ошибочное м²-значение переводим в сотки. */
export function normalizePlotAreaField(value) {
  const v = (value ?? "").trim();
  if (!v) return v;
  if (v === "-" || v === "—") return "";
  const numbers = v.replace(/,/g, ".").match(/[\d.]+/g);
  if (!numbers || numbers.length === 0) return v;
  const onlyDigitsOrSquare = /^[\d.,\sм²м2]+$/i.test(v);
  if (onlyDigitsOrSquare) {
    const numeric = Number.parseFloat(numbers[numbers.length - 1]);
    if (!Number.isFinite(numeric)) return v;
    const hasSquareUnit = /м²|м2/i.test(v);
    const plotValue = hasSquareUnit && numeric >= 100 ? numeric / 100 : numeric;
    return formatPlotNumber(plotValue) + PLOT_SUFFIX;
  }
  return ensurePlotSuffixIfNumeric(v);
}
