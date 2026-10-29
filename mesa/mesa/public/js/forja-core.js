/* La forja de mapas: la parte que no dibuja.

   Un plano es una lista de capas, y cada capa una lista de piezas: suelo
   (sala, círculo, polígono, casillas, cueva), agua, muros sueltos, puertas,
   objetos, textos y luces. Las paredes no se dibujan a mano: salen solas del
   borde del suelo, como en Dungeon Scrawl. Para eso el suelo se rasteriza a
   ocho puntos por casilla y se sacan sus contornos (marching squares), que
   luego se simplifican en trazos rectos.

   Todo va en casillas, con decimales. Lo usa el editor (forja.js) y las
   pruebas; aquí no hay nada del navegador. */

export const SUB = 8;                       // puntos de muestreo por casilla
export const DESIGN_VERSION = 1;
const MAX_ITEMS = 4000;

/* ---------- Azar con semilla ---------- */
export function rng(seed = 1) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Ruido suave: valores al azar en una rejilla, interpolados. Da los bordes
   irregulares de las cuevas y la rugosidad de las paredes. */
function hash2(x, y, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function noise2(x, y, seed = 1) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const s = t => t * t * (3 - 2 * t);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  const u = s(fx), v = s(fy);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;   // -1..1
}
const fbm = (x, y, seed) => noise2(x, y, seed) * 0.65 + noise2(x * 2.3, y * 2.3, seed + 7) * 0.35;

/* ---------- Estilos ---------- */
export const STYLES = {
  pergamino: { name: "Pergamino", bg: "#efe6d0", floor: "#fbf6ea", wall: "#2b2116", wallWidth: 0.16, hatch: true, hatchColor: "#2b2116", hatchWidth: 0.9,
    shadow: true, grid: "floor", gridColor: "#2b2116", gridAlpha: 0.18, texture: 0.05, water: "#a9c7d6", text: "#2b2116", font: "Georgia, serif" },
  mazmorra: { name: "Mazmorra", bg: "#15161a", floor: "#5a5751", wall: "#0d0d0f", wallWidth: 0.2, hatch: false, hatchColor: "#000000", hatchWidth: 0.8,
    shadow: true, grid: "floor", gridColor: "#000000", gridAlpha: 0.28, texture: 0.12, water: "#2f5566", text: "#e8dcc0", font: "Georgia, serif" },
  cueva: { name: "Cueva", bg: "#2a2119", floor: "#8a7457", wall: "#1a120b", wallWidth: 0.18, hatch: true, hatchColor: "#120c07", hatchWidth: 1.1,
    shadow: true, grid: "floor", gridColor: "#1a120b", gridAlpha: 0.2, texture: 0.14, water: "#3d6a78", text: "#f1e3c4", font: "Georgia, serif" },
  tinta: { name: "Tinta", bg: "#ffffff", floor: "#ffffff", wall: "#000000", wallWidth: 0.14, hatch: true, hatchColor: "#000000", hatchWidth: 1.2,
    shadow: false, grid: "floor", gridColor: "#000000", gridAlpha: 0.22, texture: 0, water: "#cfe3ee", text: "#000000", font: "Georgia, serif" },
  plano: { name: "Plano azul", bg: "#1b3a63", floor: "#24497a", wall: "#e9f2ff", wallWidth: 0.1, hatch: false, hatchColor: "#e9f2ff", hatchWidth: 0.8,
    shadow: false, grid: "all", gridColor: "#e9f2ff", gridAlpha: 0.22, texture: 0, water: "#3a6ea8", text: "#e9f2ff", font: "Courier New, monospace" },
  bosque: { name: "Bosque", bg: "#3f5a31", floor: "#b39b72", wall: "#3a2a18", wallWidth: 0.14, hatch: false, hatchColor: "#24361d", hatchWidth: 0.8,
    shadow: true, grid: "all", gridColor: "#1d2a16", gridAlpha: 0.18, texture: 0.16, water: "#4a7f95", text: "#f5ecd6", font: "Georgia, serif" }
};
export const styleOf = d => ({ ...STYLES.pergamino, ...(STYLES[d.style && d.style.preset] || {}), ...((d.style && d.style.custom) || {}) });

/* ---------- El plano ---------- */
export const uidF = () => Math.random().toString(36).slice(2, 10);

export function newDesign({ cols = 28, rows = 18, preset = "pergamino" } = {}) {
  return {
    v: DESIGN_VERSION, cols, rows,
    style: { preset, custom: {} },
    layers: [
      { id: uidF(), name: "Suelo y paredes", visible: true, locked: false, opacity: 1, items: [] },
      { id: uidF(), name: "Objetos", visible: true, locked: false, opacity: 1, items: [] },
      { id: uidF(), name: "Textos", visible: true, locked: false, opacity: 1, items: [] }
    ]
  };
}

