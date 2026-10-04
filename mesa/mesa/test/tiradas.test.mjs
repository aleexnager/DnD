/* Tiradas al estilo de Beyond20: efectos activos, ataque furtivo, castigo
   divino y tiradas de un jugador solo para el DM */

import test from "node:test";
import assert from "node:assert/strict";
import { normalizeChar, normalizeBuff, buffsFor, withBuffs, sneakDice, smiteDice, smiteFoe, canSneak, canSmite } from "../public/js/schema.js";
import { createEngine } from "../public/js/engine.js";

let n = 0;
const rid = () => "id" + (n++);

function setup(chars) {
  const eng = createEngine({ rid });
  eng.doc = { ...eng.doc, chars: chars.map(normalizeChar) };
  const dm = { id: "dm1", name: "DM", role: "dm", charId: null };
  const pl = { id: "p1", name: "Lu", role: "player", charId: "nyx" };
  return { eng, dm, pl };
}

test("los efectos se sanean y solo suman los encendidos", () => {
  const c = normalizeChar({ buffs: [
    { name: "Bendecir", attack: "1d4", save: "1d4" },
    { name: "Furia", damage: "2", on: false },
    { name: "Raro", attack: "hola", damage: "1d6; rm" },
    { name: "Perdición", attack: "−1d4" }
  ] });
  assert.equal(c.buffs.length, 4);
  assert.equal(c.buffs[2].attack, "");
  assert.equal(c.buffs[2].damage, "");
  assert.deepEqual(buffsFor(c, "attack"), { add: "+1d4-1d4", names: ["Bendecir", "Perdición"] });
  assert.equal(buffsFor(c, "damage").add, "");
  const r = withBuffs(c, "save", "1d20+3", "Nyx · Destreza");
  assert.equal(r.formula, "1d20+3+1d4");
  assert.equal(r.label, "Nyx · Destreza · Bendecir");
  assert.equal(normalizeBuff({ name: "x", check: "2d6+1" }).check, "2d6+1");
});

test("ataque furtivo y castigo: quién puede y cuántos dados", () => {
  const rogue = normalizeChar({ className: "Pícaro", level: 5 });
  const pal = normalizeChar({ className: "Paladín", level: 3 });
  assert.ok(canSneak(rogue) && !canSmite(rogue));
  assert.ok(canSmite(pal) && !canSneak(pal));
  assert.equal(sneakDice(rogue), "3d6");
  assert.equal(smiteDice(1), "2d8");
  assert.equal(smiteDice(4), "5d8");
  assert.equal(smiteDice(5), "5d8");
  assert.equal(smiteDice(2, true), "4d8");
  assert.ok(smiteFoe({ sizeType: "Muerto viviente mediano" }));
  assert.ok(!smiteFoe({ sizeType: "Humanoide mediano" }));
});

test("el castigo gasta su espacio solo si el golpe entra y suma sus dados", async () => {
  const pal = { id: "pal", kind: "pc", name: "Tor", className: "Paladín", level: 3, slots: [3, 0], slotsUsed: [0, 0],
    buffs: [{ name: "Bendecir", attack: "1d4" }] };
  /* CA 1: entra siempre salvo pifia; CA 99: no entra salvo crítico */
  const { eng, dm } = setup([pal, { id: "gob", kind: "monster", name: "Goblin", ac: 1, hp: 500, maxHp: 500 },
    { id: "wall", kind: "monster", name: "Muro", ac: 99, hp: 500, maxHp: 500 }]);
  const attack = { name: "Espada larga", atk: 5, damage: "1d8+3", type: "cortante" };
  let spent = 0, hits = 0;
  for (let i = 0; i < 30; i++) {
    const before = eng.doc.chars.find(c => c.id === "pal").slotsUsed[0];
    eng.doc.chars.find(c => c.id === "pal").slotsUsed = [0, 0];
    const r = await eng.run(dm, [{ type: "attack.resolve", attackerId: "pal", attack, targetId: "wall", extras: { smite: 1 } }]);
    assert.equal(r.error, null);
    const e = eng.doc.log.filter(x => x.kind === "attack").pop();
    const hit = /CRÍTICO|impacta/.test(e.text);
    if (hit) hits++;
    spent += eng.doc.chars.find(c => c.id === "pal").slotsUsed[0];
    assert.match(e.detail, /Bendecir/);
    void before;
  }
  assert.equal(spent, hits, "solo se gasta al impactar");

  eng.doc.chars.find(c => c.id === "pal").slotsUsed = [0, 0];
  await eng.run(dm, [{ type: "attack.resolve", attackerId: "pal", attack, targetId: "gob", extras: { smite: 1 } }]);
  const e = eng.doc.log.filter(x => x.kind === "attack").pop();
  if (!/pifia/.test(e.text)) {
    assert.match(e.detail, /castigo divino de nivel 1/);
    assert.match(e.detail, /2d8|4d8/);
    assert.equal(eng.doc.chars.find(c => c.id === "pal").slotsUsed[0], 1);
  }
});

test("quien no es pícaro no suma furtivo aunque lo pida", async () => {
  const { eng, dm } = setup([{ id: "a", kind: "pc", name: "Ana", className: "Guerrero", level: 5 },
    { id: "gob", kind: "monster", name: "Goblin", ac: 1, hp: 500, maxHp: 500 }]);
  for (let i = 0; i < 5; i++) {
    await eng.run(dm, [{ type: "attack.resolve", attackerId: "a", attack: { name: "Hacha", atk: 5, damage: "1d8" }, targetId: "gob", extras: { sneak: true } }]);
    assert.doesNotMatch(eng.doc.log.filter(x => x.kind === "attack").pop().detail, /furtivo/);
  }
});

test("la salvación del objetivo lleva sus efectos", async () => {
  const { eng, dm } = setup([{ id: "a", kind: "pc", name: "Ana", level: 5 },
    { id: "t", kind: "pc", name: "Bo", hp: 500, maxHp: 500, dex: 10, buffs: [{ name: "Bendecir", save: "50" }] }]);
  await eng.run(dm, [{ type: "attack.resolve", attackerId: "a", attack: { name: "Aliento", save: "dex 50", damage: "2d6" }, targetId: "t" }]);
  assert.match(eng.doc.log.pop().text, /la supera/);
});

test("un jugador tira «solo al DM»: lo ven el DM y él, no la mesa", async () => {
  const { eng, pl } = setup([{ id: "nyx", kind: "pc", name: "Nyx" }]);
  eng.clients.set("t-pl", pl);
  await eng.run(pl, [{ type: "log.add", entry: { kind: "roll", label: "Nyx · Sigilo", formula: "1d20+5", total: 17, detail: "12 + 5", secret: true } }]);
  const e = eng.doc.log.pop();
  assert.equal(e.private, true);
  assert.equal(e.secret, false);
  assert.equal(e.byClient, "p1");
  eng.doc.log.push(e);
  const other = { id: "p2", name: "Bo", role: "player", charId: "bo" };
  const screen = { id: "s1", name: "Tele", role: "screen", charId: null };
  const sees = cl => eng.snapshot(cl).log.some(x => x.id === e.id);
  assert.ok(sees(pl));
  assert.ok(!sees(other));
  assert.ok(!sees(screen));
  assert.ok(sees({ id: "dm1", name: "DM", role: "dm", charId: null }));
});
