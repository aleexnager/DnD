/* La hoja de personaje con el formato de la oficial de 2024: dos páginas
   con las mismas cajas en el mismo sitio (cabecera, características con sus
   salvaciones y habilidades, armas, rasgos; y en la segunda, la magia, los
   conjuros preparados, el aspecto, la historia, el equipo y las monedas),
   pintadas con la piel de la mesa. Sirve para crear a mano y para ver y
   retocar cualquier ficha: los números que salen de otros (modificadores,
   salvaciones, habilidades, CD) se recalculan mientras se escribe.

   Se guarda todo de una vez al pulsar Guardar; los conjuros también, así
   que se pueden añadir antes de que el personaje exista. */

import { esc, toast, shrinkImage, imgURL, initials, on } from "./util.js";
import { ABILITIES, SKILLS, FEATURE_SOURCES, ARMOR_TRAINING, COINS, SIZE_NAMES, SHAPE_NAMES, normalizeAttack, normalizeItem,
  normalizeFeature, normalizeSpell, modOf, uid, profForLevel, conditionName } from "./schema.js";
import { attacksOf } from "./attacks.js";
import { guessAbility } from "./spells.js";
import { openLibrary, openSpellEditor } from "./spellbook.js";
import { spellChips, chipsHTML } from "./chips.js";
import { icon } from "./icons.js";
import { uploadImage } from "./net.js";
import { currentLang } from "./i18n.js";

/* «Mediano» es a la vez un tamaño y una especie: el diccionario lo tomaría
   por la especie, así que el tamaño se traduce aquí */
const SIZE_EN = { "Diminuto": "Tiny", "Pequeño": "Small", "Mediano": "Medium", "Grande": "Large", "Enorme": "Huge", "Gargantuesco": "Gargantuan" };
const sizeLabel = t => currentLang() === "en" ? SIZE_EN[t] || t : t;
const SAVE_ABBR = { str: "FUE", dex: "DES", con: "CON", int: "INT", wis: "SAB", cha: "CAR" };
const SAVE_BY_ABBR = Object.fromEntries(Object.entries(SAVE_ABBR).map(([k, v]) => [v.toLowerCase(), k]));
const CAST_ABIL = [["", "—"], ["int", "Inteligencia"], ["wis", "Sabiduría"], ["cha", "Carisma"]];
const sign = n => (n >= 0 ? "+" : "") + n;
const v = x => esc(x ?? "");
/* El orden de la hoja: Fuerza, Destreza y Constitución en la primera
   columna; Inteligencia, Sabiduría y Carisma en la segunda */
const COL_A = ["str", "dex", "con"], COL_B = ["int", "wis", "cha"];
const ABIL_LONG = { str: "Fuerza", dex: "Destreza", con: "Constitución", int: "Inteligencia", wis: "Sabiduría", cha: "Carisma" };
const abilName = k => ABIL_LONG[k] || k;
const skillsOf = k => SKILLS.filter(s => s[2] === k).sort((a, b) => a[1].localeCompare(b[1], "es"));
/* Rasgos: clase (y otros), especie, y dotes con el trasfondo */
const BOX_OF = { "Clase": "class", "Otro": "class", "Especie": "species", "Dote": "feats", "Trasfondo": "feats" };
const SOURCE_OF = { class: "Clase", species: "Especie", feats: "Dote" };

/* Un rombo que se marca: salvaciones de muerte, espacios gastados, escudo… */
const diamond = (name, on, label, extra = "") =>
  `<button type="button" class="hj-dia ${on ? "on" : ""}" data-dia="${name}" aria-pressed="${!!on}" aria-label="${esc(label)}" title="${esc(label)}" ${extra}></button>`;
const line = (label, name, value, attrs = "") =>
  `<label class="hj-line"><input name="${name}" value="${v(value)}" ${attrs}><span>${label}</span></label>`;

