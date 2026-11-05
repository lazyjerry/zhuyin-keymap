#!/usr/bin/env python3
"""產生 Open Graph 分享圖（1200×630），風格與頁面首屏一致：方格紙底、實心＋描邊主標、珊瑚紅邊線導言、鍵帽卡片。

用法：python3 scripts/build-og.py [輸出檔，預設 public/og-image.png]
需要 Python Playwright 與 Chromium。
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "public" / "og-image.png")

HTML = """<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><style>
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{box-sizing:border-box;padding:64px 72px 0;color:#171e34;font-family:"PingFang TC","Noto Sans TC",sans-serif;
  background-color:#f5f3ed;
  background-image:linear-gradient(rgba(23,30,52,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(23,30,52,.06) 1px,transparent 1px);
  background-size:30px 30px}
.eyebrow{margin:0 0 22px;color:#ed735f;font:800 22px/1 ui-monospace,"SF Mono",Menlo,monospace;letter-spacing:.22em}
.grid{display:grid;grid-template-columns:1fr 330px;gap:56px;align-items:start}
h1{margin:0;font-size:118px;line-height:1.02;letter-spacing:-.02em;font-weight:900;-webkit-text-stroke:2px #171e34}
h1 span,h1 em{display:block;font-style:normal}
h1 em{color:#f5f3ed;-webkit-text-stroke:3px #171e34;text-shadow:6px 6px 0 rgba(23,30,52,.12)}
.lede{margin:34px 0 0;padding:4px 0 4px 22px;border-left:7px solid #ed735f;font-size:27px;font-weight:700;line-height:1.6}
.cap{position:relative;margin-top:20px;width:300px;height:300px;box-sizing:border-box;background:#fffefa;
  border:3px solid #171e34;border-top:30px solid #ed735f;box-shadow:18px 18px 0 #171e34}
.cap .k{position:absolute;left:24px;top:20px;color:#ed735f;font:800 52px/1 ui-monospace,"SF Mono",Menlo,monospace}
.cap .s{position:absolute;inset:0;display:grid;place-items:center;padding-top:20px;font-size:180px;font-weight:900;-webkit-text-stroke:5px #171e34}
.sample{margin-top:46px;font:800 26px/1.3 ui-monospace,"SF Mono",Menlo,monospace;color:#171e34}
.sample small{display:block;margin-bottom:6px;color:#707486;font:700 18px/1 "PingFang TC",sans-serif}
.bar{position:absolute;left:72px;right:72px;bottom:44px;border-top:4px solid #171e34;padding-top:14px;
  display:flex;justify-content:space-between;color:#707486;font:700 18px/1 ui-monospace,monospace;letter-spacing:.08em}
</style></head><body>
<p class="eyebrow">KEYMAP DEV TOOL</p>
<div class="grid">
  <div>
    <h1><span>注音鍵位</span><em>密碼轉換</em></h1>
    <p class="lede">中文依鍵盤配置換成英文按鍵<br>字元統計・密碼標準檢核・反向解碼</p>
  </div>
  <div>
    <div class="cap"><span class="k">1</span><span class="s">ㄅ</span></div>
    <div class="sample"><small>我愛台灣</small>Ji394W96J0</div>
  </div>
</div>
<div class="bar"><span>LOCAL ONLY · NO STORAGE</span><span>zhuyin-keymap.jlab-app.cloud</span></div>
</body></html>"""


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
        page.set_content(HTML)
        page.wait_for_timeout(100)
        page.screenshot(path=str(OUT))
        browser.close()
    print(f"{OUT.name} 1200x630")


if __name__ == "__main__":
    main()
