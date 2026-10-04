/* Pruebas de la propuesta de muros y puertas con un plano sintético: dos
   salas de suelo claro con cuadrícula, roca con textura alrededor, muros de
   tinta en el borde del suelo, un tabique entre las salas con una puerta
   blanca en medio, y una mesa dentro de una sala (que no debe dar muros).

   npm test (desde mesa/mesa) */

import { test } from "node:test";
import assert from "node:assert/strict";
import { measureWalls, classifyWalls, detectWalls } from "../public/js/wallfind.js";

const CELL = 24, COLS = 24, ROWS = 16;

function rng(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

/* Sala A: columnas 3..10, filas 3..11. Sala B: columnas 11..19, filas 3..11.
   Entre las dos, un tabique vertical en x = 11 con puerta en la fila 7. */
const isFloor = (cx, cy) => cy >= 3 && cy <= 11 && cx >= 3 && cx <= 19;

function plan(seed = 1) {
  const rand = rng(seed);
  const W = COLS * CELL, H = ROWS * CELL;
  const data = new Uint8ClampedArray(W * H * 3);
  const put = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    data[i] = r; data[i + 1] = g; data[i + 2] = b;
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
      if (isFloor(cx, cy)) {
        const onGrid = x % CELL === 0 || y % CELL === 0;
        const v = onGrid ? 150 : 232 + (rand() - 0.5) * 8;
        put(x, y, v, v - 4, v - 12);
      } else {
        const v = 150 + (rand() - 0.5) * 70;           // roca: textura sin cuadrícula
        put(x, y, v + 20, v, v - 40);
      }
    }
  /* Muros de tinta en el borde del suelo (4 px) */
  const ink = (x0, y0, x1, y1) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, 25, 25, 25);
  };
  const L = 3 * CELL, R = 20 * CELL, T = 3 * CELL, B = 12 * CELL;
  ink(L - 2, T - 2, R + 1, T + 1); ink(L - 2, B - 2, R + 1, B + 1);
  ink(L - 2, T - 2, L + 1, B + 1); ink(R - 2, T - 2, R + 1, B + 1);
  /* Tabique en x = 11 casillas, salvo la fila de la puerta */
  const X = 11 * CELL;
  ink(X - 2, T, X + 1, 7 * CELL - 1);
  ink(X - 2, 8 * CELL, X + 1, B);
  /* Puerta blanca con borde negro en el hueco */
  for (let y = 7 * CELL + 2; y < 8 * CELL - 2; y++)
    for (let x = X - 4; x <= X + 3; x++) {
      const edge = x === X - 4 || x === X + 3 || y === 7 * CELL + 2 || y === 8 * CELL - 3;
      put(x, y, edge ? 20 : 250, edge ? 20 : 250, edge ? 20 : 250);
    }
  /* Una mesa en la sala A */
  for (let y = 6 * CELL + 4; y < 7 * CELL + 18; y++)
    for (let x = 5 * CELL + 4; x < 6 * CELL + 18; x++) put(x, y, 120, 80, 40);
  return { data, W, H };
}

const grid = { x: 0, y: 0, w: CELL, h: CELL, cols: COLS, rows: ROWS };

/* Bordes que deberían salir: el contorno del suelo y el tabique */
function expected() {
  const walls = new Set();
  for (let cy = 0; cy < ROWS; cy++)
    for (let cx = 1; cx < COLS; cx++)
      if (isFloor(cx - 1, cy) !== isFloor(cx, cy)) walls.add(`${cx},${cy},v`);
  for (let cy = 1; cy < ROWS; cy++)
    for (let cx = 0; cx < COLS; cx++)
      if (isFloor(cx, cy - 1) !== isFloor(cx, cy)) walls.add(`${cx},${cy},h`);
  for (let cy = 3; cy <= 11; cy++) if (cy !== 7) walls.add(`11,${cy},v`);
  return walls;
}

test("encuentra el contorno de las salas y el tabique", () => {
  const { data, W, H } = plan();
  const r = detectWalls(data, W, H, grid, { channels: 3 });
  const want = expected();
  const got = Object.entries(r.edges).filter(([, t]) => t === "wall").map(([k]) => k);
  const hit = got.filter(k => want.has(k)).length;
  assert.ok(hit / want.size >= 0.9, `encontrados ${hit} de ${want.size}`);
  assert.ok(got.length - hit <= want.size * 0.1, `${got.length - hit} muros de más`);
});

test("la puerta del tabique sale como puerta", () => {
  const { data, W, H } = plan();
  const r = detectWalls(data, W, H, grid, { channels: 3 });
  assert.equal(r.edges["11,7,v"], "door");
});

test("la mesa no levanta muros dentro de la sala", () => {
  const { data, W, H } = plan();
  const r = detectWalls(data, W, H, grid, { channels: 3 });
  for (const k of ["5,6,h", "6,6,v", "5,7,v", "6,8,h", "6,7,v"]) assert.equal(r.edges[k], undefined, k);
});

test("la sensibilidad mueve el número de muros en el sentido esperado", () => {
  const { data, W, H } = plan(3);
  const m = measureWalls(data, W, H, grid, 3);
  const few = classifyWalls(m, { sensitivity: 0 }).stats.walls;
  const many = classifyWalls(m, { sensitivity: 1 }).stats.walls;
  assert.ok(many >= few, `${few} → ${many}`);
});

/* Segundo plano: una sala con la esquina de arriba a la derecha cortada en
   diagonal (tres casillas), una alfombra con borde oscuro en medio de la sala
   y un pasillo cerrado por una puerta dibujada como bloque blanco. */
