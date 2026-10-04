/* Proponer muros y puertas a partir del plano, con la cuadrícula ya encajada.

   Con la cuadrícula conocida, cada borde entre dos casillas es un trozo de
   imagen concreto. De cada borde se mide un corte transversal (la franja
   justo encima y un poco de cada casilla a los lados) y de cada casilla, su
   color y lo que hay por su mitad. Con eso:

   1. Suelo: en los planos de batalla la cuadrícula se pinta sobre el suelo
      y casi no se ve en la roca, el agua, los escombros o el vacío. Las
      casillas donde se ve claramente son la semilla; el suelo crece desde
      ahí sin cruzar ningún muro dibujado. Las salas son de formas sencillas:
      lo que queda encerrado en mitad de una sala y no se parece a las
      paredes (un mueble, una alfombra, un estanque) se rellena, y se
      quitan muescas y picos de una casilla.
   2. Muro de borde: entre una casilla de suelo y una que no lo es.
   3. Diagonal: donde el borde del suelo hace escalera y la casilla del
      escalón está partida por su diagonal (medio suelo, medio fuera), el
      escalón se cambia por un muro en diagonal. Hacen falta dos casillas
      seguidas o un corte muy limpio: la esquina de una sala cuadrada no
      se toca. También las líneas dibujadas en diagonal de pared a pared.
   4. Tabique: una línea dibujada entre dos suelos, recta, de al menos tres
      casillas y enganchada a otro muro (un tramo suelto en mitad de una
      sala es una mesa o una sombra, salvo que sea muy largo).
   5. Puerta: un bloque claro sobre el borde, o un tramo más grueso o de
      otro color que el muro de alrededor; en la línea de un muro, o
      cruzando un pasillo si se ve con claridad.

   Lo que sale es una propuesta: la ventana de encajar la enseña para
   revisarla y se puede afinar con la sensibilidad sin volver a medir.

   No depende del navegador: trabaja sobre los píxeles en un array. */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const SEED = 0.4, MIN_COHERENCE = 0.58;

const median = arr => {
  if (!arr.length) return 0;
  const s = Float64Array.from(arr).sort();
  return s[Math.floor(s.length / 2)];
};
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lum = c => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

/* Lector de píxeles: data es RGBA (canvas) o RGB */
function reader(data, W, H, channels) {
  return (x, y) => {
    const i = (clamp(Math.round(y), 0, H - 1) * W + clamp(Math.round(x), 0, W - 1)) * channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
}

/* Media de color de un rectángulo de la imagen (muestreo cada `step` px) */
function meanColor(px, x0, y0, x1, y1, step) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y <= y1; y += step)
    for (let x = x0; x <= x1; x += step) {
      const c = px(x, y);
      r += c[0]; g += c[1]; b += c[2]; n++;
    }
  return n ? [r / n, g / n, b / n] : [0, 0, 0];
}

/* Corte transversal de un borde. Devuelve medidas en «unidades de brillo»
   (0…255). dir "v": borde vertical en x = ex, de y0 a y0 + len. */
function measureEdge(px, dir, ex, ey, len, cross) {
  /* Coordenadas: t a lo largo del borde, u de través (negativo: casilla de
     antes, positivo: casilla de después) */
  const at = dir === "v" ? (t, u) => px(ex + u, ey + t) : (t, u) => px(ex + t, ey + u);
  const t0 = len * 0.2, t1 = len * 0.8;
  const tStep = Math.max(1, len / 24);
  const half = Math.max(1, Math.round(cross * 0.15));       // franja central
  const sideIn = Math.max(half + 1, Math.round(cross * 0.25)), sideOut = Math.max(sideIn + 1, Math.round(cross * 0.45));

  const A = [0, 0, 0], B = [0, 0, 0], C = [0, 0, 0];
  let nA = 0, nB = 0, nC = 0;
  const darkRows = [], lightRows = [], thinRows = [];
  let whiteRows = 0, rowsN = 0;
  for (let t = t0; t <= t1; t += tStep) {
    let la = 0, lb = 0, ca = 0, cb = 0;
    for (let u = sideIn; u <= sideOut; u++) {
      const a = at(t, -u), b = at(t, u);
      for (let k = 0; k < 3; k++) { A[k] += a[k]; B[k] += b[k]; }
      la += lum(a); lb += lum(b); ca++; cb++;
      nA++; nB++;
    }
    la /= ca; lb /= cb;
    /* Media de la franja central: una línea de cuadrícula de 1 px apenas la
       mueve; un muro de varios píxeles, sí */
    let sum = 0, cnt = 0, lo = Infinity;
    for (let u = -half; u <= half; u++) {
      const c = at(t, u);
      for (let k = 0; k < 3; k++) C[k] += c[k];
      nC++;
      const l = lum(c);
      sum += l; cnt++;
      if (l < lo) lo = l;
    }
    const mid = sum / cnt;
    darkRows.push(Math.min(la, lb) - mid);
    lightRows.push(mid - Math.max(la, lb));
    thinRows.push(Math.min(la, lb) - lo);
    if (mid >= 170 && mid - Math.max(la, lb) >= 25) whiteRows++;
    rowsN++;
  }
  for (let k = 0; k < 3; k++) { A[k] /= nA || 1; B[k] /= nB || 1; C[k] /= nC || 1; }

  /* Grosor de lo que hay encima del borde: en el corte medio, cuántos
     píxeles seguidos alrededor del centro no se parecen a ninguno de los
     dos lados. Una línea de cuadrícula da 1 o 2; un muro, más; una puerta
     dibujada como un bloque, todavía más. */
  const prof = [];
  for (let u = -sideIn; u <= sideIn; u++) {
    let s = 0, c = 0;
    for (let t = t0; t <= t1; t += tStep) { s += lum(at(t, u)); c++; }
    prof.push(s / c);
  }
  const la = lum(A), lb = lum(B), tol = Math.max(18, Math.abs(la - lb) * 0.25);
  const off = v => Math.abs(v - la) > tol && Math.abs(v - lb) > tol;
  let thick = 0;
  const mid0 = sideIn;
  if (off(prof[mid0]) || off(prof[mid0 - 1] ?? prof[mid0]) || off(prof[mid0 + 1] ?? prof[mid0])) {
    let lo = mid0, hi = mid0;
    while (lo > 0 && off(prof[lo - 1])) lo--;
    while (hi < prof.length - 1 && off(prof[hi + 1])) hi++;
    thick = (hi - lo + 1) / cross;
  }
  return {
    a: A, b: B, c: C, thick,
    /* Qué parte del borde lleva encima algo claro (una puerta dibujada como
       bloque blanco suele ocupar solo un trozo) */
    white: rowsN ? whiteRows / rowsN : 0,
    /* La mediana a lo largo del borde: un objeto que tape un trozo no basta */
    dark: median(darkRows),
    light: median(lightRows),
    /* Línea fina (la de la cuadrícula): lo más oscuro del centro */
    thin: median(thinRows),
    diff: dist3(A, B)
  };
}

