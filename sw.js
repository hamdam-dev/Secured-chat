self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", event => {
  let payload = {
    title: "My Notes",
    body: "Notes backup synced",
    kind: "message",
    tag: "my-notes-sync"
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      if (parsed && typeof parsed === "object") {
        payload = { ...payload, ...parsed };
      }
    } catch {
      const txt = event.data.text?.();
      if (txt) payload.body = txt.slice(0, 120);
    }
  }

  const isCall = payload.kind === "call";
  event.waitUntil(
    self.registration.showNotification(payload.title || "My Notes", {
      body: payload.body || "Notes backup synced",
      tag: payload.tag || (isCall ? "my-notes-call" : "my-notes-sync"),
      renotify: true,
      requireInteraction: isCall,
      vibrate: isCall ? [280, 180, 280, 180, 280] : [120, 80, 120],
      data: { kind: payload.kind || "message" }
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    })
  );
});
