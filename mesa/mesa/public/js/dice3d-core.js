/* Dados 3D, la parte sin dibujo: la forma de cada dado, la física que lo
   hace rodar y cómo se numera para que caiga en el resultado. Sin
   navegador, para poder probarla. */

/* ---------- Geometría ----------
   Cada poliedro: sus vértices y sus caras como listas de vértices en orden.
   Las caras de los platónicos salen de su dual: la cara i son los vértices
   que más miran hacia la dirección i. */
const PHI = (1 + Math.sqrt(5)) / 2;
export const norm = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const signs = n => Array.from({ length: 1 << n }, (_, i) => Array.from({ length: n }, (_, k) => (i >> k) & 1 ? -1 : 1));

const CUBE = signs(3);
const OCTA = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const ICOSA = [...signs(2).map(([a, b]) => [0, a, b * PHI]), ...signs(2).map(([a, b]) => [a, b * PHI, 0]), ...signs(2).map(([a, b]) => [a * PHI, 0, b])];
const DODECA = [...CUBE, ...signs(2).map(([a, b]) => [0, a * PHI, b / PHI]), ...signs(2).map(([a, b]) => [a * PHI, b / PHI, 0]), ...signs(2).map(([a, b]) => [a / PHI, 0, b * PHI])];
const TETRA = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]];

function facesFromDual(verts, dirs) {
  return dirs.map(d => {
    const dn = norm(d);
    const dots = verts.map(v => dot(norm(v), dn));
    const max = Math.max(...dots);
    const idx = dots.map((x, i) => [x, i]).filter(([x]) => x > max - 1e-6).map(([, i]) => i);
    /* En orden alrededor del centro de la cara, hacia fuera */
    const c = idx.reduce((s, i) => s.map((x, k) => x + verts[i][k] / idx.length), [0, 0, 0]);
    const u = norm(sub(verts[idx[0]], c)), w = cross(dn, u);
    return idx.map(i => { const r = sub(verts[i], c); return [Math.atan2(dot(r, w), dot(r, u)), i]; }).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
  });
}
/* El d10: dos vértices en los polos y diez en zigzag alrededor */
function d10Shape() {
  const verts = [[0, 1, 0], [0, -1, 0]];
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5;
    /* Con esta altura cada cara (una cometa) es plana */
    verts.push([Math.cos(a), (i % 2 ? -1 : 1) * 0.1055728, Math.sin(a)]);
  }
  const ring = i => 2 + ((i % 10) + 10) % 10;
  const faces = [];
  for (let k = 0; k < 5; k++) {
    faces.push([0, ring(2 * k + 2), ring(2 * k + 1), ring(2 * k)]);
    faces.push([1, ring(2 * k + 1), ring(2 * k + 2), ring(2 * k + 3)]);
  }
  return { verts, faces };
}
const SHAPES = {
  4: () => ({ verts: TETRA, faces: facesFromDual(TETRA, TETRA.map(v => v.map(x => -x))) }),
  6: () => ({ verts: CUBE, faces: facesFromDual(CUBE, OCTA) }),
  8: () => ({ verts: OCTA, faces: facesFromDual(OCTA, CUBE) }),
  10: d10Shape,
  12: () => ({ verts: DODECA, faces: facesFromDual(DODECA, ICOSA) }),
  20: () => ({ verts: ICOSA, faces: facesFromDual(ICOSA, DODECA) })
};
/* Tamaño a ojo para que todos parezcan del mismo juego */
const SCALE = { 4: 1.25, 6: 0.86, 8: 1.12, 10: 1.08, 12: 1.12, 20: 1.16 };

const shapeCache = {};
export function shapeOf(f) {
  if (shapeCache[f]) return shapeCache[f];
  const { verts, faces } = SHAPES[f]();
  const s = SCALE[f];
  const V = verts.map(v => norm(v).map(x => x * s));
  /* Que cada cara mire hacia fuera */
  const F = faces.map(face => {
    const c = face.reduce((a, i) => a.map((x, k) => x + V[i][k] / face.length), [0, 0, 0]);
    const n = cross(sub(V[face[1]], V[face[0]]), sub(V[face[2]], V[face[0]]));
    return dot(n, c) < 0 ? face.slice().reverse() : face;
  });
  /* La normal de verdad de cada cara (en las cometas del d10 no apunta al centro) */
  const normals = F.map(face => norm(cross(sub(V[face[1]], V[face[0]]), sub(V[face[2]], V[face[0]]))));
  return (shapeCache[f] = { V, F, normals, radius: s });
}

/* ---------- Física ----------
   Un sólido rígido por dado: posición, velocidad, orientación (cuaternión)
   y giro. Choca por sus vértices contra el suelo (y = 0) y las cuatro
   paredes de la pantalla, y entre dados como si fueran esferas. */
