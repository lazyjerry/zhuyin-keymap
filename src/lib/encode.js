// 正向：任意文字 → 鍵盤按鍵。
import {
  getKeyboard, ZHUYIN_PUNCT, PINYIN_PUNCT, HANGUL_KEYS, HANGUL_COMPOUND,
  HANGUL_L, HANGUL_V, HANGUL_T, RUSSIAN_KEYS, GREEK_KEYS,
} from "./keyboards.js";
import { readText, toneOf, stripTone } from "./dict.js";

const IS_HAN = /\p{Script=Han}/u;
const IS_BOPOMOFO = /[ㄅ-ㄯㆠ-ㆿˊˇˋ˙]/u;
const IS_HANGUL = /[가-힣ㄱ-ㆎ]/u;
const IS_CYRILLIC = /[Ѐ-ӿ№]/u;
const IS_GREEK = /[Ͱ-Ͽ]/u;

export function hangulToKeys(ch) {
  const code = ch.codePointAt(0) - 0xac00;
  let jamo = ch;
  if (code >= 0 && code < 11172) {
    jamo = HANGUL_L[Math.floor(code / 588)] + HANGUL_V[Math.floor((code % 588) / 28)] + HANGUL_T[code % 28];
  }
  let keys = "";
  for (const j of jamo) {
    for (const part of HANGUL_COMPOUND[j] ?? j) {
      if (!(part in HANGUL_KEYS)) return null;
      keys += HANGUL_KEYS[part];
    }
  }
  return keys;
}

function syllableToKeys(keyboard, syllable, options, dict) {
  if (keyboard.family === "pinyin") {
    const py = dict.pinyin.get(syllable);
    if (!py) return null;
    const base = py.replace(/[1-5]$/, "");
    return options.pinyinTone ? base + toneOf(syllable) : base;
  }
  let keys = "";
  const body = stripTone(syllable);
  for (const sym of body) {
    if (!(sym in keyboard.map)) return null;
    keys += keyboard.map[sym];
  }
  const tone = toneOf(syllable);
  if (tone === 1) return keys + (options.tone1Space ? keyboard.tone1 : "");
  return keys + keyboard.map[["", "", "ˊ", "ˇ", "ˋ", "˙"][tone]];
}

/**
 * @param {string} text 原文
 * @param {object} options { keyboard, autoOther, tone1Space, pinyinTone, overrides: Map<index, reading> }
 * @param {object|null} dict 注音字典（尚未載入時為 null，漢字會標成未對應）
 * @returns {{ output: string, tokens: Array }}
 */
export function encode(text, options, dict) {
  const selected = getKeyboard(options.keyboard);
  const chinese = selected.family === "zhuyin" || selected.family === "pinyin" ? selected : getKeyboard("dachen");
  const allow = (family) => selected.family === family || options.autoOther;
  const readings = dict ? readText(dict, text) : null;
  const overrides = options.overrides ?? new Map();

  const tokens = Array.from(text).map((ch, index) => {
    if (/[\x20-\x7e]/.test(ch)) return { src: ch, out: ch, kind: "ascii", index };
    if (/\s/.test(ch)) return { src: ch, out: ch, kind: "space", index };

    if (IS_HAN.test(ch) && allow(chinese.family)) {
      const info = readings?.[index];
      if (!dict) return { src: ch, out: ch, kind: "pending", index };
      if (!info?.readings.length) return { src: ch, out: ch, kind: "unmapped", index };
      const reading = overrides.get(index) ?? info.reading;
      const out = syllableToKeys(chinese, reading, options, dict);
      if (out === null) return { src: ch, out: ch, kind: "unmapped", index };
      return { src: ch, out, kind: "han", reading, readings: info.readings, index };
    }
    if (IS_BOPOMOFO.test(ch) && chinese.family === "zhuyin" && allow("zhuyin")) {
      const out = chinese.map[ch];
      if (out) return { src: ch, out, kind: "bopomofo", index };
    }
    const punct = (chinese.family === "pinyin" ? PINYIN_PUNCT : ZHUYIN_PUNCT)[ch];
    if (punct && allow(chinese.family)) return { src: ch, out: punct, kind: "punct", index };
    if (IS_HANGUL.test(ch) && allow("hangul")) {
      const out = hangulToKeys(ch);
      if (out) return { src: ch, out, kind: "hangul", index };
    }
    if (IS_CYRILLIC.test(ch) && allow("russian") && RUSSIAN_KEYS[ch]) {
      return { src: ch, out: RUSSIAN_KEYS[ch], kind: "cyrillic", index };
    }
    if (IS_GREEK.test(ch) && allow("greek") && GREEK_KEYS[ch]) {
      return { src: ch, out: GREEK_KEYS[ch], kind: "greek", index };
    }
    const normalized = ch.normalize("NFKC");
    if (/^[\x20-\x7e]+$/.test(normalized)) return { src: ch, out: normalized, kind: "punct", index };
    return { src: ch, out: ch, kind: "unmapped", index };
  });

  return { output: tokens.map((t) => t.out).join(""), tokens };
}
