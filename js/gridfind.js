/* Encontrar la cuadrícula dibujada en un plano.

   Los mapas de D&D traen casi siempre su cuadrícula pintada: líneas finas,
   paralelas y a la misma distancia. Eso deja una huella muy clara si se suman
   por columnas (y por filas) los bordes finos de la imagen: un pico cada
   tantos píxeles. Lo que hace este módulo:

   1. Perfil: para cada columna x, cuánto «trazo fino» hay en ella (segunda
      derivada en x, recortada para que un muro gordo no pese más que la
      cuadrícula). Igual por filas.
   2. Espectro: qué periodos se repiten en esos perfiles. Se suman los
      armónicos de cada candidato, porque una línea fina repetida deja energía
      en 1/p, 2/p, 3/p…
   3. El ganador suele ser la cuadrícula o un múltiplo suyo (los muros y salas
      van alineados a la cuadrícula y se repiten cada 2, 3 o 4 casillas). Se
      prueba a partirlo en 2…6 y se comprueba sobre la imagen si en esas
      posiciones intermedias hay líneas de verdad. Y al revés: si de cada dos
      líneas una no existe, la casilla es el doble.
   4. Se afinan tamaño y desplazamiento con una regresión sobre la posición de
      cada línea encontrada, por separado en horizontal y en vertical (una
      imagen estirada puede tener casillas un poco rectangulares).
   5. Se cuentan columnas y filas: un trozo de casilla en el borde cuenta si
      tiene al menos la mitad.
   6. Confianza (0…1): cuánto destaca ese tamaño en el espectro y lo
      constantes que son sus líneas. Por debajo de ~0,25 no hay cuadrícula
      que se pueda creer; entre 0,25 y 0,6, conviene mirarla.

   No depende del navegador: trabaja sobre los píxeles en un array, así que
   se puede probar con Node. */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* Luminancia de un RGBA (ImageData.data) o de un RGB */
export function toGray(data, w, h, channels = 4) {
  const g = new Float32Array(w * h);
  for (let i = 0, j = 0; i < g.length; i++, j += channels)
    g[i] = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
  return g;
}

/* Perfil de líneas finas. axis 0: líneas verticales (perfil a lo ancho);
   axis 1: líneas horizontales (perfil a lo alto). La segunda derivada va
   suavizada: una imagen ampliada o reducida deja un rizado de un píxel que,
   sin suavizar, parece otra cuadrícula. Hay dos grados: el estrecho ve
   casillas de pocos píxeles; el ancho no distingue si una línea cae justo en
   un píxel o entre dos (con casillas de 52,5 px, una sí y otra no), y es el
   que decide si partir o juntar casillas cuando son grandes. */
export function lineProfile(g, w, h, axis, wide = false) {
  const n = axis === 0 ? w : h, m = axis === 0 ? h : w;
  const at = axis === 0 ? (i, j) => g[j * w + i] : (i, j) => g[i * w + j];
  /* Estrecho: [1 2 −6 2 1], segunda derivada tras suavizar una vez con [1 2 1].
     Ancho: [1 2 −1 −4 −1 2 1], tras suavizar dos veces. */
  const resp = wide
    ? (i, j) => Math.abs(at(i - 3, j) + at(i + 3, j) + 2 * (at(i - 2, j) + at(i + 2, j))
      - (at(i - 1, j) + at(i + 1, j)) - 4 * at(i, j)) / 4
    : (i, j) => Math.abs(at(i - 2, j) + at(i + 2, j) + 2 * (at(i - 1, j) + at(i + 1, j)) - 6 * at(i, j)) / 4;
  /* Umbral de recorte: percentil 90 de la respuesta, estimado con una muestra */
  const sample = [];
  const step = Math.max(1, Math.floor((n * m) / 40000));
  for (let s = 0; s < n * m; s += step) {
    const i = 3 + (s % (n - 6)), j = Math.floor(s / n) % m;
    sample.push(resp(i, j));
  }
  sample.sort((a, b) => a - b);
  const cap = Math.max(1, sample[Math.floor(sample.length * 0.9)] || 1);
  const p = new Float64Array(n);
  for (let j = 0; j < m; j++) {
    for (let i = 3; i < n - 3; i++) {
      const r = resp(i, j);
      p[i] += r < cap ? r : cap;
    }
  }
  p[0] = p[1] = p[2] = p[3]; p[n - 1] = p[n - 2] = p[n - 3] = p[n - 4];
  for (let i = 0; i < n; i++) p[i] /= m;
  return p;
}

/* Las imágenes JPEG traen un dibujo de bloques de 8×8 píxeles que también se
   repite. Se quita del perfil todo lo que tenga periodo exacto de 8. */
