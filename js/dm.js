/* Vista del DM: todo a la vista y todo editable. */

import { afterMove } from "./portals.js";
import { voiceWidget } from "./voice.js";
import { $, el, on, esc, lines, sign, pct, hpTone, hpBar, tweenBars, initials, imgURL, toast, modal, confirmBox, shrinkImage, clamp } from "./util.js";
import { CONDITIONS, conditionName, ABILITIES, SKILLS, PIN_KINDS, modOf, normalizeChar, normalizeBeast, normalizeMap, normalizePin, normalizePortal, uid, encounterDifficulty } from "./schema.js";
import { openAttacks, attacksOf } from "./attacks.js";
import { feetChars, nextRoomId } from "./los.js";
import { store, onState, onPresence, onStatus, op, patchChar, patchSession, patchMap, uploadImage, leave, lobby } from "./net.js";
import { dicePanel, renderLog, throwDice, tellTable, currentMode, isSecret } from "./dice-panel.js";
import { openCharEditor, openConditions } from "./char-editor.js";
import { MapView } from "./map.js";
import { openSpellbook } from "./spellbook.js";
import { langPicker } from "./i18n.js";
import { icon, withIcon } from "./icons.js";
import { rollHitPoints } from "./dice.js";

let tab = "mesa";
let shownTab = null;
let openCards = new Set();
let mapView = null;
let mapTool = "token";
let beastQuery = "";
let drawerOpen = false;
let shapeSize = 20;
let targetId = null;
let lastAlert = null;   // null = todavía no se ha pintado nada
let lastArea = null;    // la última plantilla colocada para un conjuro
let afterArea = null;

/* Lo que necesita la ventana de conjuros desde la vista del DM */
function dmSpellCtx() {
  return {
    isDM: true,
    getChar: byId,
    targets: () => chars().filter(x => x.mapId === activeMap().id && x.mx !== null),
    preselect: sp => {
      if (sp.shape && lastArea && mapView) return mapView.covered(lastArea).map(x => x.id);
      return targetId ? [targetId] : [];
    },
    previewArea: (sp, reopen) => {
      tab = "mapa";
      document.querySelectorAll("[data-tab]").forEach(x => x.setAttribute("aria-selected", String(x.dataset.tab === "mapa")));
      render();
      mapView.tool = "shape";
      mapView.pending = { kind: sp.shape, size: sp.size, width: sp.width, angle: 0, x: 0, y: 0,
        color: "#e56b6f", label: sp.name, party: true };
      afterArea = reopen;
      toast("Coloca el área: pulsa para dejarla y arrastra para girarla");
    }
  };
}

const doc = () => store.doc;
const chars = () => doc().chars;
const pcs = () => chars().filter(c => c.kind === "pc");
const foes = () => chars().filter(c => c.kind === "monster");
const byId = id => chars().find(c => c.id === id);
const session = () => doc().session;
const activeMap = () => doc().maps.find(m => m.id === session().activeMapId) || doc().maps[0];

export function mountDM(root) {
  root.innerHTML = `
    <div class="shell">
      <div class="banner hidden" id="offline">Se ha perdido la conexión con la partida. Reintentando…</div>
      <header class="topbar">
        <div class="brand">
          <h1>Mesa</h1>
          <input class="campaign" id="campaign" aria-label="Nombre de la campaña">
        </div>
        <nav class="tabs" role="tablist">
          <button role="tab" data-tab="mesa" aria-selected="true">${withIcon("users", "La mesa")}</button>
          <button role="tab" data-tab="mapa" aria-selected="false">${withIcon("map", "Mapa")}</button>
        </nav>
        <span class="spacer"></span>
        <span id="voiceSlot"></span>
        <button class="presence" id="presence" type="button" title="Quién está conectado"></button>
        <div class="top-actions">
          <button class="btn sm" id="bestiaryBtn" title="Bestiario">${withIcon("book", "Bestiario")}</button>
          <button class="btn sm" id="combatBtn" title="Combate">${withIcon("swords", "Iniciar combate")}</button>
          <button class="btn sm" id="restBtn" title="Descansar">${withIcon("moon", "Descansar")}</button>
          <button class="icon-btn" id="undoBtn" title="Deshacer el último cambio" aria-label="Deshacer el último cambio">${icon("undo")}</button>
          <button class="icon-btn" id="moreBtn" aria-label="Más opciones" title="Más opciones">${icon("more")}</button>
          <button class="btn primary sm" id="addBtn" title="Añadir personaje">${withIcon("userPlus", "Añadir personaje")}</button>
        </div>
      </header>
      <div class="rail hidden" id="rail"></div>
      <div class="showing hidden" id="showing"></div>
      <div class="layout">
        <main>
          <section id="tableView"></section>
          <section id="mapPane" class="hidden"></section>
        </main>
      </div>
    </div>`;

  const layout = root.querySelector(".layout");
  layout.appendChild(dicePanel({ isDM: true }));

  /* Cabecera */
  const campaign = $("#campaign", root);
  campaign.addEventListener("change", () => patchSession({ title: campaign.value.trim() || "Campaña sin nombre" }));
  on(root, "click", "[data-tab]", (e, b) => {
    tab = b.dataset.tab;
    root.querySelectorAll("[data-tab]").forEach(x => x.setAttribute("aria-selected", String(x === b)));
    render();
  });
  $("#addBtn", root).addEventListener("click", () => openCharEditor(null, {}));
  $("#bestiaryBtn", root).addEventListener("click", () => toggleDrawer());
  $("#combatBtn", root).addEventListener("click", toggleCombat);
  $("#restBtn", root).addEventListener("click", openRest);
  $("#undoBtn", root).addEventListener("click", () => { op("undo"); toast("Deshecho"); });
  $("#moreBtn", root).addEventListener("click", openMenu);
  $("#presence", root).addEventListener("click", openPresence);
  $("#voiceSlot", root).replaceWith(voiceWidget());

  onStatus(ok => $("#offline", root).classList.toggle("hidden", ok));
  onPresence(list => { renderPresence(list); if (tab === "mesa" && doc()) renderTable(); });
  onState(render);
  bindTable(root);
  bindKeys();
  render();
}

/* ---------- Presencia ---------- */
function renderPresence(list = store.presence) {
  const host = $("#presence");
  if (!host) return;
  const others = list.filter(p => p.role !== "dm");
  const locked = doc() && session().locked;
  host.classList.toggle("locked", !!locked);
  host.innerHTML = `<span class="dot ${store.online ? "" : "off"}"></span>${icon(locked ? "lock" : "wifi", 16)}<span class="lbl">${others.length} en la mesa</span><span class="count">${others.length}</span>`;
  host.title = locked ? "Mesa cerrada: no entra nadie nuevo" : "Quién está conectado";
}

/* Quién está conectado y con qué personaje. Desde aquí se libera uno. */
const ROLE_ICON = { dm: "crown", player: "user", screen: "tv" };
function openPresence() {
  const list = store.presence;
  const row = p => {
    const c = p.charId ? byId(p.charId) : null;
    return `<div class="person">
      <span class="person-ico">${icon(ROLE_ICON[p.role] || "user", 18)}</span>
      <span class="person-id"><b>${esc(p.name)}</b><small>${p.role === "dm" ? "Dirige la partida" : p.role === "screen" ? "Pantalla de la mesa" : c ? "Lleva a " + esc(c.name) : "Sin personaje"}</small></span>
      ${c ? `<button class="btn sm" data-release="${c.id}" title="Liberar personaje">${withIcon("unlink", "Liberar")}</button>` : ""}
      ${p.id !== store.session.id ? `<button class="icon-btn danger" data-kick="${p.id}" data-name="${esc(p.name)}" title="Expulsar" aria-label="Expulsar">${icon("ban", 17)}</button>` : ""}
    </div>`;
  };
  const locked = !!session().locked;
  const offline = pcs().filter(c => c.claimedBy && !list.some(p => p.charId === c.id));
  const body = el(`<div class="people">
    <button class="lock-row ${locked ? "on" : ""}" data-lock>
      <span class="menu-ico">${icon(locked ? "lock" : "unlock", 20)}</span>
      <span class="menu-text"><b>${locked ? "Mesa cerrada" : "Mesa abierta"}</b><small>${locked
        ? "No entra nadie nuevo. Quien ya está dentro sigue jugando."
        : "Cualquiera con la dirección puede entrar como jugador."}</small></span>
      <span class="switch" aria-hidden="true"><i></i></span>
    </button>
    ${list.map(row).join("") || `<p class="prose">Nadie conectado.</p>`}
    ${offline.length ? `<h4 class="people-sub">Desconectados</h4>${offline.map(c => `<div class="person off">
      <span class="person-ico">${icon("user", 18)}</span>
      <span class="person-id"><b>${esc(c.claimedBy)}</b><small>Llevaba a ${esc(c.name)}</small></span>
      <button class="btn sm" data-release="${c.id}" title="Liberar personaje">${withIcon("unlink", "Liberar")}</button>
    </div>`).join("")}` : ""}
  </div>`);
  const m = modal({ title: "En la mesa", body, actions: [{ label: "Cerrar" }] });
  on(body, "click", "[data-release]", (e, b) => { releaseChar(byId(b.dataset.release)); m.close(); });
  on(body, "click", "[data-lock]", () => {
    patchSession({ locked: !locked });
    toast(locked ? "Mesa abierta: se puede entrar" : "Mesa cerrada: no entra nadie nuevo", "good");
    m.close();
  });
  on(body, "click", "[data-kick]", async (e, b) => {
    m.close();
    if (!await confirmBox(`¿Expulsar a ${b.dataset.name}? Su aparato vuelve a la entrada.${session().locked ? "" : " Cierra la mesa si no quieres que vuelva a entrar."}`, { okLabel: "Expulsar" })) return;
    op("client.kick", { id: b.dataset.kick });
    toast(`${b.dataset.name} ha salido de la mesa`, "good");
  });
}

async function releaseChar(c) {
  if (!c) return;
  if (!await confirmBox(`¿Liberar a ${c.name}? Quien lo lleve volverá a elegir personaje.`, { danger: false, okLabel: "Liberar" })) return;
  op("char.release", { id: c.id });
  toast(`${c.name} queda libre`, "good");
}

/* Alguien ha pisado una casilla con nota: se enseña una vez, aquí y ahora. */
function noticeStep() {
  const a = session().alert;
  const first = lastAlert === null;
  if (!a) { lastAlert = ""; return; }
  if (a.id === lastAlert) return;
  lastAlert = a.id;
  /* Al entrar en la partida no se reabre el último aviso: ya pasó. */
  if (first || Date.now() - a.ts > 30000) return;
  const label = (PIN_KINDS.find(([k]) => k === a.kind) || ["", "Nota"])[1];
  modal({
    title: `${a.who} pisa: ${label}`,
    body: `<p class="prose" style="font-size:12px;margin:0 0 6px">${esc(a.mapName || "")}</p>
      <p class="said" style="font-family:var(--serif);font-size:17px">${esc(a.text) || "(nota sin texto)"}</p>
      <p class="prose" style="font-size:12px">${a.party ? "La party también la ve." : "Esta nota solo la ves tú."}</p>`,
    actions: [
      ...(a.party ? [] : [{ label: "Enseñársela ahora", run: () => {
        const map = activeMap();
        const pin = (map.pins || []).find(p => p.id === a.pinId);
        if (pin) { op("pin.set", { mapId: map.id, pin: { ...pin, party: true } }); tellTable(`${a.who} encuentra algo: ${a.text}`); }
      } }]),
      { label: "Entendido", tone: "primary" }
    ]
  });
}

/* ---------- Pintado ---------- */
function render() {
  if (!doc()) return;
  const campaign = $("#campaign");
  if (campaign && document.activeElement !== campaign) {
    const t = session().title;
    campaign.value = t === "Campaña sin nombre" ? "" : t;
    campaign.placeholder = "Campaña sin nombre";
  }

  $("#combatBtn").innerHTML = withIcon("swords", session().combat.on ? "Terminar combate" : "Iniciar combate");
  $("#combatBtn").classList.toggle("on", session().combat.on);
  $("#tableView").classList.toggle("hidden", tab !== "mesa");
  $("#mapPane").classList.toggle("hidden", tab !== "mapa");

  noticeStep();

  const showing = $("#showing");
  showing.classList.toggle("hidden", !session().handoutId);
  if (session().handoutId) {
    showing.innerHTML = `<img src="${imgURL(session().handoutId)}" alt="">
      <span>Estás enseñando <b>${esc(session().handoutText || "una imagen")}</b> a toda la mesa</span>
      <button class="btn sm" id="hideHandout">Guardarla</button>`;
    showing.querySelector("#hideHandout").addEventListener("click", () => patchSession({ handoutId: "", handoutText: "" }));
  }

  renderRail();
  const switched = tab !== shownTab;
  if (tab === "mesa") { renderTable(); tweenBars($("#tableView"), "dm:", switched); } else renderMap();
  if (switched) {
    shownTab = tab;
    const pane = $(tab === "mesa" ? "#tableView" : "#mapPane");
    pane.classList.remove("view-in"); void pane.offsetWidth; pane.classList.add("view-in");
  }
  renderLog($("#log"));
  renderPresence();
  if (drawerOpen) renderBestiary();
}

