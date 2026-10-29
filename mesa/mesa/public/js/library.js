/* La biblioteca del DM: una estantería abajo a la izquierda con sus libros.

   Cuatro vienen de serie y no se pueden quitar: las reglas, el manual del
   jugador, el compendio de conjuros y el bestiario. Los demás los pone el DM:
   un PDF (se le saca el texto al subirlo, para poder buscar), un texto o
   Markdown, una imagen o un cuaderno que escribe él mismo.

   Cada libro se abre en doble página: a la izquierda el índice y el buscador,
   a la derecha la sección en pergamino. Los libros de serie se cargan solo al
   abrirlos, así que no pesan nada mientras la estantería está cerrada. */

import { el, esc, toast, modal, confirmBox, imgURL } from "./util.js";
import { icon, withIcon } from "./icons.js";
import { store, op, onState, uploadImage, patchSession } from "./net.js";
import { normalizeLibraryItem, uid } from "./schema.js";
import { textHTML, markdownSections, pdfSections, search, fold, markWords } from "./library-core.js";
import { t } from "./i18n.js";

/* ---------- Los libros de serie ---------- */
export const BUILTIN = [
  { id: "b-reglas", title: "Reglas de D&D", spine: "Reglas", subtitle: "Ediciones, versiones y reglas para jugar", color: "#6d2318", rune: 0,
    load: () => import("./libros/reglas.js").then(m => m.REGLAS) },
  { id: "b-jugador", title: "Manual del jugador", spine: "Jugador", subtitle: "Clases, subclases, especies y trasfondos", color: "#1d3d5c", rune: 1,
    load: () => import("./libros/jugador.js").then(m => m.JUGADOR) },
  { id: "b-conjuros", title: "Compendio de conjuros", spine: "Conjuros", subtitle: "Todos los conjuros por nivel", color: "#3d2766", rune: 2,
    load: () => import("./libros/conjuros.js").then(m => m.spellsBook()) },
  { id: "b-bestiario", title: "Bestiario", subtitle: "Criaturas por tipo, con su ficha completa", color: "#2c4722", rune: 3,
    load: () => import("./libros/bestiario.js").then(m => m.bestiaryBook(store.doc ? store.doc.bestiary : [])) }
];
const COVERS = ["#6b3a2a", "#6d2318", "#1d3d5c", "#3d2766", "#2c4722", "#5b4a1e", "#3a3f44", "#702f4f"];

/* Runas: trazos rectos, como se tallaban (dibujadas aquí, sin fuentes) */
const RUNES = [
  "M8 2v20M8 6l8-4M8 12l8-4", "M6 2v20M6 2l12 8-12 8", "M12 2v20M5 7l14 10M19 7L5 17", "M6 2v20M18 2v20M6 12l12-6",
  "M12 2v20M12 7l-6-5M12 7l6-5", "M6 22V2l12 20V2", "M4 12L12 2l8 10-8 10z", "M12 2v20M6 8l6 4 6-4"
];
export const rune = (i, size = 18) => `<svg class="rune" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="${RUNES[i % RUNES.length]}"/></svg>`;

/* ---------- Estado de la estantería ---------- */
const SHELF_KEY = "mesa.shelf.open", MARK_KEY = "mesa.book.mark.";
const memo = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch {} return null; };
const userBooks = () => (store.doc && store.doc.library) || [];
const isBuiltin = id => BUILTIN.some(b => b.id === id);

