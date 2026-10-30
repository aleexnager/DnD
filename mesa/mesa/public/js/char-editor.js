/* Editor de ficha. El DM lo abre para cualquiera; cada jugador, para la suya.
   Es la hoja de personaje de 2024 (hoja.js), editable. */

import { modal, esc, toast } from "./util.js";
import { CONDITIONS, normalizeChar, modOf, uid, acParts } from "./schema.js";
import { op, patchChar } from "./net.js";
import { sheetHTML, mountSheet } from "./hoja.js";

export function openCharEditor(source, { isDM = true, title } = {}) {
  const c = normalizeChar(source || {});
  const isNew = !source || !source.id;
  const body = document.createElement("div");
  body.innerHTML = sheetHTML(c, { isDM });
  const sheet = mountSheet(body, c);

  modal({
    title: title || (isNew ? "Nuevo personaje" : "Ficha de " + c.name),
    body,
    wide: true,
    cls: "sheet-modal",
    actions: [
      { label: "Cancelar" },
      {
        label: isNew ? "Crear personaje" : "Guardar",
        tone: "primary",
        run: () => {
          const fields = sheet.read();
          if (isNew) {
            const fresh = normalizeChar({ ...fields, id: uid(), kind: "pc" });
            op("char.add", { char: fresh });
            toast(fresh.name + " se sienta a la mesa", "good");
          } else {
            patchChar(c.id, fields);
          }
        }
      }
    ]
  });
}

/* ---------- CA temporal ----------
   Lo que sube o baja la CA un rato: Escudo, Escudo de fe, la cobertura de
   una mesa volcada. Se suma a la de la ficha en las reglas y se ve aparte. */
const AC_PRESETS = [["Escudo", 5], ["Escudo de fe", 2], ["Cobertura media", 2], ["Cobertura de tres cuartos", 5]];
export function openTempAC(c) {
  let extra = c.tempAc || 0;
  const body = document.createElement("div");
  const paint = () => {
    body.innerHTML = `
      <div class="tac">
        <div class="tac-sum"><span><small>Base</small><b class="tnum">${c.ac}</b></span><span class="tac-op">${extra < 0 ? "−" : "+"}</span>
          <span><small>Temporal</small><b class="tnum">${Math.abs(extra)}</b></span><span class="tac-op">=</span>
          <span class="tac-total"><small>Total</small><b class="tnum">${c.ac + extra}</b></span></div>
        <div class="tac-steps">
          <button type="button" class="btn sm" data-d="-1">−1</button>
          <input type="number" class="tnum" data-v value="${extra}" min="-20" max="30" aria-label="CA temporal">
          <button type="button" class="btn sm" data-d="1">+1</button>
        </div>
        <div class="tac-presets">${AC_PRESETS.map(([n, v]) => `<button type="button" class="chip" data-set="${v}">${esc(n)} +${v}</button>`).join("")}</div>
      </div>`;
  };
  paint();
  body.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.d) extra = Math.max(-20, Math.min(30, extra + +b.dataset.d));
    if (b.dataset.set) extra = +b.dataset.set;
    paint();
  });
  body.addEventListener("change", e => { if (e.target.matches("[data-v]")) { extra = Math.max(-20, Math.min(30, Math.trunc(+e.target.value || 0))); paint(); } });
  modal({
    title: "CA temporal de " + c.name, body,
    actions: [
      ...(c.tempAc ? [{ label: "Quitar", run: () => patchChar(c.id, { tempAc: 0 }) }] : []),
      { label: "Cancelar" },
      { label: "Guardar", tone: "primary", run: () => patchChar(c.id, { tempAc: extra }) }
    ]
  });
}

/* El escudo de la CA: el total, con la parte temporal marcada aparte */
export function acShield(c, { cls = "ac-shield", act = "" } = {}) {
  const p = acParts(c);
  const tag = act ? "button" : "div";
  return `<${tag} class="${cls}${p.extra ? " ac-temp" : ""}" title="${esc(p.title)}${act ? " · pulsa para la CA temporal" : ""}"${act ? ` type="button" data-act="${act}"` : ""}>
    <small>CA</small><b class="tnum">${p.total}</b>${p.extra ? `<i class="ac-extra">${p.extra > 0 ? "+" : "−"}${Math.abs(p.extra)}</i>` : ""}</${tag}>`;
}

/* ---------- Estados ---------- */
export function openConditions(c) {
  const body = document.createElement("div");
  const meta = { ...(c.condMeta || {}) };
  body.innerHTML = `
    <div class="cond-list">
      ${CONDITIONS.map(cond => `<label class="cond-row" title="${esc(cond.hint)}">
        <input type="checkbox" value="${cond.id}" ${c.conditions.includes(cond.id) ? "checked" : ""}>
        <span><b>${cond.name}</b><small>${esc(cond.hint)}</small></span>
        <input type="number" min="0" max="99" placeholder="∞" data-rounds="${cond.id}"
          value="${meta[cond.id] || ""}" aria-label="Rondas que dura" title="Rondas que dura (en blanco, hasta que se lo quiten)">
      </label>`).join("")}
    </div>
    <label class="field" style="margin-top:14px"><span>Nivel de agotamiento (0 a 6)</span>
      <input type="number" id="exh" min="0" max="6" value="${c.exhaustion}"></label>
    <label class="field"><span>Concentrado en</span>
      <input id="conc" value="${esc(c.concentration)}" placeholder="Bendición, telaraña…"></label>`;

  modal({
    title: "Estados de " + c.name,
    body,
    actions: [
      { label: "Cancelar" },
      {
        label: "Guardar",
        tone: "primary",
        run: host => {
          const on = [...host.querySelectorAll("input[type=checkbox]:checked")].map(i => i.value);
          const rounds = {};
          on.forEach(id => {
            const n = +host.querySelector(`[data-rounds="${id}"]`).value;
            if (n > 0) rounds[id] = n;
          });
          patchChar(c.id, {
            conditions: on,
            condMeta: rounds,
            exhaustion: +host.querySelector("#exh").value || 0,
            concentration: host.querySelector("#conc").value.trim()
          });
        }
      }
    ]
  });
}

/* Modificador con competencia incluida */
export const skillMod = (c, ability, proficient) => modOf(c[ability]) + (proficient ? c.proficiency : 0);
