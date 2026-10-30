/* La hoja de 2024: lo que trae la hoja oficial y Mesa no guardaba se sanea
   al cargar y al recibirlo del jugador, y los PX de su personaje son suyos. */

import test from "node:test";
import assert from "node:assert/strict";
import { normalizeChar, profForLevel } from "../public/js/schema.js";
import { createEngine } from "../public/js/engine.js";
import "../public/js/spells.js";

let n = 0;
const rid = () => "id" + (n++);
const dm = { id: "dm1", name: "DM", role: "dm", charId: null };
const pl = { id: "p1", name: "Lu", role: "player", charId: "pc1" };

test("los campos nuevos de la hoja tienen valores por defecto y se sanean", () => {
  const c = normalizeChar({ name: "Aria" });
  assert.deepEqual(c.coins, { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
  assert.deepEqual(c.attune, ["", "", ""]);
  assert.deepEqual(c.armorTraining, []);
  assert.equal(c.subclass, "");
  const raro = normalizeChar({ coins: { gp: "25", sp: -3, xx: 9 }, attune: ["Anillo", 4, null, "de sobra"], armorTraining: ["light", "mithril", "shields"], shieldOn: "sí" });
  assert.deepEqual(raro.coins, { cp: 0, sp: 0, ep: 0, gp: 25, pp: 0 });
  assert.deepEqual(raro.attune, ["Anillo", "4", ""]);
  assert.deepEqual(raro.armorTraining, ["light", "shields"]);
  assert.equal(raro.shieldOn, true);
});

test("el bonificador por competencia de 2024 por nivel", () => {
  assert.deepEqual([1, 4, 5, 8, 9, 12, 13, 16, 17, 20].map(profForLevel), [2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
});

test("el jugador apunta los PX de su personaje y la hoja nueva llega saneada", async () => {
  const eng = createEngine({ rid });
  await eng.run(dm, [{ type: "char.add", chars: [{ id: "pc1", kind: "pc", name: "Aria", claimedBy: "Lu" }, { id: "m1", kind: "monster", name: "Orco", xp: 100 }] }]);
  await eng.run(pl, [{ type: "char.patch", id: "pc1", fields: { xp: 900, coins: { gp: "12", cp: -1 }, attune: "no es una lista", subclass: "Ladrón" } }]);
  const c = eng.doc.chars.find(x => x.id === "pc1");
  assert.equal(c.xp, 900);
  assert.deepEqual(c.coins, { cp: 0, sp: 0, ep: 0, gp: 12, pp: 0 });
  assert.deepEqual(c.attune, ["", "", ""]);
  assert.equal(c.subclass, "Ladrón");
  const r = await eng.run(pl, [{ type: "char.patch", id: "m1", fields: { xp: 1 } }]);
  assert.ok(r.error, "la ficha de un monstruo no es suya");
});
