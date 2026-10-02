const CACHE_NAME = "monquotidien-v3";

const APP_FILES = [
    "./",
    "./index.html",
    "./manifest.webmanifest"
];


// =====================================================
// INSTALLATION
// =====================================================

self.addEventListener("install", event => {

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_FILES))
    );

    self.skipWaiting();
});


// =====================================================
// ACTIVATION
// =====================================================

self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys().then(keys => {

            return Promise.all(

                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))

            );

        })

    );

    self.clients.claim();
});


// =====================================================
// CACHE / FETCH
// =====================================================

self.addEventListener("fetch", event => {

    if(event.request.method !== "GET"){
        return;
    }

    event.respondWith(

        caches.match(event.request)
            .then(cachedResponse => {

                if(cachedResponse){
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then(response => {

                        if(
                            !response ||
                            response.status !== 200 ||
                            response.type !== "basic"
                        ){
                            return response;
                        }

                        const responseClone =
                            response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {

                                cache.put(
                                    event.request,
                                    responseClone
                                );

                            });

                        return response;

                    });

            })

    );

});


// =====================================================
// NOTIFICATION PUSH
// =====================================================

self.addEventListener("push", event => {

    let data = {};

    try {

        if(event.data){

            data = event.data.json();

        }

    } catch(error) {

        console.error(
            "Impossible de lire les données Push :",
            error
        );

        data = {

            title: "MonQuotidien",

            body: event.data
                ? event.data.text()
                : "Nouvelle notification."

        };

    }


    const title =
        data.title ||
        "MonQuotidien";


    const options = {

        body:
            data.body ||
            "Nouvelle notification.",

        icon:
            data.icon ||
            "./icons/icon-192.png",

        badge:
            data.badge ||
            "./icons/icon-192.png",

        tag:
            data.tag ||
            "monquotidien-push",

        renotify: true,

        data:
            data.data ||
            {
                url: "./"
            }

    };


    event.waitUntil(

        self.registration.showNotification(
            title,
            options
        )

    );

});


// =====================================================
// CLIC SUR UNE NOTIFICATION
// =====================================================

self.addEventListener(
    "notificationclick",
    event => {

        event.notification.close();


        const notificationData =
            event.notification.data || {};


        const url =
            notificationData.url ||
            "./";


        event.waitUntil(

            clients
                .matchAll({
                    type: "window",
                    includeUncontrolled: true
                })

                .then(clientList => {

                    for(
                        const client of clientList
                    ){

                        if(
                            "focus" in client
                        ){

                            return client
                                .focus()
                                .then(() => {

                                    if(
                                        "navigate" in client
                                    ){

                                        return client.navigate(
                                            url
                                        );

                                    }

                                });

                        }

                    }


                    if(
                        clients.openWindow
                    ){

                        return clients.openWindow(
                            url
                        );

                    }

                })

        );

    }
);
