/* Muros, luz, línea de visión y distancias. El servidor lo usa para decidir
   qué se manda a cada jugador: lo que no se ve no viaja por la red. */

import { cellKey, edgeKey, footprint } from "./schema.js";

export const BLOCKS = { wall: true, door: true, doorOpen: false, window: false };

/* ---------- Muros en diagonal ----------
   Además de los bordes, un muro puede cruzar una casilla de esquina a
   esquina: "x,y,d" va de arriba a la izquierda a abajo a la derecha (\) y
   "x,y,a" de arriba a la derecha a abajo a la izquierda (/). Sirven para salas
   en diagonal o redondas. La visión se corta con geometría de verdad: un rayo
   que cruza el muro no pasa. La casilla que atraviesa queda como pared: se
   ve, pero no se pisa. */
export const isDiagonal = key => /,(d|a)$/.test(key);

const diagCache = new WeakMap();
function diagonals(map) {
  const edges = map.edges || {};
  let hit = diagCache.get(edges);
  if (hit) return hit;
  const segs = [], cells = new Set();
  for (const [key, type] of Object.entries(edges)) {
    if (!BLOCKS[type]) continue;
    const [sx, sy, dir] = key.split(",");
    if (dir !== "d" && dir !== "a") continue;
    const x = Number(sx), y = Number(sy);
    const seg = dir === "d" ? { x1: x, y1: y, x2: x + 1, y2: y + 1 } : { x1: x + 1, y1: y, x2: x, y2: y + 1 };
    seg.minx = x; seg.maxx = x + 1; seg.miny = y; seg.maxy = y + 1;
    segs.push(seg);
    cells.add(cellKey(x, y));
  }
  hit = { segs, cells };
  diagCache.set(edges, hit);
  return hit;
}

/* Casillas que un muro diagonal deja sin suelo */
export const wallCell = (map, x, y) => diagonals(map).cells.has(cellKey(x, y));

/* ¿El segmento entre dos centros de casilla cruza algún muro diagonal?
   Tocarlo en su extremo cuenta como cruzarlo (así no se cuela la vista por la
   junta de dos tramos); que el rayo empiece o acabe sobre el muro, no. */
export function crossesDiagonal(map, x0, y0, x1, y1) {
  const { segs } = diagonals(map);
  if (!segs.length) return false;
  const ax = x0 + 0.5, ay = y0 + 0.5, bx = x1 + 0.5, by = y1 + 0.5;
  const lx = Math.min(ax, bx), hx = Math.max(ax, bx), ly = Math.min(ay, by), hy = Math.max(ay, by);
  const rx = bx - ax, ry = by - ay;
  for (const w of segs) {
    if (w.maxx < lx || w.minx > hx || w.maxy < ly || w.miny > hy) continue;
    const sx = w.x2 - w.x1, sy = w.y2 - w.y1;
    const den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-9) continue;                  // paralelos
    const qx = w.x1 - ax, qy = w.y1 - ay;
    const t = (qx * sy - qy * sx) / den;                 // a lo largo del rayo
    const u = (qx * ry - qy * rx) / den;                 // a lo largo del muro
    if (t > 1e-6 && t < 1 - 1e-6 && u >= -1e-6 && u <= 1 + 1e-6) return true;
  }
  return false;
}

/* Un muro vive en el borde de una casilla: "x,y,v" es su lado izquierdo y
   "x,y,h" el de arriba, así las paredes quedan entre casillas. */
export function blocksBetween(map, x1, y1, x2, y2) {
  let key = null;
  if (y1 === y2 && x2 === x1 + 1) key = edgeKey(x2, y1, "v");
  else if (y1 === y2 && x2 === x1 - 1) key = edgeKey(x1, y1, "v");
  else if (x1 === x2 && y2 === y1 + 1) key = edgeKey(x1, y2, "h");
  else if (x1 === x2 && y2 === y1 - 1) key = edgeKey(x1, y1, "h");
  return key ? !!BLOCKS[map.edges[key]] : false;
}

/* Se recorre el segmento entre dos casillas y se comprueba cada borde que
   cruza. En diagonal basta con que uno de los dos rodeos esté libre, para que
   una esquina no corte la vista de forma antinatural. */