export function sheetHTML(c, { isDM = true } = {}) {
  const prof = c.proficiency || 2;
  const ab = k => `
    <section class="hj-abil" data-ab="${k}">
      <h4>${abilName(k)}</h4>
      <div class="hj-abil-top">
        <output class="hj-mod tnum" data-mod="${k}">${sign(modOf(c[k]))}</output>
        <label class="hj-score"><input name="${k}" type="number" min="1" max="30" value="${c[k]}" class="tnum"><small>Puntuación</small></label>
        <small class="hj-modlbl">Modificador</small>
      </div>
      <ul>
        <li class="hj-save"><label><input type="checkbox" class="hj-prof" name="save" value="${k}" ${c.saves.includes(k) ? "checked" : ""}>
          <b class="tnum" data-savev="${k}">${sign(modOf(c[k]) + (c.saves.includes(k) ? prof : 0))}</b><span>Tirada de salvación</span></label></li>
        ${skillsOf(k).map(([id, name]) => `<li><label><input type="checkbox" class="hj-prof" name="skill" value="${id}" ${c.skills.includes(id) ? "checked" : ""}>
          <b class="tnum" data-skv="${id}">${sign(modOf(c[k]) + (c.skills.includes(id) ? prof : 0))}</b><span>${name}</span></label></li>`).join("")}
      </ul>
    </section>`;
  const box = (cls, title, inner, extra = "") => `<section class="hj-box ${cls}" ${extra}><h3>${title}</h3>${inner}</section>`;
  const small = (title, name, value, attrs = "") => `<section class="hj-box hj-small"><h3>${title}</h3><input name="${name}" value="${v(value)}" ${attrs} class="tnum"></section>`;

  return `<div class="hoja">
    <section class="hj-mesa" aria-label="En la mesa">
      <div class="hj-portrait">
        <div class="avatar" id="avPreview" style="--tone:${v(c.color)}${c.avatarId ? `;background-image:url(${imgURL(c.avatarId)});background-size:cover` : ""}">${c.avatarId ? "" : initials(c.name)}</div>
        <button type="button" class="btn sm" id="avPick">Retrato</button>
        <input type="file" id="avFile" accept="image/*" hidden>
      </div>
      <div class="hj-mesa-fields">
        <label class="field"><span>Jugador</span><input name="player" value="${v(c.player)}"></label>
        <label class="field hj-color"><span>Color de la ficha</span><input name="color" type="color" value="${v(c.color)}"></label>
        <label class="field"><span>Visión en la oscuridad (casillas)</span><input name="vision" type="number" min="0" max="40" value="${c.vision}"></label>
        <label class="field"><span>Luz que lleva encima (casillas)</span><input name="light" type="number" min="0" max="40" value="${c.light}"></label>
        <label class="field"><span>Alcance cuerpo a cuerpo (casillas)</span><input name="reach" type="number" min="1" max="6" value="${c.reach}"></label>
      </div>
      <p class="prose small-note">Lo de esta franja es de la mesa: el retrato, el color en el tablero y lo que ve y alcanza en el mapa (una antorcha alumbra 4 casillas; la visión en la oscuridad de un enano, 12).</p>
    </section>

    <!-- ======================= Página 1 ======================= -->
    <div class="hj-page hj-p1">
      <div class="hj-head">
        <section class="hj-box hj-ident">
          ${line("Nombre del personaje", "name", c.name, 'class="hj-name" maxlength="60" required')}
          <div class="hj-two">${line("Trasfondo", "background", c.background)}${line("Clase", "className", c.className)}</div>
          <div class="hj-two">${line("Especie", "race", c.race)}${line("Subclase", "subclass", c.subclass)}</div>
        </section>
        <section class="hj-oval">
          <label><input name="level" type="number" min="1" max="20" value="${c.level}" class="tnum"><span>Nivel</span></label>
          <label><input name="xp" type="number" min="0" value="${c.xp || 0}" class="tnum"><span>PX</span></label>
        </section>
        <section class="hj-shield">
          <h3>Clase de armadura</h3>
          <input name="ac" type="number" min="0" max="40" value="${c.ac}" class="tnum" aria-label="Clase de armadura">
          <span class="hj-shield-on">${diamond("shieldOn", c.shieldOn, "Escudo")}<small>Escudo</small></span>
        </section>
        <section class="hj-box hj-hp">
          <h3>Puntos de golpe</h3>
          <div class="hj-hp-grid">
            <label class="hj-hp-cur"><input name="hp" type="number" min="0" value="${c.hp}" class="tnum"><span>Actuales</span></label>
            <label><input name="tempHp" type="number" min="0" value="${c.tempHp}" class="tnum"><span>Temp.</span></label>
            <label><input name="maxHp" type="number" min="1" value="${c.maxHp}" class="tnum"><span>Máx.</span></label>
          </div>
        </section>
        <section class="hj-box hj-hd">
          <h3>Dados de golpe</h3>
          <label><input name="hitDiceUsed" type="number" min="0" max="20" value="${c.hitDiceUsed}" class="tnum"><span>Gastados</span></label>
          <label><input name="hitDice" value="${v(c.hitDice)}" placeholder="${c.level}d8"><span>Máx.</span></label>
        </section>
        <section class="hj-box hj-death">
          <h3>Salvaciones contra muerte</h3>
          <div><span class="hj-dias">${[1, 2, 3].map(i => diamond("deathOk", i <= c.deathOk, `Éxito ${i}`, `data-i="${i}"`)).join("")}</span><small>Éxitos</small></div>
          <div><span class="hj-dias">${[1, 2, 3].map(i => diamond("deathFail", i <= c.deathFail, `Fallo ${i}`, `data-i="${i}"`)).join("")}</span><small>Fallos</small></div>
        </section>
      </div>

      <div class="hj-banner" aria-hidden="true"><span>Hoja de personaje</span></div>

      <div class="hj-body">
        <div class="hj-left">
          <div class="hj-col">
            <section class="hj-box hj-prof-box"><h3>Bonificador por competencia</h3>
              <input name="proficiency" type="number" min="1" max="9" value="${prof}" class="tnum" aria-label="Bonificador por competencia"></section>
            ${COL_A.map(ab).join("")}
            <section class="hj-box hj-insp"><h3>Inspiración heroica</h3>${diamond("inspiration", c.inspiration, "Inspiración heroica")}</section>
          </div>
          <div class="hj-col">${COL_B.map(ab).join("")}</div>
          ${box("hj-train", "Entrenamiento y competencias con equipo", `
            <div class="hj-armor"><small>Entrenamiento con armaduras</small>
              ${ARMOR_TRAINING.map(([k, l]) => `<span>${diamond("armor-" + k, c.armorTraining.includes(k), l, `data-armor="${k}"`)}${l}</span>`).join("")}</div>
            <label class="hj-area"><small>Armas</small><textarea name="weaponProf" rows="3">${v(c.weaponProf)}</textarea></label>
            <label class="hj-area"><small>Herramientas</small><textarea name="toolProf" rows="2">${v(c.toolProf)}</textarea></label>`)}
        </div>

        <div class="hj-right">
          <div class="hj-quad">
            <section class="hj-box hj-small"><h3>Iniciativa</h3>
              <input name="init" type="number" min="-10" max="30" value="${c.init ?? ""}" placeholder="${sign(modOf(c.dex))}" class="tnum" title="En blanco: la de Destreza"></section>
            ${small("Velocidad", "speed", c.speed, 'type="number" min="0" max="200"')}
            <section class="hj-box hj-small"><h3>Tamaño</h3>
              <select name="size" data-keep>${SIZE_NAMES.map(t => `<option value="${t}" ${c.size === t ? "selected" : ""}>${sizeLabel(t)}</option>`).join("")}</select></section>
            <section class="hj-box hj-small"><h3>Percepción pasiva</h3><output class="tnum" data-passive>${10 + modOf(c.wis) + (c.skills.includes("percepcion") ? prof : 0)}</output></section>
          </div>

          ${box("hj-weapons", "Armas y trucos de daño", `
            <div class="hj-table" role="table">
              <div class="hj-tr hj-th" role="row"><span>Nombre</span><span>Bonif. atq./CD</span><span>Daño y tipo</span><span>Notas</span><span></span></div>
              <div id="hjWeapons"></div>
              <div id="hjSpellAtk"></div>
            </div>
            <button type="button" class="btn sm hj-add" data-add="weapon">${icon("plus", 14)}<span>Añadir arma o ataque</span></button>`)}

          ${box("hj-feats hj-class", "Rasgos de clase", `<div class="hj-feat-list" data-feats="class"></div>
            <button type="button" class="btn sm hj-add" data-add="class">${icon("plus", 14)}<span>Añadir rasgo</span></button>
            <h4 class="hj-sub">Usos y recursos</h4>
            <div class="hj-res" id="hjRes"></div>
            <button type="button" class="btn sm hj-add" data-add="res">${icon("plus", 14)}<span>Añadir recurso</span></button>`, 'data-grid="1"')}

          <div class="hj-duo">
            ${box("hj-feats", "Atributos de especie", `<div class="hj-feat-list" data-feats="species"></div>
              <button type="button" class="btn sm hj-add" data-add="species">${icon("plus", 14)}<span>Añadir atributo</span></button>`, 'data-grid="1"')}
            ${box("hj-feats", "Dotes", `<div class="hj-feat-list" data-feats="feats"></div>
              <button type="button" class="btn sm hj-add" data-add="feats">${icon("plus", 14)}<span>Añadir dote</span></button>`, 'data-grid="1"')}
          </div>
        </div>
      </div>
    </div>

    <!-- ======================= Página 2 ======================= -->
    <div class="hj-page hj-p2">
      <div class="hj-p2-left">
        <div class="hj-magic-top">
          <section class="hj-box hj-cast">
            <label class="hj-line"><select name="castAbility">${CAST_ABIL.map(([k, l]) => `<option value="${k}" ${c.castAbility === k ? "selected" : ""}>${l}</option>`).join("")}</select><span>Aptitud mágica</span></label>
            <div class="hj-cast-row"><output class="tnum" data-cast="mod"></output><b>Modificador por aptitud mágica</b></div>
            <div class="hj-cast-row"><input name="spellDC" type="number" min="0" max="30" value="${c.spellDC || ""}" class="tnum" data-cast="dc" title="En blanco: 8 + competencia + modificador"><b>CD de salvación de conjuros</b></div>
            <div class="hj-cast-row"><input name="spellAtk" type="number" min="0" max="20" value="${c.spellAtk || ""}" class="tnum" data-cast="atk" title="En blanco: competencia + modificador"><b>Bonificador de ataque de conjuros</b></div>
          </section>
          ${box("hj-slots", "Espacios de conjuro", `<div class="hj-slot-grid">${c.slots.map((n, i) => `
            <div class="hj-slot" data-lv="${i + 1}"><small>Nivel ${i + 1}</small>
              <input name="slot${i}" type="number" min="0" max="9" value="${n}" class="tnum" aria-label="Espacios de nivel ${i + 1}">
              <span class="hj-dias" data-used="${i}"></span></div>`).join("")}</div>
            <p class="hj-slot-key"><span>Total</span><span>Gastados</span></p>`)}
        </div>

        ${box("hj-spells", "Trucos y conjuros preparados", `
          <div class="hj-table" role="table">
            <div class="hj-tr hj-th" role="row"><span>Nivel</span><span>Nombre</span><span>Tiempo de lanzamiento</span><span>Alcance</span><span title="Concentración, ritual y material necesario">C · R · M</span><span>Notas</span><span></span></div>
            <div id="hjSpells"></div>
          </div>
          <div class="hj-actions">
            <button type="button" class="btn sm" data-add="libSpell">${icon("book", 14)}<span>Añadir de la biblioteca</span></button>
            <button type="button" class="btn sm" data-add="newSpell">${icon("plus", 14)}<span>Crear un conjuro</span></button>
          </div>`)}

        ${box("hj-notes", "Notas", `<textarea name="notes" rows="5" class="hj-grid-paper">${v(c.notes)}</textarea>`)}
      </div>

      <div class="hj-p2-right">
        ${box("hj-appear", "Aspecto", `<textarea name="appearance" rows="4" class="hj-grid-paper">${v(c.appearance)}</textarea>`)}
        ${box("hj-story", "Historia y personalidad", `<textarea name="backstory" rows="8" class="hj-grid-paper">${v(c.backstory)}</textarea>
          ${line("Alineamiento", "alignment", c.alignment)}`)}
        ${box("hj-langs", "Idiomas", `<textarea name="languages" rows="2" class="hj-grid-paper">${v(c.languages)}</textarea>`)}
        ${box("hj-gear", "Equipo", `
          <div class="hj-items">
            <div class="hj-tr hj-th"><span title="Equipado">Eq.</span><span>Objeto</span><span>Cant.</span><span>Peso (lb)</span><span></span></div>
            <div id="hjItems"></div>
          </div>
          <button type="button" class="btn sm hj-add" data-add="item">${icon("plus", 14)}<span>Añadir objeto</span></button>
          <div class="hj-attune"><small>Sintonización con objetos mágicos</small>
            ${c.attune.map((a, i) => `<label>${diamond("attuneMark", !!a, "Sintonizado", 'tabindex="-1" disabled')}<input name="attune${i}" value="${v(a)}" aria-label="Objeto sintonizado ${i + 1}"></label>`).join("")}</div>`)}
        ${box("hj-coins", "Monedas", `<div class="hj-coin-row">${COINS.map(([k, abbr, metal]) => `
          <label title="Piezas de ${metal}"><small>${abbr}</small><input name="coin-${k}" type="number" min="0" value="${c.coins[k] || 0}" class="tnum"></label>`).join("")}</div>`)}
      </div>
    </div>
  </div>`;
}