const C2 = 30, W2 = 22, H2 = 16;
function plan2(seed = 4) {
  const rand = rng(seed);
  const W = W2 * C2, H = H2 * C2;
  const data = new Uint8ClampedArray(W * H * 3);
  const put = (x, y, v) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    data[i] = v[0]; data[i + 1] = v[1]; data[i + 2] = v[2];
  };
  /* Suelo: sala 2..12 × 2..12 menos el triángulo de arriba a la derecha que
     corta la diagonal de (10,2) a (13,5), y un pasillo 13..19 × 6..7 */
  const inRoom = (x, y) => x >= 2 * C2 && x < 13 * C2 && y >= 2 * C2 && y < 13 * C2 && (x - 10 * C2) - (y - 2 * C2) <= 0;
  const inHall = (x, y) => x >= 13 * C2 && x < 20 * C2 && y >= 6 * C2 && y < 8 * C2;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (inRoom(x, y) || inHall(x, y)) {
        const v = x % C2 === 0 || y % C2 === 0 ? 150 : 228 + (rand() - 0.5) * 8;
        put(x, y, [v, v - 4, v - 12]);
      } else {
        const v = 120 + (rand() - 0.5) * 70;
        put(x, y, [v + 10, v, v - 30]);
      }
    }
  /* Alfombra: rectángulo rojo con borde oscuro, de (4,8) a (8,11) */
  for (let y = 8 * C2 + 4; y < 11 * C2 - 4; y++)
    for (let x = 4 * C2 + 4; x < 8 * C2 - 4; x++) {
      const border = y < 8 * C2 + 8 || y >= 11 * C2 - 8 || x < 4 * C2 + 8 || x >= 8 * C2 - 8;
      put(x, y, border ? [40, 20, 20] : [150, 40, 40]);
    }
  /* Puerta: bloque blanco con borde negro sobre el borde x = 16 del pasillo */
  for (let y = 6 * C2 + 3; y < 8 * C2 - 3; y++)
    for (let x = 16 * C2 - 5; x <= 16 * C2 + 4; x++) {
      const edge = x === 16 * C2 - 5 || x === 16 * C2 + 4 || y === 6 * C2 + 3 || y === 8 * C2 - 4;
      put(x, y, edge ? [15, 15, 15] : [250, 250, 250]);
    }
  return { data, W, H };
}
const grid2 = { x: 0, y: 0, w: C2, h: C2, cols: W2, rows: H2 };

test("la esquina cortada sale con muros en diagonal", () => {
  const { data, W, H } = plan2();
  const r = detectWalls(data, W, H, grid2, { channels: 3 });
  const diag = ["10,2,d", "11,3,d", "12,4,d"].filter(k => r.edges[k] === "wall");
  assert.ok(diag.length >= 2, `diagonales: ${Object.keys(r.edges).filter(k => /,d$/.test(k)).join(" ")}`);
  /* Y sin el escalón recto encima */
  assert.equal(r.edges["11,3,v"], undefined);
});

test("la alfombra en mitad de la sala no levanta muros", () => {
  const { data, W, H } = plan2();
  const r = detectWalls(data, W, H, grid2, { channels: 3 });
  const inside = Object.keys(r.edges).filter(k => {
    const [x, y] = k.split(",").map(Number);
    return x >= 4 && x <= 8 && y >= 8 && y <= 11;
  });
  assert.deepEqual(inside, []);
});

test("un bloque blanco cruzando el pasillo es una puerta", () => {
  const { data, W, H } = plan2();
  const r = detectWalls(data, W, H, grid2, { channels: 3 });
  assert.equal(r.edges["16,6,v"], "door");
  assert.equal(r.edges["16,7,v"], "door");
});

/* ---------- Aprender de un plano corregido ---------- */
import { learnFromMap, BASE_MODEL, wallProbabilities, edgeFeatures, labelEdges } from "../public/js/wallfind.js";

test("enseñar con un plano corregido acerca la propuesta a lo enseñado", () => {
  const { data, W, H } = plan2();
  const m = measureWalls(data, W, H, grid2, 3);
  const r = classifyWalls(m);
  const X = edgeFeatures(m, r.floor, r.score, r.rules);
  /* El DM deja como muro solo el contorno del pasillo de abajo */
  const mine = {};
  for (let x = 13; x < 20; x++) { mine[`${x},6,h`] = "wall"; mine[`${x},8,h`] = "wall"; }
  const y = labelEdges(m, mine, []);
  const before = wallProbabilities(m, r.floor, r.score, BASE_MODEL, r.rules);
  const learned = learnFromMap(BASE_MODEL, X, y, { weight: 20, mapId: "x" });
  const after = wallProbabilities(m, r.floor, r.score, learned, r.rules);
  const mean = (p, want) => { let s = 0, n = 0; y.forEach((v, i) => { if (v === want) { s += p[i]; n++; } }); return s / n; };
  assert.ok(mean(after, 1) > mean(before, 1), "los muros enseñados no suben");
  assert.ok(mean(after, 0) < mean(before, 0), "lo que no es muro no baja");
  assert.equal(learned.maps.length, 1);
  assert.equal(learned.H.length, BASE_MODEL.w.length + 1);
});

test("un muro libre cuenta como muro al enseñar", () => {
  const { data, W, H } = plan2();
  const m = measureWalls(data, W, H, grid2, 3);
  const y = labelEdges(m, {}, [{ points: [[13, 6], [20, 6]] }]);
  const keys = m.edges.filter((e, i) => y[i]).map(e => e.key);
  assert.ok(keys.includes("15,6,h") && keys.includes("19,6,h"), keys.join(" "));
  assert.ok(!keys.includes("15,7,h"));
});
