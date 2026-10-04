/* Herramientas de síntesis para la biblioteca de sonidos de Mesa. Todo en
   mono o estéreo a 44,1 kHz con Float32Array, sin dependencias. Lo usan escenas.mjs y
   musica.mjs; el resultado lo monta y lo codifica generar.mjs. */

export const SR = 44100;
export const TAU = Math.PI * 2;

/* Azar con semilla: el mismo archivo cada vez que se genera */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const U = (R, a, b) => a + (b - a) * R();
export const pick = (R, list) => list[Math.floor(R() * list.length)];
export const buf = sec => new Float32Array(Math.max(1, Math.ceil(sec * SR)));
export const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

/* ---------- Ruido ---------- */
export const white = R => () => R() * 2 - 1;
export function pink(R) {          // Paul Kellet
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  return () => {
    const w = R() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    const p = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;
    return p * 0.11;
  };
}
export function brown(R) {
  let b = 0;
  return () => { b = (b + 0.02 * (R() * 2 - 1)) / 1.02; return b * 3.5; };
}

/* ---------- Filtro bicuadrático (RBJ), forma directa II transpuesta ---------- */
export class Biquad {
  constructor(type, f, q = 0.707, gain = 0) { this.z1 = 0; this.z2 = 0; if (type) this.set(type, f, q, gain); }
  set(type, f, q = 0.707, gain = 0) {
    const w = TAU * Math.min(Math.max(f, 10), SR * 0.45) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
    const A = Math.pow(10, gain / 40);
    let b0, b1, b2, a0, a1, a2;
    if (type === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
    else if (type === "hp") { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
    else if (type === "bp") { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
    else { b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A; }  // peak
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
    return this;
  }
  tick(x) {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
}
/* Un filtro sobre todo un tramo, en el sitio (mono o estéreo) */
export function filt(x, type, f, q, gain) {
  if (x.stereo) { filt(x.L, type, f, q, gain); filt(x.R, type, f, q, gain); return x; }
  const b = new Biquad(type, f, q, gain);
  for (let i = 0; i < x.length; i++) x[i] = b.tick(x[i]);
  return x;
}

/* Un valor que deriva despacio entre lo y hi: ráfagas, parpadeos, oleaje.
   Se llama con el tiempo siempre creciente. */
export function wander(R, period, lo = 0, hi = 1) {
  let a = U(R, lo, hi), b = U(R, lo, hi), t0 = 0, len = period * (0.6 + 0.8 * R());
  return t => {
    while (t >= t0 + len) { t0 += len; a = b; b = U(R, lo, hi); len = period * (0.6 + 0.8 * R()); }
    const x = (t - t0) / len;
    return a + (b - a) * (0.5 - 0.5 * Math.cos(Math.PI * x));
  };
}

/* ---------- Estéreo ----------
   El ancho es lo que más separa un ambiente de verdad de uno sintético: la
   lluvia, la gente o el viento llegan de todas partes, no de un punto. Cada
   suceso (una gota, un grito, un pájaro) cae en un sitio del panorama, el
   mismo en cada vuelta del bucle; los lechos continuos se generan dos veces
   con distinto azar, una por oído. */
export class Stereo {
  constructor(n) { this.L = new Float32Array(n); this.R = new Float32Array(n); this.length = n; this.stereo = true; }
}
export const sbuf = sec => new Stereo(Math.max(1, Math.ceil(sec * SR)));
let panR = rng(1), spread = 0.8;
/* Lo fija generar.mjs para cada sonido; una escena puede abrir o cerrar el panorama */
export function panning(seed, width = 0.8) { panR = rng(seed); spread = width; }
export function setSpread(width) { spread = width; }
const panOf = src => (src.pan ??= (panR() * 2 - 1) * spread);
/* Dos versiones del mismo lecho, una por oído; width 0 lo deja en mono */
export function wide(R, width, fn) {
  const a = fn(rng(Math.floor(R() * 2 ** 31))), b = fn(rng(Math.floor(R() * 2 ** 31)));
  const out = new Stereo(a.length);
  for (let i = 0; i < a.length; i++) {
    const m = (a[i] + b[i]) / 2, d = (a[i] - b[i]) / 2 * width;
    out.L[i] = m + d; out.R[i] = m - d;
  }
  return out;
}

/* ---------- Mezcla ---------- */
export function add(dst, src, at = 0, gain = 1) {
  const i0 = Math.round(at * SR);
  const from = Math.max(0, -i0), to = Math.min(src.length, dst.length - i0);
  if (dst.stereo) {
    const p = panOf(src), gl = Math.cos((p + 1) * Math.PI / 4) * Math.SQRT2 * gain, gr = Math.sin((p + 1) * Math.PI / 4) * Math.SQRT2 * gain;
    for (let i = from; i < to; i++) { dst.L[i0 + i] += src[i] * gl; dst.R[i0 + i] += src[i] * gr; }
    return dst;
  }
  for (let i = from; i < to; i++) dst[i0 + i] += src[i] * gain;
  return dst;
}
export function mixInto(dst, src, gain = 1) {
  if (dst.stereo) {
    const l = src.stereo ? src.L : src, r = src.stereo ? src.R : src;
    for (let i = 0; i < dst.length; i++) { dst.L[i] += l[i] * gain; dst.R[i] += r[i] * gain; }
    return dst;
  }
  for (let i = 0; i < dst.length; i++) dst[i] += src[i] * gain;
  return dst;
}
export function scale(x, g) {
  if (x.stereo) { scale(x.L, g); scale(x.R, g); return x; }
  for (let i = 0; i < x.length; i++) x[i] *= g;
  return x;
}
export const rms = x => {
  if (x.stereo) return Math.sqrt((rms(x.L) ** 2 + rms(x.R) ** 2) / 2);
  let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; return Math.sqrt(s / x.length) || 1e-9;
};

/* Lo que pasa cada cierto tiempo se repite idéntico en cada vuelta del bucle:
   cada suceso en t ∈ [0, L) se pinta también en t + L, t + 2L… hasta T */
export function every(L, T, t, fn) { for (let k = 0; t + k * L < T; k++) fn(t + k * L); }
/* Tiempos al azar en [0, L) con una media de «rate» por segundo */
export function times(R, L, rate) {
  const out = [];
  for (let t = -Math.log(1 - R()) / rate; t < L; t += -Math.log(1 - R()) / rate) out.push(t);
  return out;
}

/* ---------- Reverberación (Freeverb) ----------
   Un tanque por oído, el derecho con los retardos un poco más largos (como el
   Freeverb original): la cola sale abierta aunque lo que entra sea mono. Si
   entra mono, sale estéreo. */
function tank(spreadN, room, damp) {
  const fb = room * 0.28 + 0.7;
  const cs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map(n => ({ b: new Float32Array(n + spreadN), i: 0, s: 0 }));
  const as = [556, 441, 341, 225].map(n => ({ b: new Float32Array(n + spreadN), i: 0 }));
  return v => {
    let y = 0;
    for (const c of cs) {
      const o = c.b[c.i];
      c.s = o * (1 - damp) + c.s * damp;
      c.b[c.i] = v + c.s * fb;
      if (++c.i === c.b.length) c.i = 0;
      y += o;
    }
    for (const a of as) {
      const bo = a.b[a.i];
      a.b[a.i] = y + bo * 0.5;
      if (++a.i === a.b.length) a.i = 0;
      y = bo - y;
    }
    return y;
  };
}
export function reverb(x, { room = 0.7, damp = 0.4, wet = 0.3, dry = 1, pre = 0, width = 1 } = {}) {
  const tl = tank(0, room, damp), tr = tank(23, room, damp);
  const preN = Math.round(pre * SR), pb = new Float32Array(Math.max(1, preN));
  let pi = 0;
  const L = x.stereo ? x.L : x, R = x.stereo ? x.R : x;
  const out = new Stereo(L.length);
  const w1 = wet * 3 * (width / 2 + 0.5), w2 = wet * 3 * ((1 - width) / 2);
  for (let n = 0; n < L.length; n++) {
    let v = (L[n] + R[n]) * 0.0075;
    if (preN) { const d = pb[pi]; pb[pi] = v; pi = (pi + 1) % preN; v = d; }
    const yl = tl(v), yr = tr(v);
    out.L[n] = L[n] * dry + yl * w1 + yr * w2;
    out.R[n] = R[n] * dry + yr * w1 + yl * w2;
  }
  return out;
}

/* ---------- Agua ----------
   Las gotas no son pitidos: son el golpe (ruido muy corto) y, si caen en
   agua, una burbuja que resuena. La burbuja sigue la física (Minnaert, van
   den Doel): cuanto más pequeña, más aguda y más corta, y su tono sube un
   poco mientras se apaga. Un arroyo es una nube de cientos de ellas por
   segundo, muy flojas y casi todas diminutas. */
export function bubble(f0, { amp = 1, rise = 0.1, slow = 1 } = {}) {
  const d = 0.043 * f0 + 0.0014 * Math.pow(f0, 1.5);    // amortiguamiento, 1/s
  const tau = slow / d, n = Math.ceil(tau * 6 * SR), out = new Float32Array(n);
  const sigma = rise * d;
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += TAU * f0 * (1 + sigma * t) / SR;
    out[i] = Math.sin(ph) * Math.exp(-t / tau) * Math.min(1, t * 8000) * amp;
  }
  return out;
}
/* Un golpe de gota sobre algo: ruido de un milisegundo por un filtro al azar */
export function grain(R, { f = [1500, 8000], q = [0.5, 1.2], tau = [0.0003, 0.0015], amp = 1 } = {}) {
  const t = U(R, tau[0], tau[1]), n = Math.ceil(t * 6 * SR) + 2, out = new Float32Array(n);
  const b = new Biquad("bp", Math.exp(U(R, Math.log(f[0]), Math.log(f[1]))), U(R, q[0], q[1]));
  for (let i = 0; i < n; i++) out[i] = b.tick((R() * 2 - 1) * Math.exp(-i / SR / t)) * amp * 3;
  return out;
}
/* Una gota que cae en un charco o una poza: golpe, burbuja que «canta» y
   salpicaduras diminutas */
export function drip(R, { f0 = U(R, 900, 2600), amp = 1, rise = U(R, 0.6, 2) } = {}) {
  const out = new Float32Array(Math.ceil(0.25 * SR));
  add(out, grain(R, { f: [2500, 6000], tau: [0.0004, 0.001], amp: 0.5 }), 0, amp);
  add(out, bubble(f0, { amp: 1, rise, slow: U(R, 1.5, 3) }), U(R, 0.002, 0.012), amp);
  for (let k = 0; k < 1 + Math.floor(R() * 3); k++) add(out, bubble(U(R, 3500, 7000), { rise: 0.3 }), U(R, 0.02, 0.08), amp * U(R, 0.05, 0.15));
  return out;
}
/* Una nube de burbujas: agua que corre. rate por segundo en [0, L) */
export function bubbles(R, L, T, ev, rate, { r = [0.5, 6], amp = 0.3, rise = [0.05, 0.4] } = {}) {
  for (const t of times(R, L, rate)) {
    const rad = Math.exp(U(R, Math.log(r[0]), Math.log(r[1])));       // mm
    const f0 = 3260 / rad;                                             // Minnaert, en el agua
    const b = bubble(f0, { amp: amp * Math.pow(rad / r[1], 0.6) * Math.pow(R(), 1.5), rise: U(R, rise[0], rise[1]) });
    every(L, T, t, tt => add(ev, b, tt));
  }
}
/* Lluvia: miles de golpes por segundo sobre hojas, tierra y piedra */
export function rainGrains(R, L, T, ev, rate, { f = [1200, 9000], tau = [0.0002, 0.0012], amp = 0.25 } = {}) {
  for (const t of times(R, L, rate)) {
    const g = grain(R, { f, tau, amp: amp * Math.pow(R(), 2) });
    every(L, T, t, tt => add(ev, g, tt));
  }
}

/* Un chasquido: ruido corto por un pasa banda */
export function click(R, f, q, dec, amp = 1) {
  const n = Math.ceil(dec * 7 * SR), out = new Float32Array(n), b = new Biquad("bp", f, q);
  for (let i = 0; i < n; i++) out[i] = b.tick(R() * 2 - 1) * Math.exp(-i / SR / dec) * amp;
  return out;
}
/* Parciales sueltos que se apagan cada uno a su ritmo: metal, campanas, cristal */
export function partials(f0, list, len) {
  const n = Math.ceil(len * SR), out = new Float32Array(n);
  for (const [ratio, amp, dec] of list) {
    const w = TAU * f0 * ratio / SR;
    if (f0 * ratio > SR * 0.45) continue;
    for (let i = 0; i < n; i++) out[i] += Math.sin(w * i) * amp * Math.exp(-i / SR / dec) * Math.min(1, i / 40);
  }
  return out;
}
export function fadeOut(x, sec) {
  const n = Math.min(x.length, Math.round(sec * SR));
  for (let i = 0; i < n; i++) x[x.length - 1 - i] *= i / n;
  return x;
}

/* ---------- Osciladores ---------- */
const blep = (t, dt) => {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
};
/* Diente de sierra sin aliasing audible (polyBLEP) */
export function sawOsc() {
  let ph = 0;
  return f => {
    const dt = f / SR;
    ph += dt; if (ph >= 1) ph -= 1;
    return 2 * ph - 1 - blep(ph, dt);
  };
}

/* ---------- Voz humana (gente, risas, susurros) ----------
   Una fuente glotal de Rosenberg (no una sierra: es lo que hacía sonar a
   robot) con jitter, shimmer y aliento, por cuatro formantes en cascada
   (Klatt), que siguen una cadena de sonidos: vocales, nasales, líquidas,
   oclusivas con su explosión y fricativas. Los formantes se deslizan de un
   sonido al siguiente (coarticulación) y la entonación baja a lo largo de la
   frase con acentos. A la distancia de una taberna no se entiende nada, que
   es justo lo que tiene que pasar. */
class Resonator {
  constructor() { this.y1 = 0; this.y2 = 0; this.A = 1; this.B = 0; this.C = 0; }
  set(f, bw) {
    const T = 1 / SR;
    this.C = -Math.exp(-TAU * bw * T);
    this.B = 2 * Math.exp(-Math.PI * bw * T) * Math.cos(TAU * f * T);
    this.A = 1 - this.B - this.C;
  }
  tick(x) { const y = this.A * x + this.B * this.y1 + this.C * this.y2; this.y2 = this.y1; this.y1 = y; return y; }
}
const VOW = { a: [730, 1250, 2550], e: [470, 1850, 2550], i: [300, 2250, 2950], o: [500, 900, 2450], u: [330, 760, 2350], "@": [520, 1450, 2500] };
const BW = [80, 100, 140, 220];
/* Una cadena de sonidos en segmentos: { k: "v"|"n"|"x"|"s", d, f?, a, noise? } */
function syllables(R, count, { stressEvery = 2 } = {}) {
  const segs = [];
  const vowels = Object.keys(VOW);
  for (let k = 0; k < count; k++) {
    const stress = k % stressEvery === 0 ? U(R, 0.06, 0.14) : 0;
    const c = R();
    if (c < 0.22) segs.push({ k: "s", d: U(R, 0.03, 0.06) }, { k: "x", d: U(R, 0.012, 0.025), f: pick(R, [1200, 2200, 3800]), q: 1.2, a: 0.5 });
    else if (c < 0.42) segs.push({ k: "x", d: U(R, 0.06, 0.11), f: pick(R, [5800, 2600, 1800]), q: 1.6, a: 0.28 });
    else if (c < 0.6) segs.push({ k: "v", d: U(R, 0.04, 0.07), f: [260, pick(R, [1100, 1700]), 2500], a: 0.35 });
    else if (c < 0.75) segs.push({ k: "v", d: U(R, 0.03, 0.05), f: [360, pick(R, [1100, 1350]), 2400], a: 0.55 });
    const v = VOW[pick(R, vowels)];
    segs.push({ k: "v", d: U(R, 0.08, 0.16) * (stress ? 1.3 : 1), f: v, a: 1, acc: stress });
    if (R() < 0.18) segs.push({ k: "x", d: U(R, 0.05, 0.09), f: 5800, q: 1.6, a: 0.25 });
  }
  return segs;
}
export function speak(R, segs, { f0 = 120, female = false, breath = 0.06, oq = 0.6, fall = 0.22, rise = 0 } = {}) {
  const fs = female ? 1.16 : 1;
  const total = segs.reduce((t, s) => t + s.d, 0) + 0.25;
  const n = Math.ceil(total * SR), out = new Float32Array(n);
  const rs = [0, 1, 2, 3].map(() => new Resonator());
  const nb = new Biquad("bp", 2000, 1), hp = new Biquad("hp", 300, 0.7);
  let ph = 0, prevG = 0, per = 1 / f0, jitter = 1, shim = 1, amp = 0, noiseA = 0, voiced = 0;
  let F = [500, 1500, 2500], accent = 0;
  let si = 0, segEnd = segs.length ? segs[0].d : 0, t0 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    while (si < segs.length && t >= segEnd) { si++; t0 = segEnd; segEnd += si < segs.length ? segs[si].d : 0; }
    const s = segs[si];
    const tgtAmp = s && s.k === "v" ? s.a : 0, tgtNoise = s && s.k === "x" ? s.a : 0;
    amp += (tgtAmp - amp) * 0.004;                    // ~5 ms
    noiseA += (tgtNoise - noiseA) * (s && s.k === "x" && s.d < 0.03 ? 0.05 : 0.006);
    voiced += ((s && s.k === "v" ? 1 : 0) - voiced) * 0.003;
    if ((i & 15) === 0) {
      const tf = s && s.k === "v" ? s.f.map(x => x * fs) : F;
      F = F.map((f, j) => f + (tf[j] - f) * 0.09);  // ~15 ms
      rs[0].set(F[0], BW[0]); rs[1].set(F[1], BW[1]); rs[2].set(F[2], BW[2]); rs[3].set(3400 * fs, BW[3]);
      if (s && s.k === "x") nb.set("bp", s.f, s.q);
      accent += (((s && s.acc) || 0) - accent) * 0.05;
    }
    /* Entonación: baja a lo largo de la frase, sube en los acentos */
    const prog = t / total, f = f0 * fs * (1 + rise * prog) * (1.1 - fall * prog) * (1 + accent);
    ph += 1 / (per * SR);
    if (ph >= 1) { ph -= 1; per = 1 / (f * (1 + (R() - 0.5) * 0.02)); shim = 1 + (R() - 0.5) * 0.08; }
    const tp = oq * 0.66, tn = oq * 0.34;
    const g = ph < tp ? 0.5 * (1 - Math.cos(Math.PI * ph / tp)) : ph < tp + tn ? Math.cos(Math.PI * (ph - tp) / (2 * tn)) : 0;
    const dg = (g - prevG) * 18 * shim; prevG = g;
    const asp = (R() * 2 - 1) * breath * (0.3 + g);
    let x = (dg + asp) * amp * voiced;
    for (const r of rs) x = r.tick(x);
    const fr = nb.tick(R() * 2 - 1) * noiseA;
    out[i] = hp.tick(x * 0.6 + fr);
  }
  return out;
}
/* Alguien hablando un rato: frases y silencios */
export function talker(R, sec, { f0 = 120, female = false, talk = 0.55 } = {}) {
  const out = new Float32Array(Math.ceil(sec * SR));
  let t = R() * 2;
  while (t < sec - 0.5) {
    if (R() < talk) {
      const phrase = speak(R, syllables(R, 3 + Math.floor(R() * 11)), { f0: f0 * U(R, 0.95, 1.06), female, fall: U(R, 0.12, 0.3), rise: R() < 0.2 ? 0.25 : 0 });
      const i0 = Math.round(t * SR);
      for (let i = 0; i < phrase.length && i0 + i < out.length; i++) out[i0 + i] += phrase[i];
      t += phrase.length / SR;
    }
    t += U(R, 0.25, 1.8);
  }
  return out;
}
/* Una carcajada: «ja» aspirados que bajan de tono y de fuerza */
export function laughter(R, { female = R() < 0.4 } = {}) {
  const segs = [], k = 4 + Math.floor(R() * 5);
  for (let j = 0; j < k; j++) {
    segs.push({ k: "x", d: U(R, 0.04, 0.07), f: 1500, q: 0.7, a: 0.35 });
    segs.push({ k: "v", d: U(R, 0.07, 0.11), f: VOW.a, a: 1 - j / (k + 2) });
  }
  return speak(R, segs, { f0: female ? U(R, 230, 300) : U(R, 150, 200), female, breath: 0.25, oq: 0.75, fall: 0.35 });
}
/* Susurros: los mismos sonidos sin voz, solo aliento */
export function whisper(R, count) {
  const segs = syllables(R, count).map(s => s.k === "v" ? { k: "x", d: s.d, f: s.f[1], q: 2.5, a: 0.35 * s.a } : s);
  return speak(R, segs, { breath: 0 });
}
/* El rumor de fondo de mucha gente: ruido con el espectro del habla,
   modulado por las sílabas de muchas voces a la vez */
export function murmur(R, sec, { voices = 12, cut = 1800 } = {}) {
  const n = Math.ceil(sec * SR), out = new Float32Array(n), pn = pink(R);
  const hp = new Biquad("hp", 140, 0.7), pk = new Biquad("peak", 500, 0.8, 6), lp = new Biquad("lp", cut, 0.7);
  const gates = Array.from({ length: voices }, () => ({ on: R() < 0.5, next: R() * 2, e: 0, rate: U(R, 3.5, 5.5), ph: R() }));
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let env = 0;
    for (const g of gates) {
      if (t >= g.next) { g.on = !g.on; g.next = t + (g.on ? U(R, 0.8, 3.5) : U(R, 0.3, 1.6)); }
      const syl = g.on ? Math.pow(Math.max(0, Math.sin(TAU * g.rate * t + g.ph * TAU)), 0.7) : 0;
      g.e += (syl - g.e) * 0.003;
      env += g.e;
    }
    out[i] = lp.tick(pk.tick(hp.tick(pn()))) * env / Math.sqrt(voices);
  }
  return out;
}

/* ---------- Instrumentos ---------- */
/* Cuerda pulsada (Karplus-Strong con retardo fraccionario): laúd, arpa, pizzicato */
export function pluck(R, f, len, { bright = 0.6, decay = 0.997, mute = Infinity, rel = 0.08 } = {}) {
  const n = Math.ceil(len * SR), out = new Float32Array(n);
  const d = SR / f - 0.5, size = Math.ceil(d) + 4, line = new Float32Array(size);
  const read = p => {
    const i0 = Math.floor(p), fr = p - i0;
    const a = line[((i0 % size) + size) % size], b = line[(((i0 + 1) % size) + size) % size];
    return a + (b - a) * fr;
  };
  let lp = 0;
  for (let w = 0; w < n; w++) {
    let x = 0;
    if (w < d) { lp += ((R() * 2 - 1) - lp) * bright; x = lp; }
    const y = x + decay * 0.5 * (read(w - d) + read(w - d - 1));
    line[w % size] = y;
    const t = w / SR;
    out[w] = y * (t > mute ? Math.exp(-(t - mute) / rel) : 1);
  }
  return out;
}
/* Flauta: seno con algo de armónicos, aliento y vibrato que entra tarde */
export function flute(R, f, dur, { vib = 0.006, breath = 0.06, att = 0.06, rel = 0.15 } = {}) {
  const n = Math.ceil((dur + rel * 4) * SR), out = new Float32Array(n);
  const nb = new Biquad("bp", Math.min(f * 2, 6000), 1.2);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = (t < att ? t / att : 1) * (t > dur ? Math.exp(-(t - dur) / rel) : 1);
    const v = 1 + vib * Math.min(1, Math.max(0, (t - 0.25) / 0.3)) * Math.sin(TAU * 5.2 * t);
    ph += TAU * f * v / SR;
    out[i] = (Math.sin(ph) + 0.22 * Math.sin(2 * ph) + 0.07 * Math.sin(3 * ph) + nb.tick(R() * 2 - 1) * breath * 4) * env;
  }
  return out;
}
/* Cuerdas o colchón: tres sierras desafinadas, filtradas, con ataque lento */
export function pad(R, f, dur, { cut = 1800, att = 0.6, rel = 1.2, det = 0.004, vib = 0.003, q = 0.8 } = {}) {
  const n = Math.ceil((dur + rel * 4) * SR), out = new Float32Array(n);
  const oscs = [sawOsc(), sawOsc(), sawOsc()], dets = [1 - det, 1, 1 + det], lp = new Biquad("lp", cut, q);
  const vr = U(R, 4.6, 5.6), vp = R() * TAU;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / att) * (t > dur ? Math.exp(-(t - dur) / rel) : 1);
    const v = 1 + vib * Math.sin(TAU * vr * t + vp);
    let s = 0;
    for (let k = 0; k < 3; k++) s += oscs[k](f * dets[k] * v);
    out[i] = lp.tick(s / 3) * env;
  }
  return out;
}
/* Metal (trompas, trombones): el filtro se abre al atacar */
export function brass(R, f, dur, { cut = 900, open = 2400, att = 0.07, rel = 0.25 } = {}) {
  const n = Math.ceil((dur + rel * 4) * SR), out = new Float32Array(n);
  const a = sawOsc(), b = sawOsc(), lp = new Biquad();
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / att) * (t > dur ? Math.exp(-(t - dur) / rel) : 1);
    if ((i & 31) === 0) lp.set("lp", cut + open * env * Math.exp(-t / 0.5) + open * 0.3 * env, 1.1);
    const v = 1 + 0.004 * Math.sin(TAU * 5 * t) * Math.min(1, t / 0.4);
    out[i] = lp.tick((a(f * v) + b(f * 1.003 * v)) / 2) * env;
  }
  return out;
}
/* Coro: varias voces «aah» con fuente glotal, cada una con su vibrato,
   su pequeño desafinado, su entrada y su aliento: así suena a gente
   cantando y no a un órgano */
