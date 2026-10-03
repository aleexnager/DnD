/* Piezas pequeñas que usan todas las vistas. */

export const $ = (sel, root = document) => root.querySelector(sel);
import { icon } from "./icons.js";
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const esc = (s = "") => String(s).replace(/[&<>"']/g, m =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));

export const lines = (s = "") => String(s).split("\n").map(x => x.trim()).filter(Boolean);
export const sign = n => (n >= 0 ? "+" : "") + n;
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const pct = c => clamp(Math.round((c.hp / Math.max(1, c.maxHp)) * 100), 0, 100);

/* «Goblin 10» es G10, no G1: con muchas criaturas iguales, el número es lo
   que las distingue en el mapa. */
export const initials = n => {
  const words = (n || "?").trim().split(/\s+/);
  const last = words[words.length - 1];
  if (words.length > 1 && /^\d+$/.test(last)) return ((words[0][0] || "") + last).toUpperCase();
  return words.slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "?";
};

export const hpTone = p => (p <= 0 ? "out" : p < 25 ? "bad" : p < 55 ? "warn" : "ok");

/* ---------- Movimiento ----------
   Quien pide menos movimiento en su sistema no lo recibe: ni en CSS ni en lo
   que se anima desde aquí o desde el lienzo del mapa. */
export const reducedMotion = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/* La barra de vida lleva su identificador para que, al repintarse, se deslice
   desde donde estaba en vez de saltar. */
export const hpBar = (id, p) =>
  `<div class="bar"><i class="${hpTone(p)}" data-bar="${esc(id)}" data-p="${p}" style="width:${p}%"></i></div>`;

/* Las vistas se repintan enteras a cada cambio, así que una transición de
   CSS no tiene de dónde partir. Se recuerda el último valor de cada barra y se
   anima desde ahí; la tarjeta que la contiene destella en rojo si ha perdido
   vida y en verde si la ha recuperado. Con «silent» solo se apunta el valor:
   al volver a una pestaña, lo que cambió mientras no se miraba ya no es noticia. */
const lastBars = new Map();
export function tweenBars(root, scope = "", silent = false) {
  if (!root) return;
  const still = silent || reducedMotion();
  root.querySelectorAll("[data-bar]").forEach(bar => {
    const key = scope + bar.dataset.bar;
    const to = Number(bar.dataset.p);
    const from = lastBars.get(key);
    lastBars.set(key, to);
    if (still || from === undefined || from === to) return;
    bar.style.transition = "none";
    bar.style.width = from + "%";
    void bar.offsetWidth;
    bar.style.transition = "";
    bar.style.width = to + "%";
    const card = bar.closest("[data-flash]");
    if (card) card.classList.add(to < from ? "hurt" : "healed");
  });
}

export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/* Delegación de eventos: un solo escuchador por raíz. */
export function on(root, event, selector, handler) {
  root.addEventListener(event, e => {
    const target = e.target.closest(selector);
    if (target && root.contains(target)) handler(e, target);
  });
}

/* ---------- Avisos ---------- */
let toastHost = null;
export function toast(message, tone = "") {
  if (!toastHost) {
    toastHost = el('<div class="toasts" role="status" aria-live="polite"></div>');
    document.body.appendChild(toastHost);
  }
  const node = el(`<div class="toast ${tone}">${esc(message)}</div>`);
  toastHost.appendChild(node);
  setTimeout(() => { node.classList.add("out"); setTimeout(() => node.remove(), 300); }, 3200);
}

/* ---------- Ventanas ---------- */
export function modal({ title, body, actions = [], wide = false, onOpen }) {
  const back = el(`
    <div class="modal-back">
      <div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <header><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Cerrar">${icon("close")}</button></header>
        <div class="modal-body"></div>
        <footer></footer>
      </div>
    </div>`);
  const bodyHost = back.querySelector(".modal-body");
  if (typeof body === "string") bodyHost.innerHTML = body; else bodyHost.appendChild(body);

  const foot = back.querySelector("footer");
  /* Se va con un fundido corto; mientras tanto ya no recibe clics. */
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKey);
    if (reducedMotion()) return back.remove();
    back.classList.add("closing");
    setTimeout(() => back.remove(), 140);
  };
  actions.forEach(a => {
    const b = el(`<button class="btn ${a.tone || ""}">${esc(a.label)}</button>`);
    b.addEventListener("click", () => { if (a.run && a.run(bodyHost) === false) return; close(); });
    foot.appendChild(b);
  });
  back.querySelector("[data-close]").addEventListener("click", close);
  back.addEventListener("mousedown", e => { if (e.target === back) close(); });
  const onKey = e => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);

  document.body.appendChild(back);
  const first = bodyHost.querySelector("input, textarea, select, button");
  if (first) first.focus();
  if (onOpen) onOpen(bodyHost, close);
  return { close, body: bodyHost };
}

export function confirmBox(message, { danger = true, okLabel = "Sí, adelante" } = {}) {
  return new Promise(resolve => {
    let done = false;
    modal({
      title: "Confirmar",
      body: `<p class="prose">${esc(message)}</p>`,
      actions: [
        { label: "Cancelar", run: () => { done = true; resolve(false); } },
        { label: okLabel, tone: danger ? "danger" : "primary", run: () => { done = true; resolve(true); } }
      ]
    });
    const check = setInterval(() => {
      if (done) return clearInterval(check);
      if (!document.querySelector(".modal-back")) { clearInterval(check); resolve(false); }
    }, 200);
  });
}

/* ---------- Imágenes ---------- */
/* Reduce la imagen antes de subirla: un retrato de 4 MB no aporta nada a 96 px. */
export function shrinkImage(file, maxSide) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => blob ? resolve({ blob, w, h }) : reject(new Error("No se pudo procesar la imagen")),
        "image/webp", 0.86);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen")); };
    img.src = url;
  });
}

/* Las imágenes van por ruta relativa: Mesa puede vivir en una subcarpeta
   (GitHub Pages la sirve en /DnD/). En la versión de prueba, la que se acaba
   de subir en esta pestaña se enseña directamente desde memoria. */
const localImages = new Map();
export const registerLocalImage = (id, url) => localImages.set(id, url);
export const imgURL = id => (id ? localImages.get(id) || "img/" + id : "");

/* ---------- Fechas ---------- */
export const hhmm = ts => new Date(ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
