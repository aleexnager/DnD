/* La ficha de una criatura en pergamino, como en los manuales: nombre en
   versalitas, filetes rojos, características en fila y cada rasgo con su
   nombre en negrita cursiva. La usan el bestiario y las tarjetas de los
   monstruos en la mesa.

   Los rasgos se escriben «Nombre — texto». Se pintan en dos nodos de texto
   (el nombre y el resto, que empieza en mayúscula) y i18n.js empareja los
   dos trozos con su inglés,
   así que la traducción sigue funcionando. */

import { esc, lines, sign } from "./util.js";
import { ABILITIES, modOf, initBonus } from "./schema.js";
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
   opts.act: si se da, cada característica es un botón con ese data-act.
   Sigue la ficha de 2024: CA e iniciativa en la misma línea, cada
   característica con su modificador y su salvación, defensas por separado y
   una sección por tipo de acción. */
export function statBlockHTML(b, opts = {}) {
  const hp = opts.hp ?? `${b.hpAvg}${b.hpDice ? ` (${b.hpDice})` : ""}`;
  const pb = b.pb || b.proficiency || 2;
  const saves = b.saves || [];
  const init = initBonus(b);
  const abil = ([k, l]) => {
    const mod = modOf(b[k]), save = mod + (saves.includes(k) ? pb : 0);
    const inner = `<span>${l}</span><b class="tnum">${b[k]}</b><small class="tnum" title="Modificador">${sign(mod)}</small><small class="tnum ${save !== mod ? "prof" : ""}" title="Salvación">${sign(save)}</small>`;
    return opts.act
      ? `<button class="mon-abil" data-act="${opts.act}" data-ability="${k}">${inner}</button>`
      : `<div class="mon-abil">${inner}</div>`;
  };
  const section = (title, text) => {
    const list = lines(text);
    return list.length ? `<h4 class="mon-head">${title}</h4>${list.map(l => trait(l, b.name)).join("")}` : "";
  };
  const skills = typeof b.skillsText === "string" && b.skillsText ? b.skillsText : typeof b.skills === "string" ? b.skills : "";
  const traits = lines(b.traits);
  const meta = [b.sizeType, b.alignment].filter(Boolean).join(", ");
  return `
  <div class="statblock">
    <h3 class="mon-name">${esc(b.name)}</h3>
    ${meta ? `<p class="mon-meta">${esc(meta)}</p>` : ""}
    ${b.edition === "2024" ? `<span class="mon-ed" title="Ficha de las reglas de 2024 (SRD 5.2.1)${b.srd ? " · " + esc(b.srd) : ""}">Reglas 2024</span>`
      : b.edition === "2014" ? `<span class="mon-ed old" title="Esta criatura no está en el SRD de 2024: su ficha es la de 2014">Ficha 2014</span>` : ""}
    <i class="mon-rule"></i>
    <p class="mon-prop mon-ac"><b>CA</b> ${esc(b.ac)} <b>Iniciativa</b> ${sign(init)} (${10 + init})</p>
    ${prop("Puntos de golpe", hp)}
    ${prop("Velocidad", b.speedText || b.speed + " pies")}
    <div class="mon-abils">${ABILITIES.map(abil).join("")}</div>
    <p class="mon-abil-key"><span>mod.</span><span>salv.</span></p>
    ${prop("Habilidades", skills)}
    ${prop("Equipo", b.gear)}
    ${prop("Vulnerabilidades", b.vulnerabilities)}
    ${prop("Resistencias", b.resistances)}
    ${prop("Inmunidades", b.immunities)}
    ${prop("Sentidos", b.senses)}
    ${prop("Idiomas", b.languages)}
    ${b.cr !== undefined && b.cr !== "" ? `<p class="mon-prop"><b>VD</b> ${esc(b.cr)} (${b.xp || 0} PX; BC ${sign(pb)})</p>` : ""}
    ${traits.length ? `<h4 class="mon-head">Rasgos</h4>${traits.map(l => trait(l, b.name)).join("")}` : ""}
    ${section("Acciones", b.actions)}
    ${section("Acciones adicionales", b.bonus)}
    ${section("Reacciones", b.reactions)}
    ${section("Acciones legendarias", b.legendary)}
  </div>`;
}
