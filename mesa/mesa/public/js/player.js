/* Vista del jugador. Manda su ficha y poco más: lo que el DM no enseña, no
   llega ni siquiera al navegador. */

import { afterMove } from "./portals.js";
import { voiceWidget } from "./voice.js";
import { $, el, on, esc, lines, sign, pct, hpTone, hpBar, tweenBars, initials, imgURL, toast, modal, clamp } from "./util.js";
import { ABILITIES, SKILLS, CONDITIONS, conditionName, modOf } from "./schema.js";
import { store, onState, onStatus, onPresence, op, patchChar, leave } from "./net.js";
import { dicePanel, renderLog, throwDice, tellTable } from "./dice-panel.js";
import { openAttacks, areaAttacks, slotsLeft, shapeLabel } from "./attacks.js";
import { openCharEditor, openConditions } from "./char-editor.js";
import { openBuilder } from "./creador.js";
import { MapView } from "./map.js";
import { openSpellbook } from "./spellbook.js";
import { sheetTabsHTML, handleSheetAct } from "./sheet.js";
import { ambientToggle } from "./ambient.js";
import { langPicker } from "./i18n.js";
import { icon, withIcon } from "./icons.js";

let tab = "ficha";
let lastArea = null;      // la última área de conjuro colocada en el mapa
let afterArea = null;     // qué hacer cuando se coloque

/* Lo que necesita la ventana de conjuros desde la vista del jugador */
function spellCtx() {
  return {
    getChar: id => doc().chars.find(x => x.id === id),
    targets: () => doc().chars.filter(x => x.hp > 0 || x.kind === "pc"),
    preselect: sp => {
      if (sp.shape && lastArea && mapView) return mapView.covered(lastArea).map(x => x.id);
      return sp.mode === "heal" && me() ? [me().id] : [];
    },
    previewArea: (sp, reopen) => {
      const c = me();
      tab = "mapa";
      document.querySelectorAll("[data-ptab]").forEach(x => x.setAttribute("aria-selected", String(x.dataset.ptab === "mapa")));
      render();
      if (!mapView) return toast("El DM no está enseñando ningún mapa", "bad");
      mapView.tool = "shape";
      mapView.pinging = false;
      mapView.pending = { kind: sp.shape, size: sp.size, width: sp.width, angle: 0, x: 0, y: 0,
        color: (c && c.color) || "#8878d8", label: sp.name, local: true };
      afterArea = reopen;
      toast("Coloca el área: pulsa para dejarla y arrastra para girarla");
    }
  };
}
let lastTab = null;
let mapView = null;
let lastTurnId = null;
let seenHandout = "";
let seenLog = 0;

const doc = () => store.doc;
const me = () => doc().chars.find(c => c.id === store.session.charId) || null;

export function mountPlayer(root) {
  root.innerHTML = `
    <div class="shell">
      <div class="banner hidden" id="offline">Se ha perdido la conexión. Reintentando…</div>
      <header class="topbar player-top">
        <div class="brand"><h1>Mesa</h1></div>
        <span class="spacer"></span>
        <div class="who"><span class="dot" id="dot"></span><span class="pill" id="whoami"></span></div>
        <span id="voiceSlot"></span>
        <span id="ambientSlot"></span>
        <span id="plang"></span>
        <button class="icon-btn" id="leaveBtn" title="Salir de la partida" aria-label="Salir de la partida">${icon("exit")}</button>
      </header>
      <div class="turn-flash hidden" id="turnFlash"></div>
      <div class="asks" id="asks"></div>
      <div class="player-shell" id="pane"></div>
      <nav class="tabbar" role="tablist">
        <button role="tab" data-ptab="ficha" aria-selected="true"><b>${icon("shield", 20)}</b>Mi ficha</button>
        <button role="tab" data-ptab="party" aria-selected="false"><b>${icon("users", 20)}</b>Party</button>
        <button role="tab" data-ptab="mapa" aria-selected="false"><b>${icon("map", 20)}</b>Mapa</button>
        <button role="tab" data-ptab="dados" aria-selected="false"><b>${icon("dice", 20)}</b>Dados y charla<i class="badge hidden" id="unread"></i></button>
      </nav>
    </div>`;

  on(root, "click", "[data-ptab]", (e, b) => {
    tab = b.dataset.ptab;
    root.querySelectorAll("[data-ptab]").forEach(x => x.setAttribute("aria-selected", String(x === b)));
    render();
  });
  $("#plang", root).appendChild(langPicker());
  $("#voiceSlot", root).replaceWith(voiceWidget());
  $("#leaveBtn", root).addEventListener("click", () => leave());
  $("#ambientSlot", root).replaceWith(ambientToggle("player"));
  onStatus(ok => {
    $("#offline", root).classList.toggle("hidden", ok);
    $("#dot", root).classList.toggle("off", !ok);
  });
  onState(render);
  onPresence(() => { if (doc() && !me()) render(); });
  bindActions(root);
  render();
}

