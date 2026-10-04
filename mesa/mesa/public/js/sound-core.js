/* Sonido ambiente: qué oye cada cual y con qué fuerza. Lo usa el servidor, así
   que aquí no hay nada del navegador. Los jugadores no reciben ni los muros
   que no han visto ni dónde está cada fuente: solo la lista de lo que suena y
   a qué volumen, calculada aquí.

   Cada sonido se oye de una de tres maneras:
   - point  desde un punto, hasta su alcance (en casillas). Con «falloff» va
            ganando volumen al acercarse; sin él suena igual en todo el alcance.
            Con «walls», una pared o una puerta cerrada en medio lo deja en un
            murmullo apagado, esté a la distancia que esté.
   - room   en toda la sala donde está, a su volumen, y fuera de ella nada.
   - map    en todo el mapa: la música de fondo. */

import { cellKey } from "./schema.js";
import { hasSight, roomsOf, occupied, onMap } from "./los.js";

export const MUFFLED = 0.12;      // lo que queda de un sonido detrás de una pared

/* ¿Un muro libre (pared o puerta cerrada) corta el segmento entre dos puntos? */
function freeWallBetween(map, ax, ay, bx, by) {
  for (const w of map.walls || []) {
    if (w.type === "doorOpen") continue;
    for (let i = 1; i < w.points.length; i++) {
      const [px, py] = w.points[i - 1], [qx, qy] = w.points[i];
      const d1 = (bx - ax) * (py - ay) - (by - ay) * (px - ax), d2 = (bx - ax) * (qy - ay) - (by - ay) * (qx - ax);
      const d3 = (qx - px) * (ay - py) - (qy - py) * (ax - px), d4 = (qx - px) * (by - py) - (qy - py) * (bx - px);
      if (d1 * d2 < 0 && d3 * d4 < 0) return true;
    }
  }
  return false;
}
export function wallBetween(map, x0, y0, x1, y1) {
  return !hasSight(map, x0, y0, x1, y1) || freeWallBetween(map, x0 + 0.5, y0 + 0.5, x1 + 0.5, y1 + 0.5);
}

/* Lo que oye alguien en una casilla: volumen de 0 a 1 y si llega apagado */
export function hearAt(map, s, x, y) {
  if (!s.on || !s.audioId) return { gain: 0, muffled: false };
  if (s.mode === "map") return { gain: s.volume, muffled: false };
  if (s.mode === "room") {
    const rooms = roomsOf(map);
    const here = rooms.of.get(cellKey(x, y)) || [], there = rooms.of.get(cellKey(s.x, s.y)) || [];
    return { gain: here.some(r => there.includes(r)) ? s.volume : 0, muffled: false };
  }
  const d = Math.hypot(x - s.x, y - s.y);
  if (d > s.radius) return { gain: 0, muffled: false };
  let g = s.falloff ? Math.pow(1 - d / (s.radius + 0.5), 1.6) : 1;
  const muffled = s.walls && wallBetween(map, x, y, s.x, s.y);
  if (muffled) g *= MUFFLED;
  return { gain: g * s.volume, muffled };
}

/* Lo que suena para unos oyentes (casillas): por cada sonido, el más fuerte.
   Así la tele oye lo que oiga cualquiera de la party. */
export function soundsHeard(map, listeners) {
  const out = [];
  if (!map) return out;
  for (const s of map.sounds || []) {
    /* La música de todo el mapa suena aunque no haya nadie colocado */
    let best = s.mode === "map" ? hearAt(map, s, 0, 0) : { gain: 0, muffled: false };
    for (const [x, y] of listeners) {
      const h = hearAt(map, s, x, y);
      if (h.gain > best.gain) best = h;
    }
    if (best.gain > 0.005) out.push({ id: s.id, audioId: s.audioId, gain: Math.round(best.gain * 1000) / 1000, muffled: best.muffled });
  }
  return out;
}

/* Desde dónde se escucha: un jugador, desde su personaje; la tele y el DM,
   desde toda la party en pie que esté en ese mapa. */
export function listenersFor(doc, map, charId = null) {
  if (!map) return [];
  const centre = c => occupied(c)[0];
  const me = charId && doc.chars.find(c => c.id === charId && onMap(c, map));
  if (me) return [centre(me)];
  if (charId) return [];
  return doc.chars.filter(c => c.kind === "pc" && c.hp > 0 && onMap(c, map)).map(centre);
}
