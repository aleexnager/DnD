/* La cámara de la party encuadra la sala donde está la party */

import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMap, normalizeChar, cellKey } from "../public/js/schema.js";
import { partyRoomFrame } from "../public/js/los.js";

const rooms = {};
for (let x = 2; x < 6; x++) for (let y = 1; y < 4; y++) rooms[cellKey(x, y)] = 1;     // sala 1: 4×3
for (let x = 10; x < 12; x++) for (let y = 5; y < 10; y++) rooms[cellKey(x, y)] = 2;  // sala 2: 2×5
const map = normalizeMap({ id: "m", cols: 20, rows: 12, rooms });
const pc = (id, mx, my, extra = {}) => normalizeChar({ id, kind: "pc", mapId: "m", mx, my, hp: 10, maxHp: 10, ...extra });

test("la mayoría de la party decide la sala", () => {
  const doc = { chars: [pc("a", 3, 2), pc("b", 4, 2), pc("c", 10, 6)] };
  assert.deepEqual(partyRoomFrame(doc, map), { x: 2, y: 1, w: 4, h: 3 });
});

test("si la cámara sigue a alguien, manda su sala", () => {
  const doc = { chars: [pc("a", 3, 2), pc("b", 4, 2), pc("c", 10, 6)] };
  assert.deepEqual(partyRoomFrame(doc, map, "c"), { x: 10, y: 5, w: 2, h: 5 });
});

test("repartidos o fuera de las salas, no se encuadra nada", () => {
  assert.equal(partyRoomFrame({ chars: [pc("a", 3, 2), pc("b", 10, 6)] }, map), null);
  assert.equal(partyRoomFrame({ chars: [pc("a", 15, 2)] }, map), null);
  assert.equal(partyRoomFrame({ chars: [pc("a", 3, 2)] }, normalizeMap({ id: "m" })), null);
});

test("los caídos no cuentan para la mayoría", () => {
  const doc = { chars: [pc("a", 3, 2, { hp: 0 }), pc("b", 10, 6)] };
  assert.deepEqual(partyRoomFrame(doc, map), { x: 10, y: 5, w: 2, h: 5 });
});
