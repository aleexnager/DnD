/* Ataques: leer los que vienen escritos en la ficha y resolverlos en la mesa.

   El bestiario del manual escribe las acciones en prosa ("Cimitarra. Ataque con
   arma cuerpo a cuerpo: +4 al ataque, alcance 5 pies. Impacto: 5 (1d6+2) de
   daño cortante"). De ahi se saca el bonificador, el daño y el tipo, para poder
   tirar de un clic en vez de leer y hacer cuentas. */

import { el, on, esc, toast, modal } from "./util.js";
import { store, op, aimAt } from "./net.js";
import { acOf, normalizeAttack, modOf, parseAttackLine, canSneak, canSmite, sneakDice, buffsFor } from "./schema.js";
import { critDamage } from "./attacks-core.js";
import { keyMods } from "./dice-panel.js";
import { icon } from "./icons.js";
import { attackChips, spellChips, chipsHTML } from "./chips.js";
import { openCast } from "./spellbook.js";

/* Todo lo que una ficha sabe hacer: lo que tenga guardado más lo que se pueda
   leer de sus acciones y de su lista de armas. */
export function attacksOf(c) {
  const saved = (c.attacks || []).map(normalizeAttack);
  const seen = new Set(saved.map(a => a.name.toLowerCase()));
  const found = [];
  /* Las criaturas de 2024 también atacan con acciones adicionales, reacciones
     y acciones legendarias (Pisotear, Latigazo…) */
  for (const text of [c.actions, c.bonus, c.reactions, c.legendary, c.weapons]) {
    for (const line of String(text || "").split("\n")) {
      const a = parseAttackLine(line);
      if (a && a.name && !seen.has(a.name.toLowerCase())) { seen.add(a.name.toLowerCase()); found.push(a); }
    }
  }
  return [...saved, ...found];
}

export const attackLabel = a => [
  a.save ? "CD " + a.save.split(" ")[1] : (a.atk >= 0 ? "+" : "") + a.atk,
  a.damage !== "0" ? a.damage : "", a.type,
  a.level ? "nivel " + a.level : ""
].filter(Boolean).join(" · ");

export const shapeLabel = a => ({
  circle: `esfera de ${a.size} pies`, cone: `cono de ${a.size} pies`,
  line: `línea de ${a.size} pies`, square: `cubo de ${a.size} pies`
}[a.shape] || "");

/* Los que pintan un área sobre el tablero */
export const areaAttacks = c => attacksOf(c).filter(x => x.shape);

/* Espacios de conjuro. Devuelve cuántos quedan de ese nivel, o null si el
   ataque no gasta ninguno. */
export function slotsLeft(c, attack) {
  if (!attack.level) return null;
  const i = attack.level - 1;
  return Math.max(0, (c.slots[i] || 0) - (c.slotsUsed[i] || 0));
}

/* Para un conjuro: los espacios que quedan de su nivel o mayores (null si la
   ficha no lleva espacios apuntados, como muchos monstruos) */
export function spellSlotsLeft(c, level) {
  if (!(c.slots || []).some(n => n)) return null;
  return c.slots.reduce((n, total, i) => n + (i + 1 >= level ? Math.max(0, total - (c.slotsUsed[i] || 0)) : 0), 0);
}

/* Se gasta al lanzarlo. Si no queda ninguno, no se lanza. */
function spendSlot(c, attack) {
  const left = slotsLeft(c, attack);
  if (left === null) return true;
  if (left <= 0) {
    toast(`No te quedan espacios de nivel ${attack.level}`, "bad");
    return false;
  }
  const used = [...c.slotsUsed];
  used[attack.level - 1] = (used[attack.level - 1] || 0) + 1;
  op("char.patch", { id: c.id, fields: { slotsUsed: used } });
  return true;
}

/* ---------- Resolución ---------- */
/* La tirada la hace el servidor: es el único que conoce la clase de armadura
   del enemigo y los puntos de vida de verdad. Aquí solo se pide. */
export function resolveAttack({ attacker, attack, target, mode = "normal", secret = false, extras = {} }) {
  if (!spendSlot(attacker, normalizeAttack(attack))) return false;
  const keys = keyMods();
  op("attack.resolve", {
    attackerId: attacker.id,
    attack: normalizeAttack(attack),
    targetId: target ? target.id : "",
    mode: keys.mode || mode, secret: secret || (keys.secret && store.session && store.session.role === "dm"),
    extras
  });
  return true;
}

/* ---------- Ventana de ataque ---------- */
/* Los conjuros que sirven para atacar: también salen en la ventana de atacar */
export const combatSpells = c => (c.spellbook || []).filter(sp => ["attack", "save", "auto", "sleep", "hit"].includes(sp.mode))
  .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "es"));

