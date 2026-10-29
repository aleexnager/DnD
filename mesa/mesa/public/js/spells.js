/* Biblioteca de conjuros: los más usados de las reglas de 2024 (SRD 5.2.1 de
   Wizards of the Coast, CC BY 4.0), con lo que hacen escrito para que la mesa
   los resuelva sola. Se copian a la
   ficha de cada personaje y ahí se pueden retocar.

   Los campos están explicados en normalizeSpell (schema.js). */

import { normalizeSpell, registerSpellLibrary, registerSpellUpgrade } from "./schema.js";

const S = (o) => normalizeSpell(o);

export const SPELL_LIBRARY = [
  /* ---------- Trucos ---------- */
  S({ id: "rayo-de-fuego", name: "Rayo de fuego", level: 0, school: "Evocación", time: "Acción", range: "120 pies", components: "V, S",
    duration: "Instantáneo", mode: "attack", damage: "1d10", type: "fuego", scale: true,
    desc: "Ataque de conjuro a distancia contra una criatura u objeto. Un objeto inflamable que impacte y que nadie lleve puesto ni cargue empieza a arder. Sube 1d10 a los niveles 5, 11 y 17." }),
  S({ id: "rayo-de-escarcha", name: "Rayo de escarcha", level: 0, school: "Evocación", time: "Acción", range: "60 pies", components: "V, S",
    duration: "Instantáneo", mode: "attack", damage: "1d8", type: "frío", scale: true,
    desc: "Ataque de conjuro a distancia. Si impacta, su velocidad baja 10 pies hasta el principio de tu siguiente turno. Sube 1d8 a los niveles 5, 11 y 17." }),
  S({ id: "llama-sagrada", name: "Llama sagrada", level: 0, school: "Evocación", time: "Acción", range: "60 pies", components: "V, S",
    duration: "Instantáneo", mode: "save", save: "dex", damage: "1d8", type: "radiante", scale: true,
    desc: "Una criatura que veas hace una salvación de Destreza o recibe el daño. La cobertura media o de tres cuartos no le sirve. Sube 1d8 a los niveles 5, 11 y 17." }),
  S({ id: "burla-danina", name: "Burla dañina", level: 0, school: "Encantamiento", time: "Acción", range: "60 pies", components: "V",
    duration: "Instantáneo", mode: "save", save: "wis", damage: "1d6", type: "psíquico", scale: true,
    failText: "desventaja en su próxima tirada de ataque antes del final de su siguiente turno",
    desc: "Una criatura que veas u oigas hace una salvación de Sabiduría o recibe el daño y tiene desventaja en la próxima tirada de ataque que haga antes del final de su siguiente turno. Sube 1d6 a los niveles 5, 11 y 17." }),
  S({ id: "toque-helado", name: "Toque helado", level: 0, school: "Nigromancia", time: "Acción", range: "Toque", components: "V, S",
    duration: "Instantáneo", mode: "attack", melee: true, damage: "1d10", type: "necrótico", scale: true,
    desc: "Ataque de conjuro cuerpo a cuerpo contra un objetivo a tu alcance. Si impacta, no puede recuperar puntos de golpe hasta el final de tu siguiente turno. Sube 1d10 a los niveles 5, 11 y 17." }),
  S({ id: "descarga-sobrenatural", name: "Descarga sobrenatural", level: 0, school: "Evocación", time: "Acción", range: "120 pies", components: "V, S",
    duration: "Instantáneo", mode: "attack", damage: "1d10", type: "fuerza", scale: true, scaleRays: true,
    desc: "Ataque de conjuro a distancia contra una criatura u objeto. Crea dos rayos a nivel 5, tres a nivel 11 y cuatro a nivel 17, contra el mismo objetivo o contra varios, con una tirada de ataque por rayo." }),
  S({ id: "rociada-venenosa", name: "Rociada venenosa", level: 0, school: "Nigromancia", time: "Acción", range: "30 pies", components: "V, S",
    duration: "Instantáneo", mode: "attack", damage: "1d12", type: "veneno", scale: true,
    desc: "Ataque de conjuro a distancia con una niebla tóxica. Sube 1d12 a los niveles 5, 11 y 17." }),
  S({ id: "salpicadura-acida", name: "Salpicadura ácida", level: 0, school: "Evocación", time: "Acción", range: "60 pies", components: "V, S",
    duration: "Instantáneo", mode: "save", save: "dex", damage: "1d6", type: "ácido", scale: true, targets: 20, shape: "circle", size: 5,
    desc: "Una burbuja de ácido estalla en una esfera de 5 pies de radio: cada criatura dentro hace una salvación de Destreza o recibe el daño. Sube 1d6 a los niveles 5, 11 y 17." }),

  /* ---------- Nivel 1 ---------- */
  S({ id: "proyectil-magico", name: "Proyectil mágico", level: 1, school: "Evocación", time: "Acción", range: "120 pies", components: "V, S",
    duration: "Instantáneo", mode: "auto", darts: 3, damage: "1d4+1", type: "fuerza", targets: 3,
    desc: "Tres dardos de fuerza que impactan siempre a criaturas que veas, todos a la vez y repartidos como quieras. Un dardo más por cada nivel de espacio por encima del 1." }),
  S({ id: "manos-ardientes", name: "Manos ardientes", level: 1, school: "Evocación", time: "Acción", range: "Personal (cono de 15 pies)", components: "V, S",
    duration: "Instantáneo", mode: "save", save: "dex", half: true, damage: "3d6", upcast: "1d6", type: "fuego", targets: 20, shape: "cone", size: 15,
    desc: "Cada criatura en un cono de 15 pies hace una salvación de Destreza: daño completo si falla, la mitad si la supera. Los objetos inflamables del cono que nadie lleve empiezan a arder. +1d6 por nivel de espacio por encima del 1." }),
  S({ id: "ola-atronadora", name: "Ola atronadora", level: 1, school: "Evocación", time: "Acción", range: "Personal (cubo de 15 pies)", components: "V, S",
    duration: "Instantáneo", mode: "save", save: "con", half: true, damage: "2d8", upcast: "1d8", type: "trueno", targets: 20, shape: "square", size: 7.5,
    failText: "sale empujada 10 pies", desc: "Cada criatura en un cubo de 15 pies que sale de ti hace una salvación de Constitución: si falla, recibe el daño y sale empujada 10 pies; si la supera, solo la mitad del daño. Los objetos sueltos también salen empujados y el estruendo se oye a 300 pies. +1d8 por nivel de espacio por encima del 1." }),
  S({ id: "curar-heridas", name: "Curar heridas", level: 1, school: "Abjuración", time: "Acción", range: "Toque", components: "V, S",
    duration: "Instantáneo", mode: "heal", heal: "2d8", healMod: true, upcast: "2d8",
    desc: "Una criatura que toques recupera 2d8 más tu modificador de característica de lanzamiento. +2d8 por nivel de espacio por encima del 1." }),
  S({ id: "palabra-curativa", name: "Palabra curativa", level: 1, school: "Abjuración", time: "Acción adicional", range: "60 pies", components: "V",
    duration: "Instantáneo", mode: "heal", heal: "2d4", healMod: true, upcast: "2d4",
    desc: "Una criatura que veas recupera 2d4 más tu modificador de característica de lanzamiento. +2d4 por nivel de espacio por encima del 1." }),
  S({ id: "saeta-guia", name: "Saeta guía", level: 1, school: "Evocación", time: "Acción", range: "120 pies", components: "V, S",
    duration: "1 asalto", mode: "attack", damage: "4d6", upcast: "1d6", type: "radiante",
    desc: "Ataque de conjuro a distancia. Si impacta, la siguiente tirada de ataque contra el objetivo antes del final de tu siguiente turno tiene ventaja. +1d6 por nivel de espacio por encima del 1." }),
  S({ id: "infligir-heridas", name: "Infligir heridas", level: 1, school: "Nigromancia", time: "Acción", range: "Toque", components: "V, S",
    duration: "Instantáneo", mode: "save", save: "con", half: true, damage: "2d10", upcast: "1d10", type: "necrótico", melee: true,
    desc: "Una criatura que toques hace una salvación de Constitución: daño completo si falla, la mitad si la supera. +1d10 por nivel de espacio por encima del 1." }),
  S({ id: "dormir", name: "Dormir", level: 1, school: "Encantamiento", time: "Acción", range: "60 pies", components: "V, S, M (un pellizco de arena o pétalos de rosa)",
    duration: "Concentración, hasta 1 minuto", conc: true, mode: "save", save: "wis", cond: "incapacitado", condRounds: 1, targets: 20, shape: "circle", size: 5,
    failText: "al final de su siguiente turno repite la salvación; si vuelve a fallar, queda inconsciente mientras dure",
    desc: "Cada criatura que elijas en una esfera de 5 pies de radio hace una salvación de Sabiduría o queda incapacitada hasta el final de su siguiente turno; entonces repite la salvación y, si falla, queda inconsciente mientras dure. Termina en ella si recibe daño o alguien a 5 pies la despierta con una acción. Quien no duerme (como los elfos) o es inmune al agotamiento la supera sin tirar." }),
  S({ id: "hechizar-persona", name: "Hechizar persona", level: 1, school: "Encantamiento", time: "Acción", range: "30 pies", components: "V, S",
    duration: "1 hora", mode: "save", save: "wis", cond: "encantado", condRounds: 600, targetsUp: 1,
    desc: "Un humanoide que veas hace una salvación de Sabiduría, con ventaja si tú o tus aliados estáis luchando contra él. Si falla, queda encantado hasta que acabe o hasta que le hagáis daño, y es amistoso contigo. Al acabar sabe que lo encantaste. Un objetivo más por nivel de espacio por encima del 1." }),
  S({ id: "orden-imperiosa", name: "Orden imperiosa", level: 1, school: "Encantamiento", time: "Acción", range: "60 pies", components: "V",
    duration: "Instantáneo", mode: "save", save: "wis", failText: "obedece la orden en su siguiente turno", targetsUp: 1,
    desc: "Una criatura que veas hace una salvación de Sabiduría o cumple en su siguiente turno una orden de una palabra: Acércate (va hacia ti por la ruta más directa), Suelta (suelta lo que lleva y acaba el turno), Huye (se aleja de ti lo más rápido que pueda), Al suelo (queda derribada y acaba el turno) o Alto (no se mueve ni hace acciones ni acciones adicionales). Una criatura más por nivel de espacio por encima del 1." }),
  S({ id: "enmaranar", name: "Enmarañar", level: 1, school: "Conjuración", time: "Acción", range: "90 pies", components: "V, S",
    duration: "Concentración, hasta 1 minuto", conc: true, mode: "save", save: "str", cond: "apresado", condRounds: 10, targets: 20, shape: "square", size: 10,
    desc: "Brotan plantas en un cuadrado de 20 pies que se vuelve terreno difícil. Cada criatura dentro al lanzarlo (salvo tú) hace una salvación de Fuerza o queda apresada mientras dure. Con una acción puede hacer una prueba de Fuerza (Atletismo) contra tu CD de conjuros para soltarse." }),
  S({ id: "bendecir", name: "Bendecir", level: 1, school: "Encantamiento", time: "Acción", range: "30 pies", components: "V, S, M (un símbolo sagrado de 5 po o más)",
    duration: "Concentración, hasta 1 minuto", conc: true, mode: "none", targets: 3, targetsUp: 1,
    desc: "Hasta tres criaturas suman 1d4 a sus tiradas de ataque y salvaciones mientras dure. Un objetivo más por nivel de espacio por encima del 1." }),
  S({ id: "escudo-de-fe", name: "Escudo de fe", level: 1, school: "Abjuración", time: "Acción adicional", range: "60 pies", components: "V, S, M (un pergamino con una plegaria)",
    duration: "Concentración, hasta 10 minutos", conc: true, mode: "none",
    desc: "Una criatura que elijas gana +2 a la CA mientras dure." }),

  /* ---------- Nivel 2 ---------- */
  S({ id: "inmovilizar-persona", name: "Inmovilizar persona", level: 2, school: "Encantamiento", time: "Acción", range: "60 pies", components: "V, S, M (una pieza recta de hierro)",
    duration: "Concentración, hasta 1 minuto", conc: true, mode: "save", save: "wis", cond: "paralizado", condRounds: 10, targetsUp: 1,
    desc: "Un humanoide que veas hace una salvación de Sabiduría o queda paralizado mientras dure. Al final de cada uno de sus turnos repite la salvación y, si la supera, se libra. Un humanoide más por nivel de espacio por encima del 2." }),
  S({ id: "rayo-abrasador", name: "Rayo abrasador", level: 2, school: "Evocación", time: "Acción", range: "120 pies", components: "V, S",
    duration: "Instantáneo", mode: "attack", rays: 3, raysUp: 1, damage: "2d6", type: "fuego", targets: 3,
    desc: "Tres rayos contra uno o varios objetivos, con un ataque de conjuro a distancia por rayo. Un rayo más por nivel de espacio por encima del 2." }),
  S({ id: "telarana", name: "Telaraña", level: 2, school: "Conjuración", time: "Acción", range: "60 pies", components: "V, S, M (un trozo de telaraña)",
    duration: "Concentración, hasta 1 hora", conc: true, mode: "save", save: "dex", cond: "apresado", condRounds: 600, targets: 20, shape: "square", size: 10,
    desc: "Un cubo de 20 pies de telarañas: terreno difícil y poco oscuro. Si no está anclada entre dos superficies o sobre una, se desploma al principio de tu siguiente turno. La primera vez en un turno que una criatura entra o empieza su turno en ella, hace una salvación de Destreza o queda apresada mientras siga dentro; con una acción y una prueba de Fuerza (Atletismo) contra tu CD se suelta. Arde: cada cubo de 5 pies expuesto al fuego se quema en un asalto y hace 2d4 fuego a quien empiece el turno allí." }),
  S({ id: "ceguera-sordera", name: "Ceguera/sordera", level: 2, school: "Transmutación", time: "Acción", range: "120 pies", components: "V",
    duration: "1 minuto", mode: "save", save: "con", cond: "cegado", condRounds: 10, targetsUp: 1,
    desc: "Una criatura que veas hace una salvación de Constitución o queda cegada o ensordecida (a tu elección) mientras dure. Al final de cada uno de sus turnos repite la salvación y, si la supera, se libra. Un objetivo más por nivel de espacio por encima del 2." }),
  S({ id: "romper", name: "Romper", level: 2, school: "Evocación", time: "Acción", range: "60 pies", components: "V, S, M (una lasca de mica)",
    duration: "Instantáneo", mode: "save", save: "con", half: true, damage: "3d8", upcast: "1d8", type: "trueno", targets: 20, shape: "circle", size: 10,
    desc: "Cada criatura en una esfera de 10 pies de radio hace una salvación de Constitución: daño completo si falla, la mitad si la supera. Los constructos tienen desventaja. Los objetos no mágicos que nadie lleve también reciben el daño. +1d8 por nivel de espacio por encima del 2." }),
  S({ id: "arma-espiritual", name: "Arma espiritual", level: 2, school: "Evocación", time: "Acción adicional", range: "60 pies", components: "V, S",
    duration: "Concentración, hasta 1 minuto", conc: true, mode: "attack", melee: true, damage: "1d8", dmgMod: true, upcast: "1d8", type: "fuerza", summon: true,
    desc: "Creas una fuerza espectral con forma de arma que flota a tu elección y haces un ataque de conjuro cuerpo a cuerpo contra una criatura a 5 pies de ella: 1d8 más tu modificador de característica de lanzamiento de daño de fuerza. En tus turnos siguientes, con una acción adicional la mueves hasta 20 pies y repites el ataque. +1d8 por nivel de espacio por encima del 2." }),

  /* ---------- Nivel 3 ---------- */
  S({ id: "bola-de-fuego", name: "Bola de fuego", level: 3, school: "Evocación", time: "Acción", range: "150 pies", components: "V, S, M (una bola de guano de murciélago y azufre)",
    duration: "Instantáneo", mode: "save", save: "dex", half: true, damage: "8d6", upcast: "1d6", type: "fuego", targets: 20, shape: "circle", size: 20,
    desc: "Cada criatura en una esfera de 20 pies de radio hace una salvación de Destreza: daño completo si falla, la mitad si la supera. Los objetos inflamables que nadie lleve empiezan a arder. +1d6 por nivel de espacio por encima del 3." }),
  S({ id: "relampago", name: "Relámpago", level: 3, school: "Evocación", time: "Acción", range: "Personal (línea de 100 pies)", components: "V, S, M (un poco de pelaje y una varilla de cristal)",
    duration: "Instantáneo", mode: "save", save: "dex", half: true, damage: "8d6", upcast: "1d6", type: "relámpago", targets: 20, shape: "line", size: 100, width: 5,
    desc: "Cada criatura en una línea de 100 pies de largo y 5 de ancho hace una salvación de Destreza: daño completo si falla, la mitad si la supera. +1d6 por nivel de espacio por encima del 3." }),
  S({ id: "miedo", name: "Miedo", level: 3, school: "Ilusión", time: "Acción", range: "Personal (cono de 30 pies)", components: "V, S, M (una pluma blanca)",
    duration: "Concentración, hasta 1 minuto", conc: true, mode: "save", save: "wis", cond: "asustado", condRounds: 10, targets: 20, shape: "cone", size: 30,
    failText: "suelta lo que lleve y huye de ti con la acción de Correr",
    desc: "Cada criatura en un cono de 30 pies hace una salvación de Sabiduría o suelta lo que lleve y queda asustada mientras dure: en cada turno usa la acción de Correr para alejarse de ti por la ruta más segura. Si acaba su turno sin línea de visión hacia ti, repite la salvación y, si la supera, se libra." }),
  S({ id: "espiritus-guardianes", name: "Espíritus guardianes", level: 3, school: "Conjuración", time: "Acción", range: "Personal (emanación de 15 pies)", components: "V, S, M (un pergamino con una plegaria)",
    duration: "Concentración, hasta 10 minutos", conc: true, mode: "save", save: "wis", half: true, damage: "3d8", upcast: "1d8", type: "radiante", targets: 20, shape: "circle", size: 15,
    desc: "Espíritus en una emanación de 15 pies alrededor de ti. Las criaturas que no excluyas tienen la velocidad a la mitad dentro y, cuando la emanación entra en su espacio o ellas entran o acaban el turno dentro, hacen una salvación de Sabiduría (una vez por turno): 3d8 radiante (necrótico si eres malvado) si fallan, la mitad si la superan. +1d8 por nivel de espacio por encima del 3." }),
  S({ id: "palabra-curativa-en-masa", name: "Palabra curativa en masa", level: 3, school: "Abjuración", time: "Acción adicional", range: "60 pies", components: "V",
    duration: "Instantáneo", mode: "heal", heal: "2d4", healMod: true, upcast: "1d4", targets: 6,
    desc: "Hasta seis criaturas que veas recuperan 2d4 más tu modificador de característica de lanzamiento. +1d4 por nivel de espacio por encima del 3." }),
  S({ id: "revivificar", name: "Revivificar", level: 3, school: "Nigromancia", time: "Acción", range: "Toque", components: "V, S, M (un diamante de 300 po o más, que se consume)",
    duration: "Instantáneo", mode: "none",
    desc: "Una criatura que haya muerto en el último minuto revive con 1 punto de golpe. No sirve si murió de vejez ni devuelve partes del cuerpo perdidas." }),

  /* ---------- Nivel 4 y 5 ---------- */
  S({ id: "tormenta-de-hielo", name: "Tormenta de hielo", level: 4, school: "Evocación", time: "Acción", range: "300 pies", components: "V, S, M (una manopla)",
    duration: "Instantáneo", mode: "save", save: "dex", half: true, damage: "2d10+4d6", upcast: "1d10", type: "contundente y frío", targets: 20, shape: "circle", size: 20,
    desc: "Granizo en un cilindro de 20 pies de radio y 40 de alto: cada criatura dentro hace una salvación de Destreza; si falla, 2d10 contundente y 4d6 frío, y si la supera, la mitad. El suelo es terreno difícil hasta el final de tu siguiente turno. El daño contundente sube 1d10 por nivel de espacio por encima del 4." }),
  S({ id: "destierro", name: "Destierro", level: 4, school: "Abjuración", time: "Acción", range: "30 pies", components: "V, S, M (un pentáculo)",
    duration: "Concentración, hasta 1 minuto", conc: true, mode: "save", save: "cha", cond: "incapacitado", condRounds: 10, failText: "queda desterrada a un semiplano inofensivo", targetsUp: 1,
    desc: "Una criatura que veas hace una salvación de Carisma o va a un semiplano inofensivo mientras dure, donde está incapacitada. Al acabar vuelve a su sitio, salvo que sea una aberración, un celestial, un elemental, un feérico o un infernal y el conjuro dure el minuto entero: entonces va a un plano de su tipo. Un objetivo más por nivel de espacio por encima del 4." }),
  S({ id: "cono-de-frio", name: "Cono de frío", level: 5, school: "Evocación", time: "Acción", range: "Personal (cono de 60 pies)", components: "V, S, M (un pequeño cono de cristal o vidrio)",
    duration: "Instantáneo", mode: "save", save: "con", half: true, damage: "8d8", upcast: "1d8", type: "frío", targets: 20, shape: "cone", size: 60,
    desc: "Cada criatura en un cono de 60 pies hace una salvación de Constitución: daño completo si falla, la mitad si la supera. Quien muera por él se convierte en una estatua helada hasta que se descongele. +1d8 por nivel de espacio por encima del 5." }),
  S({ id: "golpe-flamigero", name: "Golpe flamígero", level: 5, school: "Evocación", time: "Acción", range: "60 pies", components: "V, S, M (un pellizco de azufre)",
    duration: "Instantáneo", mode: "save", save: "dex", half: true, damage: "5d6+5d6", upcast: "2d6", type: "fuego y radiante", targets: 20, shape: "circle", size: 10,
    desc: "Una columna de fuego en un cilindro de 10 pies de radio y 40 de alto: cada criatura dentro hace una salvación de Destreza; si falla, 5d6 fuego y 5d6 radiante, y si la supera, la mitad. Cada uno de los dos daños sube 1d6 por nivel de espacio por encima del 5." }),
  S({ id: "curar-heridas-en-masa", name: "Curar heridas en masa", level: 5, school: "Abjuración", time: "Acción", range: "60 pies", components: "V, S",
    duration: "Instantáneo", mode: "heal", heal: "5d8", healMod: true, upcast: "1d8", targets: 6, shape: "circle", size: 30,
    desc: "Elige hasta seis criaturas en una esfera de 30 pies de radio: cada una recupera 5d8 más tu modificador de característica de lanzamiento. +1d8 por nivel de espacio por encima del 5." }),
  S({ id: "inmovilizar-monstruo", name: "Inmovilizar monstruo", level: 5, school: "Encantamiento", time: "Acción", range: "90 pies", components: "V, S, M (una pieza recta de hierro)",
    duration: "Concentración, hasta 1 minuto", conc: true, mode: "save", save: "wis", cond: "paralizado", condRounds: 10, targetsUp: 1,
    desc: "Una criatura que veas hace una salvación de Sabiduría o queda paralizada mientras dure. Al final de cada uno de sus turnos repite la salvación y, si la supera, se libra. Un objetivo más por nivel de espacio por encima del 5." })
];

