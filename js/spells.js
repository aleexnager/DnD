/* Biblioteca de conjuros: los más usados del reglamento básico (SRD 5.1), con
   lo que hacen escrito para que la mesa los resuelva sola. Se copian a la
   ficha de cada personaje y ahí se pueden retocar.

   Los campos están explicados en normalizeSpell (schema.js). */

import { normalizeSpell } from "./schema.js";

const S = (o) => normalizeSpell(o);

export const SPELL_LIBRARY = [
  /* ---------- Trucos ---------- */
  S({ id: "rayo-de-fuego", name: "Rayo de fuego", level: 0, school: "Evocación", time: "1 acción", range: "120 pies",
    mode: "attack", damage: "1d10", type: "fuego", scale: true,
    desc: "Ataque de conjuro a distancia. Un objeto inflamable que impacte arde." }),
  S({ id: "rayo-de-escarcha", name: "Rayo de escarcha", level: 0, school: "Evocación", time: "1 acción", range: "60 pies",
    mode: "attack", damage: "1d8", type: "frío", scale: true,
    desc: "Ataque de conjuro a distancia. Si impacta, su velocidad baja 10 pies hasta tu próximo turno." }),
  S({ id: "llama-sagrada", name: "Llama sagrada", level: 0, school: "Evocación", time: "1 acción", range: "60 pies",
    mode: "save", save: "dex", damage: "1d8", type: "radiante", scale: true,
    desc: "Salvación de Destreza o recibe el daño. No le sirve de nada estar a cubierto." }),
  S({ id: "burla-danina", name: "Burla dañina", level: 0, school: "Encantamiento", time: "1 acción", range: "60 pies",
    mode: "save", save: "wis", damage: "1d4", type: "psíquico", scale: true,
    desc: "Salvación de Sabiduría o recibe el daño y tiene desventaja en su próxima tirada de ataque." }),
  S({ id: "toque-helado", name: "Toque helado", level: 0, school: "Nigromancia", time: "1 acción", range: "120 pies",
    mode: "attack", damage: "1d8", type: "necrótico", scale: true,
    desc: "Ataque de conjuro a distancia. Si impacta, no puede recuperar vida hasta tu próximo turno." }),
  S({ id: "descarga-sobrenatural", name: "Descarga sobrenatural", level: 0, school: "Evocación", time: "1 acción", range: "120 pies",
    mode: "attack", damage: "1d10", type: "fuerza", scale: true, scaleRays: true,
    desc: "Un rayo por nivel de truco (2 a nivel 5, 3 a nivel 11, 4 a nivel 17); cada uno es un ataque." }),
  S({ id: "rociada-venenosa", name: "Rociada venenosa", level: 0, school: "Conjuración", time: "1 acción", range: "10 pies",
    mode: "save", save: "con", damage: "1d12", type: "veneno", scale: true,
    desc: "Salvación de Constitución o recibe el daño." }),
  S({ id: "salpicadura-acida", name: "Salpicadura ácida", level: 0, school: "Conjuración", time: "1 acción", range: "60 pies",
    mode: "save", save: "dex", damage: "1d6", type: "ácido", scale: true, targets: 2,
    desc: "Una o dos criaturas a 5 pies entre sí. Salvación de Destreza o reciben el daño." }),

  /* ---------- Nivel 1 ---------- */
  S({ id: "proyectil-magico", name: "Proyectil mágico", level: 1, school: "Evocación", time: "1 acción", range: "120 pies",
    mode: "auto", darts: 3, damage: "1d4+1", type: "fuerza", targets: 3,
    desc: "Tres dardos que impactan siempre, uno más por cada nivel por encima del 1. Se reparten entre los objetivos." }),
  S({ id: "manos-ardientes", name: "Manos ardientes", level: 1, school: "Evocación", time: "1 acción", range: "Cono de 15 pies",
    mode: "save", save: "dex", half: true, damage: "3d6", upcast: "1d6", type: "fuego", targets: 20, shape: "cone", size: 15,
    desc: "Salvación de Destreza: daño completo si falla, la mitad si la supera." }),
  S({ id: "ola-atronadora", name: "Ola atronadora", level: 1, school: "Evocación", time: "1 acción", range: "Cubo de 15 pies",
    mode: "save", save: "con", half: true, damage: "2d8", upcast: "1d8", type: "trueno", targets: 20, shape: "square", size: 7.5,
    desc: "Salvación de Constitución: si falla, recibe el daño y sale empujada 10 pies; si la supera, la mitad." }),
  S({ id: "curar-heridas", name: "Curar heridas", level: 1, school: "Evocación", time: "1 acción", range: "Toque",
    mode: "heal", heal: "1d8", healMod: true, upcast: "1d8",
    desc: "Recupera 1d8 más tu característica de lanzamiento, y 1d8 más por cada nivel por encima del 1." }),
  S({ id: "palabra-curativa", name: "Palabra curativa", level: 1, school: "Evocación", time: "1 acción adicional", range: "60 pies",
    mode: "heal", heal: "1d4", healMod: true, upcast: "1d4",
    desc: "Recupera 1d4 más tu característica de lanzamiento, a distancia y con una acción adicional." }),
  S({ id: "saeta-guia", name: "Saeta guía", level: 1, school: "Evocación", time: "1 acción", range: "120 pies",
    mode: "attack", damage: "4d6", upcast: "1d6", type: "radiante",
    desc: "Ataque de conjuro a distancia. El siguiente ataque contra el objetivo tiene ventaja." }),
  S({ id: "infligir-heridas", name: "Infligir heridas", level: 1, school: "Nigromancia", time: "1 acción", range: "Toque",
    mode: "attack", melee: true, damage: "3d10", upcast: "1d10", type: "necrótico",
    desc: "Ataque de conjuro cuerpo a cuerpo." }),
  S({ id: "dormir", name: "Dormir", level: 1, school: "Encantamiento", time: "1 acción", range: "90 pies",
    mode: "sleep", damage: "5d8", upcast: "2d8", cond: "inconsciente", condRounds: 10, targets: 20, shape: "circle", size: 20,
    desc: "Tira 5d8: duermen las criaturas del área de menos a más vida hasta agotar la cuenta." }),
  S({ id: "hechizar-persona", name: "Hechizar persona", level: 1, school: "Encantamiento", time: "1 acción", range: "30 pies",
    mode: "save", save: "wis", cond: "encantado", condRounds: 600, targetsUp: 1,
    desc: "Salvación de Sabiduría o queda encantada una hora. Una criatura más por cada nivel por encima del 1." }),
  S({ id: "orden-imperiosa", name: "Orden imperiosa", level: 1, school: "Encantamiento", time: "1 acción", range: "60 pies",
    mode: "save", save: "wis", failText: "obedece la orden en su próximo turno", targetsUp: 1,
    desc: "Salvación de Sabiduría o cumple una orden de una palabra (huye, suelta, cae, alto…)." }),
  S({ id: "enmaranar", name: "Enmarañar", level: 1, school: "Conjuración", time: "1 acción", range: "90 pies",
    mode: "save", save: "str", cond: "apresado", condRounds: 10, conc: true, duration: "Concentración, 1 minuto",
    targets: 20, shape: "square", size: 10,
    desc: "Un cuadrado de 20 pies de maleza. Salvación de Fuerza o queda apresada." }),
  S({ id: "bendecir", name: "Bendecir", level: 1, school: "Encantamiento", time: "1 acción", range: "30 pies",
    mode: "none", conc: true, duration: "Concentración, 1 minuto", targets: 3, targetsUp: 1,
    desc: "Hasta tres criaturas suman 1d4 a sus ataques y salvaciones." }),
  S({ id: "escudo-de-fe", name: "Escudo de fe", level: 1, school: "Abjuración", time: "1 acción adicional", range: "60 pies",
    mode: "none", conc: true, duration: "Concentración, 10 minutos",
    desc: "Una criatura gana +2 a la CA mientras dure." }),

  /* ---------- Nivel 2 ---------- */
  S({ id: "inmovilizar-persona", name: "Inmovilizar persona", level: 2, school: "Encantamiento", time: "1 acción", range: "60 pies",
    mode: "save", save: "wis", cond: "paralizado", condRounds: 10, conc: true, duration: "Concentración, 1 minuto", targetsUp: 1,
    desc: "Salvación de Sabiduría o queda paralizado. Repite la salvación al final de cada turno suyo." }),
  S({ id: "rayo-abrasador", name: "Rayo abrasador", level: 2, school: "Evocación", time: "1 acción", range: "120 pies",
    mode: "attack", rays: 3, raysUp: 1, damage: "2d6", type: "fuego", targets: 3,
    desc: "Tres rayos, uno más por cada nivel por encima del 2. Cada uno es un ataque; se reparten entre los objetivos." }),
  S({ id: "telarana", name: "Telaraña", level: 2, school: "Conjuración", time: "1 acción", range: "60 pies",
    mode: "save", save: "dex", cond: "apresado", condRounds: 10, conc: true, duration: "Concentración, 1 hora",
    targets: 20, shape: "square", size: 10,
    desc: "Un cubo de 20 pies de telarañas. Salvación de Destreza o queda apresada." }),
  S({ id: "ceguera-sordera", name: "Ceguera/sordera", level: 2, school: "Nigromancia", time: "1 acción", range: "30 pies",
    mode: "save", save: "con", cond: "cegado", condRounds: 10, targetsUp: 1,
    desc: "Salvación de Constitución o queda cegada (o ensordecida, a elegir) un minuto." }),
  S({ id: "romper", name: "Romper", level: 2, school: "Evocación", time: "1 acción", range: "60 pies",
    mode: "save", save: "con", half: true, damage: "3d8", upcast: "1d8", type: "trueno", targets: 20, shape: "circle", size: 10,
    desc: "Esfera de 10 pies. Salvación de Constitución: completo si falla, la mitad si la supera." }),
  S({ id: "arma-espiritual", name: "Arma espiritual", level: 2, school: "Evocación", time: "1 acción adicional", range: "60 pies",
    mode: "attack", melee: true, damage: "1d8", type: "fuerza",
    desc: "Ataque de conjuro cuerpo a cuerpo con el arma flotante; se puede repetir cada turno con una acción adicional." }),

  /* ---------- Nivel 3 ---------- */
  S({ id: "bola-de-fuego", name: "Bola de fuego", level: 3, school: "Evocación", time: "1 acción", range: "150 pies",
    mode: "save", save: "dex", half: true, damage: "8d6", upcast: "1d6", type: "fuego", targets: 20, shape: "circle", size: 20,
    desc: "Esfera de 20 pies. Salvación de Destreza: completo si falla, la mitad si la supera." }),
  S({ id: "relampago", name: "Relámpago", level: 3, school: "Evocación", time: "1 acción", range: "Línea de 100 pies",
    mode: "save", save: "dex", half: true, damage: "8d6", upcast: "1d6", type: "relámpago", targets: 20, shape: "line", size: 100, width: 5,
    desc: "Línea de 100 por 5 pies. Salvación de Destreza: completo si falla, la mitad si la supera." }),
  S({ id: "miedo", name: "Miedo", level: 3, school: "Ilusión", time: "1 acción", range: "Cono de 30 pies",
    mode: "save", save: "wis", cond: "asustado", condRounds: 10, conc: true, duration: "Concentración, 1 minuto",
    targets: 20, shape: "cone", size: 30,
    desc: "Salvación de Sabiduría o suelta lo que lleve y queda asustada." }),
  S({ id: "espiritus-guardianes", name: "Espíritus guardianes", level: 3, school: "Conjuración", time: "1 acción", range: "15 pies",
    mode: "save", save: "wis", half: true, damage: "3d8", upcast: "1d8", type: "radiante", conc: true, duration: "Concentración, 10 minutos",
    targets: 20, shape: "circle", size: 15,
    desc: "Daño a quien entre o empiece su turno en el área. Salvación de Sabiduría para la mitad." }),
  S({ id: "palabra-curativa-en-masa", name: "Palabra curativa en masa", level: 3, school: "Evocación", time: "1 acción adicional", range: "60 pies",
    mode: "heal", heal: "1d4", healMod: true, upcast: "1d4", targets: 6,
    desc: "Hasta seis criaturas recuperan 1d4 más tu característica de lanzamiento." }),
  S({ id: "revivificar", name: "Revivificar", level: 3, school: "Nigromancia", time: "1 acción", range: "Toque",
    mode: "none", desc: "Una criatura muerta en el último minuto vuelve con 1 punto de vida." }),

  /* ---------- Nivel 4 y 5 ---------- */
  S({ id: "tormenta-de-hielo", name: "Tormenta de hielo", level: 4, school: "Evocación", time: "1 acción", range: "300 pies",
    mode: "save", save: "dex", half: true, damage: "2d8+4d6", upcast: "1d8", type: "contundente y frío", targets: 20, shape: "circle", size: 20,
    desc: "Cilindro de 20 pies. Salvación de Destreza: completo si falla, la mitad si la supera." }),
  S({ id: "destierro", name: "Destierro", level: 4, school: "Abjuración", time: "1 acción", range: "60 pies",
    mode: "save", save: "cha", failText: "queda desterrada a otro plano", conc: true, duration: "Concentración, 1 minuto", targetsUp: 1,
    desc: "Salvación de Carisma o desaparece mientras dure." }),
  S({ id: "cono-de-frio", name: "Cono de frío", level: 5, school: "Evocación", time: "1 acción", range: "Cono de 60 pies",
    mode: "save", save: "con", half: true, damage: "8d8", upcast: "1d8", type: "frío", targets: 20, shape: "cone", size: 60,
    desc: "Salvación de Constitución: completo si falla, la mitad si la supera." }),
  S({ id: "golpe-flamigero", name: "Golpe flamígero", level: 5, school: "Evocación", time: "1 acción", range: "60 pies",
    mode: "save", save: "dex", half: true, damage: "4d6+4d6", upcast: "1d6", type: "fuego y radiante", targets: 20, shape: "circle", size: 10,
    desc: "Columna de 10 pies de radio. Salvación de Destreza: completo si falla, la mitad si la supera." }),
  S({ id: "curar-heridas-en-masa", name: "Curar heridas en masa", level: 5, school: "Evocación", time: "1 acción", range: "60 pies",
    mode: "heal", heal: "3d8", healMod: true, upcast: "1d8", targets: 6,
    desc: "Hasta seis criaturas recuperan 3d8 más tu característica de lanzamiento." }),
  S({ id: "inmovilizar-monstruo", name: "Inmovilizar monstruo", level: 5, school: "Encantamiento", time: "1 acción", range: "90 pies",
    mode: "save", save: "wis", cond: "paralizado", condRounds: 10, conc: true, duration: "Concentración, 1 minuto", targetsUp: 1,
    desc: "Como Inmovilizar persona, pero sirve con cualquier criatura." })
];

/* Característica de lanzamiento que suele usar cada clase */
export function guessAbility(className = "") {
  const c = className.toLowerCase();
  if (/mago|maga|wizard|artífice|artificer/.test(c)) return "int";
  if (/clérig|cleric|druid|explorador|ranger|monje|monk/.test(c)) return "wis";
  if (/bard|hechicer|sorcer|brujo|bruja|warlock|paladín|paladin/.test(c)) return "cha";
  return "int";
}
