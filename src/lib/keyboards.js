// 鍵盤配置定義：符號 → 美式鍵盤按鍵。
// 注音配置的聲調以 ˊˇˋ˙ 表示，一聲在實際輸入時按空白鍵。

export const TONE_MARKS = ["ˊ", "ˇ", "ˋ", "˙"];

const DACHEN = {
  "ㄅ": "1", "ㄆ": "q", "ㄇ": "a", "ㄈ": "z", "ㄉ": "2", "ㄊ": "w", "ㄋ": "s", "ㄌ": "x",
  "ㄍ": "e", "ㄎ": "d", "ㄏ": "c", "ㄐ": "r", "ㄑ": "f", "ㄒ": "v", "ㄓ": "5", "ㄔ": "t",
  "ㄕ": "g", "ㄖ": "b", "ㄗ": "y", "ㄘ": "h", "ㄙ": "n", "ㄧ": "u", "ㄨ": "j", "ㄩ": "m",
  "ㄚ": "8", "ㄛ": "i", "ㄜ": "k", "ㄝ": ",", "ㄞ": "9", "ㄟ": "o", "ㄠ": "l", "ㄡ": ".",
  "ㄢ": "0", "ㄣ": "p", "ㄤ": ";", "ㄥ": "/", "ㄦ": "-",
  "ˊ": "6", "ˇ": "3", "ˋ": "4", "˙": "7",
};

const ETEN = {
  "ㄅ": "b", "ㄆ": "p", "ㄇ": "m", "ㄈ": "f", "ㄉ": "d", "ㄊ": "t", "ㄋ": "n", "ㄌ": "l",
  "ㄍ": "v", "ㄎ": "k", "ㄏ": "h", "ㄐ": "g", "ㄑ": "7", "ㄒ": "c", "ㄓ": ",", "ㄔ": ".",
  "ㄕ": "/", "ㄖ": "j", "ㄗ": ";", "ㄘ": "'", "ㄙ": "s", "ㄧ": "e", "ㄨ": "x", "ㄩ": "u",
  "ㄚ": "a", "ㄛ": "o", "ㄜ": "r", "ㄝ": "w", "ㄞ": "i", "ㄟ": "q", "ㄠ": "z", "ㄡ": "y",
  "ㄢ": "8", "ㄣ": "9", "ㄤ": "0", "ㄥ": "-", "ㄦ": "=",
  "˙": "1", "ˊ": "2", "ˇ": "3", "ˋ": "4",
};

// 中文全形標點在注音輸入法中的按鍵（Shift + 鍵）。
export const ZHUYIN_PUNCT = { "，": "<", "。": ">", "？": "?", "！": "!", "：": ":" };
export const PINYIN_PUNCT = { "，": ",", "。": ".", "？": "?", "！": "!", "：": ":", "、": "\\" };

// 韓文 두벌식（KS X 5002）。
export const HANGUL_KEYS = {
  "ㅂ": "q", "ㅈ": "w", "ㄷ": "e", "ㄱ": "r", "ㅅ": "t", "ㅛ": "y", "ㅕ": "u", "ㅑ": "i", "ㅐ": "o", "ㅔ": "p",
  "ㅁ": "a", "ㄴ": "s", "ㅇ": "d", "ㄹ": "f", "ㅎ": "g", "ㅗ": "h", "ㅓ": "j", "ㅏ": "k", "ㅣ": "l",
  "ㅋ": "z", "ㅌ": "x", "ㅊ": "c", "ㅍ": "v", "ㅠ": "b", "ㅜ": "n", "ㅡ": "m",
  "ㅃ": "Q", "ㅉ": "W", "ㄸ": "E", "ㄲ": "R", "ㅆ": "T", "ㅒ": "O", "ㅖ": "P",
};
// 複合母音、複合尾音拆成兩個按鍵字母。
export const HANGUL_COMPOUND = {
  "ㅘ": "ㅗㅏ", "ㅙ": "ㅗㅐ", "ㅚ": "ㅗㅣ", "ㅝ": "ㅜㅓ", "ㅞ": "ㅜㅔ", "ㅟ": "ㅜㅣ", "ㅢ": "ㅡㅣ",
  "ㄳ": "ㄱㅅ", "ㄵ": "ㄴㅈ", "ㄶ": "ㄴㅎ", "ㄺ": "ㄹㄱ", "ㄻ": "ㄹㅁ", "ㄼ": "ㄹㅂ", "ㄽ": "ㄹㅅ",
  "ㄾ": "ㄹㅌ", "ㄿ": "ㄹㅍ", "ㅀ": "ㄹㅎ", "ㅄ": "ㅂㅅ",
};
export const HANGUL_L = Array.from("ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ");
export const HANGUL_V = Array.from("ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ");
export const HANGUL_T = ["", ...Array.from("ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ")];

