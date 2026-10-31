/* Fotos de las criaturas: que cada monstruo tenga cara.

   Mesa trae iconos de licencia libre, que valen para cualquier partida. Las
   fotos las pone cada DM con lo que tenga a mano y se quedan en su partida
   (las imágenes, en la carpeta de datos de su ordenador, no en la
   aplicación). Hay cuatro maneras de dárselas:

   - Una a una, desde la ficha: subir un archivo, pegar una imagen copiada
     (Ctrl+V), traerla desde su dirección web o buscarla en internet.
   - De golpe: soltar muchas fotos (o una carpeta) con el nombre de la
     criatura en el archivo, «Goblin.jpg», «adult red dragon.png»…
   - Arrastrando una foto encima de una criatura del bestiario.
   - Con las fotos libres: Mesa trae preseleccionada una imagen de dominio
     público de Wikimedia Commons para casi todas las criaturas
     (bestiario/fotos-libres.json, ver tools/fotos-libres.mjs). Se ponen
     todas de un clic, y en la ficha de cada una se puede elegir otra o
     buscar más en Commons.

   Toda foto se encuadra en un cuadrado de 512 px pensado para la ficha
   redonda del mapa. Al elegirla a mano se puede mover y acercar para que la
   cara quede en el círculo; en la carga masiva se centra sola, algo por
   encima del medio, que es donde suele estar la cara en un retrato. */

import { el, esc, toast, modal, imgURL } from "./util.js";
import { store, op, uploadImage, DEMO } from "./net.js";
import { CATALOG_BY_ID } from "./catalog.js";
import { bestiaryOf } from "./schema.js";
import { icon } from "./icons.js";
import { commonsURL, pagesOf, candidateFrom, creditText } from "./fotos-libres.js";

const SIDE = 512;            // lado de la foto guardada
const VIEW = 280;            // lado del recortador en pantalla

const doc = () => store.doc;
const plain = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/\.[a-z0-9]{2,5}$/, "").replace(/[^a-z0-9]+/g, " ").trim();

/* ---------- Imágenes ---------- */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.src = src;
  });
}
async function imageFromBlob(blob) {
  const url = URL.createObjectURL(blob);
  try { return await loadImage(url); } finally { setTimeout(() => URL.revokeObjectURL(url), 30000); }
}

/* Encuadre: escala sobre el «cubrir» y desplazamiento del centro, en
   fracciones del lado. El encuadre automático sube un poco el centro. */
const autoFrame = img => ({ zoom: 1, dx: 0, dy: img.height > img.width * 1.1 ? -0.12 : 0 });
function draw(ctx, img, frame, side) {
  const cover = Math.max(side / img.width, side / img.height) * frame.zoom;
  const w = img.width * cover, h = img.height * cover;
  /* Que la imagen tape siempre el cuadrado: el desplazamiento se limita */
  const maxX = Math.max(0, (w - side) / 2 / side), maxY = Math.max(0, (h - side) / 2 / side);
  frame.dx = Math.max(-maxX, Math.min(maxX, frame.dx));
  frame.dy = Math.max(-maxY, Math.min(maxY, frame.dy));
  ctx.clearRect(0, 0, side, side);
  ctx.drawImage(img, (side - w) / 2 - frame.dx * side, (side - h) / 2 - frame.dy * side, w, h);
}
/* «Tono de grabado»: un sepia suave para que fotos de sitios distintos
   peguen entre sí. Se recuerda en este navegador. */
const TONE_KEY = "mesa.fotos.grabado";
const tone = {
  get() { try { return localStorage.getItem(TONE_KEY) === "1"; } catch { return false; } },
  set(on) { try { localStorage.setItem(TONE_KEY, on ? "1" : "0"); } catch { /* sin almacenamiento */ } }
};
const TONE_FILTER = "sepia(0.6) saturate(0.8) contrast(1.06)";
const toneBox = () => `<label class="check pt-tone"><input type="checkbox" data-tone ${tone.get() ? "checked" : ""}><span>Tono de grabado antiguo, para que todas las fotos peguen</span></label>`;