const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const pts = (list, max = 600) => (Array.isArray(list) ? list : []).slice(0, max)
  .filter(p => Array.isArray(p) && Number.isFinite(+p[0]) && Number.isFinite(+p[1]))
  .map(p => [Math.round(+p[0] * 1000) / 1000, Math.round(+p[1] * 1000) / 1000]);

export const SHAPES = ["rect", "ellipse", "poly", "cells", "cave"];
export const DOOR_KINDS = ["door", "open", "double", "secret", "portcullis", "arch", "window"];

/* Deja una pieza en forma, venga de donde venga (un archivo, el portapapeles) */
export function normalizeItem(raw = {}) {
  const base = { id: String(raw.id || uidF()).slice(0, 20), type: raw.type };
  switch (raw.type) {
    case "floor": case "water":
      return {
        ...base, shape: SHAPES.includes(raw.shape) ? raw.shape : "rect", op: raw.op === "cut" ? "cut" : "add",
        x: num(raw.x), y: num(raw.y), w: Math.max(0.1, num(raw.w, 1)), h: Math.max(0.1, num(raw.h, 1)),
        r: Math.max(0, num(raw.r)), rough: clampN(num(raw.rough), 0, 1), seed: Math.trunc(num(raw.seed, 1)) || 1,
        smooth: !!raw.smooth, radius: clampN(num(raw.radius, 1), 0.2, 12),
        points: pts(raw.points, 2000),
        cells: (Array.isArray(raw.cells) ? raw.cells : []).filter(k => /^-?\d+,-?\d+$/.test(k)).slice(0, 20000)
      };
    case "wall":
      return { ...base, kind: raw.kind === "window" ? "window" : "wall", points: pts(raw.points), smooth: !!raw.smooth };
    case "door":
      return { ...base, kind: DOOR_KINDS.includes(raw.kind) ? raw.kind : "door",
        x1: num(raw.x1), y1: num(raw.y1), x2: num(raw.x2, 1), y2: num(raw.y2) };
    case "prop":
      return { ...base, kind: String(raw.kind || "barrel").slice(0, 24), x: num(raw.x), y: num(raw.y),
        rot: num(raw.rot) % 360, scale: clampN(num(raw.scale, 1), 0.2, 8), color: /^#[0-9a-f]{6}$/i.test(raw.color) ? raw.color : "",
        flip: !!raw.flip };
    case "text":
      return { ...base, text: String(raw.text || "").slice(0, 120), x: num(raw.x), y: num(raw.y), size: clampN(num(raw.size, 0.7), 0.2, 6),
        color: /^#[0-9a-f]{6}$/i.test(raw.color) ? raw.color : "", align: ["left", "center", "right"].includes(raw.align) ? raw.align : "center",
        rot: num(raw.rot) % 360, bold: !!raw.bold, shadow: raw.shadow !== false, font: ["serif", "sans", "mono", "hand"].includes(raw.font) ? raw.font : "serif" };
    case "light":
      return { ...base, x: num(raw.x), y: num(raw.y), radius: clampN(num(raw.radius, 4), 0.5, 30), dim: clampN(num(raw.dim, 0), 0, 30),
        color: /^#[0-9a-f]{6}$/i.test(raw.color) ? raw.color : "#ffcf7a" };
    case "path":
      return { ...base, points: pts(raw.points), width: clampN(num(raw.width, 1), 0.1, 6), color: /^#[0-9a-f]{6}$/i.test(raw.color) ? raw.color : "#8a6d45",
        dashed: !!raw.dashed, smooth: raw.smooth !== false };
  }
  return null;
}

export function normalizeDesign(raw = {}) {
  const d = newDesign({ cols: clampN(Math.trunc(num(raw.cols, 28)), 5, 150), rows: clampN(Math.trunc(num(raw.rows, 18)), 5, 150) });
  d.style = { preset: STYLES[raw.style && raw.style.preset] ? raw.style.preset : "pergamino",
    custom: raw.style && typeof raw.style.custom === "object" && raw.style.custom ? { ...raw.style.custom } : {} };
  if (Array.isArray(raw.layers) && raw.layers.length) {
    let total = 0;
    d.layers = raw.layers.slice(0, 24).map(l => ({
      id: String(l.id || uidF()).slice(0, 20), name: String(l.name || "Capa").slice(0, 40),
      visible: l.visible !== false, locked: !!l.locked, opacity: clampN(num(l.opacity, 1), 0, 1),
      items: (Array.isArray(l.items) ? l.items : []).map(normalizeItem).filter(Boolean).filter(() => ++total <= MAX_ITEMS)
    }));
  }
  return d;
}

/* ---------- Curvas suaves ----------
   Catmull-Rom: pasa por los puntos que se pusieron, con curva entre ellos */
export function smoothPath(points, closed = false, steps = 6) {
  if (points.length < 3) return points.slice();
  const out = [], n = points.length;
  const P = i => closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(k => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  if (!closed) out.push(points[n - 1]);
  return out;
}

/* ---------- Distancia con signo a cada forma (negativo = dentro) ---------- */
function segDist(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
  const t = L ? clampN(((px - a[0]) * dx + (py - a[1]) * dy) / L, 0, 1) : 0;
  return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy);
}
export function insidePoly(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/* El polígono de verdad de una pieza (con la curva hecha si es suave) */
const polyCache = new WeakMap();
export function polyOf(it) {
  let p = polyCache.get(it);
  if (!p) { p = it.smooth ? smoothPath(it.points, true, 8) : it.points; polyCache.set(it, p); }
  return p;
}
function sdf(it, x, y) {
  switch (it.shape) {
    case "rect": {
      const cx = it.x + it.w / 2, cy = it.y + it.h / 2, r = Math.min(it.r, it.w / 2, it.h / 2);
      const qx = Math.abs(x - cx) - (it.w / 2 - r), qy = Math.abs(y - cy) - (it.h / 2 - r);
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
    }
    case "ellipse": {
      const rx = it.w / 2, ry = it.h / 2, cx = it.x + rx, cy = it.y + ry;
      return (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry);
    }
    case "poly": {
      const poly = polyOf(it);
      if (poly.length < 3) return 1;
      let d = Infinity;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) d = Math.min(d, segDist(x, y, poly[j], poly[i]));
      return insidePoly(poly, x, y) ? -d : d;
    }
    case "cave": {
      const p = it.points;
      if (!p.length) return 1;
      let d = p.length === 1 ? Math.hypot(x - p[0][0], y - p[0][1]) : Infinity;
      for (let i = 1; i < p.length; i++) d = Math.min(d, segDist(x, y, p[i - 1], p[i]));
      return d - it.radius;
    }
  }
  return 1;
}
/* Caja de una pieza, en casillas, con margen para la rugosidad */
export function boundsOf(it) {
  if (it.type === "door") return { x: Math.min(it.x1, it.x2) - 0.3, y: Math.min(it.y1, it.y2) - 0.3, w: Math.abs(it.x2 - it.x1) + 0.6, h: Math.abs(it.y2 - it.y1) + 0.6 };
  if (it.type === "prop") { const s = 0.5 * it.scale + 0.1; return { x: it.x - s, y: it.y - s, w: 2 * s, h: 2 * s }; }
  if (it.type === "light") return { x: it.x - 0.4, y: it.y - 0.4, w: 0.8, h: 0.8 };
  if (it.type === "text") { const w = Math.max(1, it.text.length * it.size * 0.55); return { x: it.x - (it.align === "center" ? w / 2 : it.align === "right" ? w : 0), y: it.y - it.size * 0.8, w, h: it.size * 1.1 }; }
  if (it.type === "wall" || it.type === "path" || (it.points && it.points.length && it.shape !== "cells" && it.shape !== "rect" && it.shape !== "ellipse")) {
    const p = it.type === "floor" || it.type === "water" ? (it.shape === "cave" ? it.points : polyOf(it)) : it.points;
    if (!p.length) return { x: 0, y: 0, w: 0, h: 0 };
    const pad = (it.shape === "cave" ? it.radius : 0) + (it.rough || 0) * 0.6 + (it.width || 0) / 2;
    const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
    return { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + 2 * pad, h: Math.max(...ys) - Math.min(...ys) + 2 * pad };
  }
  if (it.shape === "cells") {
    if (!it.cells.length) return { x: 0, y: 0, w: 0, h: 0 };
    const c = it.cells.map(k => k.split(",").map(Number));
    const xs = c.map(q => q[0]), ys = c.map(q => q[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) + 1, h: Math.max(...ys) - Math.min(...ys) + 1 };
  }
  const pad = (it.rough || 0) * 0.6;
  return { x: it.x - pad, y: it.y - pad, w: it.w + 2 * pad, h: it.h + 2 * pad };
}

/* ¿Este punto (en casillas) está dentro de la pieza de suelo o agua? */
export function insideItem(it, x, y) {
  if (it.shape === "cells") return it.cells.includes(Math.floor(x) + "," + Math.floor(y));
  const d = sdf(it, x, y);
  if (!it.rough) return d <= 0;
  return d <= it.rough * 0.45 * fbm(x * 1.1, y * 1.1, it.seed);
}

/* ---------- Rasterizar: qué es suelo y qué es agua ---------- */
export function rasterize(design) {
  const W = design.cols * SUB, H = design.rows * SUB;
  const floor = new Uint8Array(W * H), water = new Uint8Array(W * H);
  for (const layer of design.layers) {
    if (!layer.visible) continue;
    for (const it of layer.items) {
      if (it.type !== "floor" && it.type !== "water") continue;
      const mask = it.type === "floor" ? floor : water;
      const v = it.op === "cut" ? 0 : 1;
      if (it.shape === "cells") {
        for (const k of it.cells) {
          const [cx, cy] = k.split(",").map(Number);
          if (cx < 0 || cy < 0 || cx >= design.cols || cy >= design.rows) continue;
          for (let j = 0; j < SUB; j++) mask.fill(v, (cy * SUB + j) * W + cx * SUB, (cy * SUB + j) * W + cx * SUB + SUB);
        }
        continue;
      }
      const b = boundsOf(it);
      const i0 = Math.max(0, Math.floor(b.x * SUB)), i1 = Math.min(W - 1, Math.ceil((b.x + b.w) * SUB));
      const j0 = Math.max(0, Math.floor(b.y * SUB)), j1 = Math.min(H - 1, Math.ceil((b.y + b.h) * SUB));
      for (let j = j0; j <= j1; j++) {
        const y = (j + 0.5) / SUB;
        for (let i = i0; i <= i1; i++) {
          if (insideItem(it, (i + 0.5) / SUB, y)) mask[j * W + i] = v;
        }
      }
    }
  }
  return { W, H, floor, water };
}

/* ---------- Contornos (marching squares) ----------
   Devuelve lazos cerrados en casillas. Cada tramo deja el dentro al mismo
   lado, así se encadenan sin ambigüedad. */
const EDGE = { T: [0.5, 0], R: [1, 0.5], B: [0.5, 1], L: [0, 0.5] };
const CASES = {
  1: [["L", "B", "d"]], 2: [["B", "R", "c"]], 3: [["L", "R", "d"]], 4: [["T", "R", "b"]],
  5: [["T", "R", "b"], ["B", "L", "d"]], 6: [["T", "B", "b"]], 7: [["L", "T", "b"]],
  8: [["L", "T", "a"]], 9: [["T", "B", "a"]], 10: [["L", "T", "a"], ["B", "R", "c"]], 11: [["T", "R", "a"]],
  12: [["L", "R", "a"]], 13: [["B", "R", "a"]], 14: [["L", "B", "a"]]
};
const CORNER = { a: [0, 0], b: [1, 0], c: [1, 1], d: [0, 1] };
export function contours(mask, W, H) {
  const at = (i, j) => (i < 0 || j < 0 || i >= W || j >= H ? 0 : mask[j * W + i]);
  const next = new Map();       // inicio -> tramo
  const key = (x, y) => Math.round(x * 2) + "," + Math.round(y * 2);
  for (let j = -1; j < H; j++) {
    for (let i = -1; i < W; i++) {
      const idx = at(i, j) * 8 + at(i + 1, j) * 4 + at(i + 1, j + 1) * 2 + at(i, j + 1);
      const segs = CASES[idx];
      if (!segs) continue;
      for (const [e1, e2, corner] of segs) {
        let A = [i + EDGE[e1][0], j + EDGE[e1][1]], B = [i + EDGE[e2][0], j + EDGE[e2][1]];
        const P = [i + CORNER[corner][0], j + CORNER[corner][1]];
        if ((B[0] - A[0]) * (P[1] - A[1]) - (B[1] - A[1]) * (P[0] - A[0]) < 0) [A, B] = [B, A];
        next.set(key(A[0], A[1]), { A, B });
      }
    }
  }
  const loops = [];
  const used = new Set();
  for (const [k0, s0] of next) {
    if (used.has(k0)) continue;
    const loop = [];
    let k = k0, s = s0;
    while (s && !used.has(k)) {
      used.add(k);
      loop.push(s.A);
      k = key(s.B[0], s.B[1]);
      s = next.get(k);
    }
    if (loop.length > 2) loops.push(loop.map(([x, y]) => [(x + 0.5) / SUB, (y + 0.5) / SUB]));
  }
  return loops;
}

/* Ramer-Douglas-Peucker sobre un lazo cerrado */
function rdp(points, eps) {
  if (points.length < 3) return points.slice();
  let max = 0, idx = 0;
  const a = points[0], b = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = segDist(points[i][0], points[i][1], a, b);
    if (d > max) { max = d; idx = i; }
  }
  if (max <= eps) return [a, b];
  return [...rdp(points.slice(0, idx + 1), eps).slice(0, -1), ...rdp(points.slice(idx), eps)];
}
export function simplifyLoop(loop, eps = 0.06) {
  if (loop.length < 4) return loop.slice();
  /* Se parte por el punto más lejano del primero, para no perder esquinas */
  let far = 0, fd = -1;
  for (let i = 0; i < loop.length; i++) { const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]); if (d > fd) { fd = d; far = i; } }
  const pass = (l, e) => { const A = rdp(l.slice(0, far2(l) + 1), e), B = rdp([...l.slice(far2(l)), l[0]], e); return [...A.slice(0, -1), ...B.slice(0, -1)]; };
  /* Primero se juntan los puntos en línea, luego se cuadran las esquinas y
     solo después se simplifica de verdad: si no, la simplificación se come
     la esquina antes de poder cuadrarla */
  const fine = sharpen(pass(loop, 0.01));
  return (fine.length > 3 ? pass(fine, eps) : fine).map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
}
const far2 = l => { let far = 0, fd = -1; for (let i = 0; i < l.length; i++) { const d = Math.hypot(l[i][0] - l[0][0], l[i][1] - l[0][1]); if (d > fd) { fd = d; far = i; } } return far; };
/* El muestreo deja las esquinas achaflanadas en un pelo (1/16 de casilla):
   un tramo tan corto se cambia por el cruce de los dos lados de al lado, y
   la esquina vuelve a ser una esquina. */