export function removeBlockPattern(p) {
  const sum = new Float64Array(8), cnt = new Float64Array(8);
  let all = 0;
  for (let i = 0; i < p.length; i++) { sum[i & 7] += p[i]; cnt[i & 7]++; all += p[i]; }
  all /= p.length;
  const q = Float64Array.from(p);
  for (let i = 0; i < p.length; i++) q[i] -= sum[i & 7] / cnt[i & 7] - all;
  return q;
}

/* Restar la media móvil (deja picos y quita la iluminación general) */
export function highPass(p, win) {
  const n = p.length, half = Math.max(1, Math.floor(win / 2));
  const c = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) c[i + 1] = c[i] + p[i];
  const q = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - half), b = Math.min(n, i + half + 1);
    q[i] = p[i] - (c[b] - c[a]) / (b - a);
  }
  return q;
}

export function smooth(p) {
  const n = p.length, q = new Float64Array(n);
  for (let i = 0; i < n; i++) q[i] = (p[Math.max(0, i - 1)] + 2 * p[i] + p[Math.min(n - 1, i + 1)]) / 4;
  return q;
}

/* Valor del perfil en una posición con decimales */
function sampleAt(p, x) {
  if (x <= 0) return p[0];
  if (x >= p.length - 1) return p[p.length - 1];
  const i = Math.floor(x), f = x - i;
  return p[i] * (1 - f) + p[i + 1] * f;
}

/* Amplitud de la transformada de Fourier en una frecuencia (ciclos/píxel),
   con ventana de Hann para que los bordes no ensucien. */
function amplitude(p, win, f) {
  const n = p.length;
  const c = Math.cos(2 * Math.PI * f), s = Math.sin(2 * Math.PI * f);
  let re = 0, im = 0, cr = 1, ci = 0;
  for (let i = 0; i < n; i++) {
    const v = p[i] * win[i];
    re += v * cr; im -= v * ci;
    const nr = cr * c - ci * s; ci = cr * s + ci * c; cr = nr;
  }
  return Math.hypot(re, im) / n;
}

function phaseAt(p, f) {
  let re = 0, im = 0;
  for (let i = 0; i < p.length; i++) {
    re += p[i] * Math.cos(2 * Math.PI * f * i);
    im -= p[i] * Math.sin(2 * Math.PI * f * i);
  }
  return Math.atan2(im, re);
}

