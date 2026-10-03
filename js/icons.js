/* Iconos. Trazo simple, todos sobre la misma rejilla de 24, heredando el color
   del texto: así se leen igual en la barra del DM, en un botón pequeño del
   móvil y en la tele de la mesa. Los emojis dependían de la fuente del
   sistema y salían distintos (y más infantiles) en cada aparato. */

const P = {
  eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.8"/>',
  eyeOff: '<path d="M4 4l16 16"/><path d="M9.5 5.9A9.7 9.7 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.3 4.1"/><path d="M6.4 7.6A16.8 16.8 0 0 0 2 12s3.6 6.5 10 6.5c1.3 0 2.4-.2 3.5-.6"/><path d="M9.8 9.9a2.8 2.8 0 0 0 3.9 3.9"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 5.5H6a1.5 1.5 0 0 0-1.5 1.5v9"/>',
  pencil: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="M15 6l3 3"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  up: '<path d="M6 14l6-6 6 6"/>',
  down: '<path d="M6 10l6 6 6-6"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M6.5 7l.8 12.1A1.5 1.5 0 0 0 8.8 20.5h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7"/>',
  dice: '<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M2.8 19.5a6.3 6.3 0 0 1 12.4 0"/><path d="M16 5.4a3.2 3.2 0 0 1 0 6.2"/><path d="M17.4 14.2a6.3 6.3 0 0 1 3.8 5.3"/>',
  map: '<path d="M9 4.5 3.5 6.7v12.8L9 17.3l6 2.2 5.5-2.2V4.5L15 6.7 9 4.5Z"/><path d="M9 4.5v12.8M15 6.7v12.8"/>',
  shield: '<path d="M12 3.2 4.8 6v6c0 4.3 3 7.4 7.2 8.8 4.2-1.4 7.2-4.5 7.2-8.8V6L12 3.2Z"/>',
  whisper: '<path d="M20 12.5A6.5 6.5 0 0 1 13.5 19H9l-4.5 2.5.9-3.4A6.5 6.5 0 0 1 9 6h4.5a6.5 6.5 0 0 1 6.5 6.5Z"/><path d="M9 12.5h6"/>',
  undo: '<path d="M4 9h9.5A5.5 5.5 0 0 1 13.5 20H8"/><path d="M7.5 5 4 9l3.5 4"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/>',
  ruler: '<rect x="2.6" y="8.2" width="18.8" height="7.6" rx="1.6" transform="rotate(-20 12 12)"/><path d="M7.2 8.4l1 2.4M11 6.9l1.4 3.2M14.8 5.4l1 2.4"/>',
  wall: '<path d="M3 6h18M3 12h18M3 18h18"/><path d="M9 6v6M15 12v6M6 12V6M18 6v6"/>',
  door: '<path d="M6 20V4.8L15.5 3v18L6 20Z"/><circle cx="12.8" cy="12" r=".9" fill="currentColor" stroke="none"/><path d="M15.5 20.4H19V3.6h-3.5"/>',
  eraser: '<path d="M8.4 20.5 3.6 15.7a1.7 1.7 0 0 1 0-2.4l8-8a1.7 1.7 0 0 1 2.4 0l5.1 5.1a1.7 1.7 0 0 1 0 2.4l-7.7 7.7H8.4Z"/><path d="M8 9.5 15.5 17"/>',
  note: '<path d="M6 3.5h8.5L19 8v12.5H6V3.5Z"/><path d="M14 3.5V8h5"/><path d="M9 12h7M9 16h5"/>',
  stairs: '<path d="M3.5 20.5h4v-4h4v-4h4v-4h4"/>',
  brush: '<path d="M9.5 14.5 5 19c-.9.9-.4 2.5.9 2.8 1 .2 2-.2 2.6-1L12 17"/><path d="M14.5 3.9 20 9.4l-6.4 6.4-5.5-5.5L14.5 4Z"/>',
  circle: '<circle cx="12" cy="12" r="8.2"/>',
  cone: '<path d="M4 20 12 3.5 20 20H4Z"/>',
  line: '<rect x="3" y="10" width="18" height="4" rx="1.2"/>',
  square: '<rect x="4.5" y="4.5" width="15" height="15" rx="1.5"/>',
  ping: '<circle cx="12" cy="12" r="2.5"/><path d="M6.7 6.7a7.5 7.5 0 0 0 0 10.6M17.3 17.3a7.5 7.5 0 0 0 0-10.6"/>',
  move: '<path d="M12 3v18M3 12h18"/><path d="m9 6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
  image: '<rect x="3.2" y="4.8" width="17.6" height="14.4" rx="2"/><circle cx="8.6" cy="10" r="1.6"/><path d="m4.5 17.5 4.8-4.6 3.4 3.2 2.7-2.4 4.1 3.8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.6v2.6M12 18.8v2.6M21.4 12h-2.6M5.2 12H2.6M18.6 5.4l-1.8 1.8M7.2 16.8l-1.8 1.8M18.6 18.6l-1.8-1.8M7.2 7.2 5.4 5.4"/>',
  more: '<circle cx="5.5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
  exit: '<path d="M14.5 4.5h4a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-4"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h9"/>',
  screen: '<rect x="2.8" y="4.5" width="18.4" height="12" rx="2"/><path d="M8 20h8M12 16.5V20"/>',
  bell: '<path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5S6.5 14 6.5 10Z"/><path d="M10 18.5a2.2 2.2 0 0 0 4 0"/>',
  flag: '<path d="M6 21V4"/><path d="M6 4.6h11l-2.2 3.7L17 12H6"/>',
  book: '<path d="M4 4.8A1.8 1.8 0 0 1 5.8 3H19v15.5H5.8A1.8 1.8 0 0 0 4 20.3V4.8Z"/><path d="M4 18.6c0 1.3.6 2.4 1.8 2.4H19"/>',
  sword: '<path d="m14 4 6 0 0 6-8.5 8.5-3.5-3.5L14 4Z"/><path d="m7 15-3 3 2 2 3-3"/><path d="m5.5 16.5 2 2"/>',
  heart: '<path d="M12 20s-7.5-4.4-7.5-9.4A4.1 4.1 0 0 1 12 8.2a4.1 4.1 0 0 1 7.5 2.4C19.5 15.6 12 20 12 20Z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  lang: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.2 2.4 3.3 5.3 3.3 8.5S14.2 18.1 12 20.5c-2.2-2.4-3.3-5.3-3.3-8.5S9.8 5.9 12 3.5Z"/>',

  /* Añadidos para que cada acción tenga su marca */
  swords: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6"/><path d="m16 16 4 4"/><path d="m19 21 2-2"/><path d="M9.5 6.5 14 2h3v3l-4.5 4.5"/><path d="m5 14 4 4"/><path d="m7 17-3 3"/><path d="m3 19 2 2"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>',
  fire: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.5 3-5.5 3.5-9 2 1.3 3 3 3 5 .8-.6 1.4-1.6 1.5-3 2.4 1.8 5 4.4 5 7 0 3.4-2.6 6-6.5 6Z"/><path d="M12 21c-1.6 0-2.7-1.1-2.7-2.6 0-1.6 1.4-2.4 1.7-4 1.9 1 3.7 2.4 3.7 4 0 1.5-1.1 2.6-2.7 2.6Z"/>',
  userPlus: '<circle cx="9.5" cy="8" r="3.5"/><path d="M3 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M19 8v6M16 11h6"/>',
  user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5c0-4 3.3-6.5 7.5-6.5s7.5 2.5 7.5 6.5"/>',
  crown: '<path d="M3.5 18h17"/><path d="M4.5 15 3 7l5 3.5L12 5l4 5.5L21 7l-1.5 8h-15Z"/>',
  tv: '<rect x="2.5" y="4.5" width="19" height="13" rx="2"/><path d="M8 21h8"/><path d="M12 17.5V21"/>',
  sparkle: '<path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7Z"/><path d="M19 16.5c.2 1.4.9 2.1 2.3 2.3-1.4.2-2.1.9-2.3 2.3-.2-1.4-.9-2.1-2.3-2.3 1.4-.2 2.1-.9 2.3-2.3Z"/>',
  heartPlus: '<path d="M12 20s-7.5-4.4-7.5-9.4A4.1 4.1 0 0 1 12 8.2a4.1 4.1 0 0 1 7.5 2.4c0 1.1-.4 2.2-1 3.2"/><path d="M18 15.5v5M15.5 18h5"/>',
  shieldPlus: '<path d="M12 3 5 5.8v5.4c0 4.4 3 7.6 7 9.3 4-1.7 7-4.9 7-9.3V5.8L12 3Z"/><path d="M12 8.5v6M9 11.5h6"/>',
  prev: '<path d="m15 6-6 6 6 6"/>',
  next: '<path d="m9 6 6 6-6 6"/>',
  skip: '<path d="m6 6 7 6-7 6V6Z"/><path d="M18 6v12"/>',
  hourglass: '<path d="M6.5 3h11M6.5 21h11"/><path d="M7.5 3v3.2a4.5 4.5 0 0 0 2 3.7L12 12l2.5-2.1a4.5 4.5 0 0 0 2-3.7V3"/><path d="M7.5 21v-3.2a4.5 4.5 0 0 1 2-3.7L12 12l2.5 2.1a4.5 4.5 0 0 1 2 3.7V21"/>',
  download: '<path d="M12 4v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4.5 19.5h15"/>',
  upload: '<path d="M12 15V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M4.5 19.5h15"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11.6 6.7"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1.4-1.4"/>',
  unlink: '<path d="M14.5 15.5 13 17a4 4 0 0 1-5.7-5.7l1.5-1.5"/><path d="M9.5 8.5 11 7a4 4 0 0 1 5.7 5.7l-1.5 1.5"/><path d="M4 4l16 16"/>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M5.5 12.3a9.5 9.5 0 0 1 13 0"/><path d="M8.7 15.6a5 5 0 0 1 6.6 0"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8.5-8.5"/><path d="m16.5 6.5 2.5 2.5"/><path d="m14.5 8.5 2 2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".9" fill="currentColor" stroke="none"/>',
  send: '<path d="M4 12 20 4l-4 16-4-6.5L4 12Z"/><path d="m12 13.5 8-9.5"/>',
  scroll: '<path d="M7 3.5h11a2 2 0 0 1 2 2V7h-4"/><path d="M16 7v11.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V17h10"/><path d="M7 3.5a2 2 0 0 0-2 2V17"/><path d="M9 8h4M9 11.5h4"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z"/>',
  skull: '<path d="M12 3a7.5 7.5 0 0 0-7.5 7.5c0 2.6 1.3 4.4 3 5.5V19h9v-3c1.7-1.1 3-2.9 3-5.5A7.5 7.5 0 0 0 12 3Z"/><circle cx="9" cy="11" r="1.5"/><circle cx="15" cy="11" r="1.5"/><path d="M10.5 19v2M13.5 19v2"/>',
  boot: '<path d="M7 3h6v8l6 3.5a2.5 2.5 0 0 1 1.5 2.3V20H4v-4l3-2V3Z"/><path d="M4 17h16.5"/>',
  zap: '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12l1-8Z"/>',
  play: '<path d="M7 4.5v15l12-7.5-12-7.5Z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none"/>',
  unlock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 7.6-1.7"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/>',
  ban: '<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>',
  diagonal: '<path d="M5 19 19 5"/><path d="M3.5 20.5h3M17.5 3.5h3"/>',
  room: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h4.5M15.5 12H20"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  scribble: '<path d="M3 17c2.5-3.5 4.5-6 6.5-4.5S9 18 12 18s4-5.5 8.5-10"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/>',
  micOff: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 10.7 5"/><path d="M12 17.5V21"/><path d="M4 4l16 16"/>',
  headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
  wand: '<path d="M4 20 15 9"/><path d="m14 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z"/><path d="m19 11 .6 1.2 1.2.6-1.2.6-.6 1.2-.6-1.2-1.2-.6 1.2-.6.6-1.2Z"/>',
};

