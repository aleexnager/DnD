/* La forja de mapas: dibujar el plano.

   El orden es el de un plano a tinta: fondo, el rayado de roca alrededor de
   las paredes, la sombra, el suelo con su textura, la cuadrícula solo sobre
   el suelo, el agua, las paredes, las puertas, los objetos, la luz y los
   textos. Todo con Canvas 2D y formas dibujadas aquí: sin imágenes. */

import { solve, styleOf, rng, smoothPath, polyOf } from "./forja-core.js";

/* ---------- Objetos: cada uno se dibuja en una casilla de -0.5 a 0.5 ---------- */
const P = (ctx, f) => { ctx.beginPath(); f(); };
function outline(ctx, ink, w = 0.05) { ctx.lineWidth = w; ctx.strokeStyle = ink; ctx.stroke(); }

export const PROPS = {
  barrel: { name: "Barril", draw(ctx, ink, c) {
    P(ctx, () => ctx.arc(0, 0, 0.36, 0, Math.PI * 2)); ctx.fillStyle = c || "#9a6a3c"; ctx.fill(); outline(ctx, ink);
    P(ctx, () => ctx.arc(0, 0, 0.24, 0, Math.PI * 2)); outline(ctx, ink, 0.03);
    P(ctx, () => { ctx.moveTo(-0.08, -0.08); ctx.lineTo(0.08, 0.08); }); outline(ctx, ink, 0.03);
  } },
  crate: { name: "Caja", draw(ctx, ink, c) {
    P(ctx, () => ctx.rect(-0.36, -0.36, 0.72, 0.72)); ctx.fillStyle = c || "#b48850"; ctx.fill(); outline(ctx, ink);
    P(ctx, () => { ctx.moveTo(-0.36, -0.36); ctx.lineTo(0.36, 0.36); ctx.moveTo(0.36, -0.36); ctx.lineTo(-0.36, 0.36); }); outline(ctx, ink, 0.03);
  } },
  chest: { name: "Cofre", draw(ctx, ink, c) {
    P(ctx, () => ctx.rect(-0.38, -0.24, 0.76, 0.48)); ctx.fillStyle = c || "#8a5a2b"; ctx.fill(); outline(ctx, ink);
    P(ctx, () => { ctx.moveTo(-0.38, -0.06); ctx.lineTo(0.38, -0.06); }); outline(ctx, ink, 0.03);
    P(ctx, () => ctx.rect(-0.06, -0.12, 0.12, 0.14)); ctx.fillStyle = "#e0bd76"; ctx.fill(); outline(ctx, ink, 0.025);
  } },
  table: { name: "Mesa", draw(ctx, ink, c) {
    P(ctx, () => ctx.rect(-0.45, -0.3, 0.9, 0.6)); ctx.fillStyle = c || "#a77b4c"; ctx.fill(); outline(ctx, ink);
    P(ctx, () => { ctx.moveTo(-0.45, 0); ctx.lineTo(0.45, 0); }); outline(ctx, ink, 0.02);
  } },
  roundTable: { name: "Mesa redonda", draw(ctx, ink, c) {
    P(ctx, () => ctx.arc(0, 0, 0.42, 0, Math.PI * 2)); ctx.fillStyle = c || "#a77b4c"; ctx.fill(); outline(ctx, ink);
  } },
  chair: { name: "Silla", draw(ctx, ink, c) {
    P(ctx, () => ctx.rect(-0.2, -0.2, 0.4, 0.4)); ctx.fillStyle = c || "#8a6a45"; ctx.fill(); outline(ctx, ink, 0.04);
    P(ctx, () => ctx.rect(-0.2, -0.28, 0.4, 0.1)); ctx.fill(); outline(ctx, ink, 0.04);
  } },
  bed: { name: "Cama", draw(ctx, ink, c) {
    P(ctx, () => ctx.rect(-0.32, -0.46, 0.64, 0.92)); ctx.fillStyle = "#e9e1cf"; ctx.fill(); outline(ctx, ink);
    P(ctx, () => ctx.rect(-0.32, -0.08, 0.64, 0.54)); ctx.fillStyle = c || "#7a3b3b"; ctx.fill(); outline(ctx, ink, 0.03);
    P(ctx, () => ctx.rect(-0.22, -0.4, 0.44, 0.18)); ctx.fillStyle = "#ffffff"; ctx.fill(); outline(ctx, ink, 0.025);
  } },
  bookshelf: { name: "Estantería", draw(ctx, ink, c) {
    P(ctx, () => ctx.rect(-0.46, -0.18, 0.92, 0.36)); ctx.fillStyle = c || "#6b4a2b"; ctx.fill(); outline(ctx, ink);
    const cols = ["#7a3b3b", "#3b5a7a", "#4a6a3b", "#8a6a2b", "#5b3b7a"];
    for (let i = 0; i < 9; i++) { P(ctx, () => ctx.rect(-0.42 + i * 0.094, -0.12, 0.07, 0.24)); ctx.fillStyle = cols[i % 5]; ctx.fill(); }
  } },
  statue: { name: "Estatua", draw(ctx, ink, c) {
    P(ctx, () => ctx.rect(-0.38, -0.38, 0.76, 0.76)); ctx.fillStyle = "#b9b4aa"; ctx.fill(); outline(ctx, ink);
    P(ctx, () => ctx.arc(0, -0.05, 0.16, 0, Math.PI * 2)); ctx.fillStyle = c || "#d8d3c8"; ctx.fill(); outline(ctx, ink, 0.03);
    P(ctx, () => ctx.ellipse(0, 0.16, 0.24, 0.12, 0, 0, Math.PI * 2)); ctx.fill(); outline(ctx, ink, 0.03);
  } },
  pillar: { name: "Columna", draw(ctx, ink, c) {
    P(ctx, () => ctx.arc(0, 0, 0.34, 0, Math.PI * 2)); ctx.fillStyle = c || "#c8c2b4"; ctx.fill(); outline(ctx, ink, 0.06);
    P(ctx, () => ctx.arc(0, 0, 0.22, 0, Math.PI * 2)); outline(ctx, ink, 0.025);
  } },
  squarePillar: { name: "Pilar cuadrado", draw(ctx, ink, c) {
    P(ctx, () => ctx.rect(-0.36, -0.36, 0.72, 0.72)); ctx.fillStyle = c || "#3b3833"; ctx.fill(); outline(ctx, ink, 0.06);
  } },
  altar: { name: "Altar", draw(ctx, ink, c) {
    P(ctx, () => ctx.rect(-0.44, -0.26, 0.88, 0.52)); ctx.fillStyle = c || "#d8d0bd"; ctx.fill(); outline(ctx, ink);
    P(ctx, () => { ctx.moveTo(0, -0.18); ctx.lineTo(0, 0.18); ctx.moveTo(-0.12, -0.04); ctx.lineTo(0.12, -0.04); }); outline(ctx, ink, 0.04);
  } },
  well: { name: "Pozo", draw(ctx, ink, c) {
    P(ctx, () => ctx.arc(0, 0, 0.44, 0, Math.PI * 2)); ctx.fillStyle = c || "#9a9488"; ctx.fill(); outline(ctx, ink);
    P(ctx, () => ctx.arc(0, 0, 0.28, 0, Math.PI * 2)); ctx.fillStyle = "#1d2a33"; ctx.fill(); outline(ctx, ink, 0.03);
  } },
  fountain: { name: "Fuente", draw(ctx, ink, c) {
    P(ctx, () => ctx.arc(0, 0, 0.46, 0, Math.PI * 2)); ctx.fillStyle = "#b9b4aa"; ctx.fill(); outline(ctx, ink);
    P(ctx, () => ctx.arc(0, 0, 0.36, 0, Math.PI * 2)); ctx.fillStyle = c || "#7fb6d0"; ctx.fill();
    P(ctx, () => ctx.arc(0, 0, 0.1, 0, Math.PI * 2)); ctx.fillStyle = "#b9b4aa"; ctx.fill(); outline(ctx, ink, 0.03);
  } },
  brazier: { name: "Brasero", draw(ctx, ink, c) {
    P(ctx, () => ctx.arc(0, 0, 0.3, 0, Math.PI * 2)); ctx.fillStyle = "#3b3833"; ctx.fill(); outline(ctx, ink);
    P(ctx, () => ctx.arc(0, 0, 0.2, 0, Math.PI * 2)); ctx.fillStyle = c || "#f08a2b"; ctx.fill();
    P(ctx, () => ctx.arc(0, 0, 0.09, 0, Math.PI * 2)); ctx.fillStyle = "#ffe08a"; ctx.fill();
  } },
  campfire: { name: "Hoguera", draw(ctx, ink, c) {
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; P(ctx, () => ctx.arc(Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0.09, 0, Math.PI * 2)); ctx.fillStyle = "#8a847a"; ctx.fill(); outline(ctx, ink, 0.025); }
    P(ctx, () => { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 - Math.PI / 2; ctx.lineTo(Math.cos(a) * 0.2, Math.sin(a) * 0.2); ctx.lineTo(Math.cos(a + 0.6) * 0.08, Math.sin(a + 0.6) * 0.08); } ctx.closePath(); });
    ctx.fillStyle = c || "#f08a2b"; ctx.fill();
  } },
  torch: { name: "Antorcha de pared", draw(ctx, ink, c) {
    P(ctx, () => ctx.rect(-0.05, 0.05, 0.1, 0.35)); ctx.fillStyle = "#6b4a2b"; ctx.fill(); outline(ctx, ink, 0.025);
    P(ctx, () => { ctx.moveTo(0, -0.3); ctx.quadraticCurveTo(0.16, -0.05, 0, 0.06); ctx.quadraticCurveTo(-0.16, -0.05, 0, -0.3); });
    ctx.fillStyle = c || "#f5a33a"; ctx.fill();
  } },
  stairsDown: { name: "Escaleras abajo", draw(ctx, ink) {
    for (let i = 0; i < 6; i++) { P(ctx, () => ctx.rect(-0.45, -0.45 + i * 0.15, 0.9, 0.15)); ctx.fillStyle = `rgba(0,0,0,${0.04 + i * 0.07})`; ctx.fill(); outline(ctx, ink, 0.025); }
    P(ctx, () => { ctx.moveTo(0, -0.3); ctx.lineTo(0, 0.28); ctx.moveTo(-0.1, 0.16); ctx.lineTo(0, 0.28); ctx.lineTo(0.1, 0.16); }); outline(ctx, ink, 0.04);
  } },
  stairsUp: { name: "Escaleras arriba", draw(ctx, ink) {
    for (let i = 0; i < 6; i++) { P(ctx, () => ctx.rect(-0.45, -0.45 + i * 0.15, 0.9, 0.15)); ctx.fillStyle = `rgba(255,255,255,${0.5 - i * 0.07})`; ctx.fill(); outline(ctx, ink, 0.025); }
    P(ctx, () => { ctx.moveTo(0, 0.3); ctx.lineTo(0, -0.28); ctx.moveTo(-0.1, -0.16); ctx.lineTo(0, -0.28); ctx.lineTo(0.1, -0.16); }); outline(ctx, ink, 0.04);
  } },
  spiralStairs: { name: "Escalera de caracol", draw(ctx, ink) {
    P(ctx, () => ctx.arc(0, 0, 0.45, 0, Math.PI * 2)); ctx.fillStyle = "rgba(0,0,0,.06)"; ctx.fill(); outline(ctx, ink);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; P(ctx, () => { ctx.moveTo(Math.cos(a) * 0.1, Math.sin(a) * 0.1); ctx.lineTo(Math.cos(a) * 0.45, Math.sin(a) * 0.45); }); outline(ctx, ink, 0.025); }
    P(ctx, () => ctx.arc(0, 0, 0.1, 0, Math.PI * 2)); ctx.fillStyle = ink; ctx.fill();
  } },
  ladder: { name: "Escalera de mano", draw(ctx, ink) {
    P(ctx, () => { ctx.moveTo(-0.18, -0.45); ctx.lineTo(-0.18, 0.45); ctx.moveTo(0.18, -0.45); ctx.lineTo(0.18, 0.45); for (let i = -3; i <= 3; i++) { ctx.moveTo(-0.18, i * 0.13); ctx.lineTo(0.18, i * 0.13); } });
    outline(ctx, ink, 0.05);
  } },
  trapdoor: { name: "Trampilla", draw(ctx, ink, c) {
    P(ctx, () => ctx.rect(-0.38, -0.38, 0.76, 0.76)); ctx.fillStyle = c || "#8a6a45"; ctx.fill(); outline(ctx, ink);
    P(ctx, () => { for (let i = -2; i <= 2; i++) { ctx.moveTo(i * 0.15, -0.38); ctx.lineTo(i * 0.15, 0.38); } }); outline(ctx, ink, 0.02);
    P(ctx, () => ctx.arc(0.22, 0, 0.05, 0, Math.PI * 2)); ctx.fillStyle = ink; ctx.fill();
  } },
  pit: { name: "Foso", draw(ctx, ink) {
    P(ctx, () => ctx.rect(-0.45, -0.45, 0.9, 0.9)); ctx.fillStyle = "#0b0b0d"; ctx.fill(); outline(ctx, ink);
    P(ctx, () => ctx.rect(-0.3, -0.3, 0.6, 0.6)); ctx.fillStyle = "#000"; ctx.fill();
  } },
  coffin: { name: "Ataúd", draw(ctx, ink, c) {
    P(ctx, () => { ctx.moveTo(-0.12, -0.46); ctx.lineTo(0.12, -0.46); ctx.lineTo(0.24, -0.2); ctx.lineTo(0.16, 0.46); ctx.lineTo(-0.16, 0.46); ctx.lineTo(-0.24, -0.2); ctx.closePath(); });
    ctx.fillStyle = c || "#4a3322"; ctx.fill(); outline(ctx, ink);
  } },
  sarcophagus: { name: "Sarcófago", draw(ctx, ink, c) {
    P(ctx, () => ctx.rect(-0.28, -0.46, 0.56, 0.92)); ctx.fillStyle = c || "#b9b4aa"; ctx.fill(); outline(ctx, ink);
    P(ctx, () => ctx.rect(-0.18, -0.36, 0.36, 0.72)); outline(ctx, ink, 0.025);
  } },
  throne: { name: "Trono", draw(ctx, ink, c) {
    P(ctx, () => ctx.rect(-0.34, -0.4, 0.68, 0.8)); ctx.fillStyle = "#d4a83a"; ctx.fill(); outline(ctx, ink);
    P(ctx, () => ctx.rect(-0.24, -0.16, 0.48, 0.5)); ctx.fillStyle = c || "#7a2b2b"; ctx.fill(); outline(ctx, ink, 0.03);
  } },
  rug: { name: "Alfombra", draw(ctx, ink, c) {
    P(ctx, () => ctx.rect(-0.46, -0.32, 0.92, 0.64)); ctx.fillStyle = c || "#7a2b2b"; ctx.fill(); outline(ctx, ink, 0.03);
    P(ctx, () => ctx.rect(-0.38, -0.24, 0.76, 0.48)); ctx.strokeStyle = "#e0bd76"; ctx.lineWidth = 0.03; ctx.stroke();
  } },
  rubble: { name: "Escombros", draw(ctx, ink, c, seed) {
    const R = rng(seed || 3);
    for (let i = 0; i < 8; i++) {
      const x = (R() - 0.5) * 0.7, y = (R() - 0.5) * 0.7, r = 0.05 + R() * 0.09;
      P(ctx, () => { for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + R(); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); });
      ctx.fillStyle = c || "#9a948a"; ctx.fill(); outline(ctx, ink, 0.025);
    }
  } },
  rock: { name: "Roca", draw(ctx, ink, c, seed) {
    const R = rng(seed || 5);
    P(ctx, () => { for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, r = 0.32 + R() * 0.12; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); });
    ctx.fillStyle = c || "#8a847a"; ctx.fill(); outline(ctx, ink);
  } },
  bones: { name: "Huesos", draw(ctx, ink) {
    P(ctx, () => ctx.arc(-0.12, -0.08, 0.13, 0, Math.PI * 2)); ctx.fillStyle = "#efe8d6"; ctx.fill(); outline(ctx, ink, 0.03);
    P(ctx, () => { ctx.moveTo(0, 0.05); ctx.lineTo(0.34, 0.3); ctx.moveTo(-0.3, 0.3); ctx.lineTo(0.1, 0.2); }); outline(ctx, ink, 0.06);
  } },
  web: { name: "Telaraña", draw(ctx, ink) {
    ctx.globalAlpha *= 0.8;
    P(ctx, () => { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 0.48, Math.sin(a) * 0.48); }
      for (const r of [0.14, 0.28, 0.42]) { for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI * 2; ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r); } } });
    outline(ctx, "#d8d8d8", 0.02);
  } },
  tree: { name: "Árbol", draw(ctx, ink, c, seed) {
    const R = rng(seed || 9);
    P(ctx, () => { for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, r = 0.38 + R() * 0.1; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); });
    ctx.fillStyle = c || "#4f7a3a"; ctx.fill(); outline(ctx, ink);
    P(ctx, () => ctx.arc(0.04, 0.04, 0.12, 0, Math.PI * 2)); ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fill();
  } },
  bush: { name: "Arbusto", draw(ctx, ink, c) {
    for (const [x, y, r] of [[-0.14, 0, 0.2], [0.14, -0.06, 0.2], [0.04, 0.14, 0.18]]) { P(ctx, () => ctx.arc(x, y, r, 0, Math.PI * 2)); ctx.fillStyle = c || "#5f8a45"; ctx.fill(); outline(ctx, ink, 0.03); }
  } },
  anvil: { name: "Yunque", draw(ctx, ink, c) {
    P(ctx, () => { ctx.moveTo(-0.4, -0.12); ctx.lineTo(0.3, -0.12); ctx.lineTo(0.44, -0.04); ctx.lineTo(0.3, 0.12); ctx.lineTo(-0.4, 0.12); ctx.closePath(); });
    ctx.fillStyle = c || "#4a4a50"; ctx.fill(); outline(ctx, ink);
  } },
  cauldron: { name: "Caldero", draw(ctx, ink, c) {
    P(ctx, () => ctx.arc(0, 0, 0.36, 0, Math.PI * 2)); ctx.fillStyle = "#2b2b2f"; ctx.fill(); outline(ctx, ink);
    P(ctx, () => ctx.arc(0, 0, 0.26, 0, Math.PI * 2)); ctx.fillStyle = c || "#5fae5a"; ctx.fill();
  } },
  cage: { name: "Jaula", draw(ctx, ink) {
    P(ctx, () => ctx.rect(-0.4, -0.4, 0.8, 0.8)); outline(ctx, ink, 0.05);
    P(ctx, () => { for (let i = -3; i <= 3; i++) { ctx.moveTo(i * 0.1, -0.4); ctx.lineTo(i * 0.1, 0.4); } }); outline(ctx, ink, 0.025);
  } },
  weaponRack: { name: "Armero", draw(ctx, ink, c) {
    P(ctx, () => ctx.rect(-0.46, -0.1, 0.92, 0.2)); ctx.fillStyle = c || "#6b4a2b"; ctx.fill(); outline(ctx, ink);
    P(ctx, () => { for (let i = -2; i <= 2; i++) { ctx.moveTo(i * 0.18, -0.3); ctx.lineTo(i * 0.18, 0.3); } }); outline(ctx, "#9aa0a8", 0.04);
  } },
  banner: { name: "Estandarte", draw(ctx, ink, c) {
    P(ctx, () => { ctx.moveTo(-0.3, -0.35); ctx.lineTo(0.3, -0.35); ctx.lineTo(0.3, 0.3); ctx.lineTo(0, 0.15); ctx.lineTo(-0.3, 0.3); ctx.closePath(); });
    ctx.fillStyle = c || "#7a2b2b"; ctx.fill(); outline(ctx, ink);
  } },
  chandelier: { name: "Lámpara", draw(ctx, ink, c) {
    P(ctx, () => ctx.arc(0, 0, 0.36, 0, Math.PI * 2)); outline(ctx, ink, 0.04);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; P(ctx, () => ctx.arc(Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0.06, 0, Math.PI * 2)); ctx.fillStyle = c || "#ffd27a"; ctx.fill(); }
  } },
  boat: { name: "Barca", draw(ctx, ink, c) {
    P(ctx, () => { ctx.moveTo(0, -0.48); ctx.quadraticCurveTo(0.3, -0.1, 0.18, 0.46); ctx.lineTo(-0.18, 0.46); ctx.quadraticCurveTo(-0.3, -0.1, 0, -0.48); });
    ctx.fillStyle = c || "#8a5a2b"; ctx.fill(); outline(ctx, ink);
  } },
  grave: { name: "Tumba", draw(ctx, ink, c) {
    P(ctx, () => { ctx.moveTo(-0.24, 0.4); ctx.lineTo(-0.24, -0.2); ctx.arc(0, -0.2, 0.24, Math.PI, 0); ctx.lineTo(0.24, 0.4); ctx.closePath(); });
    ctx.fillStyle = c || "#b9b4aa"; ctx.fill(); outline(ctx, ink);
  } },
  x: { name: "Marca (X)", draw(ctx, ink, c) {
    P(ctx, () => { ctx.moveTo(-0.3, -0.3); ctx.lineTo(0.3, 0.3); ctx.moveTo(0.3, -0.3); ctx.lineTo(-0.3, 0.3); }); outline(ctx, c || "#a32020", 0.1);
  } }
};
export const PROP_GROUPS = [
  ["Mobiliario", ["table", "roundTable", "chair", "bed", "bookshelf", "chest", "crate", "barrel", "rug", "throne", "weaponRack", "anvil", "cauldron", "banner", "cage"]],
  ["Templo y cripta", ["altar", "statue", "pillar", "squarePillar", "coffin", "sarcophagus", "grave", "bones", "fountain", "well"]],
  ["Paso", ["stairsDown", "stairsUp", "spiralStairs", "ladder", "trapdoor", "pit"]],
  ["Luz y fuego", ["brazier", "campfire", "torch", "chandelier"]],
  ["Naturaleza", ["tree", "bush", "rock", "rubble", "web", "boat"]],
  ["Marcas", ["x"]]
];

