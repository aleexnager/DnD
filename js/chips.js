/* Indicadores de ataques y conjuros: chips con icono que dicen de un vistazo
   hasta dónde llega, si es de área, cómo se resuelve, qué estado pone, si
   invoca algo y si pide concentración. Los mismos en la ficha, en la ventana
   de atacar, en el libro de conjuros y en la biblioteca.

   Cada chip lleva su explicación entera en el título (y en aria-label), y el
   color dice la familia: alcance, área, tirada, estado, invocación,
   concentración. */

import { icon } from "./icons.js";
import { esc } from "./util.js";
import { conditionName } from "./schema.js";

const SAVE = { str: "FUE", dex: "DES", con: "CON", int: "INT", wis: "SAB", cha: "CAR" };
const SAVE_LONG = { str: "Fuerza", dex: "Destreza", con: "Constitución", int: "Inteligencia", wis: "Sabiduría", cha: "Carisma" };
/* Forma -> icono y nombre. El tamaño de las esferas y los anillos es el
   radio; el de los cubos, la mitad del lado (como en el mapa). */
const SHAPES = {
  circle: ["circle", "esfera"], cone: ["cone", "cono"], line: ["line", "línea"], square: ["square", "cubo"],
  ring: ["circle", "anillo"], rect: ["square", "rectángulo"], poly: ["polygon", "área"]
};
const AREA_WORDS = { cono: "cone", "línea": "line", linea: "line", esfera: "circle", "emanación": "aura", emanacion: "aura", cubo: "square", cilindro: "circle" };

const chip = (kind, ico, text, title) => ({ kind, ico, text, title });

/* El alcance tal como viene escrito: «120 pies», «Toque», «Personal (cono de
   15 pies)», «alcance 5 pies», «distancia 80/320 pies», «5 pies o distancia 20/60» */
function reachChips(range, { melee = false, attack = false } = {}) {
  const r = String(range || "").trim();
  if (!r) return melee ? [chip("reach", "sword", "Cuerpo a cuerpo", "Cuerpo a cuerpo")] : [];
  const out = [];
  if (/^toque/i.test(r)) return [chip("reach", melee || attack ? "sword" : "hand", "Toque", "Hay que tocar al objetivo")];
  if (/^personal/i.test(r)) return [chip("reach", "user", "Personal", "Sale de quien lo lanza")];
  const reach = r.match(/alcance\s*(\d+)/i);
  const far = r.match(/(\d+)\s*\/\s*(\d+)/);
  if (reach || (melee && !far)) {
    const n = reach ? reach[1] : (r.match(/(\d+)/) || [])[1];
    out.push(chip("reach", "sword", n ? `${n} pies` : "Cuerpo a cuerpo", `Cuerpo a cuerpo${n ? `, alcance ${n} pies` : ""}`));
  }
  if (far) out.push(chip("reach", "arrow", `${far[1]}/${far[2]} pies`, `A distancia: hasta ${far[1]} pies normal y ${far[2]} como máximo, con desventaja`));
  if (!out.length) {
    const n = r.match(/^(\d+)\s*pies$/i) || r.match(/distancia\s*(\d+)/i);
    if (n) {
      /* Sin palabra que lo diga: 5 o 10 pies es cuerpo a cuerpo */
      if (!attack || +n[1] > 10) out.push(chip("reach", "arrow", `${n[1]} pies`, `Alcance máximo: ${n[1]} pies`));
      else out.push(chip("reach", "sword", `${n[1]} pies`, `Cuerpo a cuerpo, alcance ${n[1]} pies`));
    } else out.push(chip("reach", "arrow", r.length > 18 ? r.slice(0, 17) + "…" : r, `Alcance: ${r}`));
  }
  return out;
}

const shapeChip = (shape, size) => {
  const [ico, word] = SHAPES[shape] || SHAPES.circle;
  const feet = shape === "square" || shape === "rect" ? size * 2 : size;
  const desc = shape === "circle" || shape === "ring" ? `${word} de ${feet} pies de radio` : `${word} de ${feet} pies`;
  return chip("area", ico, feet ? `${word} ${feet} pies` : word, `De área: ${desc}`);
};

