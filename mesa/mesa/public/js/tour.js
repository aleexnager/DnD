/* El tutorial guiado: un recorrido por cada pantalla, partido en secciones.

   Cada paso señala el control de verdad (oscurece el resto y lo rodea) y lo
   explica en una tarjeta. Se puede ir paso a paso, saltar a cualquier
   sección desde el índice o buscar un control por su nombre («niebla»,
   «susurrar») e ir directo a su explicación.

   El recorrido de otra pantalla también se puede leer (un DM que quiere
   saber qué ve el jugador): entonces no hay nada que señalar y la tarjeta
   sale en el centro.

   Nada del tutorial cambia la partida: como mucho cambia de pestaña, abre un
   panel o una ventana para enseñarla, y la cierra al pasar de paso. Lo que
   el texto dice va en español y en inglés aquí mismo (son párrafos, no
   etiquetas sueltas), y por eso la tarjeta lleva data-keep. */

import { el, esc, modal } from "./util.js";
import { icon } from "./icons.js";
import { currentLang } from "./i18n.js";
import { TOURS, SCENES } from "./tour-content.js";

/* ---------- Lo que se recuerda en este aparato ---------- */
const KEY = "mesa.tour.";
const memo = (k, v) => { try { if (v === undefined) return localStorage.getItem(KEY + k); localStorage.setItem(KEY + k, v); } catch {} return null; };
const doneOf = id => new Set(String(memo("done." + id) || "").split(",").filter(Boolean));
const markDone = (id, sec) => { const s = doneOf(id); s.add(sec); memo("done." + id, [...s].join(",")); };

/* Español o inglés: los textos van en pares */
const en = () => currentLang() === "en";
export const L = pair => Array.isArray(pair) ? pair[en() ? 1 : 0] : pair;
const pick = x => x[en() ? "en" : "es"];

/* Un poco de formato en el texto: **negrita**, [[tecla]] y listas con «- » */
export function fmt(text) {
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\[\[(.+?)\]\]/g, "<kbd>$1</kbd>");
  const out = [];
  let list = null;
  for (const line of String(text).split("\n")) {
    const li = line.match(/^- (.*)$/);
    if (li) { (list = list || []).push(`<li>${inline(li[1])}</li>`); continue; }
    if (list) { out.push(`<ul>${list.join("")}</ul>`); list = null; }
    if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  if (list) out.push(`<ul>${list.join("")}</ul>`);
  return out.join("");
}

/* La pantalla en la que se está: dm, player, screen o gate (la entrada) */
let here = "gate";
export function setTourRole(role) { here = role; }

const tourOf = id => TOURS.find(t => t.id === id);
const stepsOf = tour => tour.sections.reduce((n, s) => n + s.steps.length, 0);

/* ---------- Los «escenarios»: preparar la pantalla para un paso ----------
   Pasos seguidos con el mismo escenario lo comparten: no se cierra y se
   vuelve a abrir la misma ventana entre uno y otro. */
const wait = ms => new Promise(r => setTimeout(r, ms));
const frames = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
let scene = null, leaveScene = null;
async function enterScene(name) {
  if (name === scene) return;
  if (leaveScene) { try { await leaveScene(); } catch {} }
  scene = name; leaveScene = null;
  const def = name && SCENES[name];
  if (!def) return;
  try { leaveScene = (await def()) || null; } catch { leaveScene = null; }
  await wait(140);
  await frames();
}

/* El control que se señala: el primero que se vea de verdad */
function findTarget(sel) {
  if (!sel) return null;
  for (const s of [].concat(sel)) {
    for (const node of document.querySelectorAll(s)) {
      const r = node.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const st = getComputedStyle(node);
      if (st.visibility === "hidden" || st.display === "none") continue;
      return node;
    }
  }
  return null;
}

/* ---------- El recorrido ---------- */
let run = null;