export function hasSight(map, x0, y0, x1, y1) {
  if (x0 === x1 && y0 === y1) return true;
  if (crossesDiagonal(map, x0, y0, x1, y1)) return false;
  const steps = (Math.abs(x1 - x0) + Math.abs(y1 - y0)) * 4 + 4;
  let cx = x0, cy = y0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const nx = Math.floor(x0 + 0.5 + (x1 - x0) * t);
    const ny = Math.floor(y0 + 0.5 + (y1 - y0) * t);
    if (nx === cx && ny === cy) continue;
    if (nx !== cx && ny !== cy) {
      const viaX = !blocksBetween(map, cx, cy, nx, cy) && !blocksBetween(map, nx, cy, nx, ny);
      const viaY = !blocksBetween(map, cx, cy, cx, ny) && !blocksBetween(map, cx, ny, nx, ny);
      if (!viaX && !viaY) return false;
    } else if (blocksBetween(map, cx, cy, nx, ny)) return false;
    cx = nx; cy = ny;
  }
  return true;
}

export const onMap = (c, map) =>
  !!map && c.mx !== null && c.mapId === map.id && c.mx < map.cols && c.my < map.rows;

/* Las casillas que ocupa una ficha: un ogro grande llena 2×2. */
export function occupied(c) {
  const n = footprint(c);
  const out = [];
  for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n; dx++) out.push([c.mx + dx, c.my + dy]);
  return out;
}

/* ¿Cabe aquí? Una criatura grande ocupa un cuadrado de casillas, así que tiene
   que entrar en el mapa, no puede quedarse a caballo de un muro y no puede
   meterse encima de otra. Un ogro de 2×2 no pasa por una puerta de una casilla,
   que es justo lo que queremos que se note en la mesa. */
export function fits(map, chars, who, x, y) {
  const n = footprint(who);
  if (x < 0 || y < 0 || x + n > map.cols || y + n > map.rows) return "No cabe dentro del mapa";
  for (let dy = 0; dy < n; dy++) {
    for (let dx = 0; dx < n; dx++) {
      const cx = x + dx, cy = y + dy;
      if (wallCell(map, cx, cy)) return "Hay un muro por medio";
      if (dx && blocksBetween(map, cx - 1, cy, cx, cy)) return "Hay un muro por medio";
      if (dy && blocksBetween(map, cx, cy - 1, cx, cy)) return "Hay un muro por medio";
    }
  }
  const mine = new Set();
  for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n; dx++) mine.add(cellKey(x + dx, y + dy));
  for (const other of chars) {
    if (other.id === who.id || other.mx === null || other.mapId !== map.id) continue;
    for (const [ox, oy] of occupied(other)) {
      if (mine.has(cellKey(ox, oy))) return `Ahí está ${other.name}`;
    }
  }
  return null;
}

/* ---------- Distancias ---------- */
/* Regla del manual básico: cada casilla en diagonal cuenta como una. Con la
   variante "alt" la segunda diagonal cuesta el doble (5-10-5). */
export function gridDistance(ax, ay, bx, by, mode = "5e") {
  const dx = Math.abs(bx - ax), dy = Math.abs(by - ay);
  const diag = Math.min(dx, dy), straight = Math.max(dx, dy) - diag;
  return mode === "alt" ? straight + diag + Math.floor(diag / 2) : straight + diag;
}
export const feetBetween = (map, ax, ay, bx, by) =>
  gridDistance(ax, ay, bx, by, map.diagonals) * (map.feet || 5);

/* Distancia entre dos fichas, contando el tamaño de cada una. */
export function feetChars(map, a, b) {
  let best = Infinity;
  for (const [ax, ay] of occupied(a)) for (const [bx, by] of occupied(b)) {
    best = Math.min(best, gridDistance(ax, ay, bx, by, map.diagonals));
  }
  return best * (map.feet || 5);
}

/* ---------- Alcance de movimiento ----------
   Hasta dónde llega una ficha con lo que le queda de velocidad, respetando
   muros (rectos y diagonales) y el terreno difícil, que cuesta el doble: cada
   casilla difícil en la que se entra gasta dos. Las diagonales cuentan como
   manda el mapa (5e o la variante 5-10-5). Como los costes ya no son todos
   iguales, se reparte por cubos de coste (Dijkstra con enteros pequeños). */
