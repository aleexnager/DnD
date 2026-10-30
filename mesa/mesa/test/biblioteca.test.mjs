/* La biblioteca del DM: lo que se guarda, quién la ve, cómo se trocean los
   documentos y cómo se busca en los libros de serie */

import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLibraryItem, migrate, emptyDoc, MAX_LIBRARY } from "../public/js/schema.js";
import { createEngine } from "../public/js/engine.js";
import { markdownSections, pdfSections, search, textHTML } from "../public/js/library-core.js";
import { rollable } from "../public/js/rollable.js";
import { REGLAS } from "../public/js/libros/reglas.js";
import { JUGADOR } from "../public/js/libros/jugador.js";
import { CONJUROS, spellsBook } from "../public/js/libros/conjuros.js";
import { bestiaryBook } from "../public/js/libros/bestiario.js";

let n = 0;
const rid = () => "id" + (n++);
const dm = { id: "dm1", name: "DM", role: "dm", charId: null };
const pl = { id: "p1", name: "Lu", role: "player", charId: null };
const screen = { id: "s1", name: "Tele", role: "screen", charId: null };

test("un libro se sanea: título, tipo, color y secciones solo en cuadernos", () => {
  assert.equal(normalizeLibraryItem({ kind: "vídeo" }).kind, "notebook", "un tipo raro se queda en cuaderno");
  const a = normalizeLibraryItem({ title: "x".repeat(200), kind: "image", color: "rojo", sections: [{ title: "S", text: "t" }] });
  assert.equal(a.title.length, 80);
  assert.match(a.color, /^#[0-9a-f]{6}$/i);
  assert.equal(a.sections.length, 0);
  const nb = normalizeLibraryItem({ kind: "notebook", title: "Notas", sections: Array.from({ length: 100 }, (_, i) => ({ title: "S" + i, text: "y".repeat(30000) })) });
  assert.equal(nb.sections.length, 80);
  assert.equal(nb.sections[0].text.length, 20000);
  assert.ok(nb.id && nb.sections.every(s => s.id));
  const pdf = normalizeLibraryItem({ kind: "pdf", title: "Aventura", fileId: "abc.pdf", textId: "abc.json", pages: 12 });
  assert.equal(pdf.pages, 12);
  assert.equal(pdf.fileId, "abc.pdf");
});

test("las partidas antiguas ganan una biblioteca vacía y las nuevas la recortan", () => {
  assert.deepEqual(emptyDoc().library, []);
  const old = emptyDoc(); delete old.library;
  assert.deepEqual(migrate(old).library, []);
  const many = { ...emptyDoc(), library: Array.from({ length: 70 }, (_, i) => ({ kind: "notebook", title: "C" + i })) };
  assert.equal(migrate(many).library.length, MAX_LIBRARY);
});

test("solo el DM toca la biblioteca y ni jugadores ni pantalla la reciben", async () => {
  const eng = createEngine({ rid });
  const item = normalizeLibraryItem({ kind: "notebook", title: "Secretos", sections: [{ title: "El traidor", text: "Es el alcalde" }] });
  assert.equal((await eng.run(pl, [{ type: "library.set", item }])).error, "Solo el DM");
  assert.equal((await eng.run(dm, [{ type: "library.set", item }])).error, null);
  assert.equal(eng.doc.library.length, 1);
  await eng.run(dm, [{ type: "library.set", item: { ...item, title: "Secretos del DM" } }]);
  assert.equal(eng.doc.library.length, 1, "mismo id: se sustituye, no se duplica");
  assert.equal(eng.doc.library[0].title, "Secretos del DM");
  eng.advance();
  assert.equal(eng.snapshot(dm).library.length, 1);
  for (const who of [pl, screen]) {
    const view = JSON.stringify(eng.snapshot(who));
    assert.ok(!view.includes("alcalde") && !view.includes("Secretos"), `${who.role} no ve la biblioteca`);
  }
  assert.equal((await eng.run(pl, [{ type: "library.remove", id: item.id }])).error, "Solo el DM");
  await eng.run(dm, [{ type: "library.remove", id: item.id }]);
  assert.equal(eng.doc.library.length, 0);
});

test("deshacer la partida no borra lo escrito en la biblioteca", async () => {
  const eng = createEngine({ rid });
  await eng.run(dm, [{ type: "session.patch", fields: { title: "Antes" } }]);
  await eng.run(dm, [{ type: "library.set", item: normalizeLibraryItem({ id: "nb", kind: "notebook", title: "Notas" }) }]);
  await eng.run(dm, [{ type: "undo" }]);
  assert.equal(eng.doc.library.length, 1);
  assert.notEqual(eng.doc.session.title, "Antes");
});

test("la biblioteca tiene un tope", async () => {
  const eng = createEngine({ rid });
  for (let i = 0; i < MAX_LIBRARY; i++) await eng.run(dm, [{ type: "library.set", item: { kind: "notebook", title: "C" + i } }]);
  const r = await eng.run(dm, [{ type: "library.set", item: { kind: "notebook", title: "Uno más" } }]);
  assert.match(r.error, /ya tiene/);
});

test("un Markdown se parte por sus títulos", () => {
  const md = "# Uno\n\nIntro **fuerte**.\n\n## Sub A\n\n- a\n- b\n\n# Dos\n\nTexto con `código`.";
  const s = markdownSections(md, "Notas");
  assert.deepEqual(s.map(x => x.title), ["Uno", "Dos"]);
  assert.deepEqual(s[0].entries.map(e => e.title), ["", "Sub A"]);
  assert.match(s[0].entries[0].html, /<b>fuerte<\/b>/);
  assert.match(s[0].entries[1].html, /<ul><li>a<\/li><li>b<\/li><\/ul>/);
  const plain = markdownSections(Array.from({ length: 130 }, (_, i) => "línea " + i).join("\n"), "Texto");
  assert.equal(plain.length, 3, "sin títulos: trozos de 60 líneas");
  assert.match(markdownSections("<script>alert(1)</script>", "x")[0].entries[0].html, /&lt;script&gt;/);
});

test("un PDF usa su índice como secciones y, sin índice, bloques de diez páginas", () => {
  const pages = Array.from({ length: 23 }, (_, i) => "Página de texto " + (i + 1));
  const withOutline = pdfSections({ pages, outline: [{ title: "Capítulo 1", page: 3 }, { title: "Capítulo 2", page: 10 }] });
  assert.deepEqual(withOutline.map(s => [s.title, s.entries.length]), [["Comienzo", 2], ["Capítulo 1", 7], ["Capítulo 2", 14]]);
  assert.deepEqual(pdfSections({ pages }).map(s => s.title), ["Páginas 1–10", "Páginas 11–20", "Páginas 21–23"]);
  assert.match(pdfSections({ pages: [""] })[0].entries[0].html, /no tiene texto/);
});

test("buscar no distingue tildes ni mayúsculas y prima el título", () => {
  const book = { sections: [
    { title: "A", entries: [{ id: "1", title: "Otra cosa", html: "<p>habla del dragón rojo</p>" }] },
    { title: "B", entries: [{ id: "2", title: "Dragón rojo", html: "<p>gran wyrm</p>" }] }
  ] };
  const r = search(book, "DRAGON");
  assert.equal(r.length, 2);
  assert.equal(r[0].title, "Dragón rojo");
  assert.match(r[1].snippet, /<mark>dragón<\/mark>/);
  assert.equal(search(book, "dragon", { section: 0 }).length, 1);
  assert.equal(search(book, "dragon wyrm").length, 1, "todas las palabras");
  assert.equal(search(book, "a").length, 0, "una letra no busca");
});

test("las fórmulas del cuaderno se tiran, también «2d8+4 de daño»", () => {
  assert.match(textHTML("El ogro hace 2d8+4 de daño."), /data-roll-formula="2d8\+4"/);
  assert.match(rollable("1d6 + 2 de daño"), /data-roll-formula="1d6\+2"/);
  assert.match(rollable("2d6 + 1d4"), /data-roll-formula="2d6"/);
});

test("los cuatro libros de serie: secciones con contenido e ids únicos", () => {
  const books = { reglas: REGLAS, jugador: JUGADOR, conjuros: spellsBook(), bestiario: bestiaryBook([]) };
  for (const [name, book] of Object.entries(books)) {
    assert.ok(book.sections.length >= 10, `${name}: ${book.sections.length} secciones`);
    const ids = new Set();
    for (const s of book.sections) {
      assert.ok(s.title && s.entries.length, `${name}: «${s.title}» tiene entradas`);
      for (const e of s.entries) {
        assert.ok(e.html && e.html.length > 10, `${name}: «${e.title}» tiene texto`);
        assert.ok(!ids.has(s.id + "/" + e.id), `${name}: id repetido ${e.id}`);
        ids.add(s.id + "/" + e.id);
      }
    }
  }
  assert.ok(JUGADOR.sections.filter(s => s.entries.some(e => /Progresión/.test(e.title))).length === 12, "una sección por clase");
  assert.equal(CONJUROS.length, 391, "los 391 del Manual del Jugador de 2024 (339 del SRD 5.2.1 y 52 más)");
  assert.equal(books.conjuros.sections.slice(0, 10).reduce((n, s) => n + s.entries.length, 0), 391, "trucos y niveles 1-9");
  assert.equal(new Set(CONJUROS.map(s => s.name)).size, 391, "sin nombres repetidos");
  assert.ok(search(books.conjuros, "bola de fuego")[0].title === "Bola de fuego");
  assert.ok(search(books.bestiario, "goblin").length > 0);
  assert.ok(search(books.reglas, "agarrado").length > 0);
});

test("el bestiario incluye las criaturas propias del DM", () => {
  const book = bestiaryBook([{ id: "b-x", name: "Gólem de turba", sizeType: "Constructo grande", cr: "5", hp: 90, ac: 14 }]);
  const hits = search(book, "golem turba");
  assert.equal(hits.length >= 1, true);
});
