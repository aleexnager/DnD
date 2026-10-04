/* Muros libres: geometría para tratarlos igual que los muros de la
   cuadrícula. Un muro libre es un trazo (puntos en casillas, con decimales)
   de un tipo: muro, puerta, puerta abierta o ventana.

   - La goma quita solo el trozo por el que pasa, no el trazo entero.
   - La herramienta Puerta convierte el trozo de una casilla que se pulsa en
     puerta; pulsar otra vez la abre, y otra vez la quita (queda el hueco),
     como en un borde de casilla.

   Lo usa el motor (engine.js), en el servidor y en la versión de prueba. */

import { uid } from "./schema.js";

export const FREE_TYPES = ["wall", "door", "doorOpen", "window"];

const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/* Punto del trazo más cercano a (x, y): distancia y posición a lo largo
   del trazo (en casillas desde el primer punto) */
export function nearestOn(points, x, y) {
  let best = { d: Infinity, s: 0 }, s = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], L = dist(a, b);
    const t = L ? Math.max(0, Math.min(1, ((x - a[0]) * (b[0] - a[0]) + (y - a[1]) * (b[1] - a[1])) / (L * L))) : 0;
    const d = Math.hypot(x - a[0] - t * (b[0] - a[0]), y - a[1] - t * (b[1] - a[1]));
    if (d < best.d) best = { d, s: s + t * L };
    s += L;
  }
  return best;
}

export const lengthOf = points => points.reduce((s, p, i) => (i ? s + dist(points[i - 1], p) : 0), 0);

/* El trozo del trazo entre las posiciones s0 y s1 */
export function slice(points, s0, s1) {
  const out = [];
  let s = 0;
  const at = (a, b, L, target) => {
    const t = L ? (target - s) / L : 0;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], L = dist(a, b), e = s + L;
    if (e >= s0 && s <= s1) {
      if (!out.length) out.push(s0 > s ? at(a, b, L, s0) : a);
      out.push(s1 < e ? at(a, b, L, s1) : b);
    }
    s = e;
    if (s > s1) break;
  }
  const r = p => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100];
  return out.map(r).filter((p, i, arr) => !i || p[0] !== arr[i - 1][0] || p[1] !== arr[i - 1][1]);
}

const piece = (w, points, type = w.type) => ({ id: uid(), points, type });

/* Quitar lo que esté a menos de r casillas de (x, y). Cada trazo tocado se
   parte en lo que queda antes y después. */
export function cutWalls(walls, x, y, r = 0.3) {
  const out = [];
  let changed = false;
  for (const w of walls) {
    const hit = nearestOn(w.points, x, y);
    if (hit.d > r) { out.push(w); continue; }
    changed = true;
    const L = lengthOf(w.points), reach = Math.sqrt(Math.max(0, r * r - hit.d * hit.d)) + 0.05;
    const before = slice(w.points, 0, hit.s - reach), after = slice(w.points, hit.s + reach, L);
    if (hit.s - reach > 0.05 && before.length > 1) out.push({ ...w, points: before });
    if (L - hit.s - reach > 0.05 && after.length > 1) out.push(piece(w, after));
  }
  return changed ? out : walls;
}

/* La herramienta Puerta sobre un muro libre, en (x, y). Sobre un muro: el
   trozo de una casilla alrededor del punto pasa a ser puerta. Sobre una
   puerta: se abre. Sobre una puerta abierta: se quita y queda el hueco. */
export function doorAt(walls, x, y, r = 0.3, size = 1) {
  let best = null;
  walls.forEach((w, i) => {
    const hit = nearestOn(w.points, x, y);
    if (hit.d <= r && (!best || hit.d < best.d)) best = { ...hit, i };
  });
  if (!best) return null;
  const w = walls[best.i], rest = walls.filter((_, i) => i !== best.i);
  if (w.type === "door") return [...rest, { ...w, type: "doorOpen" }];
  if (w.type === "doorOpen") return rest;
  /* Un trazo corto entero se vuelve puerta; en uno largo se recorta una casilla */
  const L = lengthOf(w.points);
  if (L <= size * 1.5) return [...rest, { ...w, type: "door" }];
  const s0 = Math.max(0, Math.min(L - size, best.s - size / 2)), s1 = s0 + size;
  const out = [...rest];
  if (s0 > 0.05) out.push({ ...w, points: slice(w.points, 0, s0) });
  out.push(piece(w, slice(w.points, s0, s1), "door"));
  if (L - s1 > 0.05) out.push(piece(w, slice(w.points, s1, L)));
  return out;
}