function cropToBlob(img, frame, sepia = tone.get()) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIDE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  if (sepia && "filter" in ctx) ctx.filter = TONE_FILTER;
  draw(ctx, img, { ...frame }, SIDE);
  return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("No se pudo guardar la foto")), "image/webp", 0.88));
}

/* Una imagen de internet. Con servidor la descarga él; en la versión de
   prueba no hay servidor y se intenta desde el navegador, que muchas webs no
   permiten. */
async function fetchRemote(address) {
  const url = String(address || "").trim();
  if (!/^https?:\/\//i.test(url)) throw new Error("La dirección tiene que empezar por http:// o https://");
  let res;
  if (DEMO) {
    try { res = await fetch(url, { mode: "cors" }); }
    catch { throw new Error("Esa web no deja copiar la imagen desde aquí: guárdala y súbela, o cópiala y pégala con Ctrl+V"); }
  } else {
    res = await fetch(`api/fetch-image?token=${encodeURIComponent(store.session.token)}&url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "No se pudo descargar la imagen");
  }
  const blob = await res.blob();
  if (!blob.type.startsWith("image/")) throw new Error("Esa dirección no es una imagen: copia la dirección de la imagen, no la de la página");
  return blob;
}

/* Lo que hay en el portapapeles, si es una imagen o una dirección */
function blobFromPaste(e) {
  const items = [...((e.clipboardData && e.clipboardData.items) || [])];
  const file = items.find(i => i.kind === "file" && i.type.startsWith("image/"));
  if (file) return { blob: file.getAsFile() };
  const text = e.clipboardData && e.clipboardData.getData("text");
  if (text && /^https?:\/\/\S+$/i.test(text.trim())) return { url: text.trim() };
  return null;
}

/* Buscar fotos de la criatura: con su nombre en inglés, que da muchos más
   resultados, y «D&D» para que salga el monstruo y no otra cosa. */
export function searchURL(b) {
  const base = CATALOG_BY_ID.get(b.id);
  const name = base && base.en && !b.custom ? base.en.name : b.name;
  return "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(`${name} D&D monster art`);
}

/* ---------- Fotos libres ---------- */
/* La lista preseleccionada viene con la aplicación, pero solo se lee cuando
   hace falta: son unos cientos de direcciones. */
let freeList = null;
async function freePhotos() {
  if (!freeList) {
    freeList = fetch("bestiario/fotos-libres.json").then(r => r.ok ? r.json() : { fotos: {} })
      .then(j => j.fotos || {}, () => ({}));
  }
  return freeList;
}
/* Buscar más en Commons desde el navegador (Commons deja hacerlo con
   «origin=*»). Con el nombre inglés salen muchas más láminas antiguas. */
async function searchCommons(query) {
  const res = await fetch(commonsURL(query, { limit: 30, browser: true }));
  if (!res.ok) throw new Error("Wikimedia Commons no contesta ahora; prueba dentro de un rato");
  return pagesOf(await res.json()).map(candidateFrom).filter(Boolean)
    .sort((a, b) => b.score - a.score).slice(0, 12)
    .map(c => ({ t: c.thumb, p: c.page, a: c.author, l: c.license }));
}
const englishName = b => {
  const base = CATALOG_BY_ID.get(b.id);
  return base && base.en && !b.custom ? base.en.name : b.name;
};

/* ---------- Guardar ---------- */
async function savePortrait(beastId, img, frame, credit = "") {
  const blob = await cropToBlob(img, frame);
  const imageId = await uploadImage(blob);
  op("portrait.set", { set: { [beastId]: imageId }, credits: { [beastId]: credit } });
  return imageId;
}
export function clearPortrait(beastId) {
  op("portrait.set", { set: { [beastId]: "" } });
}

/* Soltar una foto encima de una criatura: se encuadra sola */
export async function quickPortrait(b, file) {
  try {
    const img = await imageFromBlob(file);
    await savePortrait(b.id, img, autoFrame(img));
    toast(`${b.name} ya tiene cara`, "good");
  } catch (err) { toast(err.message, "bad"); }
}

/* ---------- La foto de una criatura ---------- */
export function openPortrait(b) {
  const has = !!(doc().portraits || {})[b.id];
  const credit = (doc().portraitCredits || {})[b.id] || "";
  let img = null, frame = { zoom: 1, dx: 0, dy: 0 }, chosenCredit = "";
  const body = el(`<div class="pt-box">
    <div class="pt-stage">
      <canvas width="${VIEW * 2}" height="${VIEW * 2}" style="width:${VIEW}px;height:${VIEW}px" aria-label="Encuadre de la foto"></canvas>
      <div class="pt-ring" aria-hidden="true"></div>
      <p class="pt-empty">${b.avatarId ? `<img src="${imgURL(b.avatarId)}" alt="">` : ""}<span>Elige, pega o arrastra una foto</span></p>
    </div>
    <label class="pt-zoom"><span>Acercar</span><input type="range" min="1" max="4" step="0.01" value="1" aria-label="Acercar"></label>
    <p class="pt-hint">Arrastra la foto para que la cara quede dentro del círculo: así se verá en el mapa.</p>
    <div class="pt-src">
      <button type="button" class="btn sm" data-pt="file">${icon("upload", 16)}<span>Subir archivo</span></button>
      <button type="button" class="btn sm" data-pt="search">${icon("search", 16)}<span>Buscar en internet</span></button>
      ${has ? `<button type="button" class="btn sm" data-pt="clear">${icon("close", 16)}<span>Quitar foto</span></button>` : ""}
      <input type="file" accept="image/*" hidden>
    </div>
    <div class="pt-url">
      <input type="url" placeholder="Dirección de una imagen (https://…)" aria-label="Dirección de una imagen">
      <button type="button" class="btn sm" data-pt="url">Traer</button>
    </div>
    <p class="pt-hint">También puedes copiar una imagen en el navegador y pegarla aquí con Ctrl+V.</p>
    <section class="pt-free">
      <h4>${icon("image", 15)}<span>Fotos libres</span></h4>
      <div class="pt-thumbs" aria-live="polite"><span class="pt-hint">Buscando…</span></div>
      <div class="pt-free-row">
        <button type="button" class="btn sm" data-pt="commons">${icon("search", 16)}<span>Más en Wikimedia Commons</span></button>
        ${toneBox()}
      </div>
      <p class="pt-hint">De dominio público: se pueden usar sin permiso. Mesa guarda el autor y la licencia de cada una.</p>
      ${credit ? `<p class="pt-credit"><span>Foto actual:</span> ${esc(credit.replace(/ · https?:\/\/\S+$/, ""))}${/https?:\/\//.test(credit) ? ` · <a href="${esc(credit.match(/https?:\/\/\S+$/)[0])}" target="_blank" rel="noopener">ver en Commons</a>` : ""}</p>` : ""}
    </section>
  </div>`);
  const canvas = body.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const zoom = body.querySelector(".pt-zoom input");
  const stage = body.querySelector(".pt-stage");
  const paint = () => { if (img) draw(ctx, img, frame, canvas.width); };
  const use = async source => {
    try {
      const blob = source.blob || await fetchRemote(source.url);
      img = await imageFromBlob(blob);
      chosenCredit = source.credit || "";
      frame = autoFrame(img);
      zoom.value = "1";
      stage.classList.add("ready");
      paint();
    } catch (err) { toast(err.message, "bad"); }
  };

  const file = body.querySelector("input[type=file]");
  file.addEventListener("change", () => file.files[0] && use({ blob: file.files[0] }));
  body.addEventListener("click", e => {
    const b2 = e.target.closest("[data-pt]");
    if (!b2) return;
    const what = b2.dataset.pt;
    if (what === "file") file.click();
    if (what === "search") window.open(searchURL(b), "_blank", "noopener");
    if (what === "url") use({ url: body.querySelector(".pt-url input").value });
    if (what === "clear") { clearPortrait(b.id); toast(`${b.name} vuelve a su icono`, "good"); m.close(); }
    if (what === "free") {
      const c = shown[+b2.dataset.i];
      thumbs.querySelectorAll("[data-pt=free]").forEach(x => x.setAttribute("aria-pressed", String(x === b2)));
      if (c) use({ url: c.t, credit: creditText(c) });
    }
    if (what === "commons") {
      b2.disabled = true;
      searchCommons(englishName(b)).then(list => {
        const fresh = list.filter(c => !shown.some(s => s.t === c.t));
        if (!fresh.length) toast("Commons no tiene más imágenes libres con ese nombre", "bad");
        showThumbs([...shown, ...fresh]);
      }, err => toast(err.message, "bad")).finally(() => { b2.disabled = false; });
    }
  });
  /* El tono se ve ya en el encuadre, no solo al guardar */
  const preview = () => { canvas.style.filter = tone.get() ? TONE_FILTER : ""; };
  body.querySelector("[data-tone]").addEventListener("change", e => { tone.set(e.target.checked); preview(); });
  preview();

  /* Las fotos libres de esta criatura: las preseleccionadas y las que se
     busquen. Una se elige de un clic y pasa al encuadre. */
  const thumbs = body.querySelector(".pt-thumbs");
  let shown = [];
  const showThumbs = list => {
    shown = list;
    thumbs.innerHTML = list.length ? list.map((c, i) => `<button type="button" class="pt-thumb" data-pt="free" data-i="${i}" aria-pressed="false"
        title="${esc(c.a + " · " + c.l)}"><img src="${esc(c.t)}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>`).join("")
      : `<span class="pt-hint">No hay ninguna preseleccionada para esta criatura: búscala en Commons.</span>`;
  };
  freePhotos().then(all => showThumbs(all[b.id] || []));
  body.querySelector(".pt-url input").addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); use({ url: e.target.value }); }
  });
  zoom.addEventListener("input", () => { frame.zoom = Number(zoom.value); paint(); });

  /* Mover la foto con el ratón o el dedo, y acercar con la rueda */
  let drag = null;
  canvas.addEventListener("pointerdown", e => { if (!img) return; drag = { x: e.clientX, y: e.clientY, dx: frame.dx, dy: frame.dy }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", e => {
    if (!drag) return;
    frame.dx = drag.dx - (e.clientX - drag.x) / VIEW;
    frame.dy = drag.dy - (e.clientY - drag.y) / VIEW;
    paint();
  });
  const stop = () => { drag = null; };
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);
  canvas.addEventListener("wheel", e => {
    if (!img) return;
    e.preventDefault();
    frame.zoom = Math.max(1, Math.min(4, frame.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08)));
    zoom.value = String(frame.zoom);
    paint();
  }, { passive: false });

  /* Soltar un archivo encima y pegar del portapapeles */
  stage.addEventListener("dragover", e => { e.preventDefault(); stage.classList.add("over"); });
  stage.addEventListener("dragleave", () => stage.classList.remove("over"));
  stage.addEventListener("drop", e => {
    e.preventDefault();
    stage.classList.remove("over");
    const f = [...(e.dataTransfer.files || [])].find(x => x.type.startsWith("image/"));
    if (f) use({ blob: f });
    else {
      const url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
      if (url) use({ url: url.split("\n")[0].trim() });
    }
  });
  const onPaste = e => {
    const got = blobFromPaste(e);
    if (!got) return;
    e.preventDefault();
    use(got);
  };
  document.addEventListener("paste", onPaste);

  const m = modal({
    title: "Foto de " + b.name, body, cls: "pt-modal",
    onClose: () => document.removeEventListener("paste", onPaste),
    actions: [{ label: "Cancelar" }, {
      label: "Guardar foto", tone: "primary",
      run: () => {
        if (!img) { toast("Primero elige una foto", "bad"); return false; }
        const chosen = img, f = { ...frame };
        savePortrait(b.id, chosen, f, chosenCredit).then(() => toast(`${b.name} ya tiene cara`, "good"), err => toast(err.message, "bad"));
      }
    }]
  });
  return m;
}