let hadChar = null;
function render() {
  if (!doc()) return;
  /* Si te quedas sin personaje (el DM lo libera, o lo recuperas desde otro
     aparato), se dice en vez de cambiar la pantalla sin explicación. */
  const nowChar = store.session.charId && doc().chars.find(c => c.id === store.session.charId);
  if (hadChar && !nowChar) toast(`Ya no llevas a ${hadChar}. Elige personaje para seguir.`, "bad");
  hadChar = nowChar ? nowChar.name : null;
  $("#whoami").textContent = store.session.name;
  const pane = $("#pane");
  const mine = me();
  noticeTurn(mine);
  noticeChat();
  noticeHandout();
  renderAsks(mine);

  const switched = tab !== lastTab;
  if (switched) {                 // cada pestaña construye lo suyo desde cero
    lastTab = tab;
    pane.classList.remove("view-in"); void pane.offsetWidth; pane.classList.add("view-in");
    pane.innerHTML = "";
    delete pane.dataset.map;
    delete pane.dataset.dice;
    mapView = null;
  }

  if (!mine) return renderPicker(pane);
  if (tab === "ficha") renderSheet(pane, mine);
  else if (tab === "party") renderParty(pane);
  else if (tab === "mapa") renderMap(pane, mine);
  else renderDice(pane);
  tweenBars(pane, "player:" + tab + ":", switched);
}

/* Cuando llega tu turno se nota: aviso arriba y un toque en el móvil. */
function noticeTurn(mine) {
  const flash = $("#turnFlash");
  const combat = doc().session.combat;
  const nowId = combat.on && combat.order.length ? combat.order[combat.index] : null;
  const now = nowId ? doc().chars.find(c => c.id === nowId) : null;
  const mineTurn = mine && nowId === mine.id;

  flash.classList.toggle("hidden", !combat.on);
  flash.classList.toggle("yours", !!mineTurn);
  if (combat.on) {
    const next = combat.order.length ? doc().chars.find(c => c.id === combat.order[(combat.index + 1) % combat.order.length]) : null;
    flash.innerHTML = mineTurn
      ? `<b>Es tu turno</b><small>ronda ${combat.round}${mine.used && mine.used.move ? ` · llevas ${mine.used.move} pies` : ""}</small>`
      : `<b>Turno de ${esc(now ? now.name : "—")}</b><small>ronda ${combat.round}${next ? " · después " + esc(next.name) : ""}</small>`;
  }
  if (mineTurn && nowId !== lastTurnId) {
    if (navigator.vibrate) navigator.vibrate([90, 60, 90]);
    toast("Te toca", "good");
  }
  lastTurnId = nowId;
}

/* Un puntito en la pestaña cuando hay mensajes o tiradas sin leer */
function noticeChat() {
  const badge = $("#unread");
  if (!badge) return;
  const n = doc().log.length;
  if (tab === "dados") { seenLog = n; badge.classList.add("hidden"); return; }
  badge.classList.toggle("hidden", n <= seenLog);
}

/* La imagen que el DM enseña a la mesa */
function noticeHandout() {
  const id = doc().session.handoutId;
  if (!id || id === seenHandout) { if (!id) seenHandout = ""; return; }
  seenHandout = id;
  modal({
    title: doc().session.handoutText || "El DM te enseña algo",
    body: `<img src="${imgURL(id)}" alt="" style="width:100%;border-radius:10px">`,
    wide: true,
    actions: [{ label: "Cerrar" }]
  });
}