/* Filas que se editan dentro de la hoja */
const weaponRow = (a = {}) => {
  const hit = a.save ? `CD ${a.save.split(" ")[1]} ${SAVE_ABBR[a.save.split(" ")[0]] || "DES"}` : (a.name || a.atk ? sign(+a.atk || 0) : "");
  return `<div class="hj-tr hj-wrow" role="row">
    <input data-w="name" value="${v(a.name)}" placeholder="Espada larga" aria-label="Nombre">
    <input data-w="hit" value="${v(hit)}" placeholder="+5 o CD 13 DES" aria-label="Bonificador al ataque o CD">
    <span class="hj-dmg"><input data-w="damage" value="${v(a.damage === "1d6" && !a.name ? "" : a.damage)}" placeholder="1d8+3" aria-label="Daño"><input data-w="type" value="${v(a.type)}" placeholder="cortante" aria-label="Tipo de daño"></span>
    <input data-w="range" value="${v(a.range)}" placeholder="alcance 5 pies" aria-label="Notas: alcance">
    <span class="hj-row-tools">
      <button type="button" class="icon-btn" data-more title="Espacio de conjuro y área" aria-label="Espacio de conjuro y área">${icon("more", 15)}</button>
      <button type="button" class="icon-btn" data-del title="Quitar" aria-label="Quitar">${icon("close", 15)}</button></span>
    <div class="hj-wmore" hidden>
      <label><small>Espacio</small><select data-w="level"><option value="0">Sin espacio</option>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<option value="${n}" ${+a.level === n ? "selected" : ""}>Nivel ${n}</option>`).join("")}</select></label>
      <label><small>Área</small><select data-w="shape">${SHAPE_NAMES.map(([k, l]) => `<option value="${k}" ${a.shape === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label><small>Tamaño (pies)</small><input data-w="size" type="number" step="5" min="0" value="${a.size ?? 20}"></label>
    </div>
  </div>`;
};
const featRow = (f = {}) => `<div class="hj-feat" data-source="${v(f.source || "")}">
  <div class="hj-feat-head"><input data-f="name" value="${v(f.name)}" placeholder="Nombre" aria-label="Nombre">
    <button type="button" class="icon-btn" data-del title="Quitar" aria-label="Quitar">${icon("close", 14)}</button></div>
  <textarea data-f="text" rows="2" placeholder="Qué hace" aria-label="Qué hace">${v(f.text)}</textarea></div>`;
const resRow = (r = {}) => `<div class="hj-tr hj-rrow"><input data-r="name" value="${v(r.name)}" placeholder="Furia, ki, canalizar divinidad…" aria-label="Recurso">
  <label><small>Usados</small><input data-r="uses" type="number" min="0" value="${r.uses ?? 0}" class="tnum"></label>
  <label><small>Total</small><input data-r="max" type="number" min="0" value="${r.max ?? 1}" class="tnum"></label>
  <button type="button" class="icon-btn" data-del title="Quitar" aria-label="Quitar">${icon("close", 14)}</button></div>`;
const itemRow = (it = {}) => `<div class="hj-tr hj-irow">
  <input type="checkbox" class="hj-prof" data-i="equipped" ${it.equipped ? "checked" : ""} aria-label="Equipado">
  <input data-i="name" value="${v(it.name)}" placeholder="Cuerda de cáñamo" aria-label="Objeto">
  <input data-i="qty" type="number" min="0" value="${it.qty ?? 1}" class="tnum" aria-label="Cantidad">
  <input data-i="weight" type="number" min="0" step="0.5" value="${it.weight ?? 0}" class="tnum" aria-label="Peso">
  <button type="button" class="icon-btn" data-del title="Quitar" aria-label="Quitar">${icon("close", 14)}</button>
  <input data-i="note" value="${v(it.note)}" placeholder="Nota" aria-label="Nota" class="hj-inote"></div>`;

/* «+5», «-1», «CD 13 DES» o «CD 13 Destreza» -> { atk, save } */
export function parseHit(text) {
  const t = String(text || "").trim();
  const m = t.match(/^CD\s*(\d+)\s*([a-záéíóú]*)/i);
  if (m) {
    const w = m[2].toLowerCase().slice(0, 3);
    const ab = SAVE_BY_ABBR[w] || { fue: "str", des: "dex", con: "con", int: "int", sab: "wis", car: "cha" }[w] || "dex";
    return { atk: 0, save: `${ab} ${m[1]}` };
  }
  const n = parseInt(t.replace(/\s+/g, ""), 10);
  return { atk: Number.isFinite(n) ? n : 0, save: "" };
}

/* Conecta la hoja: filas, rombos, retrato, conjuros y números que se
   recalculan. Devuelve read() con los campos listos para guardar. */
export function mountSheet(host, c) {
  let avatarId = c.avatarId;
  const book = c.spellbook.map(sp => ({ ...sp }));
  const q = s => host.querySelector(s);
  const val = n => { const e = host.querySelector(`[name="${n}"]`); return e ? e.value : ""; };

  /* Filas iniciales */
  const weapons = c.attacks.length ? c.attacks : attacksOf(c).slice(0, 6);
  q("#hjWeapons").innerHTML = weapons.map(weaponRow).join("");
  for (const f of c.features) {
    const list = host.querySelector(`[data-feats="${BOX_OF[f.source] || "class"}"]`);
    list.insertAdjacentHTML("beforeend", featRow(f));
  }
  q("#hjRes").innerHTML = c.resources.map(resRow).join("");
  q("#hjItems").innerHTML = c.items.map(itemRow).join("");

  /* Conjuros: tabla de la segunda página y, los que atacan, en armas */
  const paintSpells = () => {
    const sorted = book.slice().sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "es"));
    q("#hjSpells").innerHTML = sorted.length ? sorted.map(sp => `<div class="hj-tr hj-srow" role="row">
      <span class="tnum hj-lv">${sp.level === 0 ? "T" : sp.level}</span>
      <span class="hj-sname"><b>${esc(sp.name)}</b>${chipsHTML(spellChips(sp).filter(x => x.kind !== "reach" && x.kind !== "conc"))}</span>
      <span>${esc(sp.time || "—")}</span><span>${esc(sp.range || "—")}</span>
      <span class="hj-crm">${diamond("", sp.conc, "Concentración", 'tabindex="-1" disabled')}<i>C</i>${diamond("", /ritual/i.test(sp.time), "Ritual", 'tabindex="-1" disabled')}<i>R</i>${diamond("", /\bM\b/.test(sp.components || "") && /\d+\s*po|consume/i.test(sp.components || ""), "Material necesario", 'tabindex="-1" disabled')}<i>M</i></span>
      <span class="hj-snote">${esc(spellNote(sp))}</span>
      <span class="hj-row-tools">
        <button type="button" class="icon-btn" data-sp-edit="${esc(sp.id)}" title="Retocar este conjuro" aria-label="Retocar este conjuro">${icon("pencil", 14)}</button>
        <button type="button" class="icon-btn" data-sp-del="${esc(sp.id)}" title="Quitar de la lista" aria-label="Quitar de la lista">${icon("close", 14)}</button></span>
    </div>`).join("") : `<p class="hj-empty">Sin conjuros todavía. Añádelos de la biblioteca o crea uno.</p>`;
    paintSpellAttacks();
  };
  /* Los conjuros que hacen daño también son ataques: salen en la tabla de
     armas (solo lectura; se cambian en la tabla de conjuros) */
  const paintSpellAttacks = () => {
    const st = castNumbers();
    const hits = book.filter(sp => sp.damage && ["attack", "save", "auto"].includes(sp.mode));
    q("#hjSpellAtk").innerHTML = hits.map(sp => `<div class="hj-tr hj-wrow from-spell" role="row" title="Sale de la tabla de conjuros">
      <span class="hj-ro">${icon("wand", 13)}<b>${esc(sp.name)}</b></span>
      <span class="hj-ro tnum">${sp.mode === "attack" ? sign(st.atk) : sp.mode === "save" ? `CD ${st.dc} ${SAVE_ABBR[sp.save] || "DES"}` : "—"}</span>
      <span class="hj-ro">${esc(sp.mode === "auto" ? `${sp.darts}×${sp.damage}` : sp.damage)} ${esc(sp.type)}</span>
      <span class="hj-ro">${esc(sp.range)}${sp.level ? ` · nivel ${sp.level}` : " · truco"}</span><span></span></div>`).join("");
  };

  /* Los números que salen de otros */
  const castNumbers = () => {
    const k = val("castAbility") || guessAbility(val("className")) || "int";
    const mod = modOf(+val(k) || 10), prof = +val("proficiency") || 2;
    return { mod, dc: +val("spellDC") || 8 + prof + mod, atk: +val("spellAtk") || prof + mod, auto: { dc: 8 + prof + mod, atk: prof + mod } };
  };
  const recalc = () => {
    const prof = +val("proficiency") || 2;
    const score = k => +val(k) || 10;
    const checked = (n, x) => !!host.querySelector(`[name="${n}"][value="${x}"]:checked`);
    for (const [k] of ABILITIES) {
      const m = modOf(score(k));
      host.querySelector(`[data-mod="${k}"]`).textContent = sign(m);
      host.querySelector(`[data-savev="${k}"]`).textContent = sign(m + (checked("save", k) ? prof : 0));
    }
    for (const [id, , k] of SKILLS) {
      const out = host.querySelector(`[data-skv="${id}"]`);
      if (out) out.textContent = sign(modOf(score(k)) + (checked("skill", id) ? prof : 0));
    }
    host.querySelector("[data-passive]").textContent = 10 + modOf(score("wis")) + (checked("skill", "percepcion") ? prof : 0);
    host.querySelector('[name="init"]').placeholder = sign(modOf(score("dex")));
    const st = castNumbers();
    host.querySelector('[data-cast="mod"]').textContent = sign(st.mod);
    host.querySelector('[data-cast="dc"]').placeholder = st.auto.dc;
    host.querySelector('[data-cast="atk"]').placeholder = sign(st.auto.atk);
    host.querySelector('[name="hitDice"]').placeholder = `${+val("level") || 1}d8`;
    /* Rombos de espacios: tantos como espacios, marcados los gastados */
    host.querySelectorAll("[data-used]").forEach(box => {
      const i = +box.dataset.used, total = Math.max(0, Math.min(9, +val("slot" + i) || 0));
      const used = Math.min(total, slotsUsed[i] || 0);
      box.innerHTML = Array.from({ length: total }, (_, j) => diamond("slotUsed", j < used, `Gastado ${j + 1} de nivel ${i + 1}`, `data-lv="${i}" data-i="${j + 1}"`)).join("");
      box.closest(".hj-slot").classList.toggle("is-empty", !total);
    });
    paintSpellAttacks();
  };

  /* Rombos y marcas */
  const slotsUsed = [...c.slotsUsed];
  const state = { deathOk: c.deathOk, deathFail: c.deathFail, inspiration: c.inspiration, shieldOn: c.shieldOn, armor: new Set(c.armorTraining) };
  host.addEventListener("click", e => {
    const d = e.target.closest(".hj-dia[data-dia]");
    if (!d || d.disabled) return;
    const kind = d.dataset.dia;
    if (kind === "deathOk" || kind === "deathFail") {
      const i = +d.dataset.i;
      state[kind] = state[kind] === i ? i - 1 : i;
      host.querySelectorAll(`[data-dia="${kind}"]`).forEach(x => { const on = +x.dataset.i <= state[kind]; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); });
      return;
    }
    if (kind === "slotUsed") {
      const lv = +d.dataset.lv, i = +d.dataset.i;
      slotsUsed[lv] = slotsUsed[lv] === i ? i - 1 : i;
      return recalc();
    }
    if (kind === "inspiration" || kind === "shieldOn") state[kind] = !state[kind];
    if (kind.startsWith("armor-")) { const k = d.dataset.armor; state.armor.has(k) ? state.armor.delete(k) : state.armor.add(k); }
    d.classList.toggle("on"); d.setAttribute("aria-pressed", d.classList.contains("on"));
  });

  /* Añadir y quitar filas */
  on(host, "click", "[data-add]", (e, b) => {
    const what = b.dataset.add;
    if (what === "weapon") { q("#hjWeapons").insertAdjacentHTML("beforeend", weaponRow({})); q("#hjWeapons").lastElementChild.querySelector("input").focus(); }
    if (what === "res") { q("#hjRes").insertAdjacentHTML("beforeend", resRow({})); q("#hjRes").lastElementChild.querySelector("input").focus(); }
    if (what === "item") { q("#hjItems").insertAdjacentHTML("beforeend", itemRow({})); q("#hjItems").lastElementChild.querySelector('[data-i="name"]').focus(); }
    if (SOURCE_OF[what]) {
      const list = host.querySelector(`[data-feats="${what}"]`);
      list.insertAdjacentHTML("beforeend", featRow({ source: SOURCE_OF[what] }));
      list.lastElementChild.querySelector("input").focus();
    }
    if (what === "libSpell") openLibrary({ ...c, spellbook: book }, null, { isDM: false, onPick: list => {
      for (const sp of list) if (!book.some(x => x.id === sp.id)) book.push(sp);
      if (!val("castAbility") && list.length) host.querySelector('[name="castAbility"]').value = guessAbility(val("className"));
      paintSpells(); recalc();
    } });
    if (what === "newSpell") openSpellEditor(normalizeSpell({ id: "propio-" + uid(), name: "Conjuro nuevo", level: 1, mode: "save", save: "dex", damage: "2d6", type: "fuego", time: "Acción", range: "60 pies" }), {
      title: "Conjuro nuevo", onSave: sp => { book.push(sp); paintSpells(); }
    });
  });
  on(host, "click", "[data-del]", (e, b) => b.closest(".hj-tr, .hj-feat").remove());
  on(host, "click", "[data-more]", (e, b) => { const m = b.closest(".hj-wrow").querySelector(".hj-wmore"); m.hidden = !m.hidden; });
  on(host, "click", "[data-sp-del]", (e, b) => { const i = book.findIndex(x => x.id === b.dataset.spDel); if (i >= 0) book.splice(i, 1); paintSpells(); });
  on(host, "click", "[data-sp-edit]", (e, b) => {
    const sp = book.find(x => x.id === b.dataset.spEdit);
    if (sp) openSpellEditor(sp, { title: `${sp.name} · ${val("name") || "esta ficha"}`, note: "Cambia el conjuro solo en esta ficha. La biblioteca se queda como está.",
      onSave: next => { book[book.indexOf(sp)] = next; paintSpells(); } });
  });

  /* La competencia sigue al nivel mientras no se haya tocado a mano */
  let autoProf = (+val("proficiency") || 2) === profForLevel(c.level);
  host.addEventListener("input", e => {
    if (e.target.name === "proficiency") autoProf = false;
    if (e.target.name === "level" && autoProf) host.querySelector('[name="proficiency"]').value = profForLevel(+e.target.value || 1);
    if (e.target.name === "name" && !avatarId) q("#avPreview").textContent = initials(e.target.value);
    recalc();
  });
  host.addEventListener("change", recalc);

  /* Retrato */
  const file = q("#avFile");
  q("#avPick").addEventListener("click", () => file.click());
  file.addEventListener("change", async () => {
    if (!file.files[0]) return;
    try {
      const { blob } = await shrinkImage(file.files[0], 192);
      avatarId = await uploadImage(blob);
      const prev = q("#avPreview");
      prev.textContent = "";
      prev.style.backgroundImage = `url(${imgURL(avatarId)})`;
      prev.style.backgroundSize = "cover";
    } catch (err) { toast(err.message, "bad"); }
  });

  paintSpells();
  recalc();

  return {
    read() {
      const rows = (sel, f) => [...host.querySelectorAll(sel)].map(f);
      const attacks = rows("#hjWeapons .hj-wrow", r => {
        const g = k => (r.querySelector(`[data-w="${k}"]`) || {}).value || "";
        const { atk, save } = parseHit(g("hit"));
        return normalizeAttack({ name: g("name").trim(), atk, save, damage: g("damage").trim(), type: g("type").trim(), range: g("range").trim(),
          level: +g("level") || 0, shape: g("shape"), size: +g("size") || 20 });
      }).filter(a => a.name);
      const features = [];
      for (const [box, source] of Object.entries(SOURCE_OF)) {
        host.querySelectorAll(`[data-feats="${box}"] .hj-feat`).forEach(r => {
          const name = r.querySelector('[data-f="name"]').value.trim();
          const src = FEATURE_SOURCES.includes(r.dataset.source) && BOX_OF[r.dataset.source] === box ? r.dataset.source : source;
          if (name) features.push(normalizeFeature({ name, text: r.querySelector('[data-f="text"]').value, source: src }));
        });
      }
      const resources = rows("#hjRes .hj-rrow", r => ({ name: r.querySelector('[data-r="name"]').value.trim(),
        uses: Math.max(0, +r.querySelector('[data-r="uses"]').value || 0), max: Math.max(0, +r.querySelector('[data-r="max"]').value || 0) })).filter(r => r.name);
      const items = rows("#hjItems .hj-irow", r => normalizeItem({ name: r.querySelector('[data-i="name"]').value.trim(),
        qty: +r.querySelector('[data-i="qty"]').value || 0, weight: +r.querySelector('[data-i="weight"]').value || 0,
        equipped: r.querySelector('[data-i="equipped"]').checked, note: r.querySelector('[data-i="note"]').value })).filter(x => x.name);
      const slots = c.slots.map((_, i) => Math.max(0, Math.min(9, +val("slot" + i) || 0)));
      const fields = {
        name: val("name").trim() || "Sin nombre",
        className: val("className"), race: val("race"), subclass: val("subclass"), background: val("background"),
        player: val("player"), alignment: val("alignment"), color: val("color"),
        level: Math.max(1, Math.min(20, +val("level") || 1)), xp: Math.max(0, +val("xp") || 0),
        hp: Math.max(0, +val("hp") || 0), maxHp: Math.max(1, +val("maxHp") || 1), tempHp: Math.max(0, +val("tempHp") || 0),
        ac: +val("ac") || 0, shieldOn: state.shieldOn, speed: +val("speed") || 0, size: val("size") || "Mediano",
        init: val("init") === "" ? null : +val("init"),
        proficiency: +val("proficiency") || 2, hitDice: val("hitDice"), hitDiceUsed: Math.max(0, +val("hitDiceUsed") || 0),
        deathOk: state.deathOk, deathFail: state.deathFail, inspiration: state.inspiration,
        avatarId,
        saves: [...host.querySelectorAll('[name="save"]:checked')].map(i => i.value),
        skills: [...host.querySelectorAll('[name="skill"]:checked')].map(i => i.value),
        armorTraining: [...state.armor], weaponProf: val("weaponProf"), toolProf: val("toolProf"),
        slots, slotsUsed: slotsUsed.map((u, i) => Math.min(u || 0, slots[i])),
        castAbility: val("castAbility") || (book.length ? guessAbility(val("className")) : ""),
        spellDC: +val("spellDC") || 0, spellAtk: +val("spellAtk") || 0,
        spellbook: book.map(normalizeSpell),
        attacks, features, resources, items,
        appearance: val("appearance"), backstory: val("backstory"), languages: val("languages"), notes: val("notes"),
        attune: [0, 1, 2].map(i => val("attune" + i).trim()),
        coins: Object.fromEntries(COINS.map(([k]) => [k, Math.max(0, +val("coin-" + k) || 0)])),
        vision: +val("vision") || 0, light: +val("light") || 0, reach: +val("reach") || 1,
        weapons: "", spells: "", inventory: ""
      };
      ABILITIES.forEach(([k]) => { fields[k] = Math.max(1, Math.min(30, +val(k) || 10)); });
      return fields;
    }
  };
}

/* Notas cortas de un conjuro en su fila: daño o cura y el estado */
function spellNote(sp) {
  const out = [];
  if (sp.heal) out.push("cura " + sp.heal + (sp.healMod ? " + mod." : ""));
  else if (sp.damage) out.push(`${sp.mode === "auto" ? sp.darts + "×" : ""}${sp.damage}${sp.type ? " " + sp.type : ""}`);
  if (sp.cond) out.push(conditionName(sp.cond).toLowerCase());
  return out.join(" · ");
}
