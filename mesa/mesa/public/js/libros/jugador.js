/* Manual del jugador: una sección por clase (rasgos básicos, progresión del 1
   al 20, cada rasgo explicado y su subclase del SRD), más especies y
   trasfondos. Reglas del System Reference Document 5.1 y 5.2 de Wizards of
   the Coast (CC-BY 4.0), resumidas para Mesa. Las subclases que no están en
   el SRD solo se nombran: su texto está en el manual de cada mesa. */

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const table = (head, rows) => `<table class="tome-table"><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
const PROF = n => "+" + (Math.ceil(n / 4) + 1);

function klass({ id, name, intro, die, primary, saves, armor, weapons, tools = "Ninguna", skills, equipment, levels, features, sub, others, y2024 }) {
  const hp = Math.floor(die / 2) + 1;
  const entries = [
    { id: id + "-base", title: "Rasgos básicos", html: table(["", ""], [
      ["Dado de golpe", `d${die} por nivel`], ["Puntos de golpe a nivel 1", `${die} + modificador de Constitución`],
      ["En niveles siguientes", `1d${die} (o ${hp}) + modificador de Constitución`], ["Característica principal", primary],
      ["Salvaciones", saves], ["Armaduras", armor], ["Armas", weapons], ["Herramientas", tools], ["Habilidades", skills], ["Equipo inicial", equipment]]) },
    { id: id + "-niveles", title: "Progresión", html: table(["Nivel", "Comp.", "Rasgos"], levels.map((f, i) => [String(i + 1), PROF(i + 1), f || "—"])) },
    ...features.map(([n, txt], i) => ({ id: `${id}-f${i}`, title: n, html: `<p>${txt}</p>` })),
    { id: id + "-sub", title: `Subclase del SRD: ${sub.name}`, html: `<p>${sub.intro}</p>` + sub.features.map(([lv, n, txt]) => `<h4>${esc(n)} <small>(nivel ${lv})</small></h4><p>${txt}</p>`).join("") },
    { id: id + "-otras", title: "Otras subclases", html: `<p>Los manuales oficiales traen más caminos; sus reglas no son de libre uso y no se reproducen aquí, pero sirven de guía para elegir:</p><ul>${others.map(([n, d]) => `<li><b>${esc(n)}</b>: ${d}</li>`).join("")}</ul>` }
  ];
  if (y2024) entries.push({ id: id + "-2024", title: "Qué cambia en 2024", html: `<p>${y2024}</p>` });
  /* raw: los datos tal cual, para que el creador sepa qué gana cada nivel */
  return { id, title: name, intro: `<p>${intro}</p>`, entries, raw: { id, die, levels, features, sub } };
}

const BARBARO = klass({ id: "barbaro", name: "Bárbaro", die: 12, primary: "Fuerza", saves: "Fuerza y Constitución",
  intro: "Un guerrero feroz de tierras salvajes que entra en furia para combatir: aguanta castigo como nadie y golpea con todo.",
  armor: "Ligeras, intermedias y escudos", weapons: "Sencillas y marciales", skills: "Dos entre Atletismo, Intimidación, Naturaleza, Percepción, Supervivencia y Trato con animales",
  equipment: "Gran hacha, dos hachas de mano, paquete de explorador y cuatro jabalinas",
  levels: ["Furia, Defensa sin armadura", "Ataque temerario, Sentido del peligro", "Senda primaria", "Mejora de característica", "Ataque adicional, Movimiento rápido", "Rasgo de senda", "Instinto salvaje", "Mejora de característica", "Crítico brutal (1 dado)", "Rasgo de senda", "Furia implacable", "Mejora de característica", "Crítico brutal (2 dados)", "Rasgo de senda", "Furia persistente", "Mejora de característica", "Crítico brutal (3 dados)", "Fuerza indómita", "Mejora de característica", "Campeón primigenio"],
  features: [
    ["Furia", "Como acción adicional, si no llevas armadura pesada: ventaja en pruebas y salvaciones de Fuerza, daño extra cuerpo a cuerpo con Fuerza (+2, +3 a nivel 9, +4 a nivel 16) y resistencia al daño contundente, cortante y perforante. Dura un minuto si atacas o recibes daño cada turno. Usos: 2 al principio, 6 a nivel 17 e ilimitados a nivel 20; vuelven con un descanso largo. No puedes lanzar conjuros ni concentrarte."],
    ["Defensa sin armadura", "Sin armadura, tu CA es 10 + Destreza + Constitución. Puedes llevar escudo."],
    ["Ataque temerario", "Al atacar por primera vez en tu turno puedes tener ventaja en tus ataques cuerpo a cuerpo con Fuerza; a cambio, los ataques contra ti tienen ventaja hasta tu próximo turno."],
    ["Sentido del peligro", "Ventaja en salvaciones de Destreza contra efectos que ves venir, como trampas y conjuros, si no estás cegado, ensordecido ni incapacitado."],
    ["Ataque adicional", "Atacas dos veces cuando usas la acción de Atacar."],
    ["Movimiento rápido", "+10 pies de velocidad si no llevas armadura pesada."],
    ["Instinto salvaje", "Ventaja en la iniciativa; si te sorprenden, puedes actuar en tu primer turno entrando en furia."],
    ["Crítico brutal", "En un crítico cuerpo a cuerpo, uno, dos o tres dados de daño extra del arma según tu nivel."],
    ["Furia implacable", "Si caes a 0 puntos de golpe en furia, salvación de Constitución CD 10 (sube 5 cada vez) para quedarte a 1."],
    ["Furia persistente y Fuerza indómita", "La furia solo acaba si quieres o caes inconsciente; y si una prueba de Fuerza da menos que tu puntuación, usas la puntuación."],
    ["Campeón primigenio", "Tu Fuerza y tu Constitución suben 4, hasta un máximo de 24."]
  ],
  sub: { name: "Senda del berserker", intro: "La furia como fuerza ciega que arrasa con todo.", features: [
    [3, "Frenesí", "En furia, puedes hacer un ataque cuerpo a cuerpo como acción adicional en cada turno; al acabar la furia ganas un nivel de agotamiento."],
    [6, "Furia descerebrada", "Mientras estás en furia no pueden encantarte ni asustarte, y los efectos que lo hagan se suspenden."],
    [10, "Presencia intimidante", "Con tu acción asustas a una criatura (salvación de Sabiduría) hasta el final de tu próximo turno, y puedes alargarlo."],
    [14, "Represalia", "Cuando una criatura a 5 pies te daña, usas tu reacción para atacarla cuerpo a cuerpo."]] },
  others: [["Senda del guerrero totémico", "espíritus animales que dan resistencia, velocidad o percepción"], ["Senda del heraldo de la tormenta", "un aura de tormenta, desierto o tundra"], ["Senda del celota", "furia sagrada que no deja morir"], ["Senda del corazón salvaje", "la versión 2024 del guerrero totémico"], ["Senda del árbol del mundo", "raíces que mueven a aliados y enemigos (2024)"]],
  y2024: "Furia se recupera en parte con un descanso corto; llegan la Maestría con armas (dos armas), el Conocimiento primigenio (habilidades con Fuerza en furia) y Golpes brutales que cambian el Crítico brutal. La subclase llega a nivel 3 como en 2014." });

const BARDO = klass({ id: "bardo", name: "Bardo", die: 8, primary: "Carisma", saves: "Destreza y Carisma",
  intro: "Un artista cuya música y palabras tienen magia: inspira a sus aliados, confunde a sus enemigos y sabe un poco de todo.",
  armor: "Ligeras", weapons: "Sencillas, ballestas de mano, espadas largas, estoques y espadas cortas", tools: "Tres instrumentos musicales", skills: "Tres cualesquiera",
  equipment: "Estoque, espada larga o arma sencilla; paquete de diplomático o de artista; laúd u otro instrumento; armadura de cuero y daga",
  levels: ["Lanzamiento de conjuros, Inspiración bárdica (d6)", "Aprendiz de todo, Canción de descanso (d6)", "Colegio bárdico, Pericia", "Mejora de característica", "Inspiración bárdica (d8), Fuente de inspiración", "Contraencanto, rasgo de colegio", "—", "Mejora de característica", "Canción de descanso (d8)", "Inspiración (d10), Pericia, Secretos mágicos", "—", "Mejora de característica", "Canción de descanso (d10)", "Secretos mágicos, rasgo de colegio", "Inspiración bárdica (d12)", "Mejora de característica", "Canción de descanso (d12)", "Secretos mágicos", "Mejora de característica", "Inspiración superior"],
  features: [
    ["Lanzamiento de conjuros", "Usas el Carisma. Conoces un número de conjuros de la lista de bardo que crece con el nivel y puedes cambiar uno al subir; tu instrumento te sirve de canalizador."],
    ["Inspiración bárdica", "Como acción adicional, una criatura que te oiga gana un dado de inspiración (d6, luego d8, d10 y d12) que puede sumar a una prueba, ataque o salvación en los próximos 10 minutos. Tantos usos como tu modificador de Carisma; vuelven con un descanso largo (o corto desde nivel 5)."],
    ["Aprendiz de todo", "Sumas la mitad de tu competencia a las pruebas de característica en las que no eres competente."],
    ["Canción de descanso", "Durante un descanso corto, quien gaste dados de golpe y te oiga recupera además 1d6 (más con el nivel)."],
    ["Pericia", "Doble competencia en dos habilidades (y otras dos a nivel 10)."],
    ["Contraencanto", "Con tu acción, tú y tus aliados a 30 pies tenéis ventaja contra quedar asustados o encantados hasta tu próximo turno."],
    ["Secretos mágicos", "Aprendes dos conjuros de cualquier clase (a niveles 10, 14 y 18)."],
    ["Inspiración superior", "Si empiezas el combate sin inspiraciones, recuperas una."]
  ],
  sub: { name: "Colegio del conocimiento", intro: "Bardos eruditos que coleccionan saberes y desmontan a sus rivales con palabras.", features: [
    [3, "Competencias adicionales", "Tres habilidades más a tu elección."],
    [3, "Palabras cortantes", "Con tu reacción, restas un dado de inspiración a un ataque, una prueba o un daño de una criatura que te oiga."],
    [6, "Secretos mágicos adicionales", "Dos conjuros de cualquier clase."],
    [14, "Habilidad sin par", "Puedes gastar una inspiración en tus propias pruebas de característica."]] },
  others: [["Colegio del valor", "bardos que combaten en primera fila"], ["Colegio del glamour", "magia feérica que hechiza al público"], ["Colegio de las espadas", "acróbatas que florean con el arma"], ["Colegio de los susurros", "espías que siembran el miedo"], ["Colegio de la danza", "bardos que pelean bailando (2024)"]],
  y2024: "El bardo prepara conjuros de una lista en vez de conocerlos, y la Inspiración bárdica se gasta tras ver el resultado de la tirada." });

const CLERIGO = klass({ id: "clerigo", name: "Clérigo", die: 8, primary: "Sabiduría", saves: "Sabiduría y Carisma",
  intro: "Intermediario entre los dioses y el mundo: cura, protege y castiga con el poder de su fe.",
  armor: "Ligeras, intermedias y escudos", weapons: "Sencillas", skills: "Dos entre Historia, Medicina, Perspicacia, Persuasión y Religión",
  equipment: "Maza, cota de escamas o armadura de cuero, ballesta ligera o arma sencilla, paquete de sacerdote, escudo y símbolo sagrado",
  levels: ["Lanzamiento de conjuros, Dominio divino", "Canalizar divinidad (1), rasgo de dominio", "—", "Mejora de característica", "Destruir muertos vivientes (VD 1/2)", "Canalizar divinidad (2), rasgo de dominio", "—", "Mejora de característica, Destruir muertos vivientes (VD 1), rasgo de dominio", "—", "Intervención divina", "Destruir muertos vivientes (VD 2)", "Mejora de característica", "—", "Destruir muertos vivientes (VD 3)", "—", "Mejora de característica", "Destruir muertos vivientes (VD 4), rasgo de dominio", "Canalizar divinidad (3)", "Mejora de característica", "Intervención divina mejorada"],
  features: [
    ["Lanzamiento de conjuros", "Usas la Sabiduría. Preparas cada día tantos conjuros de la lista de clérigo como tu nivel + tu modificador de Sabiduría; tu símbolo sagrado te sirve de canalizador. Puedes lanzar como ritual los que lo permitan."],
    ["Dominio divino", "Eliges un dominio a nivel 1: te da conjuros siempre preparados y rasgos a lo largo de los niveles."],
    ["Canalizar divinidad: Expulsar muertos vivientes", "Con tu acción, los muertos vivientes a 30 pies hacen una salvación de Sabiduría o huyen de ti durante un minuto. Los usos vuelven con un descanso corto."],
    ["Destruir muertos vivientes", "Los muertos vivientes que fallen contra tu expulsión y tengan un VD bajo (según tu nivel) quedan destruidos."],
    ["Intervención divina", "Pides ayuda a tu dios: si sacas en 1d100 menos que tu nivel, interviene. A nivel 20 funciona siempre. Una vez a la semana si funciona."]
  ],
  sub: { name: "Dominio de la vida", intro: "El dios de la vida y la sanación: el clérigo curandero por excelencia.", features: [
    [1, "Competencia adicional", "Armaduras pesadas."],
    [1, "Discípulo de la vida", "Tus conjuros de curación curan además 2 + el nivel del conjuro."],
    [2, "Canalizar divinidad: Preservar la vida", "Repartes cinco veces tu nivel en curación entre criaturas a 30 pies, hasta la mitad de su vida máxima."],
    [6, "Sanador bendito", "Cuando curas a otro con un conjuro, tú recuperas 2 + el nivel del conjuro."],
    [8, "Golpe divino", "Una vez por turno, tu ataque con arma hace 1d8 de daño radiante extra (2d8 a nivel 14)."],
    [17, "Curación suprema", "Tus conjuros de curación curan siempre el máximo de sus dados."]] },
  others: [["Dominio de la guerra", "el clérigo combatiente"], ["Dominio de la luz", "fuego y luz contra la oscuridad"], ["Dominio del engaño", "ilusiones y duplicados"], ["Dominio del saber", "conocimiento y lectura de mentes"], ["Dominio de la naturaleza", "plantas y bestias"], ["Dominio de la tempestad", "trueno y relámpago"]],
  y2024: "El dominio se elige a nivel 3; a nivel 1 eliges una Orden divina (protector o taumaturgo). Canalizar divinidad incluye Chispa divina, que cura o daña." });

const DRUIDA = klass({ id: "druida", name: "Druida", die: 8, primary: "Sabiduría", saves: "Inteligencia y Sabiduría",
  intro: "Sacerdote de la naturaleza que cambia de forma, habla con las bestias y desata el poder de la tormenta y la tierra.",
  armor: "Ligeras, intermedias y escudos (no de metal)", weapons: "Garrotes, dagas, dardos, jabalinas, mazas, bastones, cimitarras, hoces, hondas y lanzas", tools: "Útiles de herborista",
  skills: "Dos entre Arcanos, Medicina, Naturaleza, Percepción, Perspicacia, Religión, Supervivencia y Trato con animales",
  equipment: "Escudo de madera o arma sencilla, cimitarra o arma sencilla cuerpo a cuerpo, armadura de cuero, paquete de explorador y foco druídico",
  levels: ["Druídico, Lanzamiento de conjuros", "Forma salvaje, Círculo druídico", "—", "Mejora de característica, Forma salvaje mejorada", "—", "Rasgo de círculo", "—", "Mejora de característica, Forma salvaje mejorada", "—", "Rasgo de círculo", "—", "Mejora de característica", "—", "Rasgo de círculo", "—", "Mejora de característica", "—", "Cuerpo intemporal, Conjuros bestiales", "Mejora de característica", "Archidruida"],
  features: [
    ["Druídico", "El idioma secreto de los druidas, con el que dejas mensajes ocultos."],
    ["Lanzamiento de conjuros", "Usas la Sabiduría. Preparas cada día tantos conjuros de druida como tu nivel + tu modificador de Sabiduría."],
    ["Forma salvaje", "Dos veces por descanso corto te transformas en una bestia que hayas visto: VD 1/4 sin volar ni nadar a nivel 2, VD 1/2 sin volar a nivel 4, VD 1 a nivel 8. Usas sus puntos de golpe y vuelves a tu forma al llegar a 0."],
    ["Cuerpo intemporal y Conjuros bestiales", "Envejeces muy despacio y puedes lanzar conjuros en forma salvaje."],
    ["Archidruida", "Forma salvaje ilimitada, e ignoras los componentes verbales, somáticos y materiales sin coste."]
  ],
  sub: { name: "Círculo de la tierra", intro: "Guardianes del saber antiguo ligados a un tipo de terreno.", features: [
    [2, "Truco adicional y Recuperación natural", "Un truco más; una vez al día, en un descanso corto recuperas espacios que sumen la mitad de tu nivel."],
    [3, "Conjuros de círculo", "Conjuros siempre preparados según tu terreno: ártico, costa, desierto, bosque, pradera, montaña, pantano o Infraoscuridad."],
    [6, "Zancada por la tierra", "El terreno difícil no mágico no te frena y tienes ventaja contra plantas mágicas."],
    [10, "Protección de la naturaleza", "Inmune a venenos y enfermedades, y a quedar encantado o asustado por elementales y hadas."],
    [14, "Santuario natural", "Las bestias y plantas deben superar una salvación de Sabiduría para atacarte."]] },
  others: [["Círculo de la luna", "druidas que combaten transformados"], ["Círculo de las estrellas", "constelaciones que guían su magia"], ["Círculo de las esporas", "hongos y muerte"], ["Círculo del mar", "olas y tormentas (2024)"]],
  y2024: "La Forma salvaje usa formas fijas que aprendes y dan vida temporal; el druida elige una Orden primigenia a nivel 1 (mago o guardián)." });

const GUERRERO = klass({ id: "guerrero", name: "Guerrero", die: 10, primary: "Fuerza o Destreza", saves: "Fuerza y Constitución",
  intro: "Maestro de todas las armas y armaduras: aguanta, golpea más veces que nadie y nunca se rinde.",
  armor: "Todas y escudos", weapons: "Sencillas y marciales", skills: "Dos entre Acrobacias, Atletismo, Historia, Intimidación, Percepción, Perspicacia, Supervivencia y Trato con animales",
  equipment: "Cota de malla o cuero y arco largo; arma marcial y escudo o dos armas marciales; ballesta ligera o dos hachas de mano; paquete de mazmorreo o de explorador",
  levels: ["Estilo de combate, Tomar aliento", "Oleada de acción (1)", "Arquetipo marcial", "Mejora de característica", "Ataque adicional", "Mejora de característica", "Rasgo de arquetipo", "Mejora de característica", "Indomable (1)", "Rasgo de arquetipo", "Ataque adicional (2)", "Mejora de característica", "Indomable (2)", "Mejora de característica", "Rasgo de arquetipo", "Mejora de característica", "Oleada de acción (2), Indomable (3)", "Rasgo de arquetipo", "Mejora de característica", "Ataque adicional (3)"],
  features: [
    ["Estilo de combate", "Uno a elegir: Tiro con arco (+2 a distancia), Defensa (+1 a la CA con armadura), Duelo (+2 al daño con una sola arma), Armas grandes (repites 1 y 2 en el daño), Protección (desventaja a quien ataca a un aliado) o Dos armas (sumas el modificador a la segunda)."],
    ["Tomar aliento", "Como acción adicional recuperas 1d10 + tu nivel; vuelve con un descanso corto."],
    ["Oleada de acción", "Una acción más en tu turno; vuelve con un descanso corto (dos usos a nivel 17)."],
    ["Ataque adicional", "Dos ataques por acción de Atacar; tres a nivel 11 y cuatro a nivel 20."],
    ["Indomable", "Repites una salvación fallida; uno, dos o tres usos por descanso largo."],
    ["Mejoras de característica", "El guerrero tiene más que nadie: a niveles 4, 6, 8, 12, 14, 16 y 19."]
  ],
  sub: { name: "Campeón", intro: "Perfección física sin trucos: golpea más fuerte y más a menudo.", features: [
    [3, "Crítico mejorado", "Tus ataques con arma son crítico con 19 o 20."],
    [7, "Atleta extraordinario", "Sumas la mitad de tu competencia a pruebas de Fuerza, Destreza y Constitución que no la tengan, y saltas más."],
    [10, "Estilo de combate adicional", "Un segundo estilo."],
    [15, "Crítico superior", "Crítico con 18, 19 o 20."],
    [18, "Superviviente", "Al empezar tu turno, si tienes menos de la mitad de vida, recuperas 5 + Constitución."]] },
  others: [["Maestro de batalla", "maniobras con dados de superioridad"], ["Caballero arcano", "conjuros de abjuración y evocación"], ["Caballero eldritch", "nombre alternativo del anterior en algunas ediciones en castellano"], ["Guerrero psiónico", "poderes mentales (2024)"], ["Samurái", "voluntad indomable"]],
  y2024: "Llegan la Maestría con armas (tres armas), Segunda oportunidad táctica (Tomar aliento da movimiento) y Mente táctica (gastar Tomar aliento para mejorar una prueba)." });

const MONJE = klass({ id: "monje", name: "Monje", die: 8, primary: "Destreza y Sabiduría", saves: "Fuerza y Destreza",
  intro: "Disciplina del cuerpo y del espíritu: puños veloces, saltos imposibles y una energía interior (ki) que dobla la realidad.",
  armor: "Ninguna", weapons: "Sencillas y espadas cortas", tools: "Un instrumento o útiles de artesano", skills: "Dos entre Acrobacias, Atletismo, Historia, Perspicacia, Religión y Sigilo",
  equipment: "Espada corta o arma sencilla, paquete de mazmorreo o de explorador y diez dardos",
  levels: ["Defensa sin armadura, Artes marciales (d4)", "Ki, Movimiento sin armadura", "Tradición monástica, Desviar proyectiles", "Mejora de característica, Caída lenta", "Ataque adicional, Golpe aturdidor, Artes marciales (d6)", "Golpes potenciados por ki, rasgo de tradición", "Evasión, Quietud mental", "Mejora de característica", "Mejora de Movimiento sin armadura", "Pureza corporal", "Rasgo de tradición, Artes marciales (d8)", "Mejora de característica", "Lengua del sol y la luna", "Alma diamantina", "Cuerpo intemporal", "Mejora de característica", "Rasgo de tradición, Artes marciales (d10)", "Cuerpo vacío", "Mejora de característica", "Perfección del ser"],
  features: [
    ["Defensa sin armadura", "Sin armadura ni escudo, tu CA es 10 + Destreza + Sabiduría."],
    ["Artes marciales", "Atacas sin armas o con armas de monje usando Destreza, con un dado de daño que crece (d4 a d10), y haces un golpe sin armas como acción adicional tras atacar."],
    ["Ki", "Tantos puntos como tu nivel, que vuelven con un descanso corto: Ráfaga de golpes (dos golpes sin armas como acción adicional), Defensa paciente (Esquivar como adicional) y Paso del viento (Correr o Destrabarse como adicional y salto doble)."],
    ["Movimiento sin armadura", "Más velocidad (+10 pies, hasta +30) y, desde nivel 9, corres por paredes y agua."],
    ["Desviar proyectiles", "Con tu reacción reduces el daño de un ataque a distancia en 1d10 + Destreza + nivel; si queda en 0, puedes atraparlo y devolverlo."],
    ["Golpe aturdidor", "Al impactar cuerpo a cuerpo, gastas 1 ki: salvación de Constitución o queda aturdido hasta tu próximo turno."],
    ["Evasión", "Ante efectos con salvación de Destreza por la mitad, nada si la superas y la mitad si fallas."],
    ["Alma diamantina", "Competente en todas las salvaciones; gasta 1 ki para repetir una fallida."],
    ["Perfección del ser", "Si empiezas el combate sin ki, recuperas 4."]
  ],
  sub: { name: "Camino de la mano abierta", intro: "Maestros del combate sin armas que manipulan el ki del rival.", features: [
    [3, "Técnica de la mano abierta", "Con la Ráfaga de golpes puedes derribar (Destreza), empujar 15 pies (Fuerza) o quitar sus reacciones."],
    [6, "Plenitud corporal", "Una vez por descanso largo te curas tres veces tu nivel."],
    [11, "Tranquilidad", "Al acabar un descanso largo quedas bajo los efectos de santuario."],
    [17, "Palma temblorosa", "Gastando 3 ki dejas vibraciones letales: cuando quieras, salvación de Constitución o cae a 0 (o 10d10 de daño necrótico)."]] },
  others: [["Camino de la sombra", "sigilo y teletransporte por las sombras"], ["Camino de los cuatro elementos", "ki convertido en fuego, agua, tierra y aire"], ["Camino del alma solar", "rayos de luz"], ["Camino de la misericordia", "curar y dañar con las manos"]],
  y2024: "El ki pasa a llamarse puntos de enfoque, el dado de Artes marciales empieza en d6 y Golpe aturdidor se puede usar una vez por turno." });

const PALADIN = klass({ id: "paladin", name: "Paladín", die: 10, primary: "Fuerza y Carisma", saves: "Sabiduría y Carisma",
  intro: "Un guerrero sagrado unido por un juramento: castiga a sus enemigos con luz divina y protege a los suyos con auras.",
  armor: "Todas y escudos", weapons: "Sencillas y marciales", skills: "Dos entre Atletismo, Intimidación, Medicina, Persuasión, Perspicacia y Religión",
  equipment: "Arma marcial y escudo o dos armas marciales, cinco jabalinas o arma sencilla, paquete de sacerdote o de explorador, cota de malla y símbolo sagrado",
  levels: ["Sentido divino, Imposición de manos", "Estilo de combate, Lanzamiento de conjuros, Castigo divino", "Salud divina, Juramento sagrado", "Mejora de característica", "Ataque adicional", "Aura de protección", "Rasgo de juramento", "Mejora de característica", "—", "Aura de valor", "Castigo divino mejorado", "Mejora de característica", "—", "Toque purificador", "Rasgo de juramento", "Mejora de característica", "—", "Mejora de auras", "Mejora de característica", "Rasgo de juramento"],
  features: [
    ["Sentido divino", "Con tu acción, sabes dónde hay celestiales, infernales y muertos vivientes a 60 pies. 1 + Carisma usos por descanso largo."],
    ["Imposición de manos", "Una reserva de cinco veces tu nivel en puntos de curación; con 5 curas una enfermedad o un veneno."],
    ["Lanzamiento de conjuros", "Desde nivel 2, usas el Carisma y preparas conjuros de paladín (la mitad de tu nivel + Carisma)."],
    ["Castigo divino", "Al impactar cuerpo a cuerpo gastas un espacio: 2d8 de daño radiante más 1d8 por nivel de espacio por encima del 1 (máximo 5d8), y otro 1d8 contra muertos vivientes e infernales."],
    ["Salud divina", "Inmune a las enfermedades."],
    ["Aura de protección", "Tú y tus aliados a 10 pies sumáis tu modificador de Carisma a las salvaciones (30 pies a nivel 18)."],
    ["Aura de valor", "Tú y tus aliados a 10 pies no podéis quedar asustados."],
    ["Castigo divino mejorado", "Todos tus ataques cuerpo a cuerpo hacen 1d8 de daño radiante extra."],
    ["Toque purificador", "Acabas con un conjuro sobre ti o un aliado; usos según tu Carisma."]
  ],
  sub: { name: "Juramento de devoción", intro: "El ideal del caballero: honestidad, valor, compasión, honor y deber.", features: [
    [3, "Canalizar divinidad", "Arma sagrada (+Carisma al ataque y luz) o Expulsar a los impíos (infernales y muertos vivientes huyen)."],
    [7, "Aura de devoción", "Tú y tus aliados a 10 pies no podéis quedar encantados."],
    [15, "Pureza de espíritu", "Siempre bajo los efectos de protección contra el bien y el mal."],
    [20, "Halo sagrado", "Durante un minuto emites luz que daña a tus enemigos y desventaja a infernales y muertos vivientes."]] },
  others: [["Juramento de los antiguos", "proteger la luz y la vida"], ["Juramento de venganza", "perseguir a los grandes malvados"], ["Juramento de gloria", "hazañas heroicas"], ["Juramento de los vigilantes", "guardianes contra lo de otros planos"]],
  y2024: "Castigo divino es un conjuro (se lanza como acción adicional al impactar) y Encontrar montura queda siempre preparado." });

const EXPLORADOR = klass({ id: "explorador", name: "Explorador", die: 10, primary: "Destreza y Sabiduría", saves: "Fuerza y Destreza",
  intro: "Cazador de las tierras salvajes: rastrea, sobrevive y abate a su presa con arco o espada y algo de magia natural.",
  armor: "Ligeras, intermedias y escudos", weapons: "Sencillas y marciales", skills: "Tres entre Atletismo, Investigación, Naturaleza, Percepción, Perspicacia, Sigilo, Supervivencia y Trato con animales",
  equipment: "Cota de escamas o armadura de cuero, dos espadas cortas o dos armas sencillas, paquete de mazmorreo o de explorador, arco largo y carcaj con 20 flechas",
  levels: ["Enemigo predilecto, Explorador nato", "Estilo de combate, Lanzamiento de conjuros", "Arquetipo de explorador, Consciencia primigenia", "Mejora de característica", "Ataque adicional", "Mejora de Enemigo predilecto y Explorador nato", "Rasgo de arquetipo", "Mejora de característica, Zancada por la tierra", "—", "Explorador nato mejorado, Ocultarse a simple vista", "Rasgo de arquetipo", "Mejora de característica", "—", "Enemigo predilecto mejorado, Desvanecerse", "Rasgo de arquetipo", "Mejora de característica", "—", "Sentidos salvajes", "Mejora de característica", "Asesino de enemigos"],
  features: [
    ["Enemigo predilecto", "Un tipo de criatura (o dos razas humanoides): ventaja para rastrearlo y recordar datos de él, y aprendes su idioma."],
    ["Explorador nato", "En tu terreno favorito el grupo no se pierde, viaja más rápido, sigue alerta y encuentra el doble de comida."],
    ["Lanzamiento de conjuros", "Desde nivel 2, usas la Sabiduría y conoces conjuros de explorador."],
    ["Consciencia primigenia", "Gastas un espacio para saber si hay ciertos tipos de criatura a una milla."],
    ["Zancada por la tierra", "El terreno difícil no mágico no te frena."],
    ["Ocultarse a simple vista y Desvanecerse", "Te camuflas en el terreno (+10 a Sigilo) y luego puedes Esconderte como acción adicional sin dejar rastro."],
    ["Sentidos salvajes y Asesino de enemigos", "Sin ver, notas a las criaturas invisibles a 30 pies; y una vez por turno sumas tu Sabiduría al ataque o al daño contra tu enemigo predilecto."]
  ],
  sub: { name: "Cazador", intro: "Protector de los pueblos de la frontera frente a las grandes bestias.", features: [
    [3, "Presa del cazador", "Matagigantes (1d8 si ya está herido), Rompehordas (otro ataque a un enemigo adyacente) o Asesino de colosos."],
    [7, "Tácticas defensivas", "Escapar de la horda, Defensa contra ataques múltiples o Voluntad de acero."],
    [11, "Ataque múltiple", "Andanada (un ataque a cada uno en 10 pies) o Torbellino (cuerpo a cuerpo a todos a tu alcance)."],
    [15, "Defensa superior", "Evasión, Aguantar la marea o Esquivar asombrosamente."]] },
  others: [["Señor de las bestias", "un compañero animal"], ["Acechador sombrío", "cazador de la Infraoscuridad"], ["Errante feérico", "magia de los bosques encantados"], ["Guardián del enjambre", "un enjambre de espíritus"]],
  y2024: "Marca del cazador siempre preparada y gratis unas veces al día; los rasgos de terreno pasan a ser Pericia, Viajero incansable y Mimetismo." });

const PICARO = klass({ id: "picaro", name: "Pícaro", die: 8, primary: "Destreza", saves: "Destreza e Inteligencia",
  intro: "Sigilo, ingenio y un golpe certero donde más duele: el experto en habilidades y el rey del daño de un solo ataque.",
  armor: "Ligeras", weapons: "Sencillas, ballestas de mano, espadas largas, estoques y espadas cortas", tools: "Herramientas de ladrón",
  skills: "Cuatro entre Acrobacias, Atletismo, Engaño, Interpretación, Intimidación, Investigación, Juego de manos, Percepción, Perspicacia, Persuasión y Sigilo",
  equipment: "Estoque o espada corta, arco corto o espada corta, paquete de ladrón o de mazmorreo, armadura de cuero, dos dagas y herramientas de ladrón",
  levels: ["Pericia, Ataque furtivo (1d6), Jerga de ladrones", "Acción astuta", "Arquetipo de pícaro, Ataque furtivo (2d6)", "Mejora de característica", "Esquiva asombrosa, Ataque furtivo (3d6)", "Pericia", "Evasión, Ataque furtivo (4d6)", "Mejora de característica", "Rasgo de arquetipo, Ataque furtivo (5d6)", "Mejora de característica", "Talento fiable, Ataque furtivo (6d6)", "Mejora de característica", "Rasgo de arquetipo, Ataque furtivo (7d6)", "Sentido ciego", "Mente escurridiza, Ataque furtivo (8d6)", "Mejora de característica", "Rasgo de arquetipo, Ataque furtivo (9d6)", "Escurridizo", "Mejora de característica, Ataque furtivo (10d6)", "Golpe de suerte"],
  features: [
    ["Pericia", "Doble competencia en dos habilidades (u herramientas de ladrón), y otras dos a nivel 6."],
    ["Ataque furtivo", "Una vez por turno, daño extra (1d6 por cada dos niveles) a un ataque con arma sutil o a distancia si tienes ventaja o si un aliado está a 5 pies del objetivo y no tienes desventaja."],
    ["Jerga de ladrones", "Un código secreto de signos y palabras."],
    ["Acción astuta", "Correr, Destrabarse o Esconderse como acción adicional."],
    ["Esquiva asombrosa", "Con tu reacción, recibes la mitad del daño de un ataque que ves."],
    ["Evasión", "Ante salvaciones de Destreza por la mitad, nada si la superas y la mitad si fallas."],
    ["Talento fiable", "En las pruebas de habilidades con competencia, un 9 o menos cuenta como 10."],
    ["Sentido ciego, Mente escurridiza y Escurridizo", "Notas lo invisible a 10 pies, competencia en salvaciones de Sabiduría y nadie tiene ventaja al atacarte si no estás incapacitado."],
    ["Golpe de suerte", "Conviertes un fallo en un acierto o una prueba en un 20, una vez por descanso corto."]
  ],
  sub: { name: "Ladrón", intro: "Rateros, allanadores y cazadores de tesoros.", features: [
    [3, "Manos rápidas", "Con la acción astuta usas Juego de manos, herramientas de ladrón o un objeto."],
    [3, "Trabajo en las alturas", "Trepar no cuesta más y saltas más lejos."],
    [9, "Sigilo supremo", "Ventaja en Sigilo si no te mueves más de la mitad."],
    [13, "Usar objeto mágico", "Ignoras los requisitos de clase, raza y nivel de los objetos mágicos."],
    [17, "Reflejos de ladrón", "Dos turnos en el primer asalto del combate."]] },
  others: [["Asesino", "ventaja y críticos contra quien no ha actuado"], ["Embaucador arcano", "ilusiones y encantamientos"], ["Espadachín", "duelos con elegancia"], ["Explorador (scout)", "movimiento y supervivencia"], ["Alma afilada", "cuchillas psíquicas (2024)"]],
  y2024: "Ataque furtivo puede cambiar dados por efectos (Golpe astuto: envenenar, derribar, retirarse) y llega la Maestría con armas." });

const HECHICERO = klass({ id: "hechicero", name: "Hechicero", die: 6, primary: "Carisma", saves: "Constitución y Carisma",
  intro: "La magia le corre por la sangre: no la estudia, la lleva dentro, y la retuerce con la metamagia.",
  armor: "Ninguna", weapons: "Dagas, dardos, hondas, bastones y ballestas ligeras", skills: "Dos entre Arcanos, Engaño, Intimidación, Perspicacia, Persuasión y Religión",
  equipment: "Ballesta ligera o arma sencilla, bolsa de componentes o foco arcano, paquete de mazmorreo o de explorador y dos dagas",
  levels: ["Lanzamiento de conjuros, Origen hechicero", "Fuente de magia", "Metamagia", "Mejora de característica", "—", "Rasgo de origen", "—", "Mejora de característica", "—", "Metamagia", "—", "Mejora de característica", "—", "Rasgo de origen", "—", "Mejora de característica", "Metamagia", "Rasgo de origen", "Mejora de característica", "Restablecimiento hechicero"],
  features: [
    ["Lanzamiento de conjuros", "Usas el Carisma y conoces pocos conjuros de la lista de hechicero, que cambias al subir de nivel."],
    ["Fuente de magia", "Puntos de hechicería igual a tu nivel: conviertes puntos en espacios de conjuro y espacios en puntos."],
    ["Metamagia", "Cambias tus conjuros gastando puntos: Cuidadoso (aliados salvan solos), Distante, Potenciado (repites dados de daño), Prolongado, Acelerado (acción adicional), Sutil (sin componentes), Doble (dos objetivos)."],
    ["Restablecimiento hechicero", "En un descanso corto recuperas 4 puntos de hechicería."]
  ],
  sub: { name: "Linaje dracónico", intro: "Sangre de dragón en tus venas, de un color concreto que marca tu tipo de daño.", features: [
    [1, "Antepasado dracónico", "Eliges un tipo de dragón; hablas dracónico y duplicas tu competencia con Carisma al tratar con dragones."],
    [1, "Resiliencia dracónica", "+1 punto de golpe por nivel y, sin armadura, CA 13 + Destreza."],
    [6, "Afinidad elemental", "Sumas tu Carisma al daño de los conjuros de tu tipo y puedes gastar 1 punto para ganar resistencia."],
    [14, "Alas de dragón", "Despliegas alas y vuelas a tu velocidad."],
    [18, "Presencia dracónica", "Un aura de 60 pies que asusta o encanta (salvación de Sabiduría)."]] },
  others: [["Magia salvaje", "oleadas de magia caótica"], ["Alma divina", "la chispa de un dios"], ["Mente aberrante", "telepatía extraña"], ["Alma de relojería", "orden absoluto"], ["Hechicería de tormenta", "viento y relámpago"]],
  y2024: "La subclase llega a nivel 3, la Metamagia a nivel 2 e Innato hechicero potencia los conjuros durante un minuto." });

const BRUJO = klass({ id: "brujo", name: "Brujo", die: 8, primary: "Carisma", saves: "Sabiduría y Carisma",
  intro: "Su poder viene de un pacto con un ser de otro mundo: pocos espacios que vuelven pronto e invocaciones únicas.",
  armor: "Ligeras", weapons: "Sencillas", skills: "Dos entre Arcanos, Engaño, Historia, Intimidación, Investigación, Naturaleza y Religión",
  equipment: "Ballesta ligera o arma sencilla, bolsa de componentes o foco arcano, paquete de erudito o de mazmorreo, armadura de cuero, arma sencilla y dos dagas",
  levels: ["Patrón sobrenatural, Magia del pacto", "Invocaciones sobrenaturales", "Don del pacto", "Mejora de característica", "—", "Rasgo de patrón", "—", "Mejora de característica", "—", "Rasgo de patrón", "Arcano místico (nivel 6)", "Mejora de característica", "Arcano místico (nivel 7)", "Rasgo de patrón", "Arcano místico (nivel 8)", "Mejora de característica", "Arcano místico (nivel 9)", "—", "Mejora de característica", "Maestro sobrenatural"],
  features: [
    ["Magia del pacto", "Usas el Carisma. Tienes pocos espacios (de 1 a 4), todos del mismo nivel (hasta el 5), que vuelven con un descanso corto."],
    ["Invocaciones sobrenaturales", "Poderes a elegir que se ganan con el nivel: Descarga agonizante (+Carisma a descarga sobrenatural), Armadura de sombras, Vista diabólica, Máscara de muchos rostros…"],
    ["Don del pacto", "Pacto de la cadena (un familiar especial), del filo (un arma mágica que invocas) o del tomo (un libro con tres trucos de cualquier clase)."],
    ["Arcano místico", "Un conjuro de nivel 6, 7, 8 y 9 que lanzas una vez por descanso largo sin espacio."],
    ["Maestro sobrenatural", "Una vez por descanso largo, un minuto de súplica a tu patrón recupera todos tus espacios."]
  ],
  sub: { name: "El Infernal", intro: "Un pacto con un señor de los Nueve Infiernos o del Abismo.", features: [
    [1, "Bendición del oscuro", "Al reducir a 0 a un enemigo, ganas tu Carisma + tu nivel en vida temporal."],
    [6, "Suerte del oscuro", "Sumas 1d10 a una prueba o salvación, una vez por descanso corto."],
    [10, "Resiliencia infernal", "Eliges un tipo de daño al que resistes hasta tu próximo descanso."],
    [14, "Lanzar al infierno", "Al impactar, envías al objetivo al infierno un turno: 10d10 de daño psíquico si no es infernal."]] },
  others: [["El Archifeérico", "un señor de las hadas"], ["El Primigenio", "una entidad del Reino Lejano"], ["El Celestial", "un ser de luz"], ["El Filo maldito (Hexblade)", "un arma consciente"], ["El Insondable", "las profundidades del mar"]],
  y2024: "La subclase llega a nivel 3, los dones de pacto se convierten en invocaciones y la Magia del pacto se recupera también en parte con Astucia mística." });

const MAGO = klass({ id: "mago", name: "Mago", die: 6, primary: "Inteligencia", saves: "Inteligencia y Sabiduría",
  intro: "El estudioso de lo arcano: el libro de conjuros más grande, la magia más versátil y la menor resistencia física.",
  armor: "Ninguna", weapons: "Dagas, dardos, hondas, bastones y ballestas ligeras", skills: "Dos entre Arcanos, Historia, Investigación, Medicina, Perspicacia y Religión",
  equipment: "Bastón o daga, bolsa de componentes o foco arcano, paquete de erudito o de explorador y libro de conjuros",
  levels: ["Lanzamiento de conjuros, Recuperación arcana", "Tradición arcana", "—", "Mejora de característica", "—", "Rasgo de tradición", "—", "Mejora de característica", "—", "Rasgo de tradición", "—", "Mejora de característica", "—", "Rasgo de tradición", "—", "Mejora de característica", "—", "Dominio de conjuros", "Mejora de característica", "Conjuros característicos"],
  features: [
    ["Libro de conjuros", "Empiezas con seis conjuros de nivel 1 y añades dos cada nivel; puedes copiar más que encuentres pagando tinta y tiempo."],
    ["Lanzamiento de conjuros", "Usas la Inteligencia y preparas cada día tu nivel + tu modificador de Inteligencia de los conjuros de tu libro. Lanzas rituales del libro aunque no estén preparados."],
    ["Recuperación arcana", "Una vez al día, en un descanso corto recuperas espacios que sumen la mitad de tu nivel (redondeando hacia arriba), ninguno de nivel 6 o más."],
    ["Dominio de conjuros", "Un conjuro de nivel 1 y otro de nivel 2 que lanzas a voluntad a su nivel más bajo."],
    ["Conjuros característicos", "Dos conjuros de nivel 3 siempre preparados que lanzas una vez cada uno sin espacio por descanso corto."]
  ],
  sub: { name: "Escuela de evocación", intro: "Magos de la energía pura: fuego, frío, rayos y trueno.", features: [
    [2, "Sabio de la evocación", "Copiar conjuros de evocación te cuesta la mitad."],
    [2, "Esculpir conjuros", "Eliges hasta 1 + el nivel del conjuro criaturas que superan automáticamente la salvación de tu evocación y no reciben daño."],
    [6, "Truco potente", "Tus trucos hacen la mitad de daño aunque superen la salvación."],
    [10, "Evocación potenciada", "Sumas tu Inteligencia a una tirada de daño de tus evocaciones."],
    [14, "Sobrecarga", "Haces el daño máximo con un conjuro de nivel 5 o menos; repetirlo antes del descanso te daña."]] },
  others: [["Abjuración", "barreras y protecciones"], ["Adivinación", "presagios con dados"], ["Conjuración", "invocar y teletransportar"], ["Encantamiento", "dominar mentes"], ["Ilusión", "engaños que se vuelven reales"], ["Nigromancia", "muertos vivientes y energía negativa"], ["Transmutación", "cambiar la materia"], ["Canto de la hoja", "magia y espada"]],
  y2024: "Llega Erudito (Pericia en una habilidad de saber), los conjuros preparados se cambian al descansar y la Recuperación arcana se mantiene." });

/* ---------- Especies y trasfondos ---------- */
const ESPECIES = { id: "especies", title: "Especies", intro: "<p>Las gentes que pueblan los mundos de D&amp;D. En 2014 daban mejoras de característica (raza); en 2024 esas mejoras las da el trasfondo.</p>", entries: [
  ["Humano", "Mediano, 30 pies. Versátil y ambicioso. 2014: +1 a todas las características. 2024: Inspiración heroica tras cada descanso largo, una habilidad más y una dote de origen."],
  ["Elfo", "Mediano, 30 pies, visión en la oscuridad. Sentidos agudos (Percepción), ascendencia feérica (ventaja contra encantamientos, la magia no lo duerme) y trance de 4 horas. Linajes: alto elfo (un truco de mago), elfo del bosque (más velocidad, se esconde en la naturaleza) y elfo oscuro (visión superior, magia drow)."],
  ["Enano", "Mediano, 25 pies (no le frena la armadura pesada), visión en la oscuridad. Resistencia enana (ventaja y resistencia contra veneno), entrenamiento con hachas y martillos, saber de la piedra. Enano de las colinas: +1 vida por nivel; de las montañas: armaduras intermedias."],
  ["Mediano", "Pequeño, 25 pies. Afortunado (repite los 1 en d20), valiente (ventaja contra el miedo) y ágil (pasa por el espacio de criaturas mayores). Piesligeros: se esconde tras criaturas grandes; fornido: resiste el veneno."],
  ["Dracónido", "Mediano, 30 pies. Arma de aliento según su linaje (fuego, frío, ácido, relámpago o veneno) y resistencia a ese daño. En 2024 añade visión en la oscuridad y alas temporales a nivel 5."],
  ["Gnomo", "Pequeño, 25 pies, visión en la oscuridad. Astucia gnoma: ventaja en salvaciones de Inteligencia, Sabiduría y Carisma contra la magia. Gnomo de las rocas: pequeños artilugios; de los bosques: ilusión menor y hablar con animales pequeños."],
  ["Semielfo", "Mediano, 30 pies, visión en la oscuridad. +2 Carisma y +1 a otras dos, dos habilidades más y ascendencia feérica. En 2024 desaparece como especie: se juega como humano o elfo con el trasfondo que se quiera."],
  ["Semiorco", "Mediano, 30 pies, visión en la oscuridad. Amenazador (Intimidación), aguante implacable (una vez por descanso largo, cae a 1 en vez de 0) y ataques salvajes (un dado más en los críticos). En 2024 lo sustituye el orco."],
  ["Tiefling", "Mediano, 30 pies, visión en la oscuridad. Resistencia al fuego y legado infernal: taumaturgia, represión infernal y oscuridad. En 2024 elige legado abisal, ctónico o infernal."],
  ["Goliat y orco (2024)", "Nuevas especies del manual de 2024: el goliat (grande de sangre de gigante, con poderes de su linaje) y el orco (impulso de adrenalina y aguante implacable)."]
].map(([n, d], i) => ({ id: "esp" + i, title: n, html: `<p>${d}</p>` })) };

const TRASFONDOS = { id: "trasfondos", title: "Trasfondos", intro: "<p>De dónde viene el personaje. En 2024, cada trasfondo da +2/+1 a tres características posibles, dos habilidades, una herramienta y una dote de origen.</p>", entries: [
  ["Acólito", "Criado al servicio de un templo. Perspicacia y Religión, útiles de calígrafo, dote Iniciado en la magia (clérigo). Características: Inteligencia, Sabiduría, Carisma."],
  ["Artesano", "Aprendiz de un gremio. Investigación y Persuasión, útiles de artesano, dote Fabricante. Fuerza, Destreza, Inteligencia."],
  ["Charlatán", "Vive del engaño. Engaño y Juego de manos, útiles de falsificador, dote Pericia en habilidades. Destreza, Constitución, Carisma."],
  ["Criminal", "Al margen de la ley. Juego de manos y Sigilo, herramientas de ladrón, dote Alerta. Destreza, Constitución, Inteligencia."],
  ["Animador", "Artista ambulante. Acrobacias e Interpretación, un instrumento, dote Músico. Fuerza, Destreza, Carisma."],
  ["Granjero", "Trabajador de la tierra. Trato con animales y Naturaleza, útiles de carpintero, dote Duro. Fuerza, Constitución, Sabiduría."],
  ["Guardia", "Vigilante de murallas. Atletismo y Percepción, un juego, dote Alerta. Fuerza, Inteligencia, Sabiduría."],
  ["Guía", "Explorador de caminos. Sigilo y Supervivencia, útiles de cartógrafo, dote Iniciado en la magia (druida). Destreza, Constitución, Sabiduría."],
  ["Ermitaño", "Vivió apartado. Medicina y Religión, útiles de herborista, dote Curandero. Constitución, Sabiduría, Carisma."],
  ["Mercader", "Comerciante. Trato con animales y Persuasión, útiles de navegante, dote Afortunado. Constitución, Inteligencia, Carisma."],
  ["Noble", "De alta cuna. Historia y Persuasión, un juego, dote Pericia en habilidades. Fuerza, Inteligencia, Carisma."],
  ["Sabio", "Años entre libros. Arcanos e Historia, útiles de calígrafo, dote Iniciado en la magia (mago). Constitución, Inteligencia, Sabiduría."],
  ["Marinero", "Vida en el mar. Acrobacias y Percepción, útiles de navegante, dote Pendenciero. Fuerza, Destreza, Sabiduría."],
  ["Escriba", "Copista y archivero. Investigación y Percepción, útiles de calígrafo, dote Pericia en habilidades. Destreza, Inteligencia, Sabiduría."],
  ["Soldado", "Sirvió en un ejército. Atletismo e Intimidación, un juego, dote Atacante salvaje. Fuerza, Destreza, Constitución."],
  ["Viajero", "Siempre de paso. Perspicacia y Sigilo, herramientas de ladrón, dote Afortunado. Destreza, Sabiduría, Carisma."]
].map(([n, d], i) => ({ id: "tr" + i, title: n, html: `<p>${d}</p>` })) };

/* Por clase: el dado, los rasgos de cada nivel (1 a 20), su explicación y la
   subclase del SRD con sus rasgos por nivel. Lo usa el creador de personajes. */
export const CLASS_PROGRESSION = Object.fromEntries([BARBARO, BARDO, BRUJO, CLERIGO, DRUIDA, EXPLORADOR, GUERRERO, HECHICERO, MAGO, MONJE, PALADIN, PICARO]
  .map(k => [k.id, k.raw]));

export const JUGADOR = { sections: [BARBARO, BARDO, BRUJO, CLERIGO, DRUIDA, EXPLORADOR, GUERRERO, HECHICERO, MAGO, MONJE, PALADIN, PICARO, ESPECIES, TRASFONDOS,
  { id: "creditos", title: "Créditos", entries: [{ id: "cr", title: "", html: "<p>Las reglas de este manual salen del <i>System Reference Document</i> 5.1 y 5.2 de Wizards of the Coast LLC, publicados con licencia Creative Commons Attribution 4.0, resumidas y redactadas para Mesa. Las subclases fuera del SRD solo se nombran. Dungeons &amp; Dragons es marca de Wizards of the Coast.</p>" }] }] };
