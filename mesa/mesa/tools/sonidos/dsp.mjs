/* Herramientas de síntesis para la biblioteca de sonidos de Mesa. Todo en
   mono a 44,1 kHz con Float32Array, sin dependencias. Lo usan escenas.mjs y
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
/* Un filtro sobre todo un tramo, en el sitio */
export function filt(x, type, f, q, gain) {
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

/* ---------- Mezcla ---------- */
export function add(dst, src, at = 0, gain = 1) {
  const i0 = Math.round(at * SR);
  const from = Math.max(0, -i0), to = Math.min(src.length, dst.length - i0);
  for (let i = from; i < to; i++) dst[i0 + i] += src[i] * gain;
  return dst;
}
export function mixInto(dst, src, gain = 1) { for (let i = 0; i < dst.length; i++) dst[i] += src[i] * gain; return dst; }
export function scale(x, g) { for (let i = 0; i < x.length; i++) x[i] *= g; return x; }
export const rms = x => { let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; return Math.sqrt(s / x.length) || 1e-9; };

/* Lo que pasa cada cierto tiempo se repite idéntico en cada vuelta del bucle:
   cada suceso en t ∈ [0, L) se pinta también en t + L, t + 2L… hasta T */
export function every(L, T, t, fn) { for (let k = 0; t + k * L < T; k++) fn(t + k * L); }
/* Tiempos al azar en [0, L) con una media de «rate» por segundo */
export function times(R, L, rate) {
  const out = [];
  for (let t = -Math.log(1 - R()) / rate; t < L; t += -Math.log(1 - R()) / rate) out.push(t);
  return out;
}

/* ---------- Reverberación (Freeverb, mono) ---------- */
export function reverb(x, { room = 0.7, damp = 0.4, wet = 0.3, dry = 1, pre = 0 } = {}) {
  const fb = room * 0.28 + 0.7;
  const cs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map(n => ({ b: new Float32Array(n), i: 0, s: 0 }));
  const as = [556, 441, 341, 225].map(n => ({ b: new Float32Array(n), i: 0 }));
  const preN = Math.round(pre * SR), pb = new Float32Array(Math.max(1, preN));
  let pi = 0;
  const out = new Float32Array(x.length);
  for (let n = 0; n < x.length; n++) {
    let v = x[n] * 0.015;
    if (preN) { const d = pb[pi]; pb[pi] = v; pi = (pi + 1) % preN; v = d; }
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
    out[n] = x[n] * dry + y * wet * 3;
  }
  return out;
}

/* ---------- Golpes y burbujas ---------- */
/* Una burbuja o una gota: un seno que sube de tono y se apaga (Minnaert) */
export function bubble(f0, dec, rise = 0.3, amp = 1) {
  const n = Math.ceil(dec * 6 * SR), out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += TAU * f0 * (1 + rise * t / dec) / SR;
    out[i] = Math.sin(ph) * Math.exp(-t / dec) * Math.min(1, t / 0.0006) * amp;
  }
  return out;
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

/* ---------- Voz humana (murmullo de gente) ----------
   Una fuente glotal (sierra) por tres formantes que cambian con cada sílaba,
   con frases y silencios. A distancia y con muchas, no se entiende nada: es
   el rumor de una taberna. */
const VOWELS = [[730, 1090, 2440], [270, 2290, 3010], [530, 1840, 2480], [570, 840, 2410], [300, 870, 2240], [660, 1720, 2410], [440, 1020, 2240], [490, 1350, 1690]];
export function voice(R, sec, { f0 = 130, talk = 0.6, bright = 2800 } = {}) {
  const n = Math.ceil(sec * SR), out = new Float32Array(n);
  const syl = [];
  for (let t = R() * 2.5; t < sec;) {
    if (R() < talk) {
      const count = 2 + Math.floor(R() * 12);
      const tilt = U(R, -0.15, 0.08);
      for (let k = 0; k < count && t < sec; k++) {
        const d = U(R, 0.1, 0.26);
        syl.push({ s: t, d, v: pick(R, VOWELS), p: U(R, 0.9, 1.15) * (1 + tilt * k / count), fric: R() < 0.35 });
        t += d + U(R, 0, 0.05);
      }
    }
    t += U(R, 0.3, 2.2);
  }
  const osc = sawOsc(), f1 = new Biquad(), f2 = new Biquad(), f3 = new Biquad(), lp = new Biquad("lp", bright, 0.7);
  const fr = new Biquad("hp", 3500, 0.7);
  let k = 0, F = [500, 1500, 2500];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    while (k < syl.length && t > syl[k].s + syl[k].d) k++;
    const s = syl[k];
    let env = 0, fric = 0;
    if (s && t >= s.s) {
      const x = (t - s.s) / s.d;
      env = Math.pow(Math.sin(Math.PI * x), 0.6);
      if (s.fric) fric = Math.exp(-(t - s.s) / 0.025);
    }
    if ((i & 31) === 0) {
      const tgt = s ? s.v : F;
      F = F.map((f, j) => f + (tgt[j] - f) * 0.25);
      f1.set("bp", F[0], 4); f2.set("bp", F[1], 6); f3.set("bp", F[2], 8);
    }
    const p = (s ? s.p : 1) * f0 * (1 + 0.02 * Math.sin(TAU * 4.7 * t));
    const src = osc(p);
    const v = f1.tick(src) * 1 + f2.tick(src) * 0.55 + f3.tick(src) * 0.22;
    out[i] = lp.tick(v * env + fr.tick(R() * 2 - 1) * fric * 0.25);
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
/* Coro: «aah» con formantes sobre sierras con vibrato */
export function choir(R, f, dur, { att = 1.2, rel = 2, vowel = [700, 1150, 2800] } = {}) {
  const n = Math.ceil((dur + rel * 4) * SR), out = new Float32Array(n);
  const voices = [0, 1].map(() => ({ o: sawOsc(), d: 1 + U(R, -0.004, 0.004), vr: U(R, 4.8, 5.8), vp: R() * TAU }));
  const f1 = new Biquad("bp", vowel[0], 5), f2 = new Biquad("bp", vowel[1], 6), f3 = new Biquad("bp", vowel[2], 9), lp = new Biquad("lp", 4500, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / att) * (t > dur ? Math.exp(-(t - dur) / rel) : 1);
    let s = 0;
    for (const v of voices) s += v.o(f * v.d * (1 + 0.006 * Math.sin(TAU * v.vr * t + v.vp)));
    s /= 2;
    out[i] = lp.tick(f1.tick(s) + f2.tick(s) * 0.5 + f3.tick(s) * 0.22) * env;
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
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let b = 0;
    if (bed) {
      b = bed[p + i];
      if (i < x) { const a = i / x; b = bed[p + i] * Math.sqrt(a) + bed[p + n + i] * Math.sqrt(1 - a); }
    }
    out[i] = b + (ev ? ev[p + i] : 0);
  }
  return out;
}

/* Al nivel pedido (dB RMS) y con los picos redondeados por debajo de
   −1 dBFS. La continua se quita antes de cerrar el bucle, no aquí: un filtro
   sobre el bucle ya cortado arrancaría de cero y se oiría el empalme. */
export function finish(x, db) {
  const g = Math.pow(10, db / 20) / rms(x);
  const knee = 0.6, lim = 0.89;
  for (let i = 0; i < x.length; i++) {
    const v = x[i] * g, a = Math.abs(v);
    x[i] = a < knee ? v : Math.sign(v) * (knee + (lim - knee) * Math.tanh((a - knee) / (lim - knee)));
  }
  return x;
}