export function mountLibrary() {
  const shelf = el(`<aside class="shelf" aria-label="Biblioteca">
    <button type="button" class="shelf-toggle" title="Biblioteca" aria-label="Biblioteca">${icon("book", 18)}<span>Biblioteca</span></button>
    <div class="shelf-wood">
      <div class="shelf-books" role="list"></div>
      <div class="shelf-tools">
        <button type="button" class="icon-btn" data-shelf="search" title="Buscar en toda la biblioteca" aria-label="Buscar en toda la biblioteca">${icon("search", 16)}</button>
        <button type="button" class="icon-btn" data-shelf="add" title="Añadir un documento o un cuaderno" aria-label="Añadir un documento o un cuaderno">${icon("plus", 16)}</button>
        <button type="button" class="icon-btn" data-shelf="hide" title="Guardar la biblioteca" aria-label="Guardar la biblioteca">${icon("down", 16)}</button>
      </div>
    </div>
  </aside>`);
  document.querySelectorAll(".shelf").forEach(x => x.remove());
  document.body.appendChild(shelf);
  /* El hueco que ocupa la estantería abajo a la izquierda: la barra del mapa
     deja ese sitio libre para que no le tape nada */
  const setOpen = on => {
    shelf.dataset.open = on ? "1" : "0"; memo(SHELF_KEY, on ? "1" : "0");
    document.documentElement.style.setProperty("--shelf-space", on ? "186px" : "66px");
  };
  setOpen(memo(SHELF_KEY) !== "0" && innerWidth > 700);
  shelf.querySelector(".shelf-toggle").addEventListener("click", () => setOpen(shelf.dataset.open !== "1"));
  shelf.addEventListener("click", e => {
    const b = e.target.closest("[data-shelf], [data-book]");
    if (!b) return;
    if (b.dataset.book) return openBook(b.dataset.book, b);
    const what = b.dataset.shelf;
    if (what === "hide") return setOpen(false);
    if (what === "add") return addDocument();
    if (what === "search") return searchAll();
  });
  let last = "";
  const paint = () => {
    const key = JSON.stringify(userBooks().map(b => [b.id, b.title, b.color, b.kind]));
    if (key === last) return;
    last = key;
    const spine = (b, builtin) => `<button type="button" class="spine ${builtin ? "builtin" : ""} k-${b.kind || "book"}" role="listitem" data-book="${esc(b.id)}"
        style="--c:${esc(b.color)};--h:${builtin ? 0 : (b.title.length % 4) * 6}px" title="${esc(b.title)}">
        <i class="spine-band"></i>${rune(builtin ? b.rune : b.title.length, 14)}<span>${esc(b.spine || b.title)}</span><i class="spine-band low"></i></button>`;
    shelf.querySelector(".shelf-books").innerHTML = BUILTIN.map(b => spine(b, true)).join("") + userBooks().map(b => spine(b, false)).join("");
  };
  paint();
  onState(paint);
  return shelf;
}

/* ---------- Cargar un libro ----------
   Todos acaban igual: { id, title, subtitle, color, sections: [{ id, title,
   intro?, entries: [{ id, title, html, meta? }] }] } */
const cache = new Map();
async function loadBook(id) {
  const builtin = BUILTIN.find(b => b.id === id);
  if (builtin) {
    if (id === "b-bestiario") cache.delete(id);        // el DM puede haber añadido criaturas
    if (!cache.has(id)) cache.set(id, builtin.load().then(book => ({ ...book, id, title: builtin.title, subtitle: builtin.subtitle, color: builtin.color, rune: builtin.rune, builtin: true })));
    return cache.get(id);
  }
  const item = userBooks().find(b => b.id === id);
  if (!item) throw new Error("Ese libro ya no está en la biblioteca");
  const base = { id, title: item.title, subtitle: subtitleOf(item), color: item.color, rune: item.title.length, item };
  if (item.kind === "notebook") return { ...base, sections: item.sections.map(s => ({ id: s.id, title: s.title, entries: [{ id: s.id + "-e", title: "", html: textHTML(s.text), raw: s.text }] })) };
  if (item.kind === "image") return { ...base, sections: [{ id: "img", title: item.title, entries: [{ id: "img-e", title: "", html: `<figure class="tome-figure"><img src="${esc(imgURL(item.fileId))}" alt=""></figure>` }] }] };
  if (item.kind === "text") {
    const key = "t:" + item.fileId;
    if (!cache.has(key)) cache.set(key, fetch(imgURL(item.fileId)).then(r => { if (!r.ok) throw new Error("No se encuentra el texto"); return r.text(); }));
    return { ...base, sections: markdownSections(await cache.get(key), item.title) };
  }
  /* PDF: el texto se sacó al subirlo; el índice del propio PDF hace de secciones */
  const key = "p:" + item.textId;
  if (!cache.has(key)) cache.set(key, fetch(imgURL(item.textId)).then(r => { if (!r.ok) throw new Error("No se encuentra el texto del PDF"); return r.json(); }));
  return { ...base, sections: pdfSections(await cache.get(key)) };
}
const subtitleOf = item => ({ pdf: `PDF · ${item.pages} páginas`, text: "Texto", image: "Imagen", notebook: "Cuaderno del DM" }[item.kind] || "");

