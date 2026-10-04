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