export function choir(R, f, dur, { att = 1.2, rel = 2, vowel = [700, 1150, 2800], voices = 3 } = {}) {
  const n = Math.ceil((dur + rel * 4) * SR), out = new Float32Array(n);
  const female = f > 260, fs = female ? 1.14 : 1;
  const vs = Array.from({ length: voices }, () => ({
    ph: R(), per: 1 / f, det: 1 + U(R, -0.005, 0.005), vr: U(R, 4.8, 5.9), vp: R() * TAU, vd: U(R, 0.005, 0.01),
    on: U(R, 0, 0.35), prev: 0, shim: 1, drift: wander(R, 1.5, -0.003, 0.003)
  }));
  const rs = [0, 1, 2, 3].map(() => new Resonator());
  rs[0].set(vowel[0] * fs, 90); rs[1].set(vowel[1] * fs, 110); rs[2].set(vowel[2] * fs, 170); rs[3].set(3300 * fs, 260);
  const hp = new Biquad("hp", 120, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let sum = 0;
    for (const v of vs) {
      const tt = t - v.on;
      if (tt < 0) continue;
      const env = Math.min(1, tt / att) * (t > dur ? Math.exp(-(t - dur) / rel) : 1);
      const fr = f * v.det * (1 + v.drift(t)) * (1 + v.vd * Math.min(1, tt / 0.8) * Math.sin(TAU * v.vr * t + v.vp));
      v.ph += 1 / (v.per * SR);
      if (v.ph >= 1) { v.ph -= 1; v.per = 1 / (fr * (1 + (R() - 0.5) * 0.012)); v.shim = 1 + (R() - 0.5) * 0.06; }
      const g = v.ph < 0.4 ? 0.5 * (1 - Math.cos(Math.PI * v.ph / 0.4)) : v.ph < 0.6 ? Math.cos(Math.PI * (v.ph - 0.4) / 0.4) : 0;
      sum += ((g - v.prev) * 18 * v.shim + (R() * 2 - 1) * 0.05 * (0.3 + g)) * env;
      v.prev = g;
    }
    let x = sum / voices;
    for (const r of rs) x = r.tick(x);
    out[i] = hp.tick(x);
  }
  return out;
}
export const celesta = (f, len = 2.5) => partials(f, [[1, 1, 1.4], [2, 0.12, 0.6], [4, 0.18, 0.35], [6.8, 0.05, 0.12]], len);
export const bell = (f, len = 7) => partials(f, [[0.5, 0.55, 6], [1, 1, 4.5], [1.19, 0.55, 3], [1.5, 0.35, 2.4], [2, 0.45, 2], [2.52, 0.22, 1.5], [3, 0.18, 1.2], [4.2, 0.1, 0.8]], len);

