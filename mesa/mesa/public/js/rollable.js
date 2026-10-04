/* Fórmulas que se tocan para tirar, como en Beyond20: en un rasgo, un objeto,
   una nota, un conjuro o la ficha de un monstruo, «2d6 + 3» o «+5 al ataque»
   salen subrayados y un clic los tira con el nombre de quien lo tiene.

   El texto se traduce entero antes de partirlo (si el diccionario lo tiene),
   porque después la fórmula lo deja en varios trozos que i18n.js ya no
   reconoce. Cambiar de idioma recarga la página, así que no se queda viejo. */

import { esc } from "./util.js";
import { t } from "./i18n.js";

const DICE = String.raw`\b\d{0,2}d(?:4|6|8|10|12|20|100)\b(?:\s*[+\-−]\s*\d{1,3}\b(?!\s*d))?`;
const TO_HIT = String.raw`[+\-−]\d{1,2}(?=\s+(?:al ataque|to hit))`;
const FIND = new RegExp(`(${DICE})|(${TO_HIT})`, "gi");

const clean = f => f.replace(/−/g, "-").replace(/\s+/g, "").toLowerCase();

/* label: lo que pone el registro, «Nyx · Ataque furtivo» */
export function rollable(text, label = "") {
  const src = t(String(text ?? ""));
  let out = "", at = 0;
  for (const m of src.matchAll(FIND)) {
    const formula = m[1] ? clean(m[1]) : "1d20" + clean(m[2]).replace(/^(\d)/, "+$1");
    out += esc(src.slice(at, m.index)) +
      `<button type="button" class="rollf" data-roll-formula="${esc(formula)}" data-roll-label="${esc(label)}" title="Tirar ${esc(formula)}">${esc(m[0])}</button>`;
    at = m.index + m[0].length;
  }
  return out + esc(src.slice(at));
}