/* Mide todos los bordes interiores del tablero.
   grid: { x, y, w, h, cols, rows } en píxeles de la imagen (como imgGrid). */
export function measureWalls(data, W, H, grid, channels = 4) {
  const px = reader(data, W, H, channels);
  const { cols, rows } = grid;
  const X = c => grid.x + c * grid.w, Y = r => grid.y + r * grid.h;
  const inside = (cx, cy) => X(cx) >= -grid.w * 0.5 && X(cx + 1) <= W + grid.w * 0.5
    && Y(cy) >= -grid.h * 0.5 && Y(cy + 1) <= H + grid.h * 0.5;

  /* Casillas: color medio del centro, y lo mismo que se mide en un borde
     pero por la mitad de la casilla, donde no pasa ninguna línea de la
     cuadrícula (sirve para saber si las líneas de los bordes son cuadrícula
     o textura que está en todas partes) */
  const step = Math.max(1, Math.round(Math.min(grid.w, grid.h) / 10));
  const cells = [], midThin = [];
  for (let cy = 0; cy < rows; cy++)
    for (let cx = 0; cx < cols; cx++) {
      if (!inside(cx, cy)) { cells.push(null); midThin.push(null); continue; }
      cells.push(meanColor(px, X(cx) + grid.w * 0.25, Y(cy) + grid.h * 0.25, X(cx) + grid.w * 0.75, Y(cy) + grid.h * 0.75, step));
      const v = measureEdge(px, "v", X(cx) + grid.w / 2, Y(cy), grid.h, grid.w).thin;
      const h = measureEdge(px, "h", X(cx), Y(cy) + grid.h / 2, grid.w, grid.h).thin;
      midThin.push((v + h) / 2);
    }

  /* Diagonales: cada casilla se parte con sus dos diagonales en cuatro
     triángulos (arriba, derecha, abajo, izquierda) y se mide su color, y
     lo que hay justo encima de cada diagonal. Así se sabe si una casilla está
     medio en el suelo y medio fuera, cortada en diagonal. */
  const tri = [], diag = [], strip = [], bright = [];
  const sN = 12;
  for (let cy = 0; cy < rows; cy++)
    for (let cx = 0; cx < cols; cx++) {
      if (!cells[cy * cols + cx]) { tri.push(null); diag.push(null); strip.push(null); bright.push(null); continue; }
      const T = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
      /* Franjas pegadas a cada diagonal, a un lado y a otro (cerca del
         centro de la casilla): a = [arriba-izda, abajo-dcha], d = [arriba-dcha, abajo-izda] */
      const S = { a: [[0, 0, 0, 0], [0, 0, 0, 0]], d: [[0, 0, 0, 0], [0, 0, 0, 0]] };
      const lums = [];
      for (let j = 0; j < sN; j++)
        for (let i = 0; i < sN; i++) {
          const u = (i + 0.5) / sN, v = (j + 0.5) / sN;            // 0…1 dentro de la casilla
          if (u < 0.1 || u > 0.9 || v < 0.1 || v > 0.9) continue;  // lejos de los bordes (cuadrícula)
          const d1 = v - u, d2 = u + v - 1;                          // distancia a \ y a /
          const c0 = px(X(cx) + u * grid.w, Y(cy) + v * grid.h);
          lums.push(lum(c0));
          for (const [type, d] of [["a", d2], ["d", d1]]) {
            const ad = Math.abs(d);
            if (ad < 0.1 || ad > 0.32) continue;
            const t = S[type][d < 0 ? 0 : 1];
            for (let k = 0; k < 3; k++) t[k] += c0[k];
            t[3]++;
          }
          if (Math.abs(d1) < 0.12 || Math.abs(d2) < 0.12) continue; // lejos de las diagonales
          const q = d1 < 0 ? (d2 < 0 ? 0 : 1) : (d2 < 0 ? 3 : 2);   // 0 arriba, 1 dcha, 2 abajo, 3 izda
          for (let k = 0; k < 3; k++) T[q][k] += c0[k];
          T[q][3]++;
        }
      lums.sort((p, q) => p - q);
      bright.push(lums.length ? lums[Math.floor(lums.length * 0.85)] : 0);
      const mean4 = t => [t[0] / (t[3] || 1), t[1] / (t[3] || 1), t[2] / (t[3] || 1)];
      tri.push(T.map(mean4));
      strip.push({ a: S.a.map(mean4), d: S.d.map(mean4) });
      /* Brillo a lo largo de cada diagonal (del 15 al 85 %) */
      const along = which => {
        let s = 0, c = 0;
        for (let k = 0; k <= 16; k++) {
          const t = 0.15 + 0.7 * k / 16;
          const u = which === "d" ? t : 1 - t, v = t;
          s += lum(px(X(cx) + u * grid.w, Y(cy) + v * grid.h)); c++;
        }
        return s / c;
      };
      diag.push({ d: along("d"), a: along("a") });
    }

  const edges = [];
  for (let cy = 0; cy < rows; cy++)
    for (let cx = 1; cx < cols; cx++) {
      if (!inside(cx - 1, cy) || !inside(cx, cy)) continue;
      edges.push({ key: `${cx},${cy},v`, dir: "v", cx, cy, ...measureEdge(px, "v", X(cx), Y(cy), grid.h, grid.w) });
    }
  for (let cy = 1; cy < rows; cy++)
    for (let cx = 0; cx < cols; cx++) {
      if (!inside(cx, cy - 1) || !inside(cx, cy)) continue;
      edges.push({ key: `${cx},${cy},h`, dir: "h", cx, cy, ...measureEdge(px, "h", X(cx), Y(cy), grid.w, grid.h) });
    }
  return { cols, rows, cellPx: Math.min(grid.w, grid.h), cells, midThin, tri, diag, strip, bright, edges };
}