export function startTour(id, at = { si: 0, k: 0 }) {
  const tour = tourOf(id);
  if (!tour) return;
  stopTour(true);
  const live = tour.role === here;
  const root = el(`<div class="tour" data-keep>
    <div class="tour-shade"></div><div class="tour-spot hidden"></div>
    <div class="tour-card" role="dialog" aria-modal="false" aria-live="polite"></div></div>`);
  document.body.appendChild(root);
  run = { tour, si: at.si || 0, k: at.k || 0, live, root, node: null, timer: null, busy: false };
  const card = root.querySelector(".tour-card");
  card.addEventListener("click", e => {
    const b = e.target.closest("[data-tour]");
    if (!b) return;
    const what = b.dataset.tour;
    if (what === "next") return move(1);
    if (what === "prev") return move(-1);
    if (what === "skip") return go(run.si + 1, 0);
    if (what === "close") return stopTour();
    if (what === "index") { const t = run.tour.id; stopTour(); return openTourIndex(t); }
  });
  run.onKey = e => {
    if (!run || document.querySelector(".modal-back:not(.tour-host)") && !leaveScene) return;
    if (e.key === "Escape") { e.stopPropagation(); stopTour(); }
    else if (e.target.closest && e.target.closest("input, textarea, select")) return;
    else if (e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); move(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); move(-1); }
  };
  document.addEventListener("keydown", run.onKey, true);
  /* La pantalla se repinta con cada cambio de la partida: se vuelve a buscar
     el control y a recolocar el foco */
  run.onResize = () => place();
  addEventListener("resize", run.onResize);
  run.timer = setInterval(() => place(), 300);
  show();
}

export function stopTour(silent = false) {
  if (!run) return;
  const r = run;
  run = null;
  clearInterval(r.timer);
  document.removeEventListener("keydown", r.onKey, true);
  removeEventListener("resize", r.onResize);
  r.root.remove();
  enterScene(null);
  if (!silent) memo("at." + r.tour.id, `${r.si}:${r.k}`);
}
export const tourRunning = () => !!run;

function move(dir) {
  if (!run || run.busy) return;
  const sec = run.tour.sections[run.si];
  if (dir > 0 && run.k < sec.steps.length - 1) return go(run.si, run.k + 1);
  if (dir > 0) {
    markDone(run.tour.id, sec.id);
    if (run.si >= run.tour.sections.length - 1) { memo("at." + run.tour.id, "0:0"); return finish(); }
    return go(run.si + 1, 0);
  }
  if (run.k > 0) return go(run.si, run.k - 1);
  if (run.si > 0) return go(run.si - 1, run.tour.sections[run.si - 1].steps.length - 1);
}
function go(si, k) {
  if (!run) return;
  if (si >= run.tour.sections.length) return finish();
  run.si = si; run.k = k;
  memo("at." + run.tour.id, `${si}:${k}`);
  show();
}

function finish() {
  const id = run.tour.id;
  stopTour(true);
  const body = el(`<div class="tour-end" data-keep>${icon("check", 34)}
    <p>${esc(L(["Has terminado el recorrido. Puedes volver a él cuando quieras con el botón de ayuda", "You have finished the tour. Come back to it any time with the help button"]))}
      <span class="tour-chip" aria-hidden="true">?</span> ${esc(L(["de la cabecera.", "in the header."]))}</p>
    <p class="prose">${esc(L(["Desde el índice puedes volver a cualquier sección o buscar un control.", "From the index you can go back to any section or search for a control."]))}</p></div>`);
  modal({ title: L(["¡Listo!", "All done!"]), body, actions: [{ label: L(["Ver el índice", "See the index"]), run: () => setTimeout(() => openTourIndex(id), 150) }, { label: L(["Cerrar", "Close"]), tone: "primary" }] });
}

