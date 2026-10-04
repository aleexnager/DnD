/* Las pestañas de la ficha, como en D&D Beyond: Acciones, Conjuros, Equipo,
   Rasgos y Notas. Todo son listas y casi todo se toca para tirar. Las usan la
   ficha del jugador y la tarjeta desplegada del DM, cada una con su pestaña
   abierta; las dos reenvían aquí los clics con handleSheetAct. */

import { esc, lines, sign } from "./util.js";
import { FEATURE_SOURCES } from "./schema.js";
import { attacksOf, shapeLabel } from "./attacks.js";
import { castStats, spellTags, openCast } from "./spellbook.js";
import { throwDice } from "./dice-panel.js";
import { patchChar } from "./net.js";
import { icon } from "./icons.js";

export const SHEET_TABS = [["acciones", "Acciones"], ["conjuros", "Conjuros"], ["equipo", "Equipo"], ["rasgos", "Rasgos"], ["notas", "Notas"]];

/* Lo que cualquiera puede hacer en su turno, con su resumen del reglamento */
const COMBAT_ACTIONS = [
  ["Atacar", "Un ataque con arma o sin armas (más si tienes Ataque adicional)."],
  ["Lanzar un conjuro", "Un conjuro cuyo tiempo de lanzamiento sea 1 acción."],
  ["Correr", "Ganas tanto movimiento extra como tu velocidad."],
  ["Destrabarse", "Tu movimiento no provoca ataques de oportunidad este turno."],
  ["Esquivar", "Desventaja para quien te ataque; ventaja en salvaciones de DES."],
  ["Ayudar", "Un aliado tiene ventaja en su próxima prueba o ataque."],
  ["Esconderse", "Prueba de Destreza (Sigilo) para ocultarte."],
  ["Preparar", "Eliges un desencadenante y reaccionas cuando ocurra."],
  ["Buscar", "Prueba de Sabiduría (Percepción) o Inteligencia (Investigación)."],
  ["Usar un objeto", "Interactuar con un segundo objeto, o usar uno que lo pida."],
  ["Agarrar", "Prueba de Atletismo contra Atletismo o Acrobacias del objetivo."],
  ["Empujar", "Derribar o apartar 5 pies a una criatura con Atletismo."]
];
const SAVE_ABBR = { str: "FUE", dex: "DES", con: "CON", int: "INT", wis: "SAB", cha: "CAR" };
const levelName = n => n === 0 ? "Trucos" : `Nivel ${n}`;
const weightOf = c => c.items.reduce((s, it) => s + it.qty * it.weight, 0);
const fmt = n => Number.isInteger(n) ? String(n) : n.toFixed(1);