function renderRail() {
  const rail = $("#rail");
  const c = session().combat;
  rail.classList.toggle("hidden", !c.on);
  if (!c.on) return;
  const order = c.order.map(byId).filter(Boolean);
  const now = order[c.index];
  const used = (now && now.used) || {};
  const left = now ? Math.max(0, (now.speed || 30) - (used.move || 0)) : 0;

  rail.innerHTML = `
    <div class="rail-main">
      <div class="round"><b class="tnum">${c.round}</b><span>ronda</span></div>
      <div class="strip">
        ${order.map((x, i) => `
          <span class="turn-slot">
            <button class="turn ${i === c.index ? "now" : ""} ${x.hp <= 0 ? "down" : ""}"
                    data-goto="${i}" data-turn-id="${x.id}" draggable="true">
              <span class="pip" style="background:${esc(x.color)}">${x.initiative}</span>
              <b>${esc(x.name)}</b>
              <small>${x.kind === "pc" ? "CA " + x.ac : x.hp <= 0 ? "fuera" : x.hp + "/" + x.maxHp}${
                (x.conditions || []).length ? " · " + esc(x.conditions.map(conditionName).join(", ")) : ""}</small>
            </button>
            <button class="turn-drop" data-drop-turn="${x.id}" title="Sacar del combate" aria-label="Sacar del combate">${icon("close", 12)}</button>
          </span>`).join("")}
      </div>
      <div class="rail-nav">
        <button class="icon-btn" data-act="prevTurn" title="Turno anterior" aria-label="Turno anterior">${icon("prev")}</button>
        <button class="btn sm primary" data-act="nextTurn" title="Siguiente turno">${withIcon("skip", "Siguiente turno")}</button>
      </div>
    </div>
    <div class="rail-sub">
      ${now ? `<span class="rail-who">Le toca a <b>${esc(now.name)}</b></span>
      <div class="turn-tools" title="Lo que le queda a ${esc(now.name)} en este turno">
        <button class="chip ${used.action ? "spent" : ""}" data-use="action">Acción</button>
        <button class="chip ${used.bonus ? "spent" : ""}" data-use="bonus">Adicional</button>
        <button class="chip ${used.reaction ? "spent" : ""}" data-use="reaction">Reacción</button>
        <span class="chip ${left ? "" : "spent"}">${icon("boot", 14)}<span>${left} de ${now.speed} pies</span></span>
        <button class="chip" data-act="attackNow">${icon("sword", 14)}<span>Atacar</span></button>
        <button class="chip" data-act="delay">${icon("hourglass", 14)}<span>Retrasar</span></button>
      </div>` : ""}
      <span class="spacer"></span>
      <button class="chip" data-act="rollInit">${icon("dice", 14)}<span>Tirar iniciativa</span></button>
      <button class="chip" data-act="addToOrder">${icon("plus", 14)}<span>Añadir al combate</span></button>
    </div>`;

  /* Reordenar la iniciativa arrastrando */
  let from = null;
  rail.querySelectorAll("[data-turn-id]").forEach(node => {
    node.addEventListener("dragstart", e => { from = node.dataset.turnId; e.dataTransfer.effectAllowed = "move"; });
    node.addEventListener("dragover", e => { e.preventDefault(); node.classList.add("drop"); });
    node.addEventListener("dragleave", () => node.classList.remove("drop"));
    node.addEventListener("drop", e => {
      e.preventDefault();
      node.classList.remove("drop");
      const to = node.dataset.turnId;
      if (!from || from === to) return;
      const list = session().combat.order.filter(id => id !== from);
      const at = list.indexOf(to);
      list.splice(at, 0, from);
      patchSession({ combat: { ...session().combat, order: list, index: Math.max(0, list.indexOf((order[c.index] || {}).id)) } });
    });
  });
}

function renderTable() {
  const view = $("#tableView");
  const monsters = foes();
  const enc = encounterDifficulty(pcs(), monsters);
  const upright = pcs().filter(c => c.hp > 0);

  view.innerHTML = `
    <div class="band">
      <div class="stat"><b class="tnum">${pcs().length}</b><span>personajes</span></div>
      <div class="stat"><b class="tnum">${upright.reduce((s, c) => s + c.hp, 0)}</b><span>puntos de vida en pie</span></div>
      <div class="stat"><b class="tnum">${pcs().length - upright.length}</b><span>caídos</span></div>
      ${monsters.length ? `<div class="stat"><b class="tnum">${monsters.filter(m => m.hp > 0).length}</b>
        <span>enemigos · ${enc ? enc.adjusted + " PX ajustados, dificultad " + enc.label : ""}</span></div>` : ""}
    </div>
    ${pcs().length ? `<div class="grid">${pcs().map(cardHTML).join("")}</div>` : `
      <div class="empty">
        <h3>Aún no hay nadie en la mesa</h3>
        <p>Crea las fichas tú, o dile a cada jugador que entre desde su móvil y se haga la suya.</p>
        <button class="btn primary" data-act="add" style="margin-top:12px">Añadir personaje</button>
      </div>`}
    ${monsters.length ? `
      <div class="section-title"><h2>Enemigos</h2><span class="line"></span>
        <button class="btn sm" data-act="clearFoes">Retirar monstruos</button></div>
      <div class="grid">${monsters.map(cardHTML).join("")}</div>` : ""}`;
}

/* Quién lleva este personaje y si está conectado ahora mismo */
function holderPill(c) {
  const live = store.presence.find(p => p.charId === c.id && p.role === "player");
  return `<span class="pill holder ${live ? "on" : "off"}" title="${live ? "Conectado" : "Desconectado"}">${icon("user", 12)}${esc(live ? live.name : c.claimedBy)}</span>`;
}

function cardHTML(c) {
  const p = pct(c);
  const open = openCards.has(c.id);
  const monster = c.kind === "monster";
  const avatar = c.avatarId
    ? `<img class="avatar" src="${imgURL(c.avatarId)}" alt="" style="--tone:${esc(c.color)}">`
    : `<div class="avatar" style="--tone:${esc(c.color)}">${initials(c.name)}</div>`;

  return `
  <article class="card ${c.hp <= 0 ? "down" : ""}" data-id="${c.id}" data-flash style="--tone:${esc(c.color)}">
    <div class="head">
      ${avatar}
      <div class="id">
        <b>${esc(c.name)}</b>
        <small>${monster
          ? esc([c.sizeType, c.cr ? "VD " + c.cr : ""].filter(Boolean).join(" · "))
          : esc([c.className, c.race, "nivel " + c.level].filter(Boolean).join(" "))}</small>
      </div>
      <div class="acts">
        ${monster ? `<button class="icon-btn" data-act="hide" title="${c.hidden ? "Oculto para la party" : "Visible para la party"}">${icon(c.hidden ? "eyeOff" : "eye")}</button>
          <button class="icon-btn" data-act="clone" title="Duplicar">${icon("copy")}</button>` : ""}
        ${!monster && c.claimedBy ? `<button class="icon-btn" data-act="release" title="Liberar personaje">${icon("unlink")}</button>` : ""}
        <button class="icon-btn" data-act="edit" title="Editar ficha">${icon("pencil")}</button>
        <button class="icon-btn" data-act="remove" title="Quitar de la mesa">${icon("close")}</button>
        <button class="icon-btn" data-act="fold" title="Ver más" aria-expanded="${open}">${icon(open ? "up" : "down")}</button>
      </div>
    </div>

    <div class="hp">
      <div class="nums">
        <b class="tnum">${c.hp}</b><span>/ ${c.maxHp}</span>
        ${c.tempHp ? `<span class="temp">+${c.tempHp} temporales</span>` : ""}
        <span class="spacer"></span>
        <span class="pill">CA <b>${c.ac}</b></span>
      </div>
      ${hpBar(c.id, p)}
    </div>

    <div class="dealer">
      <button class="btn sm hurt" data-act="damage" title="Restar vida" aria-label="Restar vida">${icon("minus")}</button>
      <input class="tnum" data-amount type="number" min="0" placeholder="0" inputmode="numeric" aria-label="Cantidad">
      <button class="btn sm heal" data-act="heal" title="Curar" aria-label="Curar">${icon("plus")}</button>
      <button class="btn sm" data-act="temp" title="Vida temporal">${withIcon("shieldPlus", "Temp", 16)}</button>
      <button class="btn sm" data-act="conditions" title="Estados">${withIcon("sparkle", "Estados", 16)}</button>
      <button class="btn sm" data-act="attack" title="Tirar un ataque">${withIcon("sword", "Atacar", 16)}</button>
      ${!monster || c.spellbook.length ? `<button class="btn sm" data-act="spells" title="Conjuros">${withIcon("wand", "Conjuros", 16)}</button>` : ""}
      <button class="btn sm ${targetId === c.id ? "primary" : ""}" data-act="target" title="Apuntar con los ataques" aria-label="Apuntar con los ataques">${icon("target")}</button>
    </div>

    <div class="meta">
      <span class="pill">Iniciativa <b>${c.initiative}</b></span>
      <span class="pill">Velocidad <b>${c.speed}</b></span>
      ${c.concentration ? `<span class="pill conc" data-act="concSave" data-dc="10" title="Tirar la salvación de concentración">Concentrado en ${esc(c.concentration)} · tirar</span>` : ""}
      ${c.exhaustion ? `<span class="pill cond">Agotamiento ${c.exhaustion}</span>` : ""}
      ${c.conditions.map(id => `<span class="pill cond" title="${esc((CONDITIONS.find(x => x.id === id) || {}).hint || "")}" data-act="dropCond" data-cond="${id}">${esc(conditionName(id))}${(c.condMeta || {})[id] ? " " + c.condMeta[id] + "r" : ""}${icon("close", 11)}</span>`).join("")}
      ${c.inspiration ? `<span class="pill tag">${icon("star", 12)}Inspiración</span>` : ""}
      ${!monster && c.claimedBy ? holderPill(c) : ""}
      ${c.mx !== null ? '<span class="pill tag">En el mapa</span>' : ""}
    </div>

    ${open ? detailHTML(c) : ""}
  </article>`;
}

function detailHTML(c) {
  const monster = c.kind === "monster";
  const block = (title, text) => text ? `<div class="block"><h4>${title}</h4>${lines(text).map(l => `<p>${esc(l)}</p>`).join("")}</div>` : "";
  return `
  <div class="detail">
    <div class="abilities">
      ${ABILITIES.map(([k, l]) => `<button class="abil" data-act="checkAbility" data-ability="${k}">
        <span>${l}</span><b class="tnum">${c[k]}</b><small>${sign(modOf(c[k]))}</small></button>`).join("")}
    </div>
    <div class="row">
      <button class="btn sm" data-act="rollInitOne">Iniciativa</button>
      <button class="btn sm" data-act="rollSave">Salvación…</button>
      <button class="btn sm" data-act="rollSkill">Habilidad…</button>
      ${!monster ? '<button class="btn sm" data-act="inspire">Inspiración</button>' : ""}
      ${!monster && c.hitDice ? `<button class="btn sm" data-act="hitDie">Dado de golpe (${Math.max(0, c.level - c.hitDiceUsed)})</button>` : ""}
    </div>
    ${attacksOf(c).length ? `<div class="atk-strip">
      ${attacksOf(c).slice(0, 8).map(a => `<span class="chip">${esc(a.name)} <b>${a.atk >= 0 ? "+" : ""}${a.atk}</b> ${esc(a.damage)}</span>`).join("")}
    </div>` : ""}
    ${!monster && c.slots.some(n => n > 0) ? `<div class="slots">
      ${c.slots.map((n, i) => n ? `<span class="slot" data-act="slot" data-level="${i}">${i + 1}º
        ${Array.from({ length: n }, (_, j) => `<i class="${j < c.slotsUsed[i] ? "used" : ""}"></i>`).join("")}</span>` : "").join("")}
    </div>` : ""}
    ${c.resources.length ? `<div class="slots">
      ${c.resources.map((r, i) => `<span class="slot" data-act="res" data-res="${i}">${esc(r.name)}
        <b class="tnum">${r.max - r.uses}/${r.max}</b></span>`).join("")}</div>` : ""}
    ${!monster ? `<div class="deaths">
      <span class="set ok">Éxitos ${[0, 1, 2].map(i => `<button data-act="death" data-kind="ok" data-n="${i + 1}" class="${c.deathOk > i ? "on" : ""}"></button>`).join("")}</span>
      <span class="set bad">Fallos ${[0, 1, 2].map(i => `<button data-act="death" data-kind="fail" data-n="${i + 1}" class="${c.deathFail > i ? "on" : ""}"></button>`).join("")}</span>
      <button class="btn sm" data-act="deathRoll">${withIcon("skull", "Tirar salvación de muerte", 16)}</button>
    </div>` : ""}
    ${block("Sentidos", c.senses)}${block("Idiomas", c.languages)}${block("Resistencias", c.resistances)}
    ${block("Rasgos", c.traits)}${block("Acciones", c.actions)}
    ${block("Ataques", c.weapons)}${block("Conjuros", c.spells)}${block("Equipo", c.inventory)}${block("Notas", c.notes)}
  </div>`;
}

