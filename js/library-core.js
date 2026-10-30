/* La biblioteca, sin pantalla: convertir textos, Markdown y PDF en libros
   por secciones, y buscar dentro. Aparte de library.js para poder probarlo
   sin navegador.

   Un libro: { sections: [{ id, title, intro?, range?, entries: [{ id, title,
   html, meta?, page?, raw? }] }] } */

import { esc } from "./util.js";
import { rollable } from "./rollable.js";

/* Un texto con saltos de línea, en párrafos; las fórmulas se pueden tirar */
export function textHTML(text) {
  const blocks = String(text || "").split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
  return blocks.length ? blocks.map(b => `<p>${rollable(b).replace(/\n/g, "<br>")}</p>`).join("") : `<p class="tome-empty">Página en blanco.</p>`;
}

/* Markdown sencillo: títulos, listas, negrita y cursiva */
function mdInline(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*]+)\*/g, "$1<i>$2</i>").replace(/`([^`]+)`/g, "<code>$1</code>");
}
function mdBlocks(lines) {
  const out = [];
  let list = null, para = [];
  const flush = () => { if (para.length) out.push(`<p>${mdInline(para.join(" "))}</p>`); para = []; if (list) { out.push(`<ul>${list.join("")}</ul>`); list = null; } };
  for (const line of lines) {
    const t = line.trim();
    if (!t) { flush(); continue; }
    const h = t.match(/^(#{3,6})\s+(.*)$/);
    if (h) { flush(); out.push(`<h4>${mdInline(h[2])}</h4>`); continue; }
    const li = t.match(/^[-*+]\s+(.*)$/) || t.match(/^\d+[.)]\s+(.*)$/);
    if (li) { if (para.length) { out.push(`<p>${mdInline(para.join(" "))}</p>`); para = []; } (list = list || []).push(`<li>${mdInline(li[1])}</li>`); continue; }
    if (list) flush();
    para.push(t);
  }
  flush();
  return out.join("") || `<p class="tome-empty">Sin texto.</p>`;
}
export function markdownSections(text, fallback) {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  const level = lines.some(l => /^#\s/.test(l)) ? 1 : lines.some(l => /^##\s/.test(l)) ? 2 : 0;
  const sections = [];
  let cur = { title: fallback, lines: [] };
  for (const l of lines) {
    const m = level && l.match(level === 1 ? /^#\s+(.*)$/ : /^##\s+(.*)$/);
    if (m) { if (cur.lines.some(x => x.trim()) || sections.length) sections.push(cur); cur = { title: m[1].trim(), lines: [] }; }
    else cur.lines.push(l);
  }
  sections.push(cur);
  /* Sin títulos: trozos de unas 60 líneas, para no tener una sola página eterna */
  const parts = level ? sections : chunk(cur.lines, 60).map((ls, i) => ({ title: `${fallback} · ${i + 1}`, lines: ls }));
  return parts.filter(s => s.lines.some(x => x.trim()) || level).map((s, i) => {
    const subs = [], head = [];
    let sub = null;
    for (const l of s.lines) {
      const m = l.match(level === 1 ? /^##\s+(.*)$/ : /^###\s+(.*)$/);
      if (level && m) { sub = { title: m[1].trim(), lines: [] }; subs.push(sub); }
      else (sub ? sub.lines : head).push(l);
    }
    const entries = [];
    if (head.some(x => x.trim()) || !subs.length) entries.push({ id: `s${i}-0`, title: "", html: mdBlocks(head) });
    subs.forEach((x, j) => entries.push({ id: `s${i}-${j + 1}`, title: x.title, html: mdBlocks(x.lines) }));
    return { id: "s" + i, title: s.title || fallback, entries };
  });
}
export const chunk = (list, n) => { const out = []; for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n)); return out.length ? out : [[]]; };

export function pdfSections(data) {
  const pages = data.pages || [];
  const pageEntry = i => ({ id: "p" + (i + 1), title: `Página ${i + 1}`, page: i + 1, html: pageHTML(pages[i]) });
  const outline = (data.outline || []).filter(o => o.page >= 1 && o.page <= pages.length).sort((a, b) => a.page - b.page);
  if (outline.length >= 2) {
    const out = [];
    if (outline[0].page > 1) out.push({ id: "o-pre", title: "Comienzo", from: 1, to: outline[0].page - 1 });
    outline.forEach((o, i) => out.push({ id: "o" + i, title: o.title, from: o.page, to: (outline[i + 1] ? outline[i + 1].page - 1 : pages.length) }));
    return out.filter(s => s.to >= s.from).map(s => ({ id: s.id, title: s.title, range: `${s.from}–${s.to}`,
      entries: Array.from({ length: s.to - s.from + 1 }, (_, k) => pageEntry(s.from - 1 + k)) }));
  }
  return chunk(pages.map((_, i) => i), 10).map((idx, k) => ({ id: "c" + k, title: `Páginas ${idx[0] + 1}–${idx[idx.length - 1] + 1}`,
    entries: idx.map(pageEntry) }));
}
function pageHTML(text) {
  const t = String(text || "").trim();
  if (!t) return `<p class="tome-empty">Esta página no tiene texto (puede ser una imagen). Mírala en «Ver original».</p>`;
  return t.split(/\n{2,}/).map(b => `<p>${esc(b).replace(/\n/g, " ")}</p>`).join("");
}

/* ---------- El buscador ---------- */
export const fold = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const plain = html => String(html).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
function indexOf(book) {
  if (!book._index) {
    book._index = [];
    book.sections.forEach((s, si) => s.entries.forEach((e, ei) => {
      const text = plain(e.html);
      book._index.push({ si, ei, section: s.title, title: e.title, text, hay: fold(`${e.title} ${e.meta || ""} ${text}`) });
    }));
  }
  return book._index;
}
export function search(book, query, { section = null, limit = 80 } = {}) {
  const words = fold(query).split(/\s+/).filter(w => w.length > 1);
  if (!words.length) return [];
  const out = [];
  for (const row of indexOf(book)) {
    if (section !== null && row.si !== section) continue;
    if (!words.every(w => row.hay.includes(w))) continue;
    const title = fold(row.title);
    const score = words.reduce((s, w) => s + (title.includes(w) ? 5 : 0) + (title.startsWith(w) ? 3 : 0), 0);
    out.push({ ...row, score, snippet: snippetOf(row.text, words) });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
function snippetOf(text, words) {
  const f = fold(text);
  const at = Math.max(0, f.indexOf(words[0]) - 50);
  const piece = (at ? "…" : "") + text.slice(at, at + 160) + (text.length > at + 160 ? "…" : "");
  return markWords(esc(piece), words);
}
export function markWords(html, words) {
  /* Marca sin romper las etiquetas ni los acentos: se compara sin tildes */
  return html.replace(/(<[^>]+>)|([^<]+)/g, (m, tag, txt) => {
    if (tag) return tag;
    const f = fold(txt);
    const hits = [];
    for (const w of words) { let i = f.indexOf(w); while (i >= 0) { hits.push([i, i + w.length]); i = f.indexOf(w, i + w.length); } }
    if (!hits.length) return txt;
    hits.sort((a, b) => a[0] - b[0]);
    let out = "", at = 0;
    for (const [a, b] of hits) { if (a < at) continue; out += txt.slice(at, a) + "<mark>" + txt.slice(a, b) + "</mark>"; at = b; }
    return out + txt.slice(at);
  });
}

