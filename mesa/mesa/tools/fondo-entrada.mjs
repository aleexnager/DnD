/* Genera public/art/entrada.svg: el fondo de la pantalla de entrada.
   Una escena nocturna dibujada para Mesa: cielo estrellado, luna grande,
   cordilleras en capas, un castillo en un risco con las ventanas encendidas,
   un dragón que cruza la luna, niebla que se mueve y brasas que suben.

   El dragón es el «wyvern» de Lorc en game-icons.net (CC BY 3.0); el resto
   se dibuja aquí. Las estrellas salen de una semilla fija, así que el archivo
   no cambia si se vuelve a generar.

   Uso: node tools/fondo-entrada.mjs <wyvern.svg de game-icons> */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const W = 1600, H = 900;
const src = readFileSync(process.argv[2] || "wyvern.svg", "utf8");
const wyvern = [...src.matchAll(/<path[^>]*d="([^"]+)"/g)].map(m => m[1]).find(d => d.length > 100);
if (!wyvern) throw new Error("No encuentro el dibujo del wyvern");

let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const f = n => Math.round(n * 10) / 10;

/* Estrellas: más densas arriba, alguna que titila */
const stars = [];
for (let i = 0; i < 170; i++) {
  const x = rnd() * W, y = Math.pow(rnd(), 1.6) * H * 0.62, r = 0.4 + Math.pow(rnd(), 3) * 1.6;
  const tw = rnd() < 0.18 ? ` class="tw" style="animation-delay:${f(rnd() * 6)}s"` : "";
  stars.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" opacity="${f(0.35 + rnd() * 0.6)}"${tw}/>`);
}

/* Una cordillera: picos al azar entre dos alturas, unidos con curvas
   (Catmull-Rom pasada a Bézier) para que no parezca recortada a tijera */
