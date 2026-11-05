// 反向：鍵盤按鍵 → 原文。
import {
  getKeyboard, invert, HANGUL_KEYS, HANGUL_COMPOUND, HANGUL_L, HANGUL_V, HANGUL_T,
  RUSSIAN_KEYS, GREEK_KEYS,
} from "./keyboards.js";
import { decodeLattice, pinyinWithMarks, stripTone } from "./dict.js";

export const TARGETS = {
  zhuyin: [
    { id: "bpmf", name: "注音符號" },
    { id: "pinyin", name: "漢語拼音" },
  ],
  pinyin: [
    { id: "bpmf", name: "注音符號" },
    { id: "pinyin", name: "漢語拼音" },
  ],
  hangul: [
    { id: "hangul", name: "韓文" },
    { id: "jamo", name: "韓文字母（拆開）" },
  ],
  russian: [{ id: "text", name: "俄文" }],
  greek: [{ id: "text", name: "希臘文" }],
};

const LITERAL_PENALTY = -60;

function zhuyinLattice(dict, keyboard, input, toneless, capsAsKeys) {
  const keyToSym = invert(keyboard.map);
  const tokens = Array.from(input).map((ch) => {
    if (ch === " ") return { ch, type: "space" };
    const sym = keyToSym[ch] ?? (capsAsKeys && /[A-Z]/.test(ch) ? keyToSym[ch.toLowerCase()] : undefined);
    if (!sym) return { ch, type: "literal" };
    return { ch, sym, type: /[ˊˇˋ˙]/.test(sym) ? "tone" : "bpmf" };
  });
  const lattice = tokens.map((_, i) => {
    const edges = [];
    let body = "";
    let src = "";
    for (let j = i; j < tokens.length && j < i + 3 && tokens[j].type === "bpmf"; j++) {
      body += tokens[j].sym;
      src += tokens[j].ch;
      if (!dict.bases.has(body)) continue;
      const next = tokens[j + 1];
      if (next?.type === "tone") {
        const syl = body + next.sym;
        if (dict.syllables.has(syl)) edges.push({ end: j + 2, syllables: [syl], toned: true, src: src + next.ch });
      } else if (toneless) {
        edges.push({ end: j + 1, syllables: dict.toneVariants.get(body) ?? [body], toned: false, src });
      } else if (dict.syllables.has(body)) {
        // 沒有聲調鍵視為一聲（一聲的空白可省略）。
        const withSpace = next?.type === "space";
        edges.push({ end: withSpace ? j + 2 : j + 1, syllables: [body], toned: true, src: src + (withSpace ? " " : "") });
      }
    }
    return edges;
  });
  const literalAt = (i) => {
    const t = tokens[i];
    if (t.type === "literal") return { end: i + 1, text: t.ch, penalty: 0 };
    if (t.type === "space") return { end: i + 1, text: " ", penalty: 0 };
    return { end: i + 1, text: t.sym, penalty: LITERAL_PENALTY };
  };
  return { size: tokens.length, lattice, literalAt };
}

function pinyinLattice(dict, input) {
  const chars = Array.from(input.toLowerCase().replace(/ü/g, "v"));
  const lattice = chars.map((_, i) => {
    const edges = [];
    let base = "";
    for (let j = i; j < chars.length && j < i + 6 && /[a-z]/.test(chars[j]); j++) {
      base += chars[j];
      const byTone = dict.pinyinBase.get(base);
      if (!byTone) continue;
      const digit = chars[j + 1];
      if (/[1-5]/.test(digit ?? "")) {
        const syl = byTone.get(Number(digit));
        if (syl) edges.push({ end: j + 2, syllables: [syl], toned: true, src: base + digit });
      } else {
        edges.push({ end: j + 1, syllables: [...byTone.values()], toned: false, src: base });
      }
    }
    return edges;
  });
  const literalAt = (i) => ({
    end: i + 1,
    text: chars[i],
    penalty: /[a-z1-5]/.test(chars[i]) ? LITERAL_PENALTY : 0,
  });
  return { size: chars.length, lattice, literalAt };
}

