/* Muros libres: trazos que no siguen la cuadrícula y cortan la vista y el
   paso como un muro normal.

   npm test (desde mesa/mesa) */

import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeMap } from "../public/js/schema.js";
import { hasSight, reachableCells, wallsNear, wallCell } from "../public/js/los.js";

/* Una pared curva que parte el mapa de arriba abajo cerca de x = 5 */
const map = () => normalizeMap({
  cols: 20, rows: 20, feet: 5,
  walls: [{ points: [[5, 0], [5.3, 6], [4.8, 13], [5, 20]] }]
});

test("corta la vista de un lado a otro", () => {
  const m = map();
  assert.equal(hasSight(m, 2, 5, 9, 5), false);
  assert.equal(hasSight(m, 1, 2, 3, 8), true);
});

test("no se puede pasar al otro lado", () => {
  const reach = reachableCells(map(), { x: 2, y: 5 }, 200);
  assert.ok([...reach.keys()].every(k => +k.split(",")[0] <= 5), "alguna casilla al otro lado");
});

test("no deja casillas sin suelo, a diferencia de un muro diagonal", () => {
  assert.equal(wallCell(map(), 5, 3), false);
});

test("a los jugadores solo les llega si pasa por lo que han visto", () => {
  const m = map();
  assert.equal(wallsNear(m, new Set(["5,7"])).length, 1);
  assert.equal(wallsNear(m, new Set(["12,7"])).length, 0);
});

test("se limpian puntos raros y trazos de un solo punto", () => {
  const m = normalizeMap({ walls: [{ points: [[1, 1], ["x", 2], [3.14159, 2]] }, { points: [[1, 1]] }] });
  assert.equal(m.walls.length, 1);
  assert.deepEqual(m.walls[0].points, [[1, 1], [3.14, 2]]);
});

/* ---------- Igual que los muros de la cuadrícula ---------- */
import { cutWalls, doorAt, lengthOf } from "../public/js/freewalls.js";
import { roomsOf } from "../public/js/los.js";

const line = () => [{ id: "a", type: "wall", points: [[2, 5], [12, 5]] }];

test("la goma quita solo el trozo que toca", () => {
  const out = cutWalls(line(), 7, 5.1, 0.3);
  assert.equal(out.length, 2);
  const total = out.reduce((s, w) => s + lengthOf(w.points), 0);
  assert.ok(total > 9.1 && total < 9.5, `queda ${total}`);
  const far = line();
  assert.equal(cutWalls(far, 7, 8), far, "lejos no toca nada");
});

test("la herramienta Puerta: una casilla de puerta, abierta y sin puerta", () => {
  let walls = doorAt(line(), 7, 5);
  const door = walls.find(w => w.type === "door");
  assert.ok(door, "no hay puerta");
  assert.ok(Math.abs(lengthOf(door.points) - 1) < 0.02);
  assert.equal(walls.filter(w => w.type === "wall").length, 2);
  walls = doorAt(walls, 7, 5);
  assert.equal(walls.find(w => w.id === door.id).type, "doorOpen");
  walls = doorAt(walls, 7, 5);
  assert.equal(walls.length, 2, "queda el hueco");
});

test("una puerta cerrada corta la vista y una abierta no", () => {
  const m = normalizeMap({ cols: 20, rows: 20, walls: [{ type: "door", points: [[0, 5], [20, 5]] }] });
  assert.equal(hasSight(m, 3, 2, 3, 8), false);
  m.walls = [{ ...m.walls[0], type: "doorOpen" }];
  assert.equal(hasSight(m, 3, 2, 3, 8), true);
});

test("un muro libre separa dos salas pintadas igual", () => {
  const rooms = {};
  for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) rooms[`${x},${y}`] = 1;
  const m = normalizeMap({ cols: 10, rows: 10, rooms, walls: [{ points: [[0, 3], [6, 3]] }] });
  assert.equal(roomsOf(m).list.length, 2);
  m.walls = [];
  assert.equal(roomsOf(m).list.length, 1);
});