/* Umbral de Otsu: el corte que mejor separa dos grupos de valores.
   Devuelve también cuánto se separan (0: nada, 1: dos grupos limpios). */
function otsu(values) {
  const v = Float64Array.from(values).sort();
  const n = v.length;
  if (n < 8) return { thr: -Infinity, sep: 0 };
  const total = v.reduce((a, b) => a + b, 0), mean = total / n;
  const varT = v.reduce((a, b) => a + (b - mean) ** 2, 0) / n || 1e-9;
  let best = { thr: -Infinity, sep: 0 }, left = 0;
  for (let i = 0; i < n - 1; i++) {
    left += v[i];
    if (v[i] === v[i + 1]) continue;
    const w0 = (i + 1) / n, w1 = 1 - w0;
    const m0 = left / (i + 1), m1 = (total - left) / (n - i - 1);
    const sep = (w0 * w1 * (m0 - m1) ** 2) / varT;
    if (sep > best.sep) best = { thr: (v[i] + v[i + 1]) / 2, sep, low: m0, high: m1 };
  }
  return best;
}

/* De las medidas a una propuesta de muros y puertas.
   sensitivity 0…1: más alto, más muros (umbrales más bajos). Se puede
   recalcular al mover el control sin volver a medir la imagen. */
function ruleWalls(m, { sensitivity = 0.5 } = {}) {
  const { cols, rows, edges } = m;
  const f = 1.6 - 1.2 * clamp(sensitivity, 0, 1);
  const n = cols * rows;
  const side = e => e.dir === "v"
    ? [e.cy * cols + e.cx - 1, e.cy * cols + e.cx]
    : [(e.cy - 1) * cols + e.cx, e.cy * cols + e.cx];
  const line = e => Math.max(e.dark, e.light);

  /* 1. Suelo. En los planos de batalla la cuadrícula se pinta sobre el suelo
     y apenas se ve en la roca, el agua o el vacío. Cada casilla puntúa por
     lo marcadas que están las líneas finas de sus bordes menos lo que hay
     por su mitad (un rayado o unos escombros tienen líneas en todas partes,
     el suelo solo en el borde); si los valores se parten en dos grupos
     claros, el de arriba es suelo. Si no (una ciudad, un plano sin roca),
     todo cuenta como suelo. */
  const perCell = Array.from({ length: n }, () => []);
  for (const e of edges) for (const i of side(e)) perCell[i].push(e.thin);
  const lowMed = v => { const s = [...v].sort((a, b) => a - b); return (s[Math.floor((s.length - 1) / 2)] + s[Math.floor(s.length / 2)]) / 2; };
  const gridness = perCell.map((v, i) => (v.length && m.midThin[i] !== null ? lowMed(v) - m.midThin[i] : null));
  /* Las casillas sin ningún rastro de línea en el borde (≤ 0) no son suelo
     seguro y no cuentan para buscar el corte */
  const known = gridness.filter(v => v !== null && v > 0).map(v => Math.log(1 + v));
  const split = otsu(known);
  const useMask = split.sep >= 0.5;
  const score = gridness.map(v => (v === null ? null : Math.log(1 + Math.max(0, v))));
  const neighbors4 = i => {
    const cx = i % cols, cy = Math.floor(i / cols), out = [];
    if (cx > 0) out.push(i - 1);
    if (cx < cols - 1) out.push(i + 1);
    if (cy > 0) out.push(i - cols);
    if (cy < rows - 1) out.push(i + cols);
    return out;
  };

  /* 2. Lo que hay en cada borde: algo dibujado encima (más que una línea de
     cuadrícula normal entre dos suelos) o dos lados que no se parecen */
  const rough = score.map(v => v !== null && (!useMask || v >= split.thr));
  /* Una franja que no se parece en color a ninguno de los dos lados
     (escombros, sillares, madera) también es algo dibujado encima, aunque
     su brillo medio sea como el del suelo */
  for (const e of edges) e.band = Math.min(dist3(e.c, e.a), dist3(e.c, e.b));
  const plainEdges = edges.filter(e => side(e).every(i => rough[i]) && e.diff < 30);
  const base = plainEdges.length ? median(plainEdges.map(line)) : 0;
  const baseBand = plainEdges.length ? median(plainEdges.map(e => e.band)) : 0;
  const tLine = Math.max(16, base + 14) * f;
  const tBand = Math.max(24, baseBand + 18) * f;
  const tDiff = f * Math.max(45, 2.2 * median(edges.map(e => e.diff)));
  const between = new Map();
  for (const e of edges) {
    e.isLine = line(e) >= tLine || e.band >= tBand;
    e.isDiff = e.diff >= tDiff;
    const [a, b] = side(e);
    between.set(a < b ? a + "," + b : b + "," + a, e);
  }
  const edgeBetween = (a, b) => between.get(a < b ? a + "," + b : b + "," + a);

  /* El suelo crece desde las casillas donde la cuadrícula se ve con toda
     claridad hacia las vecinas que pasan el corte, pero nunca a través de
     un borde con un muro dibujado o un cambio brusco: así no se cuela en la
     roca ni en los rayados de alrededor. */
  let floor = rough;
  const seed = split.thr + SEED * ((split.high ?? split.thr) - split.thr);
  if (useMask) {
    floor = new Array(n).fill(false);
    const stack = [];
    for (let i = 0; i < n; i++) if (score[i] !== null && score[i] >= seed) { floor[i] = true; stack.push(i); }
    while (stack.length) {
      const i = stack.pop();
      for (const j of neighbors4(i)) {
        if (floor[j] || score[j] === null || score[j] < split.thr) continue;
        const e = edgeBetween(i, j);
        if (e && (e.isLine || e.isDiff)) continue;
        floor[j] = true;
        stack.push(j);
      }
    }
  }

  /* Limpieza: huecos pequeños de «no suelo» rodeados de suelo (una mesa, un
     barril) son suelo; islas pequeñas de «suelo» en la roca (grietas,
     rayados) no lo son. */
  const flipSmall = (want, maxSize, needEnclosed) => {
    const seen = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      if (seen[i] || floor[i] !== want || gridness[i] === null) continue;
      const comp = [i], stack = [i];
      seen[i] = 1;
      let touchesEdge = false;
      while (stack.length) {
        const j = stack.pop(), cx = j % cols, cy = Math.floor(j / cols);
        if (cx === 0 || cy === 0 || cx === cols - 1 || cy === rows - 1 || gridness[j] === null) touchesEdge = true;
        for (const k of neighbors4(j)) if (!seen[k] && floor[k] === want && gridness[k] !== null) {
          seen[k] = 1; comp.push(k); stack.push(k);
        }
      }
      if (comp.length <= maxSize && (!needEnclosed || !touchesEdge)) for (const j of comp) floor[j] = !want;
    }
  };
  if (useMask) {
    flipSmall(false, 4, true);
    flipSmall(true, 8, false);
  }

  /* ¿La máscara dibuja salas o manchas? Se compara cuántas casillas vecinas
     coinciden con lo que coincidirían al azar (kappa de Cohen). Con la
     cuadrícula muy tenue (una ciudad de noche) sale a manchas y es mejor no
     usarla: entonces todo es suelo y solo cuentan las líneas de muro. */
  let coherence = 0;
  if (useMask) {
    let same = 0, pairs = 0, on = 0, all = 0;
    for (let i = 0; i < n; i++) {
      if (gridness[i] === null) continue;
      all++; if (floor[i]) on++;
      const cx = i % cols;
      for (const j of [cx < cols - 1 ? i + 1 : -1, i + cols < n ? i + cols : -1]) {
        if (j < 0 || gridness[j] === null) continue;
        pairs++; if (floor[i] === floor[j]) same++;
      }
    }
    const p = on / (all || 1), chance = p * p + (1 - p) * (1 - p);
    coherence = pairs && chance < 1 ? (same / pairs - chance) / (1 - chance) : 0;
    if (coherence < MIN_COHERENCE) floor = gridness.map(v => v !== null);
  }
  const masked = useMask && coherence >= MIN_COHERENCE;

  /* Nada de muros en mitad de una sala: una isla de «no suelo» rodeada de
     suelo suele ser un mueble, una alfombra, una fuente o un estanque. Se
     rellena, salvo que tenga el mismo aspecto que las paredes del contorno
     de las salas (un bloque de muro de verdad, un pilar grueso). */
  if (masked) {
    const comps = [], compOf = new Int32Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      if (floor[i] || gridness[i] === null || compOf[i] >= 0) continue;
      const comp = { cells: [i], open: false };
      compOf[i] = comps.length;
      for (let k = 0; k < comp.cells.length; k++) {
        const j = comp.cells[k], cx = j % cols, cy = Math.floor(j / cols);
        if (cx === 0 || cy === 0 || cx === cols - 1 || cy === rows - 1) comp.open = true;
        for (const q of neighbors4(j)) {
          if (gridness[q] === null) comp.open = true;
          else if (!floor[q] && compOf[q] < 0) { compOf[q] = comps.length; comp.cells.push(q); }
        }
      }
      comps.push(comp);
    }
    /* Aspecto de pared: lo que no es suelo y toca suelo, en las zonas abiertas */
    const rimCells = [];
    for (const c of comps) if (c.open || c.cells.length > 40)
      for (const j of c.cells) if (m.cells[j] && neighbors4(j).some(q => floor[q])) rimCells.push(m.cells[j]);
    if (rimCells.length >= 5) {
      const wallLook = [0, 1, 2].map(k => median(rimCells.map(c => c[k])));
      const tLook = Math.max(40, 60 * f);
      for (const c of comps) {
        if (c.open || c.cells.length > 40) continue;
        const cs = c.cells.filter(j => m.cells[j]).map(j => m.cells[j]);
        if (!cs.length) continue;
        const look = [0, 1, 2].map(k => cs.reduce((a, x) => a + x[k], 0) / cs.length);
        if (dist3(look, wallLook) >= tLook) for (const j of c.cells) floor[j] = true;
      }
    }
  }

  /* Formas sencillas: las salas suelen ser rectángulos o figuras simples.
     Una muesca de una casilla en el borde de una sala (un mueble pegado a
     la pared, una sombra) se rellena; un pico de suelo que sale solo hacia
     la roca, con la cuadrícula floja, se quita. */
  if (masked) for (let pass = 0; pass < 2; pass++) {
    const next = floor.slice();
    for (let i = 0; i < n; i++) {
      if (gridness[i] === null) continue;
      const k = neighbors4(i).filter(j => floor[j]).length;
      if (!floor[i] && k >= 3) next[i] = true;
      else if (floor[i] && k <= 1 && score[i] < seed) next[i] = false;
    }
    floor = next;
  }

  /* Cada borde: dentro del suelo, en su borde o fuera */
  const byKey = new Map(edges.map(e => [e.key, e]));
  for (const e of edges) {
    const [a, b] = side(e);
    e.kind = floor[a] && floor[b] ? "in" : floor[a] || floor[b] ? "rim" : "out";
  }
  const along = (e, step) => byKey.get(e.dir === "v" ? `${e.cx},${e.cy + step},v` : `${e.cx + step},${e.cy},h`);
  const ends = key => {
    const [x, y, dir] = key.split(","), cx = +x, cy = +y;
    if (dir === "v") return [`${cx},${cy}`, `${cx},${cy + 1}`];
    if (dir === "h") return [`${cx},${cy}`, `${cx + 1},${cy}`];
    if (dir === "d") return [`${cx},${cy}`, `${cx + 1},${cy + 1}`];
    return [`${cx + 1},${cy}`, `${cx},${cy + 1}`];               // "a"
  };
  const cellEdges = i => {
    const cx = i % cols, cy = Math.floor(i / cols);
    return [`${cx},${cy},h`, `${cx + 1},${cy},v`, `${cx},${cy + 1},h`, `${cx},${cy},v`];   // arriba, dcha, abajo, izda
  };
  const neighborAt = (i, q) => {
    const cx = i % cols, cy = Math.floor(i / cols);
    if (q === 0) return cy > 0 ? i - cols : -1;
    if (q === 1) return cx < cols - 1 ? i + 1 : -1;
    if (q === 2) return cy < rows - 1 ? i + cols : -1;
    return cx > 0 ? i - 1 : -1;
  };
  const avg = cs => [0, 1, 2].map(k => cs.reduce((s, c) => s + c[k], 0) / cs.length);

  const out = new Map();
  /* 3. Borde del suelo: suelo a un lado y roca, agua o vacío al otro. No
     hace falta más prueba: por ahí no se pasa. Sin máscara (todo es suelo)
     no hay bordes de este tipo. */
  for (const e of edges) if (e.kind === "rim") out.set(e.key, "wall");

  /* 4. Diagonales. Un borde de suelo en escalera suele ser una pared en
     diagonal (una sala redonda, un hexágono, una cueva). Si la casilla del
     escalón está partida en la imagen por su diagonal (una mitad como el
     suelo de al lado y la otra como lo de fuera, o una línea dibujada
     encima de la diagonal), el escalón se cambia por un muro en diagonal.
     La esquina de una sala cuadrada no se toca: allí la casilla entera es
     suelo. */
  const HALVES = { a: [[0, 3], [1, 2]], d: [[0, 1], [2, 3]] };   // a (/): arriba+izda | dcha+abajo; d (\): arriba+dcha | abajo+izda
  const diagLine = (i, type, hA, hB) => {
    const L = m.diag[i][type], la = lum(hA), lb = lum(hB);
    return Math.max(Math.min(la, lb) - L, L - Math.max(la, lb));
  };
  const diagonals = [];
  if (masked && m.tri) for (let i = 0; i < n; i++) {
    if (!m.tri[i]) continue;
    for (const type of ["a", "d"]) {
      for (const [H, O] of [HALVES[type], [...HALVES[type]].reverse()]) {
        const nbH = H.map(q => neighborAt(i, q)), nbO = O.map(q => neighborAt(i, q));
        if (nbH.some(j => j < 0 || !floor[j] || !m.cells[j])) continue;
        if (nbO.some(j => j >= 0 && floor[j])) continue;
        const hH = avg(H.map(q => m.tri[i][q])), hO = avg(O.map(q => m.tri[i][q]));
        const refF = avg(nbH.map(j => m.cells[j]));
        const others = nbO.filter(j => j >= 0 && m.cells[j]).map(j => m.cells[j]);
        const refN = others.length ? avg(others) : hO;
        /* Qué parte de cada triángulo es suelo: su color medio se explica
           como mezcla del color del suelo de al lado y del de fuera */
        const span = dist3(refF, refN);
        let fit = null;
        if (span >= 0.4 * tDiff) {
          const frac = c => clamp(((c[0] - refN[0]) * (refF[0] - refN[0]) + (c[1] - refN[1]) * (refF[1] - refN[1])
            + (c[2] - refN[2]) * (refF[2] - refN[2])) / (span * span), 0, 1);
          const fq = m.tri[i].map(frac);
          const errDiag = H.reduce((e, q) => e + 1 - fq[q], 0) + O.reduce((e, q) => e + fq[q], 0);
          const total = fq.reduce((a, b) => a + b, 0);
          /* Junto a la diagonal, cerca del centro: el lado de fuera tiene que
             ser ya de fuera (si es suelo, es un muro grueso en la esquina) */
          const sides = m.strip[i][type];
          const hSide = H.includes(0) && (type === "d" ? H.includes(1) : H.includes(3)) ? 0 : 1;
          const nearH = frac(sides[hSide]), nearO = frac(sides[1 - hSide]);
          fit = { errDiag, errBest: Math.min(total, 4 - total), clean: nearO <= 0.35 && nearH >= 0.65 };
        }
        const cut = fit && fit.clean && fit.errDiag <= 0.8 && fit.errDiag < fit.errBest - 0.6;
        const drawn = diagLine(i, type, hH, hO) >= tLine && dist3(hH, hO) >= 0.25 * tDiff;
        /* Suelta solo se cree si la casilla tiene resolución de sobra: en
           casillas pequeñas la esquina de un muro grueso ya parece redonda */
        const sharp = (m.cellPx || 0) >= 20;
        if (cut || drawn) diagonals.push({ i, type, drawn, strong: sharp && ((fit && fit.errDiag <= 0.4) || drawn) });
      }
    }
  }
  /* Una pared en diagonal de verdad cruza al menos dos casillas seguidas, o
     parte la casilla limpiamente (o con una línea dibujada encima). Una
     casilla suelta partida a medias es la esquina de una sala cuadrada con
     el muro metido dentro, y se queda como está. */
  const isCand = new Set(diagonals.map(d => d.i + d.type));
  const chained = diagonals.filter(({ i, type }) => {
    const x = i % cols, y = Math.floor(i / cols), dx = type === "d" ? 1 : -1;
    const nbs = [[x + dx, y + 1], [x - dx, y - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < cols && b < rows);
    return nbs.some(([a, b]) => isCand.has(b * cols + a + type)) || diagonals.find(d => d.i === i && d.type === type).strong;
  });
  for (const { i, type } of chained) {
    for (const k of cellEdges(i)) if (out.get(k) === "wall") out.delete(k);
    const cx = i % cols, cy = Math.floor(i / cols);
    out.set(`${cx},${cy},${type}`, "wall");
  }

  /* Diagonales dibujadas como línea (tabiques en diagonal, también en
     planos sin máscara de suelo): al menos 3 casillas seguidas en la misma
     diagonal con una línea encima, y enganchadas a otros muros por los dos
     extremos (una línea suelta cruzando una sala es luz o dibujo) */
  const touching = new Set();
  for (const k of out.keys()) for (const v of ends(k)) touching.add(v);
  if (m.tri) for (const type of ["a", "d"]) {
    const dx = type === "d" ? 1 : -1;
    const marked = i => {
      if (!m.tri[i]) return false;
      const [A, B] = HALVES[type];
      return diagLine(i, type, avg(A.map(q => m.tri[i][q])), avg(B.map(q => m.tri[i][q]))) >= tLine * 1.2;
    };
    const seen = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      if (seen[i] || !marked(i)) continue;
      /* Ir al principio de la cadena */
      let x = i % cols, y = Math.floor(i / cols);
      while (x - dx >= 0 && x - dx < cols && y > 0 && marked((y - 1) * cols + x - dx)) { x -= dx; y--; }
      const chain = [];
      while (x >= 0 && x < cols && y < rows && marked(y * cols + x)) { chain.push(y * cols + x); seen[y * cols + x] = 1; x += dx; y++; }
      if (chain.length < 3) continue;
      const keyOf = j => `${j % cols},${Math.floor(j / cols)},${type}`;
      const first = ends(keyOf(chain[0])), last = ends(keyOf(chain[chain.length - 1]));
      const hooked = first.some(v => touching.has(v)) && last.some(v => touching.has(v));
      if (hooked) for (const j of chain) out.set(keyOf(j), "wall");
    }
  }

  /* 5. Tabiques: una línea dibujada entre dos suelos. Los muros son largos y
     rectos, y casi siempre van de pared a pared: un tramo suelto en mitad de
     una sala suele ser una mesa, una alfombra o una sombra. Se aceptan los
     tramos de al menos 3 bordes enganchados a otro muro por un extremo (o
     por los dos), y los sueltos solo si son muy largos. */
  const inner = e => e && e.kind === "in" && e.isLine;
  const runs = [];
  for (const e of edges) {
    if (!inner(e) || inner(along(e, -1))) continue;   // solo desde el principio de cada tramo
    const run = [e];
    for (let nx = along(e, 1); inner(nx); nx = along(nx, 1)) run.push(nx);
    runs.push(run);
  }
  const degree = new Map();
  const addDegree = k => { for (const v of ends(k)) degree.set(v, (degree.get(v) || 0) + 1); };
  for (const k of out.keys()) addDegree(k);
  const runEnds = run => [ends(run[0].key)[0], ends(run[run.length - 1].key)[1]];
  const accepted = new Set();
  for (let changed = true; changed;) {
    changed = false;
    for (const run of runs) {
      if (run.length < 3 || accepted.has(run)) continue;
      const [s0, s1] = runEnds(run);
      const hooked = (degree.get(s0) ? 1 : 0) + (degree.get(s1) ? 1 : 0);
      if (hooked >= 1 || run.length >= 8) {
        accepted.add(run);
        for (const r of run) { out.set(r.key, "wall"); addDegree(r.key); }
        changed = true;
      }
    }
  }

  /* 6. Puertas. En los planos se dibujan como un bloque claro (blanco), o
     como un trozo de muro más grueso o distinto del de alrededor. */
  const wallKeys = [...out.keys()].filter(k => byKey.has(k));
  const wallColor = [0, 1, 2].map(k => median(wallKeys.map(key => byKey.get(key).c[k])));
  const innerThick = [...accepted].flat().map(e => e.thick).filter(t => t > 0);
  const typicalThick = innerThick.length >= 5 ? median(innerThick) : median(wallKeys.map(k => byKey.get(k).thick).filter(t => t > 0));
  const tColor = Math.max(40, 60 * f);
  const doorLike = (e, flank) => {
    const white = e.white >= 0.35 || (e.light >= tLine && lum(e.c) >= 190);
    const thicker = e.thick >= Math.max(0.3, (typicalThick || 0) * 1.6)
      && flank.every(x => e.thick >= x.thick * 1.4);
    const other = dist3(e.c, wallColor) >= tColor && flank.every(x => dist3(e.c, x.c) >= tColor);
    return white || thicker || other;
  };

  /* Tramos cortos (1 o 2 bordes) enganchados a muros por los dos extremos:
     puerta si lo parece; si no, un trozo de tabique que cierra el hueco */
  for (const run of runs) {
    if (run.length > 2) continue;
    const [s0, s1] = runEnds(run);
    if (!degree.get(s0) || !degree.get(s1)) continue;
    const flank = [along(run[0], -1), along(run[run.length - 1], 1)].filter(x => x && out.has(x.key));
    if (flank.length) {
      /* En la línea de un muro: hueco cerrado por una puerta o por un trozo de muro */
      const door = run.every(e => doorLike(e, flank));
      for (const r of run) out.set(r.key, door ? "door" : "wall");
    } else if (run.every(e => e.white >= 0.35 || line(e) >= 2 * tLine
      || e.thick >= Math.max(0.3, (typicalThick || 0) * 1.6))) {
      /* Cruzando un pasillo de pared a pared: solo si se ve claramente una
         puerta (bloque claro, o algo grueso y marcado). Una línea floja de
         lado a lado de un pasillo es la cuadrícula o una sombra. */
      for (const r of run) out.set(r.key, "door");
    }
  }

  /* Dentro de un tabique largo: uno o dos bordes seguidos que destacan sobre
     sus vecinos de tramo (más de dos seguidos ya es otro tipo de muro) */
  for (const run of accepted) {
    const mark = run.map((e, i) => doorLike(e, [run[i - 1], run[i + 1]].filter(Boolean)));
    for (let i = 0; i < run.length;) {
      if (!mark[i]) { i++; continue; }
      let j = i;
      while (j < run.length && mark[j]) j++;
      if (j - i <= 2) for (let k = i; k < j; k++) out.set(run[k].key, "door");
      i = j;
    }
  }

  /* Puertas que ocupan una casilla: muros gruesos de una casilla de ancho
     (una franja de escombros o de sillares) con una casilla distinta en
     medio, suelo a los dos lados y la franja siguiendo por los otros dos.
     La puerta se pone en un lado y el otro queda abierto. */
  if (masked) {
    const cellAt = (x, y) => (x >= 0 && y >= 0 && x < cols && y < rows ? y * cols + x : -1);
    for (let i = 0; i < n; i++) {
      if (floor[i] || !m.cells[i]) continue;
      const x = i % cols, y = Math.floor(i / cols);
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const a = cellAt(x - dx, y - dy), b = cellAt(x + dx, y + dy);       // lados de paso
        const p = cellAt(x - dy, y - dx), q = cellAt(x + dy, y + dx);       // la franja
        if (a < 0 || b < 0 || p < 0 || q < 0 || !floor[a] || !floor[b] || floor[p] || floor[q]) continue;
        if (!m.cells[p] || !m.cells[q]) continue;
        const c = m.cells[i];
        const odd = (dist3(c, m.cells[p]) >= tColor && dist3(c, m.cells[q]) >= tColor)
          || (lum(c) >= 190 && lum(c) - Math.max(lum(m.cells[p]), lum(m.cells[q])) >= 30);
        if (!odd) continue;
        const ea = edgeBetween(a, i), eb = edgeBetween(i, b);
        if (!ea || !eb) continue;
        out.set(ea.key, "door");
        out.delete(eb.key);
      }
    }
  }

  /* 7. Trozos sueltos: grupos de menos de 3 muros sin tocar nada más */
  const vertexEdges = new Map();
  for (const k of out.keys()) for (const v of ends(k)) {
    if (!vertexEdges.has(v)) vertexEdges.set(v, []);
    vertexEdges.get(v).push(k);
  }
  const visited = new Set();
  for (const k of [...out.keys()]) {
    if (visited.has(k)) continue;
    const comp = [k], stack = [k];
    visited.add(k);
    while (stack.length) {
      const cur = stack.pop();
      for (const v of ends(cur)) for (const o of vertexEdges.get(v)) {
        if (!visited.has(o)) { visited.add(o); comp.push(o); stack.push(o); }
      }
    }
    if (comp.length < 3) for (const c of comp) out.delete(c);
  }

  const result = Object.fromEntries(out);
  const walls = [...out.values()].filter(t => t === "wall").length;
  const diag = [...out.keys()].filter(k => /,(d|a)$/.test(k)).length;
  return {
    edges: result, floor, score,
    stats: { walls, doors: out.size - walls, diagonals: diag, floorMask: masked, coherence: +coherence.toFixed(2), split: +split.sep.toFixed(2), tLine: +tLine.toFixed(1), tDiff: +tDiff.toFixed(1) }
  };
}

