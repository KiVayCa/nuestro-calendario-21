const CACHE = "calendario21-__BUILD_VERSION__";
const SHELL = [
  "/",
  "/index.html",
  "/app.js",
  "/styles.css",
  "/auth-visuals.css",
  "/places-map.js",
  "/manifest.json",
  "/vendor/supabase.js",
  "/vendor/leaflet/leaflet.js",
  "/vendor/leaflet/leaflet.css",
  "/icon-192.png",
  "/icon-512.png",
  "/notification-heart.svg",
  "/notification-badge.svg",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("calendario21-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(event.request);
        if (
          response.ok &&
          (SHELL.includes(url.pathname) || url.pathname === "/pareja.jpeg")
        )
          await cache.put(event.request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate")
          return (await cache.match("/index.html")) || Response.error();
        return new Response("Recurso no disponible sin conexión.", {
          status: 503,
        });
      }
    })(),
  );
});
self.addEventListener("push", (event) => {
  let data = {
    title: "Nuestro Calendario #21",
    body: "Tienes una novedad de pareja.",
    url: "/",
  };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/notification-heart.svg",
      badge: "/notification-badge.svg",
      tag: data.tag || "nc21-" + Date.now(),
      data: { url: data.url || "/" },
      renotify: false,
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  let target = new URL("/", self.location.origin);
  try {
    const candidate = new URL(
      event.notification.data?.url || "/",
      self.location.origin,
    );
    if (candidate.origin === self.location.origin) target = candidate;
  } catch {}
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clients) => {
        const client = clients.find(
          (item) => new URL(item.url).origin === self.location.origin,
        );
        if (client) {
          await client.navigate(target.href);
          return client.focus();
        }
        return self.clients.openWindow(target.href);
      }),
  );
});