function sharpen(loop, tiny = 0.16) {
  let p = loop.slice();
  for (let pass = 0; pass < 2 && p.length > 4; pass++) {
    const out = [];
    const n = p.length;
    const skip = new Set();
    for (let i = 0; i < n; i++) {
      if (skip.has(i)) continue;
      const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], d = p[(i + 2) % n];
      /* Solo en una esquina de verdad (los lados de al lado giran más de 60°):
         en un círculo los tramos cortos son la curva, y se quedan */
      const u = [b[0] - a[0], b[1] - a[1]], v = [d[0] - c[0], d[1] - c[1]];
      const cos = (u[0] * v[0] + u[1] * v[1]) / ((Math.hypot(...u) * Math.hypot(...v)) || 1);
      if (Math.hypot(c[0] - b[0], c[1] - b[1]) < tiny && cos < 0.5 && !skip.has((i + 1) % n)) {
        const X = cross(a, b, c, d);
        if (X && Math.hypot(X[0] - b[0], X[1] - b[1]) < tiny * 1.5) { out.push(X); skip.add((i + 1) % n); continue; }
      }
      out.push(b);
    }
    if (skip.has(0) && out.length) out.shift();
    p = out;
  }
  return p;
}
function cross(a, b, c, d) {
  const x1 = b[0] - a[0], y1 = b[1] - a[1], x2 = d[0] - c[0], y2 = d[1] - c[1];
  const den = x1 * y2 - y1 * x2;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * y2 - (c[1] - a[1]) * x2) / den;
  return [a[0] + t * x1, a[1] + t * y1];
}

