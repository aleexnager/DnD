/* Ataques: leer los que vienen escritos en la ficha y resolverlos en la mesa.

   El bestiario del manual escribe las acciones en prosa ("Cimitarra. Ataque con
   arma cuerpo a cuerpo: +4 al ataque, alcance 5 pies. Impacto: 5 (1d6+2) de
   daño cortante"). De ahi se saca el bonificador, el daño y el tipo, para poder
   tirar de un clic en vez de leer y hacer cuentas. */

import { el, on, esc, toast, modal } from "./util.js";
import { store, op } from "./net.js";
import { normalizeAttack, modOf } from "./schema.js";
import { critDamage } from "./attacks-core.js";

const DAMAGE_WORDS = [
  "contundente", "cortante", "perforante", "acido", "ácido", "frio", "frío", "fuego", "fuerza",
  "relampago", "relámpago", "necrotico", "necrótico", "veneno", "psiquico", "psíquico",
  "radiante", "trueno", "magico", "mágico"
];
const ABILITY_WORDS = {
  fuerza: "str", destreza: "dex", constitucion: "con", constitución: "con",
  inteligencia: "int", sabiduria: "wis", sabiduría: "wis", carisma: "cha"
};

/* Una línea de texto -> un ataque, o null si ahí no hay ninguno. */
export function parseAttackLine(line) {
  const text = String(line || "").trim();
  if (!text) return null;
  const dice = text.match(/(\d*d\d+(?:\s*[+-]\s*\d+)?)/i);
  const hit = text.match(/([+-]\s*\d+)\s*(?:al ataque|to hit)/i)
    || text.match(/^[^.:]{2,40}[.:]\s*([+-]\s*\d+)/);
  const save = text.match(/CD\s*(\d+)\s*(?:de\s+)?(fuerza|destreza|constituci[oó]n|inteligencia|sabidur[ií]a|carisma)/i);
  if (!dice && !save) return null;
  /* En el formato del bestiario («Tragar — … 3d6 de ácido por turno») una línea
     sin bonificador ni CD describe un efecto, no un ataque que tirar. */
  if (!hit && !save && /\s—\s/.test(text)) return null;

  /* «Cimitarra. Ataque…» o, como escribe el bestiario, «Cimitarra — +4 al ataque — …» */
  const name = (text.split(/\s[—–]\s|[.:]/)[0] || "Ataque").trim().slice(0, 48);
  const type = DAMAGE_WORDS.find(w => new RegExp("\\b" + w + "\\b", "i").test(text)) || "";
  const range = (text.match(/(alcance[^,.;]*|distancia[^,.;]*|reach[^,.;]*|range[^,.;]*)/i) || [""])[0].trim();

  return normalizeAttack({
    name,
    atk: hit ? Number(hit[1].replace(/\s+/g, "")) : 0,
    damage: dice ? dice[1].replace(/\s+/g, "") : "",
    type,
    range: range.slice(0, 40),
    save: save ? `${ABILITY_WORDS[save[2].toLowerCase()] || "dex"} ${save[1]}` : ""
  });
}

/* Todo lo que una ficha sabe hacer: lo que tenga guardado más lo que se pueda
   leer de sus acciones y de su lista de armas. */
export function attacksOf(c) {
  const saved = (c.attacks || []).map(normalizeAttack);
  const seen = new Set(saved.map(a => a.name.toLowerCase()));
  const found = [];
  for (const text of [c.actions, c.weapons]) {
    for (const line of String(text || "").split("\n")) {
      const a = parseAttackLine(line);
      if (a && a.name && !seen.has(a.name.toLowerCase())) { seen.add(a.name.toLowerCase()); found.push(a); }
    }
  }
  return [...saved, ...found];
}

export const attackLabel = a => [
  a.save ? "CD " + a.save.split(" ")[1] : (a.atk >= 0 ? "+" : "") + a.atk,
  a.damage, a.type,
  a.level ? "nivel " + a.level : "",
  a.shape ? shapeLabel(a) : ""
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
export function resolveAttack({ attacker, attack, target, mode = "normal", secret = false }) {
  if (!spendSlot(attacker, normalizeAttack(attack))) return false;
  op("attack.resolve", {
    attackerId: attacker.id,
    attack: normalizeAttack(attack),
    targetId: target ? target.id : "",
    mode, secret
  });
  return true;
}

/* ---------- Ventana de ataque ---------- */
export function openAttacks(attacker, { targets = [], preselect = null, secret = false } = {}) {
  const list = attacksOf(attacker);
  if (!list.length) {
    toast(`${attacker.name} no tiene ningún ataque apuntado. Añádelo en su ficha.`, "bad");
    return;
  }
  let targetId = preselect || (targets[0] && targets[0].id) || "";
  let mode = "normal";

  const body = el(`<div>
    <div class="field">
      <span>Objetivo</span>
      <select id="atkTarget">
        <option value="">Sin objetivo (solo tirar)</option>
        ${targets.map(t => `<option value="${t.id}" ${t.id === targetId ? "selected" : ""}>${esc(t.name)}${t.ac ? " · CA " + t.ac : ""}</option>`).join("")}
      </select>
    </div>
    <div class="adv" style="margin:10px 0 14px">
      <button type="button" data-m="dis" aria-pressed="false">Desventaja</button>
      <button type="button" data-m="normal" aria-pressed="true">Normal</button>
      <button type="button" data-m="adv" aria-pressed="false">Ventaja</button>
    </div>
    <div class="atk-list">
      ${list.map((a, i) => {
        const left = slotsLeft(attacker, a);
        const dry = left === 0;
        return `<button class="atk ${dry ? "dry" : ""}" data-i="${i}" ${dry ? "disabled" : ""}>
          <b>${esc(a.name)}</b>
          <small>${esc(attackLabel(a))}${a.range ? " · " + esc(a.range) : ""}</small>
          ${left !== null ? `<span class="slots-left">${dry ? "sin espacios" : left + " de nivel " + a.level}</span>` : ""}
        </button>`;
      }).join("")}
    </div>
  </div>`);

  const m = modal({ title: "Ataques de " + attacker.name, body, wide: true, actions: [{ label: "Cerrar" }] });
  body.querySelector("#atkTarget").addEventListener("change", e => { targetId = e.target.value; });
  on(body, "click", "[data-m]", (e, b) => {
    mode = b.dataset.m;
    body.querySelectorAll("[data-m]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  });
  on(body, "click", "[data-i]", (e, b) => {
    const target = targets.find(t => t.id === targetId) || null;
    if (resolveAttack({ attacker, attack: list[+b.dataset.i], target, mode, secret })) m.close();
  });
}

/* Modificador de ataque sugerido al crear un ataque a mano */
export const suggestedAtk = (c, ability = "str") => modOf(c[ability]) + (c.proficiency || 2);
export { critDamage, store };
