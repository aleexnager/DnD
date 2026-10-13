/* La ficha de una criatura en pergamino, como en los manuales: nombre en
   versalitas, filetes rojos, características en fila y cada rasgo con su
   nombre en negrita cursiva. La usan el bestiario y las tarjetas de los
   monstruos en la mesa.

   Los rasgos se escriben «Nombre — texto». Se pintan en dos nodos de texto
   (el nombre y el resto, que empieza en mayúscula) y i18n.js empareja los
   dos trozos con su inglés,
   así que la traducción sigue funcionando. */

import { esc, lines, sign } from "./util.js";
import { ABILITIES, modOf } from "./schema.js";
import { rollable } from "./rollable.js";

/* Tras el nombre va punto, así que el texto sigue en mayúscula */
const capFirst = s => s.charAt(0).toUpperCase() + s.slice(1);
/* Las fórmulas del texto se tocan para tirar, a nombre de la criatura */
const trait = (line, who) => {
  const i = line.indexOf(" — ");
  return i > 0
    ? `<p class="mon-trait"><b>${esc(line.slice(0, i))}</b> ${rollable(capFirst(line.slice(i + 3)), `${who} · ${line.slice(0, i)}`)}</p>`
    : `<p class="mon-trait">${rollable(line, who)}</p>`;
};
const prop = (label, value) => value === "" || value === undefined || value === null ? ""
  : `<p class="mon-prop"><b>${label}</b> ${esc(value)}</p>`;

/* b: una criatura del bestiario o un monstruo de la mesa.
   opts.hp: lo que pone en «Puntos de golpe» (por defecto, la media y sus dados).
   opts.act: si se da, cada característica es un botón con ese data-act. */
export function statBlockHTML(b, opts = {}) {
  const hp = opts.hp ?? `${b.hpAvg}${b.hpDice ? ` (${b.hpDice})` : ""}`;
  const abil = ([k, l]) => {
    const inner = `<span>${l}</span><b class="tnum">${b[k]} (${sign(modOf(b[k]))})</b>`;
    return opts.act
      ? `<button class="mon-abil" data-act="${opts.act}" data-ability="${k}">${inner}</button>`
      : `<div class="mon-abil">${inner}</div>`;
  };
  const traits = lines(b.traits);
  const actions = lines(b.actions);
  return `
  <div class="statblock">
    <h3 class="mon-name">${esc(b.name)}</h3>
    ${b.sizeType ? `<p class="mon-meta">${esc(b.sizeType)}</p>` : ""}
    <i class="mon-rule"></i>
    ${prop("Clase de armadura", b.ac)}
    ${prop("Puntos de golpe", hp)}
    ${prop("Velocidad", b.speed + " pies")}
    <i class="mon-rule"></i>
    <div class="mon-abils">${ABILITIES.map(abil).join("")}</div>
    <i class="mon-rule"></i>
    ${prop("Resistencias", b.resistances)}
    ${prop("Sentidos", b.senses)}
    ${prop("Idiomas", b.languages)}
    ${b.cr !== undefined && b.cr !== "" ? `<p class="mon-prop"><b>Desafío</b> ${esc(b.cr)} (${b.xp || 0} PX)</p>` : ""}
    ${traits.length ? `<i class="mon-rule"></i>${traits.map(l => trait(l, b.name)).join("")}` : ""}
    ${actions.length ? `<h4 class="mon-head">Acciones</h4>${actions.map(l => trait(l, b.name)).join("")}` : ""}
  </div>`;
}