/* El plano entero, ya calculado: lazos del suelo y del agua. Se guarda para
   no repetirlo mientras no cambie. */
const solved = new WeakMap();
export function solve(design) {
  let s = solved.get(design);
  if (s) return s;
  const r = rasterize(design);
  const floorLoops = contours(r.floor, r.W, r.H).map(l => simplifyLoop(l)).filter(l => l.length > 2);
  const waterLoops = contours(r.water, r.W, r.H).map(l => simplifyLoop(l)).filter(l => l.length > 2);
  s = { ...r, floorLoops, waterLoops };
  solved.set(design, s);
  return s;
}

/* ¿Hay suelo en esta casilla? (en su centro) */
export function floorAt(design, x, y) {
  const s = solve(design);
  const i = Math.floor(x * SUB), j = Math.floor(y * SUB);
  return i >= 0 && j >= 0 && i < s.W && j < s.H && !!s.floor[j * s.W + i];
}

/* ---------- Puertas que cortan paredes ---------- */
/* Quita de un trazo lo que pasa por el hueco de una puerta (de A a B) */
function cutPolyline(line, A, B, tol = 0.22) {
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
  const gap = p => {
    const t = ((p[0] - A[0]) * dx + (p[1] - A[1]) * dy) / (L * L);
    return t > -0.02 && t < 1.02 && segDist(p[0], p[1], A, B) < tol;
  };
  /* Se densifica para que el hueco caiga bien aunque el trazo sea largo */
  const dense = [];
  for (let i = 0; i < line.length; i++) {
    if (i) {
      const a = line[i - 1], b = line[i], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.1);
      for (let k = 1; k < n; k++) dense.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, true]);
    }
    dense.push([line[i][0], line[i][1], false]);
  }
  const runs = [];
  let cur = [];
  for (const p of dense) {
    if (gap(p)) { if (cur.length > 1) runs.push(cur); cur = []; continue; }
    cur.push(p);
  }
  if (cur.length > 1) runs.push(cur);
  /* Fuera de los puntos de relleno, se queda la forma original */
  return runs.map(r => r.filter((p, i) => !p[2] || i === 0 || i === r.length - 1).map(p => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]))
    .filter(r => r.length > 1);
}

