/* Las fichas de antes guardaban ataques, conjuros y equipo como texto: al
   cargarlas pasan a sus listas una sola vez y sin perder nada. */

import test from "node:test";
import assert from "node:assert/strict";
import { normalizeChar, normalizeItem, normalizeFeature, migrate } from "../public/js/schema.js";
import "../public/js/spells.js";
import { linesToEntries, entriesToLines } from "../public/js/list-editor.js";

const old = {
  name: "Aria",
  weapons: "Espada corta — +5 al ataque — 1d6+3 perforante\nDaga x2",
  inventory: "2 antorchas\nCuerda de cáñamo (50 pies)\nraciones x5",
  spells: "Proyectil mágico\nLuz: ilumina un objeto"
};

test("las armas con tirada pasan a ataques y las demás al equipo", () => {
  const c = normalizeChar(old);
  assert.deepEqual(c.attacks.map(a => [a.name, a.atk, a.damage, a.type]), [["Espada corta", 5, "1d6+3", "perforante"]]);
  assert.deepEqual(c.items[0], { name: "Daga", qty: 2, weight: 0, equipped: true, note: "" });
  assert.equal(c.weapons, "");
});

test("el equipo lee las cantidades y pone mayúscula", () => {
  const c = normalizeChar(old);
  assert.deepEqual(c.items.slice(1).map(x => [x.name, x.qty]),
    [["Antorchas", 2], ["Cuerda de cáñamo (50 pies)", 1], ["Raciones", 5]]);
  assert.equal(c.inventory, "");
});

test("los conjuros de la biblioteca entran con su mecánica y los demás como nota", () => {
  const c = normalizeChar(old);
  const [pm, luz] = c.spellbook;
  assert.equal(pm.name, "Proyectil mágico");
  assert.equal(pm.mode, "auto");
  assert.equal(pm.level, 1);
  assert.deepEqual([luz.name, luz.mode, luz.desc], ["Luz", "none", "ilumina un objeto"]);
  assert.equal(c.spells, "");
});

test("pasar dos veces no duplica nada", () => {
  const once = normalizeChar(old);
  const twice = normalizeChar(once);
  assert.deepEqual(twice.attacks, once.attacks);
  assert.deepEqual(twice.items, once.items);
  assert.deepEqual(twice.spellbook.map(s => s.name), once.spellbook.map(s => s.name));
});

test("una partida guardada se migra al cargarla", () => {
  const doc = migrate({ chars: [old] });
  assert.equal(doc.chars[0].items.length, 4);
  assert.equal(doc.chars[0].weapons, "");
});

test("las listas se sanean: lo que no vale se corrige o se descarta", () => {
  assert.deepEqual(normalizeItem({ name: "  Cuerda ", qty: "-3", weight: "x", equipped: 1 }),
    { name: "Cuerda", qty: 0, weight: 0, equipped: true, note: "" });
  assert.equal(normalizeFeature({ name: "Ataque furtivo", source: "Inventado" }).source, "Otro");
  const c = normalizeChar({ items: [{ name: "" }, { name: "Daga" }, "basura"], features: [{}, { name: "Afortunada" }] });
  assert.deepEqual(c.items.map(x => x.name), ["Daga"]);
  assert.deepEqual(c.features.map(x => x.name), ["Afortunada"]);
});

test("los rasgos de las criaturas van y vuelven entre texto y filas", () => {
  const text = "Huida ágil — Se desengancha como acción adicional.\nSolo una línea";
  const rows = linesToEntries(text);
  assert.deepEqual(rows, [{ name: "Huida ágil", text: "Se desengancha como acción adicional." }, { name: "", text: "Solo una línea" }]);
  assert.equal(entriesToLines(rows), text);
});
