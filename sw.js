/* Mesa · trabajador de fondo (service worker)

   Lo justo para que Mesa se instale como aplicación y arranque rápido:

   - La aplicación (HTML, CSS, JS, iconos) se pide primero a la red y, si no
     hay, se saca de la copia guardada. Así una versión nueva del servidor
     llega en cuanto se recarga, y sin red el menú de entrada sigue abriendo.
   - Planos y retratos (/img/) no cambian nunca: se guardan la primera vez y
     no se vuelven a descargar. En un móvil, un plano de 2 MB por recarga se
     nota.
   - La partida en sí (/api/) no se toca jamás: el estado vivo, las tiradas y
     el flujo de cambios van siempre directos al servidor.

   Todas las rutas son relativas al sitio donde vive Mesa: en GitHub Pages es
   una subcarpeta (/DnD/), no la raíz. */

const VERSION = "mesa-2.5.0";
const SHELL_CACHE = VERSION + "-app";
const IMG_CACHE = "mesa-img";
const IMG_LIMIT = 80;
const DEMO_IMG_CACHE = "mesa-demo-img";   // lo que se sube en la versión de prueba: no se recorta

const BASE = new URL("./", self.location.href);
const SHELL = [
  "./",
  "css/mesa.css",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "js/main.js", "js/net.js", "js/util.js", "js/i18n.js", "js/icons.js",
  "js/schema.js", "js/catalog.js", "js/los.js", "js/map.js", "js/dice.js",
  "js/dice-panel.js", "js/attacks.js", "js/attacks-core.js", "js/char-editor.js",
  "js/dm.js", "js/player.js", "js/screen.js",
  "js/engine.js", "js/local.js", "js/local-host.js", "js/local-worker.js",
  "js/spells.js", "js/spellbook.js", "js/voice.js", "js/portals.js"
].map(p => new URL(p, BASE).href);

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL))
      .catch(() => {})            // sin red al instalar: ya se llenará al usarla
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(k => k !== SHELL_CACHE && k !== IMG_CACHE && k !== DEMO_IMG_CACHE)
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.href.startsWith(BASE.href)) return;
  const rel = url.href.slice(BASE.href.length);
  if (rel.startsWith("api/")) return;

  if (rel.startsWith("img/")) {
    event.respondWith(imageFirst(req));
    return;
  }
  event.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(stripQuery(req), res.clone());
    return res;
  } catch {
    const hit = await cache.match(stripQuery(req));
    if (hit) return hit;
    if (req.mode === "navigate") {
      const shell = await cache.match(BASE.href);
      if (shell) return shell;
    }
    return new Response("Sin conexión con la partida", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

/* «/?role=dm» y «/» son la misma página: se guarda una sola vez */
function stripQuery(req) {
  const url = new URL(req.url);
  if (req.mode !== "navigate" || !url.search) return req;
  return new Request(url.origin + url.pathname);
}

async function imageFirst(req) {
  const hit = await caches.match(req);   // también las de la versión de prueba
  if (hit) return hit;
  const cache = await caches.open(IMG_CACHE);
  const res = await fetch(req);
  if (res.ok) {
    await cache.put(req, res.clone());
    trim(cache);
  }
  return res;
}

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - IMG_LIMIT; i++) await cache.delete(keys[i]);
}
