/* Las pestañas de la ficha, como en D&D Beyond: Acciones, Conjuros, Equipo,
   Rasgos y Notas. Todo son listas y casi todo se toca para tirar. Las usan la
   ficha del jugador y la tarjeta desplegada del DM, cada una con su pestaña
   abierta; las dos reenvían aquí los clics con handleSheetAct. */

import { esc, lines, sign, el, on, modal, toast } from "./util.js";
import { FEATURE_SOURCES, BUFF_PRESETS, BUFF_KINDS, normalizeBuff } from "./schema.js";
import { attacksOf, shapeLabel } from "./attacks.js";
import { castStats, spellTags, openCast } from "./spellbook.js";
import { throwDice } from "./dice-panel.js";
import { patchChar } from "./net.js";
import { icon } from "./icons.js";
import { rollable } from "./rollable.js";

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

/* Efectos activos: lo que se suma solo a las tiradas mientras dura */
const KIND_ABBR = { attack: "ataque", damage: "daño", save: "salvación", check: "prueba" };
const buffSummary = b => BUFF_KINDS.filter(k => b[k]).map(k => `${/^[+-]/.test(b[k]) ? "" : "+"}${b[k]} ${KIND_ABBR[k]}`).join(", ");
export function buffsHTML(c) {
  return `<div class="buffs" role="group" aria-label="Efectos activos">
    <span class="buffs-label">${icon("sparkle", 14)}<span>Efectos</span></span>
    ${c.buffs.map((b, i) => `<button type="button" class="buff ${b.on ? "on" : ""}" data-act="buffToggle" data-i="${i}" aria-pressed="${b.on}"
      title="${esc(buffSummary(b))}"><span>${esc(b.name)}</span></button>`).join("")}
    <button type="button" class="buff add" data-act="buffs" title="Añadir o quitar efectos">${icon("plus", 13)}<span>${c.buffs.length ? "Editar" : "Añadir"}</span></button>
  </div>`;
}

/* El editor: los habituales del SRD a un clic, y uno a medida */
export function openBuffs(c) {
  let list = c.buffs.map(b => ({ ...b }));
  const body = el(`<div class="buff-edit">
    <p class="prose small">Mientras estén encendidos se suman solos a las tiradas: el ataque, el daño, las salvaciones o las pruebas.</p>
    <div class="buff-list"></div>
    <h4 class="sheet-sub">Habituales</h4>
    <div class="buff-presets">${BUFF_PRESETS.map((p, i) => `<button type="button" class="buff" data-preset="${i}" title="${esc(buffSummary(normalizeBuff(p)))}">${icon("plus", 12)}<span>${esc(p.name)}</span></button>`).join("")}</div>
    <h4 class="sheet-sub">A medida</h4>
    <form class="buff-custom">
      <label class="field"><span>Nombre</span><input name="name" maxlength="40" placeholder="Bendición del templo" autocomplete="off"></label>
      <div class="buff-kinds">${BUFF_KINDS.map(k => `<label class="field"><span>${{ attack: "Al ataque", damage: "Al daño", save: "A las salvaciones", check: "A las pruebas" }[k]}</span>
        <input name="${k}" maxlength="20" placeholder="${{ attack: "1d4", damage: "2", save: "1d4", check: "1d4" }[k]}" autocomplete="off"></label>`).join("")}</div>
      <button class="btn sm" type="submit">${icon("plus", 14)}<span>Añadir</span></button>
    </form>
  </div>`);
  const paint = () => {
    body.querySelector(".buff-list").innerHTML = list.length ? list.map((b, i) => `<div class="buff-row">
        <label class="check"><input type="checkbox" data-on="${i}" ${b.on ? "checked" : ""}><b>${esc(b.name)}</b></label>
        <small>${esc(buffSummary(b))}</small>
        <button type="button" class="icon-btn" data-drop="${i}" title="Quitar" aria-label="Quitar">${icon("trash", 15)}</button></div>`).join("")
      : `<p class="sheet-empty">Ningún efecto todavía.</p>`;
  };
  const save = () => patchChar(c.id, { buffs: list });
  on(body, "click", "[data-preset]", (e, b) => {
    const p = normalizeBuff(BUFF_PRESETS[+b.dataset.preset]);
    if (list.some(x => x.name === p.name)) return toast(`${p.name} ya está en la lista`);
    if (list.length >= 12) return toast("Caben doce efectos", "bad");
    list = [...list, p]; paint(); save();
  });
  on(body, "change", "[data-on]", (e, b) => { list[+b.dataset.on].on = b.checked; save(); });
  on(body, "click", "[data-drop]", (e, b) => { list = list.filter((_, i) => i !== +b.dataset.drop); paint(); save(); });
  body.querySelector(".buff-custom").addEventListener("submit", e => {
    e.preventDefault();
    const f = e.target, raw = { name: f.name.value };
    for (const k of BUFF_KINDS) raw[k] = f[k].value;
    const b = normalizeBuff(raw);
    if (!b.name) return toast("Ponle un nombre", "bad");
    if (!BUFF_KINDS.some(k => b[k])) return toast("Escribe al menos una fórmula, como 1d4 o 2", "bad");
    const bad = BUFF_KINDS.find(k => raw[k].trim() && !b[k]);
    if (bad) return toast("No entiendo esa fórmula. Prueba con 1d4, 2 o -1d4", "bad");
    if (list.length >= 12) return toast("Caben doce efectos", "bad");
    list = [...list, b]; f.reset(); paint(); save();
  });
  paint();
  modal({ title: "Efectos de " + c.name, body, wide: true, actions: [{ label: "Hecho", tone: "primary" }] });
}

function actionsHTML(c) {
  return `
    ${buffsHTML(c)}
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
        <span class="st-name"><b>${esc(it.name)}</b>${it.note ? `<small>${rollable(it.note, `${c.name} · ${it.name}`)}</small>` : ""}</span>
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
        <b>${esc(f.name)}</b>${lines(f.text).map(l => `<p>${rollable(l, `${c.name} · ${f.name}`)}</p>`).join("")}
      </div>`).join("")}
    </div>`).join("");
}

function notesHTML(c) {
  const facts = [["Trasfondo", c.background], ["Alineamiento", c.alignment], ["Jugador", c.player]].filter(([, v]) => v);
  return `
    ${facts.length ? `<div class="facts">${facts.map(([k, v]) => `<span class="fact"><small>${k}</small><b>${esc(v)}</b></span>`).join("")}</div>` : ""}
    ${c.notes ? `<div class="block">${lines(c.notes).map(l => `<p>${rollable(l, c.name)}</p>`).join("")}</div>`
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
  const roll = (formula, label, kind = "") => throwDice(formula, { label, mode: opts.mode, secret: opts.secret, char: c, kind });
  switch (act) {
    case "atkHit": {
      const a = attacksOf(c)[+btn.dataset.i];
      if (a) roll("1d20" + sign(a.atk), `${c.name} · ${a.name}`, "attack");
      return true;
    }
    case "atkDmg": {
      const a = attacksOf(c)[+btn.dataset.i];
      if (a && a.damage) roll(a.damage, `${c.name} · ${a.name} · daño`, "damage");
      return true;
    }
    case "buffToggle": {
      const i = +btn.dataset.i;
      patchChar(c.id, { buffs: c.buffs.map((b, j) => j === i ? { ...b, on: !b.on } : b) });
      return true;
    }
    case "buffs": openBuffs(c); return true;
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