/* Espectro en una rejilla fina de frecuencias; luego se consulta interpolando */
export function spectrum(p, fMax, df) {
  const n = p.length, win = new Float64Array(n);
  for (let i = 0; i < n; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  const count = Math.ceil(fMax / df) + 2, A = new Float64Array(count);
  for (let k = 0; k < count; k++) A[k] = amplitude(p, win, k * df);
  return { A, df, at: f => sampleAt(A, f / df) };
}

/* El espectro de una imagen tiene mucha más energía en frecuencias bajas
   (formas grandes) que en altas. Para comparar picos se divide cada valor
   por la mediana de su entorno (±20 % en frecuencia): queda cuánto destaca. */
export function whiten(sp, fLo, fHi) {
  const anchors = [];
  for (let f = fLo; f <= fHi; f *= 1.05) {
    const a = Math.max(1, Math.floor(f / 1.2 / sp.df)), b = Math.min(sp.A.length - 1, Math.ceil(f * 1.2 / sp.df));
    const vals = Array.from(sp.A.subarray(a, b + 1)).sort((x, y) => x - y);
    anchors.push([f, vals[Math.floor(vals.length / 2)] || 1e-9]);
  }
  const base = f => {
    if (f <= anchors[0][0]) return anchors[0][1];
    const i = Math.min(anchors.length - 2, Math.floor(Math.log(f / fLo) / Math.log(1.05)));
    if (i >= anchors.length - 1) return anchors[anchors.length - 1][1];
    const [f0, v0] = anchors[i], [f1, v1] = anchors[i + 1];
    return v0 + (v1 - v0) * clamp((f - f0) / (f1 - f0), 0, 1);
  };
  return { ...sp, at: f => sp.at(f) / base(f) };
}

/* Tamaño de casilla que más energía reúne sumando armónicos, en los dos ejes */
export function bestPeriod(specs, minCell, maxCell, harmonics = 4) {
  const score = pp => {
    let s = 0;
    for (const sp of specs)
      for (let k = 1; k <= harmonics; k++) {
        const f = k / pp;
        if (f > 0.45) break;
        s += Math.min(6, sp.at(f));   // que un solo pico raro no gane solo
      }
    return s;
  };
  const list = [];
  for (let pp = minCell; pp <= maxCell; pp *= 1.0015) list.push([pp, score(pp)]);
  let best = list[0];
  for (const e of list) if (e[1] > best[1]) best = e;
  /* Nivel de fondo: mediana de las puntuaciones */
  const sorted = list.map(e => e[1]).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return { period: best[0], score: best[1], median, scoreAt: score };
}

/* Afinar tamaño y fase de un eje: se busca cada línea cerca de donde debería
   estar y se ajusta una recta posición = fase + índice × tamaño. */
export function refineAxis(q, period, phase) {
  const n = q.length;
  let P = period, phi = phase;
  let lines = [];
  for (let round = 0; round < 4; round++) {
    const reach = round < 2 ? P * 0.3 : Math.min(P * 0.2, 2.5);
    lines = [];
    const first = Math.ceil((0 - phi) / P), last = Math.floor((n - 1 - phi) / P);
    for (let k = first; k <= last; k++) {
      const c = phi + k * P;
      const a = Math.max(1, Math.round(c - reach)), b = Math.min(n - 2, Math.round(c + reach));
      let bi = -1, bv = -Infinity;
      for (let i = a; i <= b; i++) if (q[i] > bv) { bv = q[i]; bi = i; }
      if (bi < 0 || bv <= 0) continue;
      /* Posición con decimales: parábola por el pico */
      const l = q[bi - 1], r = q[bi + 1], d = l - 2 * bv + r;
      const off = d < 0 ? clamp((l - r) / (2 * d), -0.5, 0.5) : 0;
      lines.push({ k, x: bi + off, v: bv });
    }
    if (lines.length < 3) break;
    /* Regresión ponderada por la fuerza de cada línea. Un muro gordo pesa
       como mucho el doble que una línea normal: si no, la recta se iría hacia
       el borde del muro. */
    const vs = lines.map(L => L.v).sort((x, y) => x - y), capW = 2 * vs[Math.floor(vs.length / 2)];
    let sw = 0, sk = 0, sx = 0, skk = 0, skx = 0;
    for (const L of lines) {
      const wgt = Math.min(L.v, capW);
      sw += wgt; sk += wgt * L.k; sx += wgt * L.x; skk += wgt * L.k * L.k; skx += wgt * L.k * L.x;
    }
    const den = sw * skk - sk * sk;
    if (Math.abs(den) < 1e-9) break;
    const newP = (sw * skx - sk * sx) / den;
    const newPhi = (sx - newP * sk) / sw;
    if (!(newP > 1) || Math.abs(newP - P) > P * 0.05) break;
    P = newP; phi = newPhi;
  }
  phi = ((phi % P) + P) % P;
  return { period: P, phase: phi, lines };
}

/* Cuánto destaca cada «familia» de líneas al partir un periodo en k:
   contraste entre la posición de la línea y el centro de las casillas de al
   lado. Para cada resto (0…k-1) devuelve la mediana del contraste (la línea
   típica: unos pocos muros gordos no la mueven), lo seguro que es (t: media
   entre su error típico) y lo constante que es de una línea a otra (d: media
   entre dispersión). */
export function classContrast(q, P, phi, k) {
  const sub = P / k, n = q.length;
  const vals = Array.from({ length: k }, () => []);
  const peak = x => Math.max(sampleAt(q, x - 0.7), sampleAt(q, x), sampleAt(q, x + 0.7));
  const first = Math.ceil((sub / 2 + 1 - phi) / sub), last = Math.floor((n - 2 - sub / 2 - phi) / sub);
  for (let j = first; j <= last; j++) {
    const x = phi + j * sub;
    vals[((j % k) + k) % k].push(peak(x) - (sampleAt(q, x - sub / 2) + sampleAt(q, x + sub / 2)) / 2);
  }
  return vals.map(v => {
    if (v.length < 2) return { median: 0, t: 0, d: 0 };
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (v.length - 1)) || 1e-9;
    const sorted = [...v].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return { median, t: mean / (sd / Math.sqrt(v.length)), d: mean / sd };
  });
}

export function phaseFor(q, P) {
  const ang = phaseAt(q, 1 / P);
  return ((-ang / (2 * Math.PI)) * P % P + P) % P;
}

/* Columnas o filas que caben, y dónde empieza la primera.
   Un trozo de casilla en el borde cuenta si tiene al menos `keep` de casilla. */
export function fitCount(length, period, phase, keep = 0.5) {
  const tol = Math.min(1.5, period * 0.1);
  let origin = phase;
  if (origin > period - tol) origin -= period;            // la línea cae justo en el borde
  if (origin >= keep * period) origin -= period;          // trozo grande a la izquierda: se queda
  const span = length - origin;
  let count = Math.floor((span + tol) / period);
  const rest = span - count * period;
  if (rest >= keep * period) count++;
  return { origin, count: Math.max(1, count) };
}

/* Punto de entrada. Devuelve la casilla en píxeles de la imagen (w, h),
   dónde empieza la casilla (0,0) (x, y, puede ser negativo si la primera
   está cortada), columnas, filas y una confianza de 0 a 1. */