/* La tabla de ataques: el golpe y el daño se tocan para tirar */
export function attackTableHTML(c) {
  const list = attacksOf(c);
  return list.length ? `<div class="sheet-table atk-table">
      <div class="st-head"><span>Ataque</span><span>Alcance</span><span>Golpe/CD</span><span>Daño</span></div>
      ${list.map((a, i) => {
        const [ab, dc] = a.save ? a.save.split(" ") : [];
        const sub = [a.type, a.level ? `nivel ${a.level}` : "", a.shape ? shapeLabel(a) : "", a.note].filter(Boolean).join(" · ");
        return `<div class="st-row">
          <span class="st-name"><b>${esc(a.name)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</span>
          <span class="st-range">${esc(a.range || "—")}</span>
          ${a.save ? `<span class="st-pill dc"><b>CD ${esc(dc)}</b><small>${SAVE_ABBR[ab] || ""}</small></span>`
            : `<button class="st-pill" data-act="atkHit" data-i="${i}" title="Tirar el ataque"><b>${sign(a.atk)}</b></button>`}
          ${a.damage ? `<button class="st-pill dmg" data-act="atkDmg" data-i="${i}" title="Tirar el daño"><b>${esc(a.damage)}</b></button>` : "<span class=\"st-range\">—</span>"}
        </div>`;
      }).join("")}
    </div>` : "";
}

function actionsHTML(c) {
  return `
    ${attackTableHTML(c) || `<p class="sheet-empty">Sin ataques apuntados. Añádelos al editar la ficha.</p>`}
    <h4 class="sheet-sub">Acciones en combate</h4>
    <div class="std-acts">${COMBAT_ACTIONS.map(([n, hint]) => `<span class="std-act" title="${esc(hint)}">${n}</span>`).join("")}</div>`;
}

function spellsHTML(c) {
  const st = castStats(c);
  const by = {};
  for (const sp of c.spellbook) (by[sp.level] = by[sp.level] || []).push(sp);
  const levels = Object.keys(by).map(Number).sort((a, b) => a - b);
  return `
    <div class="spell-stats">
      <span class="sp-stat"><small>Característica</small><b>${SAVE_ABBR[st.ability] || "—"}</b></span>
      <span class="sp-stat"><small>Ataque</small><b>${sign(st.atk)}</b></span>
      <span class="sp-stat"><small>CD de salvación</small><b>${st.dc}</b></span>
    </div>
    ${levels.length ? levels.map(l => `
      <div class="sheet-group">
        <h4 class="sheet-sub">${levelName(l)}${l > 0 && c.slots[l - 1] ? `<span class="sub-slots">${Array.from({ length: c.slots[l - 1] },
          (_, j) => `<i class="${j < c.slotsUsed[l - 1] ? "used" : ""}"></i>`).join("")}</span>` : ""}</h4>
        ${by[l].map(sp => `<div class="spell-row">
          <span class="st-name"><b>${esc(sp.name)}</b><small>${esc([sp.time, sp.range].filter(Boolean).join(" · "))}</small>
            ${spellTags(sp) ? `<small>${esc(spellTags(sp))}</small>` : ""}</span>
          <button class="btn sm" data-act="castSpell" data-spell="${esc(sp.id)}">Lanzar</button>
        </div>`).join("")}
      </div>`).join("")
    : `<p class="sheet-empty">No conoce ningún conjuro todavía.</p>`}
    <button class="btn sm sheet-more" data-act="spells">Gestionar conjuros</button>`;
}

function itemsHTML(c) {
  if (!c.items.length) return `<p class="sheet-empty">Sin equipo apuntado. Añádelo al editar la ficha.</p>`;
  return `
    <div class="sheet-table item-table">
      <div class="st-head"><span class="st-eq" title="Equipado">${icon("check", 14)}<span class="sr">Equipado</span></span><span>Objeto</span><span>Cant.</span><span>Peso</span></div>
      ${c.items.map((it, i) => `<div class="st-row">
        <button class="equip ${it.equipped ? "on" : ""}" data-act="itemEquip" data-i="${i}" aria-pressed="${it.equipped}"
          title="${it.equipped ? "Equipado" : "Sin equipar"}" aria-label="${it.equipped ? "Equipado" : "Sin equipar"}"></button>
        <span class="st-name"><b>${esc(it.name)}</b>${it.note ? `<small>${esc(it.note)}</small>` : ""}</span>
        <span class="st-num tnum">${it.qty}</span>
        <span class="st-num tnum">${it.weight ? fmt(it.qty * it.weight) + " lb" : "—"}</span>
      </div>`).join("")}
    </div>
    <p class="sheet-total"><span>Peso total</span><b class="tnum">${fmt(weightOf(c))} lb</b></p>`;
}

function featuresHTML(c) {
  if (!c.features.length) return `<p class="sheet-empty">Sin rasgos apuntados. Añádelos al editar la ficha.</p>`;
  return FEATURE_SOURCES.filter(src => c.features.some(f => f.source === src)).map(src => `
    <div class="sheet-group">
      <h4 class="sheet-sub">${src}</h4>
      ${c.features.filter(f => f.source === src).map(f => `<div class="feature">
        <b>${esc(f.name)}</b>${lines(f.text).map(l => `<p>${esc(l)}</p>`).join("")}
      </div>`).join("")}
    </div>`).join("");
}

function notesHTML(c) {
  const facts = [["Trasfondo", c.background], ["Alineamiento", c.alignment], ["Jugador", c.player]].filter(([, v]) => v);
  return `
    ${facts.length ? `<div class="facts">${facts.map(([k, v]) => `<span class="fact"><small>${k}</small><b>${esc(v)}</b></span>`).join("")}</div>` : ""}
    ${c.notes ? `<div class="block">${lines(c.notes).map(l => `<p>${esc(l)}</p>`).join("")}</div>`
      : `<p class="sheet-empty">Sin notas. Escríbelas al editar la ficha.</p>`}`;
}

/* Las pestañas y la que está abierta */
export function sheetTabsHTML(c, tab) {
  const open = SHEET_TABS.some(([k]) => k === tab) ? tab : "acciones";
  const body = { acciones: actionsHTML, conjuros: spellsHTML, equipo: itemsHTML, rasgos: featuresHTML, notas: notesHTML }[open](c);
  return `
    <div class="sheet-tabbed">
      <nav class="sheet-tabs" role="tablist">
        ${SHEET_TABS.map(([k, label]) => `<button role="tab" data-act="sheetTab" data-tab-id="${k}" aria-selected="${k === open}">${label}</button>`).join("")}
      </nav>
      <div class="sheet-panel">${body}</div>
    </div>`;
}

/* Un clic dentro de las pestañas. Devuelve true si era suyo.
   opts: mode y secret para las tiradas, spellCtx para lanzar conjuros. */
export function handleSheetAct(c, act, btn, opts = {}) {
  const roll = (formula, label) => throwDice(formula, { label, mode: opts.mode, secret: opts.secret });
  switch (act) {
    case "atkHit": {
      const a = attacksOf(c)[+btn.dataset.i];
      if (a) roll("1d20" + sign(a.atk), `${c.name} · ${a.name}`);
      return true;
    }
    case "atkDmg": {
      const a = attacksOf(c)[+btn.dataset.i];
      if (a && a.damage) roll(a.damage, `${c.name} · ${a.name} · daño`);
      return true;
    }
    case "itemEquip": {
      const i = +btn.dataset.i;
      patchChar(c.id, { items: c.items.map((it, j) => j === i ? { ...it, equipped: !it.equipped } : it) });
      return true;
    }
    case "castSpell": {
      const sp = c.spellbook.find(x => x.id === btn.dataset.spell);
      if (sp) openCast(c, sp, opts.spellCtx || {});
      return true;
    }
  }
  return false;
}