/* Trozos de 400 puntos como mucho (lo que admite un muro libre de Mesa) */
function chunk(line, max = 380) {
  if (line.length <= max) return [line];
  const out = [];
  for (let i = 0; i < line.length - 1; i += max - 1) out.push(line.slice(i, i + max));
  return out;
}

const DOOR_TYPE = { door: "door", double: "door", portcullis: "door", open: "doorOpen", arch: null, secret: "wall", window: "window" };

/* Lo que el plano le da a Mesa: muros libres (paredes, puertas, ventanas) y
   las casillas de luz si se quiere. */
export function toMesa(design, { lights = false } = {}) {
  const s = solve(design);
  let lines = s.floorLoops.map(l => [...l, l[0]]);
  const walls = [];
  const items = design.layers.filter(l => l.visible).flatMap(l => l.items);
  for (const it of items) {
    if (it.type === "wall" && it.points.length > 1) {
      const p = it.smooth ? smoothPath(it.points, false, 6) : it.points;
      if (it.kind === "window") walls.push({ type: "window", points: p });
      else lines.push(p);
    }
  }
  for (const d of items.filter(it => it.type === "door")) {
    const A = [d.x1, d.y1], B = [d.x2, d.y2];
    lines = lines.flatMap(l => cutPolyline(l, A, B));
    const type = DOOR_TYPE[d.kind];
    if (type) walls.push({ type, points: [A, B] });
  }
  for (const l of lines) for (const c of chunk(l)) walls.push({ type: "wall", points: c });
  const cells = {};
  if (lights) {
    for (const it of items.filter(i => i.type === "light")) {
      const r = it.radius;
      for (let y = Math.floor(it.y - r); y <= Math.ceil(it.y + r); y++) for (let x = Math.floor(it.x - r); x <= Math.ceil(it.x + r); x++) {
        if (x < 0 || y < 0 || x >= design.cols || y >= design.rows) continue;
        if (Math.hypot(x + 0.5 - it.x, y + 0.5 - it.y) <= r) cells[x + "," + y] = "lit";
      }
    }
  }
  return { walls, cells };
}