async function show() {
  const r = run;
  if (!r) return;
  r.busy = true;
  const sec = r.tour.sections[r.si], step = sec.steps[r.k];
  r.root.querySelector(".tour-card").classList.add("busy");
  if (r.live) await enterScene("scene" in step ? step.scene : sec.scene || null);
  if (run !== r) return;
  r.busy = false;
  r.node = null;
  r.root.querySelector(".tour-card").classList.remove("busy");
  const total = stepsOf(r.tour);
  const before = r.tour.sections.slice(0, r.si).reduce((n, s) => n + s.steps.length, 0) + r.k;
  const lastStep = r.k === sec.steps.length - 1, lastSec = r.si === r.tour.sections.length - 1;
  const nextSec = !lastSec && r.tour.sections[r.si + 1];
  const [title, body] = pick(step);
  const away = !r.live && step.t;
  r.root.querySelector(".tour-card").innerHTML = `
    <header class="tour-top">
      <span class="tour-sec">${icon(sec.icon || "info", 15)}<span>${esc(L(["Sección", "Section"]))} ${r.si + 1}/${r.tour.sections.length} · <b>${esc(pick(sec)[0])}</b></span></span>
      <button type="button" class="icon-btn" data-tour="close" title="${esc(L(["Salir del tutorial", "Leave the tutorial"]))}" aria-label="${esc(L(["Salir del tutorial", "Leave the tutorial"]))}">${icon("close", 16)}</button>
    </header>
    <div class="tour-bar" aria-hidden="true"><i style="width:${Math.round((before + 1) / total * 100)}%"></i></div>
    <h3>${esc(title)}</h3>
    <div class="tour-body">${fmt(body)}</div>
    ${lastStep && nextSec ? `<p class="tour-then">${esc(L(["A continuación:", "Up next:"]))} <b>${esc(pick(nextSec)[0])}</b></p>` : ""}
    ${away ? `<p class="tour-away">${icon("info", 14)}<span>${esc(L([`Esto está en ${r.tour.where[0]}: aquí solo se explica.`, `This lives on ${r.tour.where[1]}: here it is only explained.`]))}</span></p>` : ""}
    <footer class="tour-foot">
      <button type="button" class="btn sm" data-tour="index">${icon("book", 14)}<span>${esc(L(["Índice", "Index"]))}</span></button>
      <span class="tour-count tnum">${r.k + 1} / ${sec.steps.length}</span>
      <span class="spacer"></span>
      <button type="button" class="btn sm" data-tour="prev" ${r.si === 0 && r.k === 0 ? "disabled" : ""}>${esc(L(["Atrás", "Back"]))}</button>
      <button type="button" class="btn sm primary" data-tour="next">${esc(lastStep && lastSec ? L(["Terminar", "Finish"]) : L(["Siguiente", "Next"]))}</button>
    </footer>
    ${!lastStep && !lastSec ? `<button type="button" class="tour-skip" data-tour="skip">${esc(L(["Saltar a la siguiente sección", "Skip to the next section"]))} ›</button>` : ""}`;
  place(true);
  r.root.querySelector('[data-tour="next"]').focus({ preventScroll: true });
}

