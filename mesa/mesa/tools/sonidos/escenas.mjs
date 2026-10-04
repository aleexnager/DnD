/* Ambientes: clima, naturaleza, fuego, lugares, subterráneo y magia.
   Cada escena devuelve { bed, ev } de T segundos: lo continuo y los sucesos,
   estos repetidos cada L segundos para que el bucle cierre sin costura. */

import {
  SR, TAU, U, pick, buf, white, pink, brown, Biquad, filt, wander, add, mixInto, scale, every, times,
  reverb, bubble, click, partials, fadeOut, sawOsc, voice, bell, choir, mtof
} from "./dsp.mjs";

/* ---------- Piezas que comparten varias escenas ---------- */

/* Lecho de lluvia: siseo ancho y miles de gotas pequeñas */
function rainBed(R, T, { lo = 400, hi = 7000, level = 1 } = {}) {
  const x = buf(T), pn = pink(R), hp = new Biquad("hp", lo, 0.6), lp = new Biquad("lp", hi, 0.6), g = wander(R, 5, 0.8, 1);
  for (let i = 0; i < x.length; i++) x[i] = lp.tick(hp.tick(pn())) * g(i / SR) * level;
  return x;
}
function drops(R, L, T, ev, rate, { f = [1400, 4200], dec = [0.003, 0.012], amp = 0.25, rise = [0.1, 0.6] } = {}) {
  for (const t of times(R, L, rate)) {
    const a = amp * Math.pow(R(), 2.5);
    const d = bubble(Math.exp(U(R, Math.log(f[0]), Math.log(f[1]))), U(R, dec[0], dec[1]), U(R, rise[0], rise[1]), a);
    every(L, T, t, tt => add(ev, d, tt));
  }
}
/* Viento: ruido rosa por un pasa banda que se mueve con las ráfagas, un
   silbido estrecho y un fondo grave */