/* ---------- Generador de mazmorras ----------
   Salas que no se pisan, unidas por pasillos (árbol mínimo y algún bucle),
   con puertas donde un pasillo estrecho entra en una sala. */
export const LAYOUTS = ["straight", "winding", "forking", "balanced"];
export function generate(opts = {}) {
  const o = {
    cols: 40, rows: 28, rooms: 8, roomMin: 3, roomMax: 8, corridor: 1, layout: "balanced",
    doors: 0.7, shape: "mixed", roughness: 0, seed: Math.floor(Math.random() * 1e9), props: true, ...opts
  };
  const R = rng(o.seed);
  const rint = (a, b) => a + Math.floor(R() * (b - a + 1));
  const rooms = [];
  for (let tries = 0; rooms.length < o.rooms && tries < o.rooms * 60; tries++) {
    const w = rint(o.roomMin, o.roomMax), h = rint(o.roomMin, Math.max(o.roomMin, Math.round(o.roomMax * 0.85)));
    const x = rint(1, Math.max(1, o.cols - w - 1)), y = rint(1, Math.max(1, o.rows - h - 1));
    if (x + w > o.cols - 1 || y + h > o.rows - 1) continue;
    if (rooms.some(r => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
    rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) });
  }
  const items = [], doors = [], props = [];
  const shapeFor = () => o.shape === "mixed" ? ["square", "square", "rounded", "irregular"][rint(0, 3)] : o.shape;
  for (const r of rooms) {
    r.kind = shapeFor();
    const rough = o.roughness;
    if (r.kind === "rounded") {
      items.push(Math.abs(r.w - r.h) <= 1 && r.w >= 4
        ? { type: "floor", shape: "ellipse", x: r.x, y: r.y, w: r.w, h: r.h, rough, seed: rint(1, 1e6) }
        : { type: "floor", shape: "rect", x: r.x, y: r.y, w: r.w, h: r.h, r: Math.min(r.w, r.h) * 0.3, rough, seed: rint(1, 1e6) });
    } else if (r.kind === "irregular") {
      const n = 10, pts2 = [];
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2, j = 0.78 + R() * 0.3;
        pts2.push([r.x + r.w / 2 + Math.cos(a) * r.w / 2 * j, r.y + r.h / 2 + Math.sin(a) * r.h / 2 * j]);
      }
      items.push({ type: "floor", shape: "poly", points: pts2, smooth: true, rough: Math.max(rough, 0.25), seed: rint(1, 1e6) });
    } else {
      items.push({ type: "floor", shape: "rect", x: r.x, y: r.y, w: r.w, h: r.h, r: 0, rough, seed: rint(1, 1e6) });
    }
  }
  /* Árbol mínimo entre centros (Prim) */
  const links = [];
  if (rooms.length > 1) {
    const inTree = new Set([0]);
    while (inTree.size < rooms.length) {
      let best = null;
      for (const i of inTree) for (let j = 0; j < rooms.length; j++) {
        if (inTree.has(j)) continue;
        const d = Math.hypot(rooms[i].cx - rooms[j].cx, rooms[i].cy - rooms[j].cy);
        if (!best || d < best.d) best = { i, j, d };
      }
      inTree.add(best.j);
      links.push([best.i, best.j]);
    }
    const extra = { straight: 0, winding: 0.1, forking: 0.35, balanced: 0.2 }[o.layout] ?? 0.2;
    for (let i = 0; i < rooms.length; i++) for (let j = i + 1; j < rooms.length; j++) {
      if (links.some(([a, b]) => (a === i && b === j) || (a === j && b === i))) continue;
      const d = Math.hypot(rooms[i].cx - rooms[j].cx, rooms[i].cy - rooms[j].cy);
      if (d < Math.max(o.cols, o.rows) * 0.45 && R() < extra) links.push([i, j]);
    }
  }
  const cw = Math.max(1, Math.min(3, Math.round(o.corridor)));
  const leg = (x1, y1, x2, y2) => {
    const x = Math.min(x1, x2), y = Math.min(y1, y2);
    items.push({ type: "floor", shape: "rect", x, y, w: Math.abs(x2 - x1) + cw, h: Math.abs(y2 - y1) + cw, r: 0, rough: o.roughness * 0.6, seed: rint(1, 1e6) });
  };
  for (const [ia, ib] of links) {
    const A = rooms[ia], B = rooms[ib];
    let pts2 = [[A.cx, A.cy]];
    if (o.layout === "winding") {
      const k = rint(1, 2);
      for (let s = 1; s <= k; s++) {
        const t = s / (k + 1);
        pts2.push([clampN(Math.round(A.cx + (B.cx - A.cx) * t + rint(-3, 3)), 1, o.cols - 2), clampN(Math.round(A.cy + (B.cy - A.cy) * t + rint(-3, 3)), 1, o.rows - 2)]);
      }
    }
    pts2.push([B.cx, B.cy]);
    for (let s = 1; s < pts2.length; s++) {
      const [x1, y1] = pts2[s - 1], [x2, y2] = pts2[s];
      if (R() < 0.5) { leg(x1, y1, x2, y1); leg(x2, y1, x2, y2); } else { leg(x1, y1, x1, y2); leg(x1, y2, x2, y2); }
    }
    /* Puertas en los pasillos de una casilla que salen de una sala cuadrada */
    if (cw === 1) {
      for (const [room, toward] of [[A, pts2[1]], [B, pts2[pts2.length - 2]]]) {
        if (room.kind !== "square" || R() > o.doors) continue;
        const d = doorOut(room, toward);
        if (d && !doors.some(e => e.x1 === d.x1 && e.y1 === d.y1 && e.x2 === d.x2 && e.y2 === d.y2)) doors.push({ type: "door", kind: R() < 0.12 ? "secret" : "door", ...d });
      }
    }
  }
  /* Algo dentro: escaleras en la primera y la última sala, y unas cosas por ahí */
  if (o.props && rooms.length) {
    const first = rooms[0], last = rooms[rooms.length - 1];
    props.push({ type: "prop", kind: "stairsDown", x: first.x + 1, y: first.y + 1, rot: 0, scale: 1 });
    if (rooms.length > 1) props.push({ type: "prop", kind: "stairsUp", x: last.x + last.w - 1, y: last.y + last.h - 1, rot: 180, scale: 1 });
    const kinds = ["barrel", "crate", "chest", "table", "rubble", "bones", "statue", "pillar", "bookshelf", "brazier"];
    for (const r of rooms.slice(1, -1)) {
      if (r.kind !== "square" && r.kind !== "rounded") continue;
      const n = rint(0, 2);
      for (let k = 0; k < n; k++) props.push({ type: "prop", kind: kinds[rint(0, kinds.length - 1)], x: r.x + 0.5 + rint(0, r.w - 1), y: r.y + 0.5 + rint(0, r.h - 1), rot: rint(0, 3) * 90, scale: 1 });
    }
  }
  const d = newDesign({ cols: o.cols, rows: o.rows, preset: opts.preset || "pergamino" });
  d.layers[0].items = [...items, ...doors].map(normalizeItem);
  d.layers[1].items = props.map(normalizeItem);
  return d;
}
/* Puerta en el borde de una sala cuadrada, por donde sale un pasillo hacia (tx, ty) */
function doorOut(room, [tx, ty]) {
  if (tx >= room.x && tx < room.x + room.w) {
    if (ty >= room.y + room.h) return { x1: tx, y1: room.y + room.h, x2: tx + 1, y2: room.y + room.h };
    if (ty < room.y) return { x1: tx, y1: room.y, x2: tx + 1, y2: room.y };
  }
  if (ty >= room.y && ty < room.y + room.h) {
    if (tx >= room.x + room.w) return { x1: room.x + room.w, y1: ty, x2: room.x + room.w, y2: ty + 1 };
    if (tx < room.x) return { x1: room.x, y1: ty, x2: room.x, y2: ty + 1 };
  }
  return null;
}

