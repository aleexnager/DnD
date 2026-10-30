/* Datos del creador de personajes. Las reglas (dados de golpe, salvaciones,
   habilidades, rasgos de nivel 1, equipo inicial) salen del System Reference
   Document 5.1 y 5.2 de Wizards of the Coast, publicado bajo CC-BY 4.0; los
   textos están redactados para Mesa. Sin material de fuera del SRD.

   Habilidades: los ids de SKILLS en schema.js. Conjuros: ids de SPELL_LIBRARY. */

import { modOf, normalizeSpell, uid, profForLevel } from "./schema.js";
import { SPELL_LIBRARY } from "./spells.js";
import { CLASS_PROGRESSION } from "./libros/jugador.js";
import { CONJUROS } from "./libros/conjuros.js";

/* Armadura: base, si suma DES y hasta cuánto (null = toda) */
const ARMOR = {
  ninguna: { name: "", base: 10, dex: null },
  cuero: { name: "Armadura de cuero", base: 11, dex: null, weight: 10 },
  escamas: { name: "Cota de escamas", base: 14, dex: 2, weight: 45 },
  malla: { name: "Cota de malla", base: 16, dex: 0, weight: 55 }
};
export { ARMOR };

/* Armas del equipo inicial: daño, tipo, alcance y con qué se ataca */
const W = (name, damage, type, range, ability, weight = 2) => ({ name, damage, type, range, ability, weight });
const WEAPONS = {
  granHacha: W("Gran hacha", "1d12", "cortante", "5 pies", "str", 7),
  hachaMano: W("Hacha de mano", "1d6", "cortante", "20/60 pies", "str", 2),
  jabalina: W("Jabalina", "1d6", "perforante", "30/120 pies", "str", 2),
  estoque: W("Estoque", "1d8", "perforante", "5 pies", "finesse", 2),
  daga: W("Daga", "1d4", "perforante", "20/60 pies", "finesse", 1),
  maza: W("Maza", "1d6", "contundente", "5 pies", "str", 4),
  cimitarra: W("Cimitarra", "1d6", "cortante", "5 pies", "finesse", 3),
  espadaLarga: W("Espada larga", "1d8", "cortante", "5 pies", "str", 3),
  ballesta: W("Ballesta ligera", "1d8", "perforante", "80/320 pies", "dex", 5),
  espadaCorta: W("Espada corta", "1d6", "perforante", "5 pies", "finesse", 2),
  dardo: W("Dardo", "1d4", "perforante", "20/60 pies", "finesse", 0.25),
  arcoLargo: W("Arco largo", "1d8", "perforante", "150/600 pies", "dex", 2),
  arcoCorto: W("Arco corto", "1d6", "perforante", "80/320 pies", "dex", 2),
  baston: W("Bastón", "1d6", "contundente", "5 pies", "str", 4)
};
export { WEAPONS };

const ALL_SKILLS = ["acrobacias", "arcanos", "atletismo", "enganio", "historia", "interpretacion", "intimidacion", "investigacion",
  "juego_de_manos", "medicina", "naturaleza", "percepcion", "perspicacia", "persuasion", "religion", "sigilo", "supervivencia", "trato_con_animales"];

/* Las doce clases del SRD. tone: el color de su tarjeta.
   kit: lo que llevan al empezar. unarmored: CA sin armadura (monje, bárbaro). */