/* Tiradas que el DM ha pedido */
function renderAsks(mine) {
  const host = $("#asks");
  const list = (doc().session.requests || []).filter(r => mine && r.ids.includes(mine.id));
  host.innerHTML = list.map(r => `<button class="ask" data-ask="${r.id}" data-formula="${esc(r.formula)}" data-label="${esc(r.label)}" data-dc="${r.dc}">
      El DM te pide: <b>${esc(r.label)}</b>${r.dc ? ` · CD ${r.dc}` : ""} <span>tirar</span></button>`).join("");
}

/* ---------- Sin personaje todavía ---------- */
/* Elegir personaje desde dentro: los que lleva alguien conectado salen
   ocupados y no se pueden coger. */
function renderPicker(pane) {
  const pcs = doc().chars.filter(c => c.kind === "pc");
  const heldBy = id => (store.presence.find(p => p.charId === id && p.role === "player" && p.id !== store.session.id) || {}).name;
  pane.innerHTML = `
    <div class="empty picker">
      <span class="empty-ico">${icon("users", 30)}</span>
      <h3>Elige tu personaje</h3>
      <p>Quédate con uno de los que hay en la mesa o hazte el tuyo.</p>
      <div class="pick-list">
        ${pcs.map(c => { const who = heldBy(c.id); return `<button class="pick ${who ? "taken" : ""}" data-claim="${c.id}" ${who ? "disabled" : ""}>
          ${c.avatarId ? `<img class="avatar sm" src="${imgURL(c.avatarId)}" alt="">` : `<span class="avatar sm" style="--tone:${esc(c.color)}">${initials(c.name)}</span>`}
          <span class="pick-text"><b>${esc(c.name)}</b><small>${esc([c.className, "nivel " + c.level].filter(Boolean).join(" · "))}</small></span>
          ${who ? `<span class="pick-tag">${icon("user", 12)}${esc(who)}</span>` : ""}
        </button>`; }).join("")}
      </div>
      <button class="btn primary" data-new>${withIcon("userPlus", "Crear mi personaje")}</button>
    </div>`;
}

/* ---------- Ficha ---------- */
/* La pestaña de abajo de la ficha (acciones, conjuros, equipo, rasgos, notas) */
let sheetTab = "acciones";

