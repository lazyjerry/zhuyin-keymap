import { parseDict } from "./lib/dict.js";
import { KEYBOARDS } from "./lib/keyboards.js";

let dictPromise = null;

/** 載入注音字典；失敗時拋出可直接顯示的中文訊息。 */
export function loadDict() {
  if (!dictPromise) {
    dictPromise = fetch(`${import.meta.env.BASE_URL}data/zhuyin-dict.txt`)
      .then((res) => {
        if (!res.ok) throw new Error(`字典下載失敗（HTTP ${res.status}）`);
        return res.text();
      })
      .then(parseDict)
      .catch((err) => {
        dictPromise = null;
        throw new Error(err instanceof TypeError ? "字典下載失敗，請確認網路連線後重新整理。" : err.message);
      });
  }
  return dictPromise;
}

export function fillKeyboardSelect(select, value = "dachen") {
  select.replaceChildren(...KEYBOARDS.map((k) => new Option(k.name, k.id, false, k.id === value)));
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("copy failed");
}

export function setStatus(el, message, tone = "") {
  el.textContent = message;
  el.className = `status${tone ? ` ${tone}` : ""}`;
}

/** 把空白以「␣」標示，避免結果中的空白看不見。 */
export function renderWithSpaces(el, text) {
  el.replaceChildren(...Array.from(text).map((ch) => {
    if (ch !== " ") return document.createTextNode(ch);
    const mark = document.createElement("span");
    mark.className = "space-mark";
    mark.textContent = "␣";
    mark.setAttribute("aria-label", "空白");
    return mark;
  }));
}