export { markdownSections, search } from "./library-core.js";

/* ---------- El libro abierto ---------- */
let current = null;
export async function openBook(id, from = null, goTo = null) {
  if (current) current.close(true);
  const meta = BUILTIN.find(b => b.id === id) || userBooks().find(b => b.id === id);
  if (!meta) return;
  const builtin = isBuiltin(id);
  const back = el(`<div class="tome-back" role="dialog" aria-modal="true" aria-label="${esc(meta.title)}">
    <div class="tome" style="--c:${esc(meta.color)}">
      <div class="tome-cover" aria-hidden="true">
        <div class="cover-frame"><div class="cover-runes">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => rune(i + (meta.rune || 0), 16)).join("")}</div>
          <div class="cover-seal">${rune(meta.rune || 0, 44)}</div><h2>${esc(meta.title)}</h2><p>${esc(meta.subtitle || subtitleOf(meta))}</p></div>
      </div>
      <div class="tome-spread">
        <section class="page page-left">
          <header class="tome-head"><div><h2>${esc(meta.title)}</h2><p>${esc(meta.subtitle || subtitleOf(meta))}</p></div>
            <button type="button" class="icon-btn tome-close" data-t="close" aria-label="Cerrar el libro" title="Cerrar el libro">${icon("close")}</button></header>
          <label class="tome-search">${icon("search", 16)}<input type="search" placeholder="Buscar en el libro…" aria-label="Buscar en el libro" autocomplete="off"></label>
          <div class="tome-scope" role="group" aria-label="Dónde buscar">
            <button type="button" data-scope="book" aria-pressed="true">Todo el libro</button><button type="button" data-scope="section" aria-pressed="false">Esta sección</button>
          </div>
          <nav class="tome-toc" aria-label="Secciones"><p class="tome-loading">${rune(0, 22)}<span>Abriendo el libro…</span></p></nav>
          <div class="tome-actions"></div>
        </section>
        <section class="page page-right">
          <div class="tome-content" tabindex="-1"></div>
          <footer class="tome-foot">
            <button type="button" class="icon-btn" data-t="prev" aria-label="Sección anterior" title="Sección anterior">${icon("prev")}</button>
            <span class="tome-folio"></span>
            <button type="button" class="icon-btn" data-t="next" aria-label="Sección siguiente" title="Sección siguiente">${icon("next")}</button>
          </footer>
        </section>
      </div>
    </div>
  </div>`);
  document.body.appendChild(back);
  const tome = back.querySelector(".tome");
  /* Sale de su lomo y se abre la tapa */
  if (from) {
    const r = from.getBoundingClientRect();
    tome.style.setProperty("--from-x", `${r.left + r.width / 2 - innerWidth / 2}px`);
    tome.style.setProperty("--from-y", `${r.top + r.height / 2 - innerHeight / 2}px`);
  }
  requestAnimationFrame(() => back.classList.add("opening"));
  setTimeout(() => back.classList.add("open"), 30);

  let book = null, si = 0, scope = "book", query = "", mode = "read";
  const content = back.querySelector(".tome-content"), toc = back.querySelector(".tome-toc"), input = back.querySelector(".tome-search input");
  const close = (now = false) => {
    if (current !== api) return;
    current = null;
    document.removeEventListener("keydown", onKey);
    if (now || matchMedia("(prefers-reduced-motion: reduce)").matches) return back.remove();
    back.classList.remove("open");
    back.classList.add("closing");
    setTimeout(() => back.remove(), 650);
  };
  const api = { close };
  current = api;

  const paintToc = () => {
    if (query.trim().length > 1) return paintResults();
    toc.innerHTML = book.sections.length ? `<ol>${book.sections.map((s, i) => `<li><button type="button" data-sec="${i}" aria-current="${i === si}">
        <span class="toc-n">${i + 1}</span><span class="toc-t">${esc(s.title)}</span>${s.range ? `<small>${esc(s.range)}</small>` : `<small>${s.entries.length > 1 ? s.entries.length : ""}</small>`}</button></li>`).join("")}</ol>`
      : `<p class="tome-empty">Este libro aún no tiene nada.</p>`;
  };
  const paintResults = () => {
    const words = fold(query).split(/\s+/).filter(w => w.length > 1);
    const res = search(book, query, { section: scope === "section" ? si : null });
    toc.innerHTML = `<p class="tome-count"><b>${res.length}</b> <span>${res.length === 1 ? "resultado" : "resultados"}</span></p>` +
      (res.length ? `<ol class="tome-results">${res.map(r => `<li><button type="button" data-hit="${r.si}:${r.ei}">
        <span class="hit-where">${esc(book.sections[r.si].title)}${r.title ? ` › ${markWords(esc(r.title), words)}` : ""}</span>
        <span class="hit-text">${r.snippet}</span></button></li>`).join("")}</ol>`
        : `<p class="tome-empty">No aparece. Prueba con otra palabra${scope === "section" ? " o busca en todo el libro" : ""}.</p>`);
  };
  const paintActions = () => {
    const item = book.item, acts = [];
    if (item) {
      if (item.kind === "notebook") acts.push(["addSection", "plus", "Nueva sección"], ["edit", "pencil", mode === "edit" ? "Leer" : "Escribir"]);
      if (item.kind === "pdf") acts.push(["original", "image", "Ver original"]);
      if (item.kind === "image") acts.push(["handout", "tv", "Enseñar a la mesa"]);
      if (item.fileId) acts.push(["download", "download", "Descargar"]);
      acts.push(["rename", "pencil", "Renombrar"], ["color", "sparkle", "Color de la tapa"], ["remove", "trash", "Quitar de la biblioteca"]);
    }
    back.querySelector(".tome-actions").innerHTML = acts.map(([k, ic, l]) => `<button type="button" class="btn sm ${k === "remove" ? "danger-ghost" : ""}" data-act="${k}">${withIcon(ic, l, 14)}</button>`).join("");
  };
  /* Pintar una sección: con paso de página, salvo la primera vez */
  const show = (i, { entry = null, turn = true } = {}) => {
    if (!book.sections.length) { content.innerHTML = `<div class="tome-blank">${rune(2, 40)}<p>${book.item && book.item.kind === "notebook" ? "Un cuaderno en blanco. Añade una sección para empezar a escribir." : "Nada que leer todavía."}</p></div>`; return; }
    const dir = i >= si ? 1 : -1;
    si = Math.max(0, Math.min(book.sections.length - 1, i));
    memo(MARK_KEY + book.id, String(si));
    const s = book.sections[si];
    const paint = () => {
      const words = query.trim().length > 1 ? fold(query).split(/\s+/).filter(w => w.length > 1) : [];
      const editing = mode === "edit" && book.item && book.item.kind === "notebook";
      content.innerHTML = editing ? notebookEditor(s) : `<h2 class="tome-h">${esc(s.title)}</h2>${s.intro ? `<div class="tome-intro">${s.intro}</div>` : ""}` +
        s.entries.map((e, k) => `<article class="tome-entry ${k === 0 && !e.title ? "lead" : ""}" id="te-${esc(e.id)}">${e.title ? `<h3>${words.length ? markWords(esc(e.title), words) : esc(e.title)}</h3>` : ""}
          ${e.meta ? `<p class="tome-meta">${e.meta}</p>` : ""}<div class="tome-body">${words.length ? markWords(e.html, words) : e.html}</div></article>`).join("");
      back.querySelector(".tome-folio").innerHTML = `${rune(si, 12)}<span>${si + 1} / ${book.sections.length}</span>${rune(si + 3, 12)}`;
      paintToc();
      if (entry !== null) {
        const node = content.querySelector(`#te-${CSS.escape(s.entries[entry].id)}`);
        if (node) { node.scrollIntoView({ block: "start" }); node.classList.add("flash"); }
      } else content.scrollTop = 0;
      if (editing) bindEditor(s);
    };
    if (!turn || matchMedia("(prefers-reduced-motion: reduce)").matches) return paint();
    const page = back.querySelector(".page-right");
    page.classList.remove("turn-next", "turn-prev");
    void page.offsetWidth;
    page.classList.add(dir > 0 ? "turn-next" : "turn-prev");
    setTimeout(paint, 180);
  };

  /* ---------- Cuaderno: escribir ---------- */
  const notebookEditor = s => `<label class="field"><span>Título de la sección</span><input class="nb-title" maxlength="80" value="${esc(s.title)}"></label>
    <label class="field nb-text-wrap"><span>Texto</span><textarea class="nb-text" placeholder="Escribe aquí. Las fórmulas como 2d6+3 se podrán tirar al leer.">${esc(s.entries[0].raw || "")}</textarea></label>
    <div class="nb-tools"><span class="nb-saved">Se guarda solo</span><button type="button" class="btn sm danger-ghost" data-act="dropSection">${withIcon("trash", "Quitar sección", 14)}</button></div>`;
  let saveTimer = null;
  const saveNotebook = () => {
    const item = book.item;
    const sections = book.sections.map(s => ({ id: s.id, title: s.title, text: s.entries[0].raw || "" }));
    op("library.set", { item: { ...item, sections } });
    book.item = { ...item, sections };
    book._index = null;
    const flag = content.querySelector(".nb-saved");
    if (flag) { flag.textContent = "Guardado"; setTimeout(() => { if (flag.isConnected) flag.textContent = "Se guarda solo"; }, 1200); }
  };
  const bindEditor = s => {
    const ti = content.querySelector(".nb-title"), x = content.querySelector(".nb-text");
    const later = () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveNotebook, 700); };
    ti.addEventListener("input", () => { s.title = ti.value.trim() || "Sección"; later(); paintToc(); });
    x.addEventListener("input", () => { s.entries[0].raw = x.value; s.entries[0].html = textHTML(x.value); later(); });
  };

  /* ---------- Clics y teclas ---------- */
  back.addEventListener("click", async e => {
    if (e.target === back) return close();
    const b = e.target.closest("button");
    if (!b || !book && b.dataset.t !== "close") return;
    if (b.dataset.t === "close") return close();
    if (b.dataset.t === "prev") return show(si - 1);
    if (b.dataset.t === "next") return show(si + 1);
    if (b.dataset.sec) return show(+b.dataset.sec);
    if (b.dataset.hit) { const [s, en] = b.dataset.hit.split(":").map(Number); return show(s, { entry: en }); }
    if (b.dataset.scope) {
      scope = b.dataset.scope;
      back.querySelectorAll("[data-scope]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      return paintToc();
    }
    if (b.dataset.act) return act(b.dataset.act);
  });
  let searchTimer = null;
  input.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { query = input.value; paintToc(); show(si, { turn: false }); }, 180); });
  const onKey = e => {
    if (e.key === "Escape" && !document.querySelector(".modal-back")) return close();
    if (e.target.closest && e.target.closest("input, textarea")) return;
    if (e.key === "ArrowRight") show(si + 1);
    if (e.key === "ArrowLeft") show(si - 1);
  };
  document.addEventListener("keydown", onKey);

  async function act(what) {
    const item = book.item;
    if (what === "addSection") {
      if (book.sections.length >= 80) return toast("Caben ochenta secciones por cuaderno", "bad");
      const sid = uid();
      book.sections.push({ id: sid, title: t("Sección nueva"), entries: [{ id: sid + "-e", title: "", html: textHTML(""), raw: "" }] });
      mode = "edit"; paintActions(); saveNotebook(); return show(book.sections.length - 1);
    }
    if (what === "dropSection") {
      if (!(await confirmBox(`¿Quitar «${book.sections[si].title}» del cuaderno?`))) return;
      book.sections.splice(si, 1); saveNotebook(); return show(Math.max(0, si - 1), { turn: false });
    }
    if (what === "edit") { mode = mode === "edit" ? "read" : "edit"; paintActions(); return show(si, { turn: false }); }
    if (what === "download") { const a = document.createElement("a"); a.href = imgURL(item.fileId); a.download = item.fileName || item.title; a.click(); return; }
    if (what === "handout") { patchSession({ handoutId: item.fileId, handoutText: item.title }); return toast("La mesa ya la está viendo"); }
    if (what === "original") return showOriginal(item, book.sections[si].entries[0].page || 1);
    if (what === "rename") {
      const body = el(`<label class="field"><span>Título</span><input maxlength="80" value="${esc(item.title)}"></label>`);
      return modal({ title: "Renombrar", body, actions: [{ label: "Cancelar" }, { label: "Guardar", tone: "primary", run: host => {
        const title = host.querySelector("input").value.trim();
        if (!title) return false;
        op("library.set", { item: { ...item, title } });
        book.item = { ...item, title };
        back.querySelectorAll(".tome-head h2, .cover-frame h2").forEach(h => { h.textContent = title; });
      } }] });
    }
    if (what === "color") {
      const body = el(`<div class="cover-swatches">${COVERS.map(c => `<button type="button" data-c="${c}" style="--sw:${c}" aria-label="${c}" aria-pressed="${c === item.color}"></button>`).join("")}</div>`);
      const m = modal({ title: "Color de la tapa", body, actions: [{ label: "Hecho", tone: "primary" }] });
      body.addEventListener("click", ev => {
        const c = ev.target.closest("[data-c]");
        if (!c) return;
        op("library.set", { item: { ...book.item, color: c.dataset.c } });
        book.item = { ...book.item, color: c.dataset.c };
        tome.style.setProperty("--c", c.dataset.c);
        body.querySelectorAll("[data-c]").forEach(x => x.setAttribute("aria-pressed", String(x === c)));
        void m;
      });
      return;
    }
    if (what === "remove") {
      if (!(await confirmBox(`¿Quitar «${item.title}» de la biblioteca? No se puede deshacer.`))) return;
      op("library.remove", { id: item.id });
      toast(`«${item.title}» ya no está en la biblioteca`);
      return close();
    }
  }

  try {
    book = await loadBook(id);
  } catch (err) {
    toc.innerHTML = `<p class="tome-empty">${esc(err.message || "No se ha podido abrir el libro")}</p>`;
    return api;
  }
  if (current !== api) return api;
  paintActions();
  const mark = Number(memo(MARK_KEY + id));
  let start = goTo ? goTo.si : Number.isFinite(mark) ? mark : 0;
  if (start >= book.sections.length) start = 0;
  if (goTo && goTo.query) { query = goTo.query; input.value = goTo.query; }
  show(start, { entry: goTo ? goTo.ei : null, turn: false });
  return api;
}

