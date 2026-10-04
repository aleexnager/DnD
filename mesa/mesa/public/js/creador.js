/* Creador de personajes paso a paso, como el de D&D Beyond: clase, especie,
   características, trasfondo, conjuros, equipo y ficha. Cada paso explica qué
   falta antes de dejar seguir, y al final la ficha sale completa: vida, CA,
   ataques, equipo, rasgos y conjuros de nivel 1. Las reglas y las cuentas
   viven en creador-datos.js; aquí solo se elige. */

import { esc, toast, shrinkImage, imgURL, initials, confirmBox, el } from "./util.js";
import { SKILLS, normalizeChar, modOf, uid } from "./schema.js";
import { op, uploadImage } from "./net.js";
import { icon, withIcon } from "./icons.js";
import { spellTags } from "./spellbook.js";
import { SPELL_LIBRARY } from "./spells.js";
import { CLASSES, SPECIES, BACKGROUNDS, STANDARD_ARRAY, POINT_COST, POINTS, ALIGNMENTS, ARMOR, WEAPONS,
  ABIL_KEYS, finalScores, armorClass, buildCharacter } from "./creador-datos.js";

const ABIL = { str: "Fuerza", dex: "Destreza", con: "Constitución", int: "Inteligencia", wis: "Sabiduría", cha: "Carisma" };
const ABBR = { str: "FUE", dex: "DES", con: "CON", int: "INT", wis: "SAB", cha: "CAR" };
const skillName = id => (SKILLS.find(s => s[0] === id) || [id, id])[1];
const sign = n => (n >= 0 ? "+" : "") + n;
const listJoin = l => l.length > 1 ? l.slice(0, -1).join(", ") + " y " + l[l.length - 1] : l.join("");
const STEP_NAMES = { clase: "Clase", especie: "Especie", caracteristicas: "Características", trasfondo: "Trasfondo", conjuros: "Conjuros", equipo: "Equipo", ficha: "Ficha" };
const METHODS = [["estandar", "Serie estándar"], ["puntos", "Compra de puntos"], ["dados", "Tirar dados"], ["mano", "A mano"]];
/* La silueta va de máscara sobre un color vivo. La ruta, absoluta: dentro de una
   variable CSS, una relativa se resolvería desde la hoja de estilos */
const glyph = id => `<span class="bd-art"><span class="bd-glyph" style="--glyph:url('${new URL(`art/creador/${id}.svg`, location.href).href}')"></span></span>`;

