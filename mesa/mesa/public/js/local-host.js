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
import { CATALOG_BY_ID } from "./catalog.js";
import { SPELL_LIBRARY } from "./spells.js";

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
  const goblin = CATALOG_BY_ID.get("cat-goblin");
  const { id: _id, en: _en, hpAvg: _hp, hpDice: _dice, custom: _c, ...goblinSheet } = goblin;
  const foe = (name, hp, ac, mx, my, initiative) =>
    normalizeChar({ ...goblinSheet, kind: "monster", monsterKey: goblin.id, name, hp, maxHp: hp, ac, speed: 30, mapId: map.id, mx, my, initiative });
  /* Fichas de nivel 3 completas, para que la prueba enseñe cómo se juega */
  const atk = (name, atkBonus, damage, type, range) => ({ name, atk: atkBonus, damage, type, range });
  const item = (name, weight, extra = {}) => ({ name, weight, qty: 1, ...extra });
  const feat = (name, source, text) => ({ name, source, text });
  const spells = (...ids) => ids.map(id => ({ ...SPELL_LIBRARY.find(sp => sp.id === id) }));
  doc.chars = [
    pc("Aria", "Pícara", "Elfa", "#4f9d5d", 21, 15, 5, 7, {
      initiative: 17, str: 10, dex: 17, con: 12, int: 13, wis: 12, cha: 14, hitDice: "3d8", vision: 12,
      saves: ["dex", "int"], skills: ["acrobacias", "sigilo", "juego_de_manos", "percepcion", "enganio", "investigacion"],
      attacks: [atk("Espada corta", 5, "1d6+3", "perforante", "5 pies"), atk("Arco corto", 5, "1d6+3", "perforante", "80/320 pies"),
        atk("Daga", 5, "1d4+3", "perforante", "20/60 pies")],
      items: [item("Espada corta", 2, { equipped: true }), item("Arco corto", 2, { equipped: true }), item("Flechas", 0.05, { qty: 20 }),
        item("Daga", 1, { qty: 2 }), item("Armadura de cuero", 10, { equipped: true }), item("Herramientas de ladrón", 1), item("Cuerda de cáñamo", 10, { note: "50 pies" })],
      features: [feat("Ataque furtivo", "Clase", "Una vez por turno, 2d6 de daño extra si tienes ventaja o un aliado está a 5 pies del objetivo."),
        feat("Acción astuta", "Clase", "Correr, Destrabarse o Esconderse como acción adicional."),
        feat("Visión en la oscuridad", "Especie", "Ves en la penumbra a 60 pies como si hubiera luz."),
        feat("Ascendencia feérica", "Especie", "Ventaja contra quedar encantado; la magia no te duerme.")],
      notes: "Busca al hombre de la cicatriz que traicionó a su gremio."
    }),
    pc("Borin", "Guerrero", "Enano", "#c89b4a", 31, 18, 6, 8, {
      initiative: 9, str: 16, dex: 12, con: 16, int: 10, wis: 12, cha: 8, hitDice: "3d10", vision: 12,
      saves: ["str", "con"], skills: ["atletismo", "intimidacion", "percepcion"],
      attacks: [atk("Hacha de batalla", 5, "1d8+3", "cortante", "5 pies"), atk("Hacha de mano", 5, "1d6+3", "cortante", "20/60 pies")],
      items: [item("Hacha de batalla", 4, { equipped: true }), item("Cota de malla", 55, { equipped: true }), item("Escudo", 6, { equipped: true }),
        item("Hacha de mano", 2, { qty: 2 }), item("Raciones", 2, { qty: 5 })],
      features: [feat("Tomar aliento", "Clase", "Como acción adicional recuperas 1d10 + tu nivel de vida, una vez por descanso."),
        feat("Oleada de acción", "Clase", "Una acción más en tu turno, una vez por descanso."),
        feat("Estilo de combate: Defensa", "Clase", "+1 a la CA mientras lleves armadura."),
        feat("Resistencia enana", "Especie", "Ventaja en salvaciones contra veneno y resistencia a su daño.")],
      resources: [{ name: "Tomar aliento", uses: 0, max: 1 }, { name: "Oleada de acción", uses: 0, max: 1 }]
    }),
    pc("Cael", "Mago", "Humano", "#8878d8", 16, 12, 4, 9, {
      initiative: 12, str: 8, dex: 14, con: 13, int: 16, wis: 12, cha: 10, hitDice: "3d6",
      saves: ["int", "wis"], skills: ["arcanos", "historia", "investigacion"],
      attacks: [atk("Bastón", 1, "1d6-1", "contundente", "5 pies")],
      castAbility: "int", slots: [4, 2, 0, 0, 0, 0, 0, 0, 0],
      spellbook: spells("rayo-de-fuego", "proyectil-magico", "manos-ardientes", "dormir", "telarana"),
      items: [item("Bastón", 4, { equipped: true }), item("Libro de conjuros", 3), item("Bolsa de componentes", 2), item("Tinta y pluma", 0)],
      features: [feat("Recuperación arcana", "Clase", "En un descanso corto recuperas espacios de conjuro que sumen hasta 2 niveles."),
        feat("Tradición arcana: Evocación", "Clase", "Tus conjuros de área pueden no afectar a tus aliados.")]
    }),
    pc("Dara", "Clériga", "Mediana", "#d99a2b", 24, 16, 5, 10, {
      initiative: 6, str: 12, dex: 10, con: 14, int: 10, wis: 16, cha: 13, hitDice: "3d8", size: "Pequeño",
      saves: ["wis", "cha"], skills: ["medicina", "perspicacia", "religion"],
      attacks: [atk("Maza", 3, "1d6+1", "contundente", "5 pies")],
      castAbility: "wis", slots: [4, 2, 0, 0, 0, 0, 0, 0, 0],
      spellbook: spells("llama-sagrada", "bendecir", "curar-heridas", "palabra-curativa", "saeta-guia", "arma-espiritual"),
      items: [item("Maza", 4, { equipped: true }), item("Cota de escamas", 45, { equipped: true }), item("Escudo", 6, { equipped: true }),
        item("Símbolo sagrado", 1, { equipped: true }), item("Kit de sanador", 3, { note: "10 usos" })],
      features: [feat("Canalizar divinidad", "Clase", "Expulsar muertos vivientes, una vez por descanso."),
        feat("Afortunada", "Especie", "Si sacas un 1 en el d20, vuelves a tirar y te quedas con el nuevo."),
        feat("Valiente", "Especie", "Ventaja en salvaciones contra quedar asustada.")],
      resources: [{ name: "Canalizar divinidad", uses: 0, max: 1 }]
    }),
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
      case "wallmodel": {
        if (!c || c.role !== "dm") throw new Error("Solo el DM");
        let saved = (await kvGet("wallmodel")) || null;
        if (saved && Array.isArray(saved.w)) saved = { model: saved, lessons: [] };
        return saved || { model: null, lessons: [] };
      }
      case "wallmodelSet": {
        if (!c || c.role !== "dm") throw new Error("Solo el DM");
        let saved = (await kvGet("wallmodel")) || null;
        if (saved && Array.isArray(saved.w)) saved = { model: saved, lessons: [] };
        saved = { model: null, lessons: [], ...(saved || {}) };
        const f = msg.fields || {};
        if ("model" in f) saved.model = f.model;
        if ("lessons" in f) saved.lessons = Array.isArray(f.lessons) ? f.lessons : [];
        await kvSet("wallmodel", saved);
        return true;
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
