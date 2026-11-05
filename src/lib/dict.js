// 注音字典：解析、中文斷詞取讀音（正向）、注音音節解碼成中文（反向）。
import { TONE_MARKS } from "./keyboards.js";

const TONE_RE = /[ˊˇˋ˙]/g;
export const stripTone = (syllable) => syllable.replace(TONE_RE, "");
export const toneOf = (syllable) => {
  const mark = syllable.match(TONE_RE)?.[0];
  return mark ? TONE_MARKS.indexOf(mark) + 2 : 1; // 1 一聲、2 ˊ、3 ˇ、4 ˋ、5 ˙
};

export function parseDict(text) {
  const chars = new Map();
  const phrases = new Map();
  const pinyin = new Map();
  let section = "";
  let total = 0;
  for (const line of text.split("\n")) {
    if (!line) continue;
    if (line.startsWith("#")) { section = line; continue; }
    const parts = line.split("\t");
    if (section === "#C") {
      const count = Number(parts[1]);
      chars.set(parts[0], { count, readings: parts[2].split(",") });
      total += count;
    } else if (section === "#P") {
      const count = Number(parts[1]);
      phrases.set(parts[0], { count, readings: parts[2].split("|").map((r) => r.split(" ")) });
      total += count;
    } else if (section === "#Y") {
      pinyin.set(parts[0], parts[1]);
    }
  }

  // 反向索引：音節 → 字（依詞頻排序）、音節串 → 詞。
  const bySyllable = new Map();
  const push = (map, key, item) => { if (!map.has(key)) map.set(key, []); map.get(key).push(item); };
  for (const [ch, { count, readings }] of chars) for (const r of readings) push(bySyllable, r, { word: ch, count });
  for (const [word, { count, readings }] of phrases) for (const r of readings) push(bySyllable, r.join(" "), { word, count });
  for (const list of bySyllable.values()) list.sort((a, b) => b.count - a.count);

  const prefixes = new Set();
  let maxPhraseLen = 1;
  for (const key of bySyllable.keys()) {
    const syllables = key.split(" ");
    maxPhraseLen = Math.max(maxPhraseLen, syllables.length);
    for (let i = 1; i < syllables.length; i++) prefixes.add(syllables.slice(0, i).join(" "));
  }

  // 拼音：去聲調拼音 → { 聲調 → 注音音節 }。
  const pinyinBase = new Map();
  for (const [bpmf, py] of pinyin) {
    const base = py.replace(/[1-5]$/, "");
    if (!pinyinBase.has(base)) pinyinBase.set(base, new Map());
    const byTone = pinyinBase.get(base);
    const tone = toneOf(bpmf);
    if (!byTone.has(tone)) byTone.set(tone, bpmf);
  }

  const syllables = new Set(pinyin.keys());
  for (const r of bySyllable.keys()) if (!r.includes(" ")) syllables.add(r);
  const bases = new Set([...syllables].map(stripTone));
  // 去聲調注音 → 所有存在的聲調變體，供「按鍵已移除聲調」時解碼。
  const toneVariants = new Map();
  for (const syl of syllables) {
    const base = stripTone(syl);
    if (!toneVariants.has(base)) toneVariants.set(base, []);
    toneVariants.get(base).push(syl);
  }

  return {
    chars, phrases, pinyin, pinyinBase, bySyllable, prefixes, syllables, bases, toneVariants,
    maxPhraseLen: Math.min(maxPhraseLen, 6),
    logTotal: Math.log(total + 1),
  };
}

const score = (dict, count) => Math.log(count + 1) - dict.logTotal;

/**
 * 正向：把文字斷詞並取得每個漢字的讀音。
 * 回傳 [{ char, readings, reading }]；不在字典中的字 readings 為空陣列。
 */
