const SQUARE_SUFFIX = " м²";

/** Из строки вида "95 м²" извлекает последнее число и возвращает "N м²". */
export function normalizeSquareField(value) {
  const v = (value ?? "").trim();
  if (!v) return v;
  const numbers = v.replace(/,/g, ".").match(/[\d.]+/g);
  if (!numbers || numbers.length === 0) return v;
  const lastNum = numbers[numbers.length - 1];
  return lastNum + SQUARE_SUFFIX;
}

/** Для площади участка: если в строке только число — добавляем м²; если текст вроде «6 соток» — не трогаем. */
function ensureSquareSuffixIfNumeric(value) {
  const v = (value ?? "").trim();
  if (!v) return v;
  if (v.endsWith(SQUARE_SUFFIX) || /м2$/i.test(v)) return v;
  if (/^\d+([.,]\d+)?\s*$/.test(v)) return v.replace(",", ".") + SQUARE_SUFFIX;
  return v;
}

/** Площадь участка: число/м² — к одному числу + м²; иначе (напр. «6 соток») — только дописать м² числу при необходимости. */
export function normalizePlotAreaField(value) {
  const v = (value ?? "").trim();
  if (!v) return v;
  const numbers = v.replace(/,/g, ".").match(/[\d.]+/g);
  if (!numbers || numbers.length === 0) return v;
  const onlyDigitsAndSquare = /^[\d.,\sм²м2]+$/i.test(v);
  if (onlyDigitsAndSquare) {
    const lastNum = numbers[numbers.length - 1];
    return lastNum + SQUARE_SUFFIX;
  }
  return ensureSquareSuffixIfNumeric(v);
}