/* ---------- Muros aprendidos de planos marcados a mano ----------

   Regresión logística sobre cada borde, entrenada con cinco planos en los
   que se marcaron a mano muros, diagonales y puertas. Todos los rasgos van
   en percentil dentro del propio plano (0…1), para que no dependan del
   estilo ni del brillo de cada mapa:

   dark, light, thin, diff, thick, white, band   medidas del corte del borde
   cmin, cmax       brillo de la franja frente al más oscuro / claro de los lados
   lsd              diferencia de brillo entre los dos lados
   smin, smax       cuánto se ve la cuadrícula en las dos casillas
   rim, inn         borde del suelo (un lado suelo) o dentro del suelo
   ev               lo más marcado de dark, light y band
   n1lo/hi, n2lo/hi ev de los vecinos en la misma línea (a 1 y a 2 casillas)
   n1rim…, n2rim…   lo mismo con rim

   rule             si las reglas (ruleWalls) ponen muro en ese borde

   Evaluado dejando cada plano fuera del entrenamiento (ver classifyWalls). */
const MODEL = {
  bias: -5.7926,
  w: {
    band: 0.6559,
    cmax: 3.9426,
    cmin: -1.592,
    dark: -2.0265,
    diff: 0.6532,
    ev: 0.8738,
    inn: -0.687,
    light: -1.9589,
    lsd: 1.542,
    n1hi: 1.7146,
    n1lo: 0.0173,
    n1rimhi: 0.5096,
    n1rimlo: 0.0891,
    n2hi: 1.2968,
    n2lo: 0.2338,
    n2rimhi: 0.1974,
    n2rimlo: 0.1394,
    rim: -0.7636,
    rule: 1.0644,
    smax: -0.9362,
    smin: -1.2162,
    thick: 0.4728,
    thin: 4.2665,
    white: 0.3053
  }
};

