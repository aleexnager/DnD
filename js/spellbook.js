/* Libro de conjuros: lo que sabe cada personaje y la ventana de lanzar.
   La resolución (tiradas, salvaciones, daño, estados) la hace el servidor:
   aquí solo se elige qué, a qué nivel y contra quién. */

import { el, on, esc, toast, modal } from "./util.js";
import { op, patchChar } from "./net.js";
import { normalizeSpell, modOf, conditionName } from "./schema.js";
import { SPELL_LIBRARY, guessAbility } from "./spells.js";
import { icon, withIcon } from "./icons.js";

const ABIL = { int: "Inteligencia", wis: "Sabiduría", cha: "Carisma" };
const SAVE = { str: "FUE", dex: "DES", con: "CON", int: "INT", wis: "SAB", cha: "CAR" };
const SHAPES = { circle: "esfera", cone: "cono", line: "línea", square: "cubo" };
const levelName = n => n === 0 ? "Trucos" : `Nivel ${n}`;

export function castStats(c) {
  const ability = c.castAbility || guessAbility(c.className);
  const mod = modOf(c[ability]);
  const prof = c.proficiency || 2;
  return { ability, dc: c.spellDC || 8 + prof + mod, atk: c.spellAtk || prof + mod };
}

/* Resumen de una línea: qué hace */
export function spellTags(sp) {
  const t = [];
  if (sp.mode === "attack") t.push(sp.melee ? "ataque cuerpo a cuerpo" : "ataque a distancia");
  if (sp.mode === "save") t.push(`salvación de ${SAVE[sp.save] || "DES"}${sp.half ? " (mitad)" : ""}`);
  if (sp.mode === "auto") t.push(`${sp.darts} dardos`);
  if (sp.mode === "heal") t.push(`cura ${sp.heal}${sp.healMod ? " + car." : ""}`);
  if (sp.mode === "sleep") t.push(`sueño ${sp.damage}`);
  if (sp.damage && sp.mode !== "sleep") t.push(`${sp.damage}${sp.type ? " " + sp.type : ""}`);
  if (sp.cond) t.push(conditionName(sp.cond).toLowerCase());
  if (sp.shape) t.push(`${SHAPES[sp.shape]} de ${sp.shape === "square" ? sp.size * 2 : sp.size} pies`);
  if (sp.conc) t.push("concentración");
  return t.join(" · ");
}

const slotsLeft = (c, level) => Math.max(0, (c.slots[level - 1] || 0) - (c.slotsUsed[level - 1] || 0));

