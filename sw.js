// Service worker for push notifications
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "알림", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "출퇴근 알림";
  const options = {
    body: data.body || "",
    tag: data.tag || "attendance",
    icon: data.icon,
    badge: data.badge,
    data: { url: data.url || "/" },
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) {
          try {
            const u = new URL(c.url);
            if (u.pathname === url) return c.focus();
          } catch {}
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(url) : null;
    })
  );
});