const condChip = id => chip("cond", "spiral", conditionName(id), `Puede dejarlo ${conditionName(id).toLowerCase()}`);

/* Un conjuro ya normalizado (schema.js normalizeSpell) */
export function spellChips(sp) {
  const out = reachChips(sp.range, { melee: sp.mode === "attack" && sp.melee, attack: sp.mode === "attack" });
  if (sp.shape) out.push(shapeChip(sp.shape, sp.size));
  if (sp.mode === "attack") out.push(chip("roll", "dice", sp.rays > 1 ? `Ataque ×${sp.rays}` : "Ataque",
    `Tirada de ataque de conjuro${sp.melee ? " cuerpo a cuerpo" : " a distancia"}${sp.rays > 1 ? `, ${sp.rays} rayos` : ""}`));
  if (sp.mode === "save") out.push(chip("roll", "shield", `${SAVE[sp.save] || "DES"}${sp.half ? " ½" : ""}`,
    `Salvación de ${SAVE_LONG[sp.save] || "Destreza"}${sp.half ? "; si la supera, la mitad del daño" : ""}`));
  if (sp.mode === "auto") out.push(chip("roll", "zap", "Impacta", `Impacta siempre${sp.darts ? `: ${sp.darts} dardos` : ""}`));
  if (sp.mode === "hit") out.push(chip("roll", "zap", sp.save ? `Directo · ${SAVE[sp.save] || "DES"}` : "Directo",
    `El daño entra sin tirar (se lanza tras impactar)${sp.save ? `; salvación de ${SAVE_LONG[sp.save] || "Destreza"} para el estado` : ""}`));
  if (sp.mode === "heal") out.push(chip("heal", "heart", "Cura", "Recupera puntos de golpe"));
  if (sp.mode === "temp") out.push(chip("heal", "shield", "PG temp.", "Da puntos de golpe temporales"));
  if (sp.mode === "sleep") out.push(chip("cond", "moon", "Sueño", "Duerme a las criaturas"));
  if (sp.cond) out.push(condChip(sp.cond));
  if (sp.summon) out.push(chip("summon", "summon", "Invoca", "Crea o invoca algo que se queda en el tablero"));
  if (sp.conc) out.push(chip("conc", "conc", "Conc.", "Pide concentración"));
  return out;
}

/* Un ataque (schema.js normalizeAttack): el de un arma, el de una acción de
   criatura o un conjuro apuntado como ataque */
export function attackChips(a) {
  const out = reachChips(a.range, { attack: true });
  if (a.shape) out.push(shapeChip(a.shape, a.shape === "square" ? a.size / 2 : a.size));
  else if (a.area) {
    const m = a.area.match(/^(\S+) de (\d+) pies/);
    const ico = { cone: "cone", line: "line", circle: "circle", aura: "aura", square: "square" }[AREA_WORDS[m && m[1].toLowerCase()]] || "circle";
    out.push(chip("area", ico, m ? `${m[1]} ${m[2]} pies` : a.area, `De área: ${a.area}`));
  }
  if (a.save) {
    const [ab, dc] = a.save.split(" ");
    out.push(chip("roll", "shield", SAVE[ab] || "DES", `Salvación de ${SAVE_LONG[ab] || "Destreza"} CD ${dc}`));
  }
  if (a.cond) out.push(condChip(a.cond));
  return out;
}

/* Los chips, en HTML */
export function chipsHTML(list, cls = "") {
  if (!list.length) return "";
  return `<span class="fx-chips ${cls}">${list.map(c =>
    `<span class="fx fx-${c.kind}" title="${esc(c.title)}" aria-label="${esc(c.title)}">${icon(c.ico, 12)}<span>${esc(c.text)}</span></span>`).join("")}</span>`;
}