/* Botón con icono y texto: el texto se puede esconder en pantallas estrechas
   (clase «lbl») y sigue sirviendo de nombre accesible. */
export const withIcon = (name, label, size = 17) => `${icon(name, size)}<span class="lbl">${label}</span>`;

export function icon(name, size = 18) {
  const body = P[name];
  if (!body) return "";
  return `<svg class="ico" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none"
    stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" focusable="false">${body}</svg>`;
}

/* Los mismos trazos, dibujados a mano en el lienzo del mapa */
export function drawGlyph(ctx, name, cx, cy, size, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size / 24, size / 24);
  ctx.translate(-12, -12);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.9;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (name === "note") {
    ctx.beginPath();
    ctx.moveTo(6, 3.5); ctx.lineTo(14.5, 3.5); ctx.lineTo(19, 8); ctx.lineTo(19, 20.5); ctx.lineTo(6, 20.5); ctx.closePath();
    ctx.globalAlpha = 0.22; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(9, 12); ctx.lineTo(16, 12); ctx.moveTo(9, 16); ctx.lineTo(14, 16); ctx.stroke();
  } else if (name === "stairs") {
    ctx.beginPath();
    ctx.moveTo(3.5, 20.5); ctx.lineTo(7.5, 20.5); ctx.lineTo(7.5, 16.5); ctx.lineTo(11.5, 16.5);
    ctx.lineTo(11.5, 12.5); ctx.lineTo(15.5, 12.5); ctx.lineTo(15.5, 8.5); ctx.lineTo(19.5, 8.5);
    ctx.stroke();
  }
  ctx.restore();
}