/* ---------- Acciones de la mesa ---------- */
function bindTable(root) {
  on(root, "click", "[data-act]", (e, btn) => {
    const card = btn.closest("[data-id]");
    const c = card ? byId(card.dataset.id) : null;
    const amount = () => Math.max(0, +(card.querySelector("[data-amount]").value || 0));
    const act = btn.dataset.act;

    /* Hay acciones que son de la mesa (pasar turno, tirar iniciativa) y otras
       que son de una ficha concreta. Si la segunda llega sin ficha, se deja
       pasar en vez de reventar. */
    const sinFicha = ["add", "nextTurn", "prevTurn", "rollInit", "addToOrder", "delay", "attackNow", "clearFoes"];
    if (!c && !sinFicha.includes(act)) return;

    switch (act) {
      case "add": return openCharEditor(null, {});
      case "fold":
        openCards.has(c.id) ? openCards.delete(c.id) : openCards.add(c.id);
        return render();
      case "edit": return c.kind === "monster" ? openMonsterInstance(c) : openCharEditor(c, {});
      case "remove": return removeChar(c);
      case "release": return releaseChar(c);
      case "clone": return cloneMonster(c);
      case "hide": return patchChar(c.id, { hidden: !c.hidden });
      case "damage": return dealDamage(c, amount(), card);
      case "heal": return dealHeal(c, amount(), card);
      case "temp": {
        const n = amount();
        if (!n) return;
        patchChar(c.id, { tempHp: Math.max(c.tempHp, n) });
        card.querySelector("[data-amount]").value = "";
        return;
      }
      case "conditions": return openConditions(c);
      case "dropCond": return patchChar(c.id, { conditions: c.conditions.filter(x => x !== btn.dataset.cond) });
      case "checkAbility": {
        const k = btn.dataset.ability;
        const label = `${c.name} · ${ABILITIES.find(a => a[0] === k)[1]}`;
        return throwDice("1d20" + sign(modOf(c[k])), { label, mode: currentMode(), secret: isSecret() });
      }
      case "rollSave": return pickAndRoll(c, "save");
      case "rollSkill": return pickAndRoll(c, "skill");
      case "rollInitOne": {
        const r = throwDice("1d20" + sign(modOf(c.dex)), { label: c.name + " · iniciativa" });
        if (r) patchChar(c.id, { initiative: r.total });
        return;
      }
      case "inspire": return patchChar(c.id, { inspiration: !c.inspiration });
      case "slot": {
        const i = +btn.dataset.level;
        const used = c.slotsUsed.slice();
        used[i] = used[i] >= c.slots[i] ? 0 : used[i] + 1;
        return patchChar(c.id, { slotsUsed: used });
      }
      case "res": {
        const i = +btn.dataset.res;
        const list = c.resources.map((r, j) => j !== i ? r : { ...r, uses: r.uses >= r.max ? 0 : r.uses + 1 });
        return patchChar(c.id, { resources: list });
      }
      case "death": {
        const n = +btn.dataset.n;
        const key = btn.dataset.kind === "ok" ? "deathOk" : "deathFail";
        return patchChar(c.id, { [key]: c[key] === n ? n - 1 : n });
      }
      case "deathRoll": return deathSave(c);
      case "clearFoes": return clearMonsters();
      case "nextTurn": return step(1);
      case "prevTurn": return step(-1);
      case "rollInit": return rollInitiative();
      case "addToOrder": return pickForOrder();
      case "delay": return delayTurn();
      case "attackNow": {
        const who = byId(session().combat.order[session().combat.index]);
        return who && attack(who);
      }
      case "attack": return attack(c);
      case "spells": return openSpellbook(c, dmSpellCtx());
      case "target": {
        targetId = targetId === c.id ? null : c.id;
        if (mapView) mapView.target = targetId;
        toast(targetId ? "Apuntando a " + c.name : "Sin objetivo");
        return render();
      }
      case "concSave": {
        const dc = +btn.dataset.dc || 10;
        const r = throwDice("1d20" + sign(modOf(c.con) + (c.saves.includes("con") ? c.proficiency : 0)),
          { label: `${c.name} · concentración CD ${dc}` });
        if (r && r.total < dc) { patchChar(c.id, { concentration: "" }); tellTable(`${c.name} pierde la concentración`); }
        return;
      }
      case "hitDie": return spendHitDie(c);
    }
  });

  on(root, "click", "[data-goto]", (e, b) => {
    patchSession({ combat: { ...session().combat, index: +b.dataset.goto } });
  });

  on(root, "click", "[data-drop-turn]", (e, b) => {
    const c = session().combat;
    const id = b.dataset.dropTurn;
    const order = c.order.filter(x => x !== id);
    if (!order.length) return patchSession({ combat: { on: false, round: 1, index: 0, order: [] } });
    const wasAt = c.order.indexOf(id);
    patchSession({ combat: { ...c, order, index: Math.min(c.index > wasAt ? c.index - 1 : c.index, order.length - 1) } });
    toast((byId(id) || {}).name + " sale del combate");
  });

  on(root, "click", "[data-use]", (e, b) => {
    const c = session().combat;
    const who = byId(c.order[c.index]);
    if (!who) return;
    const k = b.dataset.use;
    patchChar(who.id, { used: { ...(who.used || {}), [k]: !(who.used || {})[k] } });
  });

  on(root, "keydown", "[data-amount]", e => {
    if (e.key !== "Enter") return;
    const card = e.target.closest("[data-id]");
    const c = byId(card.dataset.id);
    const n = Math.max(0, +e.target.value || 0);
    e.shiftKey ? dealHeal(c, n, card) : dealDamage(c, n, card);
  });
}

/* El reparto de vida lo hace el servidor: ahí están escritas de una sola vez
   las reglas de vida temporal, caída y concentración. */
function dealDamage(c, n, card) {
  if (!n) return;
  op("hp.apply", { id: c.id, damage: n });
  if (card) card.querySelector("[data-amount]").value = "";
}

function dealHeal(c, n, card) {
  if (!n) return;
  op("hp.apply", { id: c.id, heal: n });
  if (card) card.querySelector("[data-amount]").value = "";
}

/* ---------- Ataques ---------- */
function targetsFor(c) {
  const map = activeMap();
  const rivals = chars().filter(x => x.id !== c.id && x.hp > 0);
  return rivals.map(x => {
    const near = map && x.mx !== null && c.mx !== null && x.mapId === c.mapId ? feetChars(map, c, x) : null;
    return { ...x, name: x.name + (near !== null ? ` (a ${near} pies)` : "") };
  }).sort((a, b) => (a.kind === c.kind) - (b.kind === c.kind));
}

function attack(c) {
  openAttacks(c, { targets: targetsFor(c), preselect: targetId, secret: c.kind === "monster" && isSecret() });
}

function delayTurn() {
  const c = { ...session().combat };
  const id = c.order[c.index];
  if (!id) return;
  const list = c.order.filter(x => x !== id);
  list.push(id);
  patchSession({ combat: { ...c, order: list, index: Math.max(0, c.index) % Math.max(1, list.length) } });
  tellTable(`${byId(id).name} retrasa su turno`);
}

function pickForOrder() {
  const out = chars().filter(c => !session().combat.order.includes(c.id));
  if (!out.length) return toast("Ya están todos en la iniciativa");
  const body = el(`<div class="cond-grid">${out.map(c =>
    `<button class="btn sm" data-add="${c.id}">${esc(c.name)} · ${c.initiative}</button>`).join("")}</div>`);
  const m = modal({ title: "Meter en la iniciativa", body, wide: true, actions: [{ label: "Cerrar" }] });
  on(body, "click", "[data-add]", (e, b) => {
    const c = session().combat;
    const list = [...c.order, b.dataset.add]
      .map(byId).filter(Boolean)
      .sort((a, z) => z.initiative - a.initiative || modOf(z.dex) - modOf(a.dex))
      .map(x => x.id);
    patchSession({ combat: { ...c, order: list } });
    m.close();
  });
}

function deathSave(c) {
  const r = throwDice("1d20", { label: c.name + " · salvación de muerte" });
  if (!r) return;
  if (r.total === 20) return patchChar(c.id, { hp: 1, deathOk: 0, deathFail: 0 });
  if (r.total === 1) return patchChar(c.id, { deathFail: Math.min(3, c.deathFail + 2) });
  if (r.total >= 10) patchChar(c.id, { deathOk: Math.min(3, c.deathOk + 1) });
  else patchChar(c.id, { deathFail: Math.min(3, c.deathFail + 1) });
}

function pickAndRoll(c, kind) {
  const list = kind === "save"
    ? ABILITIES.map(([k, l]) => ({ id: k, name: l, mod: modOf(c[k]) + (c.saves.includes(k) ? c.proficiency : 0) }))
    : SKILLS.map(([id, name, ab]) => ({ id, name, mod: modOf(c[ab]) + (c.skills.includes(id) ? c.proficiency : 0) }));
  const body = el(`<div class="cond-grid">${list.map(x =>
    `<button class="btn sm" data-pick="${x.id}" data-mod="${x.mod}">${esc(x.name)} ${sign(x.mod)}</button>`).join("")}</div>`);
  const m = modal({ title: (kind === "save" ? "Salvación de " : "Prueba de ") + c.name, body, wide: true, actions: [{ label: "Cerrar" }] });
  on(body, "click", "[data-pick]", (e, b) => {
    throwDice("1d20" + sign(+b.dataset.mod), { label: `${c.name} · ${b.textContent.trim()}`, mode: currentMode(), secret: isSecret() });
    m.close();
  });
}

async function removeChar(c) {
  if (!await confirmBox(`¿Quitar a ${c.name} de la mesa? Su ficha se pierde.`)) return;
  op("char.remove", { ids: [c.id] });
}

function cloneMonster(c) {
  const copy = normalizeChar({ ...c, id: uid(), name: nextName(c.name), claimedBy: "" });
  op("char.add", { char: copy });
}

function nextName(base) {
  const stem = base.replace(/\s\d+$/, "");
  const used = chars().filter(c => c.name.startsWith(stem)).length;
  return `${stem} ${used + 1}`;
}

async function clearMonsters() {
  if (!await confirmBox("¿Retirar del encuentro a todos los monstruos?")) return;
  op("char.remove", { ids: foes().map(c => c.id) });
}

/* ---------- Combate ---------- */
function toggleCombat() {
  const c = session().combat;
  if (c.on) {
    patchSession({ combat: { on: false, round: 1, index: 0, order: [] } });
    tellTable("Termina el combate");
    return;
  }
  openCombatRoster();
}

/* A cuánto se considera que una criatura está «en el ajo». Más lejos de esto
   se queda fuera de la iniciativa, aunque esté en el mismo mapa. */
const COMBAT_REACH = 12;

/* Quién entra al empezar un combate.

   No entra todo el que esté en el mapa: se caen los que están fuera de
   combate, las criaturas que la party todavía no ha visto (meterlas delataría
   que hay algo ahí) y las que están lejos de la pelea. La lista se puede
   retocar a mano antes de empezar. */
