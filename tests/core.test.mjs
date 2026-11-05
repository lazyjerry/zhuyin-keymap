import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDict, pinyinWithMarks, readText, stripTone } from "../src/lib/dict.js";
import { encode } from "../src/lib/encode.js";
import { decode } from "../src/lib/decode.js";
import { countText } from "../src/lib/stats.js";
import { evaluate } from "../src/lib/password.js";

const dict = parseDict(readFileSync(new URL("../public/data/zhuyin-dict.txt", import.meta.url), "utf8"));
const enc = (text, opts = {}) => encode(text, { keyboard: "dachen", autoOther: true, tone1Space: true, ...opts }, dict).output;
const dec = (keys, opts = {}) => decode(keys, { keyboard: "dachen", target: "bpmf", ...opts }, dict).output;
// 原文的注音讀音（以空白分隔），作為往返比對的期望值。
const bpmfOf = (text, toneless = false) => readText(dict, text).map((r) => (toneless ? stripTone(r.reading) : r.reading)).join(" ");

test("注音大千：常用詞", () => {
  assert.equal(enc("你好"), "su3cl3");
  assert.equal(enc("我愛你"), "ji394su3");
  assert.equal(enc("台灣"), "w96j0 ");
  assert.equal(enc("台灣", { tone1Space: false }), "w96j0");
});

test("注音：破音字依詞決定讀音", () => {
  assert.equal(enc("銀行"), enc("銀") + "c;6");
  assert.equal(enc("長大"), "5;3284");
});

test("注音倚天與拼音", () => {
  assert.equal(enc("你好", { keyboard: "eten" }), "ne3hz3");
  assert.equal(enc("你好", { keyboard: "pinyin" }), "nihao");
  assert.equal(enc("你好", { keyboard: "pinyin", pinyinTone: true }), "ni3hao3");
});

test("其他語系自動套用", () => {
  assert.equal(enc("안녕하세요"), "dkssudgktpdy");
  assert.equal(enc("Привет"), "Ghbdtn");
  assert.equal(enc("καλημέρα"), "kalhm;era");
  assert.equal(enc("안녕", { autoOther: false }), "안녕");
  assert.equal(enc("ABC 123，"), "ABC 123<");
});

test("反向：注音大千 → 注音、拼音", () => {
  assert.equal(dec("su3cl3"), "ㄋㄧˇ ㄏㄠˇ");
  assert.equal(dec("ji394su3"), "ㄨㄛˇ ㄞˋ ㄋㄧˇ");
  assert.equal(dec("w96j0 "), "ㄊㄞˊ ㄨㄢ");
  assert.equal(dec("w96j0"), "ㄊㄞˊ ㄨㄢ");
  assert.equal(dec("su3cl3", { target: "pinyin" }), "nǐ hǎo");
  assert.equal(dec("ABC su3"), "ABC ㄋㄧˇ");
});

test("反向：配置選錯時回報組不成音節的按鍵數", () => {
  const keys = enc("令狐沖");
  assert.equal(decode(keys, { keyboard: "dachen", target: "bpmf" }, dict).invalid, 0);
  assert.ok(decode(keys, { keyboard: "eten", target: "bpmf" }, dict).invalid > 0);
});

test("反向：往返一致", () => {
  for (const text of ["今天天氣很好", "我們一起去吃飯", "資訊安全很重要", "銀行密碼"]) {
    assert.equal(dec(enc(text)), bpmfOf(text));
    assert.equal(dec(enc(text, { keyboard: "eten" }), { keyboard: "eten" }), bpmfOf(text));
  }
});

test("反向：拼音、韓文、俄文、希臘文", () => {
  assert.equal(dec("nihao", { keyboard: "pinyin" }), "ㄋㄧ ㄏㄠ");
  assert.equal(dec("nihao", { keyboard: "pinyin", target: "pinyin" }), "ni hao");
  assert.equal(dec("ni3hao3", { keyboard: "pinyin" }), "ㄋㄧˇ ㄏㄠˇ");
  assert.equal(dec("dkssudgktpdy", { keyboard: "hangul", target: "hangul" }), "안녕하세요");
  assert.equal(dec("gksrmf", { keyboard: "hangul", target: "hangul" }), "한글");
  assert.equal(dec("dlfrdj", { keyboard: "hangul", target: "hangul" }), "읽어");
  assert.equal(dec("Ghbdtn", { keyboard: "russian", target: "text" }), "Привет");
  assert.equal(dec("kalhm;era", { keyboard: "greek", target: "text" }), "καλημέρα");
});

test("拼音調號", () => {
  assert.equal(pinyinWithMarks("lv4"), "lǜ");
  assert.equal(pinyinWithMarks("hao3"), "hǎo");
  assert.equal(pinyinWithMarks("gou3"), "gǒu");
  assert.equal(pinyinWithMarks("gui4"), "guì");
  assert.equal(pinyinWithMarks("de5"), "de");
});

test("字元統計", () => {
  assert.deepEqual(countText("Ab1 #中👍🏽"), { total: 7, upper: 1, lower: 1, digit: 1, symbol: 2, space: 1, letter: 1, other: 0 });
});

test("密碼標準", () => {
  const weak = evaluate("123456");
  assert.ok(weak.standards.every((s) => !s.pass));
  const strong = evaluate("Ji394su3-Taipei-2026");
  assert.ok(strong.standards.every((s) => s.pass));
  assert.ok(evaluate("w96j0 ").warnings.length > 0);
});

test("移除聲調：正向不輸出聲調鍵、反向以所有聲調比對", () => {
  assert.equal(enc("我愛台灣", { dropTones: true }), "ji9w9j0");
  assert.equal(enc("你好", { keyboard: "eten", dropTones: true }), "nehz");
  assert.equal(dec("ji9w9j0", { toneless: true }), "ㄨㄛ ㄞ ㄊㄞ ㄨㄢ");
  for (const text of ["今天天氣很好", "資訊安全很重要"]) {
    assert.equal(dec(enc(text, { dropTones: true }), { toneless: true }), bpmfOf(text, true));
  }
});

test("字首大寫：正向每字首鍵大寫、反向大寫視同按鍵", () => {
  assert.equal(enc("太難了", { capitalize: true }), "W94S06Xk7");
  assert.equal(enc("台灣", { capitalize: true, keyboard: "pinyin" }), "TaiWan");
  assert.equal(enc("安녕", { capitalize: true }), "0 sud");
  assert.equal(dec("W94S06Xk7", { capsAsKeys: true }), "ㄊㄞˋ ㄋㄢˊ ㄌㄜ˙");
  assert.equal(dec("TaiWan", { keyboard: "pinyin" }), "ㄊㄞ ㄨㄢ");
  for (const text of ["今天天氣很好", "資訊安全很重要"]) {
    assert.equal(dec(enc(text, { capitalize: true }), { capsAsKeys: true }), bpmfOf(text));
  }
});
