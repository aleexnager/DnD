/* Mesa sin servidor: el anfitrión de la versión de prueba.

   Hace en el navegador lo que server.js hace en Node, con el mismo motor
   (engine.js): recibe entradas, operaciones e imágenes, reparte a cada
   pestaña lo que le toca ver y guarda la partida. Corre dentro de un
   SharedWorker, así que todas las pestañas del mismo navegador juegan la
   misma partida: el DM en una, la pantalla de la tele en otra.

   La partida se guarda en IndexedDB y las imágenes en la caché del
   navegador, de donde las sirve el trabajador de fondo (sw.js) como si
   vinieran de /img/. */

import { createEngine } from "./engine.js";
import { normalizeChar, normalizeMap, edgeKey } from "./schema.js";

const DB = "mesa-demo";
const STORE = "kv";
export const IMG_CACHE = "mesa-demo-img";

const rid = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, "0")).join("");

/* ---------- IndexedDB, lo mínimo ---------- */
function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function kvGet(key) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function kvSet(key, value) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------- Imágenes ---------- */
const EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

async function storeImage(base, blob) {
  const ext = EXT[blob.type];
  if (!ext) throw new Error("Formato de imagen no admitido");
  const id = rid(8) + "." + ext;
  const cache = await caches.open(IMG_CACHE);
  await cache.put(new URL("img/" + id, base).href, new Response(blob, {
    headers: { "Content-Type": blob.type, "Cache-Control": "public, max-age=31536000, immutable" }
  }));
  return id;
}

/* Las copias de la versión de escritorio llevaban las imágenes dentro */
async function absorbImages(base, d) {
  const save = async dataURL => storeImage(base, await (await fetch(dataURL)).blob());
  for (const m of d.maps) {
    if (typeof m.image === "string" && m.image.startsWith("data:") && !m.imageId) m.imageId = await save(m.image).catch(() => "");
    delete m.image;
  }
  for (const c of d.chars) {
    if (typeof c.avatar === "string" && c.avatar.startsWith("data:") && !c.avatarId) c.avatarId = await save(c.avatar).catch(() => "");
    delete c.avatar;
  }
  return d;
}

/* ---------- Partida de ejemplo ----------
   Para que la primera vez haya algo que tocar: cuatro personajes en una sala
   y unos goblins esperando al otro lado de una puerta. */
function sampleDoc(doc) {
  const map = normalizeMap({ ...doc.maps[0], name: "Sala de la guardia", cols: 24, rows: 16, radius: 6, remember: true });
  const edges = {};
  const wall = (x, y, dir) => { edges[edgeKey(x, y, dir)] = "wall"; };
  for (let x = 2; x < 22; x++) { wall(x, 2, "h"); wall(x, 14, "h"); }
  for (let y = 2; y < 14; y++) { wall(2, y, "v"); wall(22, y, "v"); }
  for (let y = 2; y < 14; y++) if (y !== 8) wall(12, y, "v");
  edges[edgeKey(12, 8, "v")] = "door";
  map.edges = edges;

  const pc = (name, className, race, color, hp, ac, mx, my, extra = {}) =>
    normalizeChar({ kind: "pc", name, className, race, color, hp, maxHp: hp, ac, level: 3, speed: 30, mapId: map.id, mx, my, ...extra });
  const foe = (name, hp, ac, mx, my, initiative) =>
    normalizeChar({ kind: "monster", name, color: "#b8383b", hp, maxHp: hp, ac, sizeType: "Humanoide pequeño", speed: 30, mapId: map.id, mx, my, initiative, xp: 50, cr: "1/4" });
  doc.chars = [
    pc("Aria", "Pícara", "Elfa", "#4f9d5d", 21, 15, 5, 7, { initiative: 17 }),
    pc("Borin", "Guerrero", "Enano", "#c89b4a", 31, 18, 6, 8, { initiative: 9 }),
    pc("Cael", "Mago", "Humano", "#8878d8", 16, 12, 4, 9, { initiative: 12 }),
    pc("Dara", "Clériga", "Mediana", "#d99a2b", 24, 16, 5, 10, { initiative: 6 }),
    foe("Goblin 1", 7, 15, 16, 6, 14),
    foe("Goblin 2", 7, 15, 17, 9, 11),
    foe("Goblin 3", 7, 15, 19, 7, 8)
  ];
  doc.maps = [map];
  doc.session.activeMapId = map.id;
  doc.session.title = "Partida de prueba";
  doc.session.showMapToParty = true;
  return doc;
}

/* ---------- El anfitrión ---------- */
export function createHost(base) {
  const ports = new Map();          // testigo -> puerto que recibe el flujo
  const engine = createEngine({ rid, absorbImages: d => absorbImages(base, d), onPresence: () => presence() });
  const clients = engine.clients;

  const ready = (async () => {
    try {
      const saved = await kvGet("state");
      if (saved && saved.doc) {
        const { migrate } = await import("./schema.js");
        engine.doc = migrate(saved.doc);
        engine.loadClients(saved.clients);
      } else engine.doc = sampleDoc(engine.doc);
    } catch { engine.doc = sampleDoc(engine.doc); }
    engine.pin = "demo";
  })();

  let saveTimer = null;
  const save = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const doc = engine.doc;
      kvSet("state", {
        doc: { ...doc, session: { ...doc.session, alert: null, ping: null } },
        clients: engine.saveClients()
      }).catch(() => {});
    }, 400);
  };

  let pushTimer = null;
  const push = () => {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      const rev = engine.advance();
      for (const [token, port] of ports) {
        const c = clients.get(token);
        if (c) port.postMessage({ event: "state", data: { rev, doc: engine.snapshot(c) } });
      }
    }, 30);
    save();
  };
  const presence = () => {
    const live = engine.presence();
    for (const port of ports.values()) port.postMessage({ event: "presence", data: live });
  };

  async function handle(port, msg) {
    await ready;
    const c = msg.token ? clients.get(msg.token) : null;
    switch (msg.kind) {
      case "hello": return engine.hello();
      case "join": {
        const out = engine.join(msg.body, { checkPin: false });
        if (out.error) throw Object.assign(new Error(out.error), { status: out.status });
        save();
        return { token: out.token, id: out.client.id, role: out.client.role, charId: out.client.charId };
      }
      case "ping": return !!c;
      case "stream": {
        if (!c) throw Object.assign(new Error("sesión caducada"), { status: 401 });
        ports.set(msg.token, port);
        engine.setOnline(c, true);
        engine.refresh();
        port.postMessage({ event: "state", data: { rev: engine.rev, doc: engine.snapshot(c) } });
        presence();
        return true;
      }
      case "ops": {
        if (!c) return { status: 401, data: { error: "sesión caducada" } };
        const out = await engine.run(c, Array.isArray(msg.ops) ? msg.ops : []);
        if (out.applied) push();
        return out.error ? { status: 400, data: { error: out.error } } : { status: 200, data: { ok: true, charId: c.charId } };
      }
      case "image": {
        if (!c) throw new Error("sesión caducada");
        return storeImage(base, msg.blob);
      }
      case "leave": {
        ports.delete(msg.token);
        if (c) engine.setOnline(c, false);
        presence();
        return true;
      }
      default: throw new Error("Petición desconocida: " + msg.kind);
    }
  }

  return {
    attach(port) {
      port.onmessage = async e => {
        const msg = e.data || {};
        try {
          port.postMessage({ reply: msg.id, ok: true, data: await handle(port, msg) });
        } catch (err) {
          port.postMessage({ reply: msg.id, ok: false, error: err.message, status: err.status || 500 });
        }
      };
      if (port.start) port.start();
    }
  };
}
