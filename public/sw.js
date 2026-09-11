// Service worker: instalação do app + notificações push (app aberto ou fechado).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

function show(data) {
  return self.registration.showNotification(data.title || "Wolf in Sheep Affiliates", {
    body: data.body || "",
    icon: "/favicon.png",
    badge: "/favicon.png",
    vibrate: [120, 60, 120],
    tag: data.tag,
    renotify: true,
    data: { url: data.url || "/dashboard" },
  });
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(show(data));
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "notify" && self.registration.showNotification) {
    event.waitUntil(show(data));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