/* ---------- Muchas fotos de golpe ---------- */
/* Para cada criatura, los nombres por los que se la puede reconocer en un
   archivo: el de Mesa, el antiguo, el inglés y su id. */
function nameIndex() {
  const index = new Map();
  for (const b of bestiaryOf(doc())) {
    const base = CATALOG_BY_ID.get(b.id);
    const keys = [b.name, b.aka, b.srd, base && base.en && base.en.name, b.id.replace(/^cat-/, "")];
    for (const k of keys.map(plain).filter(Boolean)) if (!index.has(k)) index.set(k, b);
  }
  return index;
}
/* «Goblin.jpg», «goblin 2.png» o «Dragón rojo adulto (1).webp»: el nombre
   entero o el nombre seguido de un número */
export function matchFile(name, index = nameIndex()) {
  const key = plain(name);
  if (index.has(key)) return index.get(key);
  const trimmed = key.replace(/\s+\d+$/, "").replace(/\s+(foto|photo|art|portrait|token|retrato)$/, "");
  return index.get(trimmed) || null;
}

export function openPhotoBatch() {
  let files = [];
  const body = el(`<div class="pt-batch">
    <section class="pt-freebox">
      <h4>${icon("image", 16)}<span>Fotos libres de Wikimedia Commons</span></h4>
      <p class="prose">Mesa trae elegida una imagen de dominio público (grabados, láminas y pinturas antiguas) para casi todas las criaturas de serie. Con un clic se ponen a las que todavía no tienen foto; las que ya tienen no se tocan.</p>
      ${toneBox()}
      <div class="pt-free-row"><button type="button" class="btn primary sm" data-b="free" disabled><span>Buscando fotos…</span></button></div>
    </section>
    <h4 class="pt-own">${icon("upload", 16)}<span>Tus propias fotos</span></h4>
    <p class="prose">Ponle cara a muchas criaturas de una vez: llama a cada archivo como la criatura, en castellano o en inglés (Goblin.jpg, Dragón rojo adulto.png, owlbear.webp), y suéltalos aquí o elige una carpeta entera.</p>
    <div class="pt-drop" tabindex="0">
      ${icon("image", 28)}
      <span>Suelta aquí las fotos</span>
      <div class="pt-drop-btns">
        <button type="button" class="btn sm" data-b="files">Elegir fotos</button>
        <button type="button" class="btn sm" data-b="folder">Elegir carpeta</button>
      </div>
      <input type="file" accept="image/*" multiple hidden data-in="files">
      <input type="file" accept="image/*" multiple webkitdirectory hidden data-in="folder">
    </div>
    <div class="pt-result"></div>
    <p class="pt-hint">Cada foto se encuadra sola en el círculo de la ficha. Si alguna queda mal, ábrela desde su criatura y muévela. Las fotos se guardan en tu partida, en tu ordenador.</p>
  </div>`);
  const result = body.querySelector(".pt-result");
  body.querySelector("[data-tone]").addEventListener("change", e => tone.set(e.target.checked));
  const freeBtn = body.querySelector("[data-b=free]");
  let pending = [];
  freePhotos().then(all => {
    const photos = doc().portraits || {};
    pending = bestiaryOf(doc()).filter(b => !photos[b.id] && (all[b.id] || []).length).map(b => ({ b, list: all[b.id] }));
    freeBtn.disabled = !pending.length;
    freeBtn.innerHTML = `<span>${pending.length ? (pending.length === 1 ? "Poner 1 foto libre" : `Poner ${pending.length} fotos libres`)
      : Object.keys(all).length ? "Todas las criaturas con foto libre ya tienen cara" : "No se pudo leer la lista de fotos libres"}</span>`;
  });
  const show = list => {
    files = list.filter(f => f.type.startsWith("image/"));
    const index = nameIndex();
    const pairs = files.map(f => ({ f, b: matchFile(f.name, index) }));
    const ok = pairs.filter(p => p.b), miss = pairs.filter(p => !p.b);
    result.innerHTML = !files.length ? "" : `
      <p class="pt-count"><b>${ok.length === 1 ? "1 foto reconocida" : ok.length + " fotos reconocidas"}</b>${miss.length ? `<span>${miss.length} sin criatura</span>` : ""}</p>
      ${ok.length ? `<ul class="pt-list">${ok.slice(0, 60).map(p => `<li>${esc(p.f.name)} <span>→</span> <b>${esc(p.b.name)}</b></li>`).join("")}${ok.length > 60 ? `<li>…y ${ok.length - 60} más</li>` : ""}</ul>` : ""}
      ${miss.length ? `<p class="pt-hint">Sin criatura (cambia el nombre del archivo): ${miss.slice(0, 20).map(p => esc(p.f.name)).join(", ")}${miss.length > 20 ? "…" : ""}</p>` : ""}`;
    body.dataset.ready = ok.length ? "1" : "";
  };
  body.addEventListener("click", e => {
    const b = e.target.closest("[data-b]");
    if (b && b.dataset.b === "free") { if (pending.length) { batch.close(); runFree(pending); } return; }
    if (b) body.querySelector(`[data-in="${b.dataset.b}"]`).click();
  });
  body.querySelectorAll("input[type=file]").forEach(inp => inp.addEventListener("change", () => show([...inp.files])));
  const drop = body.querySelector(".pt-drop");
  drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", e => { e.preventDefault(); drop.classList.remove("over"); show([...(e.dataTransfer.files || [])]); });

  const batch = modal({
    title: "Fotos de las criaturas", body, wide: true,
    actions: [{ label: "Cerrar" }, {
      label: "Poner tus fotos", tone: "primary",
      run: () => {
        const index = nameIndex();
        const pairs = files.map(f => ({ f, b: matchFile(f.name, index) })).filter(p => p.b);
        if (!pairs.length) { toast("No hay ninguna foto con el nombre de una criatura", "bad"); return false; }
        runBatch(pairs);
      }
    }]
  });
}

