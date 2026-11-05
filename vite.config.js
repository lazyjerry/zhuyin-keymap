import { defineConfig } from "vite";
import { resolve, relative, sep } from "node:path";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";

const root = import.meta.dirname;
const publicDir = resolve(root, "public");

// public/ 內不進 precache 的檔案（部署設定，不是頁面資源）。
const PUBLIC_EXCLUDE = new Set(["_headers", "_redirects"]);
// 頁面以 clean URL 快取，與 Cloudflare Pages 實際提供的網址一致。
const PAGE_URLS = { "index.html": "/", "decode.html": "/decode" };

const listFiles = (dir) => readdirSync(dir).flatMap((name) => {
  const full = resolve(dir, name);
  return statSync(full).isDirectory() ? listFiles(full) : [full];
});

/** 建置時把 src/sw.js 樣板代入 precache 清單與內容雜湊版本，輸出成 sw.js。 */
function pwaServiceWorker() {
  return {
    name: "pwa-service-worker",
    apply: "build",
    // 要排在 Vite 產生 HTML 之後，bundle 裡才有 index.html／decode.html。
    enforce: "post",
    generateBundle(_, bundle) {
      const hash = createHash("sha256");
      const urls = [];
      for (const [fileName, chunk] of Object.entries(bundle)) {
        urls.push(PAGE_URLS[fileName] ?? `/${fileName}`);
        hash.update(fileName).update(chunk.type === "chunk" ? chunk.code : chunk.source);
      }
      for (const full of listFiles(publicDir)) {
        const rel = relative(publicDir, full).split(sep).join("/");
        if (PUBLIC_EXCLUDE.has(rel) || rel.split("/").some((part) => part.startsWith("."))) continue;
        urls.push(`/${rel}`);
        hash.update(rel).update(readFileSync(full));
      }
      urls.sort();
      const template = readFileSync(resolve(root, "src/sw.js"), "utf8");
      hash.update(template);
      const source = template
        .replace("__CACHE_VERSION__", hash.digest("hex").slice(0, 12))
        .replace("__PRECACHE_MANIFEST__", JSON.stringify(urls, null, 2));
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

export default defineConfig({
  plugins: [pwaServiceWorker()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        decode: resolve(root, "decode.html"),
      },
    },
  },
});
