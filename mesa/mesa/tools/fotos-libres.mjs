/* Fotos libres para el bestiario: busca en Wikimedia Commons una imagen de
   dominio público (o CC0) para cada criatura y deja la lista lista para que
   Mesa las ponga de un clic («Fotos libres» en el bestiario).

   No descarga ninguna imagen: guarda la dirección de la miniatura, el autor
   y la licencia. Las fotos las baja después el DM, a su carpeta de datos.

   Uso:
     node tools/fotos-libres.mjs buscar [--cache dir]   -> tools/fotos-candidatas.json
     node tools/fotos-libres.mjs hoja salida.html       -> hoja de contactos para revisar
     node tools/fotos-libres.mjs publicar               -> public/bestiario/fotos-libres.json

   Qué se busca para cada criatura está en tools/fotos-consultas.txt; lo que
   se descarta al revisar, en tools/fotos-revision.txt («id: 2» elige la
   tercera candidata, «id: no» deja la criatura con su icono).

   Wikimedia pide identificarse con un User-Agent propio y no ir deprisa: se
   hace una consulta por segundo y las respuestas se guardan en caché. */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CATALOG } from "../public/js/catalog.js";
import { commonsURL, pagesOf, candidateFrom } from "../public/js/fotos-libres.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UA = "MesaDnD/1.0 (https://github.com/aleexnager/DnD; private tabletop app)";
const CANDIDATES = path.join(HERE, "fotos-candidatas.json");
const OUT = path.join(HERE, "..", "public", "bestiario", "fotos-libres.json");
const KEEP = 4;             // candidatas por criatura

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };

/* ---------- Consultas ---------- */
function readList(file) {
  const map = new Map();
  if (!fs.existsSync(file)) return map;
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([\w-]+):\s*(.*)$/);
    if (m) map.set(m[1], m[2].trim());
  }
  return map;
}

/* ---------- Commons ---------- */
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function search(query, cacheDir) {
  const key = path.join(cacheDir, query.replace(/[^\w]+/g, "_").slice(0, 120) + ".json");
  if (fs.existsSync(key)) return JSON.parse(fs.readFileSync(key, "utf8"));
  const url = commonsURL(query);
  /* Desde redes compartidas Commons contesta a menudo «429, espera»: se
     espera lo que pide (o un poco más cada vez) y se reintenta. */
  for (let attempt = 0; attempt < 25; attempt++) {
    await sleep(1100);
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429 || res.status >= 500) {
      const wait = Math.max(Number(res.headers.get("retry-after")) || 1, Math.min(20, 2 + attempt * 2));
      await sleep(wait * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`Commons ${res.status} con «${query}»`);
    const pages = pagesOf(await res.json());
    fs.writeFileSync(key, JSON.stringify(pages));
    return pages;
  }
  console.warn(`\nCommons no contesta con «${query}»: se deja para la próxima vez`);
  return [];
}

async function buscar() {
  const cacheDir = opt("--cache", path.join(HERE, ".fotos-cache"));
  fs.mkdirSync(cacheDir, { recursive: true });
  const queries = readList(path.join(HERE, "fotos-consultas.txt"));
  for (const id of queries.keys()) if (!CATALOG.some(b => b.id === id)) console.warn("No hay ninguna criatura", id);
  const out = {};
  const used = new Map();           // archivo -> cuántas criaturas lo tienen de primera
  let n = 0;
  for (const b of CATALOG) {
    const list = (queries.get(b.id) || "").split("|").map(s => s.trim()).filter(Boolean);
    if (!list.length) continue;
    const seen = new Set(), found = [];
    for (const q of list) {
      const pages = await search(q, cacheDir);
      pages.forEach((p, i) => { const c = candidateFrom(p, i); if (c && !seen.has(c.file)) { seen.add(c.file); found.push({ ...c, query: q }); } });
      if (found.length >= KEEP * 2) break;
    }
    /* Que dos criaturas no salgan con la misma imagen si hay otra */
    found.sort((x, y) => (used.get(x.file) || 0) - (used.get(y.file) || 0) || y.score - x.score);
    out[b.id] = found.slice(0, KEEP);
    if (found[0]) used.set(found[0].file, (used.get(found[0].file) || 0) + 1);
    process.stdout.write(`\r${++n} criaturas buscadas · ${b.id.padEnd(40)}`);
  }
  fs.writeFileSync(CANDIDATES, JSON.stringify(out, null, 1));
  const empty = Object.entries(out).filter(([, v]) => !v.length).map(([k]) => k);
  console.log(`\n${Object.keys(out).length - empty.length} con candidatas; sin nada: ${empty.join(", ") || "ninguna"}`);
}

/* ---------- Hoja de contactos para revisar ---------- */
function hoja(file) {
  const cand = JSON.parse(fs.readFileSync(CANDIDATES, "utf8"));
  const name = id => (CATALOG.find(b => b.id === id) || {}).name || id;
  const rows = Object.entries(cand).map(([id, list]) => `<div class="r"><b>${name(id)}</b><i>${id}</i>${list.map((c, i) =>
    `<figure><img src="${c.thumb}" loading="lazy"><figcaption>${i} · ${c.license}</figcaption></figure>`).join("")}</div>`).join("");
  fs.writeFileSync(file, `<!doctype html><meta charset="utf-8"><style>body{font:11px sans-serif;margin:4px;background:#fff}
.r{display:flex;gap:4px;align-items:center;border-bottom:1px solid #ccc;padding:2px}.r b{width:120px}.r i{display:none}
figure{margin:0;width:96px}img{width:96px;height:96px;object-fit:cover;display:block}figcaption{font-size:9px}</style>${rows}`);
  console.log("Hoja en", file);
}

/* ---------- Publicar lo revisado ---------- */
function publicar() {
  const cand = JSON.parse(fs.readFileSync(CANDIDATES, "utf8"));
  const review = readList(path.join(HERE, "fotos-revision.txt"));
  const fotos = {};
  for (const [id, list] of Object.entries(cand)) {
    const pick = review.get(id);
    if (pick === "no" || !list.length) continue;
    /* «id: 2» pone la tercera delante; «id: 2 0» deja solo esas, en ese orden */
    const order = pick ? pick.split(/[\s,]+/).map(Number).filter(i => list[i]) : list.map((_, i) => i);
    const rest = pick && pick.split(/[\s,]+/).length === 1 ? list.map((_, i) => i).filter(i => !order.includes(i)) : [];
    fotos[id] = [...order, ...rest].map(i => list[i]).map(c => ({ t: c.thumb, p: c.page, a: c.author, l: c.license }));
  }
  fs.writeFileSync(OUT, JSON.stringify({
    fuente: "Wikimedia Commons; solo imágenes de dominio público o CC0",
    generado: new Date().toISOString().slice(0, 10), fotos
  }) + "\n");
  console.log(Object.keys(fotos).length, "criaturas con foto libre en", OUT);
}

const cmd = args[0];
if (cmd === "buscar") await buscar();
else if (cmd === "hoja") hoja(args[1] || "hoja.html");
else if (cmd === "publicar") publicar();
else console.log("Uso: node tools/fotos-libres.mjs buscar|hoja salida.html|publicar");
