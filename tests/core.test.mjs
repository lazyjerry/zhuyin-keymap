import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDict, pinyinWithMarks } from "../src/lib/dict.js";
import { encode } from "../src/lib/encode.js";
import { decode } from "../src/lib/decode.js";
import { countText } from "../src/lib/stats.js";
import { evaluate } from "../src/lib/password.js";

const dict = parseDict(readFileSync(new URL("../public/data/zhuyin-dict.txt", import.meta.url), "utf8"));
const enc = (text, opts = {}) => encode(text, { keyboard: "dachen", autoOther: true, tone1Space: true, ...opts }, dict).output;
const dec = (keys, opts = {}) => decode(keys, { keyboard: "dachen", target: "han", ...opts }, dict).output;

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

test("反向：注音大千 → 中文", () => {
  assert.equal(dec("su3cl3"), "你好");
  assert.equal(dec("ji394su3"), "我愛你");
  assert.equal(dec("w96j0 "), "台灣");
  assert.equal(dec("w96j0"), "台灣");
  assert.equal(dec("su3cl3", { target: "bpmf" }), "ㄋㄧˇ ㄏㄠˇ");
  assert.equal(dec("su3cl3", { target: "pinyin" }), "nǐ hǎo");
  assert.equal(dec("ABC su3"), "ABC 你");
});

test("反向：往返一致", () => {
  for (const text of ["今天天氣很好", "我們一起去吃飯", "資訊安全很重要", "銀行密碼"]) {
    assert.equal(dec(enc(text)), text);
    assert.equal(decode(enc(text, { keyboard: "eten" }), { keyboard: "eten", target: "han" }, dict).output, text);
  }
});

test("反向：拼音、韓文、俄文、希臘文", () => {
  assert.equal(dec("nihao", { keyboard: "pinyin" }), "你好");
  assert.equal(dec("ni3hao3", { keyboard: "pinyin" }), "你好");
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
  assert.equal(dec("ji9w9j0", { toneless: true }), "我愛台灣");
  for (const text of ["今天天氣很好", "資訊安全很重要"]) {
    assert.equal(dec(enc(text, { dropTones: true }), { toneless: true }), text);
  }
});
