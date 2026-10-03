/* La pantalla que ve la party: la tele de la mesa o el proyector.
   Solo enseña lo que el DM quiere enseñar, y no tiene ningún control con el
   que alguien pueda descuadrarla al pasar por delante. */

import { $, esc, pct, hpTone, initials, imgURL, hpBar, tweenBars, reducedMotion } from "./util.js";
import { store, onState, onStatus, leave } from "./net.js";
import { conditionName } from "./schema.js";
import { MapView } from "./map.js";
import { icon } from "./icons.js";
import { langPicker } from "./i18n.js";

let mapView = null;
let lastRollId = null;

const doc = () => store.doc;

export function mountScreen(root) {
  document.body.classList.add("screen");
  /* Una sola rejilla para toda la tele. Fuera de combate: el mapa y la party
     debajo. En combate: la party pegada a la izquierda, los enemigos pegados a
     la derecha y el mapa en medio, con todo el alto que sobra. Quien tiene el
     turno va arriba, en una franja, en vez de comerse el centro de la pantalla. */
  root.innerHTML = `
    <div class="stage" id="stage">
      <div class="screen-tools">
        <span class="dot" id="sdot" title="Conexión"></span>
        <span id="stitle"></span>
        <span class="spacer"></span>
        <span id="slang"></span>
        <button class="icon-btn" id="sfull" title="Pantalla completa">${icon("screen")}</button>
        <button class="icon-btn" id="sout" title="Salir de la pantalla">${icon("exit")}</button>
      </div>
      <div class="turnbar hidden" id="turnbar"></div>
      <div class="last-roll" id="roll"></div>
      <div class="init-strip" id="initStrip"></div>
      <aside class="side heroes"><h3 id="sideHeroesTitle">La party</h3><div class="side-list" id="roster"></div></aside>
      <div class="board-wrap"><div class="board"><canvas id="scanvas"></canvas></div></div>
      <aside class="side foes"><h3>Enemigos</h3><div class="side-list" id="foes"></div></aside>
      <div class="handout hidden" id="handout"><img alt=""><span></span></div>
    </div>`;

  mapView = new MapView($("#scanvas", root), { mode: "party" });
  onState(render);
  onStatus(ok => $("#sdot", root).classList.toggle("off", !ok));
  $("#slang", root).appendChild(langPicker());
  $("#sout", root).addEventListener("click", leave);
  $("#sfull", root).addEventListener("click", fullscreen);
  render();

  document.addEventListener("dblclick", e => { if (!e.target.closest("button")) fullscreen(); });
}

function fullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
}

let lastTurnId = null;
let lastRound = null;