/* Coloca el foco sobre el control y la tarjeta a su lado, sin taparlo */
function place(first = false) {
  const r = run;
  if (!r) return;
  const sec = r.tour.sections[r.si], step = sec.steps[r.k];
  const spot = r.root.querySelector(".tour-spot"), card = r.root.querySelector(".tour-card");
  let node = r.live ? findTarget(step.t) : null;
  if (node && first) {
    node.scrollIntoView({ block: "nearest", inline: "nearest" });
    /* Que no quede debajo de la cabecera fija */
    const bar = document.querySelector(".topbar");
    const top = bar && !node.closest(".topbar, .modal-back, .builder-back, .tome-back") ? bar.getBoundingClientRect().bottom : 0;
    const b = node.getBoundingClientRect();
    if (b.top < top + 8 || b.bottom > innerHeight - 20) node.scrollIntoView({ block: "center", inline: "nearest" });
  }
  r.node = node;
  r.root.classList.toggle("free", !node);
  card.style.width = "";
  const W = innerWidth, H = innerHeight, gap = 14, pad = 10;
  let cw = card.offsetWidth, ch = card.offsetHeight;
  if (!node) {
    spot.classList.add("hidden");
    card.style.left = Math.max(pad, (W - cw) / 2) + "px";
    card.style.top = Math.max(pad, (H - ch) / 2) + "px";
    card.dataset.side = "center";
    return;
  }
  const b = node.getBoundingClientRect(), m = 6;
  const box = { left: Math.max(2, b.left - m), top: Math.max(2, b.top - m), right: Math.min(W - 2, b.right + m), bottom: Math.min(H - 2, b.bottom + m) };
  spot.classList.remove("hidden");
  Object.assign(spot.style, { left: box.left + "px", top: box.top + "px", width: box.right - box.left + "px", height: box.bottom - box.top + "px" });
  /* En el móvil, la tarjeta va arriba o abajo de la pantalla, en el lado que
     deja ver el control */
  if (W < 700) {
    const below = (box.top + box.bottom) / 2 < H / 2;
    card.style.left = pad + "px";
    card.style.top = (below ? Math.min(H - ch - pad, Math.max(box.bottom + gap, H - ch - pad)) : pad) + "px";
    card.dataset.side = below ? "bottom" : "top";
    return;
  }
  const clampX = x => Math.min(W - cw - pad, Math.max(pad, x));
  const clampY = y => Math.min(H - ch - pad, Math.max(pad, y));
  const cx = (box.left + box.right) / 2 - cw / 2, cy = (box.top + box.bottom) / 2 - ch / 2;
  const options = [
    ["bottom", H - box.bottom - gap >= ch + pad, clampX(cx), box.bottom + gap],
    ["top", box.top - gap >= ch + pad, clampX(cx), box.top - gap - ch],
    ["right", W - box.right - gap >= cw + pad, box.right + gap, clampY(cy)],
    ["left", box.left - gap >= cw + pad, box.left - gap - cw, clampY(cy)]
  ];
  let found = options.find(o => o[1]);
  /* Un control grande (una ventana entera): la tarjeta se estrecha para
     caber a su lado; si tampoco cabe, va a la esquina de abajo */
  if (!found) {
    const roomL = box.left - gap - pad, roomR = W - box.right - gap - pad;
    const room = Math.max(roomL, roomR);
    if (room >= 270) {
      card.style.width = Math.min(cw, room) + "px";
      cw = card.offsetWidth; ch = card.offsetHeight;
      found = roomR >= roomL ? ["right", true, box.right + gap, clampY(cy)] : ["left", true, box.left - gap - cw, clampY(cy)];
      found[3] = Math.min(H - card.offsetHeight - pad, Math.max(pad, (box.top + box.bottom) / 2 - card.offsetHeight / 2));
    } else found = ["over", true, W - cw - pad, H - ch - pad];
  }
  const [side, , x, y] = found;
  card.style.left = x + "px";
  card.style.top = y + "px";
  card.dataset.side = side;
}

