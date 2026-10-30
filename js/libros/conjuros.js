/* Compendio de conjuros: los 391 del Manual del Jugador de 2024. 339 vienen
   del SRD 5.2.1 (Wizards of the Coast, CC BY 4.0) y los otros 52 están
   resumidos con palabras propias a partir de sus reglas; todos contrastados
   con el texto del SRD (Open5e) y con la lista completa de 2024 (clases,
   niveles, componentes, alcance y duración). En castellano para Mesa. Cada uno:
   [nombre, nivel, escuela, tiempo, alcance, componentes, duración, clases,
    efecto, a niveles superiores]. «Conc.» es concentración; (ritual) se
   puede lanzar como ritual. Los que Mesa sabe lanzar llevan su sello.
   Las filas salen de un guion a partir del texto del SRD: si se rehacen,
   que los nombres de los que están en spells.js sigan siendo los mismos. */

import { SPELL_LIBRARY } from "../spells.js";
import { esc } from "../util.js";
import { rollable } from "../rollable.js";
import { t, currentLang } from "../i18n.js";
import { ROWS as S, CLS } from "./conjuros-lista.js";

/* ---------- El libro ---------- */
const LEVELS = ["Trucos", "Nivel 1", "Nivel 2", "Nivel 3", "Nivel 4", "Nivel 5", "Nivel 6", "Nivel 7", "Nivel 8", "Nivel 9"];
const INTRO = [
  "Conjuros menores que se lanzan a voluntad, sin gastar espacios. Los de daño crecen con el nivel del personaje.",
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `Gastan un espacio de nivel ${n} o mayor. Lanzados con un espacio superior, muchos mejoran: lo pone en «A niveles superiores».`)
];
export const CONJUROS = S.map(([name, level, school, time, range, comps, duration, classes, desc, higher]) =>
  ({ name, level, school, time, range, comps, duration, classes: classes.split(/\s+/).map(c => CLS[c]).filter(Boolean), desc, higher: higher || "" }));
const slug = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
/* Todos se pueden añadir a una ficha; el sello marca los que Mesa resuelve
   sola (tirada de ataque, salvación, daño directo, cura o vida temporal) */
const castable = new Set(SPELL_LIBRARY.filter(s => s.mode !== "none").map(s => slug(s.name)));

/* En inglés el libro se arma ya traducido (i18n.js trae los textos de los
   conjuros): traducir después en el documento no sirve, porque las fórmulas
   tirables parten cada párrafo en trozos */
const card = (sp, en) => ({
  id: "sp-" + slug(sp.name),
  title: en ? t(sp.name) : sp.name,
  meta: en ? (sp.level ? `Level ${sp.level} ${t(sp.school).toLowerCase()}` : `${t(sp.school)} cantrip`)
    : `${sp.level ? `${esc(sp.school)} de nivel ${sp.level}` : `Truco de ${esc(sp.school.toLowerCase())}`}`,
  html: `<dl class="spell-card">
      <div><dt>${en ? "Casting time" : "Tiempo"}</dt><dd>${esc(en ? t(sp.time) : sp.time)}</dd></div><div><dt>${en ? "Range" : "Alcance"}</dt><dd>${esc(en ? t(sp.range) : sp.range)}</dd></div>
      <div><dt>${en ? "Components" : "Componentes"}</dt><dd>${esc(en ? t(sp.comps) : sp.comps)}</dd></div><div><dt>${en ? "Duration" : "Duración"}</dt><dd>${esc(en ? t(sp.duration) : sp.duration)}</dd></div></dl>
    <p>${rollable(sp.desc)}</p>
    ${sp.higher ? `<p><b>${en ? "At higher levels." : "A niveles superiores."}</b> ${rollable(sp.higher)}</p>` : ""}
    <p class="spell-classes">${sp.classes.map(c => `<span>${esc(en ? t(c) : c)}</span>`).join("")}${castable.has(slug(sp.name)) ? `<span class="castable">${en ? "Mesa resolves it on its own" : "Se resuelve solo en Mesa"}</span>` : ""}</p>`
});

export function spellsBook() {
  const en = currentLang() === "en";
  const name = s => en ? t(s.name) : s.name;
  const lvTitle = n => en ? (n ? `Level ${n}` : "Cantrips") : LEVELS[n];
  const intro = n => en ? (n ? `They spend a level ${n} slot or higher. Cast with a higher slot, many improve: see «At higher levels».`
    : "Minor spells cast at will, without spending slots. Damaging ones grow with the character's level.") : INTRO[n];
  const sort = (a, b) => name(a).localeCompare(name(b), en ? "en" : "es");
  const sections = LEVELS.map((title, level) => ({
    id: "lv" + level, title: lvTitle(level), intro: `<p>${intro(level)}</p>`,
    entries: CONJUROS.filter(s => s.level === level).sort(sort).map(sp => card(sp, en))
  }));
  /* Índices: por clase y por escuela */
  const classes = [...new Set(Object.values(CLS))].sort((a, b) => a.localeCompare(b, "es"));
  sections.push({
    id: "por-clase", title: en ? "By class" : "Por clase",
    intro: `<p>${en ? "Which spells each class can learn, from lowest to highest level." : "Qué conjuros puede aprender cada clase, de menos a más nivel."}</p>`,
    entries: classes.map(c => ({ id: "cl-" + slug(c), title: en ? t(c) : c, html: LEVELS.map((lv, n) => {
      const list = CONJUROS.filter(s => s.level === n && s.classes.includes(c)).sort(sort).map(name);
      return list.length ? `<p><b>${lvTitle(n)}.</b> ${list.map(esc).join(", ")}</p>` : "";
    }).join("") }))
  });
  const schools = [...new Set(CONJUROS.map(s => s.school))].sort((a, b) => a.localeCompare(b, "es"));
  sections.push({
    id: "por-escuela", title: en ? "By school" : "Por escuela",
    intro: `<p>${en ? "The eight schools of magic and their spells." : "Las ocho escuelas de magia y sus conjuros."}</p>`,
    entries: schools.map(sc => ({ id: "es-" + slug(sc), title: en ? t(sc) : sc, html: `<ul class="tome-cols">${CONJUROS.filter(s => s.school === sc)
      .sort((a, b) => a.level - b.level || sort(a, b)).map(s => `<li>${esc(name(s))} <small>${s.level ? (en ? "lv " : "nv ") + s.level : (en ? "cantrip" : "truco")}</small></li>`).join("")}</ul>` }))
  });
  sections.push({ id: "licencia", title: en ? "Credits" : "Créditos", entries: [{ id: "lic", title: "", html: en
    ? "<p>339 of the spells in this compendium come from the <i>System Reference Document 5.2.1</i> (the 2024 rules) by Wizards of the Coast LLC, published under the Creative Commons Attribution 4.0 licence (https://creativecommons.org/licenses/by/4.0/legalcode); in English they keep the SRD's own text, shortened when it's very long. The other 52 are from the 2024 <i>Player's Handbook</i>, and only what they do at the table is summarised here, in our own words.</p>"
    : "<p>339 de los conjuros de este compendio salen del <i>System Reference Document 5.2.1</i> (las reglas de 2024) de Wizards of the Coast LLC, publicado con licencia Creative Commons Attribution 4.0 (https://creativecommons.org/licenses/by/4.0/legalcode). Los 52 restantes son del <i>Manual del Jugador</i> de 2024 y aquí solo se resume, con palabras propias, lo que hacen en la mesa. Todos los textos están resumidos y redactados para Mesa.</p>" }] });
  return { sections };
}