/* Para que las fichas con los conjuros escritos a mano los encuentren aquí */
registerSpellLibrary(SPELL_LIBRARY);

/* De 2014 a 2024. Cada ficha guarda su copia de los conjuros que conoce. Si
   una copia es exactamente la de serie de antes (nadie la ha retocado), pasa
   sola a la versión de 2024; si alguien la cambió, se queda como la dejó.
   La huella es la del conjuro normalizado, sin su id. */
const OLD_2014 = {"rayo-de-fuego":"1rxsc93","rayo-de-escarcha":"1n3dwpi","llama-sagrada":"m3iexg","burla-danina":"e87vm0","toque-helado":"14pg365","descarga-sobrenatural":"1muaiic","rociada-venenosa":"a9t8vx","salpicadura-acida":"7xgfcp","proyectil-magico":"xypyl3","manos-ardientes":"1qc8k92","ola-atronadora":"1s8wxfx","curar-heridas":"16l7c8f","palabra-curativa":"1855usl","saeta-guia":"1on95xe","infligir-heridas":"1vcqsy0","dormir":"fid4ur","hechizar-persona":"eqheo3","orden-imperiosa":"1c8r6if","enmaranar":"qma2jn","bendecir":"1k6tppa","escudo-de-fe":"1fyt4rt","inmovilizar-persona":"15b69yr","rayo-abrasador":"tirkil","telarana":"mqkotl","ceguera-sordera":"vzpywq","romper":"iuu4on","arma-espiritual":"40kgn8","bola-de-fuego":"zemtgp","relampago":"xj2fe0","miedo":"9r90rw","espiritus-guardianes":"14xrcyt","palabra-curativa-en-masa":"k3o66r","revivificar":"3w3tbf","tormenta-de-hielo":"97b2o1","destierro":"kald0d","cono-de-frio":"1iwc5oe","golpe-flamigero":"yodzlg","curar-heridas-en-masa":"1jei8oc","inmovilizar-monstruo":"1ijny5r"};
const hash = t => { let x = 5381; for (let i = 0; i < t.length; i++) x = ((x << 5) + x + t.charCodeAt(i)) >>> 0; return x.toString(36); };
const OLD_BY_HASH = new Map(Object.entries(OLD_2014).map(([id, h]) => [h, id]));
function upgradeSpell(sp) {
  if (!sp || sp.components || sp.time === "Acción" || sp.time === "Acción adicional") return sp;   // ya es de 2024
  const { id, ...rest } = sp;
  const was = OLD_BY_HASH.get(hash(JSON.stringify(rest)));
  const now = was && SPELL_LIBRARY.find(x => x.id === was);
  return now ? { ...now, id } : sp;
}
registerSpellUpgrade(upgradeSpell);

