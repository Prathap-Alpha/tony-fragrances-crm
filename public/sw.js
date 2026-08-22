// Service worker for offline support + installability. Path-agnostic: it uses
// its own registration scope, so it works whether the app is served at a domain
// root or under a sub-path like /tony-fragrances-crm/.
const CACHE_NAME = "tony-fragrances-crm-v3";
const SCOPE_URL = new URL(self.registration.scope);
const APP_SHELL = SCOPE_URL.pathname; // e.g. "/tony-fragrances-crm/"

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // NEVER intercept cross-origin requests — in particular the Supabase data
  // API. Caching those was the sync-killer: the app polled the cloud every 15s
  // but this worker answered every poll with the first snapshot it ever saw,
  // so changes made on the other device never arrived. Only same-origin static
  // assets belong in the offline cache.
  if (new URL(req.url).origin !== self.location.origin) return;

  // Navigations: network-first so new versions are picked up, cache as fallback
  // (this is what keeps the app usable offline once it has been opened online).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(APP_SHELL, copy));
          return res;
        })
        .catch(() => caches.match(APP_SHELL).then((c) => c || caches.match(req))),
    );
    return;
  }

  // Other GETs: serve from cache if present, otherwise fetch and cache.
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        }),
    ),
  );
});
