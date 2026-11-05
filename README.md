# 注音鍵位密碼轉換器

把中文或其他語言，依鍵盤配置換成在美式鍵盤上實際敲下的英文按鍵；同時統計字元、依常見密碼標準檢核，並提供反向解碼。

- 線上網址：https://zhuyin-keymap.jlab-app.cloud/（備用 https://zhuyin-keymap.pages.dev/）
- 反向解碼：https://zhuyin-keymap.jlab-app.cloud/decode

## 功能

### 鍵位轉換（首頁）

- **文字轉鍵位**：輸入任何語言，依選定鍵盤換成英文按鍵，例如「我愛台灣」→ `ji394w96j0 `。
  - 鍵盤配置：注音（大千，預設）、注音（倚天）、漢語拼音、韓文（두벌식）、俄文（ЙЦУКЕН）、希臘文。
  - 「其他語系自動套用對應鍵盤」：混合文字時，漢字用注音、韓文用 두벌식、俄文與希臘文用各自的原生配置。
  - 破音字依詞語判斷讀音（例如「銀行」的「行」讀 ㄏㄤˊ），也可以在讀音拆解逐字改選。
  - 一聲可選擇輸出空白鍵或省略；也可以「移除聲調鍵」，一二三四聲與輕聲都不輸出（「我愛你」→ `ji9su`）。拼音可選擇附加聲調數字。
  - 「字首大寫」（預設開啟）：每個漢字的第一個按鍵若為英文字母則改大寫，例如「太難了」→ `W94S06Xk7`；關閉後為 `w94s06xk7`。
  - 結果中的空白以橘色 ␣ 標示，手動選取或按「複製結果」拿到的都是真正的空白。
- **字元統計**：總字數（以字素計算，emoji 算一個）、數字、特殊符號、英文大小寫、空白、其他文字；可切換統計轉換結果或原文。
  - 另列出密碼檢核項目的拆解：已符合的項目逐一列出（例如「同時包含英文字母與數字」「包含小寫英文」），未符合的彙總成一行。
- **密碼標準檢核**：把轉換結果當作密碼，逐項比對：
  - NIST SP 800-63B-4（唯一驗證因子：15 字元以上；搭配多因子：8 字元以上；皆不可為常見密碼）
  - OWASP ASVS 5.0（V6.2.1、V6.2.4）
  - PCI DSS v4.0.1（要求 8.3.6：12 字元以上、包含字母與數字）
  - CIS Benchmark（Windows 密碼原則：14 字元以上並符合複雜度）
  - Microsoft Windows 複雜度需求（五類字元中至少三類）
  - 一般網站常見規則（8 字元以上、大小寫、數字、符號）
  - 另提示空白、非 ASCII 字元、過長等相容性問題，並粗估熵值。

### 反向解碼（`/decode`）

- 輸入英文按鍵，選擇鍵盤配置（預設注音大千）與編譯目標，還原成原文。
- 注音與拼音輸出注音符號（預設）或漢語拼音（調號）；不轉成漢字，因為同音字無法只靠按鍵判斷。韓文可輸出組好的韓文或拆開的字母。
- 音節斷點依詞頻判斷；有按鍵組不成音節時會回報數量，若另一套注音配置（大千／倚天）解得更完整，會建議切換。
- 「按鍵已移除聲調」：沒有聲調鍵的音節以所有聲調比對，輸出不帶聲調（`ji9su` → ㄨㄛ ㄞ ㄋㄧ）；輸入完全沒有聲調鍵時會提示開啟。
- 「按鍵含字首大寫」（預設開啟）：大寫英文字母視同小寫按鍵，`W94S06Xk7` → ㄊㄞˋ ㄋㄢˊ ㄌㄜ˙；關閉時大寫字母原樣保留。
- 附上目前鍵盤配置的按鍵對照圖。

### PWA

- 可安裝成 App（支援的瀏覽器會顯示「安裝」，iOS 用「加入主畫面」），主畫面捷徑可直接開啟反向解碼。
- 第一次開啟後，頁面、程式與注音字典都會快取，離線也能轉換與解碼。
- 頁面採 Network First，上線時永遠拿最新版；注音字典離線時用快取，上線時在背景更新。

## 隱私

- 轉換、統計、檢核與解碼都在瀏覽器完成，不傳送輸入內容，不使用資料庫、Cookie 或追蹤碼。
- 頁面只會下載一份公開的注音字典檔（`/data/zhuyin-dict.txt`）。
- 內建的常見密碼清單為精簡版，無法取代外洩密碼資料庫比對；結果僅供參考。

## 本機開發

需要 Node.js 20 以上。

```sh
npm install
npm run dev      # 開發伺服器
npm test         # 核心邏輯測試（node:test）
```

## 建置與部署

```sh
npm run build    # 輸出到 dist/
npx wrangler pages deploy --project-name zhuyin-keymap --branch main   # 發布 dist/ 到 Cloudflare Pages
```

部署設定在 `wrangler.jsonc`（`pages_build_output_dir`）。`dist/` 為純靜態檔案，也可以部署到任何靜態主機。

## 注音字典

字典取自 [McBopomofo 小麥注音](https://github.com/openvanilla/McBopomofo)（MIT 授權）的詞庫，轉成精簡的文字檔後提交在 `public/data/zhuyin-dict.txt`。要重新產生：

```sh
npm run dict:fetch   # 下載固定 commit 的詞庫原始檔到 data-src/
npm run dict:build   # 產生 public/data/zhuyin-dict.txt
```

詞語只收詞頻 20 以上者，可用環境變數 `MIN_PHRASE_COUNT` 調整。

## PWA icon 與分享圖

icon 以 Playwright 渲染 HTML 產生，風格與頁面一致（方格紙底、珊瑚紅上邊線的鍵帽卡片、硬陰影）：

```sh
python3 scripts/build-icons.py   # 輸出到 public/icons/
python3 scripts/build-og.py      # 社群分享圖 public/og-image.png（1200×630）
```

頁面已設定 Open Graph、Twitter Card、canonical 與 JSON-LD（WebApplication）。

## 專案結構

```text
index.html              鍵位轉換頁
decode.html             反向解碼頁
src/
  lib/keyboards.js      鍵盤配置定義
  lib/dict.js           字典解析、斷詞取讀音、音節解碼
  lib/encode.js         文字 → 按鍵
  lib/decode.js         按鍵 → 文字
  lib/stats.js          字元統計
  lib/password.js       密碼標準檢核
  encode-page.js        首頁互動
  decode-page.js        解碼頁互動
  shared.js             共用：載入字典、複製、註冊 service worker
  sw.js                 service worker 樣板（建置時代入 precache 清單）
  style.css             樣式
public/
  data/zhuyin-dict.txt  注音字典
  icons/                PWA icon（由 scripts/build-icons.py 產生）
  manifest.webmanifest  PWA manifest
  _headers              Cloudflare 回應標頭
scripts/                字典下載與轉檔、icon 產生腳本
vite.config.js          多頁建置設定與 service worker 產生外掛
tests/                  核心邏輯測試
wrangler.jsonc          Cloudflare Pages 部署設定
```

## 授權

程式碼以 [MIT License](LICENSE) 釋出。注音字典資料來自 McBopomofo（MIT），原授權條款見 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。
