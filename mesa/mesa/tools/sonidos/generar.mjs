/* Genera la biblioteca de sonidos de Mesa: public/sonidos/*.mp3 y el
   catálogo public/js/sound-library.js.

   Todo se sintetiza aquí (no hay grabaciones de nadie), así que la biblioteca
   es obra original de Mesa y viaja con la misma licencia que el código. Las
   semillas son fijas: volver a generar da los mismos archivos.

   Uso:  node tools/sonidos/generar.mjs            todo
         node tools/sonidos/generar.mjs lluvia mar  solo esos
   Necesita ffmpeg con libmp3lame. */

import { writeFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SR, rng, loopOf, finish, filt, rms } from "./dsp.mjs";
import { SCENES } from "./escenas.mjs";
import { PIECES } from "./musica.mjs";

/* id, nombre, categoría, segundos (escenas), nivel en dB RMS y cómo se
   coloca al elegirlo: modo, alcance en casillas y volumen */
const LIST = [
  ["lluvia", "Lluvia", "clima", 30, -21, "map"],
  ["tormenta", "Tormenta", "clima", 40, -20, "map"],
  ["lluvia-dentro", "Lluvia desde dentro", "clima", 30, -22, "room"],
  ["viento", "Viento en la llanura", "clima", 30, -22, "map"],
  ["ventisca", "Ventisca", "clima", 30, -21, "map"],
  ["bosque-dia", "Bosque de día", "naturaleza", 36, -23, "map"],
  ["bosque-oscuro", "Bosque oscuro", "naturaleza", 36, -23, "map"],
  ["noche", "Noche en el campo", "naturaleza", 30, -25, "map"],
  ["arroyo", "Arroyo", "naturaleza", 30, -22, "point", 6],
  ["cascada", "Cascada", "naturaleza", 30, -20, "point", 10],
  ["mar", "Olas en la costa", "naturaleza", 40, -21, "point", 14],
  ["pantano", "Pantano", "naturaleza", 30, -23, "map"],
  ["hoguera", "Hoguera", "fuego", 30, -21, "point", 4],
  ["antorchas", "Antorchas y braseros", "fuego", 30, -24, "point", 3],
  ["campamento", "Campamento de noche", "fuego", 30, -22, "point", 8],
  ["forja", "Forja", "fuego", 36, -21, "point", 6],
  ["lava", "Lava y volcán", "fuego", 30, -20, "point", 8],
  ["taberna", "Taberna llena", "lugares", 36, -21, "room"],
  ["ciudad", "Plaza de la ciudad", "lugares", 40, -22, "map"],
  ["templo", "Templo y coro", "lugares", 40, -22, "room"],
  ["biblioteca", "Biblioteca", "lugares", 30, -27, "room"],
  ["barco", "Barco en alta mar", "lugares", 36, -21, "map"],
  ["cueva", "Cueva con goteo", "subterraneo", 30, -24, "map"],
  ["mazmorra", "Mazmorra", "subterraneo", 36, -23, "map"],
  ["cripta", "Cripta", "subterraneo", 36, -23, "room"],
  ["alcantarillas", "Alcantarillas", "subterraneo", 30, -22, "room"],
  ["magia", "Energía arcana", "magia", 30, -22, "point", 5],
  ["musica-taberna", "Giga de taberna", "musica", 0, -19, "map"],
  ["musica-exploracion", "Viaje y exploración", "musica", 0, -20, "map"],
  ["musica-calma", "Descanso junto al fuego", "musica", 0, -21, "map"],
  ["musica-feerica", "Bosque feérico", "musica", 0, -21, "map"],
  ["musica-misterio", "Misterio", "musica", 0, -21, "map"],
  ["musica-lamento", "Lamento", "musica", 0, -21, "map"],
  ["musica-combate", "Combate", "musica", 0, -19, "map"],
  ["musica-epica", "Batalla épica", "musica", 0, -19, "map"],
  ["musica-terror", "Terror", "musica", 0, -21, "map"]
];
const CATS = [["clima", "Clima"], ["naturaleza", "Naturaleza"], ["fuego", "Fuego y forja"], ["lugares", "Lugares"],
  ["subterraneo", "Bajo tierra"], ["magia", "Magia"], ["musica", "Música"]];

const ROOT = new URL("../../public/", import.meta.url);
const OUT = new URL("sonidos/", ROOT);
mkdirSync(OUT, { recursive: true });
const tmp = join(tmpdir(), "mesa-sonidos");
mkdirSync(tmp, { recursive: true });

function wav(x) {
  const b = Buffer.alloc(44 + x.length * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write("WAVE", 8);
  b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(x[i] * 32767))), 44 + i * 2);
  return b;
}

const only = process.argv.slice(2);
const seedOf = id => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const meta = [];
for (const [id, name, cat, sec, db, mode, radius] of LIST) {
  const music = cat === "musica";
  const R = rng(seedOf(id));
  let x, L;
  const t0 = Date.now();
  if (music) {
    const piece = PIECES[id];
    L = piece.L;
    const pre = 8, T = pre + L + 0.1;
    if (!only.length || only.includes(id)) x = loopOf({ ev: filt(piece.render(R, T, L), "hp", 25, 0.7) }, pre, L, 0);
  } else {
    L = sec;
    const pre = 4, X = 3, T = pre + L + X + 0.1;
    if (!only.length || only.includes(id)) {
      const { bed, ev } = SCENES[id](R, T, L);
      x = loopOf({ bed: bed && filt(bed, "hp", 25, 0.7), ev: ev && filt(ev, "hp", 25, 0.7) }, pre, L, X);
    }
  }
  const file = `sonidos/${id}.mp3`;
  if (x) {
    finish(x, db);
    let peak = 0; for (const v of x) peak = Math.max(peak, Math.abs(v));
    const w = join(tmp, id + ".wav");
    writeFileSync(w, wav(x));
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", w, "-codec:a", "libmp3lame", "-b:a", music ? "64k" : "48k", "-ac", "1", new URL(file, ROOT).pathname]);
    const kb = statSync(new URL(file, ROOT)).size / 1024;
    console.log(`${id.padEnd(20)} ${L.toFixed(1).padStart(5)} s  rms ${(20 * Math.log10(rms(x))).toFixed(1)} dB  pico ${(20 * Math.log10(peak)).toFixed(1)} dB  ${kb.toFixed(0)} KB  ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  meta.push({ id, name, cat, file, len: Math.round(Math.round(L * SR) / SR * 1e6) / 1e6, mode, radius: radius || 6, volume: music ? 0.5 : mode === "point" ? 0.8 : 0.7 });
}
rmSync(tmp, { recursive: true, force: true });

writeFileSync(new URL("js/sound-library.js", ROOT), `/* Biblioteca de sonidos de Mesa: para cuando el DM no tiene sus propios
   audios. Los genera tools/sonidos/generar.mjs (no se edita a mano): todo
   está sintetizado para Mesa, sin grabaciones ni música de nadie.

   len es la duración exacta del bucle, en segundos: el reproductor la usa
   para saltarse el silencio que el MP3 añade al principio y al final. Al
   elegir uno, mode, radius y volume son lo que se propone. */

export const SOUND_CATS = ${JSON.stringify(CATS)};

export const SOUND_LIBRARY = [
${meta.map(m => "  " + JSON.stringify(m)).join(",\n")}
];

export const libSound = id => SOUND_LIBRARY.find(s => s.id === id) || null;
`);
console.log(`\n${meta.length} sonidos en public/js/sound-library.js`);