function combatCandidates() {
  const map = activeMap();
  const heroes = pcs().filter(c => c.hp > 0);
  const near = c => {
    if (!map || c.mx === null || c.mapId !== map.id) return false;
    return heroes.some(h => h.mx !== null && h.mapId === map.id && feetChars(map, h, c) <= COMBAT_REACH * (map.feet || 5));
  };
  return chars().filter(c => {
    if (c.hp <= 0) return false;
    if (c.kind === "pc") return true;
    return c.discovered && near(c);
  });
}

const sortByInitiative = list => list.slice()
  .sort((a, b) => b.initiative - a.initiative || modOf(b.dex) - modOf(a.dex) || a.name.localeCompare(b.name))
  .map(c => c.id);

const buildOrder = () => sortByInitiative(combatCandidates());

/* Antes de empezar, se enseña quién va a entrar y se puede quitar a cualquiera. */
function openCombatRoster() {
  const inside = new Set(combatCandidates().map(c => c.id));
  const rest = chars().filter(c => !inside.has(c.id));
  const row = c => `<label class="pick-row init">
    <input type="checkbox" value="${c.id}" ${inside.has(c.id) ? "checked" : ""}>
    <span class="avatar" style="--tone:${esc(c.color)};width:26px;height:26px;font-size:10px">${initials(c.name)}</span>
    <span><b>${esc(c.name)}</b><small>${esc(whyOut(c, inside))}</small></span>
    <input type="number" class="tnum" data-init="${c.id}" value="${c.initiative}" min="-10" max="99"
      aria-label="Iniciativa de ${esc(c.name)}" title="Iniciativa. Escríbela a mano o tírala.">
    <button type="button" class="btn sm" data-roll="${c.id}" title="Tirar su iniciativa">d20</button>
  </label>`;
  const body = el(`<div>
    <p class="prose" style="font-size:13px;margin:0 0 10px">Entran estos. Quita o añade a quien quieras, y escribe la iniciativa a mano o tírala.</p>
    <div class="row" style="margin-bottom:10px">
      <button type="button" class="btn sm" id="rollAllInit">Tirar por todos</button>
      <button type="button" class="btn sm" id="rollFoesInit">Tirar solo por las criaturas</button>
    </div>
    <div class="pick-list">${[...combatCandidates(), ...rest].map(row).join("")}</div>
  </div>`);

  /* Tirar aquí mismo y que el número caiga en su casilla */
  const rollOne = (c, secret) => {
    const r = throwDice("1d20" + sign(modOf(c.dex)), { label: c.name + " · iniciativa", secret });
    if (!r) return;
    const box = body.querySelector(`[data-init="${c.id}"]`);
    if (box) box.value = r.total;
  };
  on(body, "click", "[data-roll]", (e, b) => { const c = byId(b.dataset.roll); if (c) rollOne(c, c.kind === "monster"); });
  body.querySelector("#rollAllInit").addEventListener("click", () =>
    [...body.querySelectorAll("input:checked")].forEach(i => { const c = byId(i.value); if (c) rollOne(c, c.kind === "monster"); }));
  body.querySelector("#rollFoesInit").addEventListener("click", () =>
    [...body.querySelectorAll("input:checked")].forEach(i => { const c = byId(i.value); if (c && c.kind === "monster") rollOne(c, true); }));

  modal({
    title: "Quién entra en combate", body, wide: true,
    actions: [{ label: "Cancelar" }, {
      label: "Empezar", tone: "primary",
      run: host => {
        const chosen = [...host.querySelectorAll("input[type=checkbox]:checked")].map(i => i.value);
        if (!chosen.length) return false;
        /* La iniciativa escrita a mano manda sobre la que tuvieran guardada */
        const nums = new Map();
        chosen.forEach(id => {
          const box = host.querySelector(`[data-init="${id}"]`);
          const n = box ? +box.value : null;
          if (n !== null && !Number.isNaN(n)) nums.set(id, n);
        });
        nums.forEach((n, id) => { if (byId(id) && byId(id).initiative !== n) patchChar(id, { initiative: n }); });
        const order = chosen.map(byId).filter(Boolean)
          .sort((a, b) => (nums.get(b.id) ?? b.initiative) - (nums.get(a.id) ?? a.initiative)
            || modOf(b.dex) - modOf(a.dex) || a.name.localeCompare(b.name))
          .map(c => c.id);
        patchSession({ combat: { on: true, round: 1, index: 0, order } });
        tellTable("Empieza el combate");
      }
    }]
  });
}

function whyOut(c, inside) {
  if (inside.has(c.id)) return c.kind === "pc" ? "de la party" : "iniciativa " + c.initiative;
  if (c.hp <= 0) return "fuera de combate";
  if (c.kind === "monster" && !c.discovered) return "la party aún no lo ha visto";
  if (c.mx === null) return "no está en el tablero";
  return "lejos de la pelea";
}

function rollInitiative() {
  const rolled = new Map();
  const c0 = session().combat;
  const list = c0.on && c0.order.length ? c0.order.map(byId).filter(Boolean) : combatCandidates();
  list.forEach(c => {
    const r = throwDice("1d20" + sign(modOf(c.dex)), { label: c.name + " · iniciativa", secret: c.kind === "monster" });
    if (r) rolled.set(c.id, r.total);
  });
  rolled.forEach((total, id) => patchChar(id, { initiative: total }));
  // el orden se calcula aquí mismo, sin esperar a que vuelva el estado
  const order = list.slice()
    .sort((a, b) => (rolled.get(b.id) ?? b.initiative) - (rolled.get(a.id) ?? a.initiative)
      || modOf(b.dex) - modOf(a.dex) || a.name.localeCompare(b.name))
    .map(c => c.id);
  patchSession({ combat: { ...session().combat, on: true, order, index: 0 } });
}

/* El paso de turno lo lleva el servidor: ahí caducan los estados por rondas,
   se devuelven acción y movimiento y se saltan los monstruos caídos. */
function step(dir) {
  if (!session().combat.on) return;
  op("combat.step", { dir });
}

/* ---------- Descansos ---------- */
function openRest() {
  const body = el(`<div class="choice-list">
    <button class="choice" data-rest="short">
      <span class="choice-ico">${icon("fire", 26)}</span>
      <span class="choice-text"><b>Descanso corto</b><small>Una hora. Cada personaje decide cuántos dados de golpe gasta desde su ficha.</small></span>
    </button>
    <button class="choice" data-rest="long">
      <span class="choice-ico">${icon("moon", 26)}</span>
      <span class="choice-text"><b>Descanso largo</b><small>Ocho horas. Vida, espacios de conjuro y recursos al máximo; baja un nivel de agotamiento.</small></span>
    </button>
  </div>`);
  const m = modal({ title: "Descansar", body, actions: [{ label: "Cerrar" }] });
  on(body, "click", "[data-rest]", (e, b) => { m.close(); b.dataset.rest === "long" ? longRest() : shortRest(); });
}

async function shortRest() {
  if (!await confirmBox("Descanso corto: se recuperan los recursos de uso corto y cada personaje puede gastar dados de golpe desde su ficha.", { danger: false, okLabel: "Descansar" })) return;
  pcs().forEach(c => patchChar(c.id, { used: { action: false, bonus: false, reaction: false, move: 0 } }));
  tellTable("La party toma un descanso corto");
}

/* Gastar un dado de golpe: cura la tirada más el modificador de Constitución */
function spendHitDie(c) {
  const die = (c.hitDice || "").split(/d/i)[1];
  if (!die) return toast("Apunta los dados de golpe en su ficha (por ejemplo 5d8)", "bad");
  const total = Math.max(1, +c.level - c.hitDiceUsed);
  if (total <= 0) return toast("No le quedan dados de golpe");
  const r = throwDice(`1d${die}` + sign(modOf(c.con)), { label: c.name + " · dado de golpe" });
  if (!r) return;
  op("hp.apply", { id: c.id, heal: Math.max(1, r.total), note: "dado de golpe" });
  patchChar(c.id, { hitDiceUsed: c.hitDiceUsed + 1 });
}

async function longRest() {
  if (!await confirmBox("Descanso largo: la party recupera toda la vida, los espacios de conjuro y los recursos. Los monstruos no se enteran.", { danger: false, okLabel: "Descansar" })) return;
  pcs().forEach(c => patchChar(c.id, {
    hp: c.maxHp, tempHp: 0, deathOk: 0, deathFail: 0,
    slotsUsed: c.slots.map(() => 0),
    resources: c.resources.map(r => ({ ...r, uses: 0 })),
    exhaustion: Math.max(0, c.exhaustion - 1),
    hitDiceUsed: Math.floor(c.hitDiceUsed / 2),
    conditions: c.conditions.filter(x => !["inconsciente", "envenenado", "derribado"].includes(x)),
    concentration: ""
  }));
  tellTable("La party toma un descanso largo");
}

/* ---------- Monstruo ya en la mesa ---------- */
function openMonsterInstance(c) {
  const body = el(`<div>
    <div class="cols2">
      <label class="field"><span>Nombre</span><input name="name" value="${esc(c.name)}"></label>
      <label class="field"><span>Clase de armadura</span><input name="ac" type="number" value="${c.ac}"></label>
      <label class="field"><span>Vida</span><input name="hp" type="number" value="${c.hp}"></label>
      <label class="field"><span>Vida máxima</span><input name="maxHp" type="number" value="${c.maxHp}"></label>
      <label class="field"><span>Iniciativa</span><input name="initiative" type="number" value="${c.initiative}"></label>
      <label class="field"><span>Color</span><input name="color" type="color" value="${esc(c.color)}" style="height:38px"></label>
    </div>
    <label class="field"><span>Notas del DM sobre esta criatura</span><textarea name="notes">${esc(c.notes)}</textarea></label>
    <label class="check"><input type="checkbox" name="hidden" ${c.hidden ? "checked" : ""}> Oculto para la party</label>
  </div>`);
  modal({
    title: "Ajustes de " + c.name,
    body,
    actions: [{ label: "Cancelar" }, {
      label: "Guardar", tone: "primary",
      run: host => {
        const v = n => host.querySelector(`[name="${n}"]`).value;
        patchChar(c.id, {
          name: v("name"), ac: +v("ac"), hp: +v("hp"), maxHp: Math.max(1, +v("maxHp")),
          initiative: +v("initiative"), color: v("color"), notes: v("notes"),
          hidden: host.querySelector('[name="hidden"]').checked
        });
      }
    }]
  });
}

/* ---------- Bestiario ---------- */
function toggleDrawer(force) {
  drawerOpen = force === undefined ? !drawerOpen : force;
  let node = $("#drawer");
  if (!drawerOpen) { if (node) node.remove(); return; }
  node = el(`
    <aside class="drawer" id="drawer">
      <header>
        <h2>${icon("book", 20)}<span>Bestiario</span></h2>
        <span class="spacer"></span>
        <button class="btn sm" data-beast="new" title="Crear criatura">${withIcon("plus", "Crear", 16)}</button>
        <button class="icon-btn" data-beast="close" title="Cerrar" aria-label="Cerrar">${icon("close")}</button>
      </header>
      <div class="drawer-search"><input type="search" id="beastSearch" placeholder="Buscar criatura" aria-label="Buscar criatura" value="${esc(beastQuery)}"></div>
      <div class="body" id="beastList"></div>
    </aside>`);
  document.body.appendChild(node);
  const onEsc = e => { if (e.key === "Escape" && !document.querySelector(".modal-back")) { document.removeEventListener("keydown", onEsc); toggleDrawer(false); } };
  document.addEventListener("keydown", onEsc);
  node.querySelector("#beastSearch").addEventListener("input", e => { beastQuery = e.target.value; renderBestiary(); });
  on(node, "click", "[data-beast]", (e, b) => {
    const action = b.dataset.beast;
    if (action === "close") return toggleDrawer(false);
    if (action === "new") return openBeastEditor(null);
    const beast = doc().bestiary.find(x => x.id === b.dataset.id);
    if (action === "spawn") return spawn(beast, b.closest(".beast"));
    if (action === "edit") return openBeastEditor(beast);
    if (action === "drop") return dropBeast(beast);
  });
  renderBestiary();
}