const qMul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
export const qRot = (q, v) => {
  const [x, y, z, w] = q;
  const ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
};
const qNorm = q => { const l = Math.hypot(...q) || 1; return q.map(x => x / l); };
const randQ = R => { const u = R(), v = R(), w = R(); return [Math.sqrt(1 - u) * Math.sin(2 * Math.PI * v), Math.sqrt(1 - u) * Math.cos(2 * Math.PI * v), Math.sqrt(u) * Math.sin(2 * Math.PI * w), Math.sqrt(u) * Math.cos(2 * Math.PI * w)]; };
/* El giro más corto que lleva a hasta b (vectores unitarios) */
function qBetween(a, b) {
  const c = cross(a, b), d = dot(a, b);
  if (d < -0.9999) { const ax = Math.abs(a[0]) < 0.9 ? norm(cross(a, [1, 0, 0])) : norm(cross(a, [0, 1, 0])); return [...ax, 0]; }
  return qNorm([c[0], c[1], c[2], 1 + d]);
}
const slerp = (a, b, t) => {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const bb = d < 0 ? b.map(x => -x) : b; d = Math.abs(d);
  if (d > 0.9995) return qNorm(a.map((x, i) => x + (bb[i] - x) * t));
  const th = Math.acos(d), s = Math.sin(th);
  return a.map((x, i) => (x * Math.sin((1 - t) * th) + bb[i] * Math.sin(t * th)) / s);
};

const DT = 1 / 120, G = -38, REST = 0.32, FRICTION = 0.42;

export function simulate(dice, bounds, R = Math.random) {
  const n = dice.length;
  const bodies = dice.map((d, i) => {
    const sh = shapeOf(d.shape);
    /* Entran desde un lado, a la altura de la mano, lanzados hacia el centro */
    const side = R() < 0.5 ? -1 : 1;
    const p = [side * (bounds.x - 1.5 - R() * 1.5), 5 + R() * 3 + (i % 3), (R() - 0.5) * bounds.z * 1.2];
    const target = [(R() - 0.5) * bounds.x * 0.6, 0, (R() - 0.5) * bounds.z * 0.6];
    const speed = 14 + R() * 8;
    const dir = norm(sub(target, p));
    return { sh, p, v: [dir[0] * speed, 2 + R() * 3, dir[2] * speed], q: randQ(R),
      w: [(R() - 0.5) * 34, (R() - 0.5) * 34, (R() - 0.5) * 34], still: 0, r: sh.radius, inertia: 0.4 * sh.radius * sh.radius };
  });
  const frames = [];
  const maxSteps = 4 * 120;
  for (let step = 0; step < maxSteps; step++) {
    for (const b of bodies) {
      if (b.still > 24) continue;
      b.v[1] += G * DT;
      b.p = b.p.map((x, k) => x + b.v[k] * DT);
      const wq = [b.w[0] * DT / 2, b.w[1] * DT / 2, b.w[2] * DT / 2, 0];
      b.q = qNorm(b.q.map((x, k) => x + qMul(wq, b.q)[k]));
      /* Contactos por vértice contra el suelo y las paredes */
      /* La pared de abajo de la pantalla (z positivo) sube un poco: deja sitio a la placa del resultado */
      const planes = [[[0, 1, 0], 0], [[1, 0, 0], -bounds.x], [[-1, 0, 0], -bounds.x], [[0, 0, 1], -bounds.z], [[0, 0, -1], -bounds.z * (bounds.low ?? 1)]];
      let grounded = false;
      for (const [nrm, off] of planes) {
        let deepest = 0;
        for (const lv of b.sh.V) {
          const r = qRot(b.q, lv), wp = [b.p[0] + r[0], b.p[1] + r[1], b.p[2] + r[2]];
          const depth = off - dot(wp, nrm);
          if (depth <= 0) continue;
          deepest = Math.max(deepest, depth);
          const vp = [b.v[0] + b.w[1] * r[2] - b.w[2] * r[1], b.v[1] + b.w[2] * r[0] - b.w[0] * r[2], b.v[2] + b.w[0] * r[1] - b.w[1] * r[0]];
          const vn = dot(vp, nrm);
          if (vn >= 0) continue;
          const rn = cross(r, nrm);
          const jn = -(1 + REST) * vn / (1 + dot(rn, rn) / b.inertia);
          /* Rozamiento: frena lo que resbala sobre el plano */
          const vt = sub(vp, nrm.map(x => x * vn)), vtl = Math.hypot(...vt);
          const t = vtl > 1e-6 ? vt.map(x => -x / vtl) : [0, 0, 0];
          const rt = cross(r, t);
          const jt = Math.min(FRICTION * jn, vtl / (1 + dot(rt, rt) / b.inertia));
          const J = nrm.map((x, k) => x * jn + t[k] * jt);
          b.v = b.v.map((x, k) => x + J[k]);
          const dw = cross(r, J);
          b.w = b.w.map((x, k) => x + dw[k] / b.inertia);
        }
        if (deepest > 0) { b.p = b.p.map((x, k) => x + nrm[k] * deepest * 0.9); if (nrm[1] === 1) grounded = true; }
      }
      /* Rodando por el suelo pierde fuerza (resistencia a la rodadura) */
      const wd = grounded ? 0.982 : 0.997, vd = grounded ? 0.988 : 0.999;
      b.w = b.w.map(x => x * wd);
      b.v = b.v.map((x, k) => k === 1 ? x : x * vd);
      const calm = Math.hypot(...b.v) < 0.35 && Math.hypot(...b.w) < 0.9 && b.p[1] < b.r * 1.1;
      b.still = calm ? b.still + 1 : 0;
    }
    /* Entre dados: se apartan como si fueran esferas */
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = bodies[i], c = bodies[j];
      const d = sub(c.p, a.p), dist = Math.hypot(...d), min = (a.r + c.r) * 0.82;
      if (dist >= min || dist < 1e-6) continue;
      const nn = d.map(x => x / dist), push = (min - dist) / 2;
      a.p = a.p.map((x, k) => x - nn[k] * push); c.p = c.p.map((x, k) => x + nn[k] * push);
      const rel = dot(sub(c.v, a.v), nn);
      if (rel < 0) { const jj = -(1 + REST) * rel / 2; a.v = a.v.map((x, k) => x - nn[k] * jj); c.v = c.v.map((x, k) => x + nn[k] * jj); a.still = c.still = 0; }
    }
    if (step % 2 === 0) frames.push(bodies.map(b => ({ p: b.p.slice(), q: b.q.slice() })));
    if (bodies.every(b => b.still > 24)) break;
  }
  /* Al final, cada dado bien apoyado sobre la cara que tiene arriba: los
     últimos fotogramas lo asientan, sin que se note */
  const top = bodies.map(b => {
    let best = 0, bestY = -2;
    b.sh.normals.forEach((nv, i) => { const y = qRot(b.q, nv)[1]; if (y > bestY) { bestY = y; best = i; } });
    return best;
  });
  const settle = Math.min(14, frames.length - 1);
  const finals = bodies.map((b, i) => {
    const up = qRot(b.q, b.sh.normals[top[i]]);
    return { q: qNorm(qMul(qBetween(up, [0, 1, 0]), b.q)), y: restHeight(b.sh, top[i]) };
  });
  for (let k = 0; k < settle; k++) {
    const t = (k + 1) / settle, f = frames[frames.length - settle + k];
    f.forEach((s, i) => { s.q = slerp(s.q, finals[i].q, t); s.p[1] += (finals[i].y - s.p[1]) * t; });
  }
  return { frames, top };
}
/* Altura del centro cuando el dado se apoya con la cara de arriba hacia arriba */
function restHeight(sh, face) {
  const n = sh.normals[face];
  return Math.max(...sh.V.map(v => dot(v, n)));
}