// 俄文 ЙЦУКЕН（Windows 標準）。
const RUSSIAN_LOWER = {
  "й": "q", "ц": "w", "у": "e", "к": "r", "е": "t", "н": "y", "г": "u", "ш": "i", "щ": "o", "з": "p", "х": "[", "ъ": "]",
  "ф": "a", "ы": "s", "в": "d", "а": "f", "п": "g", "р": "h", "о": "j", "л": "k", "д": "l", "ж": ";", "э": "'",
  "я": "z", "ч": "x", "с": "c", "м": "v", "и": "b", "т": "n", "ь": "m", "б": ",", "ю": ".", "ё": "`",
};
const SHIFTED = { "[": "{", "]": "}", ";": ":", "'": "\"", ",": "<", ".": ">", "`": "~" };
export const RUSSIAN_KEYS = { ...RUSSIAN_LOWER, "№": "#" };
for (const [ch, key] of Object.entries(RUSSIAN_LOWER)) RUSSIAN_KEYS[ch.toUpperCase()] = SHIFTED[key] ?? key.toUpperCase();

// 希臘文標準配置；帶重音的母音以「; + 字母」輸入，分音符以「: + 字母」輸入。
const GREEK_LOWER = {
  "ς": "w", "ε": "e", "ρ": "r", "τ": "t", "υ": "y", "θ": "u", "ι": "i", "ο": "o", "π": "p",
  "α": "a", "σ": "s", "δ": "d", "φ": "f", "γ": "g", "η": "h", "ξ": "j", "κ": "k", "λ": "l",
  "ζ": "z", "χ": "x", "ψ": "c", "ω": "v", "β": "b", "ν": "n", "μ": "m",
};
export const GREEK_KEYS = { ...GREEK_LOWER, ";": "q" };
for (const [ch, key] of Object.entries(GREEK_LOWER)) if (ch !== "ς") GREEK_KEYS[ch.toUpperCase()] = key.toUpperCase();
const GREEK_TONOS = { "ά": ";a", "έ": ";e", "ή": ";h", "ί": ";i", "ό": ";o", "ύ": ";y", "ώ": ";v", "ϊ": ":i", "ϋ": ":y" };
for (const [ch, keys] of Object.entries(GREEK_TONOS)) {
  GREEK_KEYS[ch] = keys;
  const upper = ch.toUpperCase();
  if (upper !== ch) GREEK_KEYS[upper] = keys[0] + keys[1].toUpperCase();
}

export const KEYBOARDS = [
  { id: "dachen", name: "注音（大千）", family: "zhuyin", map: DACHEN, tone1: " " },
  { id: "eten", name: "注音（倚天）", family: "zhuyin", map: ETEN, tone1: " " },
  { id: "pinyin", name: "漢語拼音", family: "pinyin" },
  { id: "hangul", name: "韓文（두벌식）", family: "hangul", map: HANGUL_KEYS },
  { id: "russian", name: "俄文（ЙЦУКЕН）", family: "russian", map: RUSSIAN_KEYS },
  { id: "greek", name: "希臘文", family: "greek", map: GREEK_KEYS },
];

export const getKeyboard = (id) => KEYBOARDS.find((k) => k.id === id) ?? KEYBOARDS[0];

export const invert = (map) => {
  const out = {};
  for (const [sym, key] of Object.entries(map)) if (!(key in out)) out[key] = sym;
  return out;
};