function renderBestiary() {
  const host = $("#beastList");
  if (!host) return;
  const q = beastQuery.trim().toLowerCase();
  const list = doc().bestiary.filter(b => !q || (b.name + " " + b.sizeType).toLowerCase().includes(q));
  host.innerHTML = list.map(b => `
    <div class="beast" style="--tone:${esc(b.color)}">
      <div class="top">
        ${b.avatarId
          ? `<img class="avatar" src="${imgURL(b.avatarId)}" alt="" style="--tone:${esc(b.color)};width:30px;height:30px">`
          : `<div class="avatar" style="--tone:${esc(b.color)};width:30px;height:30px;font-size:11px">${initials(b.name)}</div>`}
        <b>${esc(b.name)}</b>
        <span class="spacer"></span>
        <small>VD ${esc(b.cr)} · ${b.xp} PX</small>
      </div>
      <small>${esc(b.sizeType)} · CA ${b.ac} · ${b.hpAvg} PV${b.hpDice ? " (" + esc(b.hpDice) + ")" : ""}</small>
      <div class="go">
        <input type="number" min="1" max="20" value="1" data-qty aria-label="Cantidad">
        <label class="check" style="font-size:12px"><input type="checkbox" data-rollhp checked> PV al azar</label>
        <span class="spacer"></span>
        <button class="btn sm" data-beast="edit" data-id="${b.id}">${icon("pencil")}</button>
        ${b.custom ? `<button class="icon-btn" data-beast="drop" data-id="${b.id}">${icon("close")}</button>` : ""}
        <button class="btn sm primary" data-beast="spawn" data-id="${b.id}">Al combate</button>
      </div>
    </div>`).join("") || '<p class="prose">No hay ninguna criatura con ese nombre.</p>';
}

function spawn(beast, row) {
  const qty = clamp(+row.querySelector("[data-qty]").value || 1, 1, 20);
  const rollHp = row.querySelector("[data-rollhp]").checked;
  const list = [];
  for (let i = 0; i < qty; i++) {
    const hp = rollHp && beast.hpDice ? rollHitPoints(beast.hpDice, beast.hpAvg) : beast.hpAvg;
    list.push(normalizeChar({
      id: uid(), kind: "monster", monsterKey: beast.id, name: beast.name,
      color: beast.color, avatarId: beast.avatarId, size: beast.size || "Mediano",
      hp, maxHp: hp, ac: beast.ac, speed: beast.speed,
      initiative: rollHitPoints("1d20", 10) + modOf(beast.dex),
      str: beast.str, dex: beast.dex, con: beast.con, int: beast.int, wis: beast.wis, cha: beast.cha,
      sizeType: beast.sizeType, cr: beast.cr, xp: beast.xp, senses: beast.senses, languages: beast.languages,
      resistances: beast.resistances, traits: beast.traits, actions: beast.actions
    }));
  }
  // nombres correlativos aunque se añadan de golpe: Goblin 1, Goblin 2…
  let n = chars().filter(c => c.name.replace(/\s\d+$/, "") === beast.name).length;
  list.forEach(m => { n++; m.name = qty > 1 || n > 1 ? `${beast.name} ${n}` : beast.name; });
  op("char.add", { chars: list });
  toast(`${qty} × ${beast.name} al encuentro. Pulsa una casilla del mapa para colocarlos.`, "good");
}

function openBeastEditor(beast) {
  const b = normalizeBeast(beast || {});
  const isNew = !beast;
  const f = (label, name, value, type = "text") =>
    `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}"></label>`;
  let avatarId = b.avatarId;
  const body = el(`<div>
    <div class="row" style="align-items:flex-start;margin-bottom:12px">
      <div style="flex:0 0 96px">
        <div class="avatar" id="bavPreview" style="width:78px;height:78px;font-size:22px;--tone:${esc(b.color)}${
          b.avatarId ? `;background-image:url(${imgURL(b.avatarId)});background-size:cover` : ""}">${b.avatarId ? "" : initials(b.name || "?")}</div>
        <button type="button" class="btn sm" id="bavPick" style="margin-top:8px;width:78px">Retrato</button>
        <input type="file" id="bavFile" accept="image/*" hidden>
      </div>
      <div style="flex:1 1 300px">
        <div class="cols2">
          ${f("Nombre", "name", b.name)}
          <label class="field"><span>Tamaño</span><select name="size">
            ${["Diminuto", "Pequeño", "Mediano", "Grande", "Enorme", "Gargantuesco"].map(t =>
              `<option ${String(b.size).includes(t) ? "selected" : ""}>${t}</option>`).join("")}
          </select></label>
        </div>
      </div>
    </div>
    <div class="cols2">
      ${f("Tamaño y tipo (texto)", "sizeType", b.sizeType)}
      ${f("Valor de desafío", "cr", b.cr)}${f("Puntos de experiencia", "xp", b.xp, "number")}
      ${f("Clase de armadura", "ac", b.ac, "number")}${f("Vida media", "hpAvg", b.hpAvg, "number")}
      ${f("Dados de vida", "hpDice", b.hpDice)}${f("Velocidad", "speed", b.speed, "number")}
    </div>
    <div class="row">${ABILITIES.map(([k, l]) => `<label class="field" style="flex:1 1 80px"><span>${l}</span>
      <input name="${k}" type="number" value="${b[k]}"></label>`).join("")}</div>
    <div class="cols2">${f("Sentidos", "senses", b.senses)}${f("Idiomas", "languages", b.languages)}</div>
    <label class="field"><span>Resistencias e inmunidades</span><input name="resistances" value="${esc(b.resistances)}"></label>
    <label class="field"><span>Rasgos (uno por línea)</span><textarea name="traits">${esc(b.traits)}</textarea></label>
    <label class="field"><span>Acciones (una por línea)</span><textarea name="actions">${esc(b.actions)}</textarea></label>
    <label class="field"><span>Color</span><input name="color" type="color" value="${esc(b.color)}" style="height:38px"></label>
  </div>`);

  const bfile = body.querySelector("#bavFile");
  body.querySelector("#bavPick").addEventListener("click", () => bfile.click());
  bfile.addEventListener("change", async () => {
    if (!bfile.files[0]) return;
    try {
      const { blob } = await shrinkImage(bfile.files[0], 192);
      avatarId = await uploadImage(blob);
      const prev = body.querySelector("#bavPreview");
      prev.textContent = "";
      prev.style.backgroundImage = `url(${imgURL(avatarId)})`;
      prev.style.backgroundSize = "cover";
      toast("Retrato guardado", "good");
    } catch (err) { toast(err.message, "bad"); }
  });

  modal({
    title: isNew ? "Nueva criatura" : "Editar " + b.name,
    body, wide: true,
    actions: [{ label: "Cancelar" }, {
      label: "Guardar", tone: "primary",
      run: host => {
        const v = n => host.querySelector(`[name="${n}"]`).value;
        const next = normalizeBeast({
          ...b, custom: true,
          name: v("name") || "Criatura", sizeType: v("sizeType"), cr: v("cr"), xp: +v("xp"),
          avatarId, size: v("size") || "Mediano",
          ac: +v("ac"), hpAvg: +v("hpAvg"), hpDice: v("hpDice"), speed: +v("speed"),
          senses: v("senses"), languages: v("languages"), resistances: v("resistances"),
          traits: v("traits"), actions: v("actions"), color: v("color"),
          ...Object.fromEntries(ABILITIES.map(([k]) => [k, +v(k)]))
        });
        const list = isNew ? [...doc().bestiary, next] : doc().bestiary.map(x => x.id === b.id ? next : x);
        op("bestiary.set", { list });
      }
    }]
  });
}

async function dropBeast(b) {
  if (!await confirmBox(`¿Borrar ${b.name} del bestiario?`)) return;
  op("bestiary.set", { list: doc().bestiary.filter(x => x.id !== b.id) });
}

/* ---------- Mapa ---------- */
export const DRAW_COLORS = ["#e0bd76", "#e56b6f", "#7fd0ff", "#8fd694", "#ffffff"];

