/* Criaturas listas para arrastrar a la mesa. Todo es editable desde el bestiario.

   Las fichas viven en bestiario-datos.js: las reglas de 2024 (SRD 5.2.1 de
   Wizards of the Coast, CC BY 4.0,
   https://creativecommons.org/licenses/by/4.0/legalcode) traducidas enteras.
   Los retratos son iconos de game-icons.net (Lorc, Delapouite y otros autores,
   CC BY 3.0) pintados todos con la misma tinta: ver public/bestiario/LICENCIA.txt.

   Cada criatura lleva su versión en inglés en «en»: el diccionario de i18n.js
   la lee de aquí, línea a línea, para no tener que repetirla allí.

   Convenciones de las acciones, que attacks.js lee para tirar de un clic:
   - «Nombre — +4 al ataque — 1d6+2 cortante»: ataque con tirada.
   - «Nombre — CD 13 de Destreza — 7d6 fuego…»: salvación, mitad si la supera.
   - Los efectos que no se tiran solos llevan la salvación al revés
     («salvación de Constitución CD 11»), y así no se confunden con un ataque. */

/* Un color por tipo de criatura: en el tablero se distingue de un vistazo el
   muerto viviente del infernal. Dragones y elementales llevan el suyo. */
export const TYPE_COLORS = {
  "Humanoide": "#c9ae82", "Bestia": "#a58058", "Muerto viviente": "#aba79d",
  "Monstruosidad": "#cf8f45", "Gigante": "#b9805f", "Dragón": "#c9524a",
  "Aberración": "#9a83c9", "Infernal": "#c0545a", "Feérico": "#7cc4a0",
  "Elemental": "#d9a35a", "Constructo": "#8d9aa8", "Cieno": "#a3c14e",
  "Planta": "#76a456", "Celestial": "#e2c45e"
};
export const TYPE_NAMES = Object.keys(TYPE_COLORS);

/* «Muerto viviente mediano» -> «Muerto viviente» */
export function typeOf(sizeType) {
  /* Los enjambres van en plural: «Enjambre mediano de muertos vivientes diminutos» */
  const t = String(sizeType || "").toLowerCase().replace("muertos vivientes", "muerto viviente");
  return TYPE_NAMES.find(n => t.startsWith(n.toLowerCase()))
    || TYPE_NAMES.find(n => t.includes(n.toLowerCase())) || "";
}

import { BEASTS } from "./bestiario-datos.js";

const art = icon => "bestiario/" + icon + ".svg";

/* Puntos de experiencia por valor de desafío */
const XP = {
  "0": 10, "1/8": 25, "1/4": 50, "1/2": 100, "1": 200, "2": 450, "3": 700, "4": 1100,
  "5": 1800, "6": 2300, "7": 2900, "8": 3900, "9": 5000, "10": 5900, "11": 7200,
  "12": 8400, "13": 10000, "14": 11500, "15": 13000, "16": 15000, "17": 18000,
  "18": 20000, "19": 22000, "20": 25000, "21": 33000, "22": 41000, "23": 50000,
  "24": 62000, "30": 155000
};
export const crValue = cr => {
  const s = String(cr || "0").trim();
  if (s.includes("/")) { const [a, b] = s.split("/").map(Number); return b ? a / b : 0; }
  return Number(s) || 0;
};

/* Lo que no viene escrito en cada ficha se completa aquí: los PX salen del
   VD, el color del tipo y el retrato del icono. */
export const CATALOG = BEASTS.map(({ icon, ...b }) => ({
  senses: "", languages: "", resistances: "", traits: "",
  ...b,
  xp: b.xp ?? XP[b.cr] ?? 0,
  color: b.color || TYPE_COLORS[typeOf(b.sizeType)] || "#8a5a3b",
  avatarId: icon ? art(icon) : ""
}));

/* Para quien busca «owlbear» con la interfaz en español, y para i18n.js */
export const CATALOG_BY_ID = new Map(CATALOG.map(b => [b.id, b]));