export const roughCell = (map, x, y) => !!(map.rough && map.rough[cellKey(x, y)]);

function canStep(map, x0, y0, x1, y1) {
  if (x1 < 0 || y1 < 0 || x1 >= map.cols || y1 >= map.rows) return false;
  if (wallCell(map, x1, y1)) return false;
  const dx = x1 - x0, dy = y1 - y0;
  if (dx && dy) {
    const viaX = !blocksBetween(map, x0, y0, x1, y0) && !blocksBetween(map, x1, y0, x1, y1);
    const viaY = !blocksBetween(map, x0, y0, x0, y1) && !blocksBetween(map, x0, y1, x1, y1);
    if (!viaX && !viaY) return false;
  } else if (blocksBetween(map, x0, y0, x1, y1)) return false;
  return !crossesDiagonal(map, x0, y0, x1, y1);
}

export function reachableCells(map, from, feet, { blocked = null, budgetSquares = null } = {}) {
  const step = map.feet || 5;
  const budget = budgetSquares !== null ? budgetSquares : Math.max(0, Math.floor(feet / step));
  const out = new Map([[cellKey(from.x, from.y), 0]]);
  if (!budget) return out;
  const alt = map.diagonals === "alt";
  /* Estado: casilla y, con la variante 5-10-5, si la próxima diagonal es
     de las caras. Se guarda el mejor coste de cada estado. */
  const best = new Map([[cellKey(from.x, from.y) + "|0", 0]]);
  const buckets = [[{ x: from.x, y: from.y, par: 0 }]];
  for (let cost = 0; cost <= budget; cost++) {
    const list = buckets[cost];
    if (!list) continue;
    for (const cur of list) {
      if (best.get(cellKey(cur.x, cur.y) + "|" + cur.par) !== cost) continue;   // ya mejorado
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const x = cur.x + dx, y = cur.y + dy;
        if (blocked && blocked(x, y)) continue;
        if (!canStep(map, cur.x, cur.y, x, y)) continue;
        let c = cost + (roughCell(map, x, y) ? 2 : 1), par = cur.par;
        if (dx && dy && alt) { if (par) c++; par = par ? 0 : 1; }
        if (c > budget) continue;
        const sk = cellKey(x, y) + "|" + par;
        if (best.has(sk) && best.get(sk) <= c) continue;
        best.set(sk, c);
        (buckets[c] = buckets[c] || []).push({ x, y, par });
        const k = cellKey(x, y);
        if (!out.has(k) || out.get(k) > c) out.set(k, c);
      }
    }
  }
  return out;   // casilla -> casillas gastadas
}

/* Lo que cuesta de verdad ir de una casilla a otra (en casillas), por el
   camino más barato. Si no hay camino (un teletransporte del DM), la
   distancia en línea recta. */
export function pathCost(map, from, to, opts = {}) {
  if (from.x === to.x && from.y === to.y) return 0;
  const reach = reachableCells(map, from, 0, { ...opts, budgetSquares: (map.cols + map.rows) * 4 });
  const c = reach.get(cellKey(to.x, to.y));
  return c === undefined ? gridDistance(from.x, from.y, to.x, to.y, map.diagonals) : c;
}

/* ---------- Plantillas de área ---------- */
const normalizeAngle = a => Math.atan2(Math.sin(a), Math.cos(a));

/* Qué casillas cubre un cono, un círculo, una línea o un cuadrado. Se mide
   desde el centro de cada casilla, que es como se resuelve en la mesa. */