/* La biblioteca de la partida: la de serie con los retoques del DM encima
   (mismo id = sustituye al de serie) y los conjuros que haya creado él. La
   de serie no se toca: si una versión nueva de Mesa la corrige, basta con
   «Restaurar el de serie» para recibir la corrección. */
const BUILTIN_IDS = new Set(SPELL_LIBRARY.map(s => s.id));
export const isBuiltinSpell = id => BUILTIN_IDS.has(id);
export const builtinSpell = id => SPELL_LIBRARY.find(s => s.id === id) || null;
export function libraryOf(doc) {
  const own = (doc && doc.spellLib) || [];
  const byId = new Map(own.map(s => [s.id, s]));
  const merged = SPELL_LIBRARY.map(s => byId.get(s.id) ? { ...byId.get(s.id), edited: true } : s);
  const custom = own.filter(s => !BUILTIN_IDS.has(s.id)).map(s => ({ ...s, custom: true }));
  return [...merged, ...custom].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "es"));
}

/* Característica de lanzamiento que suele usar cada clase */
export function guessAbility(className = "") {
  const c = className.toLowerCase();
  if (/mago|maga|wizard|artífice|artificer/.test(c)) return "int";
  if (/clérig|cleric|druid|explorador|ranger|monje|monk/.test(c)) return "wis";
  if (/bard|hechicer|sorcer|brujo|bruja|warlock|paladín|paladin/.test(c)) return "cha";
  return "int";
}