/* Percentil de cada valor dentro de la lista (empates: rango medio), 0…1 */
function percentile(values) {
  const n = values.length, idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => values[a] - values[b]);
  const out = new Float64Array(n);
  for (let i = 0; i < n;) {
    let j = i;
    while (j + 1 < n && values[idx[j + 1]] === values[idx[i]]) j++;
    const r = (i + j) / 2 / Math.max(1, n - 1);
    for (let k = i; k <= j; k++) out[idx[k]] = r;
    i = j + 1;
  }
  return out;
}

/* Probabilidad de muro de cada borde */
export function wallProbabilities(m, floor, score, model = MODEL, ruleEdges = {}) {
  const { cols, edges } = m;
  const n = edges.length;
  const side = e => e.dir === "v"
    ? [e.cy * cols + e.cx - 1, e.cy * cols + e.cx]
    : [(e.cy - 1) * cols + e.cx, e.cy * cols + e.cx];
  const P = {};
  for (const f of ["dark", "light", "thin", "diff", "thick", "white", "band"]) P[f] = percentile(edges.map(e => e[f]));
  const la = edges.map(e => lum(e.a)), lb = edges.map(e => lum(e.b)), lc = edges.map(e => lum(e.c));
  P.cmin = percentile(lc.map((c, i) => c - Math.min(la[i], lb[i])));
  P.cmax = percentile(lc.map((c, i) => c - Math.max(la[i], lb[i])));
  P.lsd = percentile(la.map((a, i) => Math.abs(a - lb[i])));
  const sides = edges.map(side);
  const sv = i => (score[i] === null || score[i] === undefined ? -1 : score[i]);
  const both = percentile([...sides.map(s => sv(s[0])), ...sides.map(s => sv(s[1]))]);
  P.smin = new Float64Array(n); P.smax = new Float64Array(n); P.rim = new Float64Array(n); P.inn = new Float64Array(n); P.ev = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    P.smin[i] = Math.min(both[i], both[n + i]); P.smax[i] = Math.max(both[i], both[n + i]);
    const fa = floor[sides[i][0]] ? 1 : 0, fb = floor[sides[i][1]] ? 1 : 0;
    P.rim[i] = fa !== fb ? 1 : 0; P.inn[i] = fa + fb === 2 ? 1 : 0;
    P.ev[i] = Math.max(P.dark[i], P.light[i], P.band[i]);
  }
  P.rule = Float64Array.from(edges, e => (ruleEdges[e.key] ? 1 : 0));
  const index = new Map(edges.map((e, i) => [e.key, i]));
  const nb = (e, s) => index.get(e.dir === "v" ? `${e.cx},${e.cy + s},v` : `${e.cx + s},${e.cy},h`);
  for (const [name, steps] of [["n1", [-1, 1]], ["n2", [-2, 2]]]) {
    P[name + "lo"] = new Float64Array(n); P[name + "hi"] = new Float64Array(n);
    P[name + "rimlo"] = new Float64Array(n); P[name + "rimhi"] = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const js = steps.map(s => nb(edges[i], s));
      const ev = js.map(j => (j === undefined ? 0 : P.ev[j])), rim = js.map(j => (j === undefined ? 0 : P.rim[j]));
      P[name + "lo"][i] = Math.min(...ev); P[name + "hi"][i] = Math.max(...ev);
      P[name + "rimlo"][i] = Math.min(...rim); P[name + "rimhi"][i] = Math.max(...rim);
    }
  }
  const prob = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let z = model.bias;
    for (const [f, w] of Object.entries(model.w)) z += w * P[f][i];
    prob[i] = 1 / (1 + Math.exp(-z));
  }
  return prob;
}