export function readText(dict, text) {
  const chars = Array.from(text);
  const n = chars.length;
  const best = new Array(n + 1).fill(-Infinity);
  const back = new Array(n + 1);
  best[0] = 0;
  for (let i = 0; i < n; i++) {
    if (best[i] === -Infinity) continue;
    const entry = dict.chars.get(chars[i]);
    const single = best[i] + (entry ? score(dict, entry.count) : -dict.logTotal);
    if (single > best[i + 1]) { best[i + 1] = single; back[i + 1] = { start: i, phrase: null }; }
    let word = chars[i];
    for (let len = 2; len <= dict.maxPhraseLen && i + len <= n; len++) {
      word += chars[i + len - 1];
      const phrase = dict.phrases.get(word);
      if (!phrase) continue;
      const s = best[i] + score(dict, phrase.count);
      if (s > best[i + len]) { best[i + len] = s; back[i + len] = { start: i, phrase }; }
    }
  }
  const out = new Array(n);
  for (let end = n; end > 0;) {
    const { start, phrase } = back[end];
    for (let k = start; k < end; k++) {
      const readings = dict.chars.get(chars[k])?.readings ?? [];
      const preferred = phrase ? phrase.readings[0][k - start] : readings[0];
      const options = preferred && !readings.includes(preferred) ? [preferred, ...readings] : readings;
      out[k] = { char: chars[k], readings: options, reading: preferred ?? null };
    }
    end = start;
  }
  return out;
}

/**
 * 反向：把「音節格」解成最可能的中文。
 * lattice[i] = [{ end, syllables: [可能的注音音節…], src }]，表示 token i..end 可讀成一個音節。
 * literalAt(i) 回傳 { end, text, penalty } 表示該位置原樣輸出（無法組成音節時的退路）。
 * 回傳 [{ kind: "han" | "bpmf" | "literal", text, syllables, candidates, src }]
 */
export function decodeLattice(dict, size, lattice, literalAt) {
  const best = new Array(size + 1).fill(-Infinity);
  const back = new Array(size + 1);
  best[0] = 0;
  const relax = (end, value, seg) => { if (value > best[end]) { best[end] = value; back[end] = seg; } };

  for (let i = 0; i < size; i++) {
    if (best[i] === -Infinity) continue;
    const lit = literalAt(i);
    relax(lit.end, best[i] + lit.penalty, { start: i, kind: "literal", text: lit.text });

    // 深度優先展開音節路徑，查單字與詞語。
    const walk = (pos, path, key, src) => {
      for (const edge of lattice[pos] ?? []) {
        for (const syl of edge.syllables) {
          const nextKey = key ? `${key} ${syl}` : syl;
          const nextPath = [...path, syl];
          const nextSrc = src + edge.src;
          const words = dict.bySyllable.get(nextKey);
          if (words) {
            relax(edge.end, best[i] + score(dict, words[0].count), {
              start: i, kind: "han", text: words[0].word, syllables: nextPath, candidates: words, src: nextSrc,
            });
          } else if (nextPath.length === 1) {
            relax(edge.end, best[i] - dict.logTotal * 2, {
              start: i, kind: "bpmf", text: syl, syllables: nextPath, candidates: [], src: nextSrc,
            });
          }
          if (nextPath.length < dict.maxPhraseLen && dict.prefixes.has(nextKey)) walk(edge.end, nextPath, nextKey, nextSrc);
        }
      }
    };
    walk(i, [], "", "");
  }

  const segments = [];
  for (let end = size; end > 0;) {
    const seg = back[end];
    segments.push(seg);
    end = seg.start;
  }
  return segments.reverse();
}

// 數字聲調拼音轉成調號拼音，例如 lv4 → lǜ、hao3 → hǎo。
const TONE_VOWELS = { a: "āáǎà", e: "ēéěè", i: "īíǐì", o: "ōóǒò", u: "ūúǔù", "ü": "ǖǘǚǜ" };
export function pinyinWithMarks(numbered) {
  const tone = Number(numbered.match(/[1-5]$/)?.[0] ?? 1);
  const base = numbered.replace(/[1-5]$/, "").replace(/v/g, "ü");
  if (tone === 5) return base;
  let idx = base.search(/[ae]/);
  if (idx < 0) idx = base.indexOf("ou");
  if (idx < 0) for (let k = base.length - 1; k >= 0; k--) if (base[k] in TONE_VOWELS) { idx = k; break; }
  if (idx < 0) return base;
  return base.slice(0, idx) + TONE_VOWELS[base[idx]][tone - 1] + base.slice(idx + 1);
}
