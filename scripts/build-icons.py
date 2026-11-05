#!/usr/bin/env python3
"""產生 PWA icon：方格紙底、白色鍵帽卡片（珊瑚紅上邊線＋硬陰影）、鍵帽上印「ㄅ」與按鍵「1」。

用法：python3 scripts/build-icons.py [輸出目錄，預設 public/icons]
需要 Python Playwright 與 Chromium（pip install playwright && playwright install chromium）。
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "public" / "icons")

# (檔名, 邊長, 內容縮放比例) ；maskable 要把內容收在中央 80% 安全區內。
ICONS = [
    ("icon-192.png", 192, 1.0),
    ("icon-512.png", 512, 1.0),
    ("icon-maskable-512.png", 512, 0.72),
    ("apple-touch-icon.png", 180, 0.92),
    ("favicon-32.png", 32, 1.3),
]

HTML = """<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:%(size)dpx;height:%(size)dpx;overflow:hidden}
body{background-color:#f5f3ed;
  background-image:linear-gradient(rgba(23,30,52,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(23,30,52,.07) 1px,transparent 1px);
  background-size:%(grid)spx %(grid)spx;display:grid;place-items:center}
.cap{position:relative;width:%(cap)spx;height:%(cap)spx;background:#fffefa;
  border:%(line)spx solid #171e34;border-top:%(top)spx solid #ed735f;
  box-shadow:%(shadow)spx %(shadow)spx 0 #171e34;box-sizing:border-box}
.sym{position:absolute;inset:0;display:grid;place-items:center;padding-top:%(symPad)spx;
  color:#171e34;-webkit-text-stroke:%(stroke)spx #171e34;font:900 %(sym)spx/1 "PingFang TC","Noto Sans TC",sans-serif}
.key{position:absolute;left:%(keyPos)spx;top:%(keyPos)spx;color:#ed735f;
  font:800 %(key)spx/1 ui-monospace,"SF Mono",Menlo,monospace}
</style></head><body><div class="cap"><span class="key">%(keyText)s</span><span class="sym">ㄅ</span></div></body></html>"""


def render(page, size, scale):
    cap = size * 0.66 * scale
    tiny = size < 64
    params = {
        "size": size,
        "grid": round(size / 8, 2),
        "cap": round(cap, 2),
        "line": max(1, round(size / 128, 2)),
        "top": round(cap * (0.12 if tiny else 0.1), 2),
        "shadow": round(cap * (0.07 if tiny else 0.06), 2),
        "sym": round(cap * (0.74 if tiny else 0.6), 2),
        "symPad": round(cap * 0.06, 2),
        "stroke": round(cap * (0.03 if tiny else 0.018), 2),
        "key": round(cap * 0.2, 2),
        "keyPos": round(cap * 0.08, 2),
        "keyText": "" if tiny else "1",
    }
    page.set_viewport_size({"width": size, "height": size})
    page.set_content(HTML % params)
    page.wait_for_timeout(50)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(device_scale_factor=1)
        for name, size, scale in ICONS:
            render(page, size, scale)
            page.screenshot(path=str(OUT / name), clip={"x": 0, "y": 0, "width": size, "height": size})
            print(f"{name} {size}x{size}")
        browser.close()


if __name__ == "__main__":
    main()
