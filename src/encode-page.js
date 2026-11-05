import { encode } from "./lib/encode.js";
import { getKeyboard } from "./lib/keyboards.js";
import { countText } from "./lib/stats.js";
import { evaluate, entropyLabel, CHECKS } from "./lib/password.js";
import { loadDict, fillKeyboardSelect, copyText, setStatus, renderWithSpaces } from "./shared.js";

const $ = (id) => document.getElementById(id);
const source = $("source");
const keyboard = $("keyboard");
const optAuto = $("opt-auto");
const optTone1 = $("opt-tone1");
const optPinyinTone = $("opt-pinyin-tone");
const optDropTones = $("opt-drop-tones");
const optCapitalize = $("opt-capitalize");
const output = $("output");
const status = $("encode-status");
const copyBtn = $("copy");
const breakdown = $("breakdown");

const BREAKDOWN_LIMIT = 200;
const KIND_LABEL = { ascii: "原樣", space: "空白", punct: "標點", bopomofo: "注音", hangul: "韓文", cyrillic: "俄文", greek: "希臘文" };

let dict = null;
let dictError = "";
let overrides = new Map();
let lastText = "";
let current = { output: "", tokens: [] };

fillKeyboardSelect(keyboard);

function syncToggles() {
  const family = getKeyboard(keyboard.value).family;
  const zhuyin = family === "zhuyin" || optAuto.checked && family !== "pinyin";
  $("row-tone1").hidden = !zhuyin;
  $("row-drop-tones").hidden = !zhuyin;
  $("row-pinyin").hidden = family !== "pinyin";
  $("row-capitalize").hidden = !(family === "zhuyin" || family === "pinyin" || optAuto.checked);
  // 移除聲調鍵時，一聲空白鍵的設定沒有作用。
  optTone1.disabled = optDropTones.checked;
  $("row-tone1").classList.toggle("is-disabled", optDropTones.checked);
}

function renderBreakdown(tokens) {
  const items = tokens.filter((t) => t.kind !== "ascii" && t.kind !== "space").slice(0, BREAKDOWN_LIMIT);
  breakdown.replaceChildren(...items.map((t) => {
    const li = document.createElement("li");
    const src = document.createElement("span");
    src.className = "src";
    src.textContent = t.src;
    li.append(src);
    if (t.kind === "han") {
      if (t.readings.length > 1) {
        li.classList.add("poly");
        const select = document.createElement("select");
        select.setAttribute("aria-label", `「${t.src}」的讀音`);
        select.dataset.index = String(t.index);
        select.append(...t.readings.map((r) => new Option(r, r, false, r === t.reading)));
        li.append(select);
      } else {
        const bpmf = document.createElement("span");
        bpmf.className = "bpmf";
        bpmf.textContent = t.reading;
        li.append(bpmf);
      }
    } else if (t.kind === "unmapped" || t.kind === "pending") {
      li.classList.add("unmapped");
      const note = document.createElement("span");
      note.className = "bpmf";
      note.textContent = t.kind === "pending" ? "字典載入中" : "無法對應";
      li.append(note);
    } else {
      const note = document.createElement("span");
      note.className = "bpmf";
      note.textContent = KIND_LABEL[t.kind] ?? "";
      li.append(note);
    }
    if (t.kind !== "unmapped" && t.kind !== "pending") {
      const keys = document.createElement("span");
      keys.className = "keys";
      renderWithSpaces(keys, t.out);
      li.append(keys);
    }
    return li;
  }));
}

function renderStats() {
  const target = document.querySelector('input[name="stats-target"]:checked').value;
  const counts = countText(target === "source" ? source.value : current.output);
  for (const dd of document.querySelectorAll("#stats dd")) dd.textContent = String(counts[dd.dataset.key]);

  // 密碼檢核項目拆解：列出已符合的項目，未符合的只彙總成一行。
  const text = target === "source" ? source.value : current.output;
  const { checks } = evaluate(text);
  const passed = text ? checks.filter((c) => c.pass) : [];
  const failed = text ? checks.filter((c) => !c.pass) : [];
  $("check-count").textContent = `符合 ${passed.length} / ${CHECKS.length} 項`;
  const list = $("check-list");
  if (passed.length) {
    list.replaceChildren(...passed.map((c) => {
      const li = document.createElement("li");
      li.textContent = c.label;
      return li;
    }));
  } else {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = text ? "目前沒有符合的項目" : "輸入後列出符合的項目";
    list.replaceChildren(li);
  }
  $("check-missing").textContent = failed.length ? `未符合：${failed.map((c) => c.label).join("、")}` : "";
}

