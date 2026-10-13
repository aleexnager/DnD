/* El tutorial: que esté completo, en los dos idiomas, y que no se quede
   atrás cuando se añade un botón */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TOURS, SCENES } from "../public/js/tour-content.js";
import { fmt } from "../public/js/tour.js";

const src = f => readFileSync(new URL("../public/js/" + f, import.meta.url), "utf8");
const targets = tour => tour.sections.flatMap(s => s.steps.map(st => String(st.t || ""))).join("\n");
const byRole = role => TOURS.find(t => t.role === role);

test("un recorrido por pantalla: DM, jugador, tele y entrada", () => {
  assert.deepEqual(TOURS.map(t => t.role).sort(), ["dm", "gate", "player", "screen"]);
});

test("cada sección y cada paso en español y en inglés, con título y texto", () => {
  for (const tour of TOURS) {
    for (const k of ["label", "where", "intro", "invite"]) assert.equal(tour[k].length, 2, `${tour.id}.${k}`);
    const ids = new Set();
    for (const s of tour.sections) {
      assert.ok(!ids.has(s.id), `${tour.id}: sección repetida ${s.id}`);
      ids.add(s.id);
      for (const lang of ["es", "en"]) assert.ok(s[lang][0] && s[lang][1], `${tour.id}/${s.id} sin título o resumen en ${lang}`);
      assert.ok(s.steps.length, `${tour.id}/${s.id} sin pasos`);
      for (const st of s.steps) for (const lang of ["es", "en"]) {
        assert.equal(st[lang].length, 2, `${tour.id}/${s.id}: paso mal formado`);
        assert.ok(st[lang][0].length > 2 && st[lang][1].length > 20, `${tour.id}/${s.id} «${st.es[0]}» corto en ${lang}`);
      }
      /* Las listas y negritas tienen que cuadrar en los dos idiomas */
      for (const st of s.steps) {
        const count = (t, re) => (t.match(re) || []).length;
        assert.equal(count(st.es[1], /\n- /g), count(st.en[1], /\n- /g), `${tour.id} «${st.es[0]}»: listas distintas`);
        assert.equal(count(st.es[1], /\*\*/g) % 2, 0, `${tour.id} «${st.es[0]}»: negrita sin cerrar`);
        assert.equal(count(st.en[1], /\*\*/g) % 2, 0, `${tour.id} «${st.en[0]}»: negrita sin cerrar`);
      }
    }
  }
});

test("los escenarios que se nombran existen", () => {
  for (const tour of TOURS) for (const s of tour.sections) {
    if (s.scene) assert.ok(SCENES[s.scene], `escenario ${s.scene}`);
    for (const st of s.steps) if (st.scene) assert.ok(SCENES[st.scene], `escenario ${st.scene}`);
  }
});

test("el formato: negrita, teclas, listas y nada de HTML colado", () => {
  assert.equal(fmt("Pulsa **Tirar** o [[Intro]]"), "<p>Pulsa <b>Tirar</b> o <kbd>Intro</kbd></p>");
  assert.equal(fmt("Dos:\n- uno\n- dos\nFin"), "<p>Dos:</p><ul><li>uno</li><li>dos</li></ul><p>Fin</p>");
  assert.equal(fmt("<img onerror=x>"), "<p>&lt;img onerror=x&gt;</p>");
});

test("todas las herramientas del mapa del DM tienen su explicación", () => {
  const tools = [...src("dm.js").matchAll(/data-tool="([a-z]+)"/g)].map(m => m[1]);
  assert.ok(tools.length >= 10);
  const t = targets(byRole("dm"));
  for (const k of new Set(tools)) assert.ok(t.includes(`[data-tool="${k}"]`), `falta la herramienta ${k}`);
  for (const id of ["terrain", "zones", "shapes", "mapPick"]) assert.ok(t.includes("#" + id), `falta #${id}`);
});

test("el menú ⋯ del DM, los botones de arriba y los del panel de dados", () => {
  const dm = src("dm.js"), t = targets(byRole("dm"));
  const menuSrc = dm.slice(dm.indexOf("function openMenu"), dm.indexOf("async function showJoinInfo"));
  const menu = [...menuSrc.matchAll(/item\("([a-z]+)"/g)].map(m => m[1]).filter(k => !["import", "leave", "tour"].includes(k));
  assert.ok(menu.length >= 4);
  for (const k of menu) assert.ok(t.includes(`[data-menu="${k}"]`), `falta ⋯ → ${k}`);
  for (const id of ["campaign", "presence", "undoBtn", "moreBtn", "addBtn", "randomBtn", "bestiaryBtn", "combatBtn", "restBtn"]) assert.ok(t.includes("#" + id), `falta #${id}`);
  for (const sel of [".dice-pad", ".adv", "[data-secret]", ".dice-form", ".log-tabs", ".chat-form", "[data-clear]", "[data-toggle]"]) assert.ok(t.includes(sel), `falta ${sel}`);
  for (const k of ["search", "add", "hide"]) assert.ok(t.includes(`[data-shelf="${k}"]`), `falta la biblioteca: ${k}`);
});

test("las herramientas del mapa del jugador y sus pestañas", () => {
  const pl = src("player.js"), t = targets(byRole("player"));
  for (const k of new Set([...pl.matchAll(/data-ptool="([a-zA-Z]+)"/g)].map(m => m[1]).filter(k => k !== "drawErase"))) assert.ok(t.includes(`[data-ptool="${k}"]`), `falta ${k}`);
  for (const sel of [".tabbar", ".hp-box", ".cond-box", ".action-grid", ".roll-box", ".notes-box", "#areaBtn", "#leaveBtn"]) assert.ok(t.includes(sel), `falta ${sel}`);
});

test("los atajos de teclado del DM salen en el tutorial", () => {
  const keys = byRole("dm").sections.find(s => s.id === "atajos").steps.map(s => s.es[1]).join("\n");
  for (const k of ["[[K]]", "[[B]]", "[[N]]", "[[Z]]", "[[Espacio]]", "[[Alt]]", "[[Mayús]]"]) assert.ok(keys.includes(k), `falta el atajo ${k}`);
});
