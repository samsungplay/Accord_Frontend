/* eslint-disable no-undef */
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const url = event.notification.data;
  const origin = new URL(url).origin;
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (let client of windowClients) {
          console.log(client.url, origin);
          if (client.url.startsWith(origin)) {
            client.focus();
            return client.postMessage({ action: "navigate", url: url });
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

self.addEventListener("push", function (event) {
  if (!self.Notification && self.Notification.permission !== "granted") {
    return;
  }

  const data = event.data?.json() ?? {};

  const options = {
    body: data.body,
    icon: data.icon,
    data: data.url,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});
