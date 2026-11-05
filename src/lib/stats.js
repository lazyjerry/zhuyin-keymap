// 字元統計：以字素（grapheme）計算總字數，再依類別分類。
const segmenter = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("zh-Hant", { granularity: "grapheme" }) : null;

export const graphemes = (text) => (segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text));

export function classify(ch) {
  if (/^[A-Z]$/.test(ch)) return "upper";
  if (/^[a-z]$/.test(ch)) return "lower";
  if (/^\p{Nd}$/u.test(ch)) return "digit";
  if (/^\s$/u.test(ch)) return "space";
  if (/^[\x21-\x7e]$/.test(ch)) return "symbol";
  if (/^[\p{L}\p{M}]+$/u.test(ch)) return "letter";
  if (/^[\p{P}\p{S}]/u.test(ch)) return "symbol";
  return "other";
}

export function countText(text) {
  const result = { total: 0, upper: 0, lower: 0, digit: 0, symbol: 0, space: 0, letter: 0, other: 0 };
  for (const g of graphemes(text)) {
    result.total += 1;
    result[classify(g)] += 1;
  }
  return result;
}