export const CLASSES = [
  { id: "barbaro", name: "Bárbaro", tone: "#c0533c", die: 12, primary: ["str"], saves: ["str", "con"],
    pitch: "Una furia primordial que convierte cada golpe en una avalancha.",
    choose: 2, from: ["trato_con_animales", "atletismo", "intimidacion", "naturaleza", "percepcion", "supervivencia"],
    armor: "Ligeras, intermedias y escudos", unarmored: "con",
    features: [["Furia", "Dos veces por descanso largo: ventaja en pruebas y salvaciones de FUE, +2 al daño cuerpo a cuerpo y resistencia al daño contundente, cortante y perforante."],
      ["Defensa sin armadura", "Sin armadura, tu CA es 10 + DES + CON."]],
    resources: [["Furia", 2]],
    kit: { armor: "ninguna", weapons: ["granHacha", "hachaMano", "hachaMano", "jabalina"], items: [["Paquete de explorador", 59], ["Jabalinas", 2, 4]] } },
  { id: "bardo", name: "Bardo", tone: "#b05aa6", die: 8, primary: ["cha"], saves: ["dex", "cha"],
    pitch: "Magia tejida con palabras y música para inspirar o confundir.",
    choose: 3, from: ALL_SKILLS, armor: "Ligeras", caster: "cha", slots: 2,
    features: [["Lanzamiento de conjuros", "Usas el Carisma para lanzar conjuros de bardo."],
      ["Inspiración bárdica", "Como acción adicional, das a un aliado un d6 que puede sumar a una tirada. Tantas veces como tu modificador de CAR por descanso largo."]],
    resources: [["Inspiración bárdica", "cha"]],
    spells: ["burla-danina", "curar-heridas", "dormir", "palabra-curativa", "hechizar-persona", "ola-atronadora"], pick: 4,
    kit: { armor: "cuero", weapons: ["estoque", "daga"], items: [["Laúd", 2], ["Paquete de artista", 38]] } },
  { id: "clerigo", name: "Clérigo", tone: "#d6b25a", die: 8, primary: ["wis"], saves: ["wis", "cha"],
    pitch: "La voluntad de un dios hecha luz, curación y castigo.",
    choose: 2, from: ["historia", "perspicacia", "medicina", "persuasion", "religion"], armor: "Ligeras, intermedias y escudos",
    caster: "wis", slots: 2, shield: true,
    features: [["Lanzamiento de conjuros", "Usas la Sabiduría para lanzar conjuros de clérigo."],
      ["Dominio de la vida", "Tus conjuros de curación curan 2 + el nivel del conjuro más."]],
    spells: ["llama-sagrada", "curar-heridas", "bendecir", "palabra-curativa", "saeta-guia", "escudo-de-fe", "infligir-heridas", "orden-imperiosa"], pick: 5,
    kit: { armor: "escamas", weapons: ["maza", "ballesta"], items: [["Escudo", 6, 1, true], ["Símbolo sagrado", 1, 1, true], ["Paquete de sacerdote", 24]] } },
  { id: "druida", name: "Druida", tone: "#5f9a55", die: 8, primary: ["wis"], saves: ["int", "wis"],
    pitch: "Guardián de lo salvaje que habla con la tierra y cambia de forma.",
    choose: 2, from: ["arcanos", "trato_con_animales", "perspicacia", "medicina", "naturaleza", "percepcion", "religion", "supervivencia"],
    armor: "Ligeras, intermedias y escudos (no de metal)", caster: "wis", slots: 2, shield: true,
    features: [["Druídico", "Conoces el idioma secreto de los druidas."], ["Lanzamiento de conjuros", "Usas la Sabiduría para lanzar conjuros de druida."]],
    spells: ["rociada-venenosa", "enmaranar", "curar-heridas", "palabra-curativa", "ola-atronadora"], pick: 4,
    kit: { armor: "cuero", weapons: ["cimitarra"], items: [["Escudo de madera", 6, 1, true], ["Foco druídico", 1], ["Paquete de explorador", 59]] } },
  { id: "guerrero", name: "Guerrero", tone: "#8a6f4a", die: 10, primary: ["str", "dex"], saves: ["str", "con"],
    pitch: "Maestro de las armas y de la armadura, el muro de la party.",
    choose: 2, from: ["acrobacias", "trato_con_animales", "atletismo", "historia", "perspicacia", "intimidacion", "percepcion", "supervivencia"],
    armor: "Todas y escudos", shield: true,
    features: [["Estilo de combate: Defensa", "+1 a la CA mientras lleves armadura."],
      ["Tomar aliento", "Como acción adicional recuperas 1d10 + tu nivel de vida, una vez por descanso."]],
    resources: [["Tomar aliento", 1]], acBonus: 1,
    kit: { armor: "malla", weapons: ["espadaLarga", "ballesta"], items: [["Escudo", 6, 1, true], ["Paquete de mazmorreo", 61]] } },
  { id: "monje", name: "Monje", tone: "#3f8f8a", die: 8, primary: ["dex", "wis"], saves: ["str", "dex"],
    pitch: "Cuerpo y espíritu afilados hasta convertir los puños en armas.",
    choose: 2, from: ["acrobacias", "atletismo", "historia", "perspicacia", "religion", "sigilo"], armor: "Ninguna", unarmored: "wis",
    features: [["Defensa sin armadura", "Sin armadura ni escudo, tu CA es 10 + DES + SAB."],
      ["Artes marciales", "Tus golpes sin armas hacen 1d4 y puedes dar uno más como acción adicional."]],
    kit: { armor: "ninguna", weapons: ["espadaCorta", "dardo"], items: [["Dardos", 0.25, 10], ["Paquete de explorador", 59]] } },
  { id: "paladin", name: "Paladín", tone: "#c8a24a", die: 10, primary: ["str", "cha"], saves: ["wis", "cha"],
    pitch: "Un juramento sagrado que se defiende con acero y fe.",
    choose: 2, from: ["atletismo", "perspicacia", "intimidacion", "medicina", "persuasion", "religion"], armor: "Todas y escudos", shield: true,
    caster: "cha", slots: 2, spells: ["bendecir", "curar-heridas", "escudo-de-fe", "orden-imperiosa"], pick: 2,
    features: [["Sentido divino", "Notas a celestiales, infernales y muertos vivientes cercanos."],
      ["Imposición de manos", "Una reserva de 5 puntos de vida por descanso largo para curar con el tacto."]],
    resources: [["Imposición de manos", 5]],
    kit: { armor: "malla", weapons: ["espadaLarga", "jabalina"], items: [["Escudo", 6, 1, true], ["Símbolo sagrado", 1, 1, true], ["Jabalinas", 2, 5], ["Paquete de sacerdote", 24]] } },
  { id: "explorador", name: "Explorador", tone: "#4f7f4a", die: 10, primary: ["dex", "wis"], saves: ["str", "dex"],
    pitch: "Rastreador incansable de la frontera, letal a distancia.",
    choose: 3, from: ["trato_con_animales", "atletismo", "perspicacia", "investigacion", "naturaleza", "percepcion", "sigilo", "supervivencia"],
    armor: "Ligeras, intermedias y escudos", caster: "wis", slots: 2, spells: ["curar-heridas", "enmaranar"], pick: 2,
    features: [["Enemigo predilecto", "Ventaja para rastrear y recordar datos de un tipo de criatura."],
      ["Explorador nato", "En tu terreno favorito el viaje es más rápido y no te pierdes."]],
    kit: { armor: "escamas", weapons: ["espadaCorta", "espadaCorta", "arcoLargo"], items: [["Flechas", 0.05, 20], ["Paquete de explorador", 59]] } },
  { id: "picaro", name: "Pícaro", tone: "#5a6478", die: 8, primary: ["dex"], saves: ["dex", "int"],
    pitch: "Sigilo, ingenio y un golpe certero donde más duele.",
    choose: 4, from: ["acrobacias", "atletismo", "enganio", "perspicacia", "intimidacion", "investigacion", "percepcion", "interpretacion", "persuasion", "juego_de_manos", "sigilo"],
    armor: "Ligeras",
    features: [["Ataque furtivo", "Una vez por turno, 1d6 de daño extra si tienes ventaja o un aliado está junto al objetivo."],
      ["Pericia", "Doble competencia en dos habilidades que elijas."], ["Jerga de ladrones", "Un código secreto de gestos y palabras."]],
    kit: { armor: "cuero", weapons: ["estoque", "arcoCorto", "daga", "daga"], items: [["Flechas", 0.05, 20], ["Herramientas de ladrón", 1], ["Paquete de ladrón", 44]] } },
  { id: "hechicero", name: "Hechicero", tone: "#c4642e", die: 6, primary: ["cha"], saves: ["con", "cha"],
    pitch: "Magia en la sangre, desatada a fuerza de voluntad.",
    choose: 2, from: ["arcanos", "enganio", "perspicacia", "intimidacion", "persuasion", "religion"], armor: "Ninguna", caster: "cha", slots: 2,
    features: [["Lanzamiento de conjuros", "Usas el Carisma para lanzar conjuros de hechicero."],
      ["Linaje dracónico", "+1 vida por nivel y, sin armadura, tu CA es 13 + DES."]],
    unarmored: "draconic",
    spells: ["rayo-de-fuego", "rayo-de-escarcha", "salpicadura-acida", "proyectil-magico", "manos-ardientes", "dormir", "ola-atronadora"], pick: 4,
    kit: { armor: "ninguna", weapons: ["ballesta", "daga", "daga"], items: [["Bolsa de componentes", 2], ["Paquete de mazmorreo", 61]] } },
  { id: "brujo", name: "Brujo", tone: "#7a4fb0", die: 8, primary: ["cha"], saves: ["wis", "cha"],
    pitch: "Un pacto con un ser de otro mundo a cambio de poder prohibido.",
    choose: 2, from: ["arcanos", "enganio", "historia", "intimidacion", "investigacion", "naturaleza", "religion"], armor: "Ligeras", caster: "cha", slots: 1,
    features: [["Patrón infernal", "Al derribar a un enemigo, ganas vida temporal."], ["Magia del pacto", "Un espacio de conjuro que vuelve con cada descanso corto."]],
    spells: ["descarga-sobrenatural", "toque-helado", "hechizar-persona", "burla-danina"], pick: 3,
    kit: { armor: "cuero", weapons: ["ballesta", "daga", "daga"], items: [["Foco arcano", 1], ["Paquete de erudito", 10]] } },
  { id: "mago", name: "Mago", tone: "#4a6fc0", die: 6, primary: ["int"], saves: ["int", "wis"],
    pitch: "El estudio paciente de lo arcano convertido en poder.",
    choose: 2, from: ["arcanos", "historia", "perspicacia", "investigacion", "medicina", "religion"], armor: "Ninguna", caster: "int", slots: 2,
    features: [["Lanzamiento de conjuros", "Usas la Inteligencia y tu libro de conjuros."], ["Recuperación arcana", "En un descanso corto recuperas un espacio de conjuro de nivel 1."]],
    spells: ["rayo-de-fuego", "rayo-de-escarcha", "toque-helado", "proyectil-magico", "manos-ardientes", "dormir", "hechizar-persona", "ola-atronadora"], pick: 5,
    kit: { armor: "ninguna", weapons: ["baston", "daga"], items: [["Libro de conjuros", 3], ["Bolsa de componentes", 2], ["Paquete de erudito", 10]] } }
];

