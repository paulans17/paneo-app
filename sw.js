/* paNeo · Service Worker: shell en caché y red primero para la API */
var VERSION = 'paneo-v5';
var SHELL = [
  './',
  'index.html',
  'app.css',
  'app.js',
  'config.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'assets/logo-paneo.jpg',
  'assets/pan-n.png',
  'assets/favicon.png',
  'assets/productos/tarta-zanahoria.jpg',
  'assets/productos/muffins-arandanos.jpg',
  'assets/productos/muffins-chocolate.jpg',
  'assets/productos/cupcakes.jpg',
  'assets/productos/cookies.jpg',
  'assets/productos/croissant.jpg',
  'assets/productos/cheesecake.jpg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function esApi(url) {
  return /script\.google(usercontent)?\.com$/.test(url.hostname);
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return; // los POST (login, favoritos, encuesta) van siempre a la red
  var url = new URL(req.url);

  // API: red primero, y si no hay conexión, la última respuesta guardada
  if (esApi(url)) {
    e.respondWith(fetch(req).then(function (res) {
      var copia = res.clone();
      caches.open(VERSION + '-api').then(function (c) { c.put(req, copia); });
      return res;
    }).catch(function () { return caches.match(req); }));
    return;
  }

  // Navegación: red primero, con la app en caché si no hay conexión
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(function () { return caches.match('index.html'); }));
    return;
  }

  // Código propio (HTML/CSS/JS): red primero, para que los cambios (p. ej. config.js) se vean al momento
  if (url.origin === self.location.origin && !/\.(png|jpe?g|webp|svg|gif)$/i.test(url.pathname)) {
    e.respondWith(fetch(req).then(function (res) {
      if (res.ok) { var copia = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copia); }); }
      return res;
    }).catch(function () { return caches.match(req, { ignoreSearch: true }); }));
    return;
  }

  // Imágenes y fuentes: caché primero y se actualiza en segundo plano
  e.respondWith(caches.match(req).then(function (cached) {
    var red = fetch(req).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) {
        var copia = res.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copia); });
      }
      return res;
    }).catch(function () { return cached; });
    return cached || red;
  }));
});