/* La propuesta: muros del modelo aprendido; diagonales y puertas, de las
   reglas (con tan pocas puertas de ejemplo, el modelo no las distingue de un
   plano a otro). La sensibilidad mueve el umbral del modelo. */
export function classifyWalls(m, { sensitivity = 0.5, model = MODEL } = {}) {
  const rules = ruleWalls(m, { sensitivity: 0.5 });
  const prob = wallProbabilities(m, rules.floor, rules.score, model, rules.edges);
  const thr = 0.75 - 0.5 * clamp(sensitivity, 0, 1);
  const out = new Map();
  const cols = m.cols;
  const isFloor = i => !!rules.floor[i];
  const inner = e => e.dir === "v"
    ? isFloor(e.cy * cols + e.cx - 1) && isFloor(e.cy * cols + e.cx)
    : isFloor((e.cy - 1) * cols + e.cx) && isFloor(e.cy * cols + e.cx);
  const byKey = new Map(m.edges.map((e, i) => [e.key, i]));
  const along = (e, s) => byKey.get(e.dir === "v" ? `${e.cx},${e.cy + s},v` : `${e.cx + s},${e.cy},h`);
  /* Bordes del suelo y fuera de él: lo que diga el modelo */
  /* Con máscara de suelo, las reglas aciertan bien el contorno de las salas:
     se parte de sus paredes y se añade lo que el modelo da como seguro. Sin
     máscara (todo cuenta como suelo, una ciudad) no se sabe qué está dentro
     de una sala y manda el modelo en todos los bordes. Así salió mejor en los
     cinco planos de prueba: F1 0,62 de media, frente a 0,46 de las reglas y
     0,61 del modelo solo (cada plano evaluado con un modelo que no lo vio). */
  const masked = !!rules.stats.floorMask;
  if (masked) {
    const thrAdd = Math.min(0.95, thr + 0.1);
    for (const [k, t] of Object.entries(rules.edges)) if (t === "wall" && !/,(d|a)$/.test(k)) out.set(k, "wall");
    const touchesFloor = e => e.dir === "v"
      ? isFloor(e.cy * cols + e.cx - 1) || isFloor(e.cy * cols + e.cx)
      : isFloor((e.cy - 1) * cols + e.cx) || isFloor(e.cy * cols + e.cx);
    m.edges.forEach((e, i) => {
      if (prob[i] < thrAdd || inner(e)) return;
      /* En plena roca (ningún lado es suelo) hace falta más seguridad */
      if (!touchesFloor(e) && prob[i] < Math.min(0.97, thr + 0.3)) return;
      out.set(e.key, "wall");
    });
  } else m.edges.forEach((e, i) => { if (prob[i] >= thr) out.set(e.key, "wall"); });

  /* Dentro de una sala casi nunca hay paredes: solo tabiques rectos de al
     menos 3 casillas enganchados a otra pared (o muy largos), y con más
     seguridad que en el borde */
  const hit = i => masked && i !== undefined && prob[i] >= thr + 0.1 && inner(m.edges[i]);
  const runs = [];
  m.edges.forEach((e, i) => {
    if (!hit(i) || hit(along(e, -1))) return;
    const run = [i];
    for (let j = along(e, 1); hit(j); j = along(m.edges[j], 1)) run.push(j);
    if (run.length >= 3) runs.push(run);
  });
  const vertsOf = key => {
    const [x, y, d] = key.split(","), cx = +x, cy = +y;
    return d === "v" ? [`${cx},${cy}`, `${cx},${cy + 1}`] : [`${cx},${cy}`, `${cx + 1},${cy}`];
  };
  /* Un tabique vale si uno de sus extremos toca una pared (un rectángulo
     suelto en mitad de la sala es una alfombra o una mesa), o si es muy largo */
  const touched = new Set();
  for (const k of out.keys()) for (const v of vertsOf(k)) touched.add(v);
  for (let changed = true; changed;) {
    changed = false;
    for (const run of runs) {
      if (run.taken) continue;
      const a = vertsOf(m.edges[run[0]].key)[0], b = vertsOf(m.edges[run[run.length - 1]].key)[1];
      if (!touched.has(a) && !touched.has(b) && run.length < 8) continue;
      run.taken = changed = true;
      for (const j of run) { out.set(m.edges[j].key, "wall"); for (const v of vertsOf(m.edges[j].key)) touched.add(v); }
    }
  }
  const cellOf = key => key.split(",").slice(0, 2).map(Number);
  for (const [k, t] of Object.entries(rules.edges)) {
    if (/,(d|a)$/.test(k)) {
      /* La diagonal sustituye al escalón recto de esa casilla */
      const [x, y] = cellOf(k);
      for (const q of [`${x},${y},h`, `${x + 1},${y},v`, `${x},${y + 1},h`, `${x},${y},v`]) out.delete(q);
      out.set(k, t);
    } else if (t === "door") out.set(k, "door");
  }
  const ends = key => {
    const [x, y, dir] = key.split(","), cx = +x, cy = +y;
    if (dir === "v") return [`${cx},${cy}`, `${cx},${cy + 1}`];
    if (dir === "h") return [`${cx},${cy}`, `${cx + 1},${cy}`];
    if (dir === "d") return [`${cx},${cy}`, `${cx + 1},${cy + 1}`];
    return [`${cx + 1},${cy}`, `${cx},${cy + 1}`];
  };

  /* Trozos sueltos: grupos de menos de 3 muros sin tocar nada más */
  const at = new Map();
  for (const k of out.keys()) for (const v of ends(k)) (at.get(v) || at.set(v, []).get(v)).push(k);
  const seen = new Set();
  for (const k of [...out.keys()]) {
    if (seen.has(k)) continue;
    const comp = [k];
    seen.add(k);
    for (let i = 0; i < comp.length; i++)
      for (const v of ends(comp[i])) for (const o of at.get(v)) if (!seen.has(o)) { seen.add(o); comp.push(o); }
    if (comp.length < 3) for (const c of comp) out.delete(c);
  }
  const edges = Object.fromEntries(out);
  const vals = Object.entries(edges);
  return {
    edges, floor: rules.floor, score: rules.score,
    stats: {
      ...rules.stats,
      walls: vals.filter(([, t]) => t === "wall").length,
      doors: vals.filter(([, t]) => t === "door").length,
      diagonals: vals.filter(([k]) => /,(d|a)$/.test(k)).length
    }
  };
}

/* Todo de una vez, para quien tenga los píxeles a mano */
export function detectWalls(data, W, H, grid, opts = {}) {
  return classifyWalls(measureWalls(data, W, H, grid, opts.channels || 4), opts);
}