/* Las especies del SRD 5.1 con sus mejoras de característica */
export const SPECIES = [
  { id: "humano", name: "Humano", tone: "#b08a5a", speed: 30, size: "Mediano", vision: 0,
    pitch: "Ambiciosos y adaptables: no hay rincón al que no lleguen.", bonus: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    traits: [["Versátil", "+1 a todas las características."]] },
  { id: "elfo", name: "Elfo", tone: "#5f9a8a", speed: 30, size: "Mediano", vision: 12,
    pitch: "Gracia y longevidad, con un pie en el mundo feérico.", bonus: { dex: 2, int: 1 }, skills: ["percepcion"],
    traits: [["Visión en la oscuridad", "Ves en la penumbra a 60 pies."], ["Ascendencia feérica", "Ventaja contra quedar encantado; la magia no te duerme."], ["Trance", "Cuatro horas de meditación te bastan."]] },
  { id: "enano", name: "Enano", tone: "#9a7650", speed: 25, size: "Mediano", vision: 12,
    pitch: "Tozudos como la piedra de las montañas que los vieron nacer.", bonus: { con: 2, wis: 1 }, hpPerLevel: 1,
    traits: [["Visión en la oscuridad", "Ves en la penumbra a 60 pies."], ["Resistencia enana", "Ventaja contra el veneno y resistencia a su daño."], ["Dureza enana", "+1 a la vida máxima por nivel."]] },
  { id: "mediano", name: "Mediano", tone: "#a8884a", speed: 25, size: "Pequeño", vision: 0,
    pitch: "Pequeños, valientes y con una suerte que roza lo increíble.", bonus: { dex: 2, cha: 1 },
    traits: [["Afortunado", "Si sacas un 1 en el d20, repites la tirada."], ["Valiente", "Ventaja contra quedar asustado."], ["Agilidad de mediano", "Puedes atravesar el espacio de criaturas más grandes."]] },
  { id: "draconido", name: "Dracónido", tone: "#b04a3a", speed: 30, size: "Mediano", vision: 0,
    pitch: "Sangre de dragón y un aliento que arrasa a los enemigos.", bonus: { str: 2, cha: 1 },
    traits: [["Arma de aliento", "Exhalas fuego en un cono de 15 pies: 2d6 de daño, salvación de DES para la mitad."], ["Resistencia al fuego", "Resistencia al daño de fuego."]] },
  { id: "gnomo", name: "Gnomo", tone: "#6a8ac0", speed: 25, size: "Pequeño", vision: 12,
    pitch: "Curiosos inventores con una mente difícil de embrujar.", bonus: { int: 2, con: 1 },
    traits: [["Visión en la oscuridad", "Ves en la penumbra a 60 pies."], ["Astucia gnoma", "Ventaja en salvaciones de INT, SAB y CAR contra la magia."]] },
  { id: "semielfo", name: "Semielfo", tone: "#7a8a6a", speed: 30, size: "Mediano", vision: 12,
    pitch: "Entre dos mundos, con lo mejor de cada uno.", bonus: { cha: 2 }, freeBonus: 2, extraSkills: 2,
    traits: [["Visión en la oscuridad", "Ves en la penumbra a 60 pies."], ["Ascendencia feérica", "Ventaja contra quedar encantado."], ["Versatilidad", "+1 a dos características y dos habilidades más a tu elección."]] },
  { id: "semiorco", name: "Semiorco", tone: "#5a7a4a", speed: 30, size: "Mediano", vision: 12,
    pitch: "Fuerza feroz y una resistencia que no se rinde.", bonus: { str: 2, con: 1 }, skills: ["intimidacion"],
    traits: [["Visión en la oscuridad", "Ves en la penumbra a 60 pies."], ["Aguante implacable", "Una vez por descanso, si caes a 0 de vida, te quedas a 1."], ["Ataques salvajes", "En un crítico, un dado de daño más."]] },
  { id: "tiefling", name: "Tiefling", tone: "#a0405a", speed: 30, size: "Mediano", vision: 12,
    pitch: "Herederos de un pacto infernal que llevan con orgullo.", bonus: { cha: 2, int: 1 },
    traits: [["Visión en la oscuridad", "Ves en la penumbra a 60 pies."], ["Resistencia infernal", "Resistencia al daño de fuego."]] }
];

