/* Música de fondo: nueve piezas cortas que se repiten sin costura. Cada una
   dura un número exacto de compases y todo lo que suena se repite idéntico
   en cada vuelta, así que el final enlaza con el principio (hasta las colas
   del eco, que vienen de la vuelta anterior).

   Las melodías salen de reglas sencillas (notas del acorde en los tiempos
   fuertes, grados conjuntos entre medias, cadencia a la tónica al cerrar la
   frase) con una semilla fija: suenan igual cada vez que se generan. */

import {
  SR, TAU, U, pick, buf, Biquad, filt, add, mixInto, every, reverb, mtof,
  pluck, flute, pad, brass, choir, celesta, bell, drum, snare, shaker, swell, partials, click
} from "./dsp.mjs";

/* Pistas: cada una se pinta aparte (para ecualizarla) y luego se mezclan */
function session(T, L) {
  const tracks = new Map();
  const put = (name, t, sig, g = 1) => {
    if (!tracks.has(name)) tracks.set(name, buf(T));
    every(L, T, t, tt => add(tracks.get(name), sig, tt, g));
  };
  const mix = (eq = {}) => {
    const out = buf(T);
    for (const [name, x] of tracks) {
      for (const [type, f, q, gain] of eq[name] || []) filt(x, type, f, q, gain);
      mixInto(out, x);
    }
    return out;
  };
  return { put, mix };
}

/* Notas de una escala entre lo y hi (MIDI) */
const scaleNotes = (root, steps, lo, hi) => {
  const out = [];
  for (let m = lo; m <= hi; m++) if (steps.includes(((m - root) % 12 + 12) % 12)) out.push(m);
  return out;
};
const nearest = (list, m) => list.reduce((a, b) => Math.abs(b - m) < Math.abs(a - m) ? b : a);
const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10], LYD = [0, 2, 4, 6, 7, 9, 11];

/* Una melodía: un ritmo por compás (en tiempos), notas del acorde al caer
   en el compás y pasos de la escala entre medias. chords[i]: notas MIDI. */
function melody(R, { chords, rhythms, key, steps, lo, hi, phrase = 4, start }) {
  const sc = scaleNotes(key, steps, lo, hi);
  let m = start ?? sc[Math.floor(sc.length / 2)];
  const notes = [];
  let beat = 0;
  chords.forEach((ch, bar) => {
    const last = (bar + 1) % phrase === 0;
    const rh = last ? pick(R, rhythms.filter(r => r.length <= 2)) || [rhythms[0].reduce((a, b) => a + b)] : pick(R, rhythms);
    const tones = sc.filter(n => ch.some(c => (n - c) % 12 === 0));
    rh.forEach((d, k) => {
      if (k === 0) m = nearest(tones, m + (R() < 0.5 ? 2 : -2));
      else if (last && k === rh.length - 1) m = nearest(sc.filter(n => (n - ch[0]) % 12 === 0), m);
      else {
        let i = sc.indexOf(nearest(sc, m));
        const mid = sc.length / 2;
        const dir = i < 3 ? 1 : i > sc.length - 4 ? -1 : (R() < 0.5 + (i < mid ? 0.1 : -0.1) ? 1 : -1);
        i += dir * (R() < 0.75 ? 1 : 2);
        m = sc[Math.max(0, Math.min(sc.length - 1, i))];
      }
      notes.push({ b: beat, d, m });
      beat += d;
    });
  });
  return notes;
}
const chordOf = (root, quality = "maj", oct = 0) => {
  const iv = { maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], sus: [0, 5, 7], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], dom7: [0, 4, 7, 10] }[quality];
  return iv.map(i => root + i + oct * 12);
};

