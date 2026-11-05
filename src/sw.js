// Service worker 樣板：建置時由 vite.config.js 的 pwa 外掛代入 precache 清單與版本，輸出成 dist/sw.js。
// 策略：
//   頁面（navigation）Network First，離線時回快取的頁面；
//   /assets/、/icons/ 等不可變檔案 Cache First；
//   注音字典 Stale While Revalidate，離線也能轉換、上線時背景更新。
const VERSION = "__CACHE_VERSION__";
const PRECACHE = __PRECACHE_MANIFEST__;
const CACHE = `zhuyin-keymap-${VERSION}`;
const PAGE_ALIASES = { "/index.html": "/", "/decode.html": "/decode" };
// precache 時的請求沒有 Origin 等標頭；回應若帶 Vary 會讓之後的 module script 請求比對不到。
const MATCH = { ignoreSearch: true, ignoreVary: true };

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("zhuyin-keymap-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirstPage(request) {
  const url = new URL(request.url);
  const key = PAGE_ALIASES[url.pathname] ?? url.pathname;
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected) (await caches.open(CACHE)).put(key, response.clone());
    return response;
  } catch {
    return (await caches.match(key, MATCH)) ?? (await caches.match("/", MATCH)) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, MATCH);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(event) {
  const cached = await caches.match(event.request, MATCH);
  const update = fetch(event.request).then(async (response) => {
    if (response.ok) await (await caches.open(CACHE)).put(event.request, response.clone());
    return response;
  });
  if (cached) {
    event.waitUntil(update.catch(() => {}));
    return cached;
  }
  return update;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
  } else if (url.pathname.startsWith("/data/")) {
    event.respondWith(staleWhileRevalidate(event));
  } else if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/") || PRECACHE.includes(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
