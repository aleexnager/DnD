/* Completa el bestiario de serie con todas las criaturas del SRD 5.2.1 (las
   reglas de 2024 de Wizards of the Coast, CC BY 4.0).

   La fuente es el paquete @opencharacter/5e-srd-5.2 (CC BY 4.0), que trae el
   SRD 5.2.1 por campos: perfil en YAML y textos en inglés en i18n/en.json.

     npm pack @opencharacter/5e-srd-5.2 && tar xzf opencharacter-5e-srd-5.2-*.tgz
     node tools/bestiario-srd.mjs package                 # reescribe bestiario-datos.js
     node tools/bestiario-srd.mjs package --pendientes x.json   # frases sin traducir

   Las fichas que ya estaban en el bestiario y se tradujeron a mano se quedan
   tal cual: solo se generan las que faltan, marcadas con «auto: true», y cada
   pasada vuelve a generar esas. El castellano sale de tres sitios:
   - lo estructurado (tamaño, tipo, velocidad, sentidos, defensas, la tirada
     de cada ataque, la CD de cada salvación) se traduce aquí, con diccionario;
   - los nombres y las frases sueltas, de tools/bestiario-srd-es.json, donde
     cada frase va con los números cambiados por {0}, {1}… y la criatura por
     {C}, para que una traducción sirva a todos los dragones de un color;
   - los nombres de conjuros, de la biblioteca de conjuros de Mesa. */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const PKG = process.argv[2];
if (!PKG || !existsSync(path.join(PKG, "content", "monsters"))) {
  console.error("Uso: node tools/bestiario-srd.mjs ruta/al/paquete [--pendientes salida.json]");
  process.exit(1);
}
const flag = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const PENDING_OUT = flag("--pendientes");

