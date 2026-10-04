/* Una lista que se edita fila a fila, como las de D&D Beyond: cada fila con
   sus campos rotulados, un botón para quitarla y otro debajo para añadir.

   fields: [{ key, label, type, options, grow, placeholder }]
     type: text (por defecto), number, check, select (options: [[valor, texto]]) o area
     grow: cuánto se estira el campo en la fila (1 por defecto)
   Devuelve { node, read } y read() da la lista de objetos escritos. */

import { esc } from "./util.js";
import { icon } from "./icons.js";

export function listEditor({ fields, rows = [], add = "Añadir", blank = {} }) {
  const node = document.createElement("div");
  node.className = "list-editor";
  node.innerHTML = `<div class="le-rows"></div><button type="button" class="btn sm le-add">${esc(add)}</button>`;
  const list = node.querySelector(".le-rows");

  const input = (f, v) => {
    const ph = f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : "";
    if (f.type === "check") return `<input type="checkbox" data-k="${f.key}" ${v ? "checked" : ""}>`;
    if (f.type === "area") return `<textarea data-k="${f.key}" rows="2"${ph}>${esc(v ?? "")}</textarea>`;
    if (f.type === "select") return `<select data-k="${f.key}">${f.options.map(([val, txt]) =>
      `<option value="${esc(val)}" ${String(val) === String(v) ? "selected" : ""}>${esc(txt)}</option>`).join("")}</select>`;
    const extra = f.type === "number" ? ` type="number" min="${f.min ?? 0}" step="${f.step ?? 1}"` : "";
    return `<input data-k="${f.key}"${extra} value="${esc(v ?? "")}"${ph}>`;
  };
  const addRow = (r = blank) => {
    const row = document.createElement("div");
    row.className = "le-row";
    row.innerHTML = fields.map(f => `<label class="field le-${f.type || "text"}" style="flex:${f.grow ?? 1} 1 ${f.basis || "120px"}">
        <span>${esc(f.label)}</span>${input(f, r[f.key])}</label>`).join("")
      + `<button type="button" class="icon-btn danger le-drop" title="Quitar" aria-label="Quitar">${icon("close")}</button>`;
    row.querySelector(".le-drop").addEventListener("click", () => row.remove());
    list.appendChild(row);
    return row;
  };
  rows.forEach(r => addRow(r));
  node.querySelector(".le-add").addEventListener("click", () => {
    const row = addRow();
    const first = row.querySelector("input, textarea, select");
    if (first) first.focus();
  });

  const read = () => [...list.children].map(row => Object.fromEntries(fields.map(f => {
    const el = row.querySelector(`[data-k="${f.key}"]`);
    return [f.key, f.type === "check" ? el.checked : f.type === "number" ? +el.value || 0 : el.value.trim()];
  })));
  return { node, read };
}

/* Los rasgos y acciones de las criaturas se guardan como «Nombre — texto», una
   por línea (así vienen del catálogo y así se traducen). Ida y vuelta: */
export const linesToEntries = text => String(text || "").split("\n").map(l => l.trim()).filter(Boolean).map(l => {
  const i = l.indexOf(" — ");
  return i > 0 ? { name: l.slice(0, i), text: l.slice(i + 3) } : { name: "", text: l };
});
export const entriesToLines = list => list
  .filter(e => e.name || e.text)
  .map(e => e.name && e.text ? `${e.name} — ${e.text}` : e.name || e.text)
  .join("\n");