/* ---------- Ver la página original de un PDF ---------- */
let pdfjsP = null;
export function pdfjs() {
  if (!pdfjsP) pdfjsP = import(new URL("vendor/pdfjs/pdf.min.mjs", document.baseURI).href).then(m => {
    m.GlobalWorkerOptions.workerSrc = new URL("vendor/pdfjs/pdf.worker.min.mjs", document.baseURI).href;
    return m;
  });
  return pdfjsP;
}
async function showOriginal(item, page) {
  const body = el(`<div class="pdf-view"><div class="pdf-bar"><button type="button" class="icon-btn" data-p="-1" aria-label="Página anterior">${icon("prev")}</button>
    <span class="pdf-n tnum"></span><button type="button" class="icon-btn" data-p="1" aria-label="Página siguiente">${icon("next")}</button></div>
    <div class="pdf-canvas"><canvas></canvas></div></div>`);
  let doc = null, n = page, busy = null, task = null;
  const m = modal({ title: item.title, body, wide: true, actions: [{ label: "Cerrar" }], onClose: () => { if (task) task.destroy(); } });
  const render = async () => {
    if (!doc) return;
    n = Math.max(1, Math.min(doc.numPages, n));
    body.querySelector(".pdf-n").textContent = `${n} / ${doc.numPages}`;
    const p = await doc.getPage(n);
    const box = body.querySelector(".pdf-canvas"), width = Math.min(900, box.clientWidth || 700);
    const vp = p.getViewport({ scale: 1 }), scale = width / vp.width * (devicePixelRatio || 1);
    const view = p.getViewport({ scale });
    const canvas = body.querySelector("canvas");
    canvas.width = view.width; canvas.height = view.height;
    canvas.style.width = `${view.width / (devicePixelRatio || 1)}px`;
    if (busy) busy.cancel();
    busy = p.render({ canvasContext: canvas.getContext("2d"), viewport: view });
    await busy.promise.catch(() => {});
  };
  body.addEventListener("click", e => { const b = e.target.closest("[data-p]"); if (b) { n += Number(b.dataset.p); render(); } });
  try {
    const lib = await pdfjs();
    task = lib.getDocument({ url: imgURL(item.fileId), useSystemFonts: true });
    doc = await task.promise;
    render();
  } catch (err) { body.querySelector(".pdf-canvas").innerHTML = `<p class="tome-empty">${esc("No se ha podido abrir el PDF: " + (err.message || err))}</p>`; void m; }
}

