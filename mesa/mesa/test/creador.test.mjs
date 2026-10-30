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

/* ---------- Personajes de nivel alto ---------- */
import { slotsFor, spellPicks, spellOptions, asiLevels, subclassOf, classFeaturesUpTo, maxSpellLevel } from "../public/js/creador-datos.js";
const base15 = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };

test("nivel alto: vida media por nivel, competencia, dados de golpe y espacios", () => {
  const ch = buildCharacter({ classId: "guerrero", speciesId: "humano", bgId: "soldado", level: 9, base: base15, asi: [["str", "str"], ["con", "dex"], ["str", "con"]] });
  assert.equal(ch.level, 9);
  assert.equal(ch.proficiency, 4);
  assert.equal(ch.hitDice, "9d10");
  /* Humano +1 a todo: FUE 16 +2 +1 = 19; CON 14 +1 +1 = 16 (+3) */
  assert.equal(ch.str, 19);
  assert.equal(ch.con, 16);
  assert.equal(ch.maxHp, 10 + 3 + 8 * (6 + 3));
  assert.deepEqual(asiLevels(CLASSES.find(c => c.id === "guerrero"), 9), [4, 6, 8], "el guerrero tiene mejoras de más");
  assert.equal(ch.subclass, "Campeón");
  assert.ok(ch.features.some(f => f.name === "Crítico mejorado"));
  assert.equal(ch.attacks.find(a => a.name === "Espada larga").atk, 4 + 4, "FUE +4 y la competencia de su nivel, +4");
});

test("las tablas de espacios: completo, medio lanzador y pacto del brujo", () => {
  const C = id => CLASSES.find(c => c.id === id);
  assert.deepEqual(slotsFor(C("mago"), 20), [4, 3, 3, 3, 3, 2, 2, 1, 1]);
  assert.deepEqual(slotsFor(C("paladin"), 1), [2, 0, 0, 0, 0, 0, 0, 0, 0], "en 2024 el paladín lanza desde nivel 1");
  assert.deepEqual(slotsFor(C("paladin"), 9), [4, 3, 2, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(slotsFor(C("brujo"), 11), [0, 0, 0, 0, 3, 0, 0, 0, 0]);
  assert.deepEqual(slotsFor(C("picaro"), 20), [0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(maxSpellLevel(C("mago"), 5), 3);
  assert.equal(spellPicks(C("mago"), 1), 3 + 4);
  assert.equal(spellPicks(C("mago"), 10), 5 + 15);
  assert.ok(spellOptions(C("mago"), 9).some(s => s.level === 5), "a nivel 9 ya elige de nivel 5");
  assert.ok(spellOptions(C("mago"), 1).every(s => s.level <= 1));
});

test("la mejora no pasa de 20 y los rasgos no se repiten", () => {
  const ch = buildCharacter({ classId: "mago", speciesId: "elfo", bgId: "sabio", level: 20, base: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
    asi: Array.from({ length: 5 }, () => ["int", "int"]) });
  assert.equal(ch.int, 20);
  const names = ch.features.filter(f => f.source === "Clase").map(f => f.name);
  assert.equal(new Set(names).size, names.length);
  const mago = CLASSES.find(c => c.id === "mago");
  assert.equal(subclassOf(mago).name, "Escuela de evocación");
  assert.ok(classFeaturesUpTo(mago, 20).some(f => f.name === "Sobrecarga"), "trae los rasgos de la subclase hasta su nivel");
});

test("nivel 1 sigue igual que antes", () => {
  const ch = buildCharacter({ classId: "mago", speciesId: "humano", bgId: "sabio", base: base15 });
  assert.equal(ch.level, 1);
  assert.equal(ch.proficiency, 2);
  assert.equal(ch.subclass, "");
  assert.deepEqual(ch.slots, [2, 0, 0, 0, 0, 0, 0, 0, 0]);
});