export function openBuilder({ onManual } = {}) {
  const st = {
    step: "clase", seen: new Set(["clase"]),
    classId: "", classSkills: [], speciesId: "", free: [], extraSkills: [],
    method: "estandar", assign: {}, points: Object.fromEntries(ABIL_KEYS.map(k => [k, 8])), rolls: [], manual: Object.fromEntries(ABIL_KEYS.map(k => [k, 10])),
    bgId: "", bgSkills: [], spells: [], spellsFor: "",
    name: "", alignment: "", color: "", avatarId: "", player: ""
  };
  const cls = () => CLASSES.find(c => c.id === st.classId);
  const sp = () => SPECIES.find(s => s.id === st.speciesId);
  const bg = () => BACKGROUNDS.find(b => b.id === st.bgId);
  /* Lo que ya da la clase o la especie; si el trasfondo repite alguna, se
     elige otra a cambio, como manda el reglamento */
  const owned = () => [...st.classSkills, ...st.extraSkills, ...((sp() && sp().skills) || [])];
  const repeated = () => {
    const b = bg(), spSkills = (sp() && sp().skills) || [];
    return [...spSkills.filter(k => st.classSkills.includes(k)), ...(b ? b.skills.filter(k => owned().includes(k)) : [])];
  };
  const bgPicks = () => { const b = bg(); return b ? (b.free || 0) + repeated().length : 0; };
  const steps = () => ["clase", "especie", "caracteristicas", "trasfondo", ...(cls() && cls().caster ? ["conjuros"] : []), "equipo", "ficha"];

  /* Puntuaciones base según el método elegido */
  const base = () => {
    if (st.method === "puntos") return { ...st.points };
    if (st.method === "mano") return { ...st.manual };
    const pool = st.method === "dados" ? st.rolls : STANDARD_ARRAY;
    return Object.fromEntries(ABIL_KEYS.map(k => [k, st.assign[k] !== undefined ? pool[st.assign[k]] : undefined]));
  };
  const spent = () => ABIL_KEYS.reduce((s, k) => s + POINT_COST[st.points[k]], 0);
  const choice = () => ({ name: st.name, classId: st.classId, speciesId: st.speciesId, bgId: st.bgId, base: base(), free: st.free,
    skills: [...st.classSkills, ...st.bgSkills, ...st.extraSkills], spells: st.spells, alignment: st.alignment,
    color: st.color, avatarId: st.avatarId, player: st.player });

  /* Qué falta en cada paso (vacío: se puede seguir) */
  const missing = step => {
    const c = cls(), s = sp();
    if (step === "clase") {
      if (!c) return "Elige una clase";
      if (st.classSkills.length < c.choose) return `Elige ${c.choose - st.classSkills.length} habilidad${c.choose - st.classSkills.length > 1 ? "es" : ""} más de tu clase`;
    }
    if (step === "especie") {
      if (!s) return "Elige una especie";
      if (s.freeBonus && st.free.length < s.freeBonus) return `Elige ${s.freeBonus - st.free.length} característica${s.freeBonus - st.free.length > 1 ? "s" : ""} más para subir +1`;
      if (s.extraSkills && st.extraSkills.length < s.extraSkills) return `Elige ${s.extraSkills - st.extraSkills.length} habilidad${s.extraSkills - st.extraSkills.length > 1 ? "es" : ""} más de tu especie`;
    }
    if (step === "caracteristicas") {
      const b = base();
      if (st.method === "dados" && st.rolls.length < 6) return "Tira los dados para tener tus seis puntuaciones";
      if (st.method === "puntos" && spent() > POINTS) return `Te has pasado: ${spent()} de ${POINTS} puntos`;
      if (ABIL_KEYS.some(k => b[k] === undefined)) return "Asigna una puntuación a cada característica";
      if (st.method === "mano" && ABIL_KEYS.some(k => b[k] < 3 || b[k] > 18)) return "A mano, cada puntuación va de 3 a 18";
    }
    if (step === "trasfondo") {
      if (!bg()) return "Elige un trasfondo";
      const n = bgPicks() - st.bgSkills.length;
      if (n > 0) return `Elige ${n} habilidad${n > 1 ? "es" : ""} más de tu trasfondo`;
    }
    if (step === "conjuros" && c && c.pick && st.spells.length < 1) return "Elige al menos un conjuro";
    if (step === "ficha" && !st.name.trim()) return "Ponle nombre a tu personaje";
    return "";
  };

  /* ---------- Pasos ---------- */
  const skillChips = (list, chosen, max, attr, locked = []) => `<div class="bd-chips">${list.map(id => {
    const on = chosen.includes(id), lock = locked.includes(id);
    return `<button type="button" class="bd-chip ${on || lock ? "on" : ""}" data-${attr}="${id}" aria-pressed="${on || lock}" ${lock || (!on && chosen.length >= max) ? "disabled" : ""}
      title="${lock ? "Ya la tienes por otro lado" : ""}">${esc(skillName(id))}</button>`;
  }).join("")}</div>`;

  const cards = (list, picked, attr) => `<div class="bd-cards">${list.map(x => `
    <button type="button" class="bd-card" data-${attr}="${x.id}" aria-pressed="${x.id === picked}" style="--tone:${x.tone}">
      ${glyph(x.id)}
      <span class="bd-card-text"><b>${esc(x.name)}</b><small>${esc(x.pitch)}</small></span>
    </button>`).join("")}</div>`;

  const hero = (x, sub) => `<div class="bd-hero" style="--tone:${x.tone}">${glyph(x.id)}
      <div><h3>${esc(x.name)}</h3><p>${esc(x.pitch)}</p>${sub ? `<p class="bd-hero-sub">${sub}</p>` : ""}</div></div>`;
  const facts = rows => `<dl class="bd-facts">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
  const traitList = list => `<ul class="bd-traits">${list.map(([n, t]) => `<li><b>${esc(n)}</b><span>${esc(t)}</span></li>`).join("")}</ul>`;

  const views = {
    clase() {
      const c = cls();
      return `<div class="bd-split">
        ${cards(CLASSES, st.classId, "class")}
        <aside class="bd-detail">${c ? `
          ${hero(c)}
          ${facts([["Dado de golpe", "d" + c.die], ["Característica principal", c.primary.map(k => ABIL[k]).join(" o ")],
            ["Salvaciones", c.saves.map(k => ABIL[k]).join(" y ")], ["Armaduras", esc(c.armor)]])}
          <h4 class="bd-sub">Rasgos de nivel 1</h4>${traitList(c.features)}
          <h4 class="bd-sub">Habilidades · elige ${c.choose} <span class="bd-count">${st.classSkills.length}/${c.choose}</span></h4>
          ${skillChips(c.from, st.classSkills, c.choose, "cskill")}`
          : `<div class="bd-empty">${icon("user", 28)}<p>Elige una clase para ver qué la hace especial.</p></div>`}
        </aside></div>`;
    },
    especie() {
      const s = sp();
      const bonus = s ? Object.entries(s.bonus).map(([k, v]) => `${ABBR[k]} +${v}`).join(", ") + (s.freeBonus ? `, y +1 a ${s.freeBonus} más` : "") : "";
      return `<div class="bd-split">
        ${cards(SPECIES, st.speciesId, "species")}
        <aside class="bd-detail">${s ? `
          ${hero(s)}
          ${facts([["Mejora de características", bonus], ["Velocidad", s.speed + " pies"], ["Tamaño", s.size], ["Visión en la oscuridad", s.vision ? "60 pies" : "No"]])}
          <h4 class="bd-sub">Rasgos</h4>${traitList(s.traits)}
          ${s.freeBonus ? `<h4 class="bd-sub">+1 a dos características <span class="bd-count">${st.free.length}/${s.freeBonus}</span></h4>
            <div class="bd-chips">${ABIL_KEYS.filter(k => !s.bonus[k]).map(k => `<button type="button" class="bd-chip ${st.free.includes(k) ? "on" : ""}" data-free="${k}"
              aria-pressed="${st.free.includes(k)}" ${!st.free.includes(k) && st.free.length >= s.freeBonus ? "disabled" : ""}>${ABIL[k]}</button>`).join("")}</div>` : ""}
          ${s.extraSkills ? `<h4 class="bd-sub">Dos habilidades más <span class="bd-count">${st.extraSkills.length}/${s.extraSkills}</span></h4>
            ${skillChips(SKILLS.map(x => x[0]), st.extraSkills, s.extraSkills, "xskill", st.classSkills)}` : ""}`
          : `<div class="bd-empty">${icon("users", 28)}<p>Elige una especie para ver sus rasgos.</p></div>`}
        </aside></div>`;
    },
    caracteristicas() {
      const b = base(), fin = finalScores(choice()), s = sp(), c = cls();
      const pool = st.method === "dados" ? st.rolls : STANDARD_ARRAY;
      const used = Object.values(st.assign);
      const box = k => {
        const bonus = ((s && s.bonus[k]) || 0) + (st.free.includes(k) ? 1 : 0);
        let input = "";
        if (st.method === "estandar" || st.method === "dados") {
          input = `<select data-assign="${k}" aria-label="${ABIL[k]}"><option value="">—</option>${pool.map((v, i) =>
            `<option value="${i}" ${st.assign[k] === i ? "selected" : ""} ${used.includes(i) && st.assign[k] !== i ? "disabled" : ""}>${v}</option>`).join("")}</select>`;
        } else if (st.method === "puntos") {
          input = `<div class="bd-stepper"><button type="button" data-pt="${k}" data-d="-1" aria-label="Bajar" ${st.points[k] <= 8 ? "disabled" : ""}>−</button>
            <b class="tnum">${st.points[k]}</b><button type="button" data-pt="${k}" data-d="1" aria-label="Subir" ${st.points[k] >= 15 ? "disabled" : ""}>+</button></div>`;
        } else {
          input = `<input type="number" min="3" max="18" data-manual="${k}" value="${st.manual[k]}" aria-label="${ABIL[k]}">`;
        }
        const ready = b[k] !== undefined;
        return `<div class="bd-abil ${c && c.primary.includes(k) ? "primary" : ""}">
          <span class="bd-abil-name">${ABIL[k]}</span>
          ${input}
          <span class="bd-abil-bonus">${bonus ? `${ABBR[k]} +${bonus} por especie` : "Sin bonificador"}</span>
          <span class="bd-abil-total"><b class="tnum">${ready ? fin[k] : "—"}</b><small class="tnum">${ready ? sign(modOf(fin[k])) : ""}</small></span>
        </div>`;
      };
      return `<div class="bd-col">
        <div class="bd-methods" role="group" aria-label="Cómo se reparten">${METHODS.map(([k, l]) =>
          `<button type="button" data-method="${k}" aria-pressed="${st.method === k}">${l}</button>`).join("")}</div>
        <p class="bd-note">${{
          estandar: "Reparte 15, 14, 13, 12, 10 y 8 entre las seis características.",
          puntos: `Cada característica empieza en 8 y sube hasta 15. Gastas <b class="tnum">${spent()}</b> de ${POINTS} puntos.`,
          dados: "Se tiran 4d6 seis veces y se quita el dado más bajo de cada tirada. Luego repartes los resultados.",
          mano: "Escribe las puntuaciones que ya tengas, de 3 a 18."
        }[st.method]}${c ? ` Para ${esc(c.name.toLowerCase())}, lo más importante es ${c.primary.map(k => ABIL[k]).join(" o ")} (marcada).` : ""}</p>
        ${st.method === "dados" ? `<div class="bd-rolls"><button type="button" class="btn sm" data-roll>${withIcon("dice", st.rolls.length ? "Volver a tirar" : "Tirar los dados", 15)}</button>
          ${st.rolls.map(v => `<span class="bd-roll tnum">${v}</span>`).join("")}</div>` : ""}
        <div class="bd-abils">${ABIL_KEYS.map(box).join("")}</div>
      </div>`;
    },
    trasfondo() {
      const b = bg(), mine = owned(), picks = bgPicks();
      const dup = repeated();
      const all = [...new Set([...mine, ...(b ? b.skills : []), ...st.bgSkills])];
      return `<div class="bd-col">
        <div class="bd-bgs">${BACKGROUNDS.map(x => `<button type="button" class="bd-bg" data-bg="${x.id}" aria-pressed="${x.id === st.bgId}">
          <b>${esc(x.name)}</b><small>${esc(x.pitch)}</small>
          ${x.skills.length ? `<span class="bd-bg-skills">${x.skills.map(skillName).map(esc).join(" · ")}</span>` : ""}</button>`).join("")}</div>
        ${dup.length ? `<p class="bd-note">${icon("info", 14)} ${listJoin(dup.map(skillName).map(esc))} ya ${dup.length > 1 ? "las tenías" : "la tenías"}: elige ${dup.length > 1 ? "otras" : "otra"} a cambio.</p>` : ""}
        ${picks ? `<h4 class="bd-sub">${b.free ? "Habilidades de tu trasfondo" : "Habilidades a cambio"} <span class="bd-count">${st.bgSkills.length}/${picks}</span></h4>
          ${skillChips(SKILLS.map(x => x[0]), st.bgSkills, picks, "bskill", [...mine, ...b.skills])}` : ""}
        <h4 class="bd-sub">Tus habilidades</h4>
        <div class="bd-chips">${all.length ? all.map(k => `<span class="bd-chip on static">${esc(skillName(k))}</span>`).join("") : '<span class="bd-note">Todavía ninguna.</span>'}</div>
      </div>`;
    },
    conjuros() {
      const c = cls();
      const list = c.spells.map(id => SPELL_LIBRARY.find(s => s.id === id)).filter(Boolean);
      return `<div class="bd-col">
        <p class="bd-note">Elige hasta <b>${c.pick}</b> conjuros para empezar. Luego puedes cambiarlos desde «Conjuros» en la ficha.
          <span class="bd-count">${st.spells.length}/${c.pick}</span></p>
        <div class="bd-spells">${list.map(s => {
          const on = st.spells.includes(s.id);
          return `<button type="button" class="bd-spell ${on ? "on" : ""}" data-spell="${s.id}" aria-pressed="${on}" ${!on && st.spells.length >= c.pick ? "disabled" : ""}>
            <span class="bd-spell-lv">${s.level ? s.level + "º" : "T"}</span>
            <span class="bd-spell-text"><b>${esc(s.name)}</b><small>${esc(spellTags(s) || s.desc)}</small></span>
            <span class="bd-check">${on ? icon("check", 16) : ""}</span></button>`;
        }).join("")}</div>
      </div>`;
    },
    equipo() {
      const c = cls(), sc = finalScores(choice()), ch = buildCharacter(choice());
      const armor = ARMOR[c.kit.armor];
      const shield = c.kit.items.some(([n, , , eq]) => eq && /escudo/i.test(n));
      const how = c.kit.armor === "ninguna"
        ? (c.unarmored === "con" ? "10 + DES + CON, sin armadura" : c.unarmored === "wis" ? "10 + DES + SAB, sin armadura"
          : c.unarmored === "draconic" ? "13 + DES, por tu linaje" : "10 + DES, sin armadura")
        : `${armor.name.toLowerCase()} ${armor.base}${armor.dex === 0 ? "" : armor.dex ? " + DES (máx. 2)" : " + DES"}${c.acBonus ? " + 1 por Defensa" : ""}`;
      return `<div class="bd-col">
        <div class="bd-statline">
          <span class="bd-stat"><small>Clase de armadura</small><b class="tnum">${armorClass(c, sc)}</b></span>
          <span class="bd-stat"><small>Puntos de golpe</small><b class="tnum">${ch.hp}</b></span>
          <span class="bd-stat"><small>Velocidad</small><b class="tnum">${ch.speed}</b></span>
        </div>
        <p class="bd-note">CA: ${how}${shield ? " + 2 del escudo" : ""}.</p>
        <h4 class="bd-sub">Ataques</h4>
        <div class="bd-table">${ch.attacks.map(a => `<div><b>${esc(a.name)}</b><span>${esc(a.range)}</span><span class="tnum">${sign(a.atk)}</span><span class="tnum">${esc(a.damage)} ${esc(a.type)}</span></div>`).join("")}</div>
        <h4 class="bd-sub">Equipo</h4>
        <div class="bd-chips">${ch.items.map(i => `<span class="bd-chip static ${i.equipped ? "on" : ""}">${i.qty > 1 ? i.qty + " × " : ""}${esc(i.name)}</span>`).join("")}</div>
      </div>`;
    },
    ficha() {
      const ch = buildCharacter(choice()), c = cls(), s = sp();
      const color = st.color || c.tone;
      return `<div class="bd-split final">
        <div class="bd-col">
          <label class="field"><span>Nombre</span><input data-f="name" value="${esc(st.name)}" placeholder="Cómo se llama tu personaje" maxlength="40"></label>
          <div class="cols2">
            <label class="field"><span>Alineamiento</span><select data-f="alignment"><option value="">—</option>${ALIGNMENTS.map(a =>
              `<option ${a === st.alignment ? "selected" : ""}>${a}</option>`).join("")}</select></label>
            <label class="field"><span>Jugador</span><input data-f="player" value="${esc(st.player)}" placeholder="Quién lo lleva"></label>
          </div>
          <div class="bd-look">
            <label class="field"><span>Color de la ficha</span><input type="color" data-f="color" value="${esc(color)}"></label>
            <div class="field"><span>Retrato</span><button type="button" class="btn sm" data-portrait>${withIcon("image", st.avatarId ? "Cambiar retrato" : "Subir un retrato", 15)}</button>
              <input type="file" accept="image/*" hidden data-portrait-file></div>
          </div>
        </div>
        <aside class="bd-summary" style="--tone:${esc(color)}">
          <div class="bd-sum-head">
            ${st.avatarId ? `<img class="avatar" src="${imgURL(st.avatarId)}" alt="">` : `<span class="avatar" style="--tone:${esc(color)}">${initials(st.name || "?")}</span>`}
            <div><b>${esc(st.name || "Sin nombre")}</b><small>${esc(c.name)} · ${esc(s.name)} · nivel 1</small></div>
          </div>
          <div class="bd-statline">
            <span class="bd-stat"><small>PG</small><b class="tnum">${ch.hp}</b></span>
            <span class="bd-stat"><small>CA</small><b class="tnum">${ch.ac}</b></span>
            <span class="bd-stat"><small>Velocidad</small><b class="tnum">${ch.speed}</b></span>
          </div>
          <div class="bd-mini-abils">${ABIL_KEYS.map(k => `<span><small>${ABBR[k]}</small><b class="tnum">${sign(modOf(ch[k]))}</b><i class="tnum">${ch[k]}</i></span>`).join("")}</div>
          <p class="bd-note">${ch.skills.map(skillName).map(esc).join(", ")}</p>
        </aside>
      </div>`;
    }
  };

  /* ---------- La ventana ---------- */
  const back = el(`<div class="builder-back"><div class="builder" role="dialog" aria-modal="true" aria-label="Crear personaje">
    <header class="bd-head"><h2>${icon("userPlus", 20)}<span>Crear personaje</span></h2><nav class="bd-steps" aria-label="Pasos"></nav>
      <button type="button" class="icon-btn" data-close aria-label="Cerrar" title="Cerrar">${icon("close")}</button></header>
    <div class="bd-body"></div>
    <footer class="bd-foot"><button type="button" class="btn" data-prev>${withIcon("prev", "Atrás", 15)}</button>
      <span class="bd-why" role="status"></span>
      <button type="button" class="btn sm ghost bd-manual" data-manual>Rellenar la ficha a mano</button>
      <button type="button" class="btn primary" data-next></button></footer>
  </div></div>`);
  document.body.appendChild(back);
  const body = back.querySelector(".bd-body");

  const paint = (keepScroll = false) => {
    const list = steps();
    if (!list.includes(st.step)) st.step = list[list.length - 1];
    const at = list.indexOf(st.step);
    back.querySelector(".bd-steps").innerHTML = list.map((k, i) => {
      const done = i < at || (st.seen.has(k) && !missing(k) && k !== st.step);
      return `<button type="button" class="bd-step ${k === st.step ? "now" : ""} ${done ? "done" : ""}" data-go="${k}" ${st.seen.has(k) ? "" : "disabled"}
        aria-current="${k === st.step ? "step" : "false"}"><i>${done ? icon("check", 12) : i + 1}</i><span>${STEP_NAMES[k]}</span></button>`;
    }).join("");
    /* Solo se anima al cambiar de paso: al elegir dentro del mismo, el
       contenido se queda quieto en vez de parpadear a cada clic */
    const y = body.scrollTop, fresh = body.dataset.step !== st.step;
    body.dataset.step = st.step;
    body.innerHTML = `<div class="bd-step-body ${fresh ? "view-in" : ""}">${views[st.step]()}</div>`;
    if (keepScroll) body.scrollTop = y;
    const why = missing(st.step);
    back.querySelector(".bd-why").textContent = why;
    const next = back.querySelector("[data-next]");
    next.innerHTML = at === list.length - 1 ? withIcon("check", "Crear personaje", 16) : withIcon("next", "Siguiente", 16);
    next.disabled = !!why;
    back.querySelector("[data-prev]").disabled = at === 0;
    back.querySelector("[data-manual]").classList.toggle("hidden", at !== 0 || !onManual);
  };
  const go = k => { st.step = k; st.seen.add(k); paint(); body.scrollTop = 0; };

  const close = () => { document.removeEventListener("keydown", onKey); back.remove(); };
  const askClose = async () => { if (!st.classId || await confirmBox("¿Salir sin crear el personaje? Se pierde lo elegido.")) close(); };
  const onKey = e => { if (e.key === "Escape" && !document.querySelector(".modal-back")) askClose(); };
  document.addEventListener("keydown", onKey);

  const toggle = (arr, id, max) => arr.includes(id) ? arr.filter(x => x !== id) : arr.length < max ? [...arr, id] : arr;

  back.addEventListener("click", async e => {
    const t = e.target.closest("button, [data-close]");
    if (!t || t.disabled) return;
    const d = t.dataset;
    if ("close" in d) return askClose();
    if (d.go) return go(d.go);
    if ("prev" in d) { const l = steps(); return go(l[Math.max(0, l.indexOf(st.step) - 1)]); }
    if ("manual" in d) { close(); return onManual(); }
    if ("next" in d) {
      const l = steps(), i = l.indexOf(st.step);
      if (i < l.length - 1) return go(l[i + 1]);
      return create();
    }
    if (d.class) {
      if (d.class !== st.classId) {
        st.classId = d.class; st.classSkills = [];
        const c = cls();
        if (c.spells && st.spellsFor !== c.id) { st.spells = c.spells.slice(0, c.pick); st.spellsFor = c.id; }
      }
      return paint(true);
    }
    if (d.cskill) { st.classSkills = toggle(st.classSkills, d.cskill, cls().choose); st.bgSkills = []; return paint(true); }
    if (d.species) { if (d.species !== st.speciesId) { st.speciesId = d.species; st.free = []; st.extraSkills = []; } return paint(true); }
    if (d.free) { st.free = toggle(st.free, d.free, sp().freeBonus); return paint(true); }
    if (d.xskill) { st.extraSkills = toggle(st.extraSkills, d.xskill, sp().extraSkills); st.bgSkills = []; return paint(true); }
    if (d.method) { st.method = d.method; st.assign = {}; return paint(true); }
    if (d.pt) {
      const k = d.pt, next = Math.max(8, Math.min(15, st.points[k] + Number(d.d)));
      st.points = { ...st.points, [k]: next };
      return paint(true);
    }
    if ("roll" in d) {
      st.rolls = Array.from({ length: 6 }, () => {
        const r = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6)).sort((a, b) => a - b);
        return r[1] + r[2] + r[3];
      }).sort((a, b) => b - a);
      st.assign = {};
      return paint(true);
    }
    if (d.bg) { if (d.bg !== st.bgId) { st.bgId = d.bg; st.bgSkills = []; } return paint(true); }
    if (d.bskill) { st.bgSkills = toggle(st.bgSkills, d.bskill, bgPicks()); return paint(true); }
    if (d.spell) { st.spells = toggle(st.spells, d.spell, cls().pick); return paint(true); }
    if ("portrait" in d) return back.querySelector("[data-portrait-file]").click();
  });
  back.addEventListener("change", async e => {
    const t = e.target, d = t.dataset;
    if (d.assign) { const v = t.value === "" ? undefined : Number(t.value); st.assign = { ...st.assign, [d.assign]: v }; if (v === undefined) delete st.assign[d.assign]; return paint(true); }
    if (d.manual) { st.manual = { ...st.manual, [d.manual]: Math.trunc(Number(t.value) || 0) }; return paint(true); }
    if (d.f === "alignment" || d.f === "color") { st[d.f] = t.value; return paint(true); }
    if ("portraitFile" in d && t.files[0]) {
      try {
        const { blob } = await shrinkImage(t.files[0], 192);
        st.avatarId = await uploadImage(blob);
        paint(true);
      } catch (err) { toast(err.message, "bad"); }
    }
  });
  back.addEventListener("input", e => {
    const d = e.target.dataset;
    if (d.f === "name" || d.f === "player") {
      st[d.f] = e.target.value;
      const why = missing(st.step);
      back.querySelector(".bd-why").textContent = why;
      back.querySelector("[data-next]").disabled = !!why;
      const sum = back.querySelector(".bd-sum-head b");
      if (sum && d.f === "name") sum.textContent = st.name || "Sin nombre";
    }
  });

  function create() {
    const fresh = normalizeChar({ ...buildCharacter(choice()), id: uid() });
    op("char.add", { char: fresh });
    toast(fresh.name + " se sienta a la mesa", "good");
    close();
  }

  paint();
  return { close };
}