function renderSheet(pane, c) {
  const p = pct(c);
  const avatar = c.avatarId
    ? `<img class="avatar" src="${imgURL(c.avatarId)}" alt="" style="--tone:${esc(c.color)}">`
    : `<div class="avatar" style="--tone:${esc(c.color)}">${initials(c.name)}</div>`;
  const abbr = k => ABILITIES.find(a => a[0] === k)[1];
  /* Una fila que se toca para tirar: el punto dice si tiene competencia */
  const rollRow = (name, mod, prof, extra = "") => `<button class="roll-row" data-act="rollMod" data-mod="${mod}" data-label="${esc(name)}">
      <i class="prof ${prof ? "on" : ""}"></i>${extra}<span class="roll-name">${esc(name)}</span><b class="roll-mod tnum">${sign(mod)}</b></button>`;

  pane.innerHTML = `
    <div class="sheet-head" style="--tone:${esc(c.color)}">
      ${avatar}
      <div class="sheet-id">
        <h2>${esc(c.name)}</h2>
        <small>${esc([c.className, c.race, "nivel " + c.level].filter(Boolean).join(" · "))}</small>
      </div>
      <button class="btn sm" data-act="edit" title="Editar ficha">${withIcon("pencil", "Editar", 16)}</button>
    </div>

    <div class="sheet" style="--tone:${esc(c.color)}">
      <div class="quick-stats">
        <div class="qs"><span class="qs-l">Competencia</span><b class="tnum">${sign(c.proficiency)}</b></div>
        <button class="qs" data-act="initiative" title="Tirar iniciativa"><span class="qs-l">Iniciativa</span><b class="tnum">${c.initiative}</b></button>
        <div class="qs ac-shield" title="Clase de armadura"><small>CA</small><b class="tnum">${c.ac}</b></div>
        <div class="qs"><span class="qs-l">Velocidad</span><b class="tnum">${c.speed}</b><small>pies</small></div>
      </div>

      <section class="sheet-box hp-box" data-flash>
        <div class="hp-main">
          <div class="hp-deal">
            <button class="hp-btn heal" data-act="heal">Curar</button>
            <input class="tnum" data-amount type="number" min="0" placeholder="0" inputmode="numeric" aria-label="Cantidad">
            <button class="hp-btn hurt" data-act="damage">Daño</button>
          </div>
          <div class="hp-cols">
            <div class="hp-col"><span>Actuales</span><b class="tnum">${c.hp}</b></div>
            <i class="hp-sep">/</i>
            <div class="hp-col"><span>Máximos</span><b class="tnum">${c.maxHp}</b></div>
            <div class="hp-col temp"><span>Temp.</span><b class="tnum">${c.tempHp || "—"}</b></div>
          </div>
        </div>
        ${hpBar(c.id, p)}
        <div class="pad">
          <button class="hurt" data-act="hp" data-n="-1">−1</button>
          <button class="hurt" data-act="hp" data-n="-5">−5</button>
          <button class="heal" data-act="hp" data-n="1">+1</button>
          <button class="heal" data-act="hp" data-n="5">+5</button>
        </div>
        <h3 class="box-label">Puntos de golpe</h3>
      </section>

      ${c.hp <= 0 ? `<section class="sheet-box deaths-box">
        <div class="deaths">
          <span class="set ok">Éxitos ${[0, 1, 2].map(i => `<button data-act="death" data-kind="ok" data-n="${i + 1}" class="${c.deathOk > i ? "on" : ""}"></button>`).join("")}</span>
          <span class="set bad">Fallos ${[0, 1, 2].map(i => `<button data-act="death" data-kind="fail" data-n="${i + 1}" class="${c.deathFail > i ? "on" : ""}"></button>`).join("")}</span>
        </div>
        <button class="btn danger" data-act="deathRoll">${withIcon("skull", "Salvación de muerte")}</button>
        <h3 class="box-label">Salvaciones de muerte</h3>
      </section>` : ""}

      <section class="sheet-box cond-box">
        <div class="meta">
          ${c.conditions.map(id => `<span class="pill cond" title="${esc((CONDITIONS.find(x => x.id === id) || {}).hint || "")}">${esc(conditionName(id))}</span>`).join("")}
          ${c.exhaustion ? `<span class="pill cond">Agotamiento ${c.exhaustion}</span>` : ""}
          ${c.concentration ? `<span class="pill conc">Concentrado en ${esc(c.concentration)}</span>` : ""}
          ${c.inspiration ? `<span class="pill tag">${icon("star", 12)}Inspiración</span>` : ""}
          ${!c.conditions.length && !c.exhaustion && !c.concentration && !c.inspiration ? '<span class="cond-none">Sin estados</span>' : ""}
        </div>
        <button class="btn sm" data-act="conditions">${withIcon("sparkle", "Estados", 16)}</button>
        <h3 class="box-label">Estados</h3>
      </section>

      <div class="abilities">
        ${ABILITIES.map(([k, l]) => `<button class="abil" data-act="ability" data-k="${k}">
          <span>${l}</span><b class="tnum">${sign(modOf(c[k]))}</b><small class="tnum">${c[k]}</small></button>`).join("")}
      </div>

      <div class="action-grid">
        <button class="btn primary" data-act="attack">${withIcon("sword", "Atacar")}</button>
        <button class="btn" data-act="spells">${withIcon("wand", c.spellbook.length ? `Conjuros (${c.spellbook.length})` : "Conjuros")}</button>
        ${c.hitDice ? `<button class="btn" data-act="hitDie">${withIcon("heartPlus", `Dado de golpe (${Math.max(0, c.level - c.hitDiceUsed)})`)}</button>` : ""}
        ${c.concentration ? `<button class="btn" data-act="conc">${withIcon("sparkle", "Salvación de concentración")}</button>` : ""}
      </div>

      ${c.slots.some(n => n) || c.resources.length ? `<section class="sheet-box">
        ${c.slots.some(n => n) ? `<div class="slots">
          ${c.slots.map((n, i) => n ? `<span class="slot" data-act="slot" data-level="${i}">${i + 1}º
            ${Array.from({ length: n }, (_, j) => `<i class="${j < c.slotsUsed[i] ? "used" : ""}"></i>`).join("")}</span>` : "").join("")}
        </div>` : ""}
        ${c.resources.length ? `<div class="slots">
          ${c.resources.map((r, i) => `<span class="slot" data-act="res" data-res="${i}">${esc(r.name)}
            <b class="tnum">${r.max - r.uses}/${r.max}</b></span>`).join("")}</div>` : ""}
        <h3 class="box-label">Recursos</h3>
      </section>` : ""}

      <div class="sheet-cols">
        <section class="sheet-box roll-box">
          ${ABILITIES.map(([k, l]) => rollRow(l, modOf(c[k]) + (c.saves.includes(k) ? c.proficiency : 0), c.saves.includes(k))).join("")}
          <h3 class="box-label">Salvaciones</h3>
        </section>
        <section class="sheet-box roll-box skills">
          ${SKILLS.map(([id, name, ab]) => rollRow(name, modOf(c[ab]) + (c.skills.includes(id) ? c.proficiency : 0), c.skills.includes(id),
            `<small class="roll-ab">${abbr(ab)}</small>`)).join("")}
          <h3 class="box-label">Habilidades</h3>
        </section>
      </div>

      <section class="sheet-box notes-box">
        ${sheetTabsHTML(c, sheetTab)}
      </section>
    </div>`;
}

