/* Sonido ambiente: qué oye cada cual y con qué fuerza */

import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMap, normalizeChar, normalizeSound, edgeKey, cellKey } from "../public/js/schema.js";
import { soundsHeard, listenersFor, MUFFLED } from "../public/js/sound-core.js";

const edges = {};
for (let y = 0; y < 10; y++) edges[edgeKey(6, y, "v")] = "wall";      // muro entre x=5 y x=6
const rooms = {};
for (let x = 0; x < 6; x++) for (let y = 0; y < 10; y++) rooms[cellKey(x, y)] = 1;
const mk = sound => normalizeMap({ id: "m", cols: 14, rows: 10, edges, rooms, sounds: [{ id: "s", audioId: "a.mp3", volume: 1, ...sound }] });
const gainAt = (map, x, y) => (soundsHeard(map, [[x, y]])[0] || { gain: 0 }).gain;

test("desde un punto: más fuerte al acercarse y nada fuera del alcance", () => {
  const map = mk({ x: 2, y: 2, radius: 4 });
  assert.equal(gainAt(map, 2, 2), 1);
  assert.ok(gainAt(map, 3, 2) > gainAt(map, 4, 2));
  assert.ok(gainAt(map, 4, 2) > 0);
  assert.equal(gainAt(map, 2, 7), 0);
});

test("sin «más fuerte al acercarse» suena igual en todo el alcance", () => {
  const map = mk({ x: 2, y: 2, radius: 4, falloff: false });
  assert.equal(gainAt(map, 2, 2), 1);
  assert.equal(gainAt(map, 5, 2), 1);
});

test("una pared lo deja en un murmullo apagado, salvo que se desmarque", () => {
  const near = mk({ x: 5, y: 2, radius: 6, falloff: false });
  const [heard] = soundsHeard(near, [[6, 2]]);
  assert.equal(heard.gain, MUFFLED);
  assert.equal(heard.muffled, true);
  assert.equal(gainAt(mk({ x: 5, y: 2, radius: 6, falloff: false, walls: false }), 6, 2), 1);
});

test("en una sala suena entera dentro y nada fuera", () => {
  const map = mk({ x: 1, y: 1, mode: "room", volume: .6 });
  assert.equal(gainAt(map, 5, 9), .6);
  assert.equal(gainAt(map, 7, 1), 0);
});

test("la música de todo el mapa la oye cualquiera, aunque no haya nadie", () => {
  const map = mk({ mode: "map", volume: .4 });
  assert.equal(gainAt(map, 13, 9), .4);
  assert.deepEqual(soundsHeard(map, []).map(s => s.id), ["s"]);
});

test("apagado o sin audio, no suena", () => {
  assert.equal(gainAt(mk({ x: 2, y: 2, on: false }), 2, 2), 0);
  assert.equal(gainAt(mk({ x: 2, y: 2, audioId: "" }), 2, 2), 0);
});

test("la tele oye lo que oiga cualquiera de la party; un jugador, desde su personaje", () => {
  const map = mk({ x: 2, y: 2, radius: 3 });
  const pc = (id, mx, my, hp = 10) => normalizeChar({ id, kind: "pc", mapId: "m", mx, my, hp, maxHp: 10 });
  const doc = { chars: [pc("lejos", 12, 9), pc("cerca", 2, 3), pc("caido", 2, 2, 0)] };
  assert.equal(listenersFor(doc, map).length, 2);                    // el caído no cuenta
  assert.ok(soundsHeard(map, listenersFor(doc, map))[0].gain > 0);
  assert.deepEqual(soundsHeard(map, listenersFor(doc, map, "lejos")), []);
});

test("el sonido se sanea: volumen de 0 a 1 y un archivo con nombre válido", () => {
  const s = normalizeSound({ volume: 7, radius: 999, audioId: "../../etc/passwd", mode: "raro" });
  assert.equal(s.volume, 1);
  assert.equal(s.radius, 60);
  assert.equal(s.audioId, "");
  assert.equal(s.mode, "point");
});

test("un sonido de la biblioteca suena sin audio subido, y uno sin nada no", () => {
  const lib = normalizeMap({ id: "m", cols: 14, rows: 10, sounds: [{ id: "s", lib: "hoguera", volume: 1, x: 2, y: 2, radius: 4 }] });
  assert.equal(lib.sounds[0].lib, "hoguera");
  const heard = soundsHeard(lib, [[2, 2]]);
  assert.equal(heard.length, 1);
  assert.equal(heard[0].lib, "hoguera");
  const none = normalizeMap({ id: "m", cols: 14, rows: 10, sounds: [{ id: "s", lib: "../etc", volume: 1, x: 2, y: 2 }] });
  assert.equal(none.sounds[0].lib, "");
  assert.equal(soundsHeard(none, [[2, 2]]).length, 0);
});

test("el catálogo de la biblioteca apunta a archivos que existen y dura lo que dice", async () => {
  const { SOUND_LIBRARY, SOUND_CATS } = await import("../public/js/sound-library.js");
  const { statSync } = await import("node:fs");
  assert.ok(SOUND_LIBRARY.length >= 30);
  const cats = new Set(SOUND_CATS.map(([k]) => k));
  for (const s of SOUND_LIBRARY) {
    assert.match(s.id, /^[a-z0-9-]{1,40}$/);
    assert.ok(cats.has(s.cat), s.id);
    assert.ok(statSync(new URL("../public/" + s.file, import.meta.url)).size > 50000, s.id);
    assert.ok(s.len >= 20 && s.len <= 60, s.id);
    assert.ok(["point", "room", "map"].includes(s.mode), s.id);
  }
});
