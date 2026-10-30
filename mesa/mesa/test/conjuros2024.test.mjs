/* Los 391 conjuros de 2024 en la biblioteca, sus filtros, los modos nuevos
   (daño directo y vida temporal) y quién apunta a quién en el mapa */

import test from "node:test";
import assert from "node:assert/strict";
import { SPELL_LIBRARY, SPELL_CLASSES, SPELL_CATS, spellCats, spellEnglish } from "../public/js/spells.js";
import { CONJUROS } from "../public/js/libros/conjuros.js";
import { normalizeSpell } from "../public/js/schema.js";
import { createEngine } from "../public/js/engine.js";

const byId = id => SPELL_LIBRARY.find(s => s.id === id);

test("la biblioteca tiene los 391 del Manual del Jugador, cada uno con clases y nombre en inglés", () => {
  assert.equal(SPELL_LIBRARY.length, 391);
  assert.equal(new Set(SPELL_LIBRARY.map(s => s.id)).size, 391);
  assert.equal(CONJUROS.length, 391);
  for (const sp of SPELL_LIBRARY) {
    assert.ok((SPELL_CLASSES.get(sp.id) || []).length, `${sp.name} tiene clases`);
    assert.ok(spellEnglish(sp.id), `${sp.name} tiene nombre en inglés`);
    assert.ok(sp.components && sp.range && sp.duration, `${sp.name} tiene sus datos`);
  }
  /* Por niveles, como en el manual */
  const per = Array.from({ length: 10 }, (_, l) => SPELL_LIBRARY.filter(s => s.level === l).length);
  assert.deepEqual(per, [34, 64, 63, 52, 41, 48, 34, 21, 18, 16]);
  /* Los que no son del SRD también están */
  for (const id of ["maleficio", "armadura-de-agathys", "doblar-por-los-muertos", "invocar-bestia", "golpe-atronador", "estatica-sinaptica"]) assert.ok(byId(id), id);
  assert.ok(SPELL_CLASSES.get("palmada-atronadora").includes("Artífice"));
});

test("cada conjuro cae al menos en una categoría, y las de daño, cura y estados son las esperadas", () => {
  for (const sp of SPELL_LIBRARY) assert.ok(spellCats(sp).length, sp.name);
  const ids = SPELL_CATS.map(([id]) => id);
  for (const sp of SPELL_LIBRARY) for (const c of spellCats(sp)) assert.ok(ids.includes(c));
  assert.ok(spellCats(byId("bola-de-fuego")).includes("dano"));
  assert.ok(spellCats(byId("curar-heridas")).includes("cura"));
  assert.ok(spellCats(byId("falsa-vida")).includes("cura"));
  assert.ok(spellCats(byId("inmovilizar-persona")).includes("estados"));
  assert.ok(spellCats(byId("invocar-feerico")).includes("invocacion"));
  assert.ok(spellCats(byId("paso-brumoso")).includes("movimiento"));
  assert.ok(spellCats(byId("detectar-magia")).includes("info"));
  /* Cuántos se resuelven solos en Mesa */
  const auto = SPELL_LIBRARY.filter(s => s.mode !== "none").length;
  assert.ok(auto >= 150, `se resuelven solos: ${auto}`);
});

test("los datos de los conjuros nuevos coinciden con las reglas de 2024", () => {
  const sp = byId("golpe-atronador");
  assert.deepEqual([sp.level, sp.mode, sp.damage, sp.type, sp.save, sp.cond, sp.upcast], [1, "hit", "2d6", "trueno", "str", "derribado", "1d6"]);
  const ss = byId("estatica-sinaptica");
  assert.deepEqual([ss.level, ss.mode, ss.save, ss.damage, ss.half, ss.shape, ss.size], [5, "save", "int", "8d6", true, "circle", 20]);
  const fv = byId("falsa-vida");
  assert.deepEqual([fv.mode, fv.temp, fv.upcast], ["temp", "2d4+4", "5"]);
  /* Componentes corregidos frente al SRD: Orientación es V, S */
  assert.equal(byId("orientacion").components, "V, S");
  assert.equal(byId("palabra-de-poder-matar").components, "V");
});