/* Un aviso que va contando, para que se vea que avanza */
function progress() {
  const host = el(`<div class="toasts pt-progress" role="status"><div class="toast"></div></div>`);
  document.body.appendChild(host);
  return { say: text => { host.firstElementChild.textContent = text; }, done: () => host.remove() };
}

/* Las fotos libres: se descargan de tres en tres (si una falla, se prueba la
   siguiente candidata de esa criatura), se encuadran solas y se guardan
   todas juntas al final, con su autor y su licencia. */
async function runFree(pending) {
  const set = {}, credits = {};
  let done = 0, failed = 0, next = 0;
  const bar = progress();
  const sepia = tone.get();
  const one = async ({ b, list }) => {
    for (const c of list.slice(0, 3)) {
      try {
        const img = await imageFromBlob(await fetchRemote(c.t));
        set[b.id] = await uploadImage(await cropToBlob(img, autoFrame(img), sepia));
        credits[b.id] = creditText(c);
        return true;
      } catch { /* la siguiente candidata */ }
    }
    return false;
  };
  const worker = async () => {
    while (next < pending.length) {
      const item = pending[next++];
      if (await one(item)) done++; else failed++;
      bar.say(`Poniendo fotos libres: ${done + failed} de ${pending.length}…`);
    }
  };
  bar.say(`Poniendo fotos libres: 0 de ${pending.length}…`);
  await Promise.all([worker(), worker(), worker()]);
  bar.done();
  if (done) op("portrait.set", { set, credits });
  toast(`${done} ${done === 1 ? "criatura tiene" : "criaturas tienen"} cara${failed ? ` · ${failed} no se pudieron descargar` : ""}`, failed && !done ? "bad" : "good");
}

/* Se suben de una en una y se guardan todas juntas al final */
async function runBatch(pairs) {
  const set = {};
  let done = 0, failed = 0;
  const bar = progress();
  for (const { f, b } of pairs) {
    bar.say(`Poniendo fotos: ${done + failed + 1} de ${pairs.length}…`);
    try {
      const img = await imageFromBlob(f);
      const blob = await cropToBlob(img, autoFrame(img));
      set[b.id] = await uploadImage(blob);
      done++;
    } catch { failed++; }
  }
  bar.done();
  if (done) op("portrait.set", { set });
  toast(`${done} ${done === 1 ? "criatura tiene" : "criaturas tienen"} cara${failed ? ` · ${failed} no se pudieron leer` : ""}`, failed ? "bad" : "good");
}