function renderMap() {
  const pane = $("#mapPane");
  const map = activeMap();
  if (!pane.dataset.ready || !mapView) {
    pane.dataset.ready = "1";
    pane.innerHTML = `
      <div class="map-wrap">
        <div class="map-bar">
          <select id="mapPick" aria-label="Mapa activo" style="max-width:200px"></select>
          <div class="tool-set" id="tools">
            <button data-tool="token" aria-pressed="true" title="Mover y seleccionar fichas">${icon("move", 15)}Fichas</button>
            <button data-tool="measure" aria-pressed="false" title="Medir distancias">${icon("ruler", 15)}Regla</button>
            <button data-tool="wall" aria-pressed="false" title="Muro por los bordes de las casillas">${icon("wall", 15)}Muro</button>
            <button data-tool="diag" aria-pressed="false" title="Muro en diagonal, de esquina a esquina">${icon("diagonal", 15)}Diagonal</button>
            <button data-tool="door" aria-pressed="false" title="Puerta: cerrada, abierta, sin puerta">${icon("door", 15)}Puerta</button>
            <button data-tool="erase" aria-pressed="false" title="Quitar muros, diagonales y puertas">${icon("eraser", 15)}Borrar</button>
            <button data-tool="pin" aria-pressed="false" title="Clavar una nota">${icon("note", 15)}Nota</button>
            <button data-tool="portal" aria-pressed="false" title="Escalera o pasadizo: a otro mapa o a otro punto de este">${icon("stairs", 15)}Acceso</button>
            <button data-tool="draw" aria-pressed="false" title="Dibujar a mano alzada">${icon("scribble", 15)}Dibujar</button>
          </div>
          <div class="tool-set" id="terrain" aria-label="Terreno">
            <button data-brush="fog" title="Niebla: ver a través cuesta el triple">${icon("brush", 15)}Niebla</button>
            <button data-brush="dark" title="Oscuridad: no se ve a través">${icon("brush", 15)}Oscuridad</button>
            <button data-brush="lit" title="Luz fija: alumbra aunque el mapa esté a oscuras">${icon("brush", 15)}Luz</button>
            <button data-layer="rough" data-value="1" title="Terreno difícil: entrar cuesta el doble de movimiento">${icon("boot", 15)}Difícil</button>
            <button data-brush="none" title="Quitar terreno pintado y terreno difícil">${icon("eraser", 15)}</button>
          </div>
          <div class="tool-set" id="zones" aria-label="Zonas">
            <button data-layer="rooms" data-value="1" title="Sala: al entrar, la party ve la sala entera">${icon("room", 15)}Sala</button>
            <button data-layer="vis" data-value="show" title="Revelar: la party lo ve siempre">${icon("eye", 15)}Revelar</button>
            <button data-layer="vis" data-value="hide" title="Ocultar: la party no lo ve nunca">${icon("eyeOff", 15)}Ocultar</button>
            <button data-layer="zones" data-value="" title="Quitar salas y zonas reveladas u ocultas">${icon("eraser", 15)}</button>
          </div>
          <div class="tool-set draw-opts hidden" id="drawOpts" aria-label="Dibujo">
            ${DRAW_COLORS.map((c, i) => `<button class="swatch" data-color="${c}" aria-pressed="${i === 0}" title="Color" style="--sw:${c}"></button>`).join("")}
            <label class="check mini" title="Si no, solo lo ves tú"><input type="checkbox" id="drawParty" checked> Lo ve la party</label>
            <button data-draw="erase" title="Borrar un trazo">${icon("eraser", 15)}Trazo</button>
            <button data-draw="clear" title="Borrar todos los dibujos de este mapa">${icon("trash", 15)}Todo</button>
          </div>
          <div class="tool-set" id="shapes">
            <button data-shape="circle" title="Esfera o ráfaga">${icon("circle")}</button>
            <button data-shape="cone" title="Cono">${icon("cone")}</button>
            <button data-shape="line" title="Línea">${icon("line")}</button>
            <button data-shape="square" title="Cubo">${icon("square")}</button>
            <input type="number" id="shapeSize" min="5" max="200" step="5" value="20" title="Tamaño en pies" aria-label="Tamaño de la plantilla en pies">
            <button data-shape="clear" title="Quitar todas las plantillas">${icon("close")}</button>
          </div>
          <button class="btn sm" data-map="fit">Encajar</button>
          <button class="btn sm" data-map="zoomOut">−</button>
          <span class="pill" id="zoomLabel">100%</span>
          <button class="btn sm" data-map="zoomIn">+</button>
          <span class="spacer"></span>
          <span class="pill" id="mapHint"></span>
          <button class="btn sm" data-map="settings">Ajustes del mapa</button>
        </div>
        <div class="board" id="board"><canvas id="canvas"></canvas><div class="coords" id="coords"></div></div>
      </div>`;

    mapView = new MapView($("#canvas", pane), {
      mode: "dm",
      onMove: (id, x, y) => { op("token.move", { id, x, y, mapId: activeMap().id }); afterMove(id, x, y, { isDM: true }); },
      onMoveMany: moves => op("token.moveMany", { moves: moves.map(m => ({ ...m, mapId: activeMap().id })) }),
      onCell: (x, y) => placeHere(x, y),
      onToken: (id, e) => {
        if (e && (e.ctrlKey || e.metaKey)) {
          targetId = targetId === id ? null : id;
          mapView.target = targetId;
          return render();
        }
        tokenMenu(id);
      },
      onEdge: (key, tool) => paintEdge(key, tool),
      onPaintCell: (x, y, brush) => {
        const k = x + "," + y, mapId = activeMap().id;
        op("map.cells", { mapId, patch: { [k]: brush === "none" ? null : brush } });
        if (brush === "none") op("map.layer", { mapId, layer: "rough", patch: { [k]: null } });
      },
      onPaintLayer: (x, y, layer, value) => {
        const k = x + "," + y, mapId = activeMap().id;
        if (layer === "zones") {
          op("map.layer", { mapId, layer: "rooms", patch: { [k]: null } });
          op("map.layer", { mapId, layer: "vis", patch: { [k]: null } });
        } else op("map.layer", { mapId, layer, patch: { [k]: value || null } });
      },
      onDrawing: points => op("drawing.add", { mapId: activeMap().id, drawing: { points, color: mapView.drawColor, width: mapView.drawWidth, party: $("#drawParty") ? $("#drawParty").checked : true } }),
      onDrawingErase: id => op("drawing.remove", { mapId: activeMap().id, id }),
      onShape: shape => {
        op("shape.add", { mapId: activeMap().id, shape });
        if (afterArea) { lastArea = shape; const go = afterArea; afterArea = null; setTimeout(go, 350); }
      },
      onPin: (x, y) => editPin({ x, y }),
      onPortal: (x, y) => editPortal({ x, y }),
      onRoom: id => { const h = $("#mapHint"); if (h) h.textContent = roomHint(id); },
      onPing: (x, y) => op("ping", { x, y, mapId: activeMap().id }),
      onSelect: ids => { const h = $("#mapHint"); if (h) h.textContent = ids.length ? ids.length + " fichas elegidas" : ""; },
      onZoom: z => { const l = $("#zoomLabel"); if (l) l.textContent = Math.round(z * 100) + "%"; }
    });

    mapView.drawColor = DRAW_COLORS[0];
    mapView.drawWidth = 0.08;
    const pressOnly = b => pane.querySelectorAll("[data-tool],[data-shape],[data-brush],[data-layer],[data-draw]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    on(pane, "click", "[data-tool]", (e, b) => {
      mapTool = b.dataset.tool;
      arrivalFor = null;
      mapView.tool = mapTool;
      mapView.pending = null;
      pressOnly(b);
      $("#drawOpts", pane).classList.toggle("hidden", mapTool !== "draw");
      const hint = {
        token: "Arrastra para mover · recuadro para elegir varias · Alt+clic para señalar",
        measure: "Arrastra de una casilla a otra para medir",
        wall: "Arrastra por los bordes de las casillas",
        diag: "Arrastra por las casillas: la diagonal (\\ o /) la marca dónde empiezas",
        draw: "Dibuja con el ratón o el dedo; elige color y si lo ve la party",
        door: "Pulsa un borde o un muro diagonal: cerrada, abierta, sin puerta",
        erase: "Arrastra para quitar muros y puertas",
        pin: "Pulsa donde quieras clavar la nota",
        portal: "Pulsa donde esté la escalera"
      }[mapTool] || "";
      $("#mapHint", pane).textContent = hint;
    });

    on(pane, "click", "[data-layer]", (e, b) => {
      mapView.tool = "layer";
      mapView.layer = b.dataset.layer;
      /* Cada pulsación de «Sala» empieza una sala nueva */
      if (b.dataset.layer === "rooms" && b.dataset.value === "1") mapView.roomId = nextRoomId(activeMap());
      mapView.layerValue = b.dataset.value === "1" ? 1 : b.dataset.value;
      mapView.pending = null;
      pressOnly(b);
      $("#drawOpts", pane).classList.add("hidden");
      $("#mapHint", pane).textContent = {
        rough: "Pinta el terreno difícil: entrar en esas casillas cuesta el doble",
        rooms: roomHint(mapView.roomId),
        vis: b.dataset.value === "show" ? "Pinta lo que la party verá siempre" : "Pinta lo que la party no verá nunca, aunque lo tenga delante",
        zones: "Arrastra para quitar salas y zonas"
      }[mapView.layer] || "";
    });
    on(pane, "click", "[data-color]", (e, b) => {
      mapView.drawColor = b.dataset.color;
      pane.querySelectorAll("[data-color]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    });
    on(pane, "click", "[data-draw]", async (e, b) => {
      if (b.dataset.draw === "erase") {
        mapView.tool = mapView.tool === "drawErase" ? "draw" : "drawErase";
        b.setAttribute("aria-pressed", String(mapView.tool === "drawErase"));
        $("#mapHint", pane).textContent = mapView.tool === "drawErase" ? "Pulsa un trazo para borrarlo" : "Dibuja con el ratón o el dedo";
      } else if (await confirmBox("¿Borrar todos los dibujos de este mapa?", { okLabel: "Borrar" })) {
        op("drawing.clear", { mapId: activeMap().id });
      }
    });

    on(pane, "click", "[data-brush]", (e, b) => {
      mapView.tool = "cell";
      mapView.brush = b.dataset.brush;
      mapView.pending = null;
      pressOnly(b);
      $("#drawOpts", pane).classList.add("hidden");
      $("#mapHint", pane).textContent = b.dataset.brush === "none"
        ? "Arrastra para dejar las casillas limpias"
        : "Arrastra para pintar casillas; cambia lo que la party alcanza a ver";
    });

    on(pane, "click", "[data-shape]", (e, b) => {
      const kind = b.dataset.shape;
      if (kind === "clear") return op("shape.clear", { mapId: activeMap().id });
      shapeSize = clamp(+$("#shapeSize", pane).value || 20, 5, 200);
      mapView.tool = "shape";
      mapView.pending = { kind, size: shapeSize, width: 5, angle: 0, x: 0, y: 0, color: "#8878d8", label: shapeSize + " pies", party: true };
      pressOnly(b);
      $("#drawOpts", pane).classList.add("hidden");
      $("#mapHint", pane).textContent = "Pulsa para colocar; arrastra para girar";
    });
    on(pane, "click", "[data-map]", (e, b) => mapAction(b.dataset.map));
    $("#mapPick", pane).addEventListener("change", e => patchSession({ activeMapId: e.target.value }));
    $("#canvas", pane).addEventListener("pointermove", e => {
      const p = mapView.toCell(e.clientX, e.clientY);
      if (p) $("#coords", pane).textContent = `${p.x}, ${p.y}`;
    });
  }

  const pick = $("#mapPick", pane);
  pick.innerHTML = doc().maps.map(m => `<option value="${m.id}" ${m.id === map.id ? "selected" : ""}>${esc(m.name)}</option>`).join("");
  mapView.set({ map, chars: chars(), session: session(), you: null });
}

/* Poner una ficha en el tablero: al pulsar en una casilla vacía se ofrece a
   quien todavía no esté puesto en este mapa. */
function placeHere(x, y) {
  const map = activeMap();
  const out = chars().filter(c => c.mapId !== map.id || c.mx === null);
  if (!out.length) return toast("Ya están todos colocados en este mapa");
  const body = el(`<div class="pick-list">
    ${out.map(c => `<button class="pick" data-place="${c.id}">
      <span class="avatar" style="--tone:${esc(c.color)};width:30px;height:30px;font-size:11px">${initials(c.name)}</span>
      <span><b>${esc(c.name)}</b><br><small>${esc(c.kind === "pc" ? [c.className, "nivel " + c.level].filter(Boolean).join(" · ") : c.sizeType || "criatura")}</small></span>
    </button>`).join("")}
    ${out.length > 1 ? '<button class="btn sm" data-place-all>Colocar aquí a todos los que faltan</button>' : ""}
  </div>`);
  const m = modal({ title: `Colocar en ${x}, ${y}`, body, actions: [{ label: "Cerrar" }] });
  on(body, "click", "[data-place]", (e, b) => { op("token.move", { id: b.dataset.place, x, y, mapId: map.id }); m.close(); });
  on(body, "click", "[data-place-all]", () => {
    op("token.moveMany", { moves: out.map((c, i) => ({ id: c.id, x: x + (i % 4), y: y + Math.floor(i / 4), mapId: map.id })) });
    m.close();
  });
}

/* Menú de una ficha del tablero */
function tokenMenu(id) {
  const c = byId(id);
  if (!c) return;
  const body = el(`<div class="row" style="flex-direction:column">
    <button class="btn" data-tk="target">${targetId === id ? "Dejar de apuntarle" : "Apuntar con los ataques"}</button>
    <button class="btn" data-tk="attack">Atacar con ${esc(c.name)}</button>
    <button class="btn" data-tk="focus">Centrar la cámara de la party aquí</button>
    <button class="btn" data-tk="conditions">Estados</button>
    <button class="btn" data-tk="edit">Abrir la ficha</button>
    ${c.kind === "monster" ? `<button class="btn" data-tk="hide">${c.hidden ? "Enseñar a la party" : "Ocultar a la party"}</button>` : ""}
    <button class="btn danger" data-tk="off">Sacar del mapa</button>
  </div>`);
  const m = modal({ title: c.name, body, actions: [{ label: "Cerrar" }] });
  on(body, "click", "[data-tk]", (e, b) => {
    const what = b.dataset.tk;
    m.close();
    if (what === "target") { targetId = targetId === id ? null : id; mapView.target = targetId; return render(); }
    if (what === "attack") return attack(c);
    if (what === "focus") { patchSession({ focusId: id }); return toast("La cámara sigue a " + c.name); }
    if (what === "conditions") return openConditions(c);
    if (what === "edit") return c.kind === "monster" ? openMonsterInstance(c) : openCharEditor(c, {});
    if (what === "hide") return patchChar(c.id, { hidden: !c.hidden });
    if (what === "off") return patchChar(c.id, { mapId: "", mx: null, my: null });
  });
}

/* ---------- Notas clavadas y accesos ---------- */
function editPin(seed) {
  const map = activeMap();
  const existing = (map.pins || []).find(p => p.x === seed.x && p.y === seed.y);
  const pin = normalizePin(existing || seed);
  const body = el(`<div>
    <label class="field"><span>Nota</span><textarea name="text" placeholder="Trampa de dardos: CD 13 de Destreza">${esc(pin.text)}</textarea></label>
    <div class="cols2">
      <label class="field"><span>Qué es</span><select name="kind">
        ${PIN_KINDS.map(([k, l]) => `<option value="${k}" ${k === pin.kind ? "selected" : ""}>${l}</option>`).join("")}
      </select></label>
      <label class="check" style="align-self:end"><input type="checkbox" name="party" ${pin.party ? "checked" : ""}> También la ve la party</label>
    </div>
    <p class="prose" style="font-size:12px">Cuando un personaje pise esta casilla te saltará el aviso con la nota, la vea la party o no.</p>
  </div>`);
  modal({
    title: existing ? "Nota del mapa" : "Clavar una nota",
    body,
    actions: [
      ...(existing ? [{ label: "Quitar", tone: "danger", run: () => op("pin.set", { mapId: map.id, pin, remove: true }) }] : []),
      { label: "Cancelar" },
      { label: "Guardar", tone: "primary", run: host => {
        const v = n => host.querySelector(`[name="${n}"]`);
        op("pin.set", { mapId: map.id, pin: { ...pin, text: v("text").value, kind: v("kind").value, party: v("party").checked } });
      } }
    ]
  });
}

/* Accesos: a otro mapa o a otro punto del mismo (un pasadizo, una
   trampilla, un círculo de teletransporte). Al pisarlo puede preguntar quién
   cruza, llevar solo a quien lo pisa o no hacer nada (solo marca). */
let arrivalFor = null;     // acceso a medio editar mientras se elige la llegada en el mapa
function editPortal(seed) {
  const map = activeMap();
  if (arrivalFor) {
    const draft = { ...arrivalFor, toX: seed.x, toY: seed.y };
    arrivalFor = null;
    $("#mapHint") && ($("#mapHint").textContent = "");
    return editPortal({ draft });
  }
  const existing = seed.draft ? null : (map.portals || []).find(p => p.x === seed.x && p.y === seed.y);
  const portal = normalizePortal(seed.draft || existing || { ...seed, toMap: map.id });
  const isNew = !existing && !(seed.draft && (map.portals || []).some(p => p.id === seed.draft.id));
  const mode = !portal.auto ? "none" : portal.ask ? "ask" : "one";
  const body = el(`<div>
    <div class="cols2">
      <label class="field"><span>Nombre</span><input name="label" value="${esc(portal.label)}"></label>
      <label class="field"><span>Lleva a</span><select name="toMap">
        <option value="${map.id}" ${!portal.toMap || portal.toMap === map.id ? "selected" : ""}>Este mismo mapa</option>
        ${doc().maps.filter(m => m.id !== map.id).map(m => `<option value="${m.id}" ${m.id === portal.toMap ? "selected" : ""}>${esc(m.name)}</option>`).join("")}
      </select></label>
      <label class="field"><span>Casilla de llegada X</span><input name="toX" type="number" min="0" value="${portal.toX ?? ""}" placeholder="misma"></label>
      <label class="field"><span>Casilla de llegada Y</span><input name="toY" type="number" min="0" value="${portal.toY ?? ""}" placeholder="misma"></label>
    </div>
    <button type="button" class="btn sm" data-pick-arrival>${withIcon("target", "Marcar la llegada en el mapa", 15)}</button>
    <label class="field" style="margin-top:12px"><span>Al pisarlo</span><select name="mode">
      <option value="ask" ${mode === "ask" ? "selected" : ""}>Preguntar quién cruza (puede ir la party entera)</option>
      <option value="one" ${mode === "one" ? "selected" : ""}>Cruza solo quien lo pisa</option>
      <option value="none" ${mode === "none" ? "selected" : ""}>Nada: solo lo marca</option>
    </select></label>
    <p class="prose small"><span>Si lleva a otro mapa, la mesa cambia de plano con quien cruce.</span></p>
  </div>`);
  const pickBtn = body.querySelector("[data-pick-arrival]");
  const syncPick = () => { pickBtn.disabled = body.querySelector('[name="toMap"]').value !== map.id; };
  body.querySelector('[name="toMap"]').addEventListener("change", syncPick);
  syncPick();
  const read = host => {
    const v = n => host.querySelector(`[name="${n}"]`);
    const m = v("mode").value;
    return {
      ...portal, label: v("label").value || "Escalera", toMap: v("toMap").value,
      toX: v("toX").value === "" ? null : +v("toX").value,
      toY: v("toY").value === "" ? null : +v("toY").value,
      auto: m !== "none", ask: m === "ask"
    };
  };
  const win = modal({
    title: isNew ? "Nuevo acceso" : "Acceso",
    body,
    actions: [
      ...(!isNew ? [{ label: "Quitar", tone: "danger", run: () => op("portal.set", { mapId: map.id, portal, remove: true }) }] : []),
      { label: "Cancelar" },
      { label: "Guardar", tone: "primary", run: host => {
        const out = read(host);
        if (out.toMap === map.id && (out.toX === null || out.toY === null || (out.toX === out.x && out.toY === out.y))) {
          toast("Marca a qué casilla de este mapa lleva", "bad");
          return false;
        }
        op("portal.set", { mapId: map.id, portal: out });
      } }
    ]
  });
  pickBtn.addEventListener("click", () => {
    arrivalFor = read(body);
    win.close();
    const h = $("#mapHint");
    if (h) h.textContent = "Pulsa la casilla de llegada";
    toast("Pulsa en el mapa la casilla de llegada");
  });
}

const roomHint = id => `Sala ${id}: pinta a trazos, todo es la misma sala. Empieza dentro de otra para seguirla, o pulsa «Sala» otra vez para una nueva`;

function paintEdge(key, tool) {
  const map = activeMap();
  const now = map.edges[key];
  const value = tool === "erase" ? null : tool === "wall" ? "wall"
    : tool === "door" ? (now === "door" ? "doorOpen" : now === "doorOpen" ? null : "door") : null;
  op("map.edges", { mapId: map.id, patch: { [key]: value } });
}

function mapAction(what) {
  const map = activeMap();
  if (what === "zoomIn") return mapView.setZoom(mapView.zoom * 1.25);
  if (what === "zoomOut") return mapView.setZoom(mapView.zoom / 1.25);
  if (what === "fit") return mapView.setZoom(1);
  if (what === "settings") return openMapSettings(map);
}

function openMapSettings(map) {
  const body = el(`<div>
    <div class="cols2">
      <label class="field"><span>Nombre</span><input name="name" value="${esc(map.name)}"></label>
      <label class="field"><span>Radio de visión (casillas)</span><input name="radius" type="number" min="1" max="40" value="${map.radius}"></label>
      <label class="field"><span>Columnas</span><input name="cols" type="number" min="5" max="90" value="${map.cols}"></label>
      <label class="field"><span>Filas</span><input name="rows" type="number" min="5" max="70" value="${map.rows}"></label>
    </div>
    <div class="row" style="margin-bottom:12px">
      <button type="button" class="btn sm" id="imgBtn">Imagen de fondo</button>
      <button type="button" class="btn sm" id="fitGrid">Cuadrar cuadrícula con la imagen</button>
      <input type="file" id="imgFile" accept="image/*" hidden>
    </div>
    <fieldset>
      <legend>Qué ve la party</legend>
      <label class="check"><input type="checkbox" name="show" ${session().showMapToParty ? "checked" : ""}> Enseñar este mapa en la pantalla de la party</label>
      <label class="check" style="margin-top:8px"><input type="checkbox" name="reveal" ${session().revealAll ? "checked" : ""}> Revelar el mapa entero</label>
      <label class="check" style="margin-top:8px"><input type="checkbox" name="remember" ${map.remember ? "checked" : ""}> Recordar lo explorado</label>
      <label class="check" style="margin-top:8px"><input type="checkbox" name="grid" ${map.grid ? "checked" : ""}> Dibujar la cuadrícula</label>
      <label class="check" style="margin-top:8px"><input type="checkbox" name="move" ${session().allowPlayerMove ? "checked" : ""}> Dejar que cada jugador mueva su ficha</label>
      <label class="check" style="margin-top:8px"><input type="checkbox" name="dark" ${map.dark ? "checked" : ""}> Mapa a oscuras (solo se ve con antorchas o visión en la oscuridad)</label>
      <label class="check" style="margin-top:8px"><input type="checkbox" name="playerZoom" ${map.playerZoom ? "checked" : ""}> Dejar que los jugadores se acerquen y alejen</label>
      <label class="check" style="margin-top:8px"><input type="checkbox" name="range" ${session().showMoveRange !== false ? "checked" : ""}> Pintar el alcance al arrastrar una ficha</label>
      <label class="check" style="margin-top:8px"><input type="checkbox" name="foehp" ${session().showFoeHP ? "checked" : ""}> Enseñar a la party cuánta vida les queda a los enemigos</label>
      <div class="cols2" style="margin-top:12px">
        <label class="field"><span>Cámara</span>
          <select name="camera">
            <option value="full" ${map.camera === "full" ? "selected" : ""}>Todo el mapa</option>
            <option value="follow" ${map.camera === "follow" ? "selected" : ""}>Centrada en el personaje</option>
          </select></label>
        <label class="field"><span>Casillas a lo ancho al seguir</span>
          <input name="followSpan" type="number" min="4" max="60" value="${map.followSpan}"></label>
        <label class="field"><span>Pies por casilla</span>
          <input name="feet" type="number" min="1" max="100" value="${map.feet}"></label>
        <label class="field"><span>Diagonales</span>
          <select name="diagonals">
            <option value="5e" ${map.diagonals !== "alt" ? "selected" : ""}>Cada una, 5 pies</option>
            <option value="alt" ${map.diagonals === "alt" ? "selected" : ""}>Variante 5-10-5</option>
          </select></label>
      </div>
    </fieldset>
    <div class="row">
      <button type="button" class="btn sm" id="resetFog">Restablecer niebla</button>
      <button type="button" class="btn sm" id="clearWalls">Vaciar muros</button>
      <button type="button" class="btn sm" id="clearCells">Quitar niebla y oscuridad</button>
      <button type="button" class="btn sm" id="frameWalls">Cerrar contorno</button>
    </div>
    <div class="row" style="margin-top:10px">
      <button type="button" class="btn sm" id="newMap">Mapa nuevo</button>
      <button type="button" class="btn sm danger" id="dropMap">Borrar este mapa</button>
    </div>
  </div>`);

  const file = body.querySelector("#imgFile");
  body.querySelector("#imgBtn").addEventListener("click", () => file.click());
  file.addEventListener("change", async () => {
    if (!file.files[0]) return;
    try {
      const { blob, w, h } = await shrinkImage(file.files[0], 2200);
      const imageId = await uploadImage(blob);
      const cols = map.cols;
      patchMap(map.id, { imageId, imageW: w, imageH: h, rows: clamp(Math.round(cols / (w / h)), 5, 70) });
      toast("Plano cargado", "good");
    } catch (err) { toast(err.message, "bad"); }
  });
  body.querySelector("#fitGrid").addEventListener("click", () => {
    const m = activeMap();
    if (!m.imageW) return toast("Este mapa no tiene imagen de fondo", "bad");
    patchMap(m.id, { rows: clamp(Math.round(m.cols / (m.imageW / m.imageH)), 5, 70) });
    toast("Cuadrícula ajustada a la imagen");
  });
  body.querySelector("#resetFog").addEventListener("click", () => patchMap(map.id, { explored: [] }));
  body.querySelector("#clearWalls").addEventListener("click", () => patchMap(map.id, { edges: {} }));
  body.querySelector("#clearCells").addEventListener("click", () => patchMap(map.id, { cells: {} }));
  body.querySelector("#frameWalls").addEventListener("click", () => {
    const edges = { ...map.edges };
    for (let x = 0; x < map.cols; x++) { edges[`${x},0,h`] = "wall"; edges[`${x},${map.rows},h`] = "wall"; }
    for (let y = 0; y < map.rows; y++) { edges[`0,${y},v`] = "wall"; edges[`${map.cols},${y},v`] = "wall"; }
    patchMap(map.id, { edges });
  });
  body.querySelector("#newMap").addEventListener("click", () => {
    op("map.add", { map: normalizeMap({ name: "Mapa " + (doc().maps.length + 1) }) });
    toast("Mapa creado", "good");
  });
  body.querySelector("#dropMap").addEventListener("click", async () => {
    if (await confirmBox("¿Borrar este mapa y todo lo que tiene dibujado?")) op("map.remove", { id: map.id });
  });

  modal({
    title: "Ajustes de " + map.name, body, wide: true,
    actions: [{ label: "Cerrar" }, {
      label: "Guardar", tone: "primary",
      run: host => {
        const v = n => host.querySelector(`[name="${n}"]`);
        patchMap(map.id, {
          name: v("name").value || "Mapa",
          radius: +v("radius").value || 5,
          cols: +v("cols").value || map.cols,
          rows: +v("rows").value || map.rows,
          remember: v("remember").checked,
          grid: v("grid").checked,
          camera: v("camera").value,
          followSpan: +v("followSpan").value || 14,
          dark: v("dark").checked,
          playerZoom: v("playerZoom").checked,
          feet: +v("feet").value || 5,
          diagonals: v("diagonals").value
        });
        patchSession({
          showMapToParty: v("show").checked,
          revealAll: v("reveal").checked,
          allowPlayerMove: v("move").checked,
          showMoveRange: v("range").checked,
          showFoeHP: v("foehp").checked
        });
      }
    }]
  });
}

/* ---------- Menú ---------- */
function openMenu() {
  const item = (key, ico, title, sub, tone = "") => `<button class="menu-item ${tone}" data-menu="${key}">
      <span class="menu-ico">${icon(ico, 20)}</span>
      <span class="menu-text"><b>${title}</b><small>${sub}</small></span>
    </button>`;
  const body = el(`<div class="menu-list">
    <h4 class="menu-sec">En la mesa</h4>
    ${item("screen", "tv", "Pantalla de la party", "Abrir la tele o el proyector y elegir qué enseña")}
    ${item("link", "wifi", "Cómo entran mis jugadores", "La dirección y el código para unirse")}
    ${item("handout", "image", "Enseñar una imagen", "Un mapa del tesoro, una carta, un retrato")}
    ${item("ask", "dice", "Pedir una tirada", "A quién, qué y con qué dificultad")}
    <h4 class="menu-sec">Partida</h4>
    ${item("export", "download", "Guardar copia", "Descarga un archivo con toda la partida")}
    ${item("import", "upload", "Cargar una copia", "Sustituye la partida por la de un archivo")}
    <div class="menu-item static"><span class="menu-ico">${icon("lang", 20)}</span><span class="menu-text"><b>Idioma</b><small>Solo cambia en este aparato</small></span><span id="menuLang"></span></div>
    ${item("leave", "exit", "Salir de la sesión", "Vuelves a la pantalla de entrada", "danger")}
    <input type="file" id="handoutFile" accept="image/*" hidden>
    <input type="file" id="importFile" accept="application/json" hidden>
  </div>`);
  const m = modal({ title: "Partida", body, actions: [{ label: "Cerrar" }] });
  body.querySelector("#menuLang").appendChild(langPicker());
  const hand = body.querySelector("#handoutFile");
  hand.addEventListener("change", async () => {
    if (!hand.files[0]) return;
    try {
      const { blob } = await shrinkImage(hand.files[0], 1600);
      const handoutId = await uploadImage(blob);
      patchSession({ handoutId, handoutText: hand.files[0].name.replace(/\.[a-z0-9]+$/i, "") });
      toast("La mesa está viendo la imagen", "good");
      m.close();
    } catch (err) { toast(err.message, "bad"); }
  });

  const file = body.querySelector("#importFile");
  file.addEventListener("change", async () => {
    if (!file.files[0]) return;
    try {
      const data = JSON.parse(await file.files[0].text());
      if (!await confirmBox("Cargar esta copia reemplaza la partida actual. ¿Seguimos?")) return;
      op("doc.replace", { doc: data.doc || data });
      toast("Partida cargada", "good");
      m.close();
    } catch { toast("Ese archivo no parece una copia de Mesa", "bad"); }
  });

  on(body, "click", "[data-menu]", (e, b) => {
    const what = b.dataset.menu;
    if (what === "export") {
      const blob = new Blob([JSON.stringify({ doc: doc() }, null, 1)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `mesa-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    }
    if (what === "import") file.click();
    if (what === "handout") {
      if (session().handoutId) {
        modal({ title: "Ya estás enseñando una imagen", body: '<p class="prose">Puedes cambiarla o guardarla.</p>',
          actions: [{ label: "Guardar la imagen", run: () => patchSession({ handoutId: "", handoutText: "" }) }, { label: "Cambiarla", tone: "primary", run: () => hand.click() }] });
      } else hand.click();
    }
    if (what === "ask") { m.close(); askForRoll(); }
    if (what === "screen") { m.close(); openScreenPanel(); }
    if (what === "link") {
      m.close();
      showJoinInfo();
    }
    if (what === "leave") leave()
  });
}

/* Cómo entran los jugadores. Desde el ordenador del DM la dirección es
   «localhost», que en el móvil de otro no lleva a ningún sitio: se enseña la
   de la red, que es la que sirve, con un botón para copiarla. */
async function showJoinInfo() {
  const local = /^(localhost|127\.|\[::1\])/.test(location.hostname);
  const info = await lobby().catch(() => ({}));
  let addrs = [location.origin];
  if (local && info.addresses && info.addresses.length) addrs = info.addresses;
  const web = info.publicUrl || (!local && location.protocol === "https:" ? location.origin : "");
  const addr = a => `<div class="addr-row"><code class="addr" data-keep>${esc(a)}</code>
      <button class="btn sm" data-copy="${esc(a)}" title="Copiar">${withIcon("copy", "Copiar", 16)}</button></div>`;
  const t = info.tunnel || {};
  const tunnelNote = !web && t.state === "opening"
    ? `<div class="join-block"><h4 class="join-h">${icon("globe", 16)}<span>Desde cualquier sitio</span></h4>
        <p class="prose small"><span>Abriendo la dirección de internet… Vuelve a abrir esta ventana en unos segundos.</span></p></div>`
    : !web && t.state === "failed"
      ? `<div class="join-block warn"><h4 class="join-h">${icon("globe", 16)}<span>No se ha podido abrir la dirección de internet</span></h4>
          <p class="prose small"><span>${esc(t.error || "")}</span></p>
          <p class="prose small"><span>La ventana del servidor cuenta el detalle. Mientras, se puede jugar en la misma wifi.</span></p></div>`
      : "";
  const body = el(`<div class="join-info">
    ${tunnelNote}
    ${web ? `<div class="join-block">
      <h4 class="join-h">${icon("globe", 16)}<span>Desde cualquier sitio</span></h4>
      ${addr(web)}
      <p class="prose small">Sirve desde casa de cada uno, con datos o con cualquier wifi, y se puede instalar como aplicación. Cualquiera con la dirección puede entrar: pásala solo a tu grupo, y cierra la mesa cuando estéis todos.</p>
    </div>` : ""}
    <div class="join-block">
      <h4 class="join-h">${icon("wifi", 16)}<span>${web ? "En la misma wifi" : "En la misma wifi que este ordenador"}</span></h4>
      ${addrs.map(addr).join("")}
      ${addrs.length > 1 ? `<p class="prose small">Hay varias redes en este ordenador: la buena suele empezar por 192.168.</p>` : ""}
    </div>
    <p class="prose small">${icon("user", 14)}<span>En la entrada eligen <b>Jugador</b>, escriben su nombre y se quedan con su personaje.</span></p>
    ${web || t.state === "opening" || t.state === "failed" ? "" : `<p class="prose small">${icon("globe", 14)}<span>Para jugar cada uno desde su casa, arranca Mesa con «Jugar por internet». Lo explica el README.</span></p>`}
  </div>`);
  on(body, "click", "[data-copy]", async (e, b) => {
    try { await navigator.clipboard.writeText(b.dataset.copy); toast("Dirección copiada", "good"); }
    catch { toast("No se pudo copiar: selecciónala y cópiala a mano", "bad"); }
  });
  modal({ title: "Cómo entran tus jugadores", body, actions: [{ label: "Entendido", tone: "primary" }] });
}

/* La tele de la mesa: una sesión aparte, que el DM gobierna desde aquí. */
function openScreenPanel() {
  const connected = store.presence.filter(p => p.role === "screen");
  const body = el(`<div>
    <p class="prose" style="font-size:13px">
      ${connected.length
        ? `Hay <b>${connected.length}</b> pantalla${connected.length > 1 ? "s" : ""} conectada${connected.length > 1 ? "s" : ""}: ${esc(connected.map(p => p.name).join(", "))}.`
        : "Ahora mismo no hay ninguna pantalla conectada."}
    </p>
    <div class="screen-open">
      <button type="button" class="btn primary" data-open="window">Abrir en una ventana aparte</button>
      ${"getScreenDetails" in window ? `<button type="button" class="btn" data-open="other">Abrir en el otro monitor</button>` : ""}
      <button type="button" class="btn" data-open="tab">Abrir en otra pestaña</button>
    </div>
    <p class="prose" style="font-size:12px;margin:0 0 14px">
      Para la tele: arrastra esa ventana al monitor o al proyector, o compártela
      con Chromecast desde el menú del navegador (Enviar… → Enviar pestaña).
      Doble clic dentro la pone a pantalla completa.
    </p>
    <fieldset>
      <legend>Qué enseña</legend>
      <label class="check"><input type="checkbox" name="map" ${session().showMapToParty ? "checked" : ""}> El mapa</label>
      <label class="check" style="margin-top:8px"><input type="checkbox" name="hp" ${session().showPartyHP ? "checked" : ""}> Los puntos de vida exactos de la party</label>
      <label class="check" style="margin-top:8px"><input type="checkbox" name="foehp" ${session().showFoeHP ? "checked" : ""}> Cómo de heridos están los enemigos</label>
      <label class="check" style="margin-top:8px"><input type="checkbox" name="reveal" ${session().revealAll ? "checked" : ""}> El mapa entero, sin niebla</label>
    </fieldset>
    <p class="prose" style="font-size:12px">
      La tele entra con su propia sesión: no hereda la tuya y no puede tocar nada.
      Si la abres en este mismo ordenador, seguirás siendo el DM en esta ventana.
      Desde la tele, el botón de salir vuelve al menú.
    </p>
  </div>`);
  const win = modal({
    title: "Pantalla de la party", body,
    actions: [{ label: "Cerrar" }, {
      label: "Guardar", tone: "primary",
      run: host => {
        const v = n => host.querySelector(`[name="${n}"]`).checked;
        patchSession({ showMapToParty: v("map"), showPartyHP: v("hp"), showFoeHP: v("foehp"), revealAll: v("reveal") });
      }
    }]
  });
  body.querySelectorAll("[data-open]").forEach(b => b.addEventListener("click", () => {
    openScreenWindow(b.dataset.open);
    win.close();
  }));
}

/* La tele es otra ventana del mismo navegador. Una ventana aparte se puede
   arrastrar al segundo monitor o enviar al Chromecast sin llevarse la vista
   del DM; con la API de pantallas de Chrome se coloca ya en el otro monitor. */
async function openScreenWindow(where) {
  const url = new URL("./?role=screen", location.href).href;
  if (where === "tab") return window.open(url, "_blank");
  let features = "popup,width=1280,height=720";
  if (where === "other") {
    try {
      const details = await window.getScreenDetails();
      const other = details.screens.find(x => x !== details.currentScreen);
      if (other) features = `popup,left=${other.availLeft},top=${other.availTop},width=${other.availWidth},height=${other.availHeight}`;
      else toast("Solo se ve un monitor conectado: se abre en una ventana aparte");
    } catch { toast("El navegador no ha dado permiso para ver los otros monitores"); }
  }
  const w = window.open(url, "mesa-screen", features);
  if (!w) toast("El navegador ha bloqueado la ventana emergente: permítela para este sitio", "bad");
}

/* Pedir una tirada: al jugador le sale un botón grande en su móvil. */
function askForRoll() {
  const body = el(`<div>
    <label class="field"><span>Qué pides</span><input name="label" placeholder="Salvación de Destreza" value="Percepción"></label>
    <div class="cols2">
      <label class="field"><span>Fórmula</span><input name="formula" value="1d20"></label>
      <label class="field"><span>Dificultad (opcional)</span><input name="dc" type="number" placeholder="13"></label>
    </div>
    <p class="prose" style="font-size:12px;margin:6px 0">¿A quién?</p>
    <div class="cond-grid">
      ${pcs().map(c => `<label><input type="checkbox" value="${c.id}" checked>${esc(c.name)}</label>`).join("")}
    </div>
  </div>`);
  modal({
    title: "Pedir una tirada", body, wide: true,
    actions: [{ label: "Cancelar" }, {
      label: "Pedirla", tone: "primary",
      run: host => {
        const v = n => host.querySelector(`[name="${n}"]`).value;
        const ids = [...host.querySelectorAll("input[type=checkbox]:checked")].map(i => i.value);
        if (!ids.length) return false;
        op("request.set", { request: { ids, label: v("label") || "Tirada", formula: v("formula") || "1d20", dc: +v("dc") || 0 } });
        tellTable(`El DM pide ${v("label")}${v("dc") ? " (CD " + v("dc") + ")" : ""}`);
      }
    }]
  });
}

/* ---------- Atajos ---------- */
function bindKeys() {
  document.addEventListener("keydown", e => {
    if (e.target.matches("input, textarea, select")) return;
    const meta = e.ctrlKey || e.metaKey;
    if (meta && e.key.toLowerCase() === "k") { e.preventDefault(); toggleCombat(); }
    else if (meta && e.key.toLowerCase() === "b") { e.preventDefault(); toggleDrawer(); }
    else if (meta && e.key.toLowerCase() === "n") { e.preventDefault(); openCharEditor(null, {}); }
    else if (e.key === " " || e.key === "Enter" || (meta && e.key === "ArrowRight")) { e.preventDefault(); step(1); }
    else if (meta && e.key.toLowerCase() === "z") { e.preventDefault(); op("undo"); toast("Deshecho"); }
    else if (e.key === "Escape" && mapView) { mapView.selection.clear(); mapView.pending = null; mapView.draw(); }
    else if (meta && e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  });
}
