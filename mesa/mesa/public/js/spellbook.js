/* Libro de conjuros: lo que sabe cada personaje y la ventana de lanzar.
   La resolución (tiradas, salvaciones, daño, estados) la hace el servidor:
   aquí solo se elige qué, a qué nivel y contra quién. */

import { el, on, esc, toast, modal, confirmBox } from "./util.js";
import { op, patchChar, store, aimAt } from "./net.js";
import { normalizeSpell, modOf, CONDITIONS, SHAPE_NAMES, uid } from "./schema.js";
import { guessAbility, libraryOf, isBuiltinSpell, builtinSpell } from "./spells.js";
import { icon, withIcon } from "./icons.js";
import { keyMods } from "./dice-panel.js";
import { rollable } from "./rollable.js";
import { spellChips, chipsHTML } from "./chips.js";

const ABIL = { int: "Inteligencia", wis: "Sabiduría", cha: "Carisma" };
const SAVE = { str: "FUE", dex: "DES", con: "CON", int: "INT", wis: "SAB", cha: "CAR" };
const levelName = n => n === 0 ? "Trucos" : `Nivel ${n}`;

export function castStats(c) {
  const ability = c.castAbility || guessAbility(c.className);
  const mod = modOf(c[ability]);
  const prof = c.proficiency || 2;
  return { ability, dc: c.spellDC || 8 + prof + mod, atk: c.spellAtk || prof + mod };
}

/* Resumen de una línea: qué tira y cuánto (el alcance, el área, el estado y
   la concentración van en sus indicadores, chips.js) */
export function spellTags(sp) {
  const t = [];
  if (sp.mode === "attack") t.push(sp.melee ? "ataque cuerpo a cuerpo" : "ataque a distancia");
  if (sp.mode === "save") t.push(`salvación de ${SAVE[sp.save] || "DES"}${sp.half ? " (mitad)" : ""}`);
  if (sp.mode === "auto") t.push(`${sp.darts} dardos`);
  if (sp.mode === "heal") t.push(`cura ${sp.heal}${sp.healMod ? " + car." : ""}`);
  if (sp.mode === "sleep") t.push(`sueño ${sp.damage}`);
  if (sp.damage && sp.mode !== "sleep") t.push(`${sp.damage}${sp.type ? " " + sp.type : ""}`);
  return t.join(" · ");
}

const slotsLeft = (c, level) => Math.max(0, (c.slots[level - 1] || 0) - (c.slotsUsed[level - 1] || 0));

