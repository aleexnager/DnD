/* Las fichas de ejemplo del tutorial.

   Para explicar una tarjeta, una ficha desplegada o la barra de turnos hace
   falta tenerlas delante, y una partida recién empezada no tiene nada. El
   tutorial pone entonces en la pantalla del DM una clériga y un goblin de
   ejemplo, con de todo para enseñar: vida temporal, un estado con rondas,
   concentración, inspiración, espacios de conjuro, salvaciones de muerte,
   un efecto encendido, ataques y conjuros.

   Solo existen en esa pantalla: no se mandan al servidor, no los ven los
   jugadores ni la tele, y lo que se intente cambiar en ellos no llega a la
   partida (ver setOpGuard en net.js). Sus id empiezan por «tour-ex». */

import { normalizeChar } from "./schema.js";
import { CATALOG_BY_ID } from "./catalog.js";
import { SPELL_LIBRARY } from "./spells.js";

export const EXAMPLE_PREFIX = "tour-ex";
export const isExample = id => String(id || "").startsWith(EXAMPLE_PREFIX);
/* Lo que delata a una ficha de ejemplo en una tirada o un mensaje */
export const EXAMPLE_MARK = /\((?:ejemplo|example)\)/i;

export function exampleChars(en = false) {
  const tag = en ? "(example)" : "(ejemplo)";
  const atk = (name, atkBonus, damage, type, range) => ({ name, atk: atkBonus, damage, type, range });
  const spells = (...ids) => ids.map(id => SPELL_LIBRARY.find(sp => sp.id === id)).filter(Boolean).map(sp => ({ ...sp }));
  const pc = normalizeChar({
    id: EXAMPLE_PREFIX + "-pc", kind: "pc", name: `Brisa ${tag}`, className: "Clériga", race: "Semielfa", level: 3,
    color: "#d99a2b", hp: 17, maxHp: 24, tempHp: 4, ac: 16, speed: 30, initiative: 14,
    str: 12, dex: 10, con: 14, int: 10, wis: 16, cha: 13, hitDice: "3d8", hitDiceUsed: 1,
    saves: ["wis", "cha"], skills: ["medicina", "perspicacia", "religion", "persuasion"],
    conditions: ["envenenado"], condMeta: { envenenado: 2 }, concentration: "Bendecir", inspiration: true,
    deathOk: 1, deathFail: 1,
    castAbility: "wis", slots: [4, 2, 0, 0, 0, 0, 0, 0, 0], slotsUsed: [1, 0, 0, 0, 0, 0, 0, 0, 0],
    resources: [{ name: "Canalizar divinidad", uses: 0, max: 1 }],
    buffs: [{ name: "Bendecir", attack: "1d4", save: "1d4" }],
    attacks: [atk("Maza", 3, "1d6+1", "contundente", "5 pies"), atk("Ballesta ligera", 2, "1d8", "perforante", "80/320 pies")],
    spellbook: spells("llama-sagrada", "bendecir", "curar-heridas", "palabra-curativa", "saeta-guia"),
    items: [{ name: "Maza", weight: 4, qty: 1, equipped: true }, { name: "Cota de escamas", weight: 45, qty: 1, equipped: true },
      { name: "Escudo", weight: 6, qty: 1, equipped: true }, { name: "Símbolo sagrado", weight: 1, qty: 1, equipped: true }],
    features: [{ name: "Canalizar divinidad", source: "Clase", text: "Expulsar muertos vivientes, una vez por descanso." },
      { name: "Visión en la oscuridad", source: "Especie", text: "Ves en la penumbra a 60 pies como si hubiera luz." }],
    senses: "Visión en la oscuridad 60 pies", languages: "Común, élfico",
    notes: en ? "An example sheet from the tutorial: only you can see it." : "Ficha de ejemplo del tutorial: solo la ves tú.",
    claimedBy: "Lu", mapId: EXAMPLE_PREFIX + "-map", mx: 2, my: 2
  });
  const goblin = CATALOG_BY_ID.get("cat-goblin") || {};
  const { id: _id, en: _en, hpAvg, hpDice: _dice, custom: _c, ...sheet } = goblin;
  const foe = normalizeChar({
    ...sheet, id: EXAMPLE_PREFIX + "-foe", kind: "monster", monsterKey: goblin.id, name: `Goblin ${tag}`,
    hp: 4, maxHp: hpAvg || 7, ac: sheet.ac || 15, speed: 30, initiative: 12, discovered: true,
    notes: en ? "Ambushes from the bushes on the road." : "Embosca desde los matorrales del camino."
  });
  return { pc, foe, list: [pc, foe] };
}

/* Un combate de ejemplo: Brisa juega su turno, con la acción ya gastada y
   10 pies andados; después va el goblin */
export const exampleCombat = (ex, index = 0) => ({ on: true, round: 2, index, order: ex.list.map(c => c.id) });