export const PIECES = {
  /* Una giga de taberna en 6/8: flauta, laúd y bodhrán */
  "musica-taberna": (() => {
    const e = 0.18, bar = e * 6, bars = 32;
    return {
      L: bar * bars,
      render(R, T, L) {
        const S = session(T, L);
        const A = [[62, "maj"], [67, "maj"], [62, "maj"], [69, "maj"], [62, "maj"], [67, "maj"], [69, "maj"], [62, "maj"]];
        const B = [[71, "min"], [67, "maj"], [62, "maj"], [69, "maj"], [71, "min"], [67, "maj"], [69, "maj"], [62, "maj"]];
        const ca = A.map(([r, q]) => chordOf(r, q)), cb = B.map(([r, q]) => chordOf(r, q));
        const jig = [[1.5, 1.5], [1, 0.5, 1, 0.5], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5], [1, 0.5, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 1.5], [1, 0.5, 1.5]];
        const opts = { rhythms: jig, key: 62, steps: MAJ, lo: 74, hi: 88, start: 78 };
        const ma = melody(R, { ...opts, chords: ca }), mb = melody(R, { ...opts, chords: cb, start: 83 });
        const tune = [...ma, ...ma.map(n => ({ ...n, b: n.b + 24 })), ...mb.map(n => ({ ...n, b: n.b + 48 })), ...mb.map(n => ({ ...n, b: n.b + 72 }))];
        const beat = e * 2;                       // las duraciones van en negras con puntillo / 3
        for (const n of tune) S.put("flauta", n.b * beat, flute(R, mtof(n.m), n.d * beat * 0.92, { vib: 0.004, breath: 0.05, att: 0.03, rel: 0.08 }), 0.5);
        const all = [...ca, ...ca, ...cb, ...cb];
        all.forEach((ch, k) => {
          const t = k * bar, root = ch[0] - 24;
          S.put("laud", t, pluck(R, mtof(root), 1.2, { bright: 0.5, decay: 0.996 }), 0.55);
          S.put("laud", t + 3 * e, pluck(R, mtof(root + 7), 1.2, { bright: 0.5, decay: 0.996 }), 0.45);
          for (const at of [2, 5]) ch.forEach((m, j) => S.put("laud", t + at * e + j * 0.012, pluck(R, mtof(m - 12), 0.6, { bright: 0.55, mute: 0.25 }), 0.22));
          [[0, 1], [2, 0.45], [3, 0.8], [5, 0.45]].forEach(([at, g]) => S.put("perc", t + at * e, drum(R, { f: 82, drop: 0.4, dec: 0.16, noise: 0.5, ncut: 500, ndec: 0.04 }), g * 0.6));
          [1, 4].forEach(at => S.put("perc", t + at * e, shaker(R, { dec: 0.05 }), 0.12));
        });
        return reverb(S.mix({ laud: [["peak", 180, 1, 4], ["peak", 1200, 1, 2]], perc: [["lp", 3000, 0.7]] }), { room: 0.5, damp: 0.5, wet: 0.22 });
      }
    };
  })(),

  /* Viaje y exploración: arpa en arpegios, cuerdas y una flauta tranquila */
  "musica-exploracion": (() => {
    const beat = 60 / 80, bar = beat * 4, bars = 16;
    return {
      L: bar * bars,
      render(R, T, L) {
        const S = session(T, L);
        const prog = [[55, "maj"], [50, "maj"], [52, "min"], [48, "maj"], [55, "maj"], [50, "maj"], [48, "maj"], [50, "maj"],
          [52, "min"], [48, "maj"], [55, "maj"], [50, "maj"], [52, "min"], [48, "maj"], [45, "min"], [50, "maj"]].map(([r, q]) => chordOf(r, q));
        prog.forEach((ch, k) => {
          const t = k * bar;
          const arp = [ch[0], ch[2], ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12, ch[0] + 12, ch[2]];
          arp.forEach((m, j) => S.put("arpa", t + j * beat / 2, pluck(R, mtof(m), 3, { bright: 0.3, decay: 0.998 }), 0.32));
          ch.forEach(m => S.put("cuerdas", t, pad(R, mtof(m + 12), bar, { cut: 1400, att: 0.9, rel: 1.6 }), 0.1));
          S.put("bajo", t, pad(R, mtof(ch[0] - 12), bar, { cut: 400, att: 0.4, rel: 1 }), 0.16);
        });
        const mel = melody(R, { chords: prog.map(c => c.map(m => m + 24)), rhythms: [[2, 2], [4], [3, 1], [2, 1, 1]], key: 55, steps: MAJ, lo: 74, hi: 86 });
        for (const n of mel) if (Math.floor(n.b / 4) % 8 >= 4) S.put("flauta", n.b * beat, flute(R, mtof(n.m), n.d * beat * 0.95, { vib: 0.007 }), 0.28);
        return reverb(S.mix(), { room: 0.8, damp: 0.4, wet: 0.35 });
      }
    };
  })(),

  /* Misterio: un pedal grave, pizzicatos sueltos y una celesta inquietante */
  "musica-misterio": (() => {
    const beat = 60 / 64, bar = beat * 4, bars = 12;
    return {
      L: bar * bars,
      render(R, T, L) {
        const S = session(T, L);
        for (let k = 0; k < bars; k += 4) {
          for (const m of [38, 45]) S.put("pedal", k * bar, pad(R, mtof(m), bar * 4, { cut: 500, att: 2, rel: 2 }), 0.22);
          S.put("golpe", k * bar, drum(R, { f: 48, drop: 0.5, dec: 1.2, noise: 0.2, ncut: 300 }), 0.35);
        }
        const harm = [[50, "min"], [46, "maj"], [43, "min"], [45, "dom7"], [50, "min"], [46, "maj"]];
        harm.forEach(([r, q], k) => chordOf(r, q, 1).forEach(m => S.put("acordes", k * bar * 2, pad(R, mtof(m), bar * 2, { cut: 900, att: 1.5, rel: 1.5 }), 0.06)));
        const set = [62, 63, 65, 68, 69, 72, 74, 75];
        for (let s = 0; s < bars * 8; s++) if (R() < 0.22) S.put("pizz", s * beat / 2, pluck(R, mtof(pick(R, set)), 0.6, { bright: 0.45, mute: 0.18, rel: 0.05 }), 0.3);
        for (let k = 2; k < bars; k += 4) [86, 83, 80, 77].forEach((m, j) => S.put("celesta", k * bar + j * beat * 0.75, celesta(mtof(m)), 0.16));
        for (let b = 0; b < bars * 4; b++) S.put("reloj", b * beat, click(R, b % 2 ? 1900 : 2300, 8, 0.012, 1), 0.05);
        return reverb(S.mix(), { room: 0.85, damp: 0.35, wet: 0.4 });
      }
    };
  })(),

  /* Combate: tambores, cuerdas en semicorcheas y metales */
  "musica-combate": (() => {
    const beat = 60 / 140, bar = beat * 4, bars = 24, s16 = beat / 4;
    return {
      L: bar * bars,
      render(R, T, L) {
        const S = session(T, L);
        const cyc = [[52, "min"], [52, "min"], [48, "maj"], [48, "maj"], [50, "maj"], [50, "maj"], [47, "maj"], [47, "maj"]];
        const prog = [...cyc, ...cyc, ...cyc.map((c, i) => i === 4 || i === 5 ? [45, "min"] : c)].map(([r, q]) => chordOf(r, q));
        const ost = [0, 0, 2, 0, 3, 0, 2, 0, 0, 0, 2, 0, 3, 2, 1, 2];   // índice en [raíz, tercera, quinta, octava]
        prog.forEach((ch, k) => {
          const t = k * bar, tones = [ch[0], ch[1], ch[2], ch[0] + 12];
          ost.forEach((o, j) => S.put("cuerdas", t + j * s16, pad(R, mtof(tones[o] - 12), s16 * 0.7, { cut: 2600, att: 0.004, rel: 0.05, vib: 0 }), j % 4 === 0 ? 0.26 : 0.18));
          S.put("bajo", t, pad(R, mtof(ch[0] - 24), bar, { cut: 500, att: 0.02, rel: 0.3 }), 0.25);
          [[0, 1], [6, 0.7], [8, 0.9]].forEach(([p, g]) => S.put("taiko", t + p * s16, drum(R, { f: 58, drop: 1.4, dec: 0.55, noise: 0.45, ncut: 700 }), g * 0.9));
          [[10, 0.5], [11, 0.4], [14, 0.6]].forEach(([p, g]) => S.put("taiko", t + p * s16, drum(R, { f: 120, drop: 0.8, dec: 0.18, noise: 0.5, ncut: 1500 }), g * 0.6));
          [4, 12].forEach(p => S.put("caja", t + p * s16, snare(R, { dec: 0.1 }), 0.25));
          if (k % 4 === 3) [12, 13, 14, 15].forEach(p => S.put("taiko", t + p * s16, drum(R, { f: 95, drop: 1, dec: 0.25, noise: 0.5, ncut: 1200 }), 0.55));
          if (k % 2 === 0) ch.forEach(m => S.put("metales", t, brass(R, mtof(m), beat * 1.6), 0.13));
        });
        const mel = melody(R, { chords: prog.slice(8), rhythms: [[2, 2], [3, 1], [4], [2, 1, 1]], key: 52, steps: MIN, lo: 64, hi: 76 });
        for (const n of mel) S.put("metales", (n.b + 32) * beat, brass(R, mtof(n.m), n.d * beat * 0.9, { cut: 1100 }), 0.16);
        return reverb(S.mix({ taiko: [["lp", 4000, 0.7]] }), { room: 0.7, damp: 0.45, wet: 0.25 });
      }
    };
  })(),

  /* Batalla épica: coro, tambores enormes y una fanfarria */
  "musica-epica": (() => {
    const beat = 60 / 90, bar = beat * 4, bars = 16;
    return {
      L: bar * bars,
      render(R, T, L) {
        const S = session(T, L);
        const prog = [[50, "min"], [46, "maj"], [48, "maj"], [45, "min"], [50, "min"], [46, "maj"], [43, "min"], [45, "maj"]];
        const all = [...prog, ...prog].map(([r, q]) => chordOf(r, q));
        all.forEach((ch, k) => {
          const t = k * bar;
          ch.forEach(m => S.put("coro", t, choir(R, mtof(m + 12), bar, { att: 0.6, rel: 1.2 }), 0.13));
          for (let j = 0; j < 8; j++) S.put("cuerdas", t + j * beat / 2, pad(R, mtof((j % 2 ? ch[2] : ch[0]) - 12), beat * 0.4, { cut: 2000, att: 0.01, rel: 0.08 }), 0.17);
          S.put("bajo", t, pad(R, mtof(ch[0] - 24), bar, { cut: 450, att: 0.1, rel: 0.6 }), 0.24);
          [0, 2].forEach(b => S.put("taiko", t + b * beat, drum(R, { f: 46, drop: 1.6, dec: 0.9, noise: 0.5, ncut: 600 }), 1));
          S.put("taiko", t + 3.5 * beat, drum(R, { f: 70, drop: 1, dec: 0.4, noise: 0.4 }), 0.5);
          if (k % 4 === 3) for (let j = 0; j < 8; j++) S.put("taiko", t + 2 * beat + j * beat / 4, drum(R, { f: 90, drop: 1, dec: 0.25, noise: 0.5, ncut: 1200 }), 0.3 + j * 0.06);
        });
        S.put("platillo", 7 * bar, swell(R, bar), 0.25);
        S.put("platillo", 15 * bar, swell(R, bar), 0.25);
        const mel = melody(R, { chords: all.slice(8).map(c => c.map(m => m + 12)), rhythms: [[2, 2], [4], [3, 1], [1, 1, 2]], key: 50, steps: MIN, lo: 62, hi: 74 });
        for (const n of mel) S.put("metales", (n.b + 32) * beat, brass(R, mtof(n.m), n.d * beat * 0.92, { cut: 1000, open: 2200 }), 0.2);
        return reverb(S.mix({ taiko: [["lp", 3500, 0.7]] }), { room: 0.88, damp: 0.4, wet: 0.35 });
      }
    };
  })(),

  /* Descanso junto al fuego: laúd en arpegios de 3/4 y una flauta suave */
  "musica-calma": (() => {
    const beat = 60 / 72, bar = beat * 3, bars = 16;
    return {
      L: bar * bars,
      render(R, T, L) {
        const S = session(T, L);
        const prog = [[53, "maj"], [48, "maj"], [50, "min"], [46, "maj"], [53, "maj"], [46, "maj"], [48, "maj"], [48, "maj"],
          [50, "min"], [46, "maj"], [53, "maj"], [48, "maj"], [46, "maj"], [53, "maj"], [48, "maj"], [53, "maj"]].map(([r, q]) => chordOf(r, q));
        prog.forEach((ch, k) => {
          const t = k * bar, pat = [ch[0] - 12, ch[2], ch[0] + 12, ch[1] + 12, ch[0] + 12, ch[2]];
          pat.forEach((m, j) => S.put("laud", t + j * beat / 2, pluck(R, mtof(m), 2.5, { bright: 0.28, decay: 0.997 }), j === 0 ? 0.42 : 0.28));
          ch.forEach(m => S.put("colchon", t, pad(R, mtof(m), bar, { cut: 900, att: 1, rel: 1.5 }), 0.05));
        });
        const mel = melody(R, { chords: prog.map(c => c.map(m => m + 24)), rhythms: [[2, 1], [3], [1, 1, 1], [1.5, 0.5, 1]], key: 53, steps: MAJ, lo: 72, hi: 84 });
        for (const n of mel) if (n.b >= 24) S.put("flauta", n.b * beat, flute(R, mtof(n.m), n.d * beat * 0.95, { vib: 0.006, breath: 0.05 }), 0.22);
        return reverb(S.mix({ laud: [["peak", 200, 1, 3], ["lp", 5000, 0.7]] }), { room: 0.6, damp: 0.5, wet: 0.25 });
      }
    };
  })(),

  /* Bosque feérico: celesta y arpa en lidio, con destellos */
  "musica-feerica": (() => {
    const beat = 60 / 84, bar = beat * 4, bars = 16;
    return {
      L: bar * bars,
      render(R, T, L) {
        const S = session(T, L);
        const prog = [[57, "maj"], [59, "maj"], [54, "min"], [52, "maj"], [57, "maj"], [59, "maj"], [62, "maj"], [52, "sus"]];
        const all = [...prog, ...prog].map(([r, q]) => chordOf(r, q));
        all.forEach((ch, k) => {
          const t = k * bar;
          const up = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24];
          for (let j = 0; j < 16; j++) S.put("celesta", t + j * beat / 4, celesta(mtof(up[j % 4] + (j >= 8 ? 12 : 0)), 1.5), 0.07 + (j % 4 === 0 ? 0.04 : 0));
          [ch[0] - 12, ch[2] - 12, ch[1], ch[2]].forEach((m, j) => S.put("arpa", t + j * beat, pluck(R, mtof(m), 3, { bright: 0.3, decay: 0.998 }), 0.25));
          ch.forEach(m => S.put("aire", t, pad(R, mtof(m + 12), bar, { cut: 2800, att: 1.5, rel: 2, det: 0.006 }), 0.05));
        });
        for (let s = 0; s < bars * 4; s++) if (R() < 0.35) S.put("destellos", s * beat + R() * beat, celesta(mtof(pick(R, [88, 90, 92, 93, 95, 97])), 1.2), 0.05);
        return reverb(S.mix(), { room: 0.9, damp: 0.25, wet: 0.45 });
      }
    };
  })(),

  /* Lamento: una viola que canta despacio sobre un colchón en menor */
  "musica-lamento": (() => {
    const beat = 60 / 60, bar = beat * 4, bars = 12;
    return {
      L: bar * bars,
      render(R, T, L) {
        const S = session(T, L);
        const prog = [[57, "min"], [53, "maj"], [48, "maj"], [55, "maj"], [57, "min"], [50, "min"], [52, "maj"], [57, "min"],
          [53, "maj"], [55, "maj"], [52, "min"], [52, "maj"]].map(([r, q]) => chordOf(r, q));
        prog.forEach((ch, k) => {
          const t = k * bar;
          ch.forEach(m => S.put("colchon", t, pad(R, mtof(m), bar, { cut: 1100, att: 1.2, rel: 1.8 }), 0.08));
          [ch[0] - 12, ch[2] - 12, ch[0], ch[2] - 12].forEach((m, j) => S.put("arpa", t + j * beat, pluck(R, mtof(m), 3, { bright: 0.25, decay: 0.998 }), 0.18));
        });
        const mel = melody(R, { chords: prog.map(c => c.map(m => m + 12)), rhythms: [[2, 2], [4], [3, 1], [2, 1, 1]], key: 57, steps: MIN, lo: 64, hi: 76 });
        for (const n of mel) S.put("viola", n.b * beat, pad(R, mtof(n.m), n.d * beat * 0.95, { cut: 1900, att: 0.25, rel: 0.5, det: 0.002, vib: 0.006 }), 0.32);
        return reverb(S.mix(), { room: 0.85, damp: 0.4, wet: 0.4 });
      }
    };
  })(),

  /* Terror: latido, racimos disonantes y chirridos agudos */
  "musica-terror": (() => {
    const L = 40;
    return {
      L,
      render(R, T) {
        const S = session(T, L);
        for (let t = 0; t < L; t += 1) {
          S.put("latido", t, drum(R, { f: 45, drop: 0.6, dec: 0.18, noise: 0.15, ncut: 200 }), 0.7);
          S.put("latido", t + 0.26, drum(R, { f: 42, drop: 0.5, dec: 0.15, noise: 0.1, ncut: 200 }), 0.45);
        }
        for (let t = 0; t < L; t += 10) [48, 49, 50, 54].forEach(m => S.put("racimo", t, pad(R, mtof(m + U(R, -0.2, 0.2)), 6, { cut: 900, att: 4, rel: 3, det: 0.008 }), 0.12));
        for (const t of [U(R, 6, 12), U(R, 24, 32)]) {
          const d = 3, x = buf(d + 1), osc = [0, 1].map(() => ({ ph: 0 }));
          for (let i = 0; i < x.length; i++) {
            const tt = i / SR, f = 1046 * Math.pow(2, 1.4 * Math.min(1, tt / d)) * (1 + 0.01 * Math.sin(TAU * 6 * tt));
            let s = 0;
            osc.forEach((o, j) => { o.ph += f * (1 + j * 0.007) / SR; s += (o.ph % 1) * 2 - 1; });
            x[i] = s * Math.min(1, tt / 1.5) * (tt > d ? Math.exp(-(tt - d) / 0.3) : 1);
          }
          S.put("chirrido", t, filt(x, "lp", 5000, 0.7), 0.035);
        }
        for (const t of [U(R, 14, 18), U(R, 34, 38)]) S.put("golpe", t, drum(R, { f: 38, drop: 0.8, dec: 2.2, noise: 0.4, ncut: 300 }), 0.8);
        const sc = buf(2.5), bp = new Biquad();
        for (let i = 0; i < sc.length; i++) {
          const tt = i / SR;
          if ((i & 63) === 0) bp.set("bp", 800 + 1600 * tt / 2.5, 12);
          sc[i] = bp.tick(R() * 2 - 1) * Math.sin(Math.PI * tt / 2.5) * 3;
        }
        S.put("roce", U(R, 20, 24), sc, 0.25);
        return reverb(S.mix(), { room: 0.9, damp: 0.35, wet: 0.45 });
      }
    };
  })()
};