/* ---------- El índice ---------- */
const fold = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function openTourIndex(prefer = null) {
  const order = ["dm", "player", "screen", "gate"];
  const mine = TOURS.find(t => t.role === here);
  let current = (prefer && tourOf(prefer)) || mine || TOURS[0];
  const tabs = order.map(tourOf).filter(Boolean);
  const body = el(`<div class="tour-index" data-keep>
    <div class="tour-tabs" role="tablist">${tabs.map(t => `<button type="button" role="tab" data-tt="${t.id}">${icon(t.icon, 16)}<span>${esc(L(t.label))}</span></button>`).join("")}</div>
    <div class="tour-head"></div>
    <label class="tour-find">${icon("search", 16)}<input type="search" autocomplete="off"></label>
    <div class="tour-list"></div>
  </div>`);
  const input = body.querySelector("input");
  input.placeholder = L(["Busca un control: «niebla», «susurrar», «iniciativa»…", "Find a control: “fog”, “whisper”, “initiative”…"]);
  input.setAttribute("aria-label", L(["Buscar en el tutorial", "Search the tutorial"]));
  const m = modal({ title: L(["Tutorial", "Tutorial"]), body, wide: true, actions: [{ label: L(["Cerrar", "Close"]) }] });
  m.body.closest(".modal-back").classList.add("tour-host");

  const paint = () => {
    body.querySelectorAll("[data-tt]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tt === current.id)));
    const done = doneOf(current.id);
    const at = String(memo("at." + current.id) || "").split(":").map(Number);
    const resume = at.length === 2 && (at[0] || at[1]) && current.sections[at[0]] ? at : null;
    const live = current.role === here;
    body.querySelector(".tour-head").innerHTML = `
      <p class="tour-intro">${esc(L(current.intro))}</p>
      ${live ? "" : `<p class="tour-away">${icon("info", 14)}<span>${esc(L(["Este recorrido es de otra pantalla: se lee entero, pero sin señalar los controles.", "This tour belongs to another screen: you can read it all, but the controls are not pointed at."]))}</span></p>`}
      <div class="tour-go">
        <button type="button" class="btn primary" data-start="0:0">${icon("play", 16)}<span>${esc(L(["Empezar desde el principio", "Start from the beginning"]))}</span></button>
        ${resume ? `<button type="button" class="btn" data-start="${resume.join(":")}">${esc(L(["Seguir por", "Continue at"]))} «${esc(pick(current.sections[resume[0]])[0])}»</button>` : ""}
        <span class="tour-meta">${current.sections.length} ${esc(L(["secciones", "sections"]))} · ${stepsOf(current)} ${esc(L(["pasos", "steps"]))} · ${done.size}/${current.sections.length} ${esc(L(["vistas", "seen"]))}</span>
      </div>`;
    const q = fold(input.value.trim());
    if (q.length > 1) return paintHits(q);
    body.querySelector(".tour-list").innerHTML = `<ol class="tour-secs">${current.sections.map((s, i) => `
      <li><button type="button" class="tour-sec-card ${done.has(s.id) ? "done" : ""}" data-start="${i}:0">
        <span class="tour-n">${done.has(s.id) ? icon("check", 14) : i + 1}</span>
        <span class="tour-ico">${icon(s.icon || "info", 18)}</span>
        <span class="tour-txt"><b>${esc(pick(s)[0])}</b><small>${esc(pick(s)[1])}</small></span>
        <span class="tour-steps tnum">${s.steps.length}</span>
      </button></li>`).join("")}</ol>`;
  };
  const paintHits = q => {
    const words = q.split(/\s+/).filter(Boolean);
    const hits = [];
    for (const t of tabs) t.sections.forEach((s, si) => s.steps.forEach((st, k) => {
      const [title, text] = pick(st);
      const hay = fold(`${pick(s)[0]} ${title} ${text}`);
      if (words.every(w => hay.includes(w))) hits.push({ t, si, k, s, title, text, score: words.filter(w => fold(title).includes(w)).length + (t.id === current.id ? 0.5 : 0) });
    }));
    hits.sort((a, b) => b.score - a.score);
    body.querySelector(".tour-list").innerHTML = hits.length ? `<ol class="tour-hits">${hits.slice(0, 40).map(h => `<li><button type="button" data-hit="${h.t.id}|${h.si}:${h.k}">
        <span class="tour-hit-where">${icon(h.t.icon, 13)}<span>${esc(L(h.t.label))} › ${esc(pick(h.s)[0])}</span></span>
        <b>${esc(h.title)}</b><small>${esc(h.text.replace(/\*\*|\[\[|\]\]/g, "").replace(/\n- /g, " · ").slice(0, 150))}…</small></button></li>`).join("")}</ol>`
      : `<p class="prose">${esc(L(["No aparece en el tutorial. Prueba con otra palabra.", "Not in the tutorial. Try another word."]))}</p>`;
  };
  body.addEventListener("click", e => {
    const tt = e.target.closest("[data-tt]");
    if (tt) { current = tourOf(tt.dataset.tt); input.value = ""; return paint(); }
    const st = e.target.closest("[data-start]");
    if (st) { const [si, k] = st.dataset.start.split(":").map(Number); m.close(); return setTimeout(() => startTour(current.id, { si, k }), 160); }
    const hit = e.target.closest("[data-hit]");
    if (hit) { const [id, at] = hit.dataset.hit.split("|"); const [si, k] = at.split(":").map(Number); m.close(); return setTimeout(() => startTour(id, { si, k }), 160); }
  });
  input.addEventListener("input", paint);
  paint();
  return m;
}

/* ---------- El botón de ayuda y la invitación de la primera vez ---------- */
export function tourButton(role, { label = false } = {}) {
  setTourRole(role);
  const b = el(`<button type="button" class="${label ? "btn sm" : "icon-btn"} tour-btn" data-keep>${icon("help", label ? 16 : 18)}${label ? `<span>${esc(L(["Tutorial", "Tutorial"]))}</span>` : ""}</button>`);
  b.title = L(["Tutorial y ayuda", "Tutorial and help"]);
  b.setAttribute("aria-label", b.title);
  b.addEventListener("click", () => openTourIndex());
  return b;
}

/* La primera vez en cada pantalla se ofrece el recorrido, sin tapar nada:
   un globo pequeño junto al botón de ayuda, que se va solo */
export function inviteTour(role, anchor) {
  setTourRole(role);
  const tour = TOURS.find(t => t.role === role);
  if (!tour || memo("invited." + role)) return null;
  const note = el(`<div class="tour-invite" role="status" data-keep>
    <b>${icon("help", 16)}<span>${esc(L(["¿Primera vez en Mesa?", "First time in Mesa?"]))}</span></b>
    <p>${esc(L(tour.invite))}</p>
    <div class="tour-invite-acts">
      <button type="button" class="btn sm primary" data-inv="go">${esc(L(["Empezar el tour", "Start the tour"]))}</button>
      <button type="button" class="btn sm" data-inv="index">${esc(L(["Ver secciones", "See sections"]))}</button>
      <button type="button" class="btn sm ghost" data-inv="no">${esc(L(["Ahora no", "Not now"]))}</button>
    </div></div>`);
  document.body.appendChild(note);
  const at = () => {
    const w = note.offsetWidth;
    if (!anchor || !anchor.isConnected) { note.style.left = Math.max(10, innerWidth - w - 16) + "px"; note.style.top = "70px"; return; }
    const r = anchor.getBoundingClientRect(), mid = (r.left + r.right) / 2;
    const left = Math.min(innerWidth - w - 10, Math.max(10, mid - w + 28));
    note.style.left = left + "px";
    note.style.top = r.bottom + 10 + "px";
    note.style.setProperty("--arrow", Math.min(w - 22, Math.max(10, mid - left - 6)) + "px");
  };
  at();
  addEventListener("resize", at);
  /* Se va si se elige algo o en cuanto se empieza a usar la pantalla (y ya
     no vuelve), o si pasa medio minuto sin tocar nada (y vuelve la próxima
     vez). El botón de ayuda sigue ahí siempre. */
  const away = e => { if (!note.contains(e.target)) bye(); };
  const bye = (seen = true) => {
    if (seen) memo("invited." + role, "1");
    removeEventListener("resize", at);
    document.removeEventListener("pointerdown", away, true);
    clearTimeout(timer);
    note.classList.add("out");
    setTimeout(() => note.remove(), 250);
  };
  const timer = setTimeout(() => bye(false), 30000);
  document.addEventListener("pointerdown", away, true);
  note.addEventListener("click", e => {
    const b = e.target.closest("[data-inv]");
    if (!b) return;
    bye();
    if (b.dataset.inv === "go") startTour(tour.id);
    if (b.dataset.inv === "index") openTourIndex(tour.id);
  });
  return note;
}
