/* Basic app-shell cache so the system keeps working offline once opened once.
   Adapted from the original service-worker.js: Next.js serves hashed,
   versioned build assets from /_next/static/*, so instead of hard-coding a
   file list we cache-as-we-go (stale-while-revalidate) rather than
   pre-caching a fixed ASSETS array. Data (API calls) is deliberately NOT
   cached here — see MIGRATION.md "Offline support" for why score entry
   needs its own client-side sync queue, not a service-worker cache. */
var CACHE_NAME = "ladybird-nextjs-v1";

self.addEventListener("install", function (e) {
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  // Never cache API calls or auth — always go to the network for those.
  if (url.pathname.startsWith("/api/")) return;

  e.respondWith(
    caches.match(e.request).then(function (cached) {
      var networkFetch = fetch(e.request)
        .then(function (resp) {
          var copy = resp.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(e.request, copy); });
          return resp;
        })
        .catch(function () { return cached; });
      return cached || networkFetch;
    })
  );
});
