/* El bestiario de la biblioteca: las criaturas de Mesa (y las que el DM haya
   añadido o retocado), una sección por tipo y, dentro, de menos a más
   desafío. Cada una con su ficha completa en pergamino. */

import { bestiaryOf } from "../schema.js";
import { typeOf, crValue, TYPE_NAMES } from "../catalog.js";
import { statBlockHTML } from "../statblock.js";
import { esc } from "../util.js";

const INTRO = {
  "Aberración": "Seres ajenos a toda lógica natural, a menudo llegados de más allá de las estrellas o del Reino Lejano.",
  "Bestia": "Animales corrientes o gigantes, sin magia propia: lobos, osos, arañas, caballos.",
  "Celestial": "Criaturas de los planos superiores, al servicio de dioses buenos.",
  "Constructo": "Hechos, no nacidos: gólems, armaduras animadas, centinelas mágicos.",
  "Dragón": "Reptiles alados de enorme poder, astucia y codicia; cuanto más viejos, más temibles.",
  "Elemental": "Seres de aire, tierra, fuego o agua pura, de los planos elementales.",
  "Hada": "Criaturas mágicas del Feywild, caprichosas y ligadas a la naturaleza.",
  "Infernal": "Demonios y diablos de los planos inferiores, la maldad hecha carne.",
  "Gigante": "Humanoides enormes: ogros, trolls, gigantes de las colinas o de las tormentas.",
  "Humanoide": "Gentes de todas las especies: bandidos, guardias, cultistas, magos.",
  "Monstruosidad": "Criaturas terribles y antinaturales, fruto de la magia o de maldiciones.",
  "Cieno": "Masas gelatinosas que disuelven lo que tocan.",
  "Planta": "Vegetación animada o carnívora, a veces muy antigua.",
  "Muerto viviente": "Cadáveres y espíritus que la magia oscura no deja descansar."
};
const PLURAL = {
  "Aberración": "Aberraciones", "Bestia": "Bestias", "Celestial": "Celestiales", "Constructo": "Constructos", "Dragón": "Dragones",
  "Elemental": "Elementales", "Hada": "Hadas", "Infernal": "Infernales", "Gigante": "Gigantes", "Humanoide": "Humanoides",
  "Monstruosidad": "Monstruosidades", "Cieno": "Cienos", "Planta": "Plantas", "Muerto viviente": "Muertos vivientes"
};

export function bestiaryBook(own = []) {
  const all = bestiaryOf({ bestiary: own });
  const byType = new Map();
  for (const b of all) {
    const t = typeOf(b.sizeType) || "Otras";
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t).push(b);
  }
  const order = [...TYPE_NAMES].sort((a, b) => (PLURAL[a] || a).localeCompare(PLURAL[b] || b, "es"));
  if (byType.has("Otras")) order.push("Otras");
  const sections = order.filter(t => byType.has(t)).map(t => ({
    id: "t-" + t.toLowerCase().replace(/\s+/g, "-"),
    title: PLURAL[t] || t,
    intro: INTRO[t] ? `<p>${esc(INTRO[t])}</p>` : "",
    entries: byType.get(t).sort((a, b) => crValue(a.cr) - crValue(b.cr) || a.name.localeCompare(b.name, "es")).map(b => ({
      id: b.id, title: b.name,
      meta: `Desafío ${esc(b.cr || "0")} · ${Number(b.xp || 0).toLocaleString("es")} PX · ${esc(b.sizeType || "")}`,
      html: statBlockHTML(b)
    }))
  }));
  /* Un índice por desafío al principio, para buscar rivales a la medida */
  const tiers = [["Desafío 0 a 1/2", 0, 0.5], ["Desafío 1 a 4", 1, 4], ["Desafío 5 a 10", 5, 10], ["Desafío 11 o más", 11, 99]];
  sections.unshift({
    id: "por-desafio", title: "Por desafío",
    intro: "<p>Todas las criaturas por valor de desafío. Toca un nombre en el buscador para ir a su ficha.</p>",
    entries: tiers.map(([title, lo, hi]) => ({
      id: "cr-" + lo, title,
      html: `<ul class="tome-cols">${all.filter(b => crValue(b.cr) >= lo && crValue(b.cr) <= hi).sort((a, b) => crValue(a.cr) - crValue(b.cr))
        .map(b => `<li><b>${esc(b.name)}</b> <small>VD ${esc(b.cr || "0")} · ${esc(typeOf(b.sizeType) || "")}</small></li>`).join("")}</ul>`
    }))
  });
  return { sections };
}
