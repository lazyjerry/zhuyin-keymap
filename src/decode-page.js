import { decode, TARGETS } from "./lib/decode.js";
import { getKeyboard, invert } from "./lib/keyboards.js";
import { loadDict, fillKeyboardSelect, copyText, setStatus } from "./shared.js";

const $ = (id) => document.getElementById(id);
const keys = $("keys");
const keyboard = $("keyboard");
const target = $("target");
const output = $("output");
const status = $("decode-status");
const copyBtn = $("copy");
const candidates = $("candidates");

const ROWS = ["`1234567890-=", "qwertyuiop[]", "asdfghjkl;'", "zxcvbnm,./"];
const NOTES = {
  zhuyin: "一聲按空白鍵；聲調鍵見數字列。解碼時一聲的空白可省略，但同音斷詞可能不同。",
  pinyin: "拼音直接使用英文字母，ü 以 v 輸入；數字 1–5 可標示聲調，省略時依詞頻自動判斷。",
  hangul: "右下角橘色為 Shift 後的字母。複合母音、複合尾音由兩個按鍵組成，會自動組字。",
  russian: "右下角橘色為 Shift 後的字母。俄文配置的句號在 / 鍵、逗號在 Shift + /。",
  greek: "右下角橘色為 Shift 後的字母。帶重音的母音先按 ; 再按字母，分音符先按 Shift + ;。",
};

let dict = null;
let dictError = "";
let choices = new Map();
let lastKey = "";
let result = { output: "", segments: null };

fillKeyboardSelect(keyboard);

function fillTargets() {
  const family = getKeyboard(keyboard.value).family;
  const previous = target.value;
  const list = TARGETS[family];
  target.replaceChildren(...list.map((t) => new Option(t.name, t.id)));
  target.value = list.some((t) => t.id === previous) ? previous : list[0].id;
}

function renderChart() {
  const kb = getKeyboard(keyboard.value);
  const toSym = kb.map ? invert(kb.map) : {};
  if (kb.family === "zhuyin") toSym[" "] = "一聲";
  $("kb-subtitle").textContent = `${kb.name}：每個按鍵對應的符號`;
  $("kb-chart").setAttribute("aria-label", `${kb.name}鍵盤對照圖`);
  const shiftOf = { "`": "~", "[": "{", "]": "}", ";": ":", "'": "\"", ",": "<", ".": ">", "/": "?" };
  $("kb-chart").replaceChildren(...ROWS.map((row) => {
    const div = document.createElement("div");
    div.className = "kb-row";
    div.append(...Array.from(row).map((k) => {
      const key = document.createElement("div");
      const sym = kb.family === "pinyin" ? (/[a-z]/.test(k) ? k : /[1-5]/.test(k) ? `${k}聲` : "") : toSym[k] ?? "";
      const shifted = toSym[shiftOf[k] ?? k.toUpperCase()];
      key.className = `key${sym ? "" : " empty"}`;
      const label = document.createElement("span");
      label.className = "k";
      label.textContent = k;
      const main = document.createElement("span");
      main.className = "s";
      main.textContent = sym || "·";
      const alt = document.createElement("span");
      alt.className = "s2";
      alt.textContent = shifted && shifted !== sym && kb.family !== "zhuyin" ? shifted : "";
      key.append(label, main, alt);
      return key;
    }));
    return div;
  }));
  $("kb-note").textContent = NOTES[kb.family];
}

function renderCandidates() {
  const segs = (result.segments ?? []).map((seg, idx) => ({ seg, idx })).filter(({ seg }) => seg.kind !== "literal");
  $("candidates-wrap").hidden = segs.length === 0 || target.value !== "han";
  candidates.replaceChildren(...segs.slice(0, 120).map(({ seg, idx }) => {
    const li = document.createElement("li");
    if (seg.kind === "bpmf") li.classList.add("unmapped");
    const keysEl = document.createElement("span");
    keysEl.className = "keys";
    keysEl.textContent = seg.src.replace(/ /g, "␣");
    li.append(keysEl);
    if (seg.candidates.length > 1) {
      li.classList.add("poly");
      const select = document.createElement("select");
      select.setAttribute("aria-label", `按鍵「${seg.src.trim()}」的候選字`);
      select.dataset.index = String(idx);
      const chosen = choices.get(idx) ?? seg.text;
      select.append(...seg.candidates.slice(0, 15).map((c) => new Option(c.word, c.word, false, c.word === chosen)));
      li.append(select);
    } else {
      const src = document.createElement("span");
      src.className = "src";
      src.textContent = seg.kind === "bpmf" ? seg.text : (choices.get(idx) ?? seg.text);
      li.append(src);
    }
    const bpmf = document.createElement("span");
    bpmf.className = "bpmf";
    bpmf.textContent = seg.kind === "bpmf" ? "查無此音" : seg.syllables.join(" ");
    li.append(bpmf);
    return li;
  }));
}

function update() {
  const key = `${keys.value}\u0000${keyboard.value}`;
  if (key !== lastKey) { choices = new Map(); lastKey = key; }
  result = decode(keys.value, { keyboard: keyboard.value, target: target.value, choices }, dict);
  output.textContent = result.output;
  output.classList.toggle("han", target.value === "han" || target.value === "hangul" || target.value === "text");
  copyBtn.disabled = result.output.length === 0;

  if (result.pending && keys.value) {
    setStatus(status, dictError ? `${dictError}` : "注音字典載入中，稍後自動解碼…", dictError ? "error" : "");
  } else if (result.segments?.some((s) => s.kind === "bpmf")) {
    setStatus(status, "部分注音找不到對應的字，已以注音符號顯示。請確認鍵盤配置是否正確。", "error");
  } else if (result.output) {
    setStatus(status, `已還原 ${Array.from(keys.value).length} 個按鍵。`);
  } else {
    setStatus(status, "");
  }
  renderCandidates();
}

keys.addEventListener("input", update);
keyboard.addEventListener("change", () => { fillTargets(); renderChart(); update(); });
target.addEventListener("change", update);
candidates.addEventListener("change", (event) => {
  const select = event.target.closest("select");
  if (!select) return;
  choices.set(Number(select.dataset.index), select.value);
  update();
  candidates.querySelector(`select[data-index="${select.dataset.index}"]`)?.focus();
});
copyBtn.addEventListener("click", async () => {
  try {
    await copyText(result.output);
    setStatus(status, "已複製到剪貼簿。", "ok");
  } catch {
    setStatus(status, "無法存取剪貼簿，請手動選取結果複製。", "error");
  }
});

fillTargets();
renderChart();
update();
loadDict()
  .then((d) => { dict = d; update(); })
  .catch((err) => { dictError = err.message; update(); });