// 輸出注音或拼音；按鍵沒有聲調資訊的音節不輸出聲調，避免把詞頻猜的聲調當成原文。
function renderSyllables(dict, segments, target) {
  const one = (syl, toned) => {
    if (target === "bpmf") return toned ? syl : stripTone(syl);
    const py = dict.pinyin.get(syl) ?? syl;
    return toned ? pinyinWithMarks(py) : py.replace(/[1-5]$/, "").replace(/v/g, "ü");
  };
  return segments.map((seg) => {
    if (seg.kind === "literal") return seg.text;
    return seg.syllables.map((s, k) => one(s, seg.toned[k])).join(" ") + " ";
  }).join("").replace(/ +$/, "").replace(/ {2,}/g, " ");
}

// 두벌식 自動組字。
function composeHangul(jamoList) {
  const out = [];
  let L = null, V = null, T = null;
  const isVowel = (j) => HANGUL_V.includes(j);
  const combine = (a, b) => Object.keys(HANGUL_COMPOUND).find((k) => HANGUL_COMPOUND[k] === a + b);
  const flush = () => {
    if (L && V) out.push(String.fromCharCode(0xac00 + (HANGUL_L.indexOf(L) * 21 + HANGUL_V.indexOf(V)) * 28 + HANGUL_T.indexOf(T ?? "")));
    else if (L) out.push(L);
    else if (V) out.push(V);
    L = V = T = null;
  };
  for (const item of jamoList) {
    if (item.literal) { flush(); out.push(item.literal); continue; }
    const j = item.jamo;
    if (!isVowel(j)) {
      if (L && V) {
        if (!T && HANGUL_T.includes(j)) T = j;
        else if (T && combine(T, j) && HANGUL_T.includes(combine(T, j))) T = combine(T, j);
        else { flush(); L = j; }
      } else { flush(); L = j; }
      continue;
    }
    if (T) {
      const split = HANGUL_COMPOUND[T];
      let moved;
      if (split) { T = split[0]; moved = split[1]; } else { moved = T; T = null; }
      flush(); L = moved; V = j;
    } else if (L && !V) {
      V = j;
    } else if (V && combine(V, j) && isVowel(combine(V, j))) {
      V = combine(V, j);
    } else { flush(); V = j; }
  }
  flush();
  return out.join("");
}

function decodeHangul(input, target) {
  const keyToJamo = invert(HANGUL_KEYS);
  const list = Array.from(input).map((ch) => {
    const jamo = keyToJamo[ch] ?? keyToJamo[ch.toLowerCase()];
    return jamo ? { jamo } : { literal: ch };
  });
  if (target === "jamo") return list.map((x) => x.jamo ?? x.literal).join("");
  return composeHangul(list);
}

function decodeGreek(input) {
  const keyToSym = invert(GREEK_KEYS);
  const chars = Array.from(input);
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const pair = chars[i] + (chars[i + 1] ?? "");
    if ((chars[i] === ";" || chars[i] === ":") && keyToSym[pair]) { out += keyToSym[pair]; i++; continue; }
    out += keyToSym[chars[i]] ?? chars[i];
  }
  return out;
}

/**
 * @returns {{ output: string, segments: Array|null, invalid: number }}
 * segments 只有注音、拼音會提供；invalid 是組不成音節而原樣輸出的按鍵數。
 * toneless：注音按鍵已移除聲調，沒有聲調鍵的音節以所有聲調比對。
 * capsAsKeys：注音按鍵含字首大寫，大寫英文字母視同小寫按鍵；關閉時大寫字母原樣保留。
 */
export function decode(input, { keyboard, target, toneless = false, capsAsKeys = false }, dict) {
  const kb = getKeyboard(keyboard);
  if (kb.family === "zhuyin" || kb.family === "pinyin") {
    if (!dict) return { output: "", segments: null, invalid: 0, pending: true };
    const { size, lattice, literalAt } = kb.family === "zhuyin" ? zhuyinLattice(dict, kb, input, toneless, capsAsKeys) : pinyinLattice(dict, input);
    const segments = decodeLattice(dict, size, lattice, literalAt);
    const invalid = segments.filter((s) => s.invalid).length;
    return { output: renderSyllables(dict, segments, target), segments, invalid };
  }
  if (kb.family === "hangul") return { output: decodeHangul(input, target), segments: null, invalid: 0 };
  if (kb.family === "greek") return { output: decodeGreek(input), segments: null, invalid: 0 };
  const keyToSym = invert(RUSSIAN_KEYS);
  keyToSym["/"] = "."; keyToSym["?"] = ",";
  return { output: Array.from(input).map((ch) => keyToSym[ch] ?? ch).join(""), segments: null, invalid: 0 };
}
