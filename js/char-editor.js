/* Editor de ficha. El DM lo abre para cualquiera; cada jugador, para la suya. */

import { modal, esc, toast, shrinkImage, imgURL, initials } from "./util.js";
import { ABILITIES, SKILLS, CONDITIONS, SHAPE_NAMES, normalizeChar, normalizeAttack, modOf, uid } from "./schema.js";
import { attacksOf, attackLabel } from "./attacks.js";
import { op, patchChar, uploadImage } from "./net.js";

const field = (label, name, value, type = "text", extra = "") =>
  `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value ?? "")}" ${extra}></label>`;

export function openCharEditor(source, { isDM = true, title } = {}) {
  const c = normalizeChar(source || {});
  const isNew = !source || !source.id;
  let avatarId = c.avatarId;

  const body = document.createElement("div");
  body.innerHTML = `
    <fieldset>
      <legend>Quién es</legend>
      <div class="row" style="align-items:flex-start">
        <div style="flex:0 0 96px">
          <div class="avatar" id="avPreview" style="width:78px;height:78px;font-size:22px;--tone:${esc(c.color)}">${initials(c.name)}</div>
          <button type="button" class="btn sm" id="avPick" style="margin-top:8px;width:78px">Retrato</button>
          <input type="file" id="avFile" accept="image/*" hidden>
        </div>
        <div style="flex:1 1 300px">
          ${field("Nombre", "name", c.name)}
          <div class="cols2">
            ${field("Clase", "className", c.className)}
            ${field("Raza", "race", c.race)}
            ${field("Nivel", "level", c.level, "number", 'min="1" max="20"')}
            ${field("Jugador", "player", c.player)}
          </div>
        </div>
      </div>
      <div class="cols2">
        ${field("Trasfondo", "background", c.background)}
        ${field("Alineamiento", "alignment", c.alignment)}
      </div>
      <label class="field"><span>Color de la ficha</span>
        <input name="color" type="color" value="${esc(c.color)}" style="height:38px;padding:2px"></label>
    </fieldset>

    <fieldset>
      <legend>En combate</legend>
      <div class="cols2">
        ${field("Puntos de vida", "hp", c.hp, "number")}
        ${field("Vida máxima", "maxHp", c.maxHp, "number", 'min="1"')}
        ${field("Vida temporal", "tempHp", c.tempHp, "number", 'min="0"')}
        ${field("Clase de armadura", "ac", c.ac, "number")}
        ${field("Iniciativa", "initiative", c.initiative, "number")}
        ${field("Velocidad (pies)", "speed", c.speed, "number")}
        ${field("Bonificador de competencia", "proficiency", c.proficiency, "number")}
        ${field("Dados de vida", "hitDice", c.hitDice, "text", 'placeholder="5d8"')}
        ${field("Visión en la oscuridad (casillas)", "vision", c.vision, "number", 'min="0" max="40"')}
        ${field("Luz que lleva encima (casillas)", "light", c.light, "number", 'min="0" max="40"')}
        ${field("Alcance cuerpo a cuerpo (casillas)", "reach", c.reach, "number", 'min="1" max="6"')}
        <label class="field"><span>Tamaño</span>
          <select name="size">
            ${["Diminuto", "Pequeño", "Mediano", "Grande", "Enorme", "Gargantuesco"].map(t =>
              `<option ${String(c.size).includes(t) ? "selected" : ""}>${t}</option>`).join("")}
          </select></label>
      </div>
      <p class="prose" style="font-size:12px;margin:0">Una antorcha alumbra 4 casillas; la visión en la oscuridad de un enano, 12. Los tamaños grandes ocupan más de una casilla en el mapa.</p>
    </fieldset>

    <fieldset>
      <legend>Ataques</legend>
      <div id="atkList"></div>
      <button type="button" class="btn sm" id="addAtk">Añadir ataque</button>
      <p class="prose" style="font-size:12px;margin-top:8px">Lo que apuntes aquí sale como botón para tirar en la mesa. Los ataques escritos en «Ataques y armas» o en las acciones de una criatura se detectan solos.</p>
      <p class="prose" style="font-size:12px;margin-top:6px">Si le pones un nivel, al usarlo gastará un espacio de conjuro y no te dejará lanzarlo cuando no te queden. Si le pones una forma, podrás ver su área sobre el mapa antes de decidir.</p>
    </fieldset>

    <fieldset>
      <legend>Características</legend>
      <div class="row">
        ${ABILITIES.map(([k, l]) => `<label class="field" style="flex:1 1 90px"><span>${l}</span>
          <input name="${k}" type="number" value="${c[k]}" min="1" max="30"></label>`).join("")}
      </div>
      <p class="prose" style="font-size:12px;margin:0 0 8px">Salvaciones con competencia</p>
      <div class="cond-grid" style="margin-bottom:12px">
        ${ABILITIES.map(([k, l]) => `<label><input type="checkbox" name="save" value="${k}" ${c.saves.includes(k) ? "checked" : ""}>${l}</label>`).join("")}
      </div>
      <p class="prose" style="font-size:12px;margin:0 0 8px">Habilidades con competencia</p>
      <div class="cond-grid">
        ${SKILLS.map(([id, name]) => `<label><input type="checkbox" name="skill" value="${id}" ${c.skills.includes(id) ? "checked" : ""}>${name}</label>`).join("")}
      </div>
    </fieldset>

    <fieldset>
      <legend>Espacios de conjuro</legend>
      <div class="row">
        ${c.slots.map((n, i) => `<label class="field" style="flex:1 1 70px"><span>Nivel ${i + 1}</span>
          <input name="slot${i}" type="number" min="0" max="9" value="${n}"></label>`).join("")}
      </div>
    </fieldset>

    <fieldset>
      <legend>Recursos propios</legend>
      <div id="resList"></div>
      <button type="button" class="btn sm" id="addRes">Añadir recurso</button>
      <p class="prose" style="font-size:12px;margin-top:8px">Inspiración bárbara, canalizar divinidad, puntos de ki…</p>
    </fieldset>

    <fieldset>
      <legend>Notas de la ficha</legend>
      <label class="field"><span>Ataques y armas</span><textarea name="weapons">${esc(c.weapons)}</textarea></label>
      <label class="field"><span>Conjuros</span><textarea name="spells">${esc(c.spells)}</textarea></label>
      <label class="field"><span>Equipo</span><textarea name="inventory">${esc(c.inventory)}</textarea></label>
      <label class="field"><span>Anotaciones</span><textarea name="notes">${esc(c.notes)}</textarea></label>
    </fieldset>`;

  /* Recursos */
  const resList = body.querySelector("#resList");
  const addRes = (r = { name: "", uses: 0, max: 1 }) => {
    const row = document.createElement("div");
    row.className = "row";
    row.style.marginBottom = "8px";
    row.innerHTML = `
      <input placeholder="Nombre" value="${esc(r.name)}" data-res="name" style="flex:2 1 160px">
      <input type="number" value="${r.uses}" data-res="uses" min="0" style="flex:0 1 80px" aria-label="Usados">
      <input type="number" value="${r.max}" data-res="max" min="0" style="flex:0 1 80px" aria-label="Total">
      <button type="button" class="btn sm danger" data-drop style="flex:0">Quitar</button>`;
    row.querySelector("[data-drop]").addEventListener("click", () => row.remove());
    resList.appendChild(row);
  };
  c.resources.forEach(addRes);
  body.querySelector("#addRes").addEventListener("click", () => addRes());

  /* Ataques */
  const atkList = body.querySelector("#atkList");
  const addAtk = (raw = {}) => {
    const a = normalizeAttack(raw);
    const row = document.createElement("div");
    row.className = "row";
    row.style.marginBottom = "8px";
    row.innerHTML = `
      <input placeholder="Espada larga" value="${esc(a.name)}" data-atk="name" style="flex:2 1 150px">
      <input type="number" value="${a.atk}" data-atk="atk" style="flex:0 1 70px" aria-label="Al ataque" title="Bonificador al ataque">
      <input placeholder="1d8+3" value="${esc(a.damage)}" data-atk="damage" style="flex:1 1 100px" aria-label="Daño">
      <input placeholder="cortante" value="${esc(a.type)}" data-atk="type" style="flex:1 1 100px" aria-label="Tipo de daño">
      <select data-atk="level" style="flex:0 1 110px" aria-label="Nivel de conjuro" title="Espacio de conjuro que gasta">
        <option value="0">Sin espacio</option>
        ${[1,2,3,4,5,6,7,8,9].map(n => `<option value="${n}" ${a.level === n ? "selected" : ""}>Nivel ${n}</option>`).join("")}
      </select>
      <select data-atk="shape" style="flex:0 1 130px" aria-label="Forma del área" title="Forma del área de efecto">
        ${SHAPE_NAMES.map(([k, n]) => `<option value="${k}" ${a.shape === k ? "selected" : ""}>${n}</option>`).join("")}
      </select>
      <input type="number" min="0" max="300" step="5" value="${a.size || 20}" data-atk="size" style="flex:0 1 80px" aria-label="Tamaño del área en pies" title="Tamaño del área, en pies">
      <button type="button" class="btn sm danger" data-drop style="flex:0">Quitar</button>`;
    row.querySelector("[data-drop]").addEventListener("click", () => row.remove());
    atkList.appendChild(row);
  };
  (c.attacks.length ? c.attacks : attacksOf(c).slice(0, 6)).forEach(addAtk);
  body.querySelector("#addAtk").addEventListener("click", () => addAtk());

  /* Retrato */
  const file = body.querySelector("#avFile");
  body.querySelector("#avPick").addEventListener("click", () => file.click());
  file.addEventListener("change", async () => {
    if (!file.files[0]) return;
    try {
      const { blob } = await shrinkImage(file.files[0], 192);
      avatarId = await uploadImage(blob);
      const prev = body.querySelector("#avPreview");
      prev.textContent = "";
      prev.style.backgroundImage = `url(${imgURL(avatarId)})`;
      prev.style.backgroundSize = "cover";
    } catch (err) { toast(err.message, "bad"); }
  });

  modal({
    title: title || (isNew ? "Nuevo personaje" : "Editar " + c.name),
    body,
    wide: true,
    actions: [
      { label: "Cancelar" },
      {
        label: isNew ? "Crear personaje" : "Guardar",
        tone: "primary",
        run: host => {
          const get = n => host.querySelector(`[name="${n}"]`);
          const val = n => (get(n) ? get(n).value : "");
          const fields = {
            name: val("name").trim() || "Sin nombre",
            className: val("className"), race: val("race"), player: val("player"),
            background: val("background"), alignment: val("alignment"), color: val("color"),
            level: +val("level") || 1, hp: +val("hp"), maxHp: Math.max(1, +val("maxHp")), tempHp: +val("tempHp"),
            ac: +val("ac"), initiative: +val("initiative"), speed: +val("speed"),
            proficiency: +val("proficiency") || 2, hitDice: val("hitDice"),
            avatarId,
            saves: [...host.querySelectorAll('[name="save"]:checked')].map(i => i.value),
            skills: [...host.querySelectorAll('[name="skill"]:checked')].map(i => i.value),
            slots: c.slots.map((_, i) => +val("slot" + i) || 0),
            resources: [...resList.children].map(row => ({
              name: row.querySelector('[data-res="name"]').value.trim(),
              uses: +row.querySelector('[data-res="uses"]').value || 0,
              max: +row.querySelector('[data-res="max"]').value || 0
            })).filter(r => r.name),
            weapons: val("weapons"), spells: val("spells"), inventory: val("inventory"), notes: val("notes"),
            vision: +val("vision") || 0, light: +val("light") || 0, reach: +val("reach") || 1, size: val("size") || "Mediano",
            attacks: [...atkList.children].map(row => {
              const f = k => row.querySelector(`[data-atk="${k}"]`).value;
              return normalizeAttack({
                name: f("name").trim(), atk: +f("atk") || 0,
                damage: f("damage").trim(), type: f("type").trim(),
                level: +f("level") || 0, shape: f("shape"), size: +f("size") || 20
              });
            }).filter(a => a.name)
          };
          ABILITIES.forEach(([k]) => { fields[k] = +val(k) || 10; });
          fields.slotsUsed = c.slotsUsed.map((u, i) => Math.min(u, fields.slots[i]));

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