/* ---------- Percusión ---------- */
export function drum(R, { f = 60, drop = 1.6, dec = 0.6, noise = 0.35, ncut = 900, ndec = 0.05 } = {}) {
  const n = Math.ceil(dec * 6 * SR), out = new Float32Array(n), lp = new Biquad("lp", ncut, 0.7);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += TAU * f * (1 + drop * Math.exp(-t / 0.03)) / SR;
    out[i] = Math.sin(ph) * Math.exp(-t / dec) + lp.tick(R() * 2 - 1) * noise * Math.exp(-t / ndec);
  }
  return out;
}
export function snare(R, { dec = 0.12, tone = 190, amp = 1 } = {}) {
  const n = Math.ceil(dec * 6 * SR), out = new Float32Array(n), bp = new Biquad("bp", 2200, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] = (bp.tick(R() * 2 - 1) * 1.6 * Math.exp(-t / dec) + Math.sin(TAU * tone * t) * 0.5 * Math.exp(-t / 0.04)) * amp;
  }
  return out;
}
export function shaker(R, { dec = 0.06, f = 7000 } = {}) {
  const n = Math.ceil(dec * 6 * SR), out = new Float32Array(n), hp = new Biquad("hp", f, 0.7), bp = new Biquad("bp", f * 1.1, 4);
  for (let i = 0; i < n; i++) {
    const t = i / SR, w = R() * 2 - 1;
    out[i] = (hp.tick(w) * 0.6 + bp.tick(w) * 1.2) * Math.min(1, t / 0.004) * Math.exp(-t / dec);
  }
  return out;
}
/* Un barrido de platillo que crece hasta el golpe */
export function swell(R, len) {
  const n = Math.ceil(len * SR), out = new Float32Array(n), hp = new Biquad("hp", 3000, 0.7);
  for (let i = 0; i < n; i++) { const x = i / n; out[i] = hp.tick(R() * 2 - 1) * x * x * x; }
  return out;
}