export function drawProp(ctx, it, ppc, ink) {
  const def = PROPS[it.kind];
  if (!def) return;
  ctx.save();
  ctx.translate(it.x * ppc, it.y * ppc);
  ctx.rotate((it.rot || 0) * Math.PI / 180);
  if (it.flip) ctx.scale(-1, 1);
  ctx.scale(ppc * it.scale, ppc * it.scale);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  def.draw(ctx, ink, it.color, hashId(it.id));
  ctx.restore();
}
const hashId = id => [...String(id)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

/* ---------- El plano entero ---------- */
const FONTS = { serif: "Georgia, 'Palatino Linotype', serif", sans: "system-ui, sans-serif", mono: "'Courier New', monospace", hand: "'Segoe Print', 'Comic Sans MS', cursive" };

function loopsPath(loops, ppc) {
  const p = new Path2D();
  for (const l of loops) {
    l.forEach(([x, y], i) => (i ? p.lineTo(x * ppc, y * ppc) : p.moveTo(x * ppc, y * ppc)));
    p.closePath();
  }
  return p;
}
function linePath(points, ppc) {
  const p = new Path2D();
  points.forEach(([x, y], i) => (i ? p.lineTo(x * ppc, y * ppc) : p.moveTo(x * ppc, y * ppc)));
  return p;
}

/* El rayado de roca: trazos cortos en grupos de tres, cada grupo girado al
   azar, como lo haría una plumilla. Se pinta una vez por estilo y tamaño. */
const hatchCache = new Map();
function hatchCanvas(W, H, ppc, color, seed = 11) {
  const key = [W, H, ppc, color, seed].join("|");
  if (hatchCache.has(key)) return hatchCache.get(key);
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  const R = rng(seed), step = ppc * 0.42;
  x.strokeStyle = color; x.lineWidth = Math.max(1, ppc * 0.025); x.lineCap = "round";
  for (let gy = -step; gy < H + step; gy += step) {
    for (let gx = -step; gx < W + step; gx += step) {
      const a = R() * Math.PI, cx = gx + R() * step * 0.5, cy = gy + R() * step * 0.5, len = step * (0.7 + R() * 0.4);
      const nx = Math.cos(a + Math.PI / 2) * step * 0.22, ny = Math.sin(a + Math.PI / 2) * step * 0.22;
      x.beginPath();
      for (let k = -1; k <= 1; k++) {
        x.moveTo(cx + k * nx - Math.cos(a) * len / 2, cy + k * ny - Math.sin(a) * len / 2);
        x.lineTo(cx + k * nx + Math.cos(a) * len / 2, cy + k * ny + Math.sin(a) * len / 2);
      }
      x.stroke();
    }
  }
  if (hatchCache.size > 6) hatchCache.delete(hatchCache.keys().next().value);
  hatchCache.set(key, c);
  return c;
}

/* Puntitos y vetas del suelo, para que no parezca plano */
function texture(ctx, W, H, ppc, amount, seed = 3) {
  if (!amount) return;
  const R = rng(seed);
  const n = Math.round((W * H) / (ppc * ppc) * 10 * amount);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = R() < 0.5 ? `rgba(0,0,0,${0.04 + R() * 0.08})` : `rgba(255,255,255,${0.03 + R() * 0.05})`;
    const r = ppc * (0.02 + R() * 0.05);
    ctx.fillRect(R() * W, R() * H, r, r);
  }
}