export function openAttacks(attacker, { targets = [], preselect = null, secret = false, spellCtx = null } = {}) {
  const list = attacksOf(attacker);
  const spells = spellCtx ? combatSpells(attacker) : [];
  if (!list.length && !spells.length) {
    toast(`${attacker.name} no tiene ningún ataque apuntado. Añádelo en su ficha.`, "bad");
    return;
  }
  let targetId = preselect || (targets[0] && targets[0].id) || "";
  let mode = "normal";
  /* Lo que se suma al daño si entra. El castigo ofrece los niveles de los
     que le quedan espacios; sin ninguno, la casilla no sale. */
  const sneak = canSneak(attacker);
  const smiteLevels = canSmite(attacker) && attacker.kind === "pc"
    ? attacker.slots.map((n, i) => n - (attacker.slotsUsed[i] || 0) > 0 ? i + 1 : 0).filter(Boolean).slice(0, 5) : [];
  const active = [...new Set([...buffsFor(attacker, "attack").names, ...buffsFor(attacker, "damage").names])];

  const body = el(`<div>
    <div class="field">
      <span>Objetivo</span>
      <select id="atkTarget">
        <option value="">Sin objetivo (solo tirar)</option>
        ${targets.map(t => `<option value="${t.id}" ${t.id === targetId ? "selected" : ""}>${esc(t.name)}${t.ac ? " · CA " + acOf(t) : ""}</option>`).join("")}
      </select>
    </div>
    <div class="adv" style="margin:10px 0 14px">
      <button type="button" data-m="dis" aria-pressed="false">Desventaja</button>
      <button type="button" data-m="normal" aria-pressed="true">Normal</button>
      <button type="button" data-m="adv" aria-pressed="false">Ventaja</button>
    </div>
    ${active.length ? `<p class="atk-buffs">${icon("sparkle", 14)}<span>Se suma:</span> ${active.map(n => `<b>${esc(n)}</b>`).join(" ")}</p>` : ""}
    <div class="atk-extras">
      ${sneak ? `<label class="check"><input type="checkbox" id="atkSneak"><span>Ataque furtivo</span> <small class="tnum">+${sneakDice(attacker)}</small></label>` : ""}
      ${smiteLevels.length ? `<label class="check"><input type="checkbox" id="atkSmite"><span>Castigo divino</span></label>
        <select id="atkSmiteLv" aria-label="Espacio para el castigo">${smiteLevels.map(l => `<option value="${l}">${l}</option>`).join("")}</select>` : ""}
      <label class="atk-extra"><span>Daño extra</span><input id="atkExtra" placeholder="1d6" maxlength="20" autocomplete="off" inputmode="text"></label>
    </div>
    <p class="atk-keys hint-keys"><kbd>Mayús</kbd> <span>ventaja</span> · <kbd>Ctrl</kbd> <span>desventaja</span></p>
    <div class="atk-list">
      ${list.map((a, i) => {
        const left = slotsLeft(attacker, a);
        const dry = left === 0;
        return `<button class="atk ${dry ? "dry" : ""}" data-i="${i}" ${dry ? "disabled" : ""}>
          <b>${esc(a.name)}</b>
          <small>${esc(attackLabel(a))}</small>${chipsHTML(attackChips(a))}
          ${left !== null ? `<span class="slots-left">${dry ? "sin espacios" : left + " de nivel " + a.level}</span>` : ""}
        </button>`;
      }).join("")}
    </div>
    ${spells.length ? `<h4 class="menu-sec atk-sec">${icon("wand", 14)}<span>Conjuros</span></h4>
    <div class="atk-list">${spells.map(sp => {
      const left = sp.level ? spellSlotsLeft(attacker, sp.level) : null;
      const dry = left === 0;
      return `<button class="atk spell ${dry ? "dry" : ""}" data-sp="${esc(sp.id)}" ${dry ? "disabled" : ""}>
        <b>${esc(sp.name)}</b><small>${esc([sp.level ? "nivel " + sp.level : "truco", sp.damage ? `${sp.mode === "auto" ? sp.darts + "×" : ""}${sp.damage} ${sp.type}`.trim() : ""].filter(Boolean).join(" · "))}</small>
        ${chipsHTML(spellChips(sp))}
        ${left !== null ? `<span class="slots-left">${dry ? "sin espacios" : left + " de nivel " + sp.level + " o más"}</span>` : ""}
      </button>`;
    }).join("")}</div>` : ""}
  </div>`);

  /* Mientras la ventana está abierta, el mapa enseña a quién apunta; al
     cerrarla (o al lanzar un conjuro, que sigue en su ventana) se quita */
  let toSpell = false;
  const m = modal({ title: "Ataques de " + attacker.name, body, wide: true, actions: [{ label: "Cerrar" }],
    onClose: () => { if (!toSpell) aimAt(attacker.id, ""); } });
  aimAt(attacker.id, targetId, { secret });
  body.querySelector("#atkTarget").addEventListener("change", e => { targetId = e.target.value; aimAt(attacker.id, targetId, { secret }); });
  on(body, "click", "[data-m]", (e, b) => {
    mode = b.dataset.m;
    body.querySelectorAll("[data-m]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  });
  /* Un conjuro se lanza en su ventana, con el objetivo de aquí ya marcado */
  on(body, "click", "[data-sp]", (e, b) => {
    const sp = spells.find(x => x.id === b.dataset.sp);
    if (!sp) return;
    toSpell = true;
    m.close();
    openCast(attacker, sp, { ...spellCtx, preselect: s => targetId ? [targetId] : (spellCtx.preselect ? spellCtx.preselect(s) : []) });
  });
  on(body, "click", "[data-i]", (e, b) => {
    const target = targets.find(t => t.id === targetId) || null;
    const extras = {
      sneak: !!(body.querySelector("#atkSneak") || {}).checked,
      smite: (body.querySelector("#atkSmite") || {}).checked ? Number(body.querySelector("#atkSmiteLv").value) : 0,
      extra: (body.querySelector("#atkExtra").value || "").trim()
    };
    if (resolveAttack({ attacker, attack: list[+b.dataset.i], target, mode, secret, extras })) m.close();
  });
}

/* Modificador de ataque sugerido al crear un ataque a mano */
export const suggestedAtk = (c, ability = "str") => modOf(c[ability]) + (c.proficiency || 2);
export { critDamage, store, parseAttackLine };