/* ---------- La party ---------- */
function renderParty(pane) {
  const mates = doc().chars.filter(c => c.kind === "pc");
  const foes = doc().chars.filter(c => c.kind === "monster");
  const combat = doc().session.combat;
  const order = combat.on ? combat.order.map(id => doc().chars.find(c => c.id === id)).filter(Boolean) : [];

  pane.innerHTML = `
    <div class="party-strip">
      ${mates.map(c => {
        const p = pct(c);
        return `<div class="mate" data-flash style="--tone:${esc(c.color)}">
          ${c.avatarId ? `<img class="avatar" src="${imgURL(c.avatarId)}" alt="" style="--tone:${esc(c.color)}">`
            : `<div class="avatar" style="--tone:${esc(c.color)}">${initials(c.name)}</div>`}
          <div class="info">
            <b>${esc(c.name)}</b>
            <small style="color:var(--dim)"> ${esc(c.className)}${c.claimedBy ? " · " + esc(c.claimedBy) : ""}</small>
            ${hpBar(c.id, p)}
          </div>
          <div style="text-align:right">
            <b class="tnum">${c.hp}</b><small style="color:var(--dim)">/${c.maxHp}</small><br>
            <small style="color:var(--dim)">CA ${c.ac}</small>
          </div>
        </div>`;
      }).join("")}
    </div>
    ${foes.length ? `<div class="section-title"><h2>A la vista</h2><span class="line"></span></div>
      <div class="party-strip">
        ${foes.filter(f => !f.memory).map(foeRow).join("") || '<p class="prose" style="font-size:13px">Ahora mismo no veis a ninguno.</p>'}
      </div>` : ""}
    ${foes.some(f => f.memory) ? `<div class="section-title"><h2>Vistos antes</h2><span class="line"></span></div>
      <div class="party-strip faded">
        ${foes.filter(f => f.memory).map(foeRow).join("")}
      </div>` : ""}`;
}

const foeRow = f => `<div class="mate" style="--tone:${esc(f.color)}">
  ${f.avatarId ? `<img class="avatar" src="${imgURL(f.avatarId)}" alt="" style="--tone:${esc(f.color)}">`
    : `<div class="avatar" style="--tone:${esc(f.color)}">${initials(f.name)}</div>`}
  <div class="info"><b>${esc(f.name)}</b><br>
    <small style="color:var(--dim)">${f.memory ? "donde le visteis" : esc(f.wound || "a la vista")}${
      f.damageTaken ? ` · le habéis hecho ${f.damageTaken} de daño` : ""}</small></div>
</div>`;