/* ---------- Pruebas de geometría para el editor ---------- */
/* La pieza que hay bajo el puntero, de arriba abajo (capas visibles y sin candado) */
export function hitTest(design, x, y, { tol = 0.25 } = {}) {
  for (let li = design.layers.length - 1; li >= 0; li--) {
    const layer = design.layers[li];
    if (!layer.visible || layer.locked) continue;
    for (let k = layer.items.length - 1; k >= 0; k--) {
      const it = layer.items[k];
      if (hitItem(it, x, y, tol)) return { layer, item: it };
    }
  }
  return null;
}
export function hitItem(it, x, y, tol = 0.25) {
  switch (it.type) {
    case "floor": case "water":
      if (it.shape === "cells") return it.cells.includes(Math.floor(x) + "," + Math.floor(y));
      return sdf(it, x, y) <= tol;
    case "wall": case "path": {
      const p = it.smooth ? smoothPath(it.points, false, 6) : it.points;
      for (let i = 1; i < p.length; i++) if (segDist(x, y, p[i - 1], p[i]) <= tol + (it.width || 0) / 2) return true;
      return false;
    }
    case "door": return segDist(x, y, [it.x1, it.y1], [it.x2, it.y2]) <= tol + 0.1;
    default: {
      const b = boundsOf(it);
      return x >= b.x - tol && x <= b.x + b.w + tol && y >= b.y - tol && y <= b.y + b.h + tol;
    }
  }
}

