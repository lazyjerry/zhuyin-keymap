// 把 McBopomofo 詞庫原始檔轉成前端用的精簡字典。
// 用法：node scripts/build-dict.mjs <來源目錄> <輸出檔>
// 輸出為純文字，三個區段：
//   #C 單字：字 \t 詞頻 \t 讀音1,讀音2（第一個為常用讀音）
//   #P 詞語：詞 \t 詞頻 \t 讀音（音節以空白分隔，多種讀法以 | 分隔）
//   #Y 注音音節對應拼音：注音 \t 拼音（數字聲調）
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [src, out] = process.argv.slice(2);
if (!src || !out) {
  console.error("用法：node scripts/build-dict.mjs <來源目錄> <輸出檔>");
  process.exit(1);
}

const MIN_PHRASE_COUNT = Number(process.env.MIN_PHRASE_COUNT ?? 20);
const MAX_PHRASE_LEN = 6;

const lines = (file) =>
  readFileSync(join(src, file), "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));

const occ = new Map();
for (const line of lines("phrase.occ")) {
  const [word, count] = line.split(/\s+/);
  occ.set(word, Number(count) || 0);
}

// 單字讀音：先依 heterophony1/2/3 排出常用讀音，其餘依 BPMFBase 順序。
const priority = new Map();
["heterophony1.list", "heterophony2.list", "heterophony3.list"].forEach((file, rank) => {
  for (const line of lines(file)) {
    const [ch, reading] = line.split(/\s+/);
    priority.set(`${ch} ${reading}`, rank);
  }
});

const chars = new Map();
const pinyin = new Map();
for (const line of lines("BPMFBase.txt")) {
  const [ch, reading, py, , category] = line.split(/\s+/);
  if (!pinyin.has(reading) && py) pinyin.set(reading, py);
  if (category !== "big5" && !(occ.get(ch) > 0)) continue;
  if (!chars.has(ch)) chars.set(ch, []);
  const list = chars.get(ch);
  if (!list.includes(reading)) list.push(reading);
}
for (const [ch, list] of chars) {
  const order = (r) => priority.get(`${ch} ${r}`) ?? 9;
  list.sort((a, b) => order(a) - order(b));
}

const phrases = new Map();
for (const line of lines("BPMFMappings.txt")) {
  const [word, ...syllables] = line.split(/\s+/);
  const len = Array.from(word).length;
  if (len < 2 || len > MAX_PHRASE_LEN || len !== syllables.length) continue;
  const count = occ.get(word) ?? 0;
  if (count < MIN_PHRASE_COUNT) continue;
  if (!phrases.has(word)) phrases.set(word, { count, readings: [] });
  const reading = syllables.join(" ");
  const entry = phrases.get(word);
  if (!entry.readings.includes(reading)) entry.readings.push(reading);
}

const outLines = ["#C"];
for (const [ch, list] of chars) outLines.push(`${ch}\t${occ.get(ch) ?? 0}\t${list.join(",")}`);
outLines.push("#P");
for (const [word, { count, readings }] of phrases) outLines.push(`${word}\t${count}\t${readings.join("|")}`);
outLines.push("#Y");
for (const [reading, py] of pinyin) outLines.push(`${reading}\t${py}`);

writeFileSync(out, outLines.join("\n") + "\n");
console.log(`單字 ${chars.size}、詞語 ${phrases.size}、音節 ${pinyin.size} → ${out}`);