/* ---------- El libro ---------- */
export function openSpellbook(c, ctx = {}) {
  const fresh = () => (ctx.getChar ? ctx.getChar(c.id) : c) || c;
  let win = null;

  const paint = () => {
    const ch = fresh();
    const st = castStats(ch);
    const byLevel = {};
    for (const sp of ch.spellbook) (byLevel[sp.level] = byLevel[sp.level] || []).push(sp);
    const slots = ch.slots.map((n, i) => n ? `<span class="slot-pill" title="Espacios de nivel ${i + 1}"><b>${i + 1}º</b> ${slotsLeft(ch, i + 1)}/${n}</span>` : "").join("");
    return `<div class="spellbook">
      <div class="sb-stats">
        <label class="field sb-abil"><span>Característica</span>
          <select data-sb="ability">${Object.entries(ABIL).map(([k, v]) => `<option value="${k}" ${k === st.ability ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <div class="sb-num" title="Dificultad de las salvaciones contra tus conjuros"><b>${st.dc}</b><span>CD</span></div>
        <div class="sb-num" title="Bonificador a los ataques de conjuro"><b>${st.atk >= 0 ? "+" : ""}${st.atk}</b><span>ataque</span></div>
        ${ctx.isDM ? `<label class="field sb-fix"><span>CD fija</span><input type="number" min="0" max="30" data-sb="dc" value="${ch.spellDC || ""}" placeholder="auto"></label>
          <label class="field sb-fix"><span>Ataque fijo</span><input type="number" min="0" max="20" data-sb="atk" value="${ch.spellAtk || ""}" placeholder="auto"></label>` : ""}
      </div>
      ${slots ? `<div class="sb-slots">${icon("sparkle", 14)}<span>Espacios:</span>${slots}</div>` : `<p class="prose small"><span>Sin espacios de conjuro apuntados en la ficha: los trucos se lanzan igual.</span></p>`}
      ${ch.spellbook.length ? Object.keys(byLevel).sort((a, b) => a - b).map(lv => `
        <h4 class="menu-sec">${levelName(+lv)}</h4>
        <div class="sb-list">${byLevel[lv].map(sp => {
          const dry = sp.level > 0 && ch.slots.some(n => n) && !ch.slots.some((n, i) => i + 1 >= sp.level && slotsLeft(ch, i + 1) > 0);
          return `<div class="sb-spell ${dry ? "dry" : ""}">
            <div class="sb-text"><b>${esc(sp.name)}</b>${chipsHTML(spellChips(sp))}</div>
            <button class="icon-btn" data-sb-edit="${esc(sp.id)}" title="Retocar este conjuro en esta ficha" aria-label="Retocar el conjuro">${icon("pencil", 15)}</button>
            <button class="icon-btn" data-sb-remove="${esc(sp.id)}" title="Quitar de la lista" aria-label="Quitar de la lista">${icon("close", 15)}</button>
            <button class="btn sm primary" data-sb-cast="${esc(sp.id)}" ${dry ? "disabled" : ""}>${withIcon("wand", "Lanzar", 15)}</button>
          </div>`;
        }).join("")}</div>`).join("") : `<div class="empty sb-empty"><span class="empty-ico">${icon("book", 28)}</span><h3>Sin conjuros todavía</h3><p>Añádelos de la biblioteca: ya saben qué hacen.</p></div>`}
    </div>`;
  };

  const body = el(`<div>${paint()}</div>`);
  const repaint = () => { body.innerHTML = paint(); };
  win = modal({
    title: "Conjuros de " + c.name, body, wide: true,
    actions: [
      { label: "Crear un conjuro", run: () => {
        openSpellEditor(normalizeSpell({ id: "propio-" + uid(), name: "Conjuro nuevo", level: 1, mode: "save", save: "dex", damage: "2d6", type: "fuego", time: "1 acción", range: "60 pies" }), {
          title: "Conjuro nuevo para " + c.name,
          onSave: sp => { const ch = fresh(); patchChar(ch.id, { spellbook: [...ch.spellbook, sp] }); setTimeout(repaint, 300); }
        });
        return false;
      } },
      { label: "Añadir de la biblioteca", run: () => { openLibrary(fresh(), () => setTimeout(repaint, 300), ctx); return false; } },
      { label: "Cerrar", tone: "primary" }
    ]
  });
  body.addEventListener("change", e => {
    const k = e.target.dataset.sb;
    if (!k) return;
    const ch = fresh();
    if (k === "ability") patchChar(ch.id, { castAbility: e.target.value });
    if (k === "dc") patchChar(ch.id, { spellDC: Math.max(0, +e.target.value || 0) });
    if (k === "atk") patchChar(ch.id, { spellAtk: Math.max(0, +e.target.value || 0) });
    setTimeout(repaint, 250);
  });
  /* Retocar el conjuro de esta ficha: la copia es suya, no cambia la biblioteca */
  on(body, "click", "[data-sb-edit]", (e, b) => {
    const ch = fresh();
    const sp = ch.spellbook.find(x => x.id === b.dataset.sbEdit);
    if (!sp) return;
    openSpellEditor(sp, {
      title: `${sp.name} · ${ch.name}`,
      note: "Cambia el conjuro solo en esta ficha. La biblioteca se queda como está.",
      onSave: next => { const cur = fresh(); patchChar(cur.id, { spellbook: cur.spellbook.map(x => x.id === sp.id ? next : x) }); setTimeout(repaint, 300); }
    });
  });
  on(body, "click", "[data-sb-remove]", (e, b) => {
    const ch = fresh();
    patchChar(ch.id, { spellbook: ch.spellbook.filter(x => x.id !== b.dataset.sbRemove) });
    setTimeout(repaint, 250);
  });
  on(body, "click", "[data-sb-cast]", (e, b) => {
    const ch = fresh();
    const sp = ch.spellbook.find(x => x.id === b.dataset.sbCast);
    if (!sp) return;
    win.close();
    openCast(ch, sp, ctx);
  });
}

/* ---------- La biblioteca ----------
   La de serie con los retoques del DM. Cualquiera añade de aquí a su ficha;
   solo el DM retoca, crea o restaura los de la biblioteca. */
/* ctx.onPick: en vez de guardarlos en la ficha, se los da a quien los pide
   (la hoja de personaje, que guarda todo junto al final) */
export function openLibrary(c, done, ctx = {}) {
  const known = new Set(c.spellbook.map(s => s.id));
  let query = "";
  const isDM = !!ctx.isDM;
  const all = () => libraryOf(store.doc);
  const list = () => all().filter(sp => !query || sp.name.toLowerCase().includes(query) || String(sp.level) === query || (sp.school || "").toLowerCase().includes(query));
  const body = el(`<div>
    <input type="search" id="libSearch" placeholder="Buscar conjuro, escuela o nivel (0 a 9)" aria-label="Buscar conjuro">
    <div class="lib-list" id="libList"></div>
  </div>`);
  const paintList = () => {
    body.querySelector("#libList").innerHTML = list().map(sp => `
      <div class="lib-row ${known.has(sp.id) ? "known" : ""}">
        <label class="lib-pick"><input type="checkbox" value="${sp.id}" ${known.has(sp.id) ? "checked disabled" : ""}>
        <span class="lv">${sp.level === 0 ? "T" : sp.level}</span>
        <span class="sb-text"><b>${esc(sp.name)}${sp.edited ? ' <i class="lib-tag">retocado</i>' : sp.custom ? ' <i class="lib-tag own">propio</i>' : ""}</b>${chipsHTML(spellChips(sp))}</span></label>
        ${isDM ? `<button type="button" class="icon-btn" data-lib-edit="${esc(sp.id)}" title="Retocar en la biblioteca" aria-label="Retocar en la biblioteca">${icon("pencil", 15)}</button>` : ""}
      </div>`).join("") || `<p class="prose small"><span>Nada con ese nombre.</span></p>`;
  };
  paintList();
  body.querySelector("#libSearch").addEventListener("input", e => { query = e.target.value.trim().toLowerCase(); paintList(); });
  on(body, "click", "[data-lib-edit]", (e, b) => {
    const sp = all().find(x => x.id === b.dataset.libEdit);
    if (sp) editLibrarySpell(sp, () => setTimeout(paintList, 300));
  });
  modal({
    title: "Biblioteca de conjuros", body, wide: true,
    actions: [
      ...(isDM ? [{ label: "Crear en la biblioteca", run: () => {
        editLibrarySpell(normalizeSpell({ id: "bib-" + uid(), name: "Conjuro nuevo", level: 1, mode: "save", save: "dex", damage: "2d6", type: "fuego", time: "1 acción", range: "60 pies" }), () => setTimeout(paintList, 300));
        return false;
      } }] : []),
      { label: "Cancelar" },
      { label: "Añadir", tone: "primary", run: host => {
        const ids = [...host.querySelectorAll("input[type=checkbox]:checked:not([disabled])")].map(i => i.value);
        if (!ids.length) return;
        const add = all().filter(sp => ids.includes(sp.id)).map(sp => normalizeSpell(sp));
        if (ctx.onPick) { ctx.onPick(add); done && done(); return; }
        patchChar(c.id, { spellbook: [...c.spellbook, ...add], castAbility: c.castAbility || guessAbility(c.className) });
        toast(add.length === 1 ? `${add[0].name} añadido` : `${add.length} conjuros añadidos`, "good");
        done && done();
      } }
    ]
  });
}

/* El DM retoca un conjuro de la biblioteca (o uno suyo) */
function editLibrarySpell(sp, done) {
  const builtin = isBuiltinSpell(sp.id);
  const holders = (store.doc.chars || []).filter(c => (c.spellbook || []).some(x => x.id === sp.id)).length;
  openSpellEditor(sp, {
    title: `${sp.name} · biblioteca`,
    note: builtin ? "Es uno de serie: tu versión sustituye a la de serie en esta partida. Puedes volver a la de serie cuando quieras." : "Es un conjuro tuyo de la biblioteca.",
    sync: holders,
    onSave: (next, { sync }) => { op("spellLib.set", { spell: next, sync }); toast(`«${next.name}» guardado en la biblioteca`, "good"); done && done(); },
    extra: sp.edited ? { label: "Restaurar el de serie", run: async () => {
      if (!(await confirmBox(`¿Volver a «${builtinSpell(sp.id).name}» tal como viene de serie?${holders ? ` Las ${holders} fichas que lo tienen también vuelven a la de serie.` : ""}`, { okLabel: "Restaurar" }))) return;
      op("spellLib.remove", { id: sp.id, sync: true, restore: builtinSpell(sp.id) });
      toast("Restaurado el de serie", "good"); done && done();
    } } : sp.custom ? { label: "Quitar de la biblioteca", run: async () => {
      if (!(await confirmBox(`¿Quitar «${sp.name}» de la biblioteca? Las fichas que ya lo tienen lo conservan.`))) return;
      op("spellLib.remove", { id: sp.id }); done && done();
    } } : null
  });
}

/* ---------- Editor de un conjuro ----------
   Todo lo que hace un conjuro, como en el editor de ataques: nombre, nivel,
   tiempo, alcance, cómo se resuelve (ataque, salvación, dardos, cura, sueño o
   nada), daño y tipo, cuánto sube con espacios mayores, estado que pone,
   objetivos y área. Solo se ven los campos que usa el modo elegido. */
const MODE_NAMES = [["attack", "Tirada de ataque"], ["save", "Salvación"], ["auto", "Impacta siempre (dardos)"], ["heal", "Cura"], ["sleep", "Sueño (reserva de vida)"], ["none", "Sin tirada (solo efecto)"]];
const SAVE_NAMES = [["str", "Fuerza"], ["dex", "Destreza"], ["con", "Constitución"], ["int", "Inteligencia"], ["wis", "Sabiduría"], ["cha", "Carisma"]];
export function openSpellEditor(sp, { title, note = "", onSave, sync = 0, extra = null } = {}) {
  const f = (label, html, show = "") => `<label class="field"${show ? ` data-show="${show}"` : ""}><span>${label}</span>${html}</label>`;
  const inp = (k, v, attrs = "") => `<input name="${k}" value="${esc(v ?? "")}" ${attrs}>`;
  const num = (k, v, min = 0, max = 99, step = 1) => `<input name="${k}" type="number" min="${min}" max="${max}" step="${step}" value="${v}">`;
  const chk = (k, v, label, show = "") => `<label class="check"${show ? ` data-show="${show}"` : ""}><input type="checkbox" name="${k}" ${v ? "checked" : ""}> ${label}</label>`;
  const sel = (k, v, opts) => `<select name="${k}">${opts.map(([a, b]) => `<option value="${a}" ${String(a) === String(v) ? "selected" : ""}>${esc(b)}</option>`).join("")}</select>`;
  const body = el(`<div class="spell-editor">
    ${note ? `<p class="prose small"><span>${esc(note)}</span></p>` : ""}
    <div class="cols2">
      ${f("Nombre", inp("name", sp.name, 'maxlength="48"'))}
      ${f("Nivel", sel("level", sp.level, [[0, "Truco"], ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => [n, "Nivel " + n])]))}
      ${f("Escuela", inp("school", sp.school, 'placeholder="Evocación"'))}
      ${f("Tiempo", inp("time", sp.time, 'placeholder="Acción"'))}
      ${f("Alcance", inp("range", sp.range, 'placeholder="120 pies"'))}
      ${f("Duración", inp("duration", sp.duration, 'placeholder="Concentración, hasta 1 minuto"'))}
      ${f("Componentes", inp("components", sp.components, 'placeholder="V, S, M (un pellizco de azufre)" maxlength="100"'))}
    </div>
    ${chk("conc", sp.conc, "Necesita concentración")}
    ${chk("summon", sp.summon, "Crea o invoca algo que se queda en el tablero")}
    ${f("Descripción", `<textarea name="desc" rows="4" maxlength="900">${esc(sp.desc)}</textarea>`)}
    <h4 class="menu-sec">Cómo se resuelve</h4>
    <div class="cols2">
      ${f("Modo", sel("mode", sp.mode, MODE_NAMES))}
      ${f("Salvación de", sel("save", sp.save || "dex", SAVE_NAMES), "save")}
      ${f("Daño (o reserva de sueño)", inp("damage", sp.damage, 'placeholder="8d6"'), "attack save auto sleep")}
      ${f("Tipo de daño", inp("type", sp.type, 'placeholder="fuego"'), "attack save auto")}
      ${f("Cura", inp("heal", sp.heal, 'placeholder="1d8"'), "heal")}
      ${f("Dados de más por cada espacio mayor", inp("upcast", sp.upcast, 'placeholder="1d6"'), "attack save auto heal sleep")}
      ${f("Rayos (ataques)", num("rays", sp.rays, 1, 10), "attack")}
      ${f("Rayos de más por espacio", num("raysUp", sp.raysUp, 0, 3), "attack")}
      ${f("Dardos", num("darts", sp.darts, 0, 12), "auto")}
    </div>
    ${chk("half", sp.half, "La mitad de daño si supera la salvación", "save")}
    ${chk("melee", sp.melee, "Ataque cuerpo a cuerpo", "attack")}
    ${chk("scale", sp.scale, "Truco que sube de daño con el nivel (5, 11 y 17)", "attack save auto")}
    ${chk("scaleRays", sp.scaleRays, "Truco que suma rayos con el nivel (como Descarga sobrenatural)", "attack")}
    ${chk("healMod", sp.healMod, "Suma la característica de lanzamiento a la cura", "heal")}
    ${chk("dmgMod", sp.dmgMod, "Suma la característica de lanzamiento al daño (como Arma espiritual)", "attack save")}
    <div class="cols2">
      ${f("Estado que pone", sel("cond", sp.cond, [["", "Ninguno"], ...CONDITIONS.map(x => [x.id, x.name])]), "attack save none")}
      ${f("Rondas que dura el estado (0: hasta quitarlo)", num("condRounds", sp.condRounds, 0, 1000), "attack save none sleep")}
      ${f("Si falla, además", inp("failText", sp.failText, 'placeholder="queda derribado"'), "save")}
      ${f("Objetivos", num("targets", sp.targets, 1, 20))}
      ${f("Objetivos de más por espacio", num("targetsUp", sp.targetsUp, 0, 3))}
    </div>
    <h4 class="menu-sec">Área</h4>
    <div class="cols2">
      ${f("Forma", sel("shape", sp.shape, SHAPE_NAMES))}
      ${f("Tamaño (pies)", num("size", sp.size, 0, 300, 5))}
      ${f("Ancho (pies)", num("width", sp.width, 1, 60, 5))}
    </div>
    ${sync ? `<label class="check"><input type="checkbox" name="sync" checked> Cambiarlo también en las ${sync} fichas que ya lo tienen</label>` : ""}
  </div>`);
  const showFor = () => {
    const mode = body.querySelector('[name="mode"]').value;
    body.querySelectorAll("[data-show]").forEach(n => n.classList.toggle("hidden", !n.dataset.show.split(" ").includes(mode)));
  };
  body.querySelector('[name="mode"]').addEventListener("change", showFor);
  showFor();
  modal({
    title: title || sp.name, body, wide: true,
    actions: [
      ...(extra ? [{ label: extra.label, tone: "danger", run: () => { extra.run(); } }] : []),
      { label: "Cancelar" },
      { label: "Guardar", tone: "primary", run: host => {
        const v = k => host.querySelector(`[name="${k}"]`);
        const val = k => v(k) ? (v(k).type === "checkbox" ? v(k).checked : v(k).type === "number" || k === "level" ? +v(k).value : v(k).value.trim()) : sp[k];
        const keys = ["name", "level", "school", "time", "range", "duration", "components", "conc", "summon", "dmgMod", "desc", "mode", "save", "half", "damage", "type", "upcast", "scale", "scaleRays", "rays", "raysUp", "darts", "heal", "healMod", "cond", "condRounds", "failText", "targets", "targetsUp", "shape", "size", "width", "melee"];
        const next = normalizeSpell({ ...sp, ...Object.fromEntries(keys.map(k => [k, val(k)])), id: sp.id });
        if (!next.name.trim()) { toast("Ponle un nombre", "bad"); return false; }
        if (next.mode === "save" && !next.save) next.save = "dex";
        onSave && onSave(next, { sync: !!(v("sync") && v("sync").checked) });
      } }
    ]
  });
}

/* ---------- Lanzar ---------- */
export function openCast(c, sp, ctx = {}) {
  const st = castStats(c);
  const hasSlots = c.slots.some(n => n);
  const levels = sp.level === 0 ? [] : [1, 2, 3, 4, 5, 6, 7, 8, 9]
    .filter(l => l >= sp.level && (!hasSlots || slotsLeft(c, l) > 0) && (!hasSlots || c.slots[l - 1] > 0));
  if (sp.level > 0 && hasSlots && !levels.length) return toast(`No te quedan espacios de nivel ${sp.level} o más`, "bad");
  const targets = (ctx.targets ? ctx.targets() : []).filter(t => t.mx !== null || t.kind === "pc");
  const pre = new Set([...(ctx.preselect ? ctx.preselect(sp) : [])]);
  const maxFor = lvl => sp.targets + sp.targetsUp * Math.max(0, lvl - sp.level);
  const needsTarget = sp.mode !== "none";

  const body = el(`<div class="cast">
    ${chipsHTML(spellChips(sp), "cast-chips")}
    <p class="cast-what">${esc(spellTags(sp))}${sp.mode === "save" ? ` · CD ${st.dc}` : sp.mode === "attack" ? ` · ${st.atk >= 0 ? "+" : ""}${st.atk} al ataque` : ""}</p>
    ${sp.desc ? `<p class="prose small"><span>${rollable(sp.desc, `${c.name} · ${sp.name}`)}</span></p>` : ""}
    ${levels.length ? `<label class="field"><span>Espacio</span><select id="castSlot">${levels.map(l =>
      `<option value="${l}">Nivel ${l}${hasSlots ? ` · quedan ${slotsLeft(c, l)}` : ""}${l > sp.level ? " · potenciado" : ""}</option>`).join("")}</select></label>` : ""}
    ${sp.mode === "attack" ? `<div class="adv cast-adv">
      <button type="button" data-m="dis" aria-pressed="false">Desventaja</button>
      <button type="button" data-m="normal" aria-pressed="true">Normal</button>
      <button type="button" data-m="adv" aria-pressed="false">Ventaja</button></div>` : ""}
    ${needsTarget || targets.length ? `<div class="cast-targets-head"><span class="field-label">Objetivos <i id="castMax"></i></span>
      ${sp.shape && ctx.previewArea ? `<button type="button" class="btn sm" id="castArea">${withIcon("target", "Colocar el área en el mapa", 15)}</button>` : ""}</div>
    <div class="cast-targets">${targets.map(t => `<label class="pick-row"><input type="checkbox" value="${t.id}" ${pre.has(t.id) ? "checked" : ""}>
      <span class="avatar sm" style="--tone:${esc(t.color)}">${esc((t.name || "?").slice(0, 2).toUpperCase())}</span>
      <span><b>${esc(t.name)}</b><small>${t.kind === "pc" ? "personaje" : "criatura"}</small></span></label>`).join("") || `<p class="prose small"><span>No hay nadie a la vista en el mapa.</span></p>`}</div>` : ""}
    ${ctx.isDM ? `<label class="check" style="margin-top:10px"><input type="checkbox" id="castSecret"> En secreto</label>` : ""}
  </div>`);
  let mode = "normal";
  const slotSel = body.querySelector("#castSlot");
  const paintMax = () => {
    const m = body.querySelector("#castMax");
    if (m) m.textContent = sp.targets >= 20 ? "(los del área)" : `(hasta ${maxFor(slotSel ? +slotSel.value : sp.level)})`;
  };
  paintMax();
  slotSel && slotSel.addEventListener("change", paintMax);
  on(body, "click", "[data-m]", (e, b) => {
    mode = b.dataset.m;
    body.querySelectorAll("[data-m]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  });
  /* Los objetivos marcados se ven en el mapa mientras se decide */
  const secretNow = () => !!(body.querySelector("#castSecret") && body.querySelector("#castSecret").checked) || !!ctx.secret;
  const aimNow = () => aimAt(c.id, [...body.querySelectorAll(".cast-targets input:checked")].map(i => i.value), { secret: secretNow() });
  body.addEventListener("change", e => { if (e.target.matches(".cast-targets input, #castSecret")) aimNow(); });
  const win = modal({
    title: `${sp.name}${sp.level ? " · nivel " + sp.level : " · truco"}`, body, onClose: () => aimAt(c.id, ""),
    actions: [
      { label: "Cancelar" },
      { label: "Lanzar", tone: "primary", run: host => {
        const ids = [...host.querySelectorAll(".cast-targets input:checked")].map(i => i.value);
        const slot = slotSel ? +slotSel.value : sp.level;
        if (needsTarget && !ids.length) { toast("Elige al menos un objetivo", "bad"); return false; }
        const max = maxFor(slot);
        if (ids.length > max) { toast(`Este conjuro llega a ${max} objetivo${max > 1 ? "s" : ""}`, "bad"); return false; }
        op("spell.cast", { casterId: c.id, spellId: sp.id, slot, targets: ids, mode: keyMods().mode || mode,
          secret: !!(host.querySelector("#castSecret") && host.querySelector("#castSecret").checked) });
      } }
    ]
  });
  aimNow();
  const area = body.querySelector("#castArea");
  if (area) area.addEventListener("click", () => { win.close(); ctx.previewArea(sp, () => openCast(ctx.getChar ? ctx.getChar(c.id) : c, sp, ctx)); });
}