export function shapeCells(map, shape) {
  const step = map.feet || 5;
  const r = shape.size / step;
  const set = new Set();
  const span = Math.ceil(r) + 2;
  const ox = shape.x, oy = shape.y;
  for (let y = Math.floor(oy - span); y <= Math.ceil(oy + span); y++) {
    for (let x = Math.floor(ox - span); x <= Math.ceil(ox + span); x++) {
      if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) continue;
      const dx = x + 0.5 - ox, dy = y + 0.5 - oy;
      const dist = Math.hypot(dx, dy);
      let inside = false;
      if (shape.kind === "circle") inside = dist <= r;
      else if (shape.kind === "square") inside = Math.abs(dx) <= r && Math.abs(dy) <= r;
      else if (shape.kind === "cone") {
        const diff = Math.abs(normalizeAngle(Math.atan2(dy, dx) - shape.angle));
        inside = dist <= r && diff <= Math.PI / 6 + 0.001;    // el cono del manual
      } else if (shape.kind === "line") {
        const along = dx * Math.cos(shape.angle) + dy * Math.sin(shape.angle);
        const across = Math.abs(-dx * Math.sin(shape.angle) + dy * Math.cos(shape.angle));
        inside = along >= -0.5 && along <= r && across <= (shape.width / step) / 2;
      }
      if (inside) set.add(cellKey(x, y));
    }
  }
  return set;
}

/* ---------- Luz y visión ----------

   Tres niveles, de menos a más:

   visión verdadera   Se ve la casilla entera, pase lo que pase con el terreno.
                      La dan la visión en la oscuridad del personaje, la luz que
                      lleva encima y las casillas marcadas como luz fija.
   vista normal       El alcance del mapa, cortado por muros.
   terreno            Encima de lo anterior: la niebla deja pasar la vista a
                      medias y la oscuridad casi nada.

   La niebla no se resuelve con un sí o un no, sino con un degradado: cerca se
   ve todo, lejos solo algunas casillas sueltas, como cuando miras dentro de un
   banco de niebla de verdad. El sorteo es estable para una posición dada, de
   modo que el mapa no parpadea mientras nadie se mueve. */

export const DARK_SIGHT = 1;      // dentro de la oscuridad se ve la casilla de al lado
export const FOG_CLEAR = 2;       // dentro de la niebla se ve seguro hasta aquí
export const FOG_LIMIT = 7;       // y más allá de aquí ya no se ve nada

/* Sorteo repetible: depende solo de la casilla y de quién mira. */
function jitter(ox, oy, x, y) {
  let h = (ox * 73856093) ^ (oy * 19349663) ^ (x * 83492791) ^ (y * 2654435761);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const cellKind = (map, x, y) => (map.cells || {})[cellKey(x, y)];

/* Recorre el segmento y cuenta lo que estorba. Solo los muros cortan el
   camino: la niebla y la oscuridad se apuntan y las decide quien mira, porque
   la visión verdadera pasa por encima de ellas y la vista normal no. */
function trace(map, x0, y0, x1, y1) {
  if (x0 === x1 && y0 === y1) return { steps: 0, fog: 0, darkThrough: 0, dark: false };
  if (crossesDiagonal(map, x0, y0, x1, y1)) return null;
  const steps = (Math.abs(x1 - x0) + Math.abs(y1 - y0)) * 4 + 4;
  let cx = x0, cy = y0, hops = 0, fog = 0, darkThrough = 0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const nx = Math.floor(x0 + 0.5 + (x1 - x0) * t);
    const ny = Math.floor(y0 + 0.5 + (y1 - y0) * t);
    if (nx === cx && ny === cy) continue;
    if (nx !== cx && ny !== cy) {
      const viaX = !blocksBetween(map, cx, cy, nx, cy) && !blocksBetween(map, nx, cy, nx, ny);
      const viaY = !blocksBetween(map, cx, cy, cx, ny) && !blocksBetween(map, cx, ny, nx, ny);
      if (!viaX && !viaY) return null;
    } else if (blocksBetween(map, cx, cy, nx, ny)) return null;
    cx = nx; cy = ny;
    hops++;
    const kind = cellKind(map, cx, cy);
    if (cx === x1 && cy === y1) {
      return { steps: hops, fog, darkThrough, dark: kind === "dark", fogHere: kind === "fog" };
    }
    if (kind === "dark") darkThrough++;
    else if (kind === "fog") fog++;
  }
  return { steps: hops, fog, darkThrough, dark: false };
}