/* ---------- Añadir a la biblioteca ---------- */
const MAX_PDF = 150 * 1024 * 1024;
function addDocument() {
  if (userBooks().length >= 60) return toast("La biblioteca ya tiene sesenta libros", "bad");
  const body = el(`<div class="lib-add">
    <div class="lib-kinds">
      <button type="button" class="lib-kind" data-k="pdf">${icon("book", 22)}<b>PDF</b><small>Un manual o una aventura. Se le saca el texto para poder buscar.</small></button>
      <button type="button" class="lib-kind" data-k="text">${icon("scroll", 22)}<b>Texto o Markdown</b><small>.txt o .md; los títulos se convierten en secciones.</small></button>
      <button type="button" class="lib-kind" data-k="image">${icon("image", 22)}<b>Imagen</b><small>Un mapa, una carta, un retrato que enseñar a la mesa.</small></button>
      <button type="button" class="lib-kind" data-k="notebook">${icon("pencil", 22)}<b>Cuaderno</b><small>Tus notas de campaña, escritas aquí, por secciones.</small></button>
    </div>
    <input type="file" hidden>
    <p class="lib-progress hidden" role="status"></p>
  </div>`);
  const m = modal({ title: "Añadir a la biblioteca", body, wide: true, actions: [{ label: "Cerrar" }] });
  const file = body.querySelector("input[type=file]"), progress = body.querySelector(".lib-progress");
  let kind = "";
  const say = t => { progress.classList.remove("hidden"); progress.textContent = t; };
  body.addEventListener("click", e => {
    const b = e.target.closest("[data-k]");
    if (!b) return;
    kind = b.dataset.k;
    if (kind === "notebook") {
      const item = normalizeLibraryItem({ kind: "notebook", title: t("Cuaderno de campaña"), color: "#5b4a1e",
        sections: [{ title: t("Primera sesión"), text: "" }] });
      op("library.set", { item });
      m.close();
      return setTimeout(() => openBook(item.id), 200);
    }
    file.accept = { pdf: "application/pdf,.pdf", text: ".txt,.md,.markdown,text/plain,text/markdown", image: "image/*" }[kind];
    file.value = "";
    file.click();
  });
  file.addEventListener("change", async () => {
    const f = file.files[0];
    if (!f) return;
    const title = f.name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim().slice(0, 80) || "Documento";
    try {
      body.querySelectorAll("[data-k]").forEach(x => { x.disabled = true; });
      let item;
      if (kind === "pdf") {
        if (f.size > MAX_PDF) throw new Error("Ese PDF pasa de 150 MB");
        say("Leyendo el PDF…");
        const data = await extractPdf(await f.arrayBuffer(), (i, n) => say(`Leyendo el texto: página ${i} de ${n}`));
        say("Subiendo el PDF…");
        const fileId = await uploadImage(new Blob([f], { type: "application/pdf" }));
        const textId = await uploadImage(new Blob([JSON.stringify(data)], { type: "application/json" }));
        item = { kind: "pdf", title: data.title || title, fileId, textId, fileName: f.name, pages: data.pages.length, color: "#6b3a2a" };
      } else if (kind === "text") {
        if (f.size > 8 * 1024 * 1024) throw new Error("Ese texto pasa de 8 MB");
        say("Subiendo el texto…");
        const md = /\.(md|markdown)$/i.test(f.name);
        const fileId = await uploadImage(new Blob([await f.text()], { type: md ? "text/markdown" : "text/plain" }));
        item = { kind: "text", title, fileId, fileName: f.name, color: "#5b4a1e" };
      } else {
        if (!/^image\//.test(f.type)) throw new Error("Eso no es una imagen");
        if (f.size > 20 * 1024 * 1024) throw new Error("Esa imagen pasa de 20 MB");
        say("Subiendo la imagen…");
        const fileId = await uploadImage(f);
        item = { kind: "image", title, fileId, fileName: f.name, color: "#3a3f44" };
      }
      const full = normalizeLibraryItem({ ...item, addedAt: Date.now() });
      op("library.set", { item: full });
      m.close();
      toast(`«${full.title}» ya está en la estantería`, "good");
    } catch (err) {
      say(err.message || "No se ha podido añadir");
      body.querySelectorAll("[data-k]").forEach(x => { x.disabled = false; });
    }
  });
}

/* El texto de cada página y el índice del PDF, para buscar sin volver a
   abrirlo. Se hace en el navegador del DM, con pdf.js. */
export async function extractPdf(buffer, onPage = () => {}) {
  const lib = await pdfjs();
  const task = lib.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true });
  const doc = await task.promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    let text = "", lastY = null;
    for (const it of tc.items) {
      if (!("str" in it)) continue;
      const y = it.transform ? it.transform[5] : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > (it.height || 10) * 1.6) text += "\n\n";
      else if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) text += "\n";
      text += it.str + (it.hasEOL ? "\n" : "");
      lastY = y;
    }
    pages.push(text.replace(/[ \t]+/g, " ").replace(/\n /g, "\n").trim());
    if (i % 5 === 0 || i === doc.numPages) onPage(i, doc.numPages);
    page.cleanup();
  }
  let outline = [];
  try {
    const raw = (await doc.getOutline()) || [];
    for (const o of raw.slice(0, 200)) {
      let dest = o.dest;
      if (typeof dest === "string") dest = await doc.getDestination(dest);
      if (Array.isArray(dest) && dest[0]) outline.push({ title: String(o.title || "").trim().slice(0, 80), page: (await doc.getPageIndex(dest[0])) + 1 });
    }
  } catch { outline = []; }
  let title = "";
  try { const meta = await doc.getMetadata(); title = String((meta.info && meta.info.Title) || "").trim().slice(0, 80); } catch {}
  task.destroy();
  return { title, pages, outline };
}