/* ---------- Bucle sin corte ----------
   «bed» es lo continuo (lluvia, viento) y se funde con su propio futuro al
   cerrar el bucle; «ev» son los sucesos, que ya se repiten idénticos cada L
   segundos y no hace falta fundir. Se deja fuera un tramo inicial (pre) para
   que filtros y ecos ya estén asentados. */
export function loopOf({ bed, ev }, pre, L, X) {
  const n = Math.round(L * SR), p = Math.round(pre * SR), x = Math.round(X * SR);
  const out = new Stereo(n);
  const ch = (s, k) => s && (s.stereo ? s[k] : s);
  for (const k of ["L", "R"]) {
    const b = ch(bed, k), e = ch(ev, k), o = out[k];
    for (let i = 0; i < n; i++) {
      let v = 0;
      if (b) {
        v = b[p + i];
        if (i < x) { const a = i / x; v = b[p + i] * Math.sqrt(a) + b[p + n + i] * Math.sqrt(1 - a); }
      }
      o[i] = v + (e ? e[p + i] : 0);
    }
  }
  return out;
}

/* Al nivel pedido (dB RMS) y con los picos redondeados por debajo de
   −1 dBFS. La continua se quita antes de cerrar el bucle, no aquí: un filtro
   sobre el bucle ya cortado arrancaría de cero y se oiría el empalme. */
export function finish(x, db) {
  const g = Math.pow(10, db / 20) / rms(x);
  const knee = 0.6, lim = 0.89;
  for (const c of x.stereo ? [x.L, x.R] : [x]) {
    for (let i = 0; i < c.length; i++) {
      const v = c[i] * g, a = Math.abs(v);
      c[i] = a < knee ? v : Math.sign(v) * (knee + (lim - knee) * Math.tanh((a - knee) / (lim - knee)));
    }
  }
  return x;
}