/* Elegir uno de tus conjuros de área y verlo sobre el mapa.

   El dibujo se queda en tu pantalla: ni el DM ni los demás lo ven, y no gasta
   nada. Es para mirar a ojo si el cono coge a los tres goblins antes de
   decidirte, sin tener que pedirle al DM que lo mida por ti. */
function pickArea(pane) {
  const c = me();
  const list = c ? areaAttacks(c) : [];
  if (!list.length) {
    return toast("Ninguno de tus ataques tiene área. Ponle una forma en tu ficha.", "bad");
  }
  const body = el(`<div class="atk-list">
    ${list.map((a, i) => {
      const left = slotsLeft(c, a);
      return `<button class="atk" data-area="${i}">
        <b>${esc(a.name)}</b>
        <small>${esc(shapeLabel(a))}${a.damage ? " · " + esc(a.damage) : ""}${a.type ? " " + esc(a.type) : ""}</small>
        ${left !== null ? `<span class="slots-left">${left} de nivel ${a.level}</span>` : ""}
      </button>`;
    }).join("")}
    <p class="prose" style="font-size:12px">Solo lo verás tú. Colócalo donde quieras y decide; para lanzarlo de verdad, usa «Atacar» en tu ficha.</p>
  </div>`);
  const win = modal({ title: "Ver un área sobre el mapa", body, actions: [{ label: "Cerrar" }] });
  on(body, "click", "[data-area]", (e, b) => {
    const a = list[+b.dataset.area];
    mapView.tool = "shape";
    mapView.pinging = false;
    mapView.pending = {
      kind: a.shape, size: a.size, width: a.width, angle: 0, x: 0, y: 0,
      color: c.color || "#8878d8", label: a.name, local: true
    };
    $("#areaClear", pane).classList.remove("hidden");
    win.close();
    toast("Mueve el área y pulsa para dejarla fija");
  });
}