function renderPassword() {
  const result = evaluate(current.output);
  $("entropy-bits").textContent = String(result.entropy);
  $("entropy-label").textContent = entropyLabel(result.entropy);
  const pct = Math.min(100, Math.round((result.entropy / 128) * 100));
  $("entropy-bar").style.width = `${pct}%`;
  $("entropy-meter").setAttribute("aria-label", `粗估強度 ${pct}%`);

  const empty = result.length === 0;
  $("standards").replaceChildren(...result.standards.map((s) => {
    const li = document.createElement("li");
    li.className = `standard ${empty ? "" : s.pass ? "pass" : "fail"}`;
    const head = document.createElement("div");
    head.className = "standard-head";
    const title = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = s.name;
    const small = document.createElement("small");
    small.textContent = s.ref;
    title.append(strong, small);
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = empty ? "待輸入" : s.pass ? "符合" : "不符合";
    head.append(title, badge);
    const rules = document.createElement("ul");
    rules.className = "rules";
    rules.append(...s.rules.map((r) => {
      const item = document.createElement("li");
      if (!empty) item.className = r.pass ? "ok" : "no";
      item.textContent = r.label;
      return item;
    }));
    li.append(head, rules);
    if (s.note) {
      const note = document.createElement("p");
      note.className = "note";
      note.textContent = s.note;
      li.append(note);
    }
    return li;
  }));
  $("warnings").replaceChildren(...result.warnings.map((w) => {
    const li = document.createElement("li");
    li.textContent = `注意：${w}`;
    return li;
  }));
}

function update() {
  if (source.value !== lastText) {
    overrides = new Map();
    lastText = source.value;
  }
  syncToggles();
  current = encode(source.value, {
    keyboard: keyboard.value,
    autoOther: optAuto.checked,
    tone1Space: optTone1.checked,
    dropTones: optDropTones.checked,
    capitalize: optCapitalize.checked,
    pinyinTone: optPinyinTone.checked,
    overrides,
  }, dict);
  renderWithSpaces(output, current.output);
  copyBtn.disabled = current.output.length === 0;

  const unmapped = current.tokens.filter((t) => t.kind === "unmapped").length;
  const pending = current.tokens.some((t) => t.kind === "pending");
  if (dictError && pending) setStatus(status, `${dictError} 漢字暫時無法轉換。`, "error");
  else if (pending) setStatus(status, "注音字典載入中，漢字稍後轉換…");
  else if (unmapped) setStatus(status, `有 ${unmapped} 個字元無法對應，已保留原字。可改選其他鍵盤或開啟「其他語系自動套用」。`, "error");
  else if (current.output) setStatus(status, `已轉換 ${Array.from(source.value).length} 個字元。`);
  else setStatus(status, "");

  const shown = current.tokens.filter((t) => t.kind !== "ascii" && t.kind !== "space").length;
  renderBreakdown(current.tokens);
  if (shown > BREAKDOWN_LIMIT) {
    const li = document.createElement("li");
    li.textContent = `…另有 ${shown - BREAKDOWN_LIMIT} 個字未列出`;
    breakdown.append(li);
  }
  renderStats();
  renderPassword();
}

source.addEventListener("input", update);
keyboard.addEventListener("change", update);
for (const opt of [optAuto, optTone1, optPinyinTone, optDropTones, optCapitalize]) opt.addEventListener("change", update);
for (const radio of document.querySelectorAll('input[name="stats-target"]')) radio.addEventListener("change", renderStats);
breakdown.addEventListener("change", (event) => {
  const select = event.target.closest("select");
  if (!select) return;
  overrides.set(Number(select.dataset.index), select.value);
  update();
  breakdown.querySelector(`select[data-index="${select.dataset.index}"]`)?.focus();
});
copyBtn.addEventListener("click", async () => {
  try {
    await copyText(current.output);
    setStatus(status, "已複製到剪貼簿。", "ok");
  } catch {
    setStatus(status, "無法存取剪貼簿，請手動選取結果複製。", "error");
  }
});

update();
loadDict()
  .then((d) => { dict = d; update(); })
  .catch((err) => { dictError = err.message; update(); });
