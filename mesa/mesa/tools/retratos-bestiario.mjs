/* Genera los retratos del bestiario (public/bestiario/*.svg) a partir de los
   iconos de game-icons.net (CC BY 3.0). Solo hace falta al añadir criaturas
   al catálogo; Mesa no lo necesita para funcionar.

     npm pack @iconify-json/game-icons && tar xzf iconify-json-game-icons-*.tgz
     node tools/retratos-bestiario.mjs package/icons.json

   Todos salen igual: silueta en tinta oscura, centrada y con margen para que
   quepa en la ficha redonda del mapa. El fondo lo pone el color del tipo de
   criatura, así que el SVG es transparente. */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { CATALOG } from "../public/js/catalog.js";

const src = process.argv[2];
if (!src) { console.error("Uso: node tools/retratos-bestiario.mjs ruta/a/icons.json"); process.exit(1); }
const { icons } = JSON.parse(readFileSync(src, "utf8"));
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "bestiario");
mkdirSync(out, { recursive: true });

const INK = "#15171d";
const done = new Set();
for (const b of CATALOG) {
  const name = (b.avatarId.match(/^bestiario\/(.+)\.svg$/) || [])[1];
  if (!name || done.has(name)) continue;
  const icon = icons[name];
  if (!icon) { console.error("No existe el icono", name, "de", b.name); process.exitCode = 1; continue; }
  const body = icon.body.replace(/currentColor/g, INK);
  writeFileSync(path.join(out, name + ".svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!-- ${name} · game-icons.net · CC BY 3.0 -->` +
    `<g transform="translate(80 80) scale(.6875)" fill-opacity=".9">${body}</g></svg>\n`);
  done.add(name);
}
console.log(done.size, "retratos en", out);
