/* Ambientes: clima, naturaleza, fuego, lugares, subterráneo y magia.
   Cada escena devuelve { bed, ev } de T segundos: lo continuo y los sucesos,
   estos repetidos cada L segundos para que el bucle cierre sin costura.
   Todo en estéreo: los lechos se generan una vez por oído (wide) y cada
   suceso cae en su sitio del panorama. */

import {
  SR, TAU, U, pick, buf, sbuf, wide, setSpread, white, pink, brown, Biquad, filt, wander, add, mixInto, scale, every, times,
  reverb, bubble, bubbles, grain, drip, rainGrains, click, partials, fadeOut, sawOsc, talker, laughter, whisper, murmur, bell, choir, mtof
} from "./dsp.mjs";

/* ---------- Piezas que comparten varias escenas ---------- */

/* Lecho de lluvia: siseo ancho y miles de gotas pequeñas */
function rainBed(R, T, { lo = 400, hi = 7000, level = 1 } = {}) {
  const x = buf(T), pn = pink(R), hp = new Biquad("hp", lo, 0.6), lp = new Biquad("lp", hi, 0.6), g = wander(R, 5, 0.8, 1);
  for (let i = 0; i < x.length; i++) x[i] = lp.tick(hp.tick(pn())) * g(i / SR) * level;
  return x;
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
/* Gente: muchas voces a distintas distancias, cada una en su sitio. Las
   lejanas pierden agudos y fuerza; ninguna está tan cerca como para
   entenderse. */
function crowd(R, T, n, { men = 0.55, near = 0.3, talk = 0.55 } = {}) {
  const x = sbuf(T);
  for (let k = 0; k < n; k++) {
    const female = R() > men, f0 = female ? U(R, 165, 235) : U(R, 88, 140);
    const dist = U(R, near, 1);
    const v = filt(talker(R, T, { f0, female, talk }), "lp", 5200 - 3600 * dist, 0.7);
    add(x, v, 0, 0.95 - 0.7 * dist);
  }
  return x;
}
/* Lo que suena en una taberna además de la gente */
function mug(R) {           // jarra de madera o de barro contra la mesa
  const x = buf(0.4), f = U(R, 280, 620);
  add(x, click(R, f, 2.2, U(R, 0.012, 0.03), 1), 0);
  add(x, partials(f * U(R, 1.6, 2.2), [[1, 0.35, 0.04], [2.3, 0.15, 0.02]], 0.3), 0.001, 1);
  return x;
}
function clink(R) {         // vasos o botellas que chocan
  const x = buf(0.6), f = U(R, 1900, 3400);
  add(x, partials(f, [[1, 1, U(R, 0.05, 0.15)], [2.32, 0.45, 0.07], [3.9, 0.25, 0.04]], 0.6), 0, 1);
  if (R() < 0.5) add(x, partials(f * U(R, 0.92, 1.08), [[1, 0.6, 0.1], [2.4, 0.3, 0.05]], 0.4), U(R, 0.05, 0.12), 0.7);
  return x;
}
function scrape(R) {        // una silla que se arrastra
  const d = U(R, 0.3, 0.8), x = buf(d), bp = new Biquad(), r = U(R, 35, 70), f0 = U(R, 350, 600);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const u = i / x.length;
    if ((i & 31) === 0) bp.set("bp", f0 * (1 + 0.6 * u), 5);
    ph += r * (1 + 0.3 * Math.sin(TAU * 3 * u)) / SR;
    const stick = ph % 1 < 0.2 ? 1 : 0.2;
    x[i] = bp.tick((R() * 2 - 1) * stick) * Math.sin(Math.PI * u) * 2;
  }
  return x;
}
function steps(R) {         // pasos sobre tablas
  const k = 3 + Math.floor(R() * 5), x = buf(k * 0.55 + 0.3);
  for (let j = 0; j < k; j++) add(x, click(R, U(R, 140, 260), 1.5, U(R, 0.03, 0.06), U(R, 0.6, 1)), j * U(R, 0.48, 0.6));
  if (R() < 0.4) add(x, creak(R, { lo: 20, hi: 50, f: U(R, 500, 900), d: 0.3 }), U(R, 0, k * 0.5), 0.3);
  return filt(x, "lp", 2500, 0.7);
}
/* Cuervo: un graznido áspero, con ruido y aspereza, que cae de tono */
function caw(R, f0) {
  const d = U(R, 0.22, 0.34), x = buf(d), osc = sawOsc(), b1 = new Biquad("bp", 1250, 2.5), b2 = new Biquad("bp", 2400, 3), wn = white(R);
  for (let i = 0; i < x.length; i++) {
    const u = i / x.length, rough = 0.6 + 0.4 * Math.sin(TAU * U(R, 60, 80) * i / SR);
    const s = (osc(f0 * (1.1 - 0.25 * u)) * 0.7 + wn() * 0.5) * rough;
    x[i] = (b1.tick(s) + b2.tick(s) * 0.6) * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.25)), 0.7);
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
    setSpread(1);
    const bed = wide(R, 1, r => rainBed(r, T, { lo: 500, hi: 9000, level: 0.35 })), ev = sbuf(T);
    rainGrains(R, L, T, ev, 2600, { amp: 0.3 });                                     // miles de gotas finas
    rainGrains(R, L, T, ev, 110, { f: [500, 3000], tau: [0.001, 0.004], amp: 0.55 });  // gotas gordas en hojas y tierra
    bubbles(R, L, T, ev, 30, { r: [1, 4], amp: 0.12 });                               // charcos
    for (const t of times(R, L, 0.4)) { const s = drip(R, { amp: U(R, 0.1, 0.3) }); every(L, T, t, tt => add(ev, s, tt)); }
    return { bed, ev: reverb(ev, { room: 0.35, wet: 0.12 }) };
  },
  tormenta(R, T, L) {
    setSpread(1);
    const bed = wide(R, 1, r => mixInto(rainBed(r, T, { lo: 300, hi: 9000, level: 0.5 }), wind(r, T, { lo: 250, hi: 700, gust: 4, whistle: 0.2, rumble: 0.6 }), 0.6));
    const ev = sbuf(T);
    rainGrains(R, L, T, ev, 4200, { amp: 0.32 });
    rainGrains(R, L, T, ev, 220, { f: [500, 3000], tau: [0.001, 0.004], amp: 0.6 });
    bubbles(R, L, T, ev, 60, { r: [1, 4], amp: 0.12 });
    let t = U(R, 1, 4);
    while (t < L - 2) { const th = thunder(R); th.pan = U(R, -0.6, 0.6); every(L, T, t, tt => add(ev, th, tt, U(R, 0.6, 1.3))); t += U(R, 8, 16); }
    return { bed, ev: reverb(ev, { room: 0.6, wet: 0.2 }) };
  },
  "lluvia-dentro"(R, T, L) {
    setSpread(0.9);
    const bed = wide(R, 1, r => rainBed(r, T, { lo: 100, hi: 1200, level: 0.5 })), roof = sbuf(T);
    rainGrains(R, L, T, roof, 1400, { f: [300, 1500], tau: [0.001, 0.004], amp: 0.45 });
    filt(roof, "lp", 1800, 0.7);
    /* Una gotera que cae en un cubo, con su ritmo un poco irregular */
    const ev = sbuf(T);
    setSpread(0.3);
    const f0 = U(R, 1100, 1700);
    for (let t = U(R, 0, 1); t < L - 0.5; t += U(R, 1.1, 1.6)) { const s = drip(R, { f0: f0 * U(R, 0.93, 1.07), amp: U(R, 0.35, 0.55) }); every(L, T, t, tt => add(ev, s, tt)); }
    mixInto(ev, roof);
    return { bed, ev: reverb(ev, { room: 0.5, damp: 0.5, wet: 0.3 }) };
  },
  viento(R, T) {
    return { bed: wide(R, 1, r => wind(r, T, { lo: 280, hi: 850, gust: 6, whistle: 0.12 })) };
  },
  ventisca(R, T) {
    return { bed: wide(R, 1, r => wind(r, T, { lo: 450, hi: 1500, q: 1, gust: 3, whistle: 0.35, rumble: 0.5, floor: 0.4, hiss: 0.35 })) };
  },
  "bosque-dia"(R, T, L) {
    setSpread(1);
    const bed = scale(wide(R, 1, r => wind(r, T, { lo: 1500, hi: 4000, q: 0.5, gust: 7, whistle: 0, rumble: 0.1, floor: 0.15 })), 0.35);
    const ev = sbuf(T);
    birds(R, L, T, ev, 7);
    /* Un pájaro carpintero lejano */
    const peck = buf(1.2);
    for (let k = 0; k < 16; k++) add(peck, click(R, 1400, 4, 0.008, 1 - k / 18), k * 0.055);
    every(L, T, U(R, 5, L - 3), tt => add(ev, peck, tt, 0.25));
    return { bed, ev: reverb(ev, { room: 0.55, damp: 0.5, wet: 0.25 }) };
  },
  "bosque-oscuro"(R, T, L) {
    setSpread(1);
    const bed = wide(R, 1, r => mixInto(wind(r, T, { lo: 200, hi: 600, gust: 7, whistle: 0.08, rumble: 0.5 }), wind(r, T, { lo: 2000, hi: 4500, q: 0.5, gust: 5, whistle: 0, rumble: 0 }), 0.25));
    const ev = sbuf(T);
    for (let t = U(R, 1, 5); t < L - 2; t += U(R, 7, 13)) {
      const n = 2 + Math.floor(R() * 3), g = U(R, 0.3, 0.9), f0 = U(R, 480, 640), pan = U(R, -0.9, 0.9);
      for (let k = 0; k < n; k++) { const x = caw(R, f0); x.pan = pan; every(L, T, t + k * U(R, 0.38, 0.5), tt => add(ev, x, tt, g)); }
    }
    for (let t = U(R, 3, 8); t < L - 2; t += U(R, 6, 11)) { const c = creak(R, { lo: 8, hi: 30, f: U(R, 250, 500), d: U(R, 0.8, 1.8) }); every(L, T, t, tt => add(ev, c, tt, U(R, 0.2, 0.5))); }
    const o = owl(R, U(R, 300, 360));
    every(L, T, U(R, 2, L - 4), tt => add(ev, o, tt, 0.3));
    return { bed, ev: reverb(ev, { room: 0.75, damp: 0.45, wet: 0.4 }) };
  },
  noche(R, T, L) {
    setSpread(1);
    const bed = scale(wide(R, 1, r => wind(r, T, { lo: 250, hi: 600, gust: 8, whistle: 0, rumble: 0.2, floor: 0.2 })), 0.3);
    const ev = sbuf(T);
    crickets(R, L, T, ev, 9);
    const o = owl(R);
    every(L, T, U(R, 3, L - 4), tt => add(ev, o, tt, 0.6));
    return { bed, ev: reverb(ev, { room: 0.6, damp: 0.5, wet: 0.25 }) };
  },
  arroyo(R, T, L) {
    setSpread(0.7);
    const bed = wide(R, 0.7, r => {
      const x = buf(T), pn = pink(r), bp = new Biquad("bp", 900, 0.5), g = wander(r, 2, 0.6, 1);
      for (let i = 0; i < x.length; i++) x[i] = bp.tick(pn()) * g(i / SR) * 0.25;
      return x;
    });
    const ev = sbuf(T);
    bubbles(R, L, T, ev, 750, { r: [0.4, 5], amp: 0.35, rise: [0.05, 0.5] });       // el agua que corre
    bubbles(R, L, T, ev, 7, { r: [6, 14], amp: 0.45, rise: [0.1, 0.4] });           // borboteos graves
    return { bed, ev: reverb(ev, { room: 0.35, wet: 0.12 }) };
  },
  cascada(R, T, L) {
    setSpread(0.8);
    const bed = wide(R, 0.9, r => {
      const x = buf(T), pn = pink(r), bn = brown(r), wn = white(r);
      const lp = new Biquad("lp", 5500, 0.6), lb = new Biquad("lp", 160, 0.7), hp = new Biquad("hp", 3000, 0.7), g = wander(r, 3, 0.85, 1);
      for (let i = 0; i < x.length; i++) x[i] = (lp.tick(pn()) + lb.tick(bn()) * 1.4 + hp.tick(wn()) * 0.12) * g(i / SR);
      return x;
    });
    const ev = sbuf(T);
    bubbles(R, L, T, ev, 1300, { r: [0.3, 4], amp: 0.18 });
    return { bed, ev: reverb(ev, { room: 0.5, wet: 0.2 }) };
  },
  mar(R, T, L) {
    setSpread(0.7);
    const bed = wide(R, 1, r => { const x = buf(T), bn = brown(r), lb = new Biquad("lp", 220, 0.7); for (let i = 0; i < x.length; i++) x[i] = lb.tick(bn()) * 0.5; return x; });
    const ev = sbuf(T);
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
    /* Espuma: burbujas que revientan tras cada ola */
    bubbles(R, L, T, ev, 200, { r: [0.3, 2], amp: 0.06 });
    for (let t = U(R, 2, 8); t < L - 2; t += U(R, 9, 16)) {
      const n = 2 + Math.floor(R() * 3), g = U(R, 0.08, 0.2), pan = U(R, -0.9, 0.9);
      for (let k = 0; k < n; k++) {
        const d = U(R, 0.25, 0.4), x = buf(d), osc = sawOsc(), bp = new Biquad("bp", 1900, 2);
        for (let i = 0; i < x.length; i++) {
          const u = i / x.length, f = u < 0.25 ? 900 + 700 * (u / 0.25) : 1600 - 650 * ((u - 0.25) / 0.75);
          x[i] = bp.tick(osc(f)) * Math.sin(Math.PI * u);
        }
        x.pan = pan;
        every(L, T, t + k * U(R, 0.35, 0.5), tt => add(ev, x, tt, g));
      }
    }
    return { bed, ev: reverb(ev, { room: 0.5, wet: 0.15 }) };
  },
  pantano(R, T, L) {
    setSpread(1);
    const bed = wide(R, 1, r => {
      const x = buf(T), wn = white(r), bp = new Biquad("bp", 6000, 3), ph = r() * TAU;
      for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = bp.tick(wn()) * (0.55 + 0.45 * Math.sin(TAU * 38 * t + ph)) * 0.12; }
      return mixInto(x, wind(r, T, { lo: 200, hi: 500, gust: 8, whistle: 0, rumble: 0.2 }), 0.25);
    });
    const ev = sbuf(T);
    for (let f = 0; f < 6; f++) {
      const fr = U(R, 230, 520), rate = U(R, 32, 55), g = U(R, 0.25, 1), pan = U(R, -1, 1);
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
        x.pan = pan;
        every(L, T, t, tt => add(ev, x, tt, g));
      }
    }
    for (let p = 0; p < 4; p++) {
      const f0 = U(R, 2500, 3200), g = U(R, 0.05, 0.15), pan = U(R, -1, 1);
      for (let t = U(R, 0, 1); t < L - 0.3; t += U(R, 0.8, 1.4)) {
        const x = buf(0.13); let ph = 0;
        for (let i = 0; i < x.length; i++) { const u = i / x.length; ph += TAU * f0 * (1 + 0.2 * u) / SR; x[i] = Math.sin(ph) * Math.sin(Math.PI * u); }
        x.pan = pan;
        every(L, T, t, tt => add(ev, x, tt, g));
      }
    }
    bubbles(R, L, T, ev, 0.8, { r: [8, 20], amp: 0.7, rise: [0.3, 1] });              // el lodo que borbotea
    return { bed, ev: reverb(ev, { room: 0.6, damp: 0.6, wet: 0.25 }) };
  },
  cueva(R, T, L) {
    setSpread(1);
    const bed = wide(R, 1, r => {
      const x = buf(T), bn = brown(r), pn = pink(r), lp = new Biquad("lp", 90, 0.7), bp = new Biquad("bp", 350, 0.7), g = wander(r, 6, 0.4, 1);
      for (let i = 0; i < x.length; i++) x[i] = lp.tick(bn()) * 0.8 + bp.tick(pn()) * 0.25 * g(i / SR);
      return x;
    });
    const ev = sbuf(T);
    for (let t = U(R, 0, 1); t < L; t += U(R, 0.5, 2.6)) {
      const far = R(), s = filt(drip(R), "lp", 9000 - 6500 * far, 0.7);
      every(L, T, t, tt => add(ev, s, tt, 1 - 0.8 * far));
    }
    return { bed: reverb(bed, { room: 0.8, wet: 0.2 }), ev: reverb(ev, { room: 0.93, damp: 0.25, wet: 0.65, dry: 0.5, pre: 0.02 }) };
  },
  hoguera(R, T, L) {
    setSpread(0.4);
    const bed = wide(R, 0.5, r => fireBed(r, T)), ev = sbuf(T);
    crackles(R, L, T, ev, 14);
    return { bed, ev };
  },
  antorchas(R, T, L) {
    setSpread(0.6);
    const bed = wide(R, 0.6, r => fireBed(r, T, { rumble: 0.5, hiss: 0.1, roar: 0.9 })), ev = sbuf(T);
    crackles(R, L, T, ev, 3, { amp: 0.5, pops: 0.1 });
    return { bed: reverb(bed, { room: 0.5, wet: 0.15 }), ev: reverb(ev, { room: 0.5, wet: 0.2 }) };
  },
  campamento(R, T, L) {
    setSpread(0.4);
    const bed = wide(R, 0.7, r => mixInto(fireBed(r, T, { rumble: 0.8 }), wind(r, T, { lo: 250, hi: 600, gust: 8, whistle: 0, rumble: 0.2 }), 0.25));
    const ev = sbuf(T);
    crackles(R, L, T, ev, 10);
    setSpread(1);
    const cr = sbuf(T);
    crickets(R, L, T, cr, 6, 0.35);
    mixInto(ev, reverb(cr, { room: 0.6, wet: 0.25 }));
    return { bed, ev };
  },
  forja(R, T, L) {
    setSpread(0.5);
    const bed = scale(wide(R, 0.5, r => fireBed(r, T, { rumble: 1, roar: 0.6 })), 0.5), ev = sbuf(T);
    let t = U(R, 0.3, 1.5);
    while (t < L - 2) {
      const n = 3 + Math.floor(R() * 4), f0 = U(R, 700, 1050), pan = U(R, -0.3, 0.3);
      for (let k = 0; k < n; k++) {
        const soft = k === n - 1 && R() < 0.5;
        const s = partials(f0 * U(R, 0.99, 1.01), [[1, 1, 1.1], [2.76, 0.6, 0.55], [5.4, 0.35, 0.3], [8.93, 0.2, 0.15]], 1.6);
        add(s, click(R, 3000, 1, 0.004, 1.2), 0);
        s.pan = pan;
        every(L, T, t, tt => add(ev, s, tt, soft ? 0.35 : U(R, 0.7, 1)));
        t += U(R, 0.42, 0.6);
      }
      t += U(R, 2, 4.5);
    }
    for (let b = U(R, 1, 4); b < L - 2; b += U(R, 6, 9)) {
      const x = buf(1.4), pn = pink(R), lp = new Biquad("lp", 700, 0.7);
      for (let i = 0; i < x.length; i++) x[i] = lp.tick(pn()) * Math.sin(Math.PI * i / x.length);
      every(L, T, b, tt => add(ev, x, tt, 0.7));
    }
    /* Temple: el hierro al rojo en el agua sisea y burbujea */
    const q = buf(3), wn = white(R), hp = new Biquad("hp", 2500, 0.7);
    for (let i = 0; i < q.length; i++) { const tt = i / SR; q[i] = hp.tick(wn()) * Math.min(1, tt / 0.04) * Math.exp(-tt / 0.9) * (0.8 + 0.2 * Math.sin(TAU * 31 * tt)); }
    const qt = U(R, L * 0.4, L * 0.8);
    every(L, T, qt, tt => add(ev, q, tt, 0.5));
    for (const t2 of times(R, 1.5, 120)) { const b = bubble(U(R, 600, 2500), { amp: U(R, 0.05, 0.2), rise: 0.3 }); every(L, T, qt + t2, tt => add(ev, b, tt)); }
    return { bed, ev: reverb(ev, { room: 0.5, damp: 0.5, wet: 0.22 }) };
  },
  lava(R, T, L) {
    setSpread(0.7);
    const bed = wide(R, 0.8, r => {
      const x = buf(T), bn = brown(r), b2 = brown(r), l1 = new Biquad("lp", 70, 0.7), l2 = new Biquad("lp", 200, 0.7), g = wander(r, 2, 0.5, 1);
      for (let i = 0; i < x.length; i++) x[i] = l1.tick(bn()) * g(i / SR) * 2 + l2.tick(b2()) * 0.5;
      return x;
    });
    const ev = sbuf(T);
    for (const t of times(R, L, 3)) { const s = bubble(U(R, 60, 200), { amp: U(R, 0.4, 1), rise: U(R, 0.5, 1.5), slow: U(R, 1, 2) }); every(L, T, t, tt => add(ev, s, tt)); }
    for (let t = U(R, 1, 5); t < L - 2; t += U(R, 6, 10)) {
      const x = buf(1.6), wn = white(R), hp = new Biquad("hp", 3000, 0.7), d = U(R, 0.6, 1.4);
      for (let i = 0; i < x.length; i++) { const tt = i / SR; x[i] = hp.tick(wn()) * Math.min(1, tt / 0.05) * Math.exp(-tt / d); }
      every(L, T, t, tt => add(ev, x, tt, 0.25));
    }
    return { bed, ev: reverb(ev, { room: 0.6, wet: 0.25 }) };
  },
  taberna(R, T, L) {
    setSpread(0.9);
    const people = mixInto(crowd(R, T, 22), wide(R, 1, r => murmur(r, T, { voices: 14 })), 0.5);
    const bed = reverb(people, { room: 0.5, damp: 0.6, wet: 0.3, pre: 0.012 });
    mixInto(bed, wide(R, 0.4, r => fireBed(r, T, { rumble: 0.5, hiss: 0.05, roar: 0.1 })), 0.06);
    const ev = sbuf(T);
    for (const t of times(R, L, 0.9)) { const s = mug(R); every(L, T, t, tt => add(ev, s, tt, U(R, 0.15, 0.5))); }
    for (const t of times(R, L, 0.25)) { const s = clink(R); every(L, T, t, tt => add(ev, s, tt, U(R, 0.1, 0.3))); }
    for (const t of times(R, L, 0.08)) { const s = scrape(R); every(L, T, t, tt => add(ev, s, tt, U(R, 0.15, 0.35))); }
    for (const t of times(R, L, 0.07)) { const s = steps(R); every(L, T, t, tt => add(ev, s, tt, U(R, 0.25, 0.5))); }
    for (let t = U(R, 3, 9); t < L - 3; t += U(R, 8, 14)) { const s = filt(laughter(R), "lp", U(R, 2500, 4500), 0.7); every(L, T, t, tt => add(ev, s, tt, U(R, 0.25, 0.5))); }
    return { bed, ev: reverb(ev, { room: 0.5, damp: 0.55, wet: 0.3 }) };
  },
  ciudad(R, T, L) {
    setSpread(1);
    const people = mixInto(crowd(R, T, 26, { near: 0.45, talk: 0.65 }), wide(R, 1, r => murmur(r, T, { voices: 20, cut: 1500 })), 0.7);
    const bed = reverb(people, { room: 0.3, wet: 0.1 });
    mixInto(bed, wide(R, 1, r => wind(r, T, { lo: 300, hi: 700, gust: 8, whistle: 0, rumble: 0.2 })), 0.12);
    const ev = sbuf(T);
    let t = U(R, 1, 6);
    while (t < L - 8) { const h = horsePass(R); every(L, T, t, tt => add(ev, h, tt, U(R, 0.35, 0.6))); t += U(R, 9, 15); }
    const b = filt(bell(U(R, 200, 260)), "lp", 3000, 0.7);
    b.pan = U(R, -0.5, 0.5);
    const bt = U(R, 2, L * 0.5);
    for (let k = 0; k < 3; k++) every(L, T, bt + k * 2.2, tt => add(ev, b, tt, 0.18));
    for (let t2 = U(R, 4, 10); t2 < L - 3; t2 += U(R, 10, 18)) { const s = filt(laughter(R), "lp", 3000, 0.7); every(L, T, t2, tt => add(ev, s, tt, 0.2)); }
    return { bed, ev: reverb(ev, { room: 0.45, wet: 0.2 }) };
  },
  templo(R, T, L) {
    /* Coro sin palabras sobre acordes lentos, en una nave enorme */
    setSpread(0.8);
    const ev = sbuf(T), chords = [[50, 57, 62, 65, 69], [46, 53, 58, 62, 65], [48, 55, 60, 64, 67], [45, 52, 57, 60, 64]];
    const step = L / chords.length;
    chords.forEach((ch, k) => {
      ch.forEach((m, j) => {
        const v = choirNote(R, m, step + 1.5);
        v.pan = (j / (ch.length - 1)) * 1.4 - 0.7;
        every(L, T, k * step, tt => add(ev, v, tt, 0.22));
      });
    });
    const b = bell(U(R, 180, 220));
    every(L, T, U(R, 2, L - 8), tt => add(ev, b, tt, 0.25));
    return { ev: reverb(ev, { room: 0.95, damp: 0.25, wet: 0.75, dry: 0.45, pre: 0.03 }) };
  },
  barco(R, T, L) {
    setSpread(1);
    const bed = wide(R, 1, r => {
      const x = buf(T), pn = pink(r), lp = new Biquad("lp", 500, 0.7), sw = wander(r, 5, 0.3, 1);
      for (let i = 0; i < x.length; i++) x[i] = lp.tick(pn()) * sw(i / SR) * 1.2;
      return mixInto(x, wind(r, T, { lo: 400, hi: 1000, gust: 5, whistle: 0.3, rumble: 0.2 }), 0.3);
    });
    const ev = sbuf(T);
    for (let t = U(R, 0, 1); t < L - 1; t += U(R, 1.2, 3.5)) { const c = creak(R); every(L, T, t, tt => add(ev, c, tt, U(R, 0.25, 0.8))); }
    for (const t of times(R, L, 0.4)) {
      const x = buf(0.3), pn2 = pink(R), bp = new Biquad("bp", U(R, 500, 1100), 1);
      for (let i = 0; i < x.length; i++) x[i] = bp.tick(pn2()) * Math.exp(-i / SR / 0.06);
      every(L, T, t, tt => add(ev, x, tt, U(R, 0.3, 0.7)));
    }
    bubbles(R, L, T, ev, 80, { r: [0.5, 4], amp: 0.08 });
    return { bed, ev: reverb(ev, { room: 0.45, damp: 0.6, wet: 0.2 }) };
  },
  alcantarillas(R, T, L) {
    setSpread(0.8);
    const bed = wide(R, 0.8, r => {
      const x = buf(T), pn = pink(r), bp = new Biquad("bp", 650, 0.6), g = wander(r, 2, 0.6, 1);
      for (let i = 0; i < x.length; i++) x[i] = bp.tick(pn()) * g(i / SR) * 0.4;
      return x;
    });
    const ev = sbuf(T);
    bubbles(R, L, T, ev, 320, { r: [0.6, 7], amp: 0.3 });
    for (let t = U(R, 0, 2); t < L; t += U(R, 1, 3.5)) { const s = drip(R, { amp: U(R, 0.2, 0.7) }); every(L, T, t, tt => add(ev, s, tt)); }
    for (let t = U(R, 3, 8); t < L - 1; t += U(R, 10, 16)) {
      const pan = U(R, -1, 1);
      for (let k = 0; k < 3; k++) {
        const x = buf(0.05), f = U(R, 4500, 6500); let ph = 0;
        for (let i = 0; i < x.length; i++) { const u = i / x.length; ph += TAU * f * (1 + 0.3 * u) / SR; x[i] = Math.sin(ph) * Math.sin(Math.PI * u); }
        x.pan = pan;
        every(L, T, t + k * U(R, 0.08, 0.16), tt => add(ev, x, tt, 0.12));
      }
    }
    return { bed: reverb(bed, { room: 0.85, wet: 0.3 }), ev: reverb(ev, { room: 0.9, damp: 0.3, wet: 0.55 }) };
  },
  mazmorra(R, T, L) {
    setSpread(1);
    const bed = wide(R, 0.8, r => {
      const x = buf(T), bn = brown(r), pn = pink(r), lp = new Biquad("lp", 120, 0.7), bp = new Biquad("bp", 300, 1), g = wander(r, 7, 0.3, 1);
      for (let i = 0; i < x.length; i++) {
        const t = i / SR;
        x[i] = Math.sin(TAU * 55 * t) * 0.12 + Math.sin(TAU * 57.7 * t) * 0.1 + lp.tick(bn()) * 0.6 + bp.tick(pn()) * 0.15 * g(t);
      }
      return x;
    });
    const ev = sbuf(T);
    for (let t = U(R, 0, 2); t < L; t += U(R, 2.5, 6)) { const s = filt(drip(R), "lp", U(R, 3000, 8000), 0.7); every(L, T, t, tt => add(ev, s, tt, U(R, 0.2, 0.6))); }
    for (let t = U(R, 2, 6); t < L - 2; t += U(R, 10, 15)) { const c = filt(chains(R), "lp", 3500, 0.7); every(L, T, t, tt => add(ev, c, tt, U(R, 0.25, 0.5))); }
    const door = creak(R, { lo: 10, hi: 45, f: U(R, 300, 500), d: U(R, 1.4, 2.2) });
    every(L, T, U(R, L * 0.3, L * 0.7), tt => add(ev, door, tt, 0.4));
    return { bed: reverb(bed, { room: 0.8, wet: 0.15 }), ev: reverb(ev, { room: 0.92, damp: 0.35, wet: 0.6, dry: 0.5, pre: 0.02 }) };
  },
  cripta(R, T, L) {
    setSpread(1);
    const bed = wide(R, 1, r => {
      const x = buf(T), pn = pink(r), p2 = pink(r), b1 = new Biquad(), b2 = new Biquad();
      const c1 = wander(r, 4, 220, 480), c2 = wander(r, 5, 300, 650), g1 = wander(r, 3.5, 0.1, 1), g2 = wander(r, 4.5, 0.1, 0.8);
      for (let i = 0; i < x.length; i++) {
        const t = i / SR;
        if ((i & 63) === 0) { b1.set("bp", c1(t), 9); b2.set("bp", c2(t), 11); }
        x[i] = (b1.tick(pn()) * g1(t) + b2.tick(p2()) * g2(t)) * 3 + Math.sin(TAU * 41.2 * t) * 0.1;
      }
      return x;
    });
    const ev = sbuf(T);
    for (let t = U(R, 1, 4); t < L - 3; t += U(R, 5, 9)) { const w = whisper(R, 3 + Math.floor(R() * 7)); every(L, T, t, tt => add(ev, w, tt, U(R, 0.25, 0.5))); }
    const b = filt(bell(U(R, 95, 120), 9), "lp", 1800, 0.7);
    every(L, T, U(R, 3, L - 9), tt => add(ev, b, tt, 0.2));
    return { bed: reverb(bed, { room: 0.85, wet: 0.35 }), ev: reverb(ev, { room: 0.95, damp: 0.3, wet: 0.7, dry: 0.4 }) };
  },
  biblioteca(R, T, L) {
    setSpread(0.6);
    const bed = wide(R, 0.6, r => {
      const x = buf(T), pn = pink(r), lp = new Biquad("lp", 400, 0.7);
      for (let i = 0; i < x.length; i++) x[i] = lp.tick(pn()) * 0.12;
      return mixInto(x, fireBed(r, T, { rumble: 0.3, hiss: 0.03, roar: 0.05 }), 0.12);
    });
    const ev = sbuf(T);
    const clockPan = U(R, -0.6, 0.6);
    for (let k = 0; k < Math.round(L); k++) { const s = click(R, k % 2 ? 2200 : 2550, 9, 0.012, 1); s.pan = clockPan; every(L, T, k, tt => add(ev, s, tt, 0.12)); }
    for (let t = U(R, 1, 4); t < L - 1; t += U(R, 5, 10)) {
      const d = U(R, 0.3, 0.6), x = buf(d), pn2 = pink(R), hp = new Biquad("hp", 1500, 0.7);
      for (let i = 0; i < x.length; i++) { const u = i / x.length; x[i] = hp.tick(pn2()) * Math.pow(Math.sin(Math.PI * u), 1.5) * (1 + (R() < 0.01 ? 3 : 0)); }
      every(L, T, t, tt => add(ev, x, tt, 0.6));
    }
    for (let t = U(R, 2, 6); t < L - 3; t += U(R, 7, 12)) {
      const d = U(R, 1, 2.2), x = buf(d), wn = white(R), bp = new Biquad("bp", 4200, 2), r = U(R, 12, 22);
      for (let i = 0; i < x.length; i++) { const tt = i / SR; x[i] = bp.tick(wn()) * Math.pow(Math.max(0, Math.sin(TAU * r * tt)), 3) * Math.sin(Math.PI * tt / d); }
      every(L, T, t, tt => add(ev, x, tt, 0.18));
    }
    return { bed, ev: reverb(ev, { room: 0.6, damp: 0.5, wet: 0.25 }) };
  },
  magia(R, T, L) {
    setSpread(0.9);
    const bed = wide(R, 0.7, r => {
      const x = buf(T), pn = pink(r), bp = new Biquad(), sweep = wander(r, 5, 300, 3000);
      const tones = [110, 165, 220, 277.18, 330, 440].map(f => ({ f, d: U(r, 0.3, 1.1), g: wander(r, 4, 0.2, 1), p: r() * TAU }));
      for (let i = 0; i < x.length; i++) {
        const t = i / SR;
        if ((i & 63) === 0) bp.set("bp", sweep(t), 3);
        let s = 0;
        for (const o of tones) s += (Math.sin(TAU * o.f * t + o.p) + Math.sin(TAU * (o.f + o.d) * t)) * o.g(t) * (110 / o.f);
        x[i] = s * 0.12 + bp.tick(pn()) * 0.5 + Math.sin(TAU * 55 * t) * 0.12 * (0.6 + 0.4 * Math.sin(TAU * 0.25 * t));
      }
      return x;
    });
    const ev = sbuf(T), pent = [69, 71, 73, 76, 78].flatMap(m => [m + 12, m + 24]);
    for (const t of times(R, L, 2.5)) {
      const f = 440 * Math.pow(2, (pick(R, pent) - 69) / 12);
      const s = partials(f, [[1, 1, U(R, 0.3, 0.8)], [2, 0.2, 0.3], [3.01, 0.08, 0.15]], 2);
      every(L, T, t, tt => add(ev, s, tt, U(R, 0.05, 0.25)));
    }
    return { bed: reverb(bed, { room: 0.85, wet: 0.35 }), ev: reverb(ev, { room: 0.92, damp: 0.2, wet: 0.7, dry: 0.5 }) };
  }
};

/* Una nota del coro del templo: tres voces «aah» */
function choirNote(R, m, dur) { return choir(R, mtof(m), dur, { att: 2, rel: 2.5 }); }