/* ¿Se ve esta casilla desde ahí? */
function visible(map, ox, oy, x, y, { trueSight = 0, range = 0 } = {}) {
  const path = trace(map, ox, oy, x, y);
  if (!path) return false;                            // un muro por medio, y no hay más que hablar

  /* Visión verdadera: la visión en la oscuridad y la antorcha atraviesan tanto
     la niebla como la oscuridad, hasta donde alcanzan. */
  if (path.steps <= trueSight) return true;

  /* Las ocho de alrededor se ven siempre. La cuenta de pasos de un trazo en
     diagonal pasa por una casilla intermedia, y si esa casilla era oscura las
     esquinas se quedaban a ciegas: dentro de una nube se veían los lados pero
     no las diagonales. */
  const cheb = Math.max(Math.abs(x - ox), Math.abs(y - oy));
  if (cheb <= DARK_SIGHT) return true;

  if (path.darkThrough) return false;                 // la vista normal no atraviesa la oscuridad
  if (path.steps > range) return false;
  if (path.dark) return false;                        // y dentro de ella solo alcanza lo pegado
  if (path.fog || path.fogHere) {
    if (path.steps <= FOG_CLEAR) return true;
    if (path.steps >= FOG_LIMIT) return false;
    const p = 1 - (path.steps - FOG_CLEAR) / (FOG_LIMIT - FOG_CLEAR);
    return jitter(ox, oy, x, y) < p;                  // el degradado
  }
  return true;
}

/* Compatibilidad: sigue habiendo quien solo pregunta si hay pared de por medio */
export const sightPath = (map, x0, y0, x1, y1) => {
  const p = trace(map, x0, y0, x1, y1);
  return p ? p.steps + p.fog * 2 : null;
};

/* Las casillas de luz fija: se ven siempre, sin más condición. */
export function litCells(doc, map) {
  const set = new Set();
  for (const [k, kind] of Object.entries(map.cells || {})) if (kind === "lit") set.add(k);
  return set;
}

/* ---------- Salas que se revelan al entrar ----------
   El DM pinta salas sobre el plano. Cada casilla lleva el número de su sala:
   dos salas pegadas son distintas aunque no haya pared entre ellas, porque
   tienen número distinto. Dentro de un mismo número, los muros y las puertas
   (rectos o en diagonal) la parten en trozos que se revelan por separado. En
   cuanto un personaje pisa una casilla de una sala, la party ve la sala
   entera (la del jefe, un pasillo largo).

   Un muro diagonal parte su casilla en dos triángulos, y cada uno solo toca
   dos lados: el de arriba a la derecha de un «\» toca el norte y el este.
   Por eso el recorrido va por mitades de casilla y no por casillas: así un
   muro diagonal corta la sala igual que uno recto. */
const N = 0, E = 1, S = 2, W = 3;
const STEP = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const roomCache = new WeakMap();

function diagOf(map, x, y) {
  const edges = map.edges || {};
  return { d: !!edges[edgeKey(x, y, "d")], a: !!edges[edgeKey(x, y, "a")] };
}
/* Trozo de la casilla que da a un lado */
function partFacing(map, x, y, dir) {
  const { d, a } = diagOf(map, x, y);
  if (d && a) return String(dir);
  if (d) return dir === N || dir === E ? "0" : "1";
  if (a) return dir === N || dir === W ? "0" : "1";
  return "";
}
/* Lados que toca un trozo */
function partSides(map, x, y, part) {
  const { d, a } = diagOf(map, x, y);
  if (d && a) return [Number(part)];
  if (d) return part === "0" ? [N, E] : [S, W];
  if (a) return part === "0" ? [N, W] : [S, E];
  return [N, E, S, W];
}
function cellParts(map, x, y) {
  const { d, a } = diagOf(map, x, y);
  if (d && a) return ["0", "1", "2", "3"];
  return d || a ? ["0", "1"] : [""];
}