/* Trasfondos del SRD 5.2, más uno a medida */
export const BACKGROUNDS = [
  { id: "acolito", name: "Acólito", skills: ["perspicacia", "religion"], pitch: "Creciste al servicio de un templo." },
  { id: "criminal", name: "Criminal", skills: ["juego_de_manos", "sigilo"], pitch: "Sobreviviste al margen de la ley." },
  { id: "sabio", name: "Sabio", skills: ["arcanos", "historia"], pitch: "Pasaste años entre libros y maestros." },
  { id: "soldado", name: "Soldado", skills: ["atletismo", "intimidacion"], pitch: "Serviste en un ejército o una mesnada." },
  { id: "propio", name: "A tu medida", skills: [], free: 2, pitch: "Inventas tu pasado y eliges dos habilidades." }
];

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
/* Compra de puntos: lo que cuesta cada puntuación, de 8 a 15, con 27 puntos */
export const POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
export const POINTS = 27;
export const ALIGNMENTS = ["Legal bueno", "Neutral bueno", "Caótico bueno", "Legal neutral", "Neutral", "Caótico neutral", "Legal malvado", "Neutral malvado", "Caótico malvado"];

/* ---------- Subir de nivel ----------
   Lo que gana cada clase del nivel 2 al 20 sale de la progresión del manual
   del jugador (libros/jugador.js): rasgos, mejoras de característica y la
   subclase del SRD. Los espacios de conjuro, de las tablas de 2024. */
export const MAX_LEVEL = 20;
const FULL_SLOTS = [[2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]];
const HALF_SLOTS = [[2], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1],
  [4, 3, 3, 2], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2]];
