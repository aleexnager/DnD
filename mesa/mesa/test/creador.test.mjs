/* Creador de personajes: de las elecciones a una ficha de nivel 1 correcta */

import test from "node:test";
import assert from "node:assert/strict";
import { CLASSES, SPECIES, POINT_COST, POINTS, STANDARD_ARRAY, buildCharacter, finalScores } from "../public/js/creador-datos.js";
import { SPELL_LIBRARY } from "../public/js/spells.js";
import { SKILLS, normalizeChar } from "../public/js/schema.js";

const base = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
const make = (classId, speciesId, extra = {}) => buildCharacter({ name: "X", classId, speciesId, bgId: "soldado", base, ...extra });

test("vida y CA de nivel 1 según clase, especie y equipo", () => {
  const casos = [
    ["guerrero", "enano", 13, 19],     // d10 + CON 2 + enano 1 · malla 16 + escudo 2 + Defensa 1
    ["picaro", "elfo", 9, 14],         // d8 + CON 1 · cuero 11 + DES 3
    ["mago", "gnomo", 8, 12],          // d6 + CON 2 · 10 + DES 2
    ["monje", "humano", 10, 12],       // d8 + CON 2 · 10 + DES 2 + SAB 0
    ["barbaro", "semiorco", 14, 14],   // d12 + CON 2 · 10 + DES 2 + CON 2
    ["hechicero", "draconido", 8, 15], // d6 + CON 1 + linaje 1 · 13 + DES 2
    ["clerigo", "mediano", 9, 18]      // d8 + CON 1 · escamas 14 + DES (máx. 2) + escudo 2
  ];
  for (const [c, s, hp, ac] of casos) {
    const ch = make(c, s);
    assert.equal(ch.hp, hp, `${c} ${s}: vida`);
    assert.equal(ch.ac, ac, `${c} ${s}: CA`);
  }
});

test("los ataques usan FUE, DES o la mejor de las dos si el arma es sutil", () => {
  const ch = make("picaro", "elfo");          // FUE 15 (+2), DES 16 (+3)
  const by = Object.fromEntries(ch.attacks.map(a => [a.name, a]));
  assert.equal(by["Estoque"].atk, 5);
  assert.equal(by["Estoque"].damage, "1d8+3");
  assert.equal(by["Arco corto"].atk, 5);
  const g = make("guerrero", "humano");      // FUE 16 (+3), DES 15 (+2)
  assert.equal(g.attacks.find(a => a.name === "Espada larga").damage, "1d8+3");
  assert.equal(g.attacks.find(a => a.name === "Ballesta ligera").atk, 4);
});

test("las especies suben sus características, y el semielfo las que elija", () => {
  assert.equal(finalScores({ speciesId: "humano", base }).cha, 9);
  const se = finalScores({ speciesId: "semielfo", base, free: ["str", "con"] });
  assert.deepEqual([se.str, se.con, se.cha], [16, 14, 10]);
});

test("la ficha sale completa: competencias, equipo, rasgos, recursos y conjuros", () => {
  const ch = normalizeChar(make("bardo", "tiefling", { skills: ["interpretacion", "persuasion", "enganio"], spells: ["burla-danina", "dormir"] }));
  assert.deepEqual(ch.saves, ["dex", "cha"]);
  assert.ok(ch.skills.includes("interpretacion") && ch.skills.includes("atletismo"));   // atletismo: soldado
  assert.ok(ch.items.some(i => i.name === "Armadura de cuero" && i.equipped));
  assert.deepEqual(ch.features.map(f => f.source).filter((v, i, a) => a.indexOf(v) === i), ["Clase", "Especie", "Trasfondo"]);
  assert.equal(ch.resources[0].name, "Inspiración bárdica");
  assert.equal(ch.resources[0].max, 1);                  // CAR 8 + 2 = 10 → +0, pero al menos 1
  assert.deepEqual(ch.spellbook.map(s => s.name), ["Burla dañina", "Dormir"]);
  assert.equal(ch.castAbility, "cha");
  assert.equal(ch.slots[0], 2);
  assert.equal(ch.vision, 12);
});

test("los datos son coherentes con el resto de la aplicación", () => {
  const skills = new Set(SKILLS.map(s => s[0])), spells = new Set(SPELL_LIBRARY.map(s => s.id));
  for (const c of CLASSES) {
    for (const k of c.from) assert.ok(skills.has(k), `${c.id}: habilidad ${k}`);
    for (const s of c.spells || []) assert.ok(spells.has(s), `${c.id}: conjuro ${s}`);
    assert.ok(c.from.length >= c.choose, `${c.id}: hay donde elegir`);
  }
  for (const s of SPECIES) for (const k of s.skills || []) assert.ok(skills.has(k), `${s.id}: habilidad ${k}`);
  assert.deepEqual(STANDARD_ARRAY, [15, 14, 13, 12, 10, 8]);
  assert.equal(POINT_COST[15] * 3 + POINT_COST[8] * 3, POINTS);      // tres 15 y tres 8 gastan justo los 27
});