export function roomsOf(map) {
  const painted = map.rooms || {};
  let hit = roomCache.get(painted);
  if (hit && hit.edges === map.edges) return hit.rooms;
  const of = new Map();      // casilla -> salas que la tocan
  const rooms = [];
  const seen = new Set();    // "x,y#trozo"
  for (const start of Object.keys(painted)) {
    const [sx, sy] = start.split(",").map(Number);
    for (const sp of cellParts(map, sx, sy)) {
      if (seen.has(start + "#" + sp)) continue;
      const idx = rooms.length, cells = new Set();
      const id = String(painted[start]);
      const stack = [[sx, sy, sp]];
      seen.add(start + "#" + sp);
      while (stack.length) {
        const [x, y, part] = stack.pop();
        cells.add(cellKey(x, y));
        for (const dir of partSides(map, x, y, part)) {
          const nx = x + STEP[dir][0], ny = y + STEP[dir][1];
          const nk = cellKey(nx, ny);
          if (!painted[nk] || String(painted[nk]) !== id) continue;     // otra sala, u otra cosa
          if (edgeBetween(map, x, y, nx, ny)) continue;                   // un muro o una puerta la parte
          const np = partFacing(map, nx, ny, (dir + 2) % 4);
          if (seen.has(nk + "#" + np)) continue;
          seen.add(nk + "#" + np);
          stack.push([nx, ny, np]);
        }
      }
      for (const k of cells) (of.get(k) || of.set(k, []).get(k)).push(idx);
      rooms.push([...cells]);
    }
  }
  hit = { edges: map.edges, rooms: { of, list: rooms } };
  roomCache.set(painted, hit);
  return hit.rooms;
}
/* Cualquier borde dibujado, abierto o cerrado: separa salas */
function edgeBetween(map, x1, y1, x2, y2) {
  let key = null;
  if (y1 === y2) key = edgeKey(Math.max(x1, x2), y1, "v");
  else key = edgeKey(x1, Math.max(y1, y2), "h");
  return !!(map.edges || {})[key];
}

/* Número para una sala nueva: uno más que el mayor que haya */
export function nextRoomId(map) {
  let max = 0;
  for (const v of Object.values(map.rooms || {})) max = Math.max(max, Number(v) || 0);
  return max + 1;
}

/* Casillas que la party alcanza a ver ahora mismo. */
export function visibleCells(doc, map) {
  const set = sightCells(doc, map);
  if (!map) return set;

  /* Salas: quien está dentro ve la sala entera */
  const rooms = roomsOf(map);
  if (rooms.list.length) {
    const lit = new Set();
    for (const c of doc.chars) {
      if (c.kind !== "pc" || c.hp <= 0 || !onMap(c, map)) continue;
      for (const [x, y] of occupied(c)) {
        for (const idx of rooms.of.get(cellKey(x, y)) || []) lit.add(idx);
      }
    }
    for (const idx of lit) for (const k of rooms.list[idx]) set.add(k);
  }

  /* Lo que el DM decide a mano manda sobre todo lo demás */
  for (const [k, v] of Object.entries(map.vis || {})) {
    if (v === "show") set.add(k);
    else if (v === "hide") set.delete(k);
  }
  return set;
}

/* Lo que se ve por línea de visión, luz y terreno */
function sightCells(doc, map) {
  const set = new Set();
  if (!map) return set;

  /* La luz fija se ve siempre: es una antorcha de pared, y está encendida. */
  for (const k of litCells(doc, map)) set.add(k);

  const heroes = doc.chars.filter(c => c.kind === "pc" && c.hp > 0 && onMap(c, map));
  for (const c of heroes) {
    const trueSight = Math.min(40, Math.max(c.vision || 0, c.light || 0));
    const range = Math.min(60, map.dark ? trueSight : Math.max(map.radius, trueSight));
    const reach = Math.max(trueSight, range);
    if (!reach) continue;
    const lim = reach * reach + reach * 0.6;
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        if (dx * dx + dy * dy > lim) continue;
        const x = c.mx + dx, y = c.my + dy;
        if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) continue;
        const k = cellKey(x, y);
        if (set.has(k)) continue;
        if (visible(map, c.mx, c.my, x, y, { trueSight, range })) set.add(k);
      }
    }
  }
  return set;
}

/* Solo se mandan los muros que tocan lo que ya se ha visto: el plano completo
   no sale del servidor mientras la party no lo haya explorado. */
export function edgesNear(map, seen, explored = []) {
  const cells = new Set([...(seen || []), ...explored]);
  const out = {};
  for (const key of cells) {
    const [x, y] = key.split(",").map(Number);
    for (const k of [edgeKey(x, y, "v"), edgeKey(x + 1, y, "v"), edgeKey(x, y, "h"), edgeKey(x, y + 1, "h"), edgeKey(x, y, "d"), edgeKey(x, y, "a")]) {
      if (map.edges[k]) out[k] = map.edges[k];
    }
  }
  return out;
}
