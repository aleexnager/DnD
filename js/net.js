/* Conexión con la partida. El servidor manda el estado ya filtrado según quién
   seas, así que la vista solo tiene que pintar lo que le llega. */

import { toast } from "./util.js";

/* Una sesión por papel, no una sola para todo el navegador. Si no, al abrir la
   pantalla de la party desde el mismo ordenador se reutilizaba la sesión del
   DM y la tele entraba como DM. */
const SESSION_KEY = "mesa.sessions";
const ROLE_ORDER = ["dm", "player", "screen"];

export const store = {
  session: null,      // { token, id, role, charId, name }
  doc: null,
  presence: [],
  online: false
};

const listeners = { state: [], presence: [], status: [], rtc: [] };
export const onState = fn => listeners.state.push(fn);
export const onRtc = fn => listeners.rtc.push(fn);
export const onPresence = fn => listeners.presence.push(fn);
export const onStatus = fn => listeners.status.push(fn);
const emit = (kind, payload) => listeners[kind].forEach(fn => fn(payload));

function allSessions() {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch { return {}; }
}

export function savedSession(role) {
  const all = allSessions();
  if (role) return all[role] || null;
  for (const r of ROLE_ORDER) if (all[r]) return all[r];
  return null;
}

export function saveSession(s) {
  store.session = s;
  const all = allSessions();
  all[s.role] = s;
  localStorage.setItem(SESSION_KEY, JSON.stringify(all));
}

/* Salir: se olvida esta sesión y se vuelve al menú, sin el ?role pegado en la
   dirección para que se puedan elegir los tres papeles otra vez. */
export function leave() {
  forgetSession();
  location.href = "./";
}

export function forgetSession(role) {
  const which = role || (store.session && store.session.role);
  const all = allSessions();
  if (which) delete all[which]; 
  localStorage.setItem(SESSION_KEY, JSON.stringify(all));
  if (!role || !store.session || store.session.role === which) store.session = null;
}

/* ---------- Transporte ----------
   Lo normal es hablar con el servidor de Node por HTTP. En la versión de
   prueba (GitHub Pages, o ?demo) no hay servidor: el mismo motor corre en el
   navegador y lo comparten todas las pestañas (local.js). Las vistas no
   notan la diferencia. */
export const DEMO = (() => {
  try {
    const q = new URLSearchParams(location.search).get("demo");
    if (q === "0") localStorage.removeItem("mesa.demo");
    if (q !== null && q !== "0") localStorage.setItem("mesa.demo", "1");
    return location.hostname.endsWith(".github.io") || localStorage.getItem("mesa.demo") === "1";
  } catch { return location.hostname.endsWith(".github.io"); }
})();

const http = {
  async hello() { return (await fetch("api/hello")).json(); },
  async join(body) {
    const res = await fetch("api/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo entrar");
    return data;
  },
  /* true: sesión viva · false: el servidor ya no la conoce · null: no contesta */
  async ping(token) {
    try { return (await fetch("api/ping?token=" + encodeURIComponent(token))).ok; } catch { return null; }
  },
  stream(token, on) {
    const es = new EventSource("api/stream?token=" + encodeURIComponent(token));
    es.addEventListener("state", e => on.state(JSON.parse(e.data)));
    es.addEventListener("presence", e => on.presence(JSON.parse(e.data)));
    es.addEventListener("rtc", e => on.rtc && on.rtc(JSON.parse(e.data)));
    es.onerror = () => { es.close(); on.error(); };
    return () => es.close();
  },
  async ops(token, ops) {
    const res = await fetch("api/op", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ops }) });
    return { status: res.status, data: await res.json() };
  },
  async image(token, blob) {
    const res = await fetch("api/image?token=" + encodeURIComponent(token), {
      method: "POST", headers: { "Content-Type": blob.type || "image/webp" }, body: blob
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo subir la imagen");
    return data.imageId;
  },
  async rtc(token, to, data) {
    const res = await fetch("api/rtc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, to, data }) });
    return res.ok;
  },
  leave() {}
};

let transportP = null;
const transport = () => transportP || (transportP = DEMO ? import("./local.js").then(m => m.localTransport()) : Promise.resolve(http));

export async function join({ name, role, pin, charId }) {
  const data = await (await transport()).join({ name, role, pin, charId });
  saveSession({ ...data, name });
  return data;
}

export async function lobby() {
  return (await transport()).hello();
}

export async function ping(token) {
  return (await transport()).ping(token);
}

/* ---------- Flujo de estado ---------- */
let closeStream = null;
let retry = 0;

export async function connect() {
  if (!store.session) return;
  const t = await transport();
  if (closeStream) closeStream();
  closeStream = t.stream(store.session.token, {
    state(payload) {
      retry = 0;
      if (!store.online) { store.online = true; emit("status", true); }
      store.doc = payload.doc;
      /* «you» manda también cuando viene vacío: si el DM libera tu personaje
         o lo recuperas desde otro aparato, esta pestaña se queda sin él. */
      if (store.session.role === "player") store.session.charId = payload.doc.you || null;
      emit("state", store.doc);
    },
    rtc(msg) { emit("rtc", msg); },
    presence(list) {
      store.presence = list;
      emit("presence", store.presence);
    },
    error() {
      if (store.online) { store.online = false; emit("status", false); }
      retry = Math.min(retry + 1, 8);
      setTimeout(async () => {
        // Si el servidor se reinició, el testigo ya no vale y hay que volver a entrar
        const alive = await t.ping(store.session.token);
        if (alive === false) {
          try { sessionStorage.setItem("mesa.notice", "Tu sesión ha terminado: el DM te ha sacado de la mesa o la partida ha empezado de cero."); } catch {}
          forgetSession(); location.reload(); return;
        }
        connect();
      }, Math.min(4000, 400 * retry));
    }
  });
}

let queue = [];
let flushing = false;

/* Las operaciones se agrupan: cien clics de daño no son cien peticiones. */
export function op(type, extra = {}) {
  queue.push({ type, ...extra });
  if (!flushing) {
    flushing = true;
    queueMicrotask(flush);
  }
  return true;
}

async function flush() {
  const ops = queue;
  queue = [];
  flushing = false;
  if (!ops.length || !store.session) return;
  try {
    const { status, data } = await (await transport()).ops(store.session.token, ops);
    if (status === 401) { forgetSession(); location.reload(); return; }
    if (status >= 400) toast(data.error || "No se pudo aplicar el cambio", "bad");
  } catch {
    toast("Sin conexión con la partida", "bad");
  }
}

/* Mensajes de arranque de la voz, directos a otra sesión */
export async function sendRtc(to, data) {
  const t = await transport();
  if (!t.rtc || !store.session) return false;
  try { return await t.rtc(store.session.token, to, data); } catch { return false; }
}

export async function uploadImage(blob) {
  return (await transport()).image(store.session.token, blob);
}

/* Al cerrar la pestaña, en la versión de prueba se avisa para que no se quede
   como conectada (por HTTP lo nota el servidor solo). */
addEventListener("pagehide", () => {
  if (transportP && store.session) transportP.then(t => t.leave(store.session.token));
});

/* Atajos de uso frecuente */
export const patchChar = (id, fields) => op("char.patch", { id, fields });
export const patchSession = fields => op("session.patch", { fields });
export const patchMap = (id, fields) => op("map.patch", { id, fields });
export const addLog = entry => op("log.add", { entry });