/* ---------- Mapa ---------- */
function renderMap(pane, mine) {
  const map = doc().maps[0];
  if (!map) {
    pane.innerHTML = '<div class="empty"><h3>El DM no está enseñando ningún mapa</h3><p>Cuando lo haga, aparecerá aquí.</p></div>';
    mapView = null;
    return;
  }
  if (!pane.dataset.map || !mapView) {
    pane.innerHTML = `
      <div class="map-bar sm">
        <div class="tool-set" id="ptools">
          <button data-ptool="token" aria-pressed="true">Mover</button>
          <button data-ptool="measure" aria-pressed="false">Medir</button>
          <button data-ptool="ping" aria-pressed="false">Señalar</button>
          <button data-ptool="draw" aria-pressed="false" title="Dibujar sobre el plano: lo ve toda la mesa">${icon("scribble", 15)}Dibujar</button>
          <button data-ptool="drawErase" aria-pressed="false" title="Borrar uno de tus trazos" aria-label="Borrar un trazo">${icon("eraser", 15)}</button>
        </div>
        <button class="btn sm" id="areaBtn">Mis áreas</button>
        <button class="btn sm hidden" id="areaClear">Quitar áreas</button>
        <span class="spacer"></span>
        <button class="btn sm" data-pmap="out">−</button>
        <button class="btn sm" data-pmap="in">+</button>
        <button class="btn sm" data-pmap="fit">Todo</button>
      </div>
      <div class="board"><canvas id="pcanvas"></canvas></div>`;
    pane.dataset.map = "1";
    mapView = new MapView($("#pcanvas", pane), {
      mode: "party",
      onMove: (id, x, y) => {
        if (mapView.tool === "ping") return op("ping", { x, y, mapId: map.id, color: mine.color });
        op("token.move", { id, x, y });
        afterMove(id, x, y);
      },
      onPing: (x, y) => op("ping", { x, y, mapId: map.id, color: mine.color }),
      onDrawing: points => op("drawing.add", { mapId: map.id, drawing: { points, color: mine.color, width: 0.08 } }),
      onDrawingErase: id => op("drawing.remove", { mapId: map.id, id }),
      onLocalShape: shape => {
        const dentro = mapView.covered(shape).map(c => c.name);
        toast(dentro.length ? `${shape.label}: coge a ${dentro.join(", ")}` : `${shape.label}: no coge a nadie`);
        /* Si venía de «Colocar el área» al lanzar un conjuro, se vuelve a la
           ventana con quienes han quedado dentro ya marcados */
        if (afterArea) { lastArea = shape; const go = afterArea; afterArea = null; setTimeout(go, 350); }
      },
      onToken: id => {
        const t = doc().chars.find(c => c.id === id);
        if (!t || !mine || mine.mx === null || t.mx === null) return;
        const pies = Math.max(Math.abs(t.mx - mine.mx), Math.abs(t.my - mine.my)) * (map.feet || 5);
        toast(`${t.name}: a ${pies} pies`);
      }
    });
    mapView.drawColor = mine.color;
    on(pane, "click", "[data-ptool]", (e, b) => {
      mapView.tool = b.dataset.ptool === "ping" ? "token" : b.dataset.ptool;
      mapView.pinging = b.dataset.ptool === "ping";
      pane.querySelectorAll("[data-ptool]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    });
    $("#areaBtn", pane).addEventListener("click", () => pickArea(pane));
    $("#areaClear", pane).addEventListener("click", () => {
      mapView.localShapes = [];
      mapView.pending = null;
      mapView.draw();
      $("#areaClear", pane).classList.add("hidden");
    });

    on(pane, "click", "[data-pmap]", (e, b) => {
      const what = b.dataset.pmap;
      if (what === "in") mapView.setZoom(mapView.zoom * 1.3);
      if (what === "out") mapView.setZoom(mapView.zoom / 1.3);
      if (what === "fit") mapView.setZoom(1);
    });
  }
  /* Si el DM quita el dibujo, desaparecen los botones (y se vuelve a mover) */
  const canDraw = doc().session.allowPlayerDraw !== false;
  pane.querySelectorAll('[data-ptool="draw"], [data-ptool="drawErase"]').forEach(b => b.classList.toggle("hidden", !canDraw));
  if (!canDraw && (mapView.tool === "draw" || mapView.tool === "drawErase")) {
    mapView.tool = "token";
    mapView.stroke = null;
    pane.querySelectorAll("[data-ptool]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.ptool === "token")));
  }
  mapView.set({ map, chars: doc().chars, session: doc().session, you: mine.id });
}

function renderDice(pane) {
  if (!pane.dataset.dice) {
    pane.innerHTML = "";
    const panel = dicePanel({ isDM: false });
    panel.classList.add("open");
    panel.style.position = "static";
    panel.style.height = "min(calc(100vh - 190px), calc(100dvh - 190px))";
    panel.style.transform = "none";
    panel.style.border = "1px solid var(--edge)";
    panel.style.borderRadius = "14px";
    pane.appendChild(panel);
    pane.dataset.dice = "1";
  }
  renderLog($("#log", pane));
}

/* ---------- Acciones ---------- */
function bindActions(root) {
  on(root, "click", "[data-claim]", (e, b) => op("char.claim", { id: b.dataset.claim }));

  on(root, "click", "[data-ask]", (e, b) => {
    const c = me();
    const dc = +b.dataset.dc;
    const r = throwDice(b.dataset.formula, { label: `${c ? c.name : store.session.name} · ${b.dataset.label}` });
    if (r && dc) tellTable(`${c ? c.name : store.session.name}: ${r.total >= dc ? "supera" : "falla"} ${b.dataset.label} (CD ${dc})`);
    op("request.done", { id: b.dataset.ask, charId: c ? c.id : "" });
  });
  on(root, "click", "[data-new]", () => openBuilder({ onManual: () => openCharEditor(null, { isDM: false }) }));

  on(root, "click", "[data-act]", (e, b) => {
    const c = me();
    if (!c) return;
    const amountEl = $("[data-amount]", root);
    const amount = () => Math.max(0, +(amountEl && amountEl.value || 0));
    /* Con el campo vacío, curar y daño van de uno en uno */
    const hpStep = () => amountEl && amountEl.value === "" ? 1 : amount();

    if (handleSheetAct(c, b.dataset.act, b, { spellCtx: spellCtx() })) return;
    switch (b.dataset.act) {
      case "sheetTab": sheetTab = b.dataset.tabId; return render();
      case "edit": return openCharEditor(c, { isDM: false });
      case "hp": {
        const n = +b.dataset.n;
        const hp = Math.max(0, Math.min(c.maxHp, c.hp + n));
        return patchChar(c.id, { hp });
      }
      case "damage": {
        const n = hpStep();
        if (!n) return;
        op("hp.apply", { id: c.id, damage: n });
        amountEl.value = "";
        return;
      }
      case "heal": {
        const n = hpStep();
        if (!n) return;
        op("hp.apply", { id: c.id, heal: n });
        amountEl.value = "";
        return;
      }
      case "attack": {
        const rivals = doc().chars.filter(x => x.id !== c.id && x.hp > 0);
        return openAttacks(c, { targets: rivals });
      }
      case "spells": return openSpellbook(c, spellCtx());
      case "hitDie": {
        const die = (c.hitDice || "").split(/d/i)[1];
        if (!die) return toast("Apunta tus dados de golpe en la ficha (por ejemplo 5d8)", "bad");
        if (c.level - c.hitDiceUsed <= 0) return toast("No te quedan dados de golpe");
        const r = throwDice(`1d${die}` + sign(modOf(c.con)), { label: c.name + " · dado de golpe" });
        if (!r) return;
        op("hp.apply", { id: c.id, heal: Math.max(1, r.total), note: "dado de golpe" });
        return patchChar(c.id, { hitDiceUsed: c.hitDiceUsed + 1 });
      }
      case "conc": {
        const r = throwDice("1d20" + sign(modOf(c.con) + (c.saves.includes("con") ? c.proficiency : 0)),
          { label: `${c.name} · concentración` });
        if (r && r.total < 10) { patchChar(c.id, { concentration: "" }); tellTable(`${c.name} pierde la concentración`); }
        return;
      }
      case "conditions": return openConditions(c);
      case "ability": {
        const k = b.dataset.k;
        return throwDice("1d20" + sign(modOf(c[k])), { label: `${c.name} · ${ABILITIES.find(a => a[0] === k)[1]}` });
      }
      case "initiative": {
        const r = throwDice("1d20" + sign(modOf(c.dex)), { label: c.name + " · iniciativa" });
        if (r) patchChar(c.id, { initiative: r.total });
        return;
      }
      case "rollMod": return throwDice("1d20" + sign(+b.dataset.mod), { label: `${c.name} · ${b.dataset.label}` });
      case "slot": {
        const i = +b.dataset.level;
        const used = c.slotsUsed.slice();
        used[i] = used[i] >= c.slots[i] ? 0 : used[i] + 1;
        return patchChar(c.id, { slotsUsed: used });
      }
      case "res": {
        const i = +b.dataset.res;
        return patchChar(c.id, { resources: c.resources.map((r, j) => j !== i ? r : { ...r, uses: r.uses >= r.max ? 0 : r.uses + 1 }) });
      }
      case "death": {
        const key = b.dataset.kind === "ok" ? "deathOk" : "deathFail";
        const n = +b.dataset.n;
        return patchChar(c.id, { [key]: c[key] === n ? n - 1 : n });
      }
      case "deathRoll": {
        const r = throwDice("1d20", { label: c.name + " · salvación de muerte" });
        if (!r) return;
        if (r.total === 20) return patchChar(c.id, { hp: 1, deathOk: 0, deathFail: 0 });
        if (r.total === 1) return patchChar(c.id, { deathFail: Math.min(3, c.deathFail + 2) });
        return patchChar(c.id, r.total >= 10
          ? { deathOk: Math.min(3, c.deathOk + 1) }
          : { deathFail: Math.min(3, c.deathFail + 1) });
      }
    }
  });

  document.addEventListener("keydown", e => {
    if (e.key !== "Enter" || !e.target.matches("[data-amount]") || e.target.value === "") return;
    const btn = $('[data-act="damage"]');
    if (btn) btn.click();
  });
}