function ridge(base, amp, step, jag) {
  const pts = [];
  for (let x = -step; x <= W + step * 2; x += step) pts.push([x, base - amp * (0.35 + 0.65 * rnd()) + (rnd() - 0.5) * jag]);
  let d = `M${f(pts[0][0])} ${H} L${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + ` L${f(pts[pts.length - 1][0])} ${H} Z`;
}

/* Brasas que suben desde abajo */
const embers = [];
for (let i = 0; i < 26; i++) {
  embers.push(`<circle class="em" cx="${f(rnd() * W)}" cy="${f(H - 10 - rnd() * 60)}" r="${f(1.6 + rnd() * 2.6)}" style="animation-duration:${f(9 + rnd() * 10)}s;animation-delay:-${f(rnd() * 18)}s"/>`);
}

/* Castillo en lo alto de un risco: torres, tejados de aguja y almenas */
const castle = (() => {
  const parts = [];
  const tower = (x, top, w, roof) => {
    parts.push(`<rect x="${x}" y="${top}" width="${w}" height="${800 - top}"/>`);
    parts.push(`<path d="M${x - 4} ${top} L${x + w / 2} ${top - roof} L${x + w + 4} ${top} Z"/>`);
  };
  parts.push(`<path d="M300 900 L310 742 L338 716 L372 708 L392 676 L470 668 L520 690 L566 684 L590 720 L612 900 Z"/>`); // risco
  parts.push(`<rect x="362" y="602" width="196" height="96"/>`);                                                          // muralla
  for (let x = 362; x < 556; x += 14) parts.push(`<rect x="${x}" y="592" width="8" height="12"/>`);                        // almenas
  tower(350, 548, 30, 46); tower(540, 560, 28, 40); tower(436, 486, 40, 70); tower(404, 540, 22, 34); tower(488, 528, 24, 38);
  parts.push(`<rect x="452" y="400" width="8" height="18"/><path d="M460 400 L484 406 L460 412 Z"/>`);                    // banderola
  const lit = [[362, 572], [368, 600], [446, 512], [462, 540], [452, 576], [546, 584], [496, 556], [410, 560], [520, 640], [390, 640]];
  const win = lit.map(([x, y], i) => `<rect class="win" x="${x}" y="${y}" width="5" height="9" rx="2" style="animation-delay:${f(i * 0.7)}s"/>`);
  return { body: parts.join(""), win: win.join("") };
})();

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<!-- Fondo de la entrada de Mesa. Escena original; el dragón es el «wyvern» de Lorc,
     game-icons.net, CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/). -->
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#05070d"/><stop offset=".45" stop-color="#121226"/>
    <stop offset=".72" stop-color="#2a1f2c"/><stop offset="1" stop-color="#3b2418"/>
  </linearGradient>
  <radialGradient id="halo" cx="1150" cy="290" r="520" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#f6e2a8" stop-opacity=".38"/><stop offset=".35" stop-color="#c89b4a" stop-opacity=".12"/>
    <stop offset="1" stop-color="#c89b4a" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="moon" cx=".42" cy=".38" r=".7">
    <stop offset="0" stop-color="#fff6d8"/><stop offset=".7" stop-color="#ecd49a"/><stop offset="1" stop-color="#c7a462"/>
  </radialGradient>
  <radialGradient id="glow" cx="800" cy="980" r="700" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#ff8a3c" stop-opacity=".28"/><stop offset="1" stop-color="#ff8a3c" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="vig" cx=".5" cy=".5" r=".75">
    <stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/>
  </radialGradient>
  <filter id="blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>
  <filter id="soft"><feGaussianBlur stdDeviation="2.5"/></filter>
</defs>
<style>
  .tw { animation: tw 5s ease-in-out infinite; }
  @keyframes tw { 50% { opacity: .15; } }
  .mist { animation: drift 70s linear infinite alternate; }
  .mist.b { animation-duration: 95s; animation-direction: alternate-reverse; }
  @keyframes drift { to { transform: translateX(-160px); } }
  .dragon { animation: fly 46s linear infinite; transform-box: view-box; }
  @keyframes fly {
    0% { transform: translate(1750px, 330px) scale(.3) rotate(-4deg); }
    50% { transform: translate(800px, 210px) scale(.3) rotate(3deg); }
    100% { transform: translate(-260px, 300px) scale(.3) rotate(-4deg); }
  }
  .wing { animation: flap 1.6s ease-in-out infinite; transform-origin: 256px 256px; transform-box: view-box; }
  @keyframes flap { 50% { transform: scaleY(.86); } }
  .win { fill: #ffb347; animation: flick 3.2s ease-in-out infinite; }
  @keyframes flick { 40% { opacity: .65; } 55% { opacity: 1; } 70% { opacity: .8; } }
  .em { fill: #ffb45a; animation: rise linear infinite; opacity: 0; }
  @keyframes rise { 0% { transform: translate(0, 0); opacity: 0; } 12% { opacity: .9; } 100% { transform: translate(40px, -620px); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } .em { opacity: .5; } .dragon { transform: translate(1080px, 230px) scale(.3); } }
</style>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<g fill="#fff">${stars.join("")}</g>
<rect width="${W}" height="${H}" fill="url(#halo)"/>
<circle cx="1150" cy="290" r="150" fill="url(#moon)"/>
<g fill="#b39257" opacity=".22"><circle cx="1105" cy="250" r="26"/><circle cx="1188" cy="330" r="18"/><circle cx="1170" cy="230" r="10"/><circle cx="1118" cy="340" r="12"/></g>
<g class="dragon"><g transform="translate(512 0) scale(-1 1)"><g class="wing"><path d="${wyvern}" fill="#0b0a12"/></g></g></g>
<path d="${ridge(560, 120, 80, 30)}" fill="#1c1a2e"/>
<g class="mist"><ellipse cx="500" cy="600" rx="520" ry="40" fill="#8a7fa8" opacity=".16" filter="url(#blur)"/><ellipse cx="1300" cy="640" rx="560" ry="46" fill="#8a7fa8" opacity=".14" filter="url(#blur)"/></g>
<path d="${ridge(660, 110, 60, 40)}" fill="#141320"/>
<g fill="#0a0910">${castle.body}</g>
<g filter="url(#soft)" opacity=".8">${castle.win}</g>
<g>${castle.win}</g>
<g class="mist b"><ellipse cx="900" cy="730" rx="700" ry="50" fill="#a08fb5" opacity=".13" filter="url(#blur)"/></g>
<path d="${ridge(800, 70, 50, 30)}" fill="#08070c"/>
<rect width="${W}" height="${H}" fill="url(#glow)"/>
<g filter="url(#soft)" opacity=".9">${embers.join("")}</g>
<g>${embers.join("")}</g>
<rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>
`;

mkdirSync(new URL("../public/art/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/art/entrada.svg", import.meta.url), svg);
console.log("public/art/entrada.svg", (svg.length / 1024).toFixed(1), "KB");