/* Brujo: [cuántos espacios, de qué nivel] */
const PACT = [[1, 1], [2, 1], [2, 2], [2, 2], [2, 3], [2, 3], [2, 4], [2, 4], [2, 5], [2, 5], [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [4, 5], [4, 5], [4, 5], [4, 5]];
const HALF = ["paladin", "explorador"], PACT_CASTER = "brujo";
/* Trucos y conjuros preparados de cada nivel (2024) */
const CANTRIPS = { bardo: [2, 4, 10], clerigo: [3, 4, 10], druida: [2, 4, 10], hechicero: [4, 4, 10], brujo: [2, 4, 10], mago: [3, 4, 10] };
const PREPARED = {
  full: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
  hechicero: [2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
  brujo: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
  half: [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15]
};
const lvIdx = lv => Math.max(1, Math.min(MAX_LEVEL, Math.trunc(+lv || 1))) - 1;

export function slotsFor(cls, level) {
  const out = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  if (!cls.caster) return out;
  const i = lvIdx(level);
  if (cls.id === PACT_CASTER) { const [n, lv] = PACT[i]; out[lv - 1] = n; return out; }
  (HALF.includes(cls.id) ? HALF_SLOTS : FULL_SLOTS)[i].forEach((n, k) => { out[k] = n; });
  return out;
}
export const maxSpellLevel = (cls, level) => { const sl = slotsFor(cls, level); return sl.reduce((m, n, i) => n ? i + 1 : m, 0); };

/* Cuántos conjuros elige al crearlo: trucos y preparados de su nivel */
export function spellPicks(cls, level) {
  if (!cls.caster) return 0;
  const i = lvIdx(level), L = i + 1;
  const cant = CANTRIPS[cls.id] ? CANTRIPS[cls.id][0] + (L >= CANTRIPS[cls.id][1] ? 1 : 0) + (L >= CANTRIPS[cls.id][2] ? 1 : 0) : 0;
  const prep = (PREPARED[cls.id] || PREPARED[HALF.includes(cls.id) ? "half" : "full"])[i];
  return cant + prep;
}

/* Los conjuros que puede elegir: los de su clase en la biblioteca (según el
   compendio), hasta el nivel de espacio que alcanza */
const CLASS_NAME = { bardo: "Bardo", brujo: "Brujo", clerigo: "Clérigo", druida: "Druida", explorador: "Explorador", hechicero: "Hechicero", mago: "Mago", paladin: "Paladín" };
const fold = t => String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export function spellOptions(cls, level) {
  if (!cls.caster) return [];
  const top = maxSpellLevel(cls, level), who = CLASS_NAME[cls.id];
  const ofClass = new Set(CONJUROS.filter(c => c.classes.includes(who)).map(c => fold(c.name)));
  const ids = new Set(cls.spells || []);
  return SPELL_LIBRARY.filter(sp => sp.level <= top && (ids.has(sp.id) || ofClass.has(fold(sp.name)) && (sp.level > 0 || CANTRIPS[cls.id])))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "es"));
}

/* Los niveles con mejora de característica (el guerrero tiene más; el pícaro, una extra) */
export function asiLevels(cls, level) {
  const prog = CLASS_PROGRESSION[cls.id];
  if (!prog) return [];
  return prog.levels.map((f, i) => /Mejora de característica/.test(f || "") ? i + 1 : 0).filter(n => n && n <= level);
}
/* La subclase del SRD, con el nivel en que llega */
export function subclassOf(cls) {
  const prog = CLASS_PROGRESSION[cls.id];
  if (!prog) return null;
  return { name: prog.sub.name, level: Math.min(...prog.sub.features.map(f => f[0])), features: prog.sub.features };
}

/* Los rasgos de clase del nivel 2 en adelante (y los de la subclase) */
const strip = t => fold(t).replace(/\s*\(.*?\)\s*/g, "").trim();
export function classFeaturesUpTo(cls, level, { subclass = true } = {}) {
  const prog = CLASS_PROGRESSION[cls.id];
  if (!prog) return [];
  const have = new Set(cls.features.map(([n]) => strip(n)));
  const out = [];
  const explain = name => {
    const key = strip(name);
    const hit = prog.features.find(([n]) => strip(n) === key) || prog.features.find(([n]) => strip(n).startsWith(key) || key.startsWith(strip(n)));
    return hit ? hit[1] : "";
  };
  for (let L = 2; L <= level; L++) {
    for (const raw of String(prog.levels[L - 1] || "").split(/,\s*/)) {
      const name = raw.trim();
      if (!name || name === "—" || /^Mejora de característica/.test(name) || /^rasgo de /i.test(name) || /^(Senda|Colegio|Dominio|Círculo|Arquetipo|Tradición|Juramento|Origen|Patrón|Conclave|Tradición monástica|Arquetipo marcial)/i.test(name) && subclass) continue;
      const key = strip(name);
      if (have.has(key)) continue;
      have.add(key);
      out.push({ name, text: explain(name) || `Rasgo de ${cls.name.toLowerCase()} de nivel ${L}.`, source: "Clase", level: L });
    }
  }
  if (subclass) {
    const sub = subclassOf(cls);
    for (const [L, name, text] of sub.features) {
      if (L > level || have.has(strip(name))) continue;
      have.add(strip(name));
      out.push({ name, text, source: "Clase", level: L, sub: sub.name });
    }
  }
  return out;
}

