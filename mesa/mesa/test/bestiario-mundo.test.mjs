/* Las criaturas de la casa (Península y Mundo) */
import test from "node:test";
import assert from "node:assert/strict";
import { CATALOG, typeOf } from "../public/js/catalog.js";
import { WORLD } from "../public/js/bestiario-mundo.js";
import { HOMEBREW } from "../public/js/bestiario-homebrew.js";
import { parseAttackLine } from "../public/js/schema.js";

const mod = s => Math.floor((s - 10) / 2);
const house = CATALOG.filter(b => b.edition === "homebrew");

test("el bestiario del mundo trae 40 criaturas, wendigo incluido", () => {
  assert.equal(WORLD.length, 40);
  assert.equal(house.length, HOMEBREW.length + WORLD.length);
  assert.ok(CATALOG.some(b => b.id === "hb-wendigo" && b.en.name === "Wendigo"));
  assert.equal(new Set(CATALOG.map(b => b.id)).size, CATALOG.length);
});

test("las cuentas de cada ficha de la casa cuadran", () => {
  for (const b of house) {
    const [, n, d, k] = b.hpDice.match(/(\d+)d(\d+)(?:\+(\d+))?/);
    assert.equal(Math.floor(n * (+d + 1) / 2) + (+k || 0), b.hpAvg, `${b.name}: PG`);
    assert.ok(typeOf(b.sizeType), `${b.name}: tipo`);
    assert.ok(b.xp > 0 && b.pb >= 2, `${b.name}: PX y BC`);
    const mods = ["str", "dex", "con", "int", "wis", "cha"].map(a => mod(b[a]));
    const per = (b.skills || "").match(/Percepción \+(\d+)/);
    assert.ok(b.senses.includes("Percepción pasiva " + (10 + (per ? +per[1] : mod(b.wis)))), `${b.name}: pasiva`);
    for (const k of ["traits", "actions", "bonus", "reactions", "legendary"]) {
      const es = String(b[k] || "").split("\n").filter(Boolean), en = String(b.en[k] || "").split("\n").filter(Boolean);
      assert.equal(es.length, en.length, `${b.name}: líneas de ${k} en inglés`);
      for (const line of es) {
        const hit = line.match(/\+(\d+) al ataque/);
        if (hit) assert.ok(mods.some(m => m + b.pb === +hit[1]), `${b.name}: ${line.slice(0, 30)}`);
        for (const c of line.matchAll(/CD (\d+) de \p{L}+/gu)) assert.ok(mods.some(m => 8 + b.pb + m === +c[1]), `${b.name}: ${c[0]}`);
      }
    }
    if (b.origin) assert.ok(b.en.origin, `${b.name}: origen en inglés`);
  }
});

test("los ataques de las criaturas del mundo se tiran de un clic", () => {
  const wendigo = CATALOG.find(b => b.id === "hb-wendigo");
  const lines = wendigo.actions.split("\n").map(parseAttackLine).filter(Boolean);
  assert.deepEqual(lines.map(a => a.name), ["Garra", "Mordisco", "Aullido del hambre (recarga 5–6)"]);
  assert.equal(lines[0].atk, 9);
  assert.equal(lines[2].save, "wis 15");
});
