/* Los indicadores de ataques y conjuros: alcance, área, tirada, estado,
   invocación y concentración, leídos de la ficha o del texto del bestiario */

import test from "node:test";
import assert from "node:assert/strict";
import { parseAttackLine, normalizeSpell } from "../public/js/schema.js";
import { SPELL_LIBRARY } from "../public/js/spells.js";
import { CATALOG } from "../public/js/catalog.js";
import { spellChips, attackChips, chipsHTML } from "../public/js/chips.js";

const kinds = list => list.map(c => `${c.kind}:${c.text}`);
const spell = id => normalizeSpell(SPELL_LIBRARY.find(s => s.id === id));

test("conjuros: alcance máximo, área, salvación, estado, invocación y concentración", () => {
  assert.deepEqual(kinds(spellChips(spell("bola-de-fuego"))), ["reach:150 pies", "area:esfera 20 pies", "roll:DES ½"]);
  assert.deepEqual(kinds(spellChips(spell("ola-atronadora"))), ["reach:Personal", "area:cubo 15 pies", "roll:CON ½"]);
  assert.deepEqual(kinds(spellChips(spell("rayo-de-fuego"))), ["reach:120 pies", "roll:Ataque"]);
  assert.deepEqual(kinds(spellChips(spell("curar-heridas"))), ["reach:Toque", "heal:Cura"]);
  const hold = kinds(spellChips(spell("inmovilizar-persona")));
  assert.ok(hold.includes("cond:Paralizado") && hold.includes("conc:Conc.") && hold.includes("roll:SAB"), hold.join());
  const weapon = kinds(spellChips(spell("arma-espiritual")));
  assert.ok(weapon.includes("summon:Invoca") && weapon.includes("conc:Conc."), weapon.join());
  assert.ok(kinds(spellChips(spell("toque-helado"))).includes("reach:Toque"));
  /* Todos los de la biblioteca dicen al menos hasta dónde llegan */
  for (const sp of SPELL_LIBRARY) assert.ok(spellChips(normalizeSpell(sp)).some(c => c.kind === "reach"), sp.name);
});

test("ataques: cuerpo a cuerpo, a distancia con máximo, arrojadizos, área y estado", () => {
  const dagger = attackChips(parseAttackLine("Daga — +4 al ataque — 1d4+2 perforante · alcance 5 pies o distancia 20/60 pies"));
  assert.deepEqual(kinds(dagger), ["reach:5 pies", "reach:20/60 pies"]);
  assert.match(dagger[1].title, /60 como máximo/);
  const breath = parseAttackLine("Aliento de fuego (recarga 5–6) — CD 12 de Destreza — cada criatura en un cono de 15 pies. Fallo: 5d6 fuego. Éxito: la mitad del daño.");
  assert.deepEqual(kinds(attackChips(breath)), ["area:cono 15 pies", "roll:DES"]);
  const tusk = parseAttackLine("Colmillos — +3 al ataque — 1d6+1 perforante. Si se ha movido 20 pies en línea recta, queda derribado · alcance 5 pies");
  assert.equal(tusk.cond, "derribado");
  assert.equal(tusk.area, "", "«en línea recta» no es un área");
  assert.ok(kinds(attackChips(tusk)).includes("cond:Derribado"));
  /* Una ficha de PJ escrita a mano: «5 pies» es cuerpo a cuerpo, «80/320» a distancia */
  assert.equal(attackChips({ range: "5 pies" })[0].ico, "sword");
  assert.equal(attackChips({ range: "80/320" })[0].ico, "arrow");
  assert.equal(attackChips({ range: "" }).length, 0);
});

test("todo el bestiario se lee: cada ataque con tirada sabe su alcance", () => {
  let n = 0;
  const lines = b => [b.actions, b.bonus, b.reactions, b.legendary].flatMap(t => String(t || "").split("\n"));
  for (const b of CATALOG) for (const a of lines(b).map(parseAttackLine)) {
    if (!a || a.save || !a.range) continue;
    n++;
    assert.ok(attackChips(a).some(c => c.kind === "reach"), `${b.name}: ${a.name}`);
  }
  assert.ok(n > 150, `${n} ataques`);
});

test("el HTML de los chips lleva su explicación accesible", () => {
  const html = chipsHTML(spellChips(spell("bola-de-fuego")));
  assert.match(html, /class="fx fx-area" title="De área: esfera de 20 pies de radio" aria-label=/);
  assert.match(html, /<svg class="ico"/);
  assert.equal(chipsHTML([]), "");
});