/* Recursos que crecen con el nivel */
const RAGE = [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6];
function resourcesFor(cls, level, mod) {
  const L = lvIdx(level) + 1;
  const out = (cls.resources || []).map(([name, n]) => {
    let max = typeof n === "number" ? n : Math.max(1, mod(n));
    if (name === "Furia") max = RAGE[L - 1];
    if (name === "Imposición de manos") max = 5 * L;
    if (name === "Tomar aliento") max = L >= 17 ? 4 : L >= 10 ? 3 : 2;
    return { name, uses: 0, max };
  });
  const add = (name, max) => out.push({ name, uses: 0, max });
  if (cls.id === "monje" && L >= 2) add("Puntos de concentración", L);
  if (cls.id === "hechicero" && L >= 2) add("Puntos de hechicería", L);
  if (cls.id === "clerigo" && L >= 2) add("Canalizar divinidad", L >= 18 ? 4 : L >= 6 ? 3 : 2);
  if (cls.id === "paladin" && L >= 3) add("Canalizar divinidad", L >= 11 ? 3 : 2);
  if (cls.id === "druida" && L >= 2) add("Forma salvaje", L >= 17 ? 4 : L >= 6 ? 3 : 2);
  if (cls.id === "guerrero" && L >= 2) add("Oleada de acción", L >= 17 ? 2 : 1);
  if (cls.id === "guerrero" && L >= 9) add("Indomable", L >= 17 ? 3 : L >= 13 ? 2 : 1);
  return out;
}

/* ---------- De las elecciones a la ficha ----------
   choice: { name, classId, speciesId, bgId, base: { str…cha }, free: [abil, abil],
             skills: [ids elegidos], spells: [ids], alignment, color, avatarId, player }
   Devuelve los campos de una ficha de nivel 1, listos para normalizeChar. */

export const ABIL_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
const ABIL_NAME = { str: "Fuerza", dex: "Destreza", con: "Constitución", int: "Inteligencia", wis: "Sabiduría", cha: "Carisma" };
const sign = n => (n >= 0 ? "+" : "") + n;

export function finalScores(choice) {
  const sp = SPECIES.find(s => s.id === choice.speciesId) || {};
  const out = {};
  for (const k of ABIL_KEYS) out[k] = (Number(choice.base && choice.base[k]) || 10) + ((sp.bonus || {})[k] || 0) + ((choice.free || []).includes(k) ? 1 : 0);
  /* Mejoras de característica: +1 y +1 (o +2 si se repite), hasta 20 */
  for (const pair of choice.asi || []) for (const k of pair || []) if (ABIL_KEYS.includes(k) && out[k] < 20) out[k] += 1;
  return out;
}

export function armorClass(cls, scores, kit = cls.kit) {
  const dex = modOf(scores.dex);
  const armor = ARMOR[kit.armor] || ARMOR.ninguna;
  const shield = kit.items.some(([n, , , eq]) => eq && /escudo/i.test(n)) ? 2 : 0;
  let ac;
  if (kit.armor === "ninguna") {
    ac = cls.unarmored === "con" ? 10 + dex + modOf(scores.con)
      : cls.unarmored === "wis" ? 10 + dex + modOf(scores.wis)
      : cls.unarmored === "draconic" ? 13 + dex : 10 + dex;
  } else {
    ac = armor.base + (armor.dex === null ? dex : Math.min(dex, armor.dex)) + (cls.acBonus || 0);
  }
  return ac + shield;
}

