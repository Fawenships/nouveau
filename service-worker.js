/* MonQuotidien — Service Worker
   Réseau d'abord : l'app affiche toujours la dernière version
   quand il y a internet, et utilise le cache hors ligne. */

const CACHE_NAME = "monquotidien-v4";

const APP_FILES = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
];


// INSTALLATION
self.addEventListener("install", event => {
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            Promise.allSettled(APP_FILES.map(file => cache.add(file)))
        )
    );
});


// ACTIVATION
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});


// FETCH : réseau d'abord, cache en secours (hors ligne)
self.addEventListener("fetch", event => {
    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        fetch(request, { cache: "no-store" })
            .then(response => {
                if (response && response.status === 200 && response.type === "basic") {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                }
                return response;
            })
            .catch(() =>
                caches.match(request).then(cached => cached || caches.match("./index.html"))
            )
    );
});


// NOTIFICATION PUSH
self.addEventListener("push", event => {
    let data = {};

    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (error) {
        console.error("Impossible de lire les données Push :", error);
        data = {
            title: "MonQuotidien",
            body: event.data ? event.data.text() : "Nouvelle notification."
        };
    }

    const title = data.title || "MonQuotidien";

    const options = {
        body: data.body || "Nouvelle notification.",
        icon: data.icon || "./icons/icon-192.png",
        badge: data.badge || "./icons/icon-192.png",
        tag: data.tag || "monquotidien-push",
        renotify: true,
        data: data.data || { url: "./" }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});


// CLIC SUR UNE NOTIFICATION
self.addEventListener("notificationclick", event => {
    event.notification.close();

    const notificationData = event.notification.data || {};
    const url = notificationData.url || "./";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true })
            .then(clientList => {
                for (const client of clientList) {
                    if ("focus" in client) {
                        return client.focus().then(() => {
                            if ("navigate" in client) {
                                return client.navigate(url);
                            }
                        });
                    }
                }

                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});