export function detectGrid(gray, w, h, opts = {}) {
  const minCell = opts.minCell || 4;
  const maxCell = opts.maxCell || Math.max(minCell * 2, Math.min(w, h) / 4);
  const keep = opts.keep ?? 0.5;

  const raw = [lineProfile(gray, w, h, 0), lineProfile(gray, w, h, 1)];
  const rawWide = [lineProfile(gray, w, h, 0, true), lineProfile(gray, w, h, 1, true)];
  const flat = raw.map(p => highPass(removeBlockPattern(p), Math.round(maxCell * 1.5) | 1));
  const toPeaks = p => smooth(highPass(removeBlockPattern(p), Math.max(9, Math.round(maxCell * 0.75) | 1)));
  const narrow = raw.map(toPeaks), wide = rawWide.map(toPeaks);
  /* El perfil con el que mirar líneas separadas `period` píxeles */
  const prof = (i, period) => (period >= 10 ? wide : narrow)[i];

  const df = 1 / (4 * Math.max(w, h));
  const specs = flat.map(p => whiten(spectrum(p, 0.5, df), 1 / (maxCell * 1.5), 0.5));
  const best = bestPeriod(specs, minCell, maxCell);

  /* Afinar el candidato en cada eje: así las pruebas de abajo miran justo
     encima de las líneas, sin irse desplazando a lo largo de la imagen. */
  let ax = [0, 1].map(i => {
    const q = prof(i, best.period);
    return refineAxis(q, best.period, phaseFor(q, best.period));
  });

  /* ¿Es un múltiplo de la casilla? Probar a partirlo en k: todas las
     familias de líneas intermedias tienen que existir. */
  const testSplit = k => ax.every((a, i) => {
    if (a.period / k < minCell) return false;
    const c = classContrast(prof(i, a.period / k), a.period, a.phase, k);
    const strongest = Math.max(...c.map(v => v.median));
    return c.every(v => v.median > 0.4 * strongest && v.t > 3);
  });
  let split = 1;
  for (let k = 6; k >= 2; k--) if (testSplit(k)) { split = k; break; }
  if (split > 1) ax = ax.map((a, i) => refineAxis(prof(i, a.period / split), a.period / split, a.phase));

  /* ¿Es la mitad (o un tercio) de la casilla? Si de cada dos líneas una es
     mucho más floja (juntas de baldosa, la textura), la casilla es el doble.
     Se repite por si el candidato era un cuarto. */
  for (let round = 0; round < 3; round++) {
    let merged = false;
    for (const m of [2, 3]) {
      const tests = ax.map((a, i) => {
        if (a.period * m > maxCell) return null;
        const c = classContrast(prof(i, a.period), a.period * m, a.phase, m);
        const top = c.reduce((b, v, r) => (v.median > c[b].median ? r : b), 0);
        if (!(c[top].t > 3)) return null;
        const weak = c.filter((v, r) => r !== top && v.median < 0.33 * c[top].median).length === m - 1;
        return weak ? top : null;
      });
      if (tests.every(r => r !== null)) {
        ax = ax.map((a, i) => refineAxis(prof(i, a.period * m), a.period * m, a.phase + tests[i] * a.period));
        split /= m;
        merged = true;
        break;
      }
    }
    if (!merged) break;
  }

  const cellW = ax[0].period, cellH = ax[1].period;
  const fx = fitCount(w, cellW, ax[0].phase, keep);
  const fy = fitCount(h, cellH, ax[1].phase, keep);

  /* Confianza, con dos pistas:
     - lo que destaca la cuadrícula en el espectro frente al resto de tamaños;
     - lo constantes que son sus líneas: en una cuadrícula de verdad casi
       todas destacan sobre el centro de las casillas de al lado (contraste
       medio dividido por su dispersión; con textura al azar ronda 0,5). */
  const stats = ax.map((a, i) => classContrast(prof(i, a.period), a.period, a.phase, 1)[0]);
  const steady = Math.min(...stats.map(st => st.d));
  const prominence = best.scoreAt((cellW + cellH) / 2) / Math.max(1e-9, best.median);
  /* Las casillas son cuadradas: si a lo ancho y a lo alto salen distintas,
     algo no cuadra. */
  const skew = Math.abs(cellW - cellH) / ((cellW + cellH) / 2);
  const confidence = clamp(0.6 * clamp(steady - 0.5, 0, 1) + 0.4 * clamp((prominence - 2) / 3, 0, 1)
    - Math.max(0, skew - 0.01) * 10, 0, 1);

  return {
    cellW, cellH,
    x: fx.origin, y: fy.origin,
    cols: fx.count, rows: fy.count,
    confidence, prominence, steady,
    split, rawPeriod: best.period
  };
}