function wind(R, T, { lo = 300, hi = 900, q = 0.8, gust = 6, whistle = 0.15, rumble = 0.4, floor = 0.25, hiss = 0 } = {}) {
  const x = buf(T), pn = pink(R), wn = white(R), bn = brown(R);
  const g = wander(R, gust, floor, 1), c = wander(R, gust * 0.8, lo, hi), wf = wander(R, gust * 1.3, 500, 1500);
  const bp = new Biquad(), ws = new Biquad(), rl = new Biquad("lp", 110, 0.7), hs = new Biquad("hp", 4000, 0.7);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    if ((i & 63) === 0) { bp.set("bp", c(t), q); ws.set("bp", wf(t), 28); }
    const a = g(t);
    x[i] = bp.tick(pn()) * a * 2.2 + ws.tick(wn()) * a * a * whistle * 4 + rl.tick(bn()) * a * rumble + hs.tick(wn()) * a * hiss;
  }
  return x;
}
/* Fuego: rugido grave que parpadea, siseo y chasquidos en racimos */
function fireBed(R, T, { rumble = 1, hiss = 0.25, roar = 0.4 } = {}) {
  const x = buf(T), bn = brown(R), wn = white(R), pn = pink(R);
  const lp = new Biquad("lp", 350, 0.7), hp = new Biquad("hp", 2500, 0.7), hl = new Biquad("lp", 7000, 0.7), bp = new Biquad("bp", 600, 0.7);
  const f1 = wander(R, 0.18, 0.45, 1), f2 = wander(R, 0.11, 0.3, 1), f3 = wander(R, 1.5, 0.6, 1);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, k = f3(t);
    x[i] = lp.tick(bn()) * f1(t) * k * rumble * 1.5 + hl.tick(hp.tick(wn())) * f2(t) * hiss * 0.3 + bp.tick(pn()) * f1(t) * roar;
  }
  return x;
}
function crackles(R, L, T, ev, rate, { amp = 1, pops = 0.4 } = {}) {
  for (const c of times(R, L, rate / 3)) {
    const k = 1 + Math.floor(R() * 5);
    for (let j = 0; j < k; j++) {
      const t = c + R() * 0.18;
      const s = click(R, U(R, 1500, 7000), U(R, 0.7, 2), U(R, 0.0015, 0.006), amp * (0.12 + 0.88 * Math.pow(R(), 3)));
      every(L, T, t, tt => add(ev, s, tt));
    }
  }
  for (const t of times(R, L, pops)) {
    const s = click(R, U(R, 250, 700), 1.5, U(R, 0.015, 0.04), amp * U(R, 0.4, 0.9));
    every(L, T, t, tt => add(ev, s, tt));
  }
}
/* Un trueno: chasquido opcional y un retumbar que rueda y se apaga */
function thunder(R) {
  const d = U(R, 5, 9), x = buf(d), bn = brown(R), wn = white(R);
  const lp1 = new Biquad("lp", U(R, 140, 220), 0.7), lp2 = new Biquad("lp", 900, 0.7), hp = new Biquad("hp", 1500, 0.7);
  const peaks = Array.from({ length: 3 + Math.floor(R() * 4) }, () => ({ t: U(R, 0, d * 0.45), a: U(R, 0.4, 1), w: U(R, 0.4, 1.7) }));
  const crack = R() < 0.6, r1 = U(R, 2.5, 4.5);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    let env = 0;
    for (const p of peaks) { const q = t - p.t; if (q > 0) env += p.a * Math.exp(-q / p.w) * (1 - Math.exp(-q / 0.06)); }
    env *= 1 + 0.45 * Math.sin(TAU * r1 * t + 2 * Math.sin(TAU * 0.7 * t));
    x[i] = lp1.tick(bn()) * env * 2 + lp2.tick(wn()) * env * 0.12 + (crack && t < 0.3 ? hp.tick(wn()) * Math.exp(-t / 0.07) * 0.5 : 0);
  }
  return fadeOut(x, 1);
}
/* Pájaros: cuatro maneras de cantar */
function birdCall(R, kind, base) {
  if (kind === "tweet") {
    const notes = 3 + Math.floor(R() * 4), x = buf(notes * 0.15 + 0.1);
    let t0 = 0;
    for (let k = 0; k < notes; k++) {
      const d = U(R, 0.045, 0.085), f1 = base * U(R, 0.9, 1.05), f2 = f1 * U(R, 1.25, 1.6);
      let ph = 0;
      for (let i = 0; i < d * SR; i++) {
        const u = i / (d * SR), f = f1 + (f2 - f1) * u;
        ph += TAU * f / SR;
        const j = Math.round(t0 * SR) + i;
        if (j < x.length) x[j] += (Math.sin(ph) + 0.15 * Math.sin(2 * ph)) * Math.sin(Math.PI * u);
      }
      t0 += d + U(R, 0.035, 0.08);
    }
    return x;
  }
  if (kind === "trill") {
    const d = U(R, 0.4, 0.9), x = buf(d), r = U(R, 18, 28);
    let ph = 0;
    for (let i = 0; i < x.length; i++) {
      const t = i / SR, f = base * (1 + 0.08 * Math.sin(TAU * r * t));
      ph += TAU * f / SR;
      const am = Math.pow(0.5 + 0.5 * Math.sin(TAU * r * t), 2), env = Math.min(1, t / 0.05, (d - t) / 0.08);
      x[i] = (Math.sin(ph) + 0.1 * Math.sin(2 * ph)) * am * env;
    }
    return x;
  }
  if (kind === "whistle") {
    const seq = R() < 0.5 ? [1, 0.84] : [0.85, 1, 0.85], x = buf(seq.length * 0.3 + 0.1);
    let t0 = 0, ph = 0;
    for (const m of seq) {
      const d = U(R, 0.14, 0.24);
      for (let i = 0; i < d * SR; i++) {
        const u = i / (d * SR), f = base * m * (1 + 0.02 * Math.sin(TAU * 8 * i / SR));
        ph += TAU * f / SR;
        const j = Math.round(t0 * SR) + i;
        if (j < x.length) x[j] += Math.sin(ph) * Math.min(1, u / 0.15, (1 - u) / 0.25);
      }
      t0 += d + U(R, 0.04, 0.1);
    }
    return x;
  }
  const d = U(R, 0.6, 1.2), x = buf(d), r1 = U(R, 7, 11), r2 = U(R, 2.5, 4);      // gorjeo
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, f = base + base * 0.22 * Math.sin(TAU * r1 * t) + base * 0.1 * Math.sin(TAU * r2 * t);
    ph += TAU * f / SR;
    x[i] = Math.sin(ph) * Math.min(1, t / 0.04, (d - t) / 0.08) * (0.6 + 0.4 * Math.sin(TAU * r1 * 0.5 * t));
  }
  return x;
}
function birds(R, L, T, ev, count, { busy = 1 } = {}) {
  for (let b = 0; b < count; b++) {
    const kind = pick(R, ["tweet", "trill", "whistle", "warble"]), base = U(R, 2300, 4200), gain = U(R, 0.15, 0.9);
    const lp = U(R, 4000, 9000);
    for (let t = U(R, 0, 4); t < L - 0.5; t += U(R, 2, 7) / busy) {
      const s = filt(birdCall(R, kind, base), "lp", lp, 0.7);
      every(L, T, t, tt => add(ev, s, tt, gain));
    }
  }
}
function crickets(R, L, T, ev, count, level = 1) {
  for (let c = 0; c < count; c++) {
    const f = U(R, 3900, 4900), pulses = 3 + Math.floor(R() * 2), pd = U(R, 0.011, 0.018), gap = U(R, 0.028, 0.04);
    const per = U(R, 0.45, 0.95), gain = U(R, 0.12, 1) * level;
    const chirp = buf(pulses * (pd + gap) + 0.02);
    for (let p = 0; p < pulses; p++) {
      const i0 = Math.round(p * (pd + gap) * SR);
      for (let i = 0; i < pd * SR; i++) {
        const u = i / (pd * SR);
        chirp[i0 + i] += (Math.sin(TAU * f * (i0 + i) / SR) + 0.1 * Math.sin(TAU * 2 * f * (i0 + i) / SR)) * Math.pow(Math.sin(Math.PI * u), 2);
      }
    }
    /* Algunos callan a ratos */
    let on = true;
    for (let t = R() * per; t < L - 0.3; t += per * U(R, 0.97, 1.03)) {
      if (R() < 0.04) on = !on;
      if (on) every(L, T, t, tt => add(ev, chirp, tt, gain));
    }
  }
}
function owl(R, f = U(R, 340, 420)) {
  const x = buf(2.2), bn = new Biquad("lp", 900, 0.7);
  const hoot = (t0, d, g) => {
    let ph = 0;
    for (let i = 0; i < d * SR; i++) {
      const u = i / (d * SR), fr = f * (1.04 - 0.08 * u);
      ph += TAU * fr / SR;
      const env = Math.min(1, u / 0.18) * Math.min(1, (1 - u) / 0.4);
      x[Math.round(t0 * SR) + i] += (Math.sin(ph) + 0.18 * Math.sin(2 * ph) + bn.tick(R() * 2 - 1) * 0.05) * env * g;
    }
  };
  hoot(0, 0.42, 1); hoot(0.75, 0.2, 0.7); hoot(1.0, 0.2, 0.7); hoot(1.28, 0.55, 0.9);
  return x;
}
/* Crujido de madera: pulsos de fricción por una resonancia */
function creak(R, { lo = 15, hi = 60, f = U(R, 450, 1100), d = U(R, 0.4, 1.4) } = {}) {
  const x = buf(d + 0.2), bp = new Biquad("bp", f, 7), bp2 = new Biquad("bp", f * 2.3, 9);
  const up = R() < 0.5;
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, u = Math.min(1, t / d);
    const r = up ? lo + (hi - lo) * u : hi - (hi - lo) * u;
    ph += r / SR;
    const imp = ph >= 1 ? (ph -= 1, 1) : 0;
    const env = Math.sin(Math.PI * u);
    x[i] = (bp.tick(imp * 6) + bp2.tick(imp * 3)) * env;
  }
  return x;
}
function chains(R) {
  const d = U(R, 0.6, 1.3), x = buf(d + 0.4);
  const n = 8 + Math.floor(R() * 10);
  for (let k = 0; k < n; k++) {
    const t = d * Math.pow(R(), 0.8), f = U(R, 1800, 4600);
    add(x, partials(f, [[1, 1, U(R, 0.03, 0.09)], [2.62, 0.5, 0.04], [4.1, 0.25, 0.025]], 0.4), t, U(R, 0.2, 1));
  }
  return x;
}
function whispers(R) {
  const n = 3 + Math.floor(R() * 7), x = buf(n * 0.35 + 0.3), wn = white(R);
  const V = [[730, 1090], [300, 2300], [530, 1840], [570, 840], [440, 1020]];
  let t0 = 0;
  for (let k = 0; k < n; k++) {
    const d = U(R, 0.12, 0.3), v = pick(R, V), f1 = new Biquad("bp", v[0], 3), f2 = new Biquad("bp", v[1], 4), hp = new Biquad("hp", 1800, 0.7);
    for (let i = 0; i < d * SR; i++) {
      const u = i / (d * SR), w = wn();
      x[Math.round(t0 * SR) + i] += (f1.tick(w) * 0.6 + f2.tick(w) + hp.tick(w) * 0.5) * Math.pow(Math.sin(Math.PI * u), 0.8);
    }
    t0 += d + U(R, 0.02, 0.12);
  }
  return x;
}
/* Gente: muchas voces a distintas distancias */
function crowd(R, T, n, { men = 0.55, far = [0.25, 1], talk = 0.6 } = {}) {
  const x = buf(T);
  for (let k = 0; k < n; k++) {
    const male = R() < men, f0 = male ? U(R, 95, 145) : U(R, 175, 245);
    const g = U(R, far[0], far[1]);
    const v = voice(R, T, { f0, talk, bright: 1800 + 2200 * g });
    mixInto(x, v, g);
  }
  return x;
}
function clink(R) {
  const x = buf(0.6), f = U(R, 1700, 3200);
  add(x, partials(f, [[1, 1, U(R, 0.08, 0.22)], [2.32, 0.5, 0.12], [3.9, 0.3, 0.06]], 0.6), 0, 1);
  if (R() < 0.6) add(x, partials(f * U(R, 0.9, 1.1), [[1, 0.7, 0.15], [2.4, 0.4, 0.08]], 0.4), U(R, 0.06, 0.14), 0.8);
  return x;
}
function laugh(R) {
  const male = R() < 0.6, f0 = male ? U(R, 140, 190) : U(R, 260, 340), k = 4 + Math.floor(R() * 4), x = buf(k * 0.22 + 0.3);
  const osc = sawOsc(), f1 = new Biquad("bp", 750, 4), f2 = new Biquad("bp", 1150, 5), wn = white(R), hp = new Biquad("hp", 1200, 0.7);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, j = Math.floor(t / 0.19), u = (t % 0.19) / 0.19;
    const env = j < k ? Math.pow(Math.sin(Math.PI * Math.min(1, u / 0.7)), 1.2) * (1 - j / (k + 1)) : 0;
    const s = osc(f0 * (1.15 - 0.2 * j / k));
    x[i] = (f1.tick(s) + f2.tick(s) * 0.6 + hp.tick(wn()) * 0.35) * env;
  }
  return x;
}
/* Cascos de caballo que pasan, con su carro */
function horsePass(R) {
  const d = U(R, 5, 8), x = buf(d), bn = brown(R), lp = new Biquad("lp", 260, 0.7);
  for (let t = 0.2, k = 0; t < d - 0.3; t += k % 2 ? 0.28 : 0.12, k++) {
    add(x, click(R, U(R, 900, 1500), 3, 0.018, 1), t, Math.sin(Math.PI * t / d));
  }
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    x[i] += lp.tick(bn()) * 0.5 * Math.sin(Math.PI * t / d) * (1 + 0.5 * Math.sin(TAU * 3 * t));
  }
  return x;
}

