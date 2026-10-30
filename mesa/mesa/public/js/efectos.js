/* Efectos: los momentos que la mesa celebra.

   Un crítico, una pifia, el «¡A las armas!» al empezar el combate, la ronda
   nueva, el golpe que te quita vida en el móvil. Todo se dispara una vez,
   cuando pasa, y se borra solo: nada queda girando ni pidiendo fotogramas.

   Son piezas sueltas por encima de la vista (posición fija, sin clics), así
   que no les afecta que la vista se repinte entera a cada cambio. Con
   «reducir movimiento» o con la pestaña escondida, no se hace nada: lo
   importante ya lo dicen el texto y los colores de siempre. */

import { reducedMotion, esc, floatText } from "./util.js";

export { floatText };
import { store, onState } from "./net.js";

const quiet = () => reducedMotion() || (typeof document !== "undefined" && document.hidden);

/* Una capa por encima de todo donde se cuelgan los efectos */
let host = null;
function layer() {
  if (!host || !host.isConnected) {
    host = document.createElement("div");
    host.className = "vfx-layer";
    host.setAttribute("aria-hidden", "true");
    document.body.appendChild(host);
  }
  return host;
}
const drop = (node, ms) => setTimeout(() => node.remove(), ms);

/* ---------- Chispas ----------
   Un puñado de chispas que salen de un punto y caen con algo de gravedad.
   Cada una lleva su rumbo en variables de CSS: la animación la hace el
   navegador, sin JavaScript a cada fotograma. */
export function burst(x, y, { colors = ["#ffe3a3", "#e0bd76", "#c89b4a"], count = 26, power = 1, size = 6, life = 1100 } = {}) {
  if (quiet()) return;
  const box = document.createElement("div");
  box.className = "vfx-burst";
  box.style.left = x + "px";
  box.style.top = y + "px";
  let html = "";
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const d = (60 + Math.random() * 110) * power;
    const s = size * (0.5 + Math.random() * 0.9);
    html += `<i style="--dx:${(Math.cos(a) * d).toFixed(1)}px;--dy:${(Math.sin(a) * d * 0.8 - 30 * power).toFixed(1)}px;` +
      `--fall:${(40 + Math.random() * 60) * power}px;--s:${s.toFixed(1)}px;--c:${colors[i % colors.length]};` +
      `--d:${Math.round(life * (0.65 + Math.random() * 0.35))}ms;--w:${Math.round(Math.random() * 90)}ms"></i>`;
  }
  box.innerHTML = html;
  layer().appendChild(box);
  drop(box, life + 200);
}

/* Desde el centro de un elemento */
export function burstFrom(node, opts) {
  if (!node || quiet()) return;
  const r = node.getBoundingClientRect();
  if (!r.width) return;
  burst(r.left + r.width / 2, r.top + r.height / 2, opts);
}

/* ---------- Bordes de la pantalla ----------
   Un resplandor que entra por los bordes y se va: rojo con un golpe, verde
   con una cura, dorado cuando te toca. */
export function edgeFlash(tone = "gold") {
  if (quiet()) return;
  const node = document.createElement("div");
  node.className = "vfx-edge " + tone;
  layer().appendChild(node);
  drop(node, 1300);
}

/* ---------- Rótulo de cine ----------
   Cruza la pantalla con letras grandes: empieza el combate, ronda nueva,
   fin del combate. «compact» es para la vista del DM, que tiene trabajo:
   arriba y más pequeño. */
let lastBanner = null;
export function banner({ kicker = "", title = "", sub = "", tone = "gold", compact = false } = {}) {
  if (quiet()) return;
  if (lastBanner) lastBanner.remove();
  const node = document.createElement("div");
  node.className = `vfx-banner ${tone}${compact ? " compact" : ""}`;
  node.innerHTML = `<div class="vfx-banner-band">
      <i class="vfx-rule"></i>
      ${kicker ? `<small>${esc(kicker)}</small>` : ""}
      <b>${esc(title)}</b>
      ${sub ? `<span>${esc(sub)}</span>` : ""}
      <i class="vfx-rule"></i>
    </div>`;
  /* Fuera de la capa: el diccionario de idiomas traduce lo que entra en el body */
  document.body.appendChild(node);
  lastBanner = node;
  drop(node, compact ? 2000 : 2600);
}

/* ---------- Combate ----------
   Mira el estado y canta lo que cambia: empieza, ronda nueva, se acaba.
   Lo que ya estaba al entrar no se canta. */
export function watchCombat({ compact = false } = {}) {
  let was = null;
  const check = () => {
    const d = store.doc;
    if (!d) return;
    const c = d.session.combat || {};
    const now = { on: !!c.on, round: c.round || 1 };
    if (was) {
      if (now.on && !was.on) {
        banner({ kicker: "Empieza el combate", title: "¡A las armas!", sub: "Ronda 1", tone: "blood", compact });
      } else if (!now.on && was.on) {
        banner({ title: "Fin del combate", tone: "gold", compact });
      } else if (now.on && now.round > was.round) {
        banner({ kicker: "Ronda", title: String(now.round), tone: "gold", compact });
      }
    }
    was = now;
  };
  onState(check);
  check();
}

/* ---------- Ambiente ----------
   Unas pavesas que suben despacio por detrás de todo, en la entrada y en la
   tele. Solo transform y opacidad: las mueve la tarjeta gráfica. */
export function embers(parent, count = 18) {
  if (!parent || reducedMotion()) return null;
  const box = document.createElement("div");
  box.className = "vfx-embers";
  box.setAttribute("aria-hidden", "true");
  let html = "";
  for (let i = 0; i < count; i++) {
    const left = (i * 97 + 13) % 100;
    html += `<i style="left:${left}%;--d:${(9 + (i * 7) % 11)}s;--w:-${(i * 1.7) % 14}s;--x:${((i % 5) - 2) * 18}px;--s:${2 + (i % 3)}px"></i>`;
  }
  box.innerHTML = html;
  parent.prepend(box);
  return box;
}

/* ---------- Cambio de vista ----------
   De la entrada a la partida, un fundido cruzado en vez de un salto, donde
   el navegador sabe hacerlo (View Transitions). «run» tiene que ser
   síncrono: lo que haya que esperar, se espera antes. */
export function transition(run) {
  if (quiet() || typeof document.startViewTransition !== "function") { run(); return Promise.resolve(); }
  return document.startViewTransition(run).updateCallbackDone.catch(() => {});
}
