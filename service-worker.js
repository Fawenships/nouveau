const CACHE_NAME = "monquotidien-v2";

const APP_FILES = [
    "./",
    "./index.html",
    "./manifest.webmanifest"
];

self.addEventListener("install", event => {

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_FILES))
    );

    self.skipWaiting();
});


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
