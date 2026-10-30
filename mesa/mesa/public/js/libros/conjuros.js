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
const castable = new Set(SPELL_LIBRARY.map(s => slug(s.name)));

const card = sp => ({
  id: "sp-" + slug(sp.name),
  title: sp.name,
  meta: `${sp.level ? `${esc(sp.school)} de nivel ${sp.level}` : `Truco de ${esc(sp.school.toLowerCase())}`}`,
  html: `<dl class="spell-card">
      <div><dt>Tiempo</dt><dd>${esc(sp.time)}</dd></div><div><dt>Alcance</dt><dd>${esc(sp.range)}</dd></div>
      <div><dt>Componentes</dt><dd>${esc(sp.comps)}</dd></div><div><dt>Duración</dt><dd>${esc(sp.duration)}</dd></div></dl>
    <p>${rollable(sp.desc)}</p>
    ${sp.higher ? `<p><b>A niveles superiores.</b> ${rollable(sp.higher)}</p>` : ""}
    <p class="spell-classes">${sp.classes.map(c => `<span>${esc(c)}</span>`).join("")}${castable.has(slug(sp.name)) ? `<span class="castable">Se lanza en Mesa</span>` : ""}</p>`
});

export function spellsBook() {
  const sections = LEVELS.map((title, level) => ({
    id: "lv" + level, title, intro: `<p>${INTRO[level]}</p>`,
    entries: CONJUROS.filter(s => s.level === level).sort((a, b) => a.name.localeCompare(b.name, "es")).map(card)
  }));
  /* Índices: por clase y por escuela */
  const classes = [...new Set(Object.values(CLS))].sort((a, b) => a.localeCompare(b, "es"));
  sections.push({
    id: "por-clase", title: "Por clase", intro: "<p>Qué conjuros puede aprender cada clase, de menos a más nivel.</p>",
    entries: classes.map(c => ({ id: "cl-" + slug(c), title: c, html: LEVELS.map((lv, n) => {
      const list = CONJUROS.filter(s => s.level === n && s.classes.includes(c)).map(s => s.name).sort((a, b) => a.localeCompare(b, "es"));
      return list.length ? `<p><b>${lv}.</b> ${list.map(esc).join(", ")}</p>` : "";
    }).join("") }))
  });
  const schools = [...new Set(CONJUROS.map(s => s.school))].sort((a, b) => a.localeCompare(b, "es"));
  sections.push({
    id: "por-escuela", title: "Por escuela", intro: "<p>Las ocho escuelas de magia y sus conjuros.</p>",
    entries: schools.map(sc => ({ id: "es-" + slug(sc), title: sc, html: `<ul class="tome-cols">${CONJUROS.filter(s => s.school === sc)
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "es")).map(s => `<li>${esc(s.name)} <small>${s.level ? "nv " + s.level : "truco"}</small></li>`).join("")}</ul>` }))
  });
  sections.push({ id: "licencia", title: "Créditos", entries: [{ id: "lic", title: "", html: "<p>339 de los conjuros de este compendio salen del <i>System Reference Document 5.2.1</i> (las reglas de 2024) de Wizards of the Coast LLC, publicado con licencia Creative Commons Attribution 4.0 (https://creativecommons.org/licenses/by/4.0/legalcode). Los 52 restantes son del <i>Manual del Jugador</i> de 2024 y aquí solo se resume, con palabras propias, lo que hacen en la mesa. Todos los textos están resumidos y redactados para Mesa.</p>" }] });
  return { sections };
}
