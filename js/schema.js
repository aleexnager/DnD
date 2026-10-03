/* Forma de los datos. Lo usan el servidor y el navegador, así que aquí no
   puede haber nada que dependa del DOM. */

import { CATALOG } from "./catalog.js";

export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
export const modOf = s => Math.floor((num(s, 10) - 10) / 2);
export const cellKey = (x, y) => x + "," + y;
export const edgeKey = (x, y, d) => x + "," + y + "," + d;

export function uid() {
  const c = globalThis.crypto;
  if (c && c.randomUUID) return c.randomUUID().slice(0, 18);
  return "id" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------- Estados ---------- */
export const CONDITIONS = [
  { id: "agarrado", name: "Agarrado", hint: "Velocidad 0. Termina si quien agarra queda incapacitado." },
  { id: "apresado", name: "Apresado", hint: "Velocidad 0, desventaja al atacar, ventaja para quien le ataque." },
  { id: "asustado", name: "Asustado", hint: "Desventaja mientras vea la fuente del miedo. No puede acercarse a ella." },
  { id: "aturdido", name: "Aturdido", hint: "Incapacitado, no se mueve, habla a duras penas. Falla salvaciones de FUE y DES." },
  { id: "cegado", name: "Cegado", hint: "Falla lo que exija vista. Desventaja al atacar, ventaja para quien le ataque." },
  { id: "derribado", name: "Derribado", hint: "Solo se arrastra. Desventaja al atacar. Ventaja al atacarle en cuerpo a cuerpo." },
  { id: "encantado", name: "Encantado", hint: "No puede atacar a quien le encanta; el otro tiene ventaja en trato social." },
  { id: "ensordecido", name: "Ensordecido", hint: "No oye y falla lo que exija oído." },
  { id: "envenenado", name: "Envenenado", hint: "Desventaja en ataques y pruebas de característica." },
  { id: "incapacitado", name: "Incapacitado", hint: "Sin acciones ni reacciones." },
  { id: "invisible", name: "Invisible", hint: "Ventaja al atacar, desventaja para quien le ataque." },
  { id: "paralizado", name: "Paralizado", hint: "Incapacitado, inmóvil. Golpes a 5 pies son críticos." },
  { id: "petrificado", name: "Petrificado", hint: "Convertido en piedra: incapacitado, resistente a todo el daño." },
  { id: "inconsciente", name: "Inconsciente", hint: "Derribado, incapacitado, sin conciencia de su entorno." },
  { id: "agotamiento", name: "Agotamiento", hint: "Acumulativo: desventaja, velocidad reducida y peor a cada nivel." },
  { id: "concentrado", name: "Concentrado", hint: "Al recibir daño, salvación de CON: CD 10 o la mitad del daño." }
];
export const conditionName = id => (CONDITIONS.find(c => c.id === id) || { name: id }).name;

/* ---------- Personajes y criaturas ---------- */
export const SKILLS = [
  ["acrobacias", "Acrobacias", "dex"], ["arcanos", "Arcanos", "int"], ["atletismo", "Atletismo", "str"],
  ["enganio", "Engaño", "cha"], ["historia", "Historia", "int"], ["interpretacion", "Interpretación", "cha"],
  ["intimidacion", "Intimidación", "cha"], ["investigacion", "Investigación", "int"],
  ["juego_de_manos", "Juego de manos", "dex"], ["medicina", "Medicina", "wis"],
  ["naturaleza", "Naturaleza", "int"], ["percepcion", "Percepción", "wis"],
  ["perspicacia", "Perspicacia", "wis"], ["persuasion", "Persuasión", "cha"],
  ["religion", "Religión", "int"], ["sigilo", "Sigilo", "dex"],
  ["supervivencia", "Supervivencia", "wis"], ["trato_con_animales", "Trato con animales", "wis"]
];
export const ABILITIES = [["str", "FUE"], ["dex", "DES"], ["con", "CON"], ["int", "INT"], ["wis", "SAB"], ["cha", "CAR"]];

const CHAR_DEFAULTS = {
  id: "", kind: "pc", name: "", claimedBy: "",
  className: "", race: "", level: 1, background: "", alignment: "", player: "",
  color: "#c89b4a", avatarId: "",
  hp: 10, maxHp: 10, tempHp: 0, ac: 10, initiative: 0, speed: 30, proficiency: 2,
  str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
  saves: [], skills: [], passivePerception: 0,
  conditions: [], exhaustion: 0, concentration: "", inspiration: false,
  hitDice: "", hitDiceUsed: 0, deathOk: 0, deathFail: 0,
  slots: [0, 0, 0, 0, 0, 0, 0, 0, 0], slotsUsed: [0, 0, 0, 0, 0, 0, 0, 0, 0],
  resources: [],
  weapons: "", spells: "", inventory: "", notes: "",
  monsterKey: "", size: "Mediano", sizeType: "", cr: "", xp: 0,
  senses: "", languages: "", resistances: "", traits: "", actions: "",
  hidden: false, discovered: false, lastSeen: null, mapId: "", mx: null, my: null,
  /* Nuevo en 2.1 */
  vision: 0,            // visión en la oscuridad, en casillas (0 = solo ve lo iluminado)
  light: 0,             // luz que lleva encima, en casillas (antorcha = 4)
  attacks: [],          // ataques listos para tirar
  condMeta: {},         // estado -> rondas que le quedan
  used: { action: false, bonus: false, reaction: false, move: 0 },
  reach: 1,             // alcance cuerpo a cuerpo, en casillas
  /* Conjuros */
  spellbook: [],        // conjuros que conoce, ya listos para lanzar
  castAbility: "",      // característica de lanzamiento (int, wis, cha)
  spellDC: 0,           // CD fija (0 = 8 + competencia + característica)
  spellAtk: 0           // ataque fijo (0 = competencia + característica)
};

/* Cuántas casillas ocupa cada tamaño, como en el manual: lo diminuto y lo
   pequeño comparten casilla con lo mediano, y de ahí para arriba el cuadrado
   crece. Un gargantuesco son 4×4. */
export const SIZE_CELLS = {
  "Diminuto": 1, "Pequeño": 1, "Mediano": 1, "Grande": 2, "Enorme": 3, "Gargantuesco": 4
};
export const SIZE_NAMES = Object.keys(SIZE_CELLS);

/* El bestiario escribe el tamaño dentro de una frase ("Gigante grande"), así
   que también se lee de ahí cuando no viene aparte. */
export function sizeFromText(text) {
  const t = String(text || "").toLowerCase();
  if (/gargantuesc|gargantuan/.test(t)) return "Gargantuesco";
  if (/enorme|huge/.test(t)) return "Enorme";
  if (/grande|large/.test(t)) return "Grande";
  if (/diminut|tiny/.test(t)) return "Diminuto";
  if (/pequeñ|small/.test(t)) return "Pequeño";
  if (/median|medium/.test(t)) return "Mediano";
  return "";
}

export const footprint = c =>
  SIZE_CELLS[sizeFromText(c.size) || sizeFromText(c.sizeType) || "Mediano"] || 1;

const asArray = (v, n, fill = 0) => {
  const out = Array.isArray(v) ? v.slice(0, n).map(x => num(x, fill)) : [];
  while (out.length < n) out.push(fill);
  return out;
};

export function normalizeChar(raw = {}) {
  const c = { ...CHAR_DEFAULTS, ...raw };
  c.id = raw.id || uid();
  c.kind = c.kind === "monster" ? "monster" : "pc";
  ["level", "hp", "maxHp", "tempHp", "ac", "initiative", "speed", "proficiency",
    "str", "dex", "con", "int", "wis", "cha", "deathOk", "deathFail", "xp", "exhaustion", "hitDiceUsed"]
    .forEach(k => { c[k] = num(c[k], CHAR_DEFAULTS[k]); });
  c.maxHp = Math.max(1, c.maxHp);
  c.level = clamp(c.level, 1, 20);
  c.hp = clamp(c.hp, 0, Math.max(c.maxHp, c.hp));
  c.deathOk = clamp(c.deathOk, 0, 3);
  c.deathFail = clamp(c.deathFail, 0, 3);
  c.exhaustion = clamp(c.exhaustion, 0, 6);
  c.slots = asArray(c.slots, 9);
  c.slotsUsed = asArray(c.slotsUsed, 9).map((v, i) => clamp(v, 0, c.slots[i]));
  c.conditions = Array.isArray(c.conditions)
    ? c.conditions.filter(x => typeof x === "string")
    : String(c.conditions || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  c.saves = Array.isArray(c.saves) ? c.saves : [];
  c.skills = Array.isArray(c.skills) ? c.skills : [];
  c.resources = Array.isArray(c.resources)
    ? c.resources.map(r => ({ name: String(r.name || ""), uses: num(r.uses), max: num(r.max) })).filter(r => r.name)
    : [];
  c.inspiration = !!c.inspiration;
  c.hidden = !!c.hidden;
  c.discovered = !!c.discovered;
  c.size = sizeFromText(raw.size) || sizeFromText(c.sizeType) || "Mediano";
  c.vision = clamp(Math.trunc(num(c.vision)), 0, 40);
  c.light = clamp(Math.trunc(num(c.light)), 0, 40);
  c.reach = clamp(Math.trunc(num(c.reach, 1)), 1, 6);
  c.attacks = Array.isArray(c.attacks) ? c.attacks.map(normalizeAttack).filter(a => a.name) : [];
  c.spellbook = Array.isArray(c.spellbook) ? c.spellbook.map(normalizeSpell).slice(0, 80) : [];
  c.castAbility = ["int", "wis", "cha"].includes(c.castAbility) ? c.castAbility : "";
  c.spellDC = clamp(Math.trunc(num(c.spellDC)), 0, 30);
  c.spellAtk = clamp(Math.trunc(num(c.spellAtk)), 0, 20);
  c.condMeta = c.condMeta && typeof c.condMeta === "object" && !Array.isArray(c.condMeta) ? { ...c.condMeta } : {};
  c.used = { action: false, bonus: false, reaction: false, move: 0, ...(c.used || {}) };
  c.mx = c.mx === null || c.mx === "" || !Number.isFinite(Number(c.mx)) ? null : Math.trunc(Number(c.mx));
  c.my = c.my === null || c.my === "" || !Number.isFinite(Number(c.my)) ? null : Math.trunc(Number(c.my));
  if (c.mx === null || c.my === null) { c.mx = null; c.my = null; c.mapId = ""; }
  return c;
}

export const SHAPE_KINDS = ["circle", "cone", "line", "square"];

export function normalizeAttack(raw = {}) {
  return {
    name: String(raw.name || "").slice(0, 48),
    atk: num(raw.atk),                       // bonificador al ataque
    damage: String(raw.damage || "1d6"),     // fórmula
    type: String(raw.type || ""),            // cortante, fuego...
    range: String(raw.range || ""),          // "alcance 5 pies", "alcance 80/320"
    save: String(raw.save || ""),            // "dex 13" -> salvación en vez de ataque
    note: String(raw.note || ""),
    /* Conjuros: qué espacio gasta y qué forma tiene su área */
    level: clamp(Math.trunc(num(raw.level)), 0, 9),   // 0 = no es un conjuro con espacio
    shape: SHAPE_KINDS.includes(raw.shape) ? raw.shape : "",
    size: clamp(num(raw.size, 20), 0, 300),  // radio o longitud, en pies
    width: clamp(num(raw.width, 5), 1, 60)   // ancho de la línea, en pies
  };
}

/* ---------- Conjuros ----------
   Un conjuro sabe qué hace, no solo cómo se llama:

   mode    attack  tirada de ataque de conjuro contra la CA (rays: varios rayos)
           save    salvación de cada objetivo (half: mitad de daño si la supera)
           auto    impacta siempre (proyectil mágico: darts dardos)
           heal    cura (healMod: suma la característica de lanzamiento)
           sleep   reparte una reserva de puntos de vida, de menos a más
           none    sin tirada: se anuncia, gasta el espacio y concentra
   damage  dados a nivel base; upcast: lo que suma por cada nivel de más
   scale   truco que crece a los niveles 5, 11 y 17 (scaleRays: en rayos)
   cond    estado que pone si falla la salvación o recibe el ataque
   shape   área para colocar en el mapa (circle, cone, line, square) */
export const SPELL_MODES = ["attack", "save", "auto", "heal", "sleep", "none"];
export const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
export function normalizeSpell(raw = {}) {
  const str = (v, n = 80) => String(v || "").slice(0, n);
  return {
    id: str(raw.id, 40) || uid(),
    name: str(raw.name, 48) || "Conjuro",
    level: clamp(Math.trunc(num(raw.level)), 0, 9),
    school: str(raw.school, 24), time: str(raw.time, 40), range: str(raw.range, 40),
    duration: str(raw.duration, 48), conc: !!raw.conc, desc: str(raw.desc, 400),
    mode: SPELL_MODES.includes(raw.mode) ? raw.mode : "none",
    save: ABILITY_KEYS.includes(raw.save) ? raw.save : "",
    half: !!raw.half,
    damage: str(raw.damage, 40), type: str(raw.type, 32), upcast: str(raw.upcast, 20),
    scale: !!raw.scale, scaleRays: !!raw.scaleRays,
    rays: clamp(Math.trunc(num(raw.rays, 1)), 1, 10), raysUp: clamp(Math.trunc(num(raw.raysUp)), 0, 3),
    darts: clamp(Math.trunc(num(raw.darts)), 0, 12),
    heal: str(raw.heal, 20), healMod: !!raw.healMod,
    cond: str(raw.cond, 24), condRounds: clamp(Math.trunc(num(raw.condRounds)), 0, 1000),
    failText: str(raw.failText, 80),
    targets: clamp(Math.trunc(num(raw.targets, 1)), 1, 20), targetsUp: clamp(Math.trunc(num(raw.targetsUp)), 0, 3),
    shape: SHAPE_KINDS.includes(raw.shape) ? raw.shape : "",
    size: clamp(num(raw.size, 0), 0, 300), width: clamp(num(raw.width, 5), 1, 60),
    melee: !!raw.melee
  };
}

/* Dados de más: "8d6" con dos niveles de más y "1d6" por nivel → "10d6" */
export function addDice(base, extra, times) {
  if (!extra || times <= 0) return base;
  const m = /^(\d*)d(\d+)$/i.exec(extra.trim());
  const b = /^(\d*)d(\d+)(.*)$/i.exec(String(base).trim());
  if (m && b && m[2] === b[2]) return `${(+(b[1] || 1)) + (+(m[1] || 1)) * times}d${b[2]}${b[3]}`;
  return Array.from({ length: times }, () => extra).reduce((f, e) => `${f}+${e}`, base);
}
/* Los trucos suben a los niveles 5, 11 y 17 */
export const cantripTier = level => level >= 17 ? 4 : level >= 11 ? 3 : level >= 5 ? 2 : 1;
export const scaleDice = (formula, times) => String(formula).replace(/^(\d*)d(\d+)/i, (m, n, f) => `${(+(n || 1)) * times}d${f}`);

export const SHAPE_NAMES = [
  ["", "Sin área"], ["circle", "Esfera o ráfaga"], ["cone", "Cono"],
  ["line", "Línea"], ["square", "Cubo"]
];

/* ---------- Bestiario ---------- */
const BEAST_DEFAULTS = {
  id: "", name: "", sizeType: "", cr: "1", xp: 0, ac: 12, hpAvg: 10, hpDice: "",
  speed: 30, str: 10, dex: 14, con: 10, int: 6, wis: 10, cha: 6,
  senses: "", languages: "", resistances: "", traits: "", actions: "",
  color: "#8a5a3b", custom: false, avatarId: "", size: "Mediano"
};
export function normalizeBeast(raw = {}) {
  const b = { ...BEAST_DEFAULTS, ...raw };
  b.id = raw.id || uid();
  b.size = sizeFromText(raw.size) || sizeFromText(b.sizeType) || "Mediano";
  ["xp", "ac", "hpAvg", "speed", "str", "dex", "con", "int", "wis", "cha"].forEach(k => { b[k] = num(b[k]); });
  b.hpAvg = Math.max(1, b.hpAvg);
  b.custom = !!b.custom;
  return b;
}

/* ---------- Mapas ---------- */
const MAP_DEFAULTS = {
  id: "", name: "Mazmorra", imageId: "", imageW: 0, imageH: 0,
  lockRatio: true, cols: 28, rows: 18, grid: true,
  radius: 5, remember: true,
  camera: "full", followSpan: 14, partyZoom: 1,
  explored: [], edges: {}, notes: "",
  /* Nuevo en 2.1 */
  dark: false,          // si está a oscuras, solo se ve lo que alumbran las antorchas
  diagonals: "5e",      // "5e" (cada diagonal 5 pies) o "alt" (5-10-5)
  feet: 5,              // pies por casilla
  cells: {},            // casillas pintadas: niebla, oscuridad o luz fija
  shapes: [],           // plantillas de área puestas en el tablero
  pins: [],             // chinchetas con nota
  portals: [],          // accesos a otros mapas
  playerZoom: true      // dejar que los jugadores se acerquen
};
export function normalizeMap(raw = {}) {
  const m = { ...MAP_DEFAULTS, ...raw };
  m.id = raw.id || uid();
  m.name = String(m.name || "Mazmorra");
  m.cols = clamp(Math.trunc(num(m.cols, 28)), 5, 90);
  m.rows = clamp(Math.trunc(num(m.rows, 18)), 5, 70);
  m.radius = clamp(Math.trunc(num(m.radius, 5)), 1, 40);
  m.followSpan = clamp(Math.trunc(num(m.followSpan, 14)), 4, 60);
  m.partyZoom = clamp(num(m.partyZoom, 1), 1, 8);
  m.imageW = Math.max(0, Math.trunc(num(m.imageW)));
  m.imageH = Math.max(0, Math.trunc(num(m.imageH)));
  m.lockRatio = m.lockRatio !== false;
  m.grid = m.grid !== false;
  m.remember = m.remember !== false;
  m.camera = m.camera === "follow" ? "follow" : "full";
  m.explored = Array.isArray(m.explored) ? m.explored.filter(k => typeof k === "string") : [];
  m.dark = !!m.dark;
  m.playerZoom = m.playerZoom !== false;
  m.feet = clamp(Math.trunc(num(m.feet, 5)), 1, 100);
  m.diagonals = m.diagonals === "alt" ? "alt" : "5e";
  m.cells = m.cells && typeof m.cells === "object" && !Array.isArray(m.cells) ? { ...m.cells } : {};
  m.shapes = Array.isArray(m.shapes) ? m.shapes.map(normalizeShape).slice(0, 40) : [];
  m.pins = Array.isArray(m.pins) ? m.pins.map(normalizePin).slice(0, 60) : [];
  m.portals = Array.isArray(m.portals) ? m.portals.map(normalizePortal).slice(0, 40) : [];
  m.edges = m.edges && typeof m.edges === "object" && !Array.isArray(m.edges) ? { ...m.edges } : {};
  /* Capas por casilla que pinta el DM:
     rough  terreno difícil (cuesta el doble de movimiento)
     rooms  salas que se revelan enteras al entrar
     vis    «show» se ve siempre, «hide» no se ve nunca */
  const layer = v => v && typeof v === "object" && !Array.isArray(v) ? { ...v } : {};
  m.rough = layer(m.rough);
  m.rooms = layer(m.rooms);
  m.vis = layer(m.vis);
  m.drawings = Array.isArray(m.drawings) ? m.drawings.map(normalizeDrawing).filter(d => d.points.length > 1).slice(-150) : [];
  return m;
}

/* Un trazo a mano alzada sobre el plano. Los puntos van en casillas (con
   decimales), así el dibujo sigue en su sitio aunque cambie el zoom. */
export function normalizeDrawing(raw = {}) {
  const pts = Array.isArray(raw.points) ? raw.points : [];
  return {
    id: raw.id || uid(),
    points: pts.slice(0, 800)
      .filter(p => Array.isArray(p) && Number.isFinite(+p[0]) && Number.isFinite(+p[1]))
      .map(p => [Math.round(+p[0] * 100) / 100, Math.round(+p[1] * 100) / 100]),
    color: /^#[0-9a-f]{3,8}$/i.test(String(raw.color || "")) ? raw.color : "#e0bd76",
    width: clamp(num(raw.width, 0.08), 0.02, 0.6),        // grosor, en casillas
    party: raw.party !== false,
    by: String(raw.by || "").slice(0, 24),
    byId: String(raw.byId || "")
  };
}

/* Lo que se puede pintar sobre una casilla y qué le hace a la vista:

   niebla     estorba: ver a través de ella cuesta el triple, así que el alcance
              de la vista se desploma dentro de un banco de niebla o de humo.
   oscuridad  tapa: no se ve a través, solo la casilla de al lado. Sirve para
              humo denso, una zarza cerrada o un conjuro de oscuridad.
   luz        alumbra siempre: un brasero o una antorcha de pared, que se ve
              aunque el mapa esté a oscuras y nadie lleve fuego encima. */
export const CELL_KINDS = [
  ["fog", "Niebla", "Ver a través cuesta el triple"],
  ["dark", "Oscuridad", "No se ve a través"],
  ["lit", "Luz fija", "Alumbrada siempre"]
];
export const SIGHT_COST = { fog: 3, dark: Infinity, lit: 1 };

export function normalizeShape(raw = {}) {
  return {
    id: raw.id || uid(),
    kind: SHAPE_KINDS.includes(raw.kind) ? raw.kind : "circle",
    x: num(raw.x), y: num(raw.y),           // origen, en casillas (con decimales)
    size: clamp(num(raw.size, 20), 1, 300),  // radio o longitud en pies
    width: clamp(num(raw.width, 5), 1, 60),  // ancho de la línea, en pies
    angle: num(raw.angle),                   // dirección en radianes
    color: String(raw.color || "#8878d8"),
    label: String(raw.label || "").slice(0, 40),
    party: raw.party !== false               // ¿la ve la party?
  };
}
export const PIN_KINDS = [
  ["nota", "Nota"], ["peligro", "Peligro"], ["tesoro", "Tesoro"], ["pregunta", "Algo raro"]
];
export function normalizePin(raw = {}) {
  const kind = PIN_KINDS.some(([k]) => k === raw.kind) ? raw.kind : "nota";
  return {
    id: raw.id || uid(),
    x: Math.trunc(num(raw.x)), y: Math.trunc(num(raw.y)),
    text: String(raw.text || "").slice(0, 400),
    kind,
    party: !!raw.party,                      // por defecto solo la ve el DM
    discovered: !!raw.discovered,            // la party ya la ha tenido a la vista
    seen: !!raw.seen                         // ya la ha pisado alguien
  };
}
export function normalizePortal(raw = {}) {
  return {
    id: raw.id || uid(),
    x: Math.trunc(num(raw.x)), y: Math.trunc(num(raw.y)),
    toMap: String(raw.toMap || ""),
    toX: raw.toX === null || raw.toX === undefined ? null : Math.trunc(num(raw.toX)),
    toY: raw.toY === null || raw.toY === undefined ? null : Math.trunc(num(raw.toY)),
    label: String(raw.label || "Escalera").slice(0, 40),
    auto: raw.auto !== false,                // llevar al pisarlo
    ask: raw.ask !== false                   // y preguntar antes quién cruza
  };
}

/* ---------- Sesión ---------- */
const SESSION_DEFAULTS = {
  title: "Campaña sin nombre",
  locked: false,
  activeMapId: "", focusId: "",
  combat: { on: false, round: 1, index: 0, order: [] },
  showMapToParty: true, revealAll: false, allowPlayerMove: true, showPartyHP: true,
  notes: "",
  /* Nuevo en 2.1 */
  ping: null,           // señal efímera en el mapa
  handoutId: "",        // imagen que el DM enseña a todos
  handoutText: "",
  requests: [],         // tiradas pedidas a los jugadores
  showFoeHP: false,     // ¿enseñar a la party la vida de los enemigos?
  showMoveRange: true,  // pintar el alcance al arrastrar
  autoSkipDown: true    // saltar en la iniciativa a los que están fuera de combate
};

export function emptyDoc(catalog = CATALOG) {
  const map = normalizeMap({ name: "Mazmorra" });
  return {
    version: 7,
    chars: [],
    bestiary: catalog.map(normalizeBeast),
    maps: [map],
    session: { ...SESSION_DEFAULTS, combat: { ...SESSION_DEFAULTS.combat, order: [] }, activeMapId: map.id },
    log: []
  };
}

/* Acepta lo nuevo y también las copias de la versión anterior:
   { party, bestiary, maps, activeMapId } o directamente un array de fichas. */
export function migrate(raw) {
  const src = Array.isArray(raw) ? { party: raw } : (raw && typeof raw === "object" ? raw : {});
  const chars = (Array.isArray(src.chars) ? src.chars : Array.isArray(src.party) ? src.party : []).map(old => {
    const c = { ...old };
    if (old && old.hiddenFromParty !== undefined) c.hidden = old.hiddenFromParty;
    if (old && old.themeColor && !c.color) c.color = old.themeColor;
    if (old && (old.slots1 !== undefined || old.spellSlots1 !== undefined)) {
      c.slots = []; c.slotsUsed = [];
      for (let i = 1; i <= 9; i++) {
        c.slots.push(num(old["slots" + i] ?? old["spellSlots" + i]));
        c.slotsUsed.push(num(old["slotsUsed" + i]));
      }
    }
    if (old && old.resourceName) c.resources = [{ name: old.resourceName, uses: num(old.resourceUses), max: num(old.resourceMax || old.resourceUses) }];
    return normalizeChar(c);
  });

  const maps = (Array.isArray(src.maps) && src.maps.length ? src.maps : [src.map || {}]).map(normalizeMap);
  const session = {
    ...SESSION_DEFAULTS,
    ...(src.session || {}),
    combat: { ...SESSION_DEFAULTS.combat, ...((src.session && src.session.combat) || src.combat || {}) }
  };
  session.combat = { on: false, round: 1, index: 0, order: [], ...session.combat };
  session.combat.order = Array.isArray(session.combat.order) ? session.combat.order : [];
  session.requests = Array.isArray(session.requests) ? session.requests : [];
  session.ping = null;
  if (!maps.some(m => m.id === session.activeMapId)) session.activeMapId = maps[0].id;
  if (src.activeMapId && maps.some(m => m.id === src.activeMapId)) session.activeMapId = src.activeMapId;
  chars.forEach(c => { if (c.mx !== null && !maps.some(m => m.id === c.mapId)) c.mapId = session.activeMapId; });

  return {
    version: 7,
    chars,
    bestiary: (Array.isArray(src.bestiary) && src.bestiary.length ? src.bestiary : CATALOG).map(normalizeBeast),
    maps,
    session,
    log: Array.isArray(src.log) ? src.log.slice(-150) : []
  };
}

/* ---------- Utilidades de combate ---------- */
export const XP_BUDGET = {   // umbrales por personaje y nivel (fácil, media, difícil, mortal)
  1: [25, 50, 75, 100], 2: [50, 100, 150, 200], 3: [75, 150, 225, 400], 4: [125, 250, 375, 500],
  5: [250, 500, 750, 1100], 6: [300, 600, 900, 1400], 7: [350, 750, 1100, 1700], 8: [450, 900, 1400, 2100],
  9: [550, 1100, 1600, 2400], 10: [600, 1200, 1900, 2800], 11: [800, 1600, 2400, 3600], 12: [1000, 2000, 3000, 4500],
  13: [1100, 2200, 3400, 5100], 14: [1250, 2500, 3800, 5700], 15: [1400, 2800, 4300, 6400], 16: [1600, 3200, 4800, 7200],
  17: [2000, 3900, 5900, 8800], 18: [2100, 4200, 6300, 9500], 19: [2400, 4900, 7300, 10900], 20: [2800, 5700, 8500, 12700]
};
export const MULTIPLIERS = [[1, 1], [2, 1.5], [3, 2], [7, 2.5], [11, 3], [15, 4]];
export function encounterDifficulty(pcs, monsters) {
  const alive = monsters.filter(m => m.hp > 0);
  if (!alive.length || !pcs.length) return null;
  const raw = alive.reduce((s, m) => s + num(m.xp), 0);
  const mult = [...MULTIPLIERS].reverse().find(([n]) => alive.length >= n)[1];
  const adjusted = Math.round(raw * mult);
  const budget = pcs.reduce((acc, p) => {
    const t = XP_BUDGET[clamp(p.level, 1, 20)];
    return acc.map((v, i) => v + t[i]);
  }, [0, 0, 0, 0]);
  const labels = ["trivial", "fácil", "media", "difícil", "mortal"];
  let i = 0;
  while (i < 4 && adjusted >= budget[i]) i++;
  return { raw, adjusted, label: labels[i], budget };
}