/* ---------- Buscar en toda la biblioteca ---------- */
function searchAll() {
  const body = el(`<div class="lib-search">
    <label class="tome-search">${icon("search", 16)}<input type="search" placeholder="Un conjuro, un monstruo, una regla…" aria-label="Buscar en toda la biblioteca" autocomplete="off"></label>
    <div class="lib-results"><p class="tome-empty">Busca en todos los libros a la vez.</p></div></div>`);
  const m = modal({ title: "Buscar en la biblioteca", body, wide: true, actions: [{ label: "Cerrar" }] });
  const input = body.querySelector("input"), out = body.querySelector(".lib-results");
  let timer = null, seq = 0;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const q = input.value, mine = ++seq;
      if (q.trim().length < 2) { out.innerHTML = `<p class="tome-empty">Busca en todos los libros a la vez.</p>`; return; }
      out.innerHTML = `<p class="tome-loading">${rune(1, 18)}<span>Buscando…</span></p>`;
      const ids = [...BUILTIN.map(b => b.id), ...userBooks().map(b => b.id)];
      const groups = [];
      for (const id of ids) {
        try { const book = await loadBook(id); const hits = search(book, q, { limit: 6 }); if (hits.length) groups.push([book, hits]); } catch {}
      }
      if (mine !== seq) return;
      out.innerHTML = groups.length ? groups.map(([book, hits]) => `<section class="lib-group" style="--c:${esc(book.color)}">
          <h3>${rune(book.rune || 0, 14)}<span>${esc(book.title)}</span></h3>
          <ol class="tome-results">${hits.map(r => `<li><button type="button" data-open="${esc(book.id)}" data-at="${r.si}:${r.ei}">
            <span class="hit-where">${esc(book.sections[r.si].title)}${r.title ? " › " + esc(r.title) : ""}</span><span class="hit-text">${r.snippet}</span></button></li>`).join("")}</ol></section>`).join("")
        : `<p class="tome-empty">No aparece en ningún libro.</p>`;
    }, 250);
  });
  out.addEventListener("click", e => {
    const b = e.target.closest("[data-open]");
    if (!b) return;
    const [s, en] = b.dataset.at.split(":").map(Number);
    const q = input.value;
    m.close();
    openBook(b.dataset.open, null, { si: s, ei: en, query: q });
  });
}
