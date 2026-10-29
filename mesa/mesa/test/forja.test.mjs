/* La forja de mapas: el suelo da las paredes, las puertas las cortan, y el
   generador hace mazmorras enteras que pasan a muros de Mesa. */

import test from "node:test";
import assert from "node:assert/strict";
import * as F from "../public/js/forja-core.js";

const plan = (...items) => {
  const d = F.newDesign({ cols: 28, rows: 18 });
  d.layers[0].items = items.map(F.normalizeItem);
  return d;
};
const near = (a, b, tol = 0.13) => Math.abs(a - b) <= tol;

test("una sala rectangular da un contorno de cuatro esquinas exactas", () => {
  const s = F.solve(plan({ type: "floor", shape: "rect", x: 2, y: 2, w: 4, h: 3 }));
  assert.deepEqual(s.floorLoops, [[[2, 2], [6, 2], [6, 5], [2, 5]]]);
});

test("un pasillo pegado a la sala no tuerce la pared", () => {
  const s = F.solve(plan({ type: "floor", shape: "rect", x: 3, y: 3, w: 7, h: 6 }, { type: "floor", shape: "rect", x: 10, y: 5, w: 6, h: 1 }));
  assert.deepEqual(s.floorLoops, [[[3, 3], [10, 3], [10, 5], [16, 5], [16, 6], [10, 6], [10, 9], [3, 9]]]);
});

test("un recorte deja un hueco con su propio contorno", () => {
  const d = plan({ type: "floor", shape: "rect", x: 2, y: 2, w: 6, h: 6 }, { type: "floor", op: "cut", shape: "rect", x: 4, y: 4, w: 2, h: 2 });
  assert.equal(F.solve(d).floorLoops.length, 2);
  assert.equal(F.floorAt(d, 4.5, 4.5), false);
  assert.equal(F.floorAt(d, 2.5, 2.5), true);
});

test("un círculo sale redondo", () => {
  const [c] = F.solve(plan({ type: "floor", shape: "ellipse", x: 2, y: 2, w: 8, h: 8 })).floorLoops;
  const r = c.map(p => Math.hypot(p[0] - 6, p[1] - 6));
  assert.ok(c.length > 16);
  assert.ok(Math.min(...r) > 3.85 && Math.max(...r) < 4.15);
});

test("una puerta corta la pared y llega a Mesa como puerta", () => {
  const d = plan({ type: "floor", shape: "rect", x: 3, y: 3, w: 7, h: 6 }, { type: "floor", shape: "rect", x: 10, y: 5, w: 6, h: 1 },
    { type: "door", kind: "door", x1: 10, y1: 5, x2: 10, y2: 6 });
  const { walls } = F.toMesa(d);
  assert.equal(walls.filter(w => w.type === "door").length, 1);
  const blocked = walls.filter(w => w.type === "wall").some(w => w.points.some((p, i) => {
    const q = w.points[i + 1];
    if (!q) return false;
    /* ¿algún tramo de pared cruza el hueco (x=10, y entre 5.2 y 5.8)? */
    return near(p[0], 10, 0.05) && near(q[0], 10, 0.05) && Math.min(p[1], q[1]) < 5.2 && Math.max(p[1], q[1]) > 5.8;
  }));
  assert.equal(blocked, false);
  assert.ok(walls.every(w => w.points.length >= 2 && w.points.length <= 400));
});

test("las puertas secretas son pared para Mesa y los arcos son hueco", () => {
  const room = { type: "floor", shape: "rect", x: 2, y: 2, w: 6, h: 6 };
  const secret = F.toMesa(plan(room, { type: "door", kind: "secret", x1: 8, y1: 4, x2: 8, y2: 5 })).walls;
  assert.equal(secret.filter(w => w.type === "door").length, 0);
  const arch = F.toMesa(plan(room, { type: "door", kind: "arch", x1: 8, y1: 4, x2: 8, y2: 5 })).walls;
  assert.equal(arch.filter(w => w.type !== "wall").length, 0);
});

test("el generador es repetible, une las salas y pone puertas y escaleras", () => {
  const a = F.generate({ cols: 40, rows: 28, rooms: 8, seed: 42 });
  const b = F.generate({ cols: 40, rows: 28, rooms: 8, seed: 42 });
  assert.deepEqual(a.layers.map(l => l.items.map(i => [i.type, i.x, i.y, i.w, i.h])), b.layers.map(l => l.items.map(i => [i.type, i.x, i.y, i.w, i.h])));
  assert.ok(a.layers[0].items.filter(i => i.type === "floor").length >= 8);
  assert.ok(a.layers[0].items.some(i => i.type === "door"));
  assert.ok(a.layers[1].items.some(i => i.kind === "stairsDown"));
  const m = F.toMesa(a);
  assert.ok(m.walls.length > 4 && m.walls.length < 800);
});

test("un archivo raro se deja en forma", () => {
  const d = F.normalizeDesign({ cols: 9999, layers: [{ items: [{ type: "nada" }, { type: "prop", kind: "barrel", x: "3", y: 2, scale: 99 }] }] });
  assert.equal(d.cols, 150);
  assert.equal(d.layers[0].items.length, 1);
  assert.equal(d.layers[0].items[0].scale, 8);
});

test("las luces solo dan casillas de luz si se pide", () => {
  const d = plan({ type: "light", x: 5, y: 5, radius: 2 });
  assert.equal(Object.keys(F.toMesa(d).cells).length, 0);
  assert.ok(Object.keys(F.toMesa(d, { lights: true }).cells).length >= 9);
});

test("elegir, mover y hacer espejo", () => {
  const d = plan({ type: "floor", shape: "rect", x: 1, y: 1, w: 3, h: 3 });
  const hit = F.hitTest(d, 2, 2);
  assert.equal(hit.item.shape, "rect");
  const moved = F.moveItem(hit.item, 2, 1);
  assert.deepEqual([moved.x, moved.y], [3, 2]);
  const mir = F.mirrorItem(F.normalizeItem({ type: "floor", shape: "poly", points: [[0, 0], [2, 0], [0, 2]] }), "x");
  assert.deepEqual(mir.points.map(p => p[0]), [2, 0, 2]);
});

test("un plano grande se calcula deprisa", () => {
  const t0 = Date.now();
  F.solve(F.generate({ cols: 100, rows: 80, rooms: 25, seed: 3 }));
  assert.ok(Date.now() - t0 < 2000);
});