export function buildCharacter(choice) {
  const cls = CLASSES.find(c => c.id === choice.classId);
  const sp = SPECIES.find(s => s.id === choice.speciesId);
  const bg = BACKGROUNDS.find(b => b.id === choice.bgId) || BACKGROUNDS[BACKGROUNDS.length - 1];
  if (!cls || !sp) throw new Error("Falta la clase o la especie");
  const level = lvIdx(choice.level) + 1;
  const scores = finalScores(choice);
  const prof = profForLevel(level);
  const mod = k => modOf(scores[k]);

  /* Nivel 1: el dado entero; cada nivel más, la media redondeada hacia arriba */
  const perLevel = (sp.hpPerLevel || 0) + (cls.unarmored === "draconic" ? 1 : 0);
  const hp = Math.max(1, cls.die + mod("con") + perLevel + (level - 1) * (Math.floor(cls.die / 2) + 1 + mod("con") + perLevel));
  const skills = [...new Set([...(choice.skills || []), ...bg.skills, ...(sp.skills || [])])];

  /* Armas: una entrada de ataque por arma distinta; en el equipo, agrupadas */
  const counts = new Map();
  for (const w of cls.kit.weapons) counts.set(w, (counts.get(w) || 0) + 1);
  const attacks = [...counts.keys()].map(key => {
    const w = WEAPONS[key];
    const m = w.ability === "finesse" ? Math.max(mod("str"), mod("dex")) : mod(w.ability);
    return { name: w.name, atk: m + prof, damage: w.damage + (m ? sign(m) : ""), type: w.type, range: w.range };
  });
  const armor = ARMOR[cls.kit.armor];
  const items = [
    ...[...counts].map(([key, n], i) => ({ name: WEAPONS[key].name, qty: n, weight: WEAPONS[key].weight, equipped: i === 0 })),
    ...(armor && armor.name ? [{ name: armor.name, qty: 1, weight: armor.weight, equipped: true }] : []),
    ...cls.kit.items.map(([name, weight, qty = 1, equipped = false]) => ({ name, weight, qty, equipped }))
  ];

  const sub = level > 1 || choice.subclass ? subclassOf(cls) : null;
  const subName = sub && level >= sub.level ? (choice.subclass || sub.name) : "";
  const features = [
    ...cls.features.map(([name, text]) => ({ name, text, source: "Clase" })),
    ...classFeaturesUpTo(cls, level, { subclass: !choice.subclass || choice.subclass === (sub && sub.name) }).map(({ name, text }) => ({ name, text, source: "Clase" })),
    ...sp.traits.map(([name, text]) => ({ name, text, source: "Especie" })),
    { name: bg.name, text: bg.pitch, source: "Trasfondo" },
    ...asiLevels(cls, level).map((L, i) => {
      const pair = (choice.asi || [])[i] || [];
      const txt = pair[0] && pair[0] === pair[1] ? `+2 a ${ABIL_NAME[pair[0]]}` : pair.filter(Boolean).map(k => `+1 a ${ABIL_NAME[k]}`).join(" y ");
      return { name: `Mejora de característica (nivel ${L})`, text: txt || "Sin repartir todavía.", source: "Dote" };
    })
  ];
  const resources = resourcesFor(cls, level, mod);
  const spellbook = (choice.spells || []).map(id => SPELL_LIBRARY.find(s => s.id === id)).filter(Boolean)
    .map(s => normalizeSpell({ ...s, id: uid() }));

  return {
    kind: "pc", name: (choice.name || "").trim() || "Sin nombre",
    className: cls.name, race: sp.name, background: bg.name, level, subclass: subName,
    alignment: choice.alignment || "", player: choice.player || "",
    color: choice.color || cls.tone, avatarId: choice.avatarId || "",
    ...scores, proficiency: prof,
    hp, maxHp: hp, tempHp: 0, ac: armorClass(cls, scores), speed: sp.speed, size: sp.size, vision: sp.vision,
    hitDice: level + "d" + cls.die, saves: cls.saves.slice(), skills,
    attacks, items, features, resources, spellbook,
    castAbility: cls.caster || "", slots: slotsFor(cls, level)
  };
}

/* ---------- Al azar ----------
   Un personaje entero en un clic: clase, especie, trasfondo, características
   repartidas con cabeza (lo que más necesita su clase primero, luego la
   Constitución), habilidades sin repetir, conjuros y un nombre que suena a
   su especie. Las sílabas son nuestras: ningún nombre sale de un libro. */