/* ---------- Escenas ---------- */
export const SCENES = {
  lluvia(R, T, L) {
    const bed = rainBed(R, T, { lo: 500, hi: 8000 }), ev = buf(T);
    drops(R, L, T, ev, 260, { amp: 0.3 });
    drops(R, L, T, ev, 6, { f: [600, 2000], dec: [0.008, 0.03], amp: 0.6 });
    return { bed: scale(bed, 0.8), ev: reverb(ev, { room: 0.4, wet: 0.15 }) };
  },
  tormenta(R, T, L) {
    const bed = mixInto(rainBed(R, T, { lo: 300, hi: 9000, level: 1.2 }), wind(R, T, { lo: 250, hi: 700, gust: 4, whistle: 0.2, rumble: 0.6 }), 0.6);
    const ev = buf(T);
    drops(R, L, T, ev, 420, { amp: 0.35 });
    let t = U(R, 1, 4);
    while (t < L - 2) { const th = thunder(R); every(L, T, t, tt => add(ev, th, tt, U(R, 0.6, 1.3))); t += U(R, 8, 16); }
    return { bed, ev: reverb(ev, { room: 0.6, wet: 0.2 }) };
  },
  "lluvia-dentro"(R, T, L) {
    const bed = rainBed(R, T, { lo: 120, hi: 1600 }), ev = buf(T);
    for (const t of times(R, L, 90)) { const s = click(R, U(R, 250, 700), 1.2, U(R, 0.006, 0.02), Math.pow(R(), 2) * 0.6); every(L, T, t, tt => add(ev, s, tt)); }
    for (const t of times(R, L, 0.7)) { const s = bubble(U(R, 900, 2200), U(R, 0.02, 0.05), U(R, 0.3, 0.8), U(R, 0.2, 0.5)); every(L, T, t, tt => add(ev, s, tt)); }
    return { bed, ev: reverb(ev, { room: 0.5, damp: 0.5, wet: 0.35 }) };
  },
  viento(R, T) {
    return { bed: wind(R, T, { lo: 280, hi: 850, gust: 6, whistle: 0.12 }) };
  },
  ventisca(R, T) {
    return { bed: wind(R, T, { lo: 450, hi: 1500, q: 1, gust: 3, whistle: 0.35, rumble: 0.5, floor: 0.4, hiss: 0.35 }) };
  },
  "bosque-dia"(R, T, L) {
    const bed = wind(R, T, { lo: 1500, hi: 4000, q: 0.5, gust: 7, whistle: 0, rumble: 0.1, floor: 0.15 });
    scale(bed, 0.35);
    const ev = buf(T);
    birds(R, L, T, ev, 7);
    /* Un pájaro carpintero lejano */
    const peck = buf(1.2);
    for (let k = 0; k < 16; k++) add(peck, click(R, 1400, 4, 0.008, 1 - k / 18), k * 0.055);
    every(L, T, U(R, 5, L - 3), tt => add(ev, peck, tt, 0.25));
    return { bed, ev: reverb(ev, { room: 0.55, damp: 0.5, wet: 0.25 }) };
  },
  "bosque-oscuro"(R, T, L) {
    const bed = mixInto(wind(R, T, { lo: 200, hi: 600, gust: 7, whistle: 0.08, rumble: 0.5 }), wind(R, T, { lo: 2000, hi: 4500, q: 0.5, gust: 5, whistle: 0, rumble: 0 }), 0.25);
    const ev = buf(T);
    /* Cuervos: graznidos ásperos que caen de tono */
    for (let t = U(R, 1, 5); t < L - 2; t += U(R, 7, 13)) {
      const n = 2 + Math.floor(R() * 3), g = U(R, 0.3, 0.9), f0 = U(R, 480, 640);
      for (let k = 0; k < n; k++) {
        const d = U(R, 0.22, 0.34), x = buf(d), osc = sawOsc(), b1 = new Biquad("bp", 1250, 2.5), b2 = new Biquad("bp", 2500, 3);
        for (let i = 0; i < x.length; i++) {
          const u = i / x.length, s = osc(f0 * (1.1 - 0.25 * u)) * (0.7 + 0.3 * Math.sin(TAU * 70 * i / SR));
          x[i] = (b1.tick(s) + b2.tick(s) * 0.6) * Math.sin(Math.PI * Math.min(1, u * 1.3));
        }
        every(L, T, t + k * U(R, 0.38, 0.5), tt => add(ev, x, tt, g));
      }
    }
    for (let t = U(R, 3, 8); t < L - 2; t += U(R, 6, 11)) { const c = creak(R, { lo: 8, hi: 30, f: U(R, 250, 500), d: U(R, 0.8, 1.8) }); every(L, T, t, tt => add(ev, c, tt, U(R, 0.2, 0.5))); }
    const o = owl(R, U(R, 300, 360));
    every(L, T, U(R, 2, L - 4), tt => add(ev, o, tt, 0.3));
    return { bed, ev: reverb(ev, { room: 0.75, damp: 0.45, wet: 0.4 }) };
  },
  noche(R, T, L) {
    const bed = scale(wind(R, T, { lo: 250, hi: 600, gust: 8, whistle: 0, rumble: 0.2, floor: 0.2 }), 0.3);
    const ev = buf(T);
    crickets(R, L, T, ev, 9);
    const o = owl(R);
    every(L, T, U(R, 3, L - 4), tt => add(ev, o, tt, 0.6));
    return { bed, ev: reverb(ev, { room: 0.6, damp: 0.5, wet: 0.25 }) };
  },
  arroyo(R, T, L) {
    const x = buf(T), pn = pink(R), bp = new Biquad("bp", 1100, 0.5), g = wander(R, 2, 0.6, 1);
    for (let i = 0; i < x.length; i++) x[i] = bp.tick(pn()) * g(i / SR) * 0.6;
    const ev = buf(T);
    drops(R, L, T, ev, 160, { f: [400, 2600], dec: [0.006, 0.03], amp: 0.5, rise: [0.4, 1.2] });
    return { bed: x, ev: reverb(ev, { room: 0.35, wet: 0.12 }) };
  },
  cascada(R, T, L) {
    const x = buf(T), pn = pink(R), bn = brown(R), wn = white(R);
    const lp = new Biquad("lp", 5500, 0.6), lb = new Biquad("lp", 160, 0.7), hp = new Biquad("hp", 3000, 0.7), g = wander(R, 3, 0.85, 1);
    for (let i = 0; i < x.length; i++) x[i] = (lp.tick(pn()) + lb.tick(bn()) * 1.4 + hp.tick(wn()) * 0.12) * g(i / SR);
    const ev = buf(T);
    drops(R, L, T, ev, 300, { f: [300, 1800], dec: [0.008, 0.03], amp: 0.25, rise: [0.4, 1] });
    return { bed: x, ev: reverb(ev, { room: 0.5, wet: 0.2 }) };
  },
  mar(R, T, L) {
    const bed = buf(T), bn = brown(R), lb = new Biquad("lp", 220, 0.7);
    for (let i = 0; i < bed.length; i++) bed[i] = lb.tick(bn()) * 0.5;
    const ev = buf(T);
    for (let t = U(R, 0, 2); t < L; t += U(R, 6.5, 10.5)) {
      const d = U(R, 7, 11), x = buf(d), pn = pink(R), wn = white(R), lp = new Biquad(), hp = new Biquad("hp", 3500, 0.7);
      const peak = d * U(R, 0.3, 0.42), size = U(R, 0.6, 1);
      for (let i = 0; i < x.length; i++) {
        const tt = i / SR;
        const env = tt < peak ? Math.pow(tt / peak, 2.2) : Math.exp(-(tt - peak) / (d * 0.22));
        if ((i & 63) === 0) lp.set("lp", 300 + 3800 * Math.pow(env, 1.5), 0.6);
        const fizz = tt > peak ? Math.exp(-(tt - peak) / 1.5) : 0;
        x[i] = (lp.tick(pn()) * env * 1.6 + hp.tick(wn()) * fizz * 0.25) * size;
      }
      every(L, T, t, tt => add(ev, fadeOut(x, 0.5), tt));
    }
    /* Gaviotas, de vez en cuando */
    for (let t = U(R, 2, 8); t < L - 2; t += U(R, 9, 16)) {
      const n = 2 + Math.floor(R() * 3), g = U(R, 0.08, 0.2);
      for (let k = 0; k < n; k++) {
        const d = U(R, 0.25, 0.4), x = buf(d), osc = sawOsc(), bp = new Biquad("bp", 1900, 2);
        for (let i = 0; i < x.length; i++) {
          const u = i / x.length, f = u < 0.25 ? 900 + 700 * (u / 0.25) : 1600 - 650 * ((u - 0.25) / 0.75);
          x[i] = bp.tick(osc(f)) * Math.sin(Math.PI * u);
        }
        every(L, T, t + k * U(R, 0.35, 0.5), tt => add(ev, x, tt, g));
      }
    }
    return { bed, ev: reverb(ev, { room: 0.5, wet: 0.15 }) };
  },
  pantano(R, T, L) {
    const bed = buf(T), wn = white(R), bp = new Biquad("bp", 6000, 3);
    for (let i = 0; i < bed.length; i++) { const t = i / SR; bed[i] = bp.tick(wn()) * (0.55 + 0.45 * Math.sin(TAU * 38 * t)) * 0.12; }
    mixInto(bed, wind(R, T, { lo: 200, hi: 500, gust: 8, whistle: 0, rumble: 0.2 }), 0.25);
    const ev = buf(T);
    for (let f = 0; f < 6; f++) {
      const fr = U(R, 230, 520), rate = U(R, 32, 55), g = U(R, 0.25, 1);
      for (let t = U(R, 0, 3); t < L - 1; t += U(R, 1.5, 4.5)) {
        const parts = R() < 0.5 ? [0.18] : [0.12, 0.2], x = buf(0.7), bpf = new Biquad("bp", fr, 3);
        let t0 = 0;
        for (const d of parts) {
          for (let i = 0; i < d * SR; i++) {
            const tt = i / SR, imp = Math.floor((tt + 1 / SR) * rate) > Math.floor(tt * rate) ? 1 : 0;
            x[Math.round(t0 * SR) + i] += bpf.tick(imp * 8) * Math.sin(Math.PI * i / (d * SR));
          }
          t0 += d + 0.06;
        }
        every(L, T, t, tt => add(ev, x, tt, g));
      }
    }
    for (let p = 0; p < 4; p++) {
      const f0 = U(R, 2500, 3200), g = U(R, 0.05, 0.15);
      for (let t = U(R, 0, 1); t < L - 0.3; t += U(R, 0.8, 1.4)) {
        const x = buf(0.13); let ph = 0;
        for (let i = 0; i < x.length; i++) { const u = i / x.length; ph += TAU * f0 * (1 + 0.2 * u) / SR; x[i] = Math.sin(ph) * Math.sin(Math.PI * u); }
        every(L, T, t, tt => add(ev, x, tt, g));
      }
    }
    for (const t of times(R, L, 0.5)) { const s = bubble(U(R, 110, 280), U(R, 0.05, 0.1), U(R, 0.5, 1.2), U(R, 0.3, 0.6)); every(L, T, t, tt => add(ev, s, tt)); }
    return { bed, ev: reverb(ev, { room: 0.6, damp: 0.6, wet: 0.25 }) };
  },
  cueva(R, T, L) {
    const bed = buf(T), bn = brown(R), pn = pink(R), lp = new Biquad("lp", 90, 0.7), bp = new Biquad("bp", 350, 0.7), g = wander(R, 6, 0.4, 1);
    for (let i = 0; i < bed.length; i++) bed[i] = lp.tick(bn()) * 0.8 + bp.tick(pn()) * 0.25 * g(i / SR);
    const ev = buf(T);
    for (let t = U(R, 0, 1); t < L; t += U(R, 0.5, 2.6)) {
      const s = bubble(U(R, 1200, 3200), U(R, 0.02, 0.06), U(R, 0.3, 0.9), 1);
      add(s, click(R, 3500, 1, 0.002, 0.3), 0);
      every(L, T, t, tt => add(ev, s, tt, U(R, 0.15, 1)));
    }
    return { bed: reverb(bed, { room: 0.8, wet: 0.2 }), ev: reverb(ev, { room: 0.93, damp: 0.25, wet: 0.65, dry: 0.5 }) };
  },
  hoguera(R, T, L) {
    const bed = fireBed(R, T), ev = buf(T);
    crackles(R, L, T, ev, 14);
    return { bed, ev };
  },
  antorchas(R, T, L) {
    const bed = fireBed(R, T, { rumble: 0.5, hiss: 0.1, roar: 0.9 }), ev = buf(T);
    crackles(R, L, T, ev, 3, { amp: 0.5, pops: 0.1 });
    return { bed: reverb(bed, { room: 0.5, wet: 0.15 }), ev: reverb(ev, { room: 0.5, wet: 0.2 }) };
  },
  campamento(R, T, L) {
    const bed = mixInto(fireBed(R, T, { rumble: 0.8 }), wind(R, T, { lo: 250, hi: 600, gust: 8, whistle: 0, rumble: 0.2 }), 0.25);
    const ev = buf(T);
    crackles(R, L, T, ev, 10);
    const cr = buf(T);
    crickets(R, L, T, cr, 6, 0.35);
    mixInto(ev, reverb(cr, { room: 0.6, wet: 0.25 }));
    return { bed, ev };
  },
  forja(R, T, L) {
    const bed = scale(fireBed(R, T, { rumble: 1, roar: 0.6 }), 0.5), ev = buf(T);
    let t = U(R, 0.3, 1.5);
    while (t < L - 2) {
      const n = 3 + Math.floor(R() * 4), f0 = U(R, 700, 1050);
      for (let k = 0; k < n; k++) {
        const soft = k === n - 1 && R() < 0.5;
        const s = partials(f0 * U(R, 0.99, 1.01), [[1, 1, 1.1], [2.76, 0.6, 0.55], [5.4, 0.35, 0.3], [8.93, 0.2, 0.15]], 1.6);
        add(s, click(R, 3000, 1, 0.004, 1.2), 0);
        every(L, T, t, tt => add(ev, s, tt, soft ? 0.35 : U(R, 0.7, 1)));
        t += U(R, 0.42, 0.6);
      }
      t += U(R, 2, 4.5);
    }
    /* Fuelle y temple de vez en cuando */
    for (let b = U(R, 1, 4); b < L - 2; b += U(R, 6, 9)) {
      const x = buf(1.4), pn = pink(R), lp = new Biquad("lp", 700, 0.7);
      for (let i = 0; i < x.length; i++) x[i] = lp.tick(pn()) * Math.sin(Math.PI * i / x.length);
      every(L, T, b, tt => add(ev, x, tt, 0.7));
    }
    const q = buf(3), wn = white(R), hp = new Biquad("hp", 2500, 0.7);
    for (let i = 0; i < q.length; i++) { const tt = i / SR; q[i] = hp.tick(wn()) * Math.min(1, tt / 0.04) * Math.exp(-tt / 0.9) * (0.8 + 0.2 * Math.sin(TAU * 31 * tt)); }
    every(L, T, U(R, L * 0.4, L * 0.8), tt => add(ev, q, tt, 0.5));
    return { bed, ev: reverb(ev, { room: 0.5, damp: 0.5, wet: 0.22 }) };
  },
  lava(R, T, L) {
    const bed = buf(T), bn = brown(R), b2 = brown(R), l1 = new Biquad("lp", 70, 0.7), l2 = new Biquad("lp", 200, 0.7), g = wander(R, 2, 0.5, 1);
    for (let i = 0; i < bed.length; i++) bed[i] = l1.tick(bn()) * g(i / SR) * 2 + l2.tick(b2()) * 0.5;
    const ev = buf(T);
    for (const t of times(R, L, 3)) { const s = bubble(U(R, 60, 220), U(R, 0.06, 0.18), U(R, 0.5, 1.2), U(R, 0.4, 1)); every(L, T, t, tt => add(ev, s, tt)); }
    for (let t = U(R, 1, 5); t < L - 2; t += U(R, 6, 10)) {
      const x = buf(1.6), wn = white(R), hp = new Biquad("hp", 3000, 0.7), d = U(R, 0.6, 1.4);
      for (let i = 0; i < x.length; i++) { const tt = i / SR; x[i] = hp.tick(wn()) * Math.min(1, tt / 0.05) * Math.exp(-tt / d); }
      every(L, T, t, tt => add(ev, x, tt, 0.25));
    }
    return { bed, ev: reverb(ev, { room: 0.6, wet: 0.25 }) };
  },
  taberna(R, T, L) {
    const bed = reverb(crowd(R, T, 14), { room: 0.55, damp: 0.55, wet: 0.35 });
    mixInto(bed, fireBed(R, T, { rumble: 0.5, hiss: 0.05, roar: 0.1 }), 0.08);
    const ev = buf(T);
    for (const t of times(R, L, 0.45)) { const s = clink(R); every(L, T, t, tt => add(ev, s, tt, U(R, 0.15, 0.45))); }
    for (let t = U(R, 3, 9); t < L - 3; t += U(R, 9, 15)) { const s = laugh(R); every(L, T, t, tt => add(ev, s, tt, U(R, 0.3, 0.6))); }
    return { bed, ev: reverb(ev, { room: 0.55, damp: 0.5, wet: 0.35 }) };
  },
  ciudad(R, T, L) {
    const bed = reverb(crowd(R, T, 20, { far: [0.15, 0.7], talk: 0.7 }), { room: 0.3, wet: 0.12 });
    mixInto(bed, wind(R, T, { lo: 300, hi: 700, gust: 8, whistle: 0, rumble: 0.2 }), 0.12);
    const ev = buf(T);
    let t = U(R, 1, 6);
    while (t < L - 8) { const h = horsePass(R); every(L, T, t, tt => add(ev, h, tt, U(R, 0.35, 0.6))); t += U(R, 9, 15); }
    const b = filt(bell(U(R, 200, 260)), "lp", 3000, 0.7);
    const bt = U(R, 2, L * 0.5);
    for (let k = 0; k < 3; k++) every(L, T, bt + k * 2.2, tt => add(ev, b, tt, 0.18));
    return { bed, ev: reverb(ev, { room: 0.45, wet: 0.2 }) };
  },
  templo(R, T, L) {
    /* Coro sin palabras sobre acordes lentos, en una nave enorme */
    const ev = buf(T), chords = [[50, 57, 62, 65, 69], [46, 53, 58, 62, 65], [48, 55, 60, 64, 67], [45, 52, 57, 60, 64]];
    const step = L / chords.length;
    chords.forEach((ch, k) => {
      for (const m of ch) {
        const v = choirNote(R, m, step + 1.5);
        every(L, T, k * step, tt => add(ev, v, tt, 0.22));
      }
    });
    const b = bell(U(R, 180, 220));
    every(L, T, U(R, 2, L - 8), tt => add(ev, b, tt, 0.25));
    return { ev: reverb(ev, { room: 0.95, damp: 0.25, wet: 0.75, dry: 0.45, pre: 0.03 }) };
  },
  barco(R, T, L) {
    const bed = buf(T), pn = pink(R), lp = new Biquad("lp", 500, 0.7), sw = wander(R, 5, 0.3, 1);
    for (let i = 0; i < bed.length; i++) bed[i] = lp.tick(pn()) * sw(i / SR) * 1.2;
    mixInto(bed, wind(R, T, { lo: 400, hi: 1000, gust: 5, whistle: 0.3, rumble: 0.2 }), 0.3);
    const ev = buf(T);
    for (let t = U(R, 0, 1); t < L - 1; t += U(R, 1.2, 3.5)) { const c = creak(R); every(L, T, t, tt => add(ev, c, tt, U(R, 0.25, 0.8))); }
    for (const t of times(R, L, 0.4)) {
      const x = buf(0.3), pn2 = pink(R), bp = new Biquad("bp", U(R, 500, 1100), 1);
      for (let i = 0; i < x.length; i++) x[i] = bp.tick(pn2()) * Math.exp(-i / SR / 0.06);
      every(L, T, t, tt => add(ev, x, tt, U(R, 0.3, 0.7)));
    }
    return { bed, ev: reverb(ev, { room: 0.45, damp: 0.6, wet: 0.2 }) };
  },
  alcantarillas(R, T, L) {
    const bed = buf(T), pn = pink(R), bp = new Biquad("bp", 650, 0.6), g = wander(R, 2, 0.6, 1);
    for (let i = 0; i < bed.length; i++) bed[i] = bp.tick(pn()) * g(i / SR);
    const ev = buf(T);
    drops(R, L, T, ev, 60, { f: [300, 1200], dec: [0.01, 0.04], amp: 0.6, rise: [0.4, 1.2] });
    for (let t = U(R, 0, 2); t < L; t += U(R, 1, 3.5)) { const s = bubble(U(R, 1300, 2800), U(R, 0.02, 0.05), 0.6, 1); every(L, T, t, tt => add(ev, s, tt, U(R, 0.2, 0.7))); }
    /* Ratas */
    for (let t = U(R, 3, 8); t < L - 1; t += U(R, 10, 16)) {
      for (let k = 0; k < 3; k++) {
        const x = buf(0.05), f = U(R, 4500, 6500); let ph = 0;
        for (let i = 0; i < x.length; i++) { const u = i / x.length; ph += TAU * f * (1 + 0.3 * u) / SR; x[i] = Math.sin(ph) * Math.sin(Math.PI * u); }
        every(L, T, t + k * U(R, 0.08, 0.16), tt => add(ev, x, tt, 0.12));
      }
    }
    return { bed: reverb(bed, { room: 0.85, wet: 0.3 }), ev: reverb(ev, { room: 0.9, damp: 0.3, wet: 0.55 }) };
  },
  mazmorra(R, T, L) {
    const bed = buf(T), bn = brown(R), pn = pink(R), lp = new Biquad("lp", 120, 0.7), bp = new Biquad("bp", 300, 1), g = wander(R, 7, 0.3, 1);
    for (let i = 0; i < bed.length; i++) {
      const t = i / SR;
      bed[i] = Math.sin(TAU * 55 * t) * 0.12 + Math.sin(TAU * 57.7 * t) * 0.1 + lp.tick(bn()) * 0.6 + bp.tick(pn()) * 0.15 * g(t);
    }
    const ev = buf(T);
    for (let t = U(R, 0, 2); t < L; t += U(R, 2.5, 6)) { const s = bubble(U(R, 1300, 2600), U(R, 0.02, 0.05), 0.6, 1); every(L, T, t, tt => add(ev, s, tt, U(R, 0.2, 0.6))); }
    for (let t = U(R, 2, 6); t < L - 2; t += U(R, 10, 15)) { const c = chains(R); every(L, T, t, tt => add(ev, filt(c, "lp", 3500, 0.7), tt, U(R, 0.25, 0.5))); }
    const door = creak(R, { lo: 10, hi: 45, f: U(R, 300, 500), d: U(R, 1.4, 2.2) });
    every(L, T, U(R, L * 0.3, L * 0.7), tt => add(ev, door, tt, 0.4));
    return { bed: reverb(bed, { room: 0.8, wet: 0.15 }), ev: reverb(ev, { room: 0.92, damp: 0.35, wet: 0.6, dry: 0.5 }) };
  },
  cripta(R, T, L) {
    const bed = buf(T), pn = pink(R), p2 = pink(R), b1 = new Biquad(), b2 = new Biquad();
    const c1 = wander(R, 4, 220, 480), c2 = wander(R, 5, 300, 650), g1 = wander(R, 3.5, 0.1, 1), g2 = wander(R, 4.5, 0.1, 0.8);
    for (let i = 0; i < bed.length; i++) {
      const t = i / SR;
      if ((i & 63) === 0) { b1.set("bp", c1(t), 9); b2.set("bp", c2(t), 11); }
      bed[i] = (b1.tick(pn()) * g1(t) + b2.tick(p2()) * g2(t)) * 3 + Math.sin(TAU * 41.2 * t) * 0.1;
    }
    const ev = buf(T);
    for (let t = U(R, 1, 4); t < L - 3; t += U(R, 5, 9)) { const w = whispers(R); every(L, T, t, tt => add(ev, w, tt, U(R, 0.15, 0.35))); }
    const b = filt(bell(U(R, 95, 120), 9), "lp", 1800, 0.7);
    every(L, T, U(R, 3, L - 9), tt => add(ev, b, tt, 0.2));
    return { bed: reverb(bed, { room: 0.85, wet: 0.35 }), ev: reverb(ev, { room: 0.95, damp: 0.3, wet: 0.7, dry: 0.4 }) };
  },
  biblioteca(R, T, L) {
    const bed = buf(T), pn = pink(R), lp = new Biquad("lp", 400, 0.7);
    for (let i = 0; i < bed.length; i++) bed[i] = lp.tick(pn()) * 0.12;
    mixInto(bed, fireBed(R, T, { rumble: 0.3, hiss: 0.03, roar: 0.05 }), 0.12);
    const ev = buf(T);
    /* Reloj: tic, tac */
    for (let k = 0; k < Math.round(L); k++) { const s = click(R, k % 2 ? 2200 : 2550, 9, 0.012, 1); every(L, T, k, tt => add(ev, s, tt, 0.12)); }
    /* Páginas */
    for (let t = U(R, 1, 4); t < L - 1; t += U(R, 5, 10)) {
      const d = U(R, 0.3, 0.6), x = buf(d), pn2 = pink(R), hp = new Biquad("hp", 1500, 0.7);
      for (let i = 0; i < x.length; i++) { const u = i / x.length; x[i] = hp.tick(pn2()) * Math.pow(Math.sin(Math.PI * u), 1.5) * (1 + (R() < 0.01 ? 3 : 0)); }
      every(L, T, t, tt => add(ev, x, tt, 0.6));
    }
    /* Pluma sobre el papel */
    for (let t = U(R, 2, 6); t < L - 3; t += U(R, 7, 12)) {
      const d = U(R, 1, 2.2), x = buf(d), wn = white(R), bp = new Biquad("bp", 4200, 2), r = U(R, 12, 22);
      for (let i = 0; i < x.length; i++) { const tt = i / SR; x[i] = bp.tick(wn()) * Math.pow(Math.max(0, Math.sin(TAU * r * tt)), 3) * Math.sin(Math.PI * tt / d); }
      every(L, T, t, tt => add(ev, x, tt, 0.18));
    }
    return { bed, ev: reverb(ev, { room: 0.6, damp: 0.5, wet: 0.25 }) };
  },
  magia(R, T, L) {
    const bed = buf(T), pn = pink(R), bp = new Biquad(), sweep = wander(R, 5, 300, 3000);
    const tones = [110, 165, 220, 277.18, 330, 440].map(f => ({ f, d: U(R, 0.3, 1.1), g: wander(R, 4, 0.2, 1), p: R() * TAU }));
    for (let i = 0; i < bed.length; i++) {
      const t = i / SR;
      if ((i & 63) === 0) bp.set("bp", sweep(t), 3);
      let s = 0;
      for (const o of tones) s += (Math.sin(TAU * o.f * t + o.p) + Math.sin(TAU * (o.f + o.d) * t)) * o.g(t) * (110 / o.f);
      bed[i] = s * 0.12 + bp.tick(pn()) * 0.5 + Math.sin(TAU * 55 * t) * 0.12 * (0.6 + 0.4 * Math.sin(TAU * 0.25 * t));
    }
    const ev = buf(T), pent = [69, 71, 73, 76, 78].flatMap(m => [m + 12, m + 24]);
    for (const t of times(R, L, 2.5)) {
      const f = 440 * Math.pow(2, (pick(R, pent) - 69) / 12);
      const s = partials(f, [[1, 1, U(R, 0.3, 0.8)], [2, 0.2, 0.3], [3.01, 0.08, 0.15]], 2);
      every(L, T, t, tt => add(ev, s, tt, U(R, 0.05, 0.25)));
    }
    return { bed: reverb(bed, { room: 0.85, wet: 0.35 }), ev: reverb(ev, { room: 0.92, damp: 0.2, wet: 0.7, dry: 0.5 }) };
  }
};

/* Una nota del coro del templo: dos voces «aah» */
function choirNote(R, m, dur) { return choir(R, mtof(m), dur, { att: 2, rel: 2.5 }); }
