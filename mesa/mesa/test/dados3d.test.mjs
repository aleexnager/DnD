/* Dados 3D: la forma de cada dado, que la caída acabe con el resultado de
   verdad arriba, y que cada tirada guarde sus dados (limpios) en el registro */

import test from "node:test";
import assert from "node:assert/strict";
import { shapeOf, simulate, labelsFor, expand, dot, qRot } from "../public/js/dice3d-core.js";
import { roll, diceOf, cleanDice } from "../public/js/dice.js";
import { createEngine } from "../public/js/engine.js";
import "../public/js/spells.js";

const seeded = s => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

test("cada dado tiene sus caras, planas y hacia fuera", () => {
  for (const [f, faces] of [[4, 4], [6, 6], [8, 8], [10, 10], [12, 12], [20, 20]]) {
    const sh = shapeOf(f);
    assert.equal(sh.F.length, faces, `d${f}`);
    sh.F.forEach((face, i) => {
      const d = face.map(v => dot(sh.V[v], sh.normals[i]));
      assert.ok(Math.max(...d) - Math.min(...d) < 0.01, `d${f}: la cara ${i} es plana`);
      assert.ok(d[0] > 0, `d${f}: la cara ${i} mira hacia fuera`);
    });
  }
});

test("la caída acaba en reposo, dentro de la pantalla y con el número que salió arriba", () => {
  const R = seeded(42);
  for (let round = 0; round < 6; round++) {
    const asked = [{ f: 20, v: 1 + round * 3 }, { f: 6, v: 1 + round }, { f: 4, v: 1 + (round % 4) }, { f: 100, v: 7 + round * 13 }];
    const dice = expand(asked);
    const sim = simulate(dice, { x: 11, z: 6, low: 0.45 }, R);
    assert.ok(sim.frames.length / 60 < 4.1, "dura menos de 4 segundos");
    const last = sim.frames[sim.frames.length - 1];
    dice.forEach((d, i) => {
      const sh = shapeOf(d.shape), q = last[i].q;
      assert.ok(qRot(q, sh.normals[sim.top[i]])[1] > 0.999, "apoyado sobre una cara");
      /* z positivo es la parte de abajo de la pantalla: ahí la pared sube para dejar sitio a la placa */
      assert.ok(Math.abs(last[i].p[0]) <= 11.6 && last[i].p[2] >= -6.6 && last[i].p[2] <= 6 * 0.45 + 0.6, "dentro de la pantalla");
      const labels = labelsFor(d, sim.top[i], q);
      if (d.shape === 4) {
        /* En el d4 se lee el vértice de arriba */
        let hi = 0, hy = -9;
        sh.V.forEach((v, k) => { const y = qRot(q, v)[1]; if (y > hy) { hy = y; hi = k; } });
        assert.equal(labels[hi], String(d.v));
      } else assert.equal(labels[sim.top[i]], d.face);
      assert.equal(new Set(labels).size, labels.length, "sin números repetidos");
    });
  }
});

test("el d100 son dos d10: decenas y unidades", () => {
  const [tens, units] = expand([{ f: 100, v: 42 }]);
  assert.equal(tens.face, "40"); assert.equal(units.face, "2");
  const [t2, u2] = expand([{ f: 100, v: 100 }]);
  assert.equal(t2.face, "00"); assert.equal(u2.face, "0");
});

test("cada tirada guarda sus dados; la ventaja marca el descartado", () => {
  const r = roll("2d6+1d20+3");
  const d = diceOf(r);
  assert.equal(d.length, 3);
  assert.deepEqual(d.map(x => x.f).sort(), [20, 6, 6]);
  const adv = diceOf(roll("1d20+5", "adv"));
  assert.equal(adv.length, 2);
  assert.equal(adv.filter(x => x.x).length, 1, "uno de los dos d20 se descarta");
  assert.ok(diceOf(roll("40d6")).length === 30, "como mucho 30");
  assert.deepEqual(cleanDice([{ f: 20, v: 21 }, { f: 7, v: 3 }, { f: 6, v: 6, x: 1 }, "x", { f: 100, v: 100 }]), [{ f: 6, v: 6, x: true }, { f: 100, v: 100 }]);
});

test("el servidor guarda los dados limpios y adjunta los de ataques y conjuros", async () => {
  let n = 0;
  const eng = createEngine({ rid: () => "id" + (n++) });
  const dm = { id: "dm1", name: "DM", role: "dm", charId: null };
  const pl = { id: "p1", name: "Lu", role: "player", charId: "pc1" };
  await eng.run(dm, [{ type: "char.add", chars: [{ id: "pc1", kind: "pc", name: "Aria", claimedBy: "Lu" }, { id: "m1", kind: "monster", name: "Goblin", hp: 7, maxHp: 7, ac: 13 }] }]);
  await eng.run(pl, [{ type: "log.add", entry: { kind: "roll", formula: "1d20", total: 9, dice: [{ f: 20, v: 9 }, { f: 20, v: 99 }] } }]);
  const mine = eng.doc.log[eng.doc.log.length - 1];
  assert.deepEqual(mine.dice, [{ f: 20, v: 9 }]);
  assert.equal(mine.by, "player");
  await eng.run(dm, [{ type: "attack.resolve", attackerId: "m1", targetId: "pc1", attack: { name: "Cimitarra", atk: 4, damage: "1d6+2", type: "cortante" } }]);
  const atk = eng.doc.log.filter(e => e.kind === "attack").pop();
  assert.equal(atk.by, "dm");
  assert.ok(atk.dice.some(d => d.f === 20), "el d20 del ataque");
});