function render() {
  if (!doc()) return;
  const t = $("#stitle");
  if (t) t.textContent = doc().session.title || "";
  const { session, chars, maps } = doc();
  const combat = session.combat;
  const order = combat.on ? combat.order.map(id => chars.find(c => c.id === id)).filter(Boolean) : [];
  const now = order[combat.index];
  const next = order.length ? order[(combat.index + 1) % order.length] : null;

  const heroes = chars.filter(c => c.kind === "pc");
  const foes = chars.filter(c => c.kind === "monster");
  const fighting = new Set(order.map(c => c.id));
  const stage = $("#stage");
  /* Al empezar o acabar el combate las cartas cambian de sitio (de la franja
     de abajo a la columna de la izquierda): se apunta dónde estaban para que
     viajen hasta el nuevo en vez de aparecer de golpe. */
  const switching = stage.classList.contains("fighting") !== combat.on;
  const before = switching ? cardRects(stage) : null;
  stage.classList.toggle("fighting", combat.on);
  stage.classList.toggle("no-foes", combat.on && !foes.length);

  /* Quien tiene el turno: una franja arriba, no una carta en mitad de la
     pantalla. Solo entra con animación cuando cambia de verdad el turno. */
  const bar = $("#turnbar");
  bar.classList.toggle("hidden", !combat.on || !now);
  const turnKey = now ? now.id + ":" + combat.round : null;
  if (combat.on && now) {
    bar.innerHTML = turnBand(now, next, session, combat);
    if (turnKey !== lastTurnId) {
      bar.classList.remove("enter");
      void bar.offsetWidth;
      bar.classList.add("enter");
    }
  }
  lastTurnId = turnKey;
  if (combat.on && combat.round !== lastRound && lastRound !== null) {
    bar.classList.remove("new-round");
    void bar.offsetWidth;
    bar.classList.add("new-round");
  }
  lastRound = combat.on ? combat.round : null;

  /* Última tirada, para que se vea desde lejos. Salta solo cuando es nueva. */
  const rolls = doc().log.filter(e => e.kind === "roll");
  const last = rolls[rolls.length - 1];
  const rollBox = $("#roll");
  rollBox.classList.toggle("hidden", !last);
  rollBox.innerHTML = last
    ? `<small>${esc(last.actor)} · ${esc(last.label || last.formula)}</small>
       <b class="${last.crit ? "crit" : last.fumble ? "fumble" : ""}">${last.total}</b>`
    : "";
  if (last && last.id !== lastRollId) {
    if (lastRollId !== null) {
      rollBox.classList.remove("pop");
      void rollBox.offsetWidth;
      rollBox.classList.add("pop");
    }
    lastRollId = last.id;
  }

  const map = maps[0];
  const wrap = $(".board-wrap");
  if (map) {
    mapView.set({ map, chars, session, you: null });
    /* Con el plano entero a la vista, el hueco toma la forma del mapa: así no
       quedan franjas negras ni arriba ni a los lados. Siguiendo a alguien, el
       hueco manda y el encuadre se adapta. */
    const board = $(".board");
    board.style.aspectRatio = map.camera === "follow" ? "" : `${map.cols} / ${map.rows}`;
    board.classList.toggle("free", map.camera === "follow");
  }
  wrap.classList.toggle("hidden", !map);

  /* Toda la iniciativa a la vista, que es lo que la mesa mira desde lejos */
  const strip = $("#initStrip");
  strip.classList.toggle("hidden", !combat.on || !order.length);
  strip.innerHTML = order.map((x, i) => `
    <span class="turn ${i === combat.index ? "now" : ""} ${x.hp <= 0 ? "down" : ""} ${x.kind === "pc" ? "pc" : "foe"}">
      <i style="background:${esc(x.color)}"></i>${esc(x.name)}
      ${x.kind === "pc" || !x.wound ? "" : `<small>${esc(x.wound)}</small>`}
    </span>`).join("");
  const nowNode = strip.querySelector(".turn.now");
  if (nowNode && strip.scrollWidth > strip.clientWidth) {
    strip.scrollTo({ left: nowNode.offsetLeft - strip.clientWidth / 2 + nowNode.offsetWidth / 2, behavior: "smooth" });
  }

  /* Lo que el DM enseña a la mesa */
  const hand = $("#handout");
  const hid = session.handoutId;
  hand.classList.toggle("hidden", !hid);
  if (hid && hand.querySelector("img").dataset.id !== hid) {
    hand.querySelector("img").dataset.id = hid;
    hand.querySelector("img").src = imgURL(hid);
    hand.querySelector("span").textContent = session.handoutText || "";
  }

  $("#roster").innerHTML = heroes.map(c => whoCard(c, session, {
    inTurn: now && now.id === c.id, fighting: !combat.on || fighting.has(c.id)
  })).join("");

  $("#foes").innerHTML = foes.length
    ? foes.map(c => whoCard(c, session, {
        inTurn: now && now.id === c.id, fighting: fighting.has(c.id)
      })).join("")
    : `<p class="state" style="padding:8px">Ninguno a la vista</p>`;

  tweenBars(stage, "screen:");
  fitRails(combat.on, { foes, now, fighting });
  if (before) flip(stage, before);
}

/* Con la mazmorra llena de fichas, la columna no puede pedir que alguien la
   desplace desde el sofá: las cartas se compactan hasta que caben. Si aun
   así no caben, la columna se desliza sola hasta quien tiene el turno. */
function fitRails(fighting, { foes, now, fighting: inFight }) {
  for (const list of [$("#roster"), $("#foes")]) {
    list.classList.remove("dense", "tiny", "grouped");
    if (!fighting) continue;
    if (list.scrollHeight > list.clientHeight + 1) list.classList.add("dense");
    if (list.scrollHeight > list.clientHeight + 1) list.classList.add("tiny");
    /* Una horda no cabe carta a carta: se agrupa por tipo («Goblin ×12»),
       con un punto por cada uno según cómo está. */
    if (list.id === "foes" && list.scrollHeight > list.clientHeight + 1) {
      list.classList.remove("dense", "tiny");
      list.classList.add("grouped");
      list.innerHTML = groupFoes(foes, now, inFight);
    }
    const turn = list.querySelector(".is-turn");
    if (turn && list.scrollHeight > list.clientHeight + 1) {
      list.scrollTo({ top: turn.offsetTop - list.clientHeight / 2 + turn.offsetHeight / 2, behavior: "smooth" });
    }
  }
}