const rid = (() => { let n = 0; return () => "id" + (n++); })();
const dm = { id: "dm1", name: "DM", role: "dm", charId: null };
const pl = { id: "p1", name: "Lu", role: "player", charId: "pc1" };
const pl2 = { id: "p2", name: "Mo", role: "player", charId: "pc2" };

test("daño directo de un castigo y vida temporal, gastando el espacio", async () => {
  const eng = createEngine({ rid });
  const smite = normalizeSpell({ ...byId("golpe-atronador"), id: "s1" });
  const fv = normalizeSpell({ ...byId("falsa-vida"), id: "s2" });
  await eng.run(dm, [{ type: "char.add", chars: [
    { id: "pc1", kind: "pc", name: "Aria", claimedBy: "Lu", wis: 14, cha: 16, castAbility: "cha", slots: [2, 0, 0, 0, 0, 0, 0, 0, 0], spellbook: [smite, fv] },
    { id: "m1", kind: "monster", name: "Orco", hp: 40, maxHp: 40, ac: 13 }] }]);
  await eng.run(pl, [{ type: "spell.cast", casterId: "pc1", spellId: "s1", slot: 1, targets: ["m1"] }]);
  const orc = eng.doc.chars.find(c => c.id === "m1");
  assert.ok(orc.hp <= 38 && orc.hp >= 28, "2d6 de trueno sin tirar para impactar");
  await eng.run(pl, [{ type: "spell.cast", casterId: "pc1", spellId: "s2", slot: 1, targets: ["pc1"] }]);
  const aria = eng.doc.chars.find(c => c.id === "pc1");
  assert.ok(aria.tempHp >= 6 && aria.tempHp <= 12, "2d4+4 de vida temporal");
  assert.deepEqual(aria.slotsUsed.slice(0, 1), [2]);
});

test("quién apunta a quién: lo ven el DM y la party, salvo lo secreto o si el DM lo apaga", async () => {
  const eng = createEngine({ rid });
  await eng.run(dm, [{ type: "char.add", chars: [
    { id: "pc1", kind: "pc", name: "Aria", claimedBy: "Lu", mx: 1, my: 1 },
    { id: "pc2", kind: "pc", name: "Bo", claimedBy: "Mo", mx: 2, my: 1 },
    { id: "m1", kind: "monster", name: "Orco", hp: 10, maxHp: 10, mx: 3, my: 1 }] }]);
  eng.doc.chars.forEach(c => { c.mapId = eng.doc.session.activeMapId; });
  eng.doc.session.revealAll = true;
  /* Un jugador solo apunta con su personaje */
  assert.ok((await eng.run(pl, [{ type: "aim.set", from: "pc2", to: ["m1"] }])).error);
  await eng.run(pl, [{ type: "aim.set", from: "pc1", to: ["m1"] }]);
  assert.deepEqual(eng.doc.session.aims.map(a => [a.from, a.to]), [["pc1", "m1"]]);
  const seen = c => { eng.advance(); return eng.snapshot(c).session.aims || []; };
  assert.equal(seen(pl2).length, 1, "el compañero lo ve");
  /* El DM apunta en secreto: solo él */
  await eng.run(dm, [{ type: "aim.set", from: "m1", to: ["pc2"], secret: true }]);
  assert.equal(seen(dm).length, 2);
  assert.equal(seen(pl2).length, 1);
  /* Apagado en las opciones del mapa: la party no ve nada, el DM sí */
  await eng.run(dm, [{ type: "session.patch", fields: { showAims: false } }]);
  assert.equal(seen(pl2).length, 0);
  assert.equal(seen(dm).length, 2);
  /* Sin objetivo, deja de apuntar */
  await eng.run(pl, [{ type: "aim.set", from: "pc1", to: [] }]);
  assert.equal(eng.doc.session.aims.length, 1);
});
