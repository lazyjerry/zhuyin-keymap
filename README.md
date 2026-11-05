# 注音鍵位密碼轉換器

把中文或其他語言，依鍵盤配置換成在美式鍵盤上實際敲下的英文按鍵；同時統計字元、依常見密碼標準檢核，並提供反向解碼。

- 線上網址：https://zhuyin-keymap.jlib-cf.workers.dev/
- 反向解碼：https://zhuyin-keymap.jlib-cf.workers.dev/decode

## 功能

### 鍵位轉換（首頁）

- **文字轉鍵位**：輸入任何語言，依選定鍵盤換成英文按鍵，例如「我愛台灣」→ `ji394w96j0 `。
  - 鍵盤配置：注音（大千，預設）、注音（倚天）、漢語拼音、韓文（두벌식）、俄文（ЙЦУКЕН）、希臘文。
  - 「其他語系自動套用對應鍵盤」：混合文字時，漢字用注音、韓文用 두벌식、俄文與希臘文用各自的原生配置。
  - 破音字依詞語判斷讀音（例如「銀行」的「行」讀 ㄏㄤˊ），也可以在讀音拆解逐字改選。
  - 一聲可選擇輸出空白鍵或省略；拼音可選擇附加聲調數字。
- **字元統計**：總字數（以字素計算，emoji 算一個）、數字、特殊符號、英文大小寫、空白、其他文字；可切換統計轉換結果或原文。
- **密碼標準檢核**：把轉換結果當作密碼，逐項比對：
  - NIST SP 800-63B-4（唯一驗證因子：15 字元以上；搭配多因子：8 字元以上；皆不可為常見密碼）
  - OWASP ASVS 5.0（V6.2.1、V6.2.4）
  - PCI DSS v4.0.1（要求 8.3.6：12 字元以上、包含字母與數字）
  - CIS Benchmark（Windows 密碼原則：14 字元以上並符合複雜度）
  - Microsoft Windows 複雜度需求（五類字元中至少三類）
  - 一般網站常見規則（8 字元以上、大小寫、數字、符號）
  - 另提示空白、非 ASCII 字元、過長等相容性問題，並粗估熵值。

### 反向解碼（`/decode`）

- 輸入英文按鍵，選擇鍵盤配置（預設注音大千）與編譯目標（預設中文），還原成原文。
- 注音與拼音可輸出中文、注音符號、漢語拼音（調號）；韓文可輸出組好的韓文或拆開的字母。
- 中文依詞頻自動選字，每一段都可以在「同音候選」改字。
- 附上目前鍵盤配置的按鍵對照圖。

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
npx wrangler deploy   # 以 Cloudflare Workers 靜態資源發布 dist/
```

部署設定在 `wrangler.jsonc`。`dist/` 為純靜態檔案，也可以部署到 Cloudflare Pages 或任何靜態主機。

## 注音字典

字典取自 [McBopomofo 小麥注音](https://github.com/openvanilla/McBopomofo)（MIT 授權）的詞庫，轉成精簡的文字檔後提交在 `public/data/zhuyin-dict.txt`。要重新產生：

```sh
npm run dict:fetch   # 下載固定 commit 的詞庫原始檔到 data-src/
npm run dict:build   # 產生 public/data/zhuyin-dict.txt
```

詞語只收詞頻 20 以上者，可用環境變數 `MIN_PHRASE_COUNT` 調整。

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
  shared.js             共用：載入字典、複製
  style.css             樣式
public/
  data/zhuyin-dict.txt  注音字典
  _headers              Cloudflare 回應標頭
scripts/                字典下載與轉檔腳本
tests/                  核心邏輯測試
wrangler.jsonc          Cloudflare Workers 靜態資源部署設定
```

## 授權

程式碼以 MIT 授權釋出；注音字典資料來自 McBopomofo（MIT）。
