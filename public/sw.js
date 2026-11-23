self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith("hero-pwa-")).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: "HERO",
      body: event.data ? event.data.text() : "Notifikasi baru masuk.",
    };
  }

  const title = payload.title || "HERO";
  const soundUrl = payload.sound || "/sounds/cat-meow.mp3";
  const options = {
    body: payload.body || "Notifikasi baru masuk.",
    icon: payload.icon || "/pwa/hero-cat-20261012-192.png",
    badge: payload.badge || "/pwa/hero-cat-20261012-192.png",
    tag: payload.tag || "hero-notification",
    sound: soundUrl,
    vibrate: payload.vibrate || [100, 50, 100, 50, 200],
    data: payload.data || { url: "/mobile/notifications", sound: soundUrl },
    actions: payload.actions || [
      { action: "open", title: "Buka HERO 🐾" },
    ],
  };

  const notifyPromise = self.registration.showNotification(title, options);

  // Broadcast ke client aktif (foreground tabs) untuk memicu audio jika aplikasi sedang terbuka
  const broadcastPromise = self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clients) => {
      for (const client of clients) {
        client.postMessage({
          type: "HERO_PLAY_SOUND",
          sound: soundUrl,
          title,
        });
      }
    })
    .catch(() => {});

  event.waitUntil(Promise.all([notifyPromise, broadcastPromise]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/mobile/notifications";
  const urlObj = new URL(targetUrl, self.location.origin);
  const soundUrl = event.notification.data?.sound || "/sounds/cat-meow.mp3";
  if (soundUrl) {
    urlObj.searchParams.set("play_sound", "cat-meow");
  }
  const url = urlObj.href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.postMessage({
            type: "HERO_PLAY_SOUND",
            sound: soundUrl,
          });
          if (client.url.startsWith(urlObj.origin + urlObj.pathname)) {
            return client.focus();
          }
        }
      }

      return self.clients.openWindow(url);
    }),
  );
});