/* ---------- YAML mínimo: solo lo que usa el paquete en «fields» ---------- */
function readFields(file) {
  const lines = readFileSync(file, "utf8").split("\n");
  const out = {};
  let inFields = false, key = null, buf = null;
  const scalar = v => {
    v = v.trim();
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    if (v === "true") return true;
    if (v === "false") return false;
    return v.replace(/^['"]|['"]$/g, "");
  };
  const flow = s => s.replace(/^\[|\]$/g, "").split(",").map(x => x.trim()).filter(Boolean).map(scalar);
  for (const raw of lines) {
    if (/^\S/.test(raw)) { inFields = raw.startsWith("fields:"); key = null; continue; }
    if (!inFields) continue;
    if (buf !== null) { buf += " " + raw.trim(); if (raw.includes("]")) { out[key] = flow(buf.trim()); buf = null; } continue; }
    let m = raw.match(/^ {2}([A-Za-z0-9]+):\s*(.*)$/);
    if (m) {
      key = m[1];
      const v = m[2];
      if (v === "") out[key] = [];
      else if (v.startsWith("[") && !v.includes("]")) buf = v;
      else if (v.startsWith("[")) out[key] = flow(v);
      else out[key] = scalar(v);
      continue;
    }
    m = raw.match(/^ {4}- (.+)$/);
    if (m && key && Array.isArray(out[key])) out[key].push(scalar(m[1]));
    else if (/^ {4}\[/.test(raw) && key) { buf = raw.trim(); if (raw.includes("]")) { out[key] = flow(buf); buf = null; } }
  }
  return out;
}

const EN = JSON.parse(readFileSync(path.join(PKG, "dist", "i18n", "en.json"), "utf8"));
const T = k => EN[k] || "";
const ES = JSON.parse(readFileSync(path.join(HERE, "bestiario-srd-es.json"), "utf8"));
ES.nombres ||= {}; ES.frases ||= {}; ES.criaturas ||= {}; ES.equipo ||= {}; ES.notas ||= {};

/* Conjuros: inglés -> castellano, de la biblioteca de Mesa */
const { EN: SPELL_EN } = await import(path.join(ROOT, "public/js/libros/conjuros-mec.js"));
const { ROWS } = await import(path.join(ROOT, "public/js/libros/conjuros-lista.js"));
const slug = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const SPELL_ES = {};
for (const r of ROWS) { const en = SPELL_EN[slug(r[0])]; if (en) SPELL_ES[en.toLowerCase()] = r[0]; }

/* ---------- Diccionarios ---------- */
const TYPES = {
  aberration: ["Aberración", "f"], beast: ["Bestia", "f"], celestial: ["Celestial", "m"], construct: ["Constructo", "m"],
  dragon: ["Dragón", "m"], elemental: ["Elemental", "m"], fey: ["Feérico", "m"], fiend: ["Infernal", "m"],
  giant: ["Gigante", "m"], humanoid: ["Humanoide", "m"], monstrosity: ["Monstruosidad", "f"], ooze: ["Cieno", "m"],
  plant: ["Planta", "f"], undead: ["Muerto viviente", "m"]
};
const PLURAL_TYPE = { beast: "bestias", monstrosity: "monstruosidades", undead: "muertos vivientes" };
const SIZES = {
  tiny: ["diminuto", "diminuta"], small: ["pequeño", "pequeña"], medium: ["mediano", "mediana"],
  large: ["grande", "grande"], huge: ["enorme", "enorme"], gargantuan: ["gargantuesco", "gargantuesca"]
};
const TAGS = {
  chromatic: "cromático", metallic: "metálico", dinosaur: "dinosaurio", wizard: "mago", demon: "demonio", devil: "diablo",
  goblinoid: "goblinoide", angel: "ángel", genie: "genio", druid: "druida", titan: "titán", cleric: "clérigo", lycanthrope: "licántropo"
};
const ALIGN = {
  "lawful-good": ["legal bueno", "Lawful Good"], "neutral-good": ["neutral bueno", "Neutral Good"], "chaotic-good": ["caótico bueno", "Chaotic Good"],
  "lawful-neutral": ["legal neutral", "Lawful Neutral"], neutral: ["neutral", "Neutral"], "chaotic-neutral": ["caótico neutral", "Chaotic Neutral"],
  "lawful-evil": ["legal malvado", "Lawful Evil"], "neutral-evil": ["neutral malvado", "Neutral Evil"], "chaotic-evil": ["caótico malvado", "Chaotic Evil"],
  unaligned: ["sin alineamiento", "Unaligned"]
};
const DAMAGE = {
  acid: "ácido", bludgeoning: "contundente", cold: "frío", fire: "fuego", force: "fuerza", lightning: "relámpago",
  necrotic: "necrótico", piercing: "perforante", poison: "veneno", psychic: "psíquico", radiant: "radiante", slashing: "cortante", thunder: "trueno"
};
const CONDITIONS = {
  blinded: "cegado", charmed: "encantado", deafened: "ensordecido", exhaustion: "agotamiento", frightened: "asustado",
  grappled: "agarrado", incapacitated: "incapacitado", invisible: "invisible", paralyzed: "paralizado", petrified: "petrificado",
  poisoned: "envenenado", prone: "derribado", restrained: "apresado", stunned: "aturdido", unconscious: "inconsciente"
};
const SKILLS = {
  acrobatics: ["Acrobacias", "dex"], "animal-handling": ["Trato con animales", "wis"], arcana: ["Arcanos", "int"], athletics: ["Atletismo", "str"],
  deception: ["Engaño", "cha"], history: ["Historia", "int"], insight: ["Perspicacia", "wis"], intimidation: ["Intimidación", "cha"],
  investigation: ["Investigación", "int"], medicine: ["Medicina", "wis"], nature: ["Naturaleza", "int"], perception: ["Percepción", "wis"],
  performance: ["Interpretación", "cha"], persuasion: ["Persuasión", "cha"], religion: ["Religión", "int"],
  "sleight-of-hand": ["Juego de manos", "dex"], stealth: ["Sigilo", "dex"], survival: ["Supervivencia", "wis"]
};
const LANGS = {
  common: "común", "deep-speech": "habla profunda", draconic: "dracónico", primordial: "primordial", "thieves-cant": "jerga de ladrones",
  abyssal: "abisal", infernal: "infernal", goblin: "goblin", elvish: "élfico", sylvan: "silvano", undercommon: "infracomún",
  giant: "gigante", druidic: "druídico", celestial: "celestial", otyugh: "otyugh", sahuagin: "sahuagin", worg: "huargo",
  dwarvish: "enano", gnomish: "gnomo", halfling: "mediano", orc: "orco"
};
const NUM_ES = ["", "un", "dos", "tres", "cuatro", "cinco", "seis"];
const NUM_EN = ["", "one", "two", "three", "four", "five", "six"];
const ABIL_ES = { str: "Fuerza", dex: "Destreza", con: "Constitución", int: "Inteligencia", wis: "Sabiduría", cha: "Carisma" };
const ABIL_FROM_EN = { Strength: "str", Dexterity: "dex", Constitution: "con", Intelligence: "int", Wisdom: "wis", Charisma: "cha" };
const XP = { 0: 10, 0.125: 25, 0.25: 50, 0.5: 100 };
const crText = cr => cr === 0.125 ? "1/8" : cr === 0.25 ? "1/4" : cr === 0.5 ? "1/2" : String(cr);
const pbFor = cr => cr < 5 ? 2 : cr < 9 ? 3 : cr < 13 ? 4 : cr < 17 ? 5 : cr < 21 ? 6 : cr < 25 ? 7 : cr < 29 ? 8 : 9;
const mod = n => Math.floor((n - 10) / 2);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
/* Tras «Fallo:» o «Desencadenante:» sigue en minúscula, salvo un nombre propio */
const low = s => s && /^(El|La|Los|Las|Una?|Si|Se|Mientras|Cada|Hasta|Al|Recibe|Queda|Puede|Tiene|Solo|Elige|Esta?)\b/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
const title = s => s.split(/([ -])/).map(w => /^(of|and|the|or)$/.test(w) ? w : cap(w)).join("");
const sign = n => (n >= 0 ? "+" : "") + n;
const list = (items, and = "y") => items.length < 2 ? items.join("") : items.slice(0, -1).join(", ") + ` ${and} ` + items[items.length - 1];
const deref = id => String(id).replace(/^[a-z-]+\./, "");

/* «13 (2d6 + 5)» -> «2d6+5»: la mesa tira la fórmula, la media sobra */
const dice = s => String(s).replace(/\s+/g, "").replace(/−/g, "-");
const stripAverages = s => s.replace(/\b\d+ \((\d+d\d+(?:\s*[+−-]\s*\d+)?)\)/g, (m, d) => dice(d));
const plain = s => stripAverages(String(s).replace(/\*/g, "")).replace(/\s*\n+\s*/g, " ").replace(/ ([,.;)])/g, "$1").trim();

/* ---------- Frases: plantilla con números y criatura sustituidos ---------- */
const pending = new Map();   // plantilla -> ejemplo, para traducir
function template(text, refs) {
  let t = text;
  const nums = [];
  for (const r of refs) {
    const re = new RegExp(`\\b[Tt]he ${r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    t = t.replace(re, "{C}");
  }
  t = t.replace(/\d+d\d+(?:[+-]\d+)?|\d+(?:\.\d+)?/g, m => { nums.push(m); return `{${nums.length - 1}}`; });
  return { key: t, nums };
}
function fill(es, nums, who) {
  const out = es.replace(/\{(\d+)\}/g, (m, i) => nums[i] ?? m).replace(/\{C\}/g, who);
  return out.replace(/\bde el\b/g, "del").replace(/\ba el\b/g, "al");
}

/* Frases que se repiten con otro nombre dentro: se traducen con regla, no
   una a una, y así salen siempre igual. */
const COUNT = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
const actName = en => ES.nombres[en] ?? spellName(en) ?? null;
function ruled(key) {
  /* «{C} makes two Rend attacks» / «… one Bite attack and two Claw attacks, and uses Roar» */
  let m = key.match(/^\{C\} makes (.+)\.$/);
  if (m) {
    const parts = m[1].split(/,? and |, /);
    const es = parts.map(p => {
      let x = p.match(/^(one|two|three|four|five|six) (.+?) attacks?$/);
      if (x) { const n = actName(x[2]); return n && `${COUNT[x[1]] === 1 ? "un ataque" : `${NUM_ES[COUNT[x[1]]]} ataques`} de ${n}`; }
      x = p.match(/^uses (.+?)(?: (twice))?$/);
      if (x) { const n = actName(x[1]); return n && `usa ${n}${x[2] ? " dos veces" : ""}`; }
      return null;
    });
    if (es.every(Boolean)) return `Hace ${list(es)}.`;
  }
  m = key.match(/^\{C\} makes (two|three|four|five|six) attacks, using (.+?) in any combination\.$/);
  if (m) {
    const names = m[2].split(/,? or |, /).map(actName);
    if (names.every(Boolean)) return `Hace ${NUM_ES[COUNT[m[1]]]} ataques, con ${names.slice(0, -1).join(", ")} o ${names[names.length - 1]} en cualquier combinación.`;
  }
  m = key.match(/^It can replace (one|two|any) attacks? with a use of Spellcasting to cast (.+?)\.$/);
  if (m) {
    const lv = m[2].match(/^(.+?) \(level (\{\d\}) version\)$/);
    const n = lv ? (spellName(lv[1]) && `${spellName(lv[1])} (versión de nivel ${lv[2]})`) : spellName(m[2]);
    const which = { one: "un ataque", two: "dos ataques", any: "cualquier ataque" }[m[1]];
    if (n) return `Puede cambiar ${which} por un uso de Lanzamiento de conjuros para lanzar ${n}.`;
  }
  m = key.match(/^It can replace (one|two|any) attacks? with (?:a use of (.+?)|an? (.+?) attack)\.$/);
  if (m) {
    const n = actName(m[2] || m[3]);
    const which = { one: "un ataque", two: "dos ataques", any: "cualquier ataque" }[m[1]];
    if (n) return m[2] ? `Puede cambiar ${which} por un uso de ${n}.` : `Puede cambiar ${which} por un ataque de ${n}.`;
  }
  m = key.match(/^\{C\} uses Spellcasting to cast (.+?)\.$/);
  if (m) {
    const lv = m[1].match(/^(.+?) \(level (\{\d\}) version\)$/);
    const n = lv ? (spellName(lv[1]) && `${spellName(lv[1])} (versión de nivel ${lv[2]})`) : spellName(m[1]);
    if (n) return `Usa Lanzamiento de conjuros para lanzar ${n}.`;
  }
  return null;
}
/* Traduce una frase suelta. «who» es como se nombra a la criatura en castellano. */
function phrase(text, ctx, opts = {}) {
  const src = String(text || "").trim();
  if (!src) return "";
  const { key, nums } = template(src, ctx.refs);
  const es = ES.frases[key] ?? ruled(key);
  if (es !== null && es !== undefined) {
    const out = fill(es, nums, ctx.who);
    return opts.lower ? out : cap(out);
  }
  if (!opts.quiet && !pending.has(key)) pending.set(key, { ejemplo: src, criatura: ctx.en });
  return null;
}
/* Una frase compuesta se traduce entera si está, o frase a frase si no */
function sentences(text, ctx) {
  const whole = phrase(text, ctx, { quiet: true });
  if (whole !== null) return whole;
  const parts = String(text).match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g) || [text];
  if (parts.length < 2) return phrase(text, ctx);
  const done = parts.map(p => phrase(p.trim(), ctx));
  return done.some(x => x === null) ? null : done.join(" ");
}

/* ---------- Partes fijas de las acciones ---------- */
function damageText(s) {
  /* «1d10+8 Slashing damage plus 2d4 Fire damage» */
  const re = /^(\d+d\d+(?:[+-]\d+)?|\d+) (\w+) damage(?: plus (\d+d\d+(?:[+-]\d+)?|\d+) (\w+) damage)?/;
  const m = s.match(re);
  if (!m || !DAMAGE[m[2].toLowerCase()]) return null;
  const es = `${m[1]} ${DAMAGE[m[2].toLowerCase()]}` + (m[3] ? ` más ${m[3]} ${DAMAGE[m[4].toLowerCase()]}` : "");
  return { es, en: m[0], rest: s.slice(m[0].length) };
}
function rangeES(s) {
  return s.replace(/reach (\d+) ft\.?/g, "alcance $1 pies").replace(/range (\d+(?:\/\d+)?) ft\.?/g, "distancia $1 pies").replace(/ or /g, " o ").replace(/\.$/, "");
}
function spellName(en) {
  const m = en.match(/^(.+?)(?: \(level (\d+) version\))?$/);
  const es = SPELL_ES[m[1].trim().toLowerCase()];
  if (!es) return null;
  return m[2] ? `${es} (versión de nivel ${m[2]})` : es;
}
/* «*At Will:* *Detect Magic*, *Fireball* (level 5 version)» -> lista en castellano */
function spellList(body) {
  const groups = [];
  for (const m of body.matchAll(/\*(At Will|\d\/Day(?: Each)?):\*\s*([^\n]+)/g)) {
    const spells = m[2].split(/,\s*(?![^()]*\))/).map(x => x.replace(/\*/g, "").trim()).filter(Boolean);
    const es = spells.map(sp => {
      const note = sp.match(/^(.+?)\s*\((.+)\)$/);
      const base = note ? note[1] : sp;
      const n = spellName(base) || (note && spellName(sp));
      if (!n) return null;
      if (note && !/level \d+ version/.test(note[2])) return `${n} (${ES.notas[note[2]] ?? null})`;
      return note && /level/.test(note[2]) ? spellName(sp) : n;
    });
    if (es.some(x => x === null || /\(null\)/.test(x))) return null;
    const label = m[1] === "At Will" ? "a voluntad" : m[1].replace(/(\d)\/Day( Each)?/, (x, n, each) => `${n}/día${each ? " cada uno" : ""}`);
    groups.push({ es: `${label}, ${list(es)}`, en: `${m[1]}: ${spells.join(", ")}` });
  }
  return groups;
}

/* ---------- Una criatura ---------- */
const MON = path.join(PKG, "content", "monsters");
const files = readdirSync(MON).filter(f => f.endsWith(".yaml")).sort();

function convert(file) {
  const id = file.replace(/\.yaml$/, "");
  const f = readFields(path.join(MON, file));
  const name = T(`monsters.${id}.name`);
  const cr = Number(f.cr);
  const pb = pbFor(cr);
  const info = ES.criaturas[name] || {};
  const nameEs = info.nombre ?? null;
  const who = info.ref || "la criatura";
  /* Cómo se llama a sí misma en el texto inglés: «the dragon», «the werebear» */
  const lower = name.toLowerCase();
  /* «the goblin» en el jefe goblin, «the sphinx» en las esfinges, «the rug»… */
  const words = lower.split(/[\s-]+/).filter(w => !/^(of|the|and|adult|ancient|young)$/.test(w));
  const refs = [...new Set([lower, ...(info.refsEn || []), ...words, ...(f.swarmOf ? ["swarm"] : [])])].sort((a, b) => b.length - a.length);
  const ctx = { refs, who, en: name };
  const missing = [];
  const need = (v, what) => { if (v === null || v === undefined) missing.push(what); return v ?? ""; };

  /* Tamaño, tipo y etiqueta */
  const [typeEs, g] = TYPES[f.creatureType];
  const sz = k => SIZES[k][g === "f" ? 1 : 0];
  const tag = f.typeTag ? ` (${TAGS[f.typeTag]})` : "";
  let sizeType, sizeTypeEn;
  if (f.swarmOf) {
    sizeType = `Enjambre ${SIZES[f.size][0]} de ${PLURAL_TYPE[f.creatureType] || typeEs.toLowerCase() + "s"} ${SIZES[f.swarmOf][PLURAL_TYPE[f.creatureType] === "muertos vivientes" ? 0 : 1]}s`;
    sizeTypeEn = `${cap(f.size)} Swarm of ${cap(f.swarmOf)} ${{ monstrosity: "Monstrosities", undead: "Undead" }[f.creatureType] || cap(f.creatureType) + "s"}`;
  } else {
    sizeType = `${typeEs} ${sz(f.size)}${f.sizeAlt ? " o " + sz(f.sizeAlt) : ""}${tag}`;
    sizeTypeEn = `${cap(f.size)}${f.sizeAlt ? " or " + cap(f.sizeAlt) : ""} ${f.creatureType}${f.typeTag ? ` (${f.typeTag})` : ""}`;
  }

  /* Velocidades */
  const sp = [[f.speed, "", ""]];
  if (f.burrowSpeed) sp.push([f.burrowSpeed, "excavar ", "Burrow "]);
  if (f.climbSpeed) sp.push([f.climbSpeed, "trepar ", "Climb "]);
  if (f.flySpeed) sp.push([f.flySpeed, "volar ", "Fly "]);
  if (f.swimSpeed) sp.push([f.swimSpeed, "nadar ", "Swim "]);
  const hover = (es, k) => (f.hover && k === "fly" ? (es ? " (levitar)" : " (hover)") : "");
  const speedText = sp.map(([v, es], i) => `${es}${v} pies${es === "volar " ? hover(true, "fly") : ""}`).join(", ");
  const speedTextEn = sp.map(([v, , en]) => `${en}${v} ft.${en === "Fly " ? hover(false, "fly") : ""}`).join(", ");

  /* Salvaciones y habilidades */
  const saves = (f.saves || []).map(deref);
  const expertise = new Set((f.expertise || []).map(deref));
  const skillList = (f.skills || []).map(deref).map(k => {
    const [es, ab] = SKILLS[k];
    const bonus = mod(f[ab]) + pb * (expertise.has(k) ? 2 : 1);
    return { es: `${es} ${sign(bonus)}`, en: `${T("skills." + k + ".name") || title(k.replace(/-/g, " "))} ${sign(bonus)}`, k, bonus };
  });
  const perception = skillList.find(s => s.k === "perception");
  const passive = 10 + (perception ? perception.bonus : mod(f.wis));

  /* Sentidos */
  const senses = [], sensesEn = [];
  if (f.blindsight) { senses.push(`visión ciega ${f.blindsight} pies`); sensesEn.push(`Blindsight ${f.blindsight} ft.`); }
  if (f.darkvision) {
    senses.push(`visión en la oscuridad ${f.darkvision} pies${f.darkvisionMagical ? " (la oscuridad mágica no la estorba)" : ""}`);
    sensesEn.push(`Darkvision ${f.darkvision} ft.${f.darkvisionMagical ? " (unimpeded by magical Darkness)" : ""}`);
  }
  if (f.tremorsense) { senses.push(`sentido de la vibración ${f.tremorsense} pies`); sensesEn.push(`Tremorsense ${f.tremorsense} ft.`); }
  if (f.truesight) { senses.push(`visión verdadera ${f.truesight} pies`); sensesEn.push(`Truesight ${f.truesight} ft.`); }
  const sensesText = cap([senses.join(", "), `Percepción pasiva ${passive}`].filter(Boolean).join("; "));
  const sensesTextEn = [sensesEn.join(", "), `Passive Perception ${passive}`].filter(Boolean).join("; ");

  /* Idiomas */
  /* «languages» son los que habla; «understands», los que entiende sin hablar */
  const understood = Array.isArray(f.understands) ? f.understands.map(deref) : [];
  const langs = (f.languages || []).map(deref);
  const esOf = l => need(LANGS[l], "idioma " + l);
  const enOf = l => T(`languages.${l}.name`) || title(l.replace(/-/g, " "));
  const langEs = langs.map(esOf), langEn = langs.map(enOf);
  let languages, languagesEn;
  const other = typeof f.otherLanguages === "number" ? f.otherLanguages : 0;
  const plusEs = n => n ? ` y ${n === 1 ? "otro idioma" : `otros ${NUM_ES[n]} idiomas`}` : "";
  const plusEn = n => n ? ` plus ${n === 1 ? "one other language" : `${NUM_EN[n]} other languages`}` : "";
  if (f.allLanguages) { languages = "Todos"; languagesEn = "All"; }
  else if (understood.length || f.understandsCommands) {
    const es = list(understood.map(esOf)) + (f.otherLanguagesUnderstood ? plusEs(other) : "");
    const en = list(understood.map(enOf), "and") + (f.otherLanguagesUnderstood ? plusEn(other) : "");
    const spoken = langs.length ? `${cap(langEs.join(", "))}; ` : "", spokenEn = langs.length ? `${langEn.join(", ")}; ` : "";
    languages = f.understandsCommands && !understood.length ? `Entiende órdenes dadas en cualquier idioma pero no habla` : `${spoken}${spoken ? "entiende" : "Entiende"} ${es} pero no ${spoken ? "los habla" : "habla"}`;
    languagesEn = f.understandsCommands && !understood.length ? `Understands commands given in any language but can't speak` : `${spokenEn}${spokenEn ? "understands" : "Understands"} ${en} but can't speak${spokenEn ? " them" : ""}`;
  } else if (langs.length || other) {
    languages = cap(langEs.join(", ")) + (other ? `${langs.length ? " y " : ""}${other === 1 ? "otro idioma" : `otros ${NUM_ES[other]} idiomas`}` : "");
    languagesEn = langEn.join(", ") + (other ? `${langs.length ? " plus " : ""}${other === 1 ? "one other language" : `${NUM_EN[other]} other languages`}` : "");
  } else { languages = "Ninguno"; languagesEn = "None"; }
  if (f.telepathy) { languages += `; telepatía ${f.telepathy} pies`; languagesEn += `; telepathy ${f.telepathy} ft.`; }

  /* Defensas */
  const dmgList = (arr) => (arr || []).map(deref);
  const defs = (dmg, cond = []) => {
    const d = dmg.map(x => DAMAGE[x]), c = cond.map(x => CONDITIONS[x]);
    const es = [d.join(", "), c.join(", ")].filter(Boolean).join("; ");
    const en = [dmg.map(x => cap(x)).join(", "), cond.map(x => cap(x)).join(", ")].filter(Boolean).join("; ");
    return { es: es ? cap(es) : "", en };
  };
  const condImm = [...dmgList(f.conditionImmunities), ...(f.exhaustionImmune ? ["exhaustion"] : [])].sort();
  const imm = defs(dmgList(f.damageImmunities).sort(), condImm);
  const res = defs(dmgList(f.damageResistances).sort());
  const vul = defs(dmgList(f.damageVulnerabilities).sort());

  /* Equipo */
  const gearIds = [...(f.gearArmor || []), ...(f.gearWeapons || []), ...(f.gearItems || []), ...(f.gearTools || [])];
  const gearEn = gearIds.map(x => T(`${x}.name`) || title(deref(x).replace(/-/g, " "))).sort();
  const gear = gearEn.map(x => need(ES.equipo[x], "equipo " + x)).join(", ");

  /* Rasgos y acciones */
  const out = { traits: [], actions: [], bonus: [], reactions: [], legendary: [] };
  const outEn = { traits: [], actions: [], bonus: [], reactions: [], legendary: [] };
  const KIND = { trait: "traits", action: "actions", "bonus-action": "bonus", reaction: "reactions", legendary: "legendary" };
  const entries = (f.entries || []).map(e => ({ id: e, f: readFields(path.join(MON, id, deref(e).replace(/^[^.]*\./, "") + ".yaml")) }))
    .sort((a, b) => (a.f.order || 0) - (b.f.order || 0));
  if (f.legendaryActions) {
    const txt = T(`monsters.${id}.texts.legendary`);
    const m = txt.match(/^Legendary Action Uses: (\d+)(?: \((\d+) in Lair\))?\. (.*)$/);
    const head = `Usos de acción legendaria: ${m[1]}${m[2] ? ` (${m[2]} en su guarida)` : ""}`;
    const body = sentences(m[3], ctx);
    out.legendary.push(`${head} — ${need(body, "legendaria")}`);
    outEn.legendary.push(`Legendary Action Uses: ${m[1]}${m[2] ? ` (${m[2]} in Lair)` : ""} — ${m[3]}`);
  }
  for (const { id: eid, f: ef } of entries) {
    const key = KIND[ef.kind];
    const nm = T(eid + ".name");
    const desc = T(eid + ".description");
    if (!key || !nm) continue;
    if (/^A spell of the .+'s Spellcasting/.test(desc)) continue;   // ayuda de la ficha, no es una acción
    /* Nombre con su recarga o sus usos */
    let headEn = nm, headEs = ES.nombres[nm] ?? spellName(nm) ?? null;
    need(headEs, "nombre " + nm);
    const suf = [], sufEn = [];
    if (ef.recharge) { suf.push(`recarga ${ef.recharge === 6 ? "6" : ef.recharge + "–6"}`); sufEn.push(`Recharge ${ef.recharge === 6 ? "6" : ef.recharge + "–6"}`); }
    if (ef.perDay) {
      suf.push(`${ef.perDay}/día${ef.perDayLair ? `, o ${ef.perDayLair}/día en su guarida` : ""}`);
      sufEn.push(`${ef.perDay}/Day${ef.perDayLair ? `, or ${ef.perDayLair}/Day in Lair` : ""}`);
    }
    if (typeof ef.uses === "number") { suf.push(`${ef.uses}/día`); sufEn.push(`${ef.uses}/Day`); }   // si no, «uses» dice qué acción usa
    if (ef.perRest) { suf.push(`1/descanso corto o largo`); sufEn.push(`1/Short or Long Rest`); }
    if (info.formas && info.formas[nm]) { suf.unshift(info.formas[nm][0]); sufEn.unshift(info.formas[nm][1]); }
    if (suf.length) { headEs = headEs && `${headEs} (${suf.join("; ")})`; headEn = `${nm} (${sufEn.join("; ")})`; }

    const flat = plain(desc);
    let lineEs = null, lineEn = null;
    const atk = desc.match(/^\*(Melee|Ranged|Melee or Ranged) Attack Roll:\* ([+−-]\d+), ([^*]+?)\.? \*Hit:\* ([\s\S]*?)(?: \*(Miss|Hit or Miss):\* ([\s\S]*))?$/);
    const sav = desc.match(/^\*(\w+) Saving Throw:\* DC (\d+), ([\s\S]*)$/);
    if (atk) {
      const hit = Number(atk[2].replace("−", "-"));
      const range = atk[3].trim();
      const hitText = plain(atk[4]);
      const d = damageText(hitText);
      let restEs = "";
      const rest = d ? d.rest.replace(/^[.,]?\s*/, "").trim() : hitText;
      if (rest) {
        restEs = d && d.rest.startsWith(",") ? phrase(", " + rest, ctx, { lower: true }) : sentences(rest, ctx);
        need(restEs, "frase");
      }
      let missEs = "", missEn = "";
      if (atk[5]) { const t = plain(atk[6]); missEn = ` ${atk[5]}: ${t}`; const tr = sentences(t, ctx); need(tr, "frase"); missEs = ` ${atk[5] === "Miss" ? "Fallo" : "Impacto o fallo"}: ${tr}`; }
      const dmgEs = d ? d.es : "";
      const sep = d && restEs ? (d.rest.startsWith(",") ? "" : ". ") : "";
      lineEs = `${headEs} — ${sign(hit)} al ataque — ${dmgEs}${sep}${restEs || ""}${missEs} · ${rangeES(range)}`.replace(/ — {2}/, " — ");
      lineEn = `${headEn} — ${sign(hit)} to hit — ${hitText}${missEn} · ${range.replace(/\.$/, "")}`;
    } else if (sav) {
      const ab = ABIL_FROM_EN[sav[1]];
      const body = sav[3];
      /* «each creature in a 60-foot Cone. *Failure:* … *Success:* …» */
      const segs = body.split(/\s*\*((?:First |Second )?Failure(?: or Success)?|Success):\*\s*/);
      const target = plain(segs[0]);
      const LBL = { "Failure": "Fallo", "Success": "Éxito", "Failure or Success": "Fallo o éxito", "First Failure": "Primer fallo", "Second Failure": "Segundo fallo" };
      let es = [], en = [];
      const tgt = sentences(target, ctx); need(tgt, "frase");
      es.push(tgt ? tgt.charAt(0).toLowerCase() + tgt.slice(1) : tgt); en.push(target);
      for (let i = 1; i < segs.length; i += 2) {
        const lbl = segs[i], txt = plain(segs[i + 1] || "");
        en.push(`${lbl}: ${txt}`);
        let tr;
        if (txt === "Half damage.") tr = "la mitad del daño.";
        else {
          const d = damageText(txt);
          if (d && !d.rest.replace(/^\.\s*/, "").trim()) tr = d.es + ".";
          else if (d && /^, and /.test(d.rest)) { const r = phrase(d.rest, ctx, { lower: true }); tr = r === null ? null : d.es + r; }
          else if (d && /^\. /.test(d.rest)) { const r = sentences(d.rest.slice(2), ctx); tr = r === null ? null : d.es + ". " + r; }
          else tr = sentences(txt, ctx);
        }
        need(tr, "frase");
        es.push(`${LBL[lbl]}: ${low(tr)}`);
      }
      lineEs = `${headEs} — CD ${sav[2]} de ${ABIL_ES[ab]} — ${es.join(" ")}`;
      lineEn = `${headEn} — DC ${sav[2]} ${sav[1]} — ${en.join(" ")}`;
    } else if (/^\*Trigger:\*/.test(desc) && /\*Response:\*/.test(desc)) {
      const m = desc.match(/^\*Trigger:\* ([\s\S]*?) \*Response:\* ([\s\S]*)$/);
      const a = sentences(plain(m[1]), ctx), b = sentences(plain(m[2]), ctx);
      need(a, "frase"); need(b, "frase");
      lineEs = `${headEs} — Desencadenante: ${low(a)} Respuesta: ${low(b)}`;
      lineEn = `${headEn} — Trigger: ${plain(m[1])} Response: ${plain(m[2])}`;
    } else if (/Spellcasting$/.test(nm) && /\*(At Will|\d\/Day)/.test(desc)) {
      const intro = desc.split(/\n\n/)[0].replace(/:$/, "");
      const introEs = sentences(plain(intro), ctx);
      need(introEs, "frase");
      const groups = spellList(desc);
      need(groups, "conjuros " + name);
      lineEs = `${headEs} — ${introEs}: ${(groups || []).map(x => x.es).join("; ")}.`;
      lineEn = `${headEn} — ${plain(intro)}: ${(groups || []).map(x => x.en).join("; ")}.`;
    } else {
      const tr = sentences(flat, ctx);
      need(tr, "frase");
      lineEs = `${headEs} — ${tr}`;
      lineEn = `${headEn} — ${flat}`;
    }
    out[key].push(lineEs);
    outEn[key].push(lineEn);
  }

  const join = a => a.join("\n");
  const beast = {
    id: info.id || "cat-" + slug(nameEs || name),
    name: need(nameEs, "nombre de la criatura"),
    edition: "2024", srd: name, auto: true,
    ...(info.aka ? { aka: info.aka } : {}),
    sizeType, alignment: ALIGN[f.alignment][0],
    cr: crText(cr), xp: Number(f.xp) || XP[cr] || 0, pb,
    ac: Number(f.ac), init: Number(f.initiative), hpAvg: Number(f.hp), hpDice: dice(f.hitDice),
    speed: Number(f.speed), speedText,
    str: f.str, dex: f.dex, con: f.con, int: f.int, wis: f.wis, cha: f.cha,
    saves,
    ...(skillList.length ? { skills: skillList.map(s => s.es).join(", ") } : {}),
    ...(gear ? { gear } : {}),
    ...(vul.es ? { vulnerabilities: vul.es } : {}),
    ...(res.es ? { resistances: res.es } : {}),
    ...(imm.es ? { immunities: imm.es } : {}),
    senses: sensesText, languages,
    icon: info.icono || "",
    ...(info.color ? { color: info.color } : {}),
    ...(out.traits.length ? { traits: join(out.traits) } : {}),
    ...(out.actions.length ? { actions: join(out.actions) } : {}),
    ...(out.bonus.length ? { bonus: join(out.bonus) } : {}),
    ...(out.reactions.length ? { reactions: join(out.reactions) } : {}),
    ...(out.legendary.length ? { legendary: join(out.legendary) } : {}),
    en: {
      name, sizeType: sizeTypeEn, alignment: ALIGN[f.alignment][1], speedText: speedTextEn,
      ...(skillList.length ? { skills: skillList.map(s => s.en).join(", ") } : {}),
      ...(gearEn.length ? { gear: gearEn.join(", ") } : {}),
      ...(vul.en ? { vulnerabilities: vul.en } : {}),
      ...(res.en ? { resistances: res.en } : {}),
      ...(imm.en ? { immunities: imm.en } : {}),
      senses: sensesTextEn, languages: languagesEn,
      ...(outEn.traits.length ? { traits: join(outEn.traits) } : {}),
      ...(outEn.actions.length ? { actions: join(outEn.actions) } : {}),
      ...(outEn.bonus.length ? { bonus: join(outEn.bonus) } : {}),
      ...(outEn.reactions.length ? { reactions: join(outEn.reactions) } : {}),
      ...(outEn.legendary.length ? { legendary: join(outEn.legendary) } : {})
    }
  };
  return { beast, missing };
}

/* ---------- Unir con el bestiario de siempre ---------- */
const DATA = path.join(ROOT, "public", "js", "bestiario-datos.js");
const { BEASTS: OLD } = await import(DATA + "?" + Date.now());
const curated = OLD.filter(b => !b.auto);
const have = new Set(curated.map(b => b.srd).filter(Boolean));
const made = [], broken = [];
for (const file of files) {
  const name = T(`monsters.${file.replace(/\.yaml$/, "")}.name`);
  if (have.has(name)) continue;
  const { beast, missing } = convert(file);
  if (missing.length) broken.push([name, missing]);
  made.push(beast);
}

if (PENDING_OUT) {
  const obj = {};
  for (const [k, v] of pending) obj[k] = v;
  writeFileSync(PENDING_OUT, JSON.stringify({ frases: obj, faltan: broken }, null, 1));
  console.log(`${made.length} criaturas nuevas · ${pending.size} frases sin traducir · ${broken.length} fichas incompletas -> ${PENDING_OUT}`);
  process.exit(0);
}
if (broken.length) {
  console.error(`${broken.length} fichas incompletas, no se escribe nada. Primera: ${broken[0][0]}: ${broken[0][1].slice(0, 5).join(", ")}`);
  console.error(`Saca la lista con --pendientes salida.json`);
  process.exit(1);
}

/* Las retocadas a mano conservan su sitio; las nuevas van detrás, por VD */
const crNum = s => s.includes("/") ? Number(s.split("/")[0]) / Number(s.split("/")[1]) : Number(s);
made.sort((a, b) => crNum(a.cr) - crNum(b.cr) || a.name.localeCompare(b.name, "es"));
const ids = new Set(curated.map(b => b.id));
for (const b of made) { let id = b.id, n = 2; while (ids.has(id)) id = `${b.id}-${n++}`; b.id = id; ids.add(id); }

const src = readFileSync(DATA, "utf8");
const header = src.slice(0, src.indexOf("export const BEASTS"));
/* Una criatura por línea: pesa menos que con sangría y los cambios se leen bien */
writeFileSync(DATA, header + "export const BEASTS = [\n" + [...curated, ...made].map(b => JSON.stringify(b)).join(",\n") + "\n];\n");
console.log(`${curated.length} fichas de antes + ${made.length} nuevas = ${curated.length + made.length}`);