/* opts: ppc (píxeles por casilla), grid (forzar o quitar), hideLayer (id) */
export function renderDesign(ctx, design, opts = {}) {
  const ppc = opts.ppc || 70;
  const st = styleOf(design);
  const W = design.cols * ppc, H = design.rows * ppc;
  const s = solve(design);
  const floorP = loopsPath(s.floorLoops, ppc);

  ctx.save();
  ctx.fillStyle = st.bg; ctx.fillRect(0, 0, W, H);

  /* Rayado alrededor de las paredes */
  if (st.hatch && s.floorLoops.length) {
    const band = document.createElement("canvas");
    band.width = W; band.height = H;
    const b = band.getContext("2d");
    b.drawImage(hatchCanvas(W, H, ppc, st.hatchColor), 0, 0);
    b.globalCompositeOperation = "destination-in";
    b.lineJoin = "round";
    b.lineWidth = st.hatchWidth * 2 * ppc;
    b.strokeStyle = "#000";
    b.stroke(floorP);
    ctx.drawImage(band, 0, 0);
  }

  /* Sombra y suelo */
  if (st.shadow) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = ppc * 0.35; ctx.shadowOffsetX = ppc * 0.06; ctx.shadowOffsetY = ppc * 0.1;
    ctx.fillStyle = st.floor; ctx.fill(floorP, "evenodd");
    ctx.restore();
  }
  ctx.fillStyle = st.floor; ctx.fill(floorP, "evenodd");
  ctx.save();
  ctx.clip(floorP, "evenodd");
  texture(ctx, W, H, ppc, st.texture);
  /* Agua, solo sobre el suelo… */
  if (s.waterLoops.length) drawWater(ctx, s.waterLoops, ppc, st);
  /* …y la cuadrícula */
  const gridMode = opts.grid === false ? "none" : st.grid;
  if (gridMode === "floor") drawGrid(ctx, design, ppc, st);
  ctx.restore();
  if (gridMode === "all") drawGrid(ctx, design, ppc, st);
  /* El agua fuera del suelo (un lago al aire libre) también se ve */
  if (s.waterLoops.length) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H);
    for (const l of s.floorLoops) { l.forEach(([x, y], i) => (i ? ctx.lineTo(x * ppc, y * ppc) : ctx.moveTo(x * ppc, y * ppc))); ctx.closePath(); }
    ctx.clip("evenodd");
    drawWater(ctx, s.waterLoops, ppc, st);
    ctx.restore();
  }

  const items = [];
  for (const layer of design.layers) {
    if (!layer.visible || layer.id === opts.hideLayer) continue;
    for (const it of layer.items) items.push([layer, it]);
  }
  /* Caminos (por debajo de las paredes) */
  for (const [layer, it] of items) if (it.type === "path") withAlpha(ctx, layer.opacity, () => drawPath(ctx, it, ppc));

  /* Paredes: el borde del suelo y los muros sueltos */
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.strokeStyle = st.wall; ctx.lineWidth = Math.max(1.5, st.wallWidth * ppc);
  ctx.stroke(floorP);
  for (const [layer, it] of items) {
    if (it.type !== "wall" || it.points.length < 2) continue;
    withAlpha(ctx, layer.opacity, () => {
      const p = linePath(it.smooth ? smoothPath(it.points, false, 6) : it.points, ppc);
      if (it.kind === "window") {
        ctx.strokeStyle = st.wall; ctx.lineWidth = Math.max(1.5, st.wallWidth * ppc); ctx.stroke(p);
        ctx.strokeStyle = "#cfe6f2"; ctx.lineWidth = Math.max(1, st.wallWidth * ppc * 0.45); ctx.stroke(p);
      } else { ctx.strokeStyle = st.wall; ctx.lineWidth = Math.max(1.5, st.wallWidth * ppc); ctx.stroke(p); }
    });
  }
  /* Puertas, objetos, luces y textos, capa a capa */
  for (const [layer, it] of items) {
    withAlpha(ctx, layer.opacity, () => {
      if (it.type === "door") drawDoor(ctx, it, ppc, st);
      else if (it.type === "prop") drawProp(ctx, it, ppc, st.wall);
    });
  }
  for (const [layer, it] of items) if (it.type === "light") withAlpha(ctx, layer.opacity, () => drawLight(ctx, it, ppc));
  for (const [layer, it] of items) if (it.type === "text") withAlpha(ctx, layer.opacity, () => drawText(ctx, it, ppc, st));
  ctx.restore();
}

