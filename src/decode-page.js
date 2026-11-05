import { decode, TARGETS } from "./lib/decode.js";
import { getKeyboard, invert, KEYBOARDS } from "./lib/keyboards.js";
import { loadDict, fillKeyboardSelect, copyText, setStatus } from "./shared.js";

const $ = (id) => document.getElementById(id);
const keys = $("keys");
const keyboard = $("keyboard");
const target = $("target");
const output = $("output");
const status = $("decode-status");
const copyBtn = $("copy");
const optToneless = $("opt-toneless");
const optCaps = $("opt-caps");

const ROWS = ["`1234567890-=", "qwertyuiop[]", "asdfghjkl;'", "zxcvbnm,./"];
const NOTES = {
  zhuyin: "一聲按空白鍵；聲調鍵見數字列。解碼時一聲的空白可省略，音節斷點依詞頻判斷。",
  pinyin: "拼音直接使用英文字母，ü 以 v 輸入；數字 1–5 可標示聲調，未標聲調的音節輸出時不帶調。",
  hangul: "右下角橘色為 Shift 後的字母。複合母音、複合尾音由兩個按鍵組成，會自動組字。",
  russian: "右下角橘色為 Shift 後的字母。俄文配置的句號在 / 鍵、逗號在 Shift + /。",
  greek: "右下角橘色為 Shift 後的字母。帶重音的母音先按 ; 再按字母，分音符先按 Shift + ;。",
};

let dict = null;
let dictError = "";
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

// 輸入中是否含有目前注音配置的聲調鍵（或代表一聲的空白）。
function hasToneKeys(text) {
  const map = getKeyboard(keyboard.value).map;
  const toneKeys = new Set(["ˊ", "ˇ", "ˋ", "˙"].map((t) => map[t]));
  return Array.from(text).some((ch) => ch === " " || toneKeys.has(ch));
}

// 目前注音配置有按鍵組不成音節時，看另一套注音配置能不能解得更完整。
function betterZhuyinLayout(invalid) {
  const options = { target: target.value, toneless: optToneless.checked, capsAsKeys: optCaps.checked };
  return KEYBOARDS
    .filter((k) => k.family === "zhuyin" && k.id !== keyboard.value)
    .map((k) => ({ k, invalid: decode(keys.value, { ...options, keyboard: k.id }, dict).invalid }))
    .filter((x) => x.invalid < invalid)
    .sort((a, b) => a.invalid - b.invalid)[0]?.k ?? null;
}

function update() {
  const family = getKeyboard(keyboard.value).family;
  $("row-toneless").hidden = family !== "zhuyin";
  $("row-caps").hidden = family !== "zhuyin";
  result = decode(keys.value, { keyboard: keyboard.value, target: target.value, toneless: optToneless.checked, capsAsKeys: optCaps.checked }, dict);
  output.textContent = result.output;
  output.classList.toggle("han", target.value !== "pinyin" && target.value !== "jamo");
  copyBtn.disabled = result.output.length === 0;

  if (result.pending && keys.value) {
    setStatus(status, dictError ? `${dictError}` : "注音字典載入中，稍後自動解碼…", dictError ? "error" : "");
  } else if (result.invalid > 0) {
    const better = family === "zhuyin" ? betterZhuyinLayout(result.invalid) : null;
    setStatus(status, `有 ${result.invalid} 個按鍵組不成${family === "zhuyin" ? "注音" : "拼音"}音節，已原樣顯示。`
      + (better ? `改用「${better.name}」可解得更完整。` : "請確認鍵盤配置是否正確。"), "error");
  } else if (result.output && family === "zhuyin" && !optCaps.checked && /[A-Z]/.test(keys.value) && /[a-z0-9]/.test(keys.value)) {
    setStatus(status, "按鍵混有大寫字母，目前原樣保留；若是字首大寫產生的密碼，請開啟「按鍵含字首大寫」。");
  } else if (result.output && family === "zhuyin" && !optToneless.checked && !hasToneKeys(keys.value)
    && (result.segments ?? []).filter((s) => s.kind !== "literal").length > 0) {
    setStatus(status, "按鍵裡沒有任何聲調鍵或空白；若是移除聲調後的密碼，請開啟「按鍵已移除聲調」。");
  } else if (result.output) {
    setStatus(status, `已還原 ${Array.from(keys.value).length} 個按鍵。`);
  } else {
    setStatus(status, "");
  }
}

keys.addEventListener("input", update);
keyboard.addEventListener("change", () => { fillTargets(); renderChart(); update(); });
target.addEventListener("change", update);
optToneless.addEventListener("change", update);
optCaps.addEventListener("change", update);
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