/* ---------- El libro ---------- */
export function openSpellbook(c, ctx = {}) {
  const fresh = () => (ctx.getChar ? ctx.getChar(c.id) : c) || c;
  let win = null;

  const paint = () => {
    const ch = fresh();
    const st = castStats(ch);
    const byLevel = {};
    for (const sp of ch.spellbook) (byLevel[sp.level] = byLevel[sp.level] || []).push(sp);
    const slots = ch.slots.map((n, i) => n ? `<span class="slot-pill" title="Espacios de nivel ${i + 1}"><b>${i + 1}º</b> ${slotsLeft(ch, i + 1)}/${n}</span>` : "").join("");
    return `<div class="spellbook">
      <div class="sb-stats">
        <label class="field sb-abil"><span>Característica</span>
          <select data-sb="ability">${Object.entries(ABIL).map(([k, v]) => `<option value="${k}" ${k === st.ability ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <div class="sb-num" title="Dificultad de las salvaciones contra tus conjuros"><b>${st.dc}</b><span>CD</span></div>
        <div class="sb-num" title="Bonificador a los ataques de conjuro"><b>${st.atk >= 0 ? "+" : ""}${st.atk}</b><span>ataque</span></div>
        ${ctx.isDM ? `<label class="field sb-fix"><span>CD fija</span><input type="number" min="0" max="30" data-sb="dc" value="${ch.spellDC || ""}" placeholder="auto"></label>
          <label class="field sb-fix"><span>Ataque fijo</span><input type="number" min="0" max="20" data-sb="atk" value="${ch.spellAtk || ""}" placeholder="auto"></label>` : ""}
      </div>
      ${slots ? `<div class="sb-slots">${icon("sparkle", 14)}<span>Espacios:</span>${slots}</div>` : `<p class="prose small"><span>Sin espacios de conjuro apuntados en la ficha: los trucos se lanzan igual.</span></p>`}
      ${ch.spellbook.length ? Object.keys(byLevel).sort((a, b) => a - b).map(lv => `
        <h4 class="menu-sec">${levelName(+lv)}</h4>
        <div class="sb-list">${byLevel[lv].map(sp => {
          const dry = sp.level > 0 && ch.slots.some(n => n) && !ch.slots.some((n, i) => i + 1 >= sp.level && slotsLeft(ch, i + 1) > 0);
          return `<div class="sb-spell ${dry ? "dry" : ""}">
            <div class="sb-text"><b>${esc(sp.name)}</b><small>${esc(spellTags(sp))}</small></div>
            <button class="icon-btn" data-sb-remove="${esc(sp.id)}" title="Quitar de la lista" aria-label="Quitar de la lista">${icon("close", 15)}</button>
            <button class="btn sm primary" data-sb-cast="${esc(sp.id)}" ${dry ? "disabled" : ""}>${withIcon("wand", "Lanzar", 15)}</button>
          </div>`;
        }).join("")}</div>`).join("") : `<div class="empty sb-empty"><span class="empty-ico">${icon("book", 28)}</span><h3>Sin conjuros todavía</h3><p>Añádelos de la biblioteca: ya saben qué hacen.</p></div>`}
    </div>`;
  };

  const body = el(`<div>${paint()}</div>`);
  const repaint = () => { body.innerHTML = paint(); };
  win = modal({
    title: "Conjuros de " + c.name, body, wide: true,
    actions: [
      { label: "Añadir de la biblioteca", run: () => { openLibrary(fresh(), () => setTimeout(repaint, 300)); return false; } },
      { label: "Cerrar", tone: "primary" }
    ]
  });
  body.addEventListener("change", e => {
    const k = e.target.dataset.sb;
    if (!k) return;
    const ch = fresh();
    if (k === "ability") patchChar(ch.id, { castAbility: e.target.value });
    if (k === "dc") patchChar(ch.id, { spellDC: Math.max(0, +e.target.value || 0) });
    if (k === "atk") patchChar(ch.id, { spellAtk: Math.max(0, +e.target.value || 0) });
    setTimeout(repaint, 250);
  });
  on(body, "click", "[data-sb-remove]", (e, b) => {
    const ch = fresh();
    patchChar(ch.id, { spellbook: ch.spellbook.filter(x => x.id !== b.dataset.sbRemove) });
    setTimeout(repaint, 250);
  });
  on(body, "click", "[data-sb-cast]", (e, b) => {
    const ch = fresh();
    const sp = ch.spellbook.find(x => x.id === b.dataset.sbCast);
    if (!sp) return;
    win.close();
    openCast(ch, sp, ctx);
  });
}

/* ---------- La biblioteca ---------- */
function openLibrary(c, done) {
  const known = new Set(c.spellbook.map(s => s.id));
  let query = "";
  const list = () => SPELL_LIBRARY.filter(sp => !query || sp.name.toLowerCase().includes(query) || String(sp.level) === query);
  const body = el(`<div>
    <input type="search" id="libSearch" placeholder="Buscar conjuro o nivel (0 a 5)" aria-label="Buscar conjuro">
    <div class="lib-list" id="libList"></div>
  </div>`);
  const paintList = () => {
    body.querySelector("#libList").innerHTML = list().map(sp => `
      <label class="lib-row ${known.has(sp.id) ? "known" : ""}">
        <input type="checkbox" value="${sp.id}" ${known.has(sp.id) ? "checked disabled" : ""}>
        <span class="lv">${sp.level === 0 ? "T" : sp.level}</span>
        <span class="sb-text"><b>${esc(sp.name)}</b><small>${esc(spellTags(sp))}</small></span>
      </label>`).join("");
  };
  paintList();
  body.querySelector("#libSearch").addEventListener("input", e => { query = e.target.value.trim().toLowerCase(); paintList(); });
  modal({
    title: "Biblioteca de conjuros", body, wide: true,
    actions: [
      { label: "Cancelar" },
      { label: "Añadir", tone: "primary", run: host => {
        const ids = [...host.querySelectorAll("input[type=checkbox]:checked:not([disabled])")].map(i => i.value);
        if (!ids.length) return;
        const add = SPELL_LIBRARY.filter(sp => ids.includes(sp.id)).map(sp => normalizeSpell(sp));
        patchChar(c.id, { spellbook: [...c.spellbook, ...add], castAbility: c.castAbility || guessAbility(c.className) });
        toast(add.length === 1 ? `${add[0].name} añadido` : `${add.length} conjuros añadidos`, "good");
        done && done();
      } }
    ]
  });
}

/* ---------- Lanzar ---------- */
export function openCast(c, sp, ctx = {}) {
  const st = castStats(c);
  const hasSlots = c.slots.some(n => n);
  const levels = sp.level === 0 ? [] : [1, 2, 3, 4, 5, 6, 7, 8, 9]
    .filter(l => l >= sp.level && (!hasSlots || slotsLeft(c, l) > 0) && (!hasSlots || c.slots[l - 1] > 0));
  if (sp.level > 0 && hasSlots && !levels.length) return toast(`No te quedan espacios de nivel ${sp.level} o más`, "bad");
  const targets = (ctx.targets ? ctx.targets() : []).filter(t => t.mx !== null || t.kind === "pc");
  const pre = new Set([...(ctx.preselect ? ctx.preselect(sp) : [])]);
  const maxFor = lvl => sp.targets + sp.targetsUp * Math.max(0, lvl - sp.level);
  const needsTarget = sp.mode !== "none";

  const body = el(`<div class="cast">
    <p class="cast-what">${esc(spellTags(sp))}${sp.mode === "save" ? ` · CD ${st.dc}` : sp.mode === "attack" ? ` · ${st.atk >= 0 ? "+" : ""}${st.atk} al ataque` : ""}</p>
    ${sp.desc ? `<p class="prose small"><span>${esc(sp.desc)}</span></p>` : ""}
    ${levels.length ? `<label class="field"><span>Espacio</span><select id="castSlot">${levels.map(l =>
      `<option value="${l}">Nivel ${l}${hasSlots ? ` · quedan ${slotsLeft(c, l)}` : ""}${l > sp.level ? " · potenciado" : ""}</option>`).join("")}</select></label>` : ""}
    ${sp.mode === "attack" ? `<div class="adv cast-adv">
      <button type="button" data-m="dis" aria-pressed="false">Desventaja</button>
      <button type="button" data-m="normal" aria-pressed="true">Normal</button>
      <button type="button" data-m="adv" aria-pressed="false">Ventaja</button></div>` : ""}
    ${needsTarget || targets.length ? `<div class="cast-targets-head"><span class="field-label">Objetivos <i id="castMax"></i></span>
      ${sp.shape && ctx.previewArea ? `<button type="button" class="btn sm" id="castArea">${withIcon("target", "Colocar el área en el mapa", 15)}</button>` : ""}</div>
    <div class="cast-targets">${targets.map(t => `<label class="pick-row"><input type="checkbox" value="${t.id}" ${pre.has(t.id) ? "checked" : ""}>
      <span class="avatar sm" style="--tone:${esc(t.color)}">${esc((t.name || "?").slice(0, 2).toUpperCase())}</span>
      <span><b>${esc(t.name)}</b><small>${t.kind === "pc" ? "personaje" : "criatura"}</small></span></label>`).join("") || `<p class="prose small"><span>No hay nadie a la vista en el mapa.</span></p>`}</div>` : ""}
    ${ctx.isDM ? `<label class="check" style="margin-top:10px"><input type="checkbox" id="castSecret"> En secreto</label>` : ""}
  </div>`);
  let mode = "normal";
  const slotSel = body.querySelector("#castSlot");
  const paintMax = () => {
    const m = body.querySelector("#castMax");
    if (m) m.textContent = sp.targets >= 20 ? "(los del área)" : `(hasta ${maxFor(slotSel ? +slotSel.value : sp.level)})`;
  };
  paintMax();
  slotSel && slotSel.addEventListener("change", paintMax);
  on(body, "click", "[data-m]", (e, b) => {
    mode = b.dataset.m;
    body.querySelectorAll("[data-m]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  });
  const win = modal({
    title: `${sp.name}${sp.level ? " · nivel " + sp.level : " · truco"}`, body,
    actions: [
      { label: "Cancelar" },
      { label: "Lanzar", tone: "primary", run: host => {
        const ids = [...host.querySelectorAll(".cast-targets input:checked")].map(i => i.value);
        const slot = slotSel ? +slotSel.value : sp.level;
        if (needsTarget && !ids.length) { toast("Elige al menos un objetivo", "bad"); return false; }
        const max = maxFor(slot);
        if (ids.length > max) { toast(`Este conjuro llega a ${max} objetivo${max > 1 ? "s" : ""}`, "bad"); return false; }
        op("spell.cast", { casterId: c.id, spellId: sp.id, slot, targets: ids, mode,
          secret: !!(host.querySelector("#castSecret") && host.querySelector("#castSecret").checked) });
      } }
    ]
  });
  const area = body.querySelector("#castArea");
  if (area) area.addEventListener("click", () => { win.close(); ctx.previewArea(sp, () => openCast(ctx.getChar ? ctx.getChar(c.id) : c, sp, ctx)); });
}
