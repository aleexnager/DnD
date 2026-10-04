/* Sonido ambiente en el navegador. El servidor manda qué suena y a qué volumen
   (sound-core.js); aquí solo se reproduce: cada audio se descarga y se
   descodifica una vez, suena en bucle sin cortes, y el volumen sube y baja con
   un fundido para que acercarse a una hoguera se note poco a poco. Detrás de
   una pared, además de bajar, se le quitan los agudos: así suena un muro.

   El navegador no deja sonar nada hasta que se toca la página, así que si
   llega sonido antes, se avisa una vez y empieza con el primer toque. */

import { imgURL, toast } from "./util.js";
import { icon, withIcon } from "./icons.js";

const KEY = "mesa.ambient";
const FADE = 0.8;                 // segundos del fundido
let ctx = null, master = null;
const buffers = new Map();        // audioId -> Promise<AudioBuffer>
const playing = new Map();        // id -> { node, gain, filter, audioId }
let wanted = [];
let warned = false;

/* Cada aparato decide si oye el ambiente. La tele y los jugadores, sí por
   defecto; el DM, no, que tiene su propia mesa delante. */
export function ambientOn(role) {
  try { const v = localStorage.getItem(KEY + "." + role); if (v !== null) return v === "1"; } catch {}
  return role !== "dm";
}
export function setAmbientOn(role, on) {
  try { localStorage.setItem(KEY + "." + role, on ? "1" : "0"); } catch {}
  if (on) unlock();
}

/* Lo último que mandó el servidor para este aparato, y si se quiere oír */
let myRole = "", heard = [];
export function ambientUpdate(role, list) { myRole = role; heard = list || []; apply(); }
function apply() { syncAmbient(ambientOn(myRole) ? heard : []); }

/* El botón de oír o silenciar el ambiente en este aparato */
export function ambientToggle(role, withLabel = false) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = withLabel ? "btn sm" : "icon-btn";
  const paint = () => {
    const on = ambientOn(role);
    b.setAttribute("aria-pressed", String(on));
    if (withLabel) b.classList.toggle("on", on);
    b.title = on ? "Silenciar el sonido ambiente en este aparato" : "Oír el sonido ambiente en este aparato";
    b.setAttribute("aria-label", b.title);
    b.innerHTML = withLabel ? withIcon(on ? "volume" : "volumeOff", "Ambiente", 15) : icon(on ? "volume" : "volumeOff");
  };
  b.addEventListener("click", () => { setAmbientOn(role, !ambientOn(role)); paint(); apply(); });
  paint();
  return b;
}

function context() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.connect(ctx.destination);
  return ctx;
}

/* El primer toque o tecla despierta el audio */
function unlock() {
  const c = context();
  if (c && c.state === "suspended") c.resume().then(() => syncAmbient(wanted)).catch(() => {});
}
for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, unlock, { capture: true, passive: true });

function load(audioId) {
  if (!buffers.has(audioId)) {
    const p = fetch(imgURL(audioId))
      .then(r => { if (!r.ok) throw new Error("No se encuentra el audio"); return r.arrayBuffer(); })
      .then(data => new Promise((ok, ko) => ctx.decodeAudioData(data, ok, ko)));
    p.catch(() => buffers.delete(audioId));     // si falla, se reintenta la próxima vez
    buffers.set(audioId, p);
  }
  return buffers.get(audioId);
}

/* Deja sonando exactamente esta lista: [{ id, audioId, gain, muffled }] */
export function syncAmbient(list) {
  wanted = list || [];
  const c = wanted.length || playing.size ? context() : null;
  if (!c) return;
  if (c.state === "suspended") {
    if (wanted.length && !warned) { warned = true; toast("Toca la pantalla para oír el ambiente"); }
    return;
  }
  const now = c.currentTime;
  const ids = new Set(wanted.map(s => s.id));

  for (const [id, p] of playing) {
    if (ids.has(id)) continue;
    p.gain.gain.setTargetAtTime(0, now, FADE / 3);
    const node = p.node;
    setTimeout(() => { try { node.stop(); } catch {} }, FADE * 3000);
    playing.delete(id);
  }

  for (const s of wanted) {
    const p = playing.get(s.id);
    if (p && p.audioId === s.audioId) {
      p.gain.gain.setTargetAtTime(s.gain, now, FADE / 3);
      p.filter.frequency.setTargetAtTime(s.muffled ? 700 : 20000, now, FADE / 3);
      continue;
    }
    if (p) { try { p.node.stop(); } catch {} playing.delete(s.id); }
    const gain = c.createGain(), filter = c.createBiquadFilter();
    gain.gain.value = 0;
    filter.type = "lowpass";
    filter.frequency.value = s.muffled ? 700 : 20000;
    filter.connect(gain).connect(master);
    const slot = { node: null, gain, filter, audioId: s.audioId };
    playing.set(s.id, slot);
    load(s.audioId).then(buffer => {
      if (playing.get(s.id) !== slot) return;          // ya no hace falta
      const node = c.createBufferSource();
      node.buffer = buffer;
      node.loop = true;
      node.connect(filter);
      /* Cada fuente empieza en un punto distinto del bucle: diez antorchas
         con el mismo audio no suenan como una sola */
      node.start(0, Math.random() * buffer.duration);
      slot.node = node;
      const cur = wanted.find(x => x.id === s.id);
      gain.gain.setTargetAtTime(cur ? cur.gain : 0, c.currentTime, FADE / 3);
    }).catch(() => { if (playing.get(s.id) === slot) playing.delete(s.id); });
  }
}

/* Para comprobar qué está sonando (pruebas y diagnóstico) */
export const ambientState = () => ({
  context: ctx ? ctx.state : "none",
  playing: [...playing].map(([id, p]) => ({ id, gain: Math.round(p.gain.gain.value * 1000) / 1000, loaded: !!p.node, muffled: p.filter.frequency.value < 1000 }))
});

/* Para escuchar un archivo en el editor antes de ponerlo */
let preview = null;
export function previewSound(audioId, volume = 0.8) {
  stopPreview();
  if (!audioId) return null;
  preview = new Audio(imgURL(audioId));
  preview.volume = volume;
  preview.play().catch(() => {});
  return preview;
}
export function stopPreview() { if (preview) { preview.pause(); preview = null; } }