/* Números de cada dado: el que salió, en la cara (o el vértice) que queda
   arriba; el resto, repartidos */
export function labelsFor(die, topFace, finalQ) {
  const { V, F } = shapeOf(die.shape);
  if (die.shape === 4) {
    /* El vértice más alto lleva el resultado */
    let hi = 0, hy = -9;
    V.forEach((v, i) => { const y = qRot(finalQ, v)[1]; if (y > hy) { hy = y; hi = i; } });
    const rest = [1, 2, 3, 4].filter(x => x !== die.v);
    return V.map((_, i) => String(i === hi ? die.v : rest.shift()));
  }
  const all = Array.from({ length: F.length }, (_, i) => i);
  const vals = die.labels || all.map(i => String(i + 1));
  const out = vals.slice();
  const want = String(die.face);
  const at = out.indexOf(want);
  if (at >= 0) { out[at] = out[topFace]; out[topFace] = want; }
  return out;
}

/* d100 = decenas (00-90) + unidades (0-9); el resto, un dado de sus caras */
export function expand(list) {
  const out = [];
  for (const d of list) {
    if (d.f === 100) {
      const v = d.v % 100, tens = Math.floor(v / 10) * 10, units = v % 10;
      out.push({ shape: 10, face: String(tens).padStart(2, "0"), labels: Array.from({ length: 10 }, (_, i) => String(i * 10).padStart(2, "0")), x: d.x });
      out.push({ shape: 10, face: String(units), labels: Array.from({ length: 10 }, (_, i) => String(i)), x: d.x });
    } else out.push({ shape: d.f, v: d.v, face: String(d.v), x: d.x });
  }
  return out.slice(0, 24);
}