function withAlpha(ctx, a, f) {
  if (a >= 1) return f();
  ctx.save(); ctx.globalAlpha *= a; f(); ctx.restore();
}

function drawGrid(ctx, design, ppc, st) {
  ctx.save();
  ctx.globalAlpha = st.gridAlpha;
  ctx.strokeStyle = st.gridColor; ctx.lineWidth = Math.max(1, ppc * 0.018);
  ctx.beginPath();
  for (let x = 0; x <= design.cols; x++) { ctx.moveTo(x * ppc, 0); ctx.lineTo(x * ppc, design.rows * ppc); }
  for (let y = 0; y <= design.rows; y++) { ctx.moveTo(0, y * ppc); ctx.lineTo(design.cols * ppc, y * ppc); }
  ctx.stroke();
  ctx.restore();
}

function drawWater(ctx, loops, ppc, st) {
  const p = loopsPath(loops, ppc);
  ctx.save();
  ctx.fillStyle = st.water; ctx.fill(p, "evenodd");
  ctx.clip(p, "evenodd");
  /* Ondas suaves */
  ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = Math.max(1, ppc * 0.025);
  const R = rng(17);
  const xs = loops.flat().map(q => q[0] * ppc), ys = loops.flat().map(q => q[1] * ppc);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), bw = Math.max(...xs) - x0, bh = Math.max(...ys) - y0;
  const n = Math.min(3000, Math.round(bw * bh / (ppc * ppc) * 1.6));
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * bw, y = y0 + R() * bh, w = ppc * (0.25 + R() * 0.3);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + w / 2, y - ppc * 0.06, x + w, y); ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = Math.max(1, ppc * 0.03); ctx.stroke(p);
  ctx.restore();
}