/* Mover una pieza (dx, dy) en casillas */
export function moveItem(it, dx, dy) {
  const P = p => [Math.round((p[0] + dx) * 1000) / 1000, Math.round((p[1] + dy) * 1000) / 1000];
  if (it.type === "door") return { ...it, x1: it.x1 + dx, y1: it.y1 + dy, x2: it.x2 + dx, y2: it.y2 + dy };
  if (it.shape === "cells") {
    const sx = Math.round(dx), sy = Math.round(dy);
    return { ...it, cells: it.cells.map(k => { const [a, b] = k.split(",").map(Number); return (a + sx) + "," + (b + sy); }) };
  }
  const out = { ...it };
  if ("x" in it) { out.x = it.x + dx; out.y = it.y + dy; }
  if (it.points) out.points = it.points.map(P);
  return out;
}
/* Espejo horizontal o vertical respecto al centro de la pieza */
export function mirrorItem(it, axis = "x") {
  const b = boundsOf(it), c = axis === "x" ? b.x + b.w / 2 : b.y + b.h / 2;
  const f = v => 2 * c - v;
  const P = p => axis === "x" ? [f(p[0]), p[1]] : [p[0], f(p[1])];
  if (it.type === "door") return axis === "x" ? { ...it, x1: f(it.x1), x2: f(it.x2) } : { ...it, y1: f(it.y1), y2: f(it.y2) };
  if (it.type === "prop" || it.type === "text") return { ...it, rot: axis === "x" ? (360 - it.rot) % 360 : (180 - it.rot + 360) % 360, flip: !it.flip };
  if (it.shape === "cells") return { ...it, cells: it.cells.map(k => { const [a, bb] = k.split(",").map(Number); return axis === "x" ? `${Math.round(f(a + 0.5) - 0.5)},${bb}` : `${a},${Math.round(f(bb + 0.5) - 0.5)}`; }) };
  const out = { ...it };
  if (it.points) out.points = it.points.map(P);
  return out;
}