const SYLLABLES = {
  humano: { m: [["Al", "Ber", "Ro", "Gon", "Ma", "Se", "Lo", "Fer", "Tris", "Ed", "Os"], ["dric", "nal", "drigo", "zalo", "rtín", "bas", "renzo", "nando", "tán", "mund", "valdo"]],
    f: [["El", "Ji", "Ur", "Bea", "Ma", "Al", "Le", "Ro", "Ca", "Is", "Ma"], ["vira", "mena", "raca", "triz", "falda", "dara", "onor", "sana", "talina", "olda", "tilde"]],
    s: ["de Valdorn", "Pedrafría", "Hojarasca", "del Molino", "Altozano", "Cuervoalto", "Manoabierta", "Robledo"] },
  elfo: { m: [["Ae", "Thal", "Syl", "Lae", "Ery", "Fae", "Ilm", "Var"], ["lar", "ion", "van", "ris", "dan", "lith", "aril", "endor"]],
    f: [["Ae", "Lia", "Syl", "Nae", "Ili", "Eli", "Shan", "Thia"], ["lyn", "rel", "via", "riel", "wen", "lara", "dra", "nis"]],
    s: ["Hojaluna", "Brisaplata", "Rocío Estelar", "Ramaserena", "Velasombra"] },
  enano: { m: [["Thor", "Bar", "Dur", "Grim", "Bal", "Ror", "Kil", "Dain"], ["in", "rik", "gan", "nar", "dur", "gar", "bek", "ok"]],
    f: [["Hil", "Dis", "Bru", "Gun", "Ama", "Vis", "Tor", "Eld"], ["da", "ra", "nhild", "loda", "ber", "tra", "gret", "ja"]],
    s: ["Yunquehondo", "Barbadehierro", "Martillogrís", "Piedraforja", "Hachaferrea"] },
  mediano: { m: [["Mi", "Pe", "Ro", "Wel", "Cor", "Mer", "Fin", "Os"], ["lo", "rrin", "sco", "by", "rin", "ric", "nan", "bert"]],
    f: [["Ro", "Li", "Ver", "Ca", "Ma", "Pe", "Bel", "Ki"], ["sie", "dda", "na", "llie", "rigold", "onia", "la", "ra"]],
    s: ["Buenbarril", "Colinaverde", "Pieligero", "Tejadilla", "Altosauce"] },
  draconido: { m: [["Ar", "Kri", "Ba", "Ghe", "Med", "Na", "Tor", "Dor"], ["jhan", "v", "lasar", "sh", "rash", "dar", "inn", "nax"]],
    f: [["Ak", "Bi", "Da", "Far", "Ha", "Kava", "Sora", "Thav"], ["ra", "ri", "ar", "ideh", "vilar", "rith", "na", "a"]],
    s: ["del Clan Escamarroja", "Alarrota", "Hijo del Volcán", "Garra de Bronce"] },
  gnomo: { m: [["Fiz", "Bim", "Nim", "Tock", "Wiz", "Gim", "Bod", "Zook"], ["ble", "wick", "pip", "ket", "zel", "ble", "dyn", "o"]],
    f: [["Bree", "Nis", "Ella", "Lilli", "Roy", "Tana", "Zan", "Ori"], ["na", "sa", "wyn", "pip", "ana", "bel", "na", "ka"]],
    s: ["Engranaje", "Chispatuerca", "Muelleloco", "Relojerillo"] },
  semiorco: { m: [["Grul", "Dench", "Hen", "Kru", "Shum", "Thok", "Ush", "Mok"], ["sh", "", "k", "sk", "p", "ar", "dra", "gar"]],
    f: [["Baga", "Emen", "Engo", "Myev", "Ovak", "Sutha", "Volen", "Yev"], ["", "", "ng", "", "", "", "", "elda"]],
    s: ["Rompehuesos", "Colmillo Roto", "el Paciente", "Puñohondo"] },
  tiefling: { m: [["Ak", "Dam", "Ek", "Kai", "Le", "Mor", "Ska", "Za"], ["menos", "akos", "emon", "ron", "ucis", "thos", "mos", "ruel"]],
    f: [["Ak", "Bry", "Kal", "Ne", "Or", "Ri", "Ma", "Ve"], ["ta", "seis", "lista", "mia", "ianna", "eta", "kara", "xa"]],
    s: ["Esperanza", "Ruina", "Ceniza", "Canción", "Penitencia", "Promesa"] }
};
SYLLABLES.semielfo = { m: [SYLLABLES.humano.m[0], SYLLABLES.elfo.m[1]], f: [SYLLABLES.elfo.f[0], SYLLABLES.humano.f[1]], s: [...SYLLABLES.humano.s, ...SYLLABLES.elfo.s] };

const pickOne = (R, list) => list[Math.floor(R() * list.length)];
function sample(R, list, n) {
  const pool = [...list], out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
  return out;
}

export function randomName(speciesId, R = Math.random) {
  const t = SYLLABLES[speciesId] || SYLLABLES.humano;
  const g = R() < 0.5 ? t.m : t.f;
  const first = pickOne(R, g[0]) + pickOne(R, g[1]);
  return R() < 0.6 ? `${first} ${pickOne(R, t.s)}` : first;
}

/* Devuelve lo mismo que elegiría alguien en el creador, paso por paso */
export function randomChoice(R = Math.random) {
  const cls = pickOne(R, CLASSES), sp = pickOne(R, SPECIES);
  const spSkills = sp.skills || [];
  const classSkills = sample(R, cls.from.filter(k => !spSkills.includes(k)), cls.choose);
  const extraSkills = sp.extraSkills ? sample(R, ALL_SKILLS.filter(k => !classSkills.includes(k) && !spSkills.includes(k)), sp.extraSkills) : [];
  /* Primero lo que pide la clase, luego aguantar, luego el resto al azar */
  const order = [...new Set([...cls.primary, "con", ...sample(R, ABIL_KEYS, ABIL_KEYS.length)])];
  const assign = Object.fromEntries(order.map((k, i) => [k, i]));
  const base = Object.fromEntries(ABIL_KEYS.map(k => [k, STANDARD_ARRAY[assign[k]]]));
  const free = sp.freeBonus ? order.filter(k => !(sp.bonus || {})[k]).slice(0, sp.freeBonus) : [];
  const bg = R() < 0.85 ? pickOne(R, BACKGROUNDS.filter(b => !b.free)) : BACKGROUNDS.find(b => b.free);
  const owned = [...classSkills, ...extraSkills, ...spSkills];
  const repeats = bg.skills.filter(k => owned.includes(k)).length;
  const bgSkills = sample(R, ALL_SKILLS.filter(k => !owned.includes(k) && !bg.skills.includes(k)), (bg.free || 0) + repeats);
  const spells = cls.spells ? sample(R, cls.spells, cls.pick) : [];
  const name = randomName(sp.id, R);
  const alignment = pickOne(R, ALIGNMENTS);
  return {
    choice: { name, classId: cls.id, speciesId: sp.id, bgId: bg.id, base, free, skills: [...classSkills, ...bgSkills, ...extraSkills],
      spells, alignment, color: cls.tone, avatarId: "", player: "" },
    state: { classId: cls.id, classSkills, speciesId: sp.id, free, extraSkills, method: "estandar", assign, bgId: bg.id, bgSkills,
      spells, spellsFor: cls.id, name, alignment, color: cls.tone }
  };
}