function drawPath(ctx, it, ppc) {
  if (it.points.length < 2) return;
  ctx.save();
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.strokeStyle = it.color; ctx.lineWidth = it.width * ppc;
  if (it.dashed) ctx.setLineDash([ppc * 0.3, ppc * 0.25]);
  ctx.stroke(linePath(it.smooth ? smoothPath(it.points, false, 6) : it.points, ppc));
  ctx.restore();
}

export function drawDoor(ctx, it, ppc, st) {
  const x1 = it.x1 * ppc, y1 = it.y1 * ppc, x2 = it.x2 * ppc, y2 = it.y2 * ppc;
  const len = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1);
  const ww = Math.max(2, st.wallWidth * ppc);
  ctx.save();
  ctx.translate((x1 + x2) / 2, (y1 + y2) / 2);
  ctx.rotate(a);
  /* El hueco en la pared */
  ctx.fillStyle = st.floor;
  ctx.fillRect(-len / 2 + ww * 0.3, -ww, len - ww * 0.6, ww * 2);
  ctx.strokeStyle = st.wall; ctx.fillStyle = st.floor; ctx.lineWidth = Math.max(1, ppc * 0.035);
  const d = len * 0.82, t = Math.max(ww * 1.4, ppc * 0.16);
  switch (it.kind) {
    case "door": case "double":
      ctx.fillStyle = "#c79a5e"; ctx.fillRect(-d / 2, -t / 2, d, t); ctx.strokeRect(-d / 2, -t / 2, d, t);
      if (it.kind === "double") { ctx.beginPath(); ctx.moveTo(0, -t / 2); ctx.lineTo(0, t / 2); ctx.stroke(); }
      break;
    case "open":
      ctx.fillStyle = "#c79a5e";
      ctx.save(); ctx.translate(-d / 2, 0); ctx.rotate(-Math.PI / 2.3); ctx.fillRect(0, -t / 2, d, t); ctx.strokeRect(0, -t / 2, d, t); ctx.restore();
      ctx.setLineDash([ppc * 0.05, ppc * 0.05]); ctx.beginPath(); ctx.arc(-d / 2, 0, d, -Math.PI / 2.3, 0); ctx.stroke();
      break;
    case "secret":
      ctx.strokeStyle = st.wall; ctx.lineWidth = ww; ctx.beginPath(); ctx.moveTo(-len / 2, 0); ctx.lineTo(len / 2, 0); ctx.stroke();
      ctx.fillStyle = st.wall; ctx.font = `bold ${ppc * 0.42}px Georgia, serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("S", 0, -ppc * 0.32);
      break;
    case "portcullis":
      ctx.lineWidth = Math.max(1, ppc * 0.03);
      ctx.beginPath(); ctx.moveTo(-d / 2, 0); ctx.lineTo(d / 2, 0); for (let i = 0; i <= 5; i++) { const x = -d / 2 + i * d / 5; ctx.moveTo(x, -t / 2); ctx.lineTo(x, t / 2); } ctx.stroke();
      break;
    case "arch":
      ctx.fillStyle = st.wall;
      ctx.fillRect(-len / 2, -ww * 0.9, ww * 0.9, ww * 1.8); ctx.fillRect(len / 2 - ww * 0.9, -ww * 0.9, ww * 0.9, ww * 1.8);
      break;
    case "window":
      ctx.strokeStyle = st.wall; ctx.lineWidth = ww; ctx.beginPath(); ctx.moveTo(-len / 2, 0); ctx.lineTo(len / 2, 0); ctx.stroke();
      ctx.strokeStyle = "#cfe6f2"; ctx.lineWidth = ww * 0.45; ctx.beginPath(); ctx.moveTo(-d / 2, 0); ctx.lineTo(d / 2, 0); ctx.stroke();
      break;
  }
  ctx.restore();
}

function drawLight(ctx, it, ppc) {
  const x = it.x * ppc, y = it.y * ppc, r = it.radius * ppc;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hexA(it.color, 0.42)); g.addColorStop(0.55, hexA(it.color, 0.16)); g.addColorStop(1, hexA(it.color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
const hexA = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;

function drawText(ctx, it, ppc, st) {
  if (!it.text) return;
  ctx.save();
  ctx.translate(it.x * ppc, it.y * ppc);
  ctx.rotate((it.rot || 0) * Math.PI / 180);
  ctx.font = `${it.bold ? "bold " : ""}${Math.round(it.size * ppc)}px ${FONTS[it.font] || FONTS.serif}`;
  ctx.textAlign = it.align; ctx.textBaseline = "alphabetic";
  if (it.shadow) { ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = ppc * 0.12; ctx.shadowOffsetY = ppc * 0.03; }
  ctx.fillStyle = it.color || st.text;
  ctx.fillText(it.text, 0, 0);
  ctx.restore();
}

/* La silueta de una pieza de suelo mientras se dibuja o se elige */
export function itemOutline(it, ppc) {
  const p = new Path2D();
  if (it.type === "floor" || it.type === "water") {
    if (it.shape === "rect") { if (p.roundRect) p.roundRect(it.x * ppc, it.y * ppc, it.w * ppc, it.h * ppc, Math.min(it.r, it.w / 2, it.h / 2) * ppc); else p.rect(it.x * ppc, it.y * ppc, it.w * ppc, it.h * ppc); }
    else if (it.shape === "ellipse") p.ellipse((it.x + it.w / 2) * ppc, (it.y + it.h / 2) * ppc, it.w / 2 * ppc, it.h / 2 * ppc, 0, 0, Math.PI * 2);
    else if (it.shape === "poly") { polyOf(it).forEach(([x, y], i) => (i ? p.lineTo(x * ppc, y * ppc) : p.moveTo(x * ppc, y * ppc))); p.closePath(); }
    else if (it.shape === "cave") { for (const [x, y] of it.points) { p.moveTo((x + it.radius) * ppc, y * ppc); p.arc(x * ppc, y * ppc, it.radius * ppc, 0, Math.PI * 2); } }
    else if (it.shape === "cells") for (const k of it.cells) { const [x, y] = k.split(",").map(Number); p.rect(x * ppc, y * ppc, ppc, ppc); }
  }
  return p;
}