function groupFoes(foes, now, fighting) {
  const groups = new Map();
  for (const c of foes) {
    const key = c.name.replace(/\s*\d+$/, "") || c.name;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  return [...groups].map(([name, list]) => {
    const up = list.filter(c => c.hp > 0).length;
    const first = list[0];
    const turn = now && list.some(c => c.id === now.id);
    const active = list.some(c => fighting.has(c.id));
    return `<div class="who-card group ${turn ? "is-turn" : ""} ${active ? "" : "aside"} ${up ? "" : "down"}" style="--tone:${esc(first.color)}">
      <div class="who-top">
        ${first.avatarId ? `<img class="avatar" src="${imgURL(first.avatarId)}" alt="">`
          : `<div class="avatar" style="--tone:${esc(first.color)}">${initials(name)}</div>`}
        <div class="who-id">
          <b>${esc(name)} <span class="count">×${list.length}</span></b>
          <span class="state">${turn ? esc(now.name) + " · " : ""}${up} en pie</span>
        </div>
      </div>
      <div class="dots">${list.map(c => {
        const p = c.hpPct !== undefined ? c.hpPct : (c.hp > 0 ? 100 : 0);
        return `<i class="${c.hp <= 0 ? "out" : hpTone(p)} ${now && now.id === c.id ? "now" : ""}" title="${esc(c.name)}"></i>`;
      }).join("")}</div>
    </div>`;
  }).join("");
}

function cardRects(root) {
  const out = new Map();
  root.querySelectorAll(".who-card[data-id]").forEach(n => out.set(n.dataset.id, n.getBoundingClientRect()));
  return out;
}

function flip(root, before) {
  if (reducedMotion() || document.hidden) return;
  root.querySelectorAll(".who-card[data-id]").forEach(n => {
    const a = before.get(n.dataset.id);
    if (!a) return;
    const b = n.getBoundingClientRect();
    if (!b.width) return;
    const dx = a.left - b.left, dy = a.top - b.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    n.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${a.width / b.width})`, transformOrigin: "top left" },
      { transform: "none", transformOrigin: "top left" }
    ], { duration: 520, easing: "cubic-bezier(.22, 1, .36, 1)" });
  });
}

/* Una carta de personaje o de criatura. En combate se queda en lo justo
   (cara, nombre, vida, estados): lo que manda es el mapa. */
function whoCard(c, session, { inTurn = false, fighting = true } = {}) {
  const monster = c.kind === "monster";
  const p = c.hpPct !== undefined ? c.hpPct : monster ? null : pct(c);
  const exact = monster ? false : session.showPartyHP;
  const sub = monster ? (c.memory ? "donde le visteis" : c.sizeType || "criatura") : [c.className, c.race].filter(Boolean).join(" · ");
  return `<div class="who-card ${c.hp <= 0 ? "down" : ""} ${inTurn ? "is-turn" : ""} ${fighting ? "" : "aside"} ${c.memory ? "memory" : ""}"
      style="--tone:${esc(c.color)}" data-flash data-id="${esc(c.id)}">
    <div class="who-top">
      ${c.avatarId ? `<img class="avatar" src="${imgURL(c.avatarId)}" alt="" style="--tone:${esc(c.color)}">`
        : `<div class="avatar" style="--tone:${esc(c.color)}">${initials(c.name)}</div>`}
      <div class="who-id">
        <b>${esc(c.name)}</b>
        <span class="state">${esc(sub)}</span>
      </div>
      ${monster ? "" : `<span class="ac" title="Clase de armadura">${c.ac}</span>`}
    </div>
    ${p !== null ? hpBar(c.id, p) : ""}
    ${exact || (monster && c.wound) || c.conditions.length ? `<div class="state row-line">
      ${exact ? `<span class="tnum">${c.hp}/${c.maxHp} PV</span>` : ""}
      ${monster && c.wound ? `<span>${esc(c.wound)}</span>` : ""}
      ${c.conditions.length ? `<span class="conds">${c.conditions.map(x => `<i>${esc(conditionName(x))}</i>`).join("")}</span>` : ""}
    </div>` : ""}
  </div>`;
}

/* La franja del turno: quién actúa, con lo poco que hace falta saber */
function turnBand(c, next, session, combat) {
  const monster = c.kind === "monster";
  const used = c.used || {};
  const left = Math.max(0, (c.speed || 30) - (used.move || 0));
  const p = c.hpPct !== undefined ? c.hpPct : monster ? null : pct(c);
  return `<div class="tb-who" style="--tone:${esc(c.color)}">
      ${c.avatarId ? `<img class="avatar" src="${imgURL(c.avatarId)}" alt="" style="--tone:${esc(c.color)}">`
        : `<div class="avatar" style="--tone:${esc(c.color)}">${initials(c.name)}</div>`}
      <div class="tb-name">
        <small>${"Ronda " + combat.round + " · le toca a"}</small>
        <b>${esc(c.name)}</b>
        ${p !== null ? hpBar("turn:" + c.id, p) : ""}
      </div>
    </div>
    <div class="tb-stats">
      ${monster ? "" : `<span><i>${c.ac}</i>CA</span>`}
      <span><i>${left}</i>pies</span>
      ${monster ? "" : `<span><i>${session.showPartyHP ? c.hp : Math.round(p) + "%"}</i>vida</span>`}
    </div>
    <div class="tb-uses">
      <span class="${used.action ? "spent" : ""}">Acción</span>
      <span class="${used.bonus ? "spent" : ""}">Adicional</span>
      <span class="${used.reaction ? "spent" : ""}">Reacción</span>
    </div>
    ${c.conditions.length || c.concentration ? `<div class="tb-conds">
      ${c.conditions.map(x => `<i>${esc(conditionName(x))}</i>`).join("")}
      ${c.concentration ? `<span class="state">Concentrado en ${esc(c.concentration)}</span>` : ""}
    </div>` : ""}
    <span class="spacer"></span>
    ${next && next.id !== c.id ? `<div class="tb-next"><small>después</small><b>${esc(next.name)}</b></div>` : ""}`;
}
