/* Idioma. Mesa se escribió en español; el inglés se aplica encima, sobre el
   texto ya pintado, en vez de partir cada plantilla en dos.

   Suena raro, pero es lo correcto aquí: la interfaz se repinta entera a cada
   cambio de estado, así que basta con revisar lo que aparece. Se traduce solo
   lo que coincide *exactamente* con una entrada del diccionario, de modo que
   los nombres de los personajes, lo que escribe la gente en el chat y las
   notas del DM se quedan como están. */

const KEY = "mesa.lang";
export const LANGS = [["es", "Español"], ["en", "English"]];

let lang = (() => {
  try { return localStorage.getItem(KEY) || (navigator.language || "es").slice(0, 2); } catch { return "es"; }
})();
if (!LANGS.some(([c]) => c === lang)) lang = "es";

export const currentLang = () => lang;
/* Cambiar de idioma recarga la página. La traducción se aplica encima del
   texto ya pintado, así que no hay forma fiable de devolverlo al español sin
   volver a montarlo: recargar es honesto y no cuesta nada, porque la partida
   vive en el servidor y la sesión se guarda en el navegador. */
export function setLang(next) {
  const value = LANGS.some(([c]) => c === next) ? next : "es";
  if (value === lang) return;
  lang = value;
  try { localStorage.setItem(KEY, lang); } catch {}
  document.documentElement.lang = lang;
  if (typeof location !== "undefined" && location.reload) location.reload();
  else sweep(document.body);
}

/* Para las pruebas y para el primer pintado */
export function applyLang(value) {
  lang = LANGS.some(([c]) => c === value) ? value : "es";
  document.documentElement.lang = lang;
  sweep(document.body);
}

/* ---------- Diccionario ---------- */
const EN = {
  /* Entrada */
  "Mesa": "Mesa", "Partida de D&D": "D&D game", "Campaña sin nombre": "Untitled campaign",
  "DM": "DM", "llevas la partida": "you run the game", "Jugador": "Player",
  "llevas un personaje": "you play a character", "Pantalla": "Screen", "la tele de la mesa": "the table TV",
  "Tu nombre": "Your name", "Como te llaman en la mesa": "What they call you at the table",
  "Código del DM": "DM code", "Sale en la ventana del servidor": "It shows in the server window",
  "Tu personaje": "Your character", "Todavía no tengo": "I don't have one yet",
  "lo creas al entrar": "you create it once inside", "Entrar a la partida": "Join the game",
  "ya lo lleva alguien": "already taken", "Escribe tu nombre para entrar": "Type your name to join",
  "El código aparece en la ventana donde arrancaste Mesa.": "The code appears in the window where you started Mesa.",
  "Ponla en la tele o el proyector. Doble clic para pantalla completa.": "Put it on the TV or projector. Double-click for full screen.",
  "Elige tu personaje, o entra sin él y créalo desde dentro.": "Pick your character, or join without one and create it inside.",
  "Idioma": "Language",

  /* Barra y pestañas */
  "Nombre de la campaña": "Campaign name", "Mapa": "Map", "Bestiario": "Bestiary",
  "Iniciar combate": "Start combat", "Terminar combate": "End combat", "Descansar": "Rest",
  "Deshacer el último cambio": "Undo the last change", "Deshecho": "Undone",
  "Más opciones": "More options", "Añadir personaje": "Add character", "Salir": "Leave",
  "Mi ficha": "My sheet", "Party": "Party", "Dados y charla": "Dice and chat",
  "en la mesa": "at the table", "Nadie más conectado": "Nobody else connected",
  "Se ha perdido la conexión con la partida. Reintentando…": "Lost connection to the game. Retrying…",
  "Se ha perdido la conexión. Reintentando…": "Lost connection. Retrying…",
  "Sin conexión con la partida": "No connection to the game",
  "Conexión": "Connection", "Pantalla completa": "Full screen", "Salir de la pantalla": "Leave the screen",

  /* Mesa y fichas */
  "personajes": "characters", "puntos de vida en pie": "hit points still standing", "caídos": "down",
  "enemigos": "enemies", "Enemigos": "Enemies", "A la vista": "In sight",
  "Aún no hay nadie en la mesa": "Nobody at the table yet",
  "Crea las fichas tú, o dile a cada jugador que entre desde su móvil y se haga la suya.":
    "Make the sheets yourself, or tell each player to join from their phone and build their own.",
  "Retirar monstruos": "Clear monsters", "Quitar de la mesa": "Remove from the table",
  "Editar ficha": "Edit sheet", "Duplicar": "Duplicate", "Ver más": "Show more",
  "Oculto para la party": "Hidden from the party", "Visible para la party": "Visible to the party",
  "Restar vida": "Take hit points", "Curar": "Heal", "Vida temporal": "Temporary hit points",
  "Estados": "Conditions", "Atacar": "Attack", "Apuntar con los ataques": "Target with attacks",
  "Tirar un ataque": "Roll an attack", "Iniciativa": "Initiative", "Velocidad": "Speed",
  "Concentrado en": "Concentrating on", "Agotamiento": "Exhaustion", "Inspiración": "Inspiration",
  "En el mapa": "On the map", "Tirar la salvación de concentración": "Roll the concentration save",
  "Salvación…": "Saving throw…", "Habilidad…": "Skill check…", "Salvaciones": "Saving throws",
  "Habilidades": "Skills", "Éxitos": "Successes", "Fallos": "Failures",
  "Tirar salvación de muerte": "Roll a death save", "Salvación de muerte": "Death save",
  "Salvación de concentración": "Concentration save", "Tirar iniciativa": "Roll initiative",
  "Sentidos": "Senses", "Idiomas": "Languages", "Resistencias": "Resistances", "Rasgos": "Traits",
  "Acciones": "Actions", "Ataques": "Attacks", "Conjuros": "Spells", "Equipo": "Gear", "Notas": "Notes",
  "Daño": "Damage", "Curación": "Healing", "Temp": "Temp", "CA": "AC", "Editar": "Edit",
  "Te toca": "Your turn", "Es tu turno": "It's your turn", "ronda": "round", "Ronda": "Round",
  "turno de": "turn of", "después": "next", "después:": "next:",
  "Todavía no tienes personaje": "You don't have a character yet",
  "Quédate con uno de los que ya hay en la mesa o hazte el tuyo.":
    "Take one of the ones already at the table, or make your own.",
  "Crear mi personaje": "Create my character",
  "Tu ficha aún no tiene ataques ni equipo apuntados. Pulsa «Editar» para rellenarla.":
    "Your sheet has no attacks or gear yet. Press “Edit” to fill it in.",

  /* Combate */
  "Acción": "Action", "Adicional": "Bonus", "Reacción": "Reaction", "Retrasar": "Delay",
  "Siguiente turno": "Next turn", "Anterior": "Previous", "Añadir…": "Add…",
  "Meter en la iniciativa": "Add to initiative", "Ya están todos en la iniciativa": "Everyone is in the initiative already",
  "Objetivo": "Target", "Sin objetivo (solo tirar)": "No target (just roll)",
  "Ventaja": "Advantage", "Desventaja": "Disadvantage", "Normal": "Normal", "En secreto": "In secret",
  "Nadie más lo ve": "Nobody else sees it", "Ataques de": "Attacks of",
  "Descanso corto": "Short rest", "Descanso largo": "Long rest",
  "En el corto cada uno decide cuántos dados de golpe gasta; en el largo se recupera todo.":
    "On a short rest everyone spends the hit dice they want; on a long one, everything comes back.",
  "No le quedan dados de golpe": "No hit dice left", "No te quedan dados de golpe": "You have no hit dice left",
  "Apunta los dados de golpe en su ficha (por ejemplo 5d8)": "Write the hit dice on their sheet (5d8, for instance)",
  "Apunta tus dados de golpe en la ficha (por ejemplo 5d8)": "Write your hit dice on your sheet (5d8, for instance)",

  /* Dados y charla */
  "Dados y mesa": "Dice and table", "Tirar": "Roll", "Decir": "Say", "Todo": "All",
  "Tiradas": "Rolls", "Charla": "Chat", "Mensaje": "Message", "Escribe a la mesa…": "Say something to the table…",
  "Fórmula de dados": "Dice formula", "Vaciar el registro": "Clear the log", "Abrir o cerrar": "Open or close",
  "Susurrar a alguien en concreto": "Whisper to someone in particular", "Susurrar": "Whisper",
  "¿A quién se lo dices?": "Who are you telling?", "A toda la mesa": "To the whole table",
  "En privado a": "Privately to", "en privado": "in private", "solo a": "only to",
  "No hay nadie más en la mesa todavía": "There is nobody else at the table yet",
  "No entiendo esa fórmula. Prueba con 1d20+3": "I don't understand that formula. Try 1d20+3",
  "· crítico": "· critical", "· pifia": "· fumble", "con ventaja": "with advantage",
  "con desventaja": "with disadvantage", "· en secreto": "· in secret",

  /* Mapa */
  "Fichas": "Tokens", "Regla": "Ruler", "Muro": "Wall", "Puerta": "Door", "Borrar": "Erase",
  "Nota": "Note", "Acceso": "Passage", "Niebla": "Fog", "Oscuridad": "Darkness", "Luz": "Light",
  "Medir": "Measure", "Mover": "Move", "Señalar": "Ping", "Encajar": "Fit", "Todo el mapa": "Whole map",
  "Ajustes del mapa": "Map settings", "Mapa activo": "Active map", "Mapa nuevo": "New map",
  "Mapa creado": "Map created", "Borrar este mapa": "Delete this map", "Imagen de fondo": "Background image",
  "Plano cargado": "Floor plan loaded", "Cuadrar cuadrícula con la imagen": "Fit the grid to the image",
  "Cuadrícula ajustada a la imagen": "Grid fitted to the image",
  "Este mapa no tiene imagen de fondo": "This map has no background image",
  "Restablecer niebla": "Reset the fog", "Vaciar muros": "Clear walls", "Cerrar contorno": "Close the outline",
  "Quitar niebla y oscuridad": "Clear fog and darkness", "Quitar el terreno pintado": "Clear painted terrain",
  "Radio de visión (casillas)": "Sight radius (squares)", "Columnas": "Columns", "Filas": "Rows",
  "Qué ve la party": "What the party sees",
  "Enseñar este mapa en la pantalla de la party": "Show this map on the party screen",
  "Revelar el mapa entero": "Reveal the whole map", "Recordar lo explorado": "Remember what was explored",
  "Dibujar la cuadrícula": "Draw the grid",
  "Dejar que cada jugador mueva su ficha": "Let each player move their own token",
  "Dejar que los jugadores se acerquen y alejen": "Let players zoom in and out",
  "Pintar el alcance al arrastrar una ficha": "Show the reach when dragging a token",
  "Mapa a oscuras (solo se ve con antorchas o visión en la oscuridad)":
    "Map in darkness (only torches and darkvision see)",
  "Cámara": "Camera", "Centrada en el personaje": "Follows the character",
  "Casillas a lo ancho al seguir": "Squares across when following",
  "Pies por casilla": "Feet per square", "Diagonales": "Diagonals",
  "Cada una, 5 pies": "Each one, 5 feet", "Variante 5-10-5": "5-10-5 variant",
  "Esfera o ráfaga": "Sphere or burst", "Cono": "Cone", "Línea": "Line", "Cubo": "Cube",
  "Quitar todas las plantillas": "Clear all templates", "Tamaño en pies": "Size in feet",
  "Tamaño de la plantilla en pies": "Template size in feet",
  "Mover y seleccionar fichas": "Move and select tokens", "Medir distancias": "Measure distances",
  "Clavar una nota": "Pin a note", "Escalera o acceso a otro mapa": "Stairs or passage to another map",
  "Niebla: ver a través cuesta el triple": "Fog: seeing through costs triple",
  "Oscuridad: no se ve a través": "Darkness: you cannot see through",
  "Luz fija: alumbra aunque el mapa esté a oscuras": "Fixed light: it shines even on a dark map",
  "Qué es": "What it is", "Peligro": "Danger", "Tesoro": "Treasure", "Algo raro": "Something odd",
  "También la ve la party": "The party sees it too", "Enseñársela ahora": "Show it to them now",
  "Lleva a": "Leads to", "Casilla de llegada X": "Arrival square X", "Casilla de llegada Y": "Arrival square Y",
  "Cruzar solo al pisarlo": "Cross automatically when stepped on", "Escalera": "Stairs",
  "Crea antes otro mapa al que llevar": "Create another map to lead to first",
  "Nuevo acceso": "New passage", "Nota del mapa": "Map note", "Quitar": "Remove",
  "Sacar del mapa": "Take off the map", "Centrar la cámara de la party aquí": "Centre the party camera here",
  "Abrir la ficha": "Open the sheet", "Enseñar a la party": "Show to the party",
  "Ocultar a la party": "Hide from the party",
  "Ya están todos colocados en este mapa": "Everyone is already placed on this map",
  "Colocar aquí a todos los que faltan": "Place everyone still missing here",
  "El DM no está enseñando ningún mapa": "The DM isn't showing any map",
  "Cuando lo haga, aparecerá aquí.": "When they do, it'll show up here.",
  "casillas": "squares", "casilla": "square", "pies": "feet",

  /* Bestiario y criaturas */
  "Crear": "Create", "Buscar criatura": "Search creature", "Cantidad": "Amount",
  "PV al azar": "Random HP", "Al combate": "To combat", "Nueva criatura": "New creature",
  "No hay ninguna criatura con ese nombre.": "No creature by that name.",
  "Tamaño y tipo (texto)": "Size and type (text)", "Valor de desafío": "Challenge rating",
  "Puntos de experiencia": "Experience points", "Clase de armadura": "Armour class",
  "Vida media": "Average hit points", "Dados de vida": "Hit dice",
  "Resistencias e inmunidades": "Resistances and immunities",
  "Rasgos (uno por línea)": "Traits (one per line)", "Acciones (una por línea)": "Actions (one per line)",
  "Retrato": "Portrait", "Retrato guardado": "Portrait saved", "Color": "Colour", "Tamaño": "Size",
  "Notas del DM sobre esta criatura": "DM notes about this creature",

  /* Editor de ficha */
  "Nuevo personaje": "New character", "Quién es": "Who they are", "Nombre": "Name", "Clase": "Class",
  "Raza": "Race", "Nivel": "Level", "Trasfondo": "Background", "Alineamiento": "Alignment",
  "Color de la ficha": "Token colour", "En combate": "In combat", "Puntos de vida": "Hit points",
  "Vida máxima": "Maximum hit points", "Vida": "Hit points",
  "Bonificador de competencia": "Proficiency bonus",
  "Visión en la oscuridad (casillas)": "Darkvision (squares)",
  "Luz que lleva encima (casillas)": "Light carried (squares)",
  "Alcance cuerpo a cuerpo (casillas)": "Melee reach (squares)",
  "Características": "Ability scores", "Salvaciones con competencia": "Proficient saving throws",
  "Habilidades con competencia": "Proficient skills", "Espacios de conjuro": "Spell slots",
  "Recursos propios": "Own resources", "Añadir recurso": "Add resource", "Añadir ataque": "Add attack",
  "Usados": "Used", "Total": "Total", "Notas de la ficha": "Sheet notes",
  "Ataques y armas": "Attacks and weapons", "Anotaciones": "Notes",
  "Al ataque": "To hit", "Bonificador al ataque": "Attack bonus", "Tipo de daño": "Damage type",
  "Crear personaje": "Create character", "Guardar": "Save", "Cancelar": "Cancel", "Cerrar": "Close",
  "Confirmar": "Confirm", "Entendido": "Got it", "Nivel de agotamiento (0 a 6)": "Exhaustion level (0 to 6)",
  "Rondas que dura": "Rounds it lasts",
  "Rondas que dura (en blanco, hasta que se lo quiten)": "Rounds it lasts (blank: until removed)",

  /* Partida */
  "Partida": "Game", "Guardar copia de la partida": "Save a copy of the game",
  "Cargar una copia": "Load a copy", "Partida cargada": "Game loaded",
  "Ese archivo no parece una copia de Mesa": "That file doesn't look like a Mesa copy",
  "Pantalla de la party": "Party screen", "Pantalla de la party (la tele)": "Party screen (the TV)",
  "Abrir la pantalla aquí": "Open the screen here", "Qué enseña": "What it shows",
  "El mapa": "The map", "Los puntos de vida exactos de la party": "The party's exact hit points",
  "El mapa entero, sin niebla": "The whole map, no fog",
  "Enseñar una imagen a la mesa": "Show an image to the table",
  "La mesa está viendo la imagen": "The table is looking at the image",
  "Ya estás enseñando una imagen": "You're already showing an image",
  "Guardar la imagen": "Put the image away", "Guardarla": "Put it away", "Cambiarla": "Change it",
  "Pedir una tirada": "Ask for a roll", "Pedir una tirada a la party": "Ask the party for a roll",
  "Pedirla": "Ask for it", "Qué pides": "What you're asking for", "Fórmula": "Formula",
  "Dificultad (opcional)": "Difficulty (optional)", "¿A quién?": "Who from?",
  "El DM te pide:": "The DM asks you for:", "tirar": "roll",
  "Cómo entran mis jugadores": "How my players join",
  "Cómo entran tus jugadores": "How your players join",
  "Salir de la sesión": "Leave the session", "Que abran": "Have them open",
  "Abrir la pantalla de la party": "Open the party screen",

  /* Las criaturas que vienen de serie. Lo que escribas tú se queda como lo
     escribas: aquí solo está lo que trae Mesa de fábrica. */
  "Goblin": "Goblin", "Kobold": "Kobold", "Bandido": "Bandit", "Guardia": "Guard",
  "Lobo": "Wolf", "Esqueleto": "Skeleton", "Zombi": "Zombie", "Orco": "Orc",
  "Trasgo": "Hobgoblin", "Araña gigante": "Giant spider", "Oso pardo": "Brown bear",
  "Osgo": "Bugbear", "Ogro": "Ogre",
  "Humanoide pequeño": "Small humanoid", "Humanoide mediano": "Medium humanoid",
  "Humanoide grande": "Large humanoid", "Bestia mediana": "Medium beast",
  "Bestia grande": "Large beast", "Muerto viviente mediano": "Medium undead",
  "Gigante grande": "Large giant",
  "Diminuto": "Tiny", "Pequeño": "Small", "Mediano": "Medium",
  "Grande": "Large", "Enorme": "Huge", "Gargantuesco": "Gargantuan",
  "Común": "Common", "Cualquiera": "Any", "Común, goblin": "Common, Goblin",
  "Común, dracónico": "Common, Draconic", "Común, orco": "Common, Orc",
  "Entiende común pero no habla": "Understands Common but can't speak",
  "Visión en la oscuridad 60 pies": "Darkvision 60 ft.",
  "Visión en la oscuridad 30 pies": "Darkvision 30 ft.",
  "Visión en la oscuridad 60 pies, percepción pasiva 9": "Darkvision 60 ft., passive Perception 9",
  "Oído y olfato agudos": "Keen hearing and smell",
  "cortante": "slashing", "perforante": "piercing", "contundente": "bludgeoning",
  "fuego": "fire", "frío": "cold", "veneno": "poison", "ácido": "acid",
  "relámpago": "lightning", "necrótico": "necrotic", "radiante": "radiant",
  "psíquico": "psychic", "trueno": "thunder", "fuerza": "force",
/* Estados y sus explicaciones */
  "Agarrado": "Grappled", "Apresado": "Restrained", "Asustado": "Frightened",
  "Aturdido": "Stunned", "Cegado": "Blinded", "Derribado": "Prone",
  "Encantado": "Charmed", "Ensordecido": "Deafened", "Envenenado": "Poisoned",
  "Incapacitado": "Incapacitated", "Invisible": "Invisible", "Paralizado": "Paralysed",
  "Petrificado": "Petrified", "Inconsciente": "Unconscious", "Agotamiento": "Exhaustion",
  "Concentrado": "Concentrating",
  "Velocidad 0. Termina si quien agarra queda incapacitado.": "Speed 0. Ends if the grappler is incapacitated.",
  "Velocidad 0, desventaja al atacar, ventaja para quien le ataque.": "Speed 0, disadvantage on attacks, advantage for attackers.",
  "Desventaja mientras vea la fuente del miedo. No puede acercarse a ella.": "Disadvantage while the source of fear is in sight. Can't move closer to it.",
  "Incapacitado, no se mueve, habla a duras penas. Falla salvaciones de FUE y DES.": "Incapacitated, can't move, can barely speak. Fails STR and DEX saves.",
  "Falla lo que exija vista. Desventaja al atacar, ventaja para quien le ataque.": "Fails anything needing sight. Disadvantage on attacks, advantage for attackers.",
  "Solo se arrastra. Desventaja al atacar. Ventaja al atacarle en cuerpo a cuerpo.": "Can only crawl. Disadvantage on attacks. Advantage on melee attacks against it.",
  "No puede atacar a quien le encanta; el otro tiene ventaja en trato social.": "Can't attack the charmer; the charmer has advantage on social checks.",
  "No oye y falla lo que exija oído.": "Can't hear and fails anything needing hearing.",
  "Desventaja en ataques y pruebas de característica.": "Disadvantage on attack rolls and ability checks.",
  "Sin acciones ni reacciones.": "No actions or reactions.",
  "Ventaja al atacar, desventaja para quien le ataque.": "Advantage on attacks, disadvantage for attackers.",
  "Incapacitado, inmóvil. Golpes a 5 pies son críticos.": "Incapacitated, can't move. Hits within 5 feet are critical.",
  "Convertido en piedra: incapacitado, resistente a todo el daño.": "Turned to stone: incapacitated, resistant to all damage.",
  "Derribado, incapacitado, sin conciencia de su entorno.": "Prone, incapacitated, unaware of its surroundings.",
  "Acumulativo: desventaja, velocidad reducida y peor a cada nivel.": "Cumulative: disadvantage, reduced speed and worse at each level.",
  "Al recibir daño, salvación de CON: CD 10 o la mitad del daño.": "On taking damage, CON save: DC 10 or half the damage.",

  /* Habilidades */
  "Acrobacias": "Acrobatics", "Arcanos": "Arcana", "Atletismo": "Athletics",
  "Engaño": "Deception", "Historia": "History", "Interpretación": "Performance",
  "Intimidación": "Intimidation", "Investigación": "Investigation",
  "Juego de manos": "Sleight of Hand", "Medicina": "Medicine", "Naturaleza": "Nature",
  "Percepción": "Perception", "Perspicacia": "Insight", "Persuasión": "Persuasion",
  "Religión": "Religion", "Sigilo": "Stealth", "Supervivencia": "Survival",
  "Trato con animales": "Animal Handling",
  "Percepción pasiva": "Passive Perception",

  /* Pistas de las herramientas del mapa */
  "Arrastra para mover · recuadro para elegir varias · Alt+clic para señalar":
    "Drag to move · box to select several · Alt+click to ping",
  "Arrastra de una casilla a otra para medir": "Drag from one square to another to measure",
  "Arrastra por los bordes de las casillas": "Drag along the edges of the squares",
  "Pulsa un borde: cerrada, abierta, sin puerta": "Tap an edge: closed, open, no door",
  "Pulsa un borde o un muro diagonal: cerrada, abierta, sin puerta": "Tap an edge or a diagonal wall: closed, open, no door",
  "Arrastra para quitar muros y puertas": "Drag to remove walls and doors",
  "Pulsa donde quieras clavar la nota": "Tap where you want to pin the note",
  "Pulsa donde esté la escalera": "Tap where the stairs are",
  "Pulsa para colocar; arrastra para girar": "Tap to place; drag to turn",
  "Arrastra para pintar casillas; cambia lo que la party alcanza a ver":
    "Drag to paint squares; it changes what the party can see",
  "Arrastra para dejar las casillas limpias": "Drag to wipe the squares clean",

  /* Combate */
  "Quién entra en combate": "Who joins the fight",
  "Entran estos. Quita o añade a quien quieras.": "These are in. Remove or add whoever you want.",
  "Empezar": "Start", "Sacar del combate": "Take out of the fight",
  "de la party": "in the party", "fuera de combate": "out of the fight",
  "la party aún no lo ha visto": "the party hasn't seen it yet",
  "no está en el tablero": "not on the board", "lejos de la pelea": "far from the fight",
  "La party": "The party", "Vistos antes": "Seen before",
  "Ninguno a la vista": "None in sight", "Ahora mismo no veis a ninguno.": "You can't see any right now.",
  "donde le visteis": "where you saw it", "a la vista": "in sight",
  "le toca a": "up now", "criatura": "creature",

  /* Sueltos */
  "Temp": "Temp", "Total": "Total", "vida": "hit points", "misma": "same",
  "Normal": "Normal", "Party": "Party",
  "Estás enseñando": "You're showing", "a toda la mesa": "to the whole table",
  "Puedes cambiarla o guardarla.": "You can change it or put it away.",
  "Cuando un personaje lo pisa se le lleva al otro mapa y la mesa cambia de plano.":
    "When a character steps on it they're taken to the other map, and the table changes floor plan.",
  "Enseñar a la party cuánta vida les queda a los enemigos":
    "Show the party how much life the enemies have left",
  "La vida de los enemigos": "The enemies' hit points",
  "Bendición, telaraña…": "Bless, web…",
  "Inspiración bárbara, canalizar divinidad, puntos de ki…": "Rage, Channel Divinity, ki points…",
  "1d20+5, 2d6, 8d6…": "1d20+5, 2d6, 8d6…",
  "Trampa de dardos: CD 13 de Destreza": "Dart trap: DC 13 Dexterity",
  "Salvación de Destreza": "Dexterity saving throw",
  "Espada larga": "Longsword", "1d8+3": "1d8+3", "5d8": "5d8",

  /* Armas y rasgos del bestiario de serie */
  "Cimitarra": "Scimitar", "Arco corto": "Shortbow", "Arco largo": "Longbow",
  "Ballesta ligera": "Light crossbow", "Daga": "Dagger", "Honda": "Sling",
  "Espada corta": "Shortsword", "Garrote": "Club", "Golpe": "Slam",
  "Hacha grande": "Greataxe", "Jabalina": "Javelin", "Lanza": "Spear",
  "Maza estrella": "Morningstar", "Mordisco": "Bite", "Zarpazo": "Claw",
  "Multiataque": "Multiattack", "Telaraña (recarga 5-6)": "Web (recharge 5-6)",
  "Olfato agudo": "Keen smell", "Oído y olfato agudos": "Keen hearing and smell",
  "Común, gigante": "Common, Giant", "Entiende lo que hablaba en vida": "Understands the languages it knew in life",
  "Inmune a veneno y al estado envenenado": "Immune to poison and the poisoned condition",
  "Vulnerable a contundente · inmune a veneno y al estado envenenado":
    "Vulnerable to bludgeoning · immune to poison and the poisoned condition",
  "Visión ciega 10 pies, visión en la oscuridad 60 pies": "Blindsight 10 ft., darkvision 60 ft.",
  "Agresivo — como acción adicional se mueve su velocidad hacia un enemigo visible.":
    "Aggressive — as a bonus action it moves its speed towards a visible enemy.",
  "Brutal — un dado de daño extra en los ataques cuerpo a cuerpo.":
    "Brute — one extra damage die on melee attacks.",
  "Caminar por telarañas — trepa por superficies difíciles sin tirada.":
    "Spider climb — climbs difficult surfaces without a check.",
  "Emboscador — ventaja contra criaturas sorprendidas.":
    "Surprise attack — advantage against surprised creatures.",
  "Huida ágil — se desengancha o se esconde como acción adicional.":
    "Nimble escape — disengages or hides as a bonus action.",
  "Sensibilidad a la luz solar — desventaja bajo luz solar directa.":
    "Sunlight sensitivity — disadvantage in direct sunlight.",
  "Sentido de telaraña — nota lo que toca sus telas.":
    "Web sense — knows whatever touches its webs.",
  "Tenacidad no muerta — al caer a 0 PV, salvación de Constitución CD 5 + daño para quedarse con 1 PV.":
    "Undead fortitude — on dropping to 0 HP, a DC 5 + damage Constitution save leaves it at 1 HP.",
  "Tácticas de manada — ventaja al atacar si un aliado está junto al objetivo.":
    "Pack tactics — advantage on attacks if an ally is next to the target.",
  "Ventaja marcial — una vez por turno, 2d6 de daño extra si un aliado está junto al objetivo.":
    "Martial advantage — once per turn, 2d6 extra damage if an ally is next to the target.",

  /* Ataques de área y espacios de conjuro */
  "Sin espacio": "No slot", "Sin área": "No area",
  "Espacio de conjuro que gasta": "Spell slot it spends",
  "Forma del área": "Shape of the area", "Forma del área de efecto": "Shape of the area of effect",
  "Tamaño del área en pies": "Size of the area in feet", "Tamaño del área, en pies": "Size of the area, in feet",
  "Nivel de conjuro": "Spell level", "Mis áreas": "My areas", "Quitar áreas": "Clear areas",
  "Ver un área sobre el mapa": "See an area on the map",
  "Solo lo verás tú. Colócalo donde quieras y decide; para lanzarlo de verdad, usa «Atacar» en tu ficha.":
    "Only you will see it. Put it where you like and decide; to actually cast it, use \u201cAttack\u201d on your sheet.",
  "Ninguno de tus ataques tiene área. Ponle una forma en tu ficha.":
    "None of your attacks has an area. Give one a shape on your sheet.",
  "Mueve el área y pulsa para dejarla fija": "Move the area and tap to fix it in place",
  "Si le pones un nivel, al usarlo gastará un espacio de conjuro y no te dejará lanzarlo cuando no te queden. Si le pones una forma, podrás ver su área sobre el mapa antes de decidir.":
    "Give it a level and it will spend a spell slot, and refuse to cast when you have none left. Give it a shape and you will be able to see its area on the map before deciding.",
  "Lo que apuntes aquí sale como botón para tirar en la mesa. Los ataques escritos en «Ataques y armas» o en las acciones de una criatura se detectan solos.":
    "Whatever you write here shows up as a button to roll at the table. Attacks written in \u201cAttacks and weapons\u201d or in a creature's actions are picked up on their own.",
  "Una antorcha alumbra 4 casillas; la visión en la oscuridad de un enano, 12. Los tamaños grandes ocupan más de una casilla en el mapa.":
    "A torch lights 4 squares; a dwarf's darkvision, 12. Large sizes take up more than one square on the map.",

  /* Iniciativa a mano */
  "Tirar por todos": "Roll for everyone", "Tirar solo por las criaturas": "Roll for the creatures only",
  "Tirar su iniciativa": "Roll their initiative",
  "Iniciativa. Escríbela a mano o tírala.": "Initiative. Type it by hand or roll it.",
  "Entran estos. Quita o añade a quien quieras, y escribe la iniciativa a mano o tírala.":
    "These are in. Remove or add whoever you want, and type the initiative by hand or roll it.",

  /* Pantalla de la party */
  "Ahora mismo no hay ninguna pantalla conectada.": "There's no screen connected right now.",
  "La tele entra con su propia sesión: no hereda la tuya y no puede tocar nada. Si la abres en este mismo ordenador, seguirás siendo el DM en esta ventana. Desde la tele, el botón de salir vuelve al menú.":
    "The TV joins with its own session: it doesn't inherit yours and can't touch anything. If you open it on this same computer, you'll still be the DM in this window. From the TV, the leave button goes back to the menu.",
  "Sin marcar a nadie, el mensaje lo lee toda la mesa. Lo que susurres no llega siquiera al navegador de los demás, y la pantalla de la tele nunca lo enseña.":
    "With nobody ticked, the whole table reads it. What you whisper never even reaches the others' browsers, and the TV screen never shows it.",

  /* Cómo entran los jugadores */
  "Cómo entran mis jugadores": "How my players join",
  "Que abran esta dirección en su móvil, estando en la misma red que este ordenador:":
    "Have them open this address on their phone, on the same network as this computer:",
  "Eligen «Jugador», escriben su nombre y se quedan con su personaje.":
    "They pick \u201cPlayer\u201d, type their name and claim their character.",
  "La pantalla de la party está pensada para la tele o el proyector: enseña el mapa, los turnos y el estado de todos sin destripar nada.":
    "The party screen is meant for the TV or the projector: it shows the map, the turns and how everyone is doing without giving anything away.",

  /* La mesa */
  "La mesa": "Table", "enemigos": "enemies",
  "trivial": "trivial", "fácil": "easy", "media": "medium", "difícil": "hard", "mortal": "deadly",

  /* Instalar como aplicación */
  "Instalar Mesa como aplicación": "Install Mesa as an app",
  "Mesa ya está instalada": "Mesa is installed",
  "No se encuentra el servidor de la partida. ¿Está abierta la ventana de Mesa?":
    "Can't reach the game server. Is the Mesa window still open?",
  "Para tenerla como aplicación: botón": "To keep it as an app: tap",
  "Compartir": "Share", "Añadir a pantalla de inicio": "Add to Home Screen",
  "Para instalar Mesa como aplicación en este aparato hace falta entrar por HTTPS. Mira «Instalar como aplicación» en el README.":
    "Installing Mesa as an app on this device needs HTTPS. See “Install as an app” in the README.",
  "Mesa necesita JavaScript para funcionar.": "Mesa needs JavaScript to run.",

  /* Versión de prueba */
  "Versión de prueba": "Demo version",
  "En la versión de prueba no hace falta código.": "The demo version needs no code.",
  "Todo corre en este navegador, sin servidor. Entra como": "Everything runs in this browser, no server. Join as",
  "aquí y abre la": "here and open the", "en otra pestaña o ventana: las dos juegan la misma partida y puedes proyectar esa pestaña.":
    "in another tab or window: both play the same game and you can cast that tab.",
  "En este navegador cada pestaña lleva su propia partida.": "In this browser each tab keeps its own game.",
  "Para jugar con los móviles de tus jugadores hace falta el servidor:": "To play with your players' phones you need the server:",
  "descargar Mesa": "download Mesa", "y abrir": "and run", "Abrir Mesa": "Abrir Mesa",

  /* La tele */
  "Abrir en una ventana aparte": "Open in a separate window", "Abrir en el otro monitor": "Open on the other monitor",
  "Abrir en otra pestaña": "Open in another tab",
  "Para la tele: arrastra esa ventana al monitor o al proyector, o compártela con Chromecast desde el menú del navegador (Enviar… → Enviar pestaña). Doble clic dentro la pone a pantalla completa.":
    "For the TV: drag that window to the monitor or projector, or cast it with Chromecast from the browser menu (Cast… → Cast tab). Double-click inside for full screen.",
  "Cómo de heridos están los enemigos": "How hurt the enemies are",
  "Solo se ve un monitor conectado: se abre en una ventana aparte": "Only one monitor detected: opening a separate window",
  "El navegador no ha dado permiso para ver los otros monitores": "The browser didn't allow access to the other monitors",
  "El navegador ha bloqueado la ventana emergente: permítela para este sitio": "The browser blocked the pop-up: allow it for this site",
  "en pie": "standing", "Secreto": "Secret", "En secreto: nadie más lo ve": "Secret: nobody else sees it",
  "Curar": "Heal", "Daño": "Damage", "Liberar": "Release", "Liberar personaje": "Release character",
  "Elige tu personaje": "Choose your character", "Crear mi personaje": "Create my character",
  "Quédate con uno de los que hay en la mesa o hazte el tuyo.": "Take one of the characters at the table or make your own.",
  "Quién está conectado": "Who is connected", "En la mesa": "At the table", "Desconectados": "Offline",
  "Pantalla de la mesa": "Table screen", "Sin personaje": "No character", "Nadie conectado.": "Nobody connected.",
  "Salir de la partida": "Leave the game", "Turno anterior": "Previous turn", "Añadir al combate": "Add to combat",
  "Abrir la tele o el proyector y elegir qué enseña": "Open the TV or projector and choose what it shows",
  "La dirección y el código para unirse": "The address and code to join",
  "Enseñar una imagen": "Show an image", "Un mapa del tesoro, una carta, un retrato": "A treasure map, a letter, a portrait",
  "Pedir una tirada": "Ask for a roll", "A quién, qué y con qué dificultad": "Who, what and how hard",
  "Partida": "Game", "Guardar copia": "Save a copy", "Descarga un archivo con toda la partida": "Downloads a file with the whole game",
  "Sustituye la partida por la de un archivo": "Replaces the game with one from a file",
  "Solo cambia en este aparato": "Only changes on this device", "Vuelves a la pantalla de entrada": "Back to the entry screen",
  "Una hora. Cada personaje decide cuántos dados de golpe gasta desde su ficha.": "One hour. Each character decides how many hit dice to spend from their sheet.",
  "Ocho horas. Vida, espacios de conjuro y recursos al máximo; baja un nivel de agotamiento.": "Eight hours. Hit points, spell slots and resources to full; one level of exhaustion less.",
  "Tu personaje": "Your character", "ocupado": "taken", "Escribe tu nombre para entrar.": "Type your name to join.",
  "Cómo entras": "How you join",
  "Tu DNS (el del router, el operador o el antivirus) bloquea los túneles de Cloudflare. Cambia el DNS a 1.1.1.1: la ventana del servidor explica cómo.":
    "Your DNS (router, internet provider or antivirus) blocks Cloudflare tunnels. Change your DNS to 1.1.1.1: the server window explains how.",
  "Este ordenador no consigue resolver nombres de internet: comprueba la conexión.": "This computer can't resolve internet names: check the connection.",
  "Este ordenador sí encuentra a Cloudflare, pero a cloudflared se lo impiden: suele ser el antivirus filtrando ese programa. Añade cloudflared a sus excepciones (o desactiva su protección web mientras jugáis).":
    "This computer can reach Cloudflare but cloudflared is being blocked: usually the antivirus filtering that program. Add cloudflared to its exceptions (or turn off its web protection while you play).",
  "Abriendo la dirección de internet… Vuelve a abrir esta ventana en unos segundos.": "Opening the internet address… Open this window again in a few seconds.",
  "No se ha podido abrir la dirección de internet": "Couldn't open the internet address",
  "La ventana del servidor cuenta el detalle. Mientras, se puede jugar en la misma wifi.": "The server window has the details. Meanwhile you can play on the same wifi.",
  "Falta el programa cloudflared en este ordenador.": "The cloudflared program is missing on this computer.",
  "Cloudflare limita cuántos túneles rápidos se piden seguidos. Suele bastar con esperar un minuto.": "Cloudflare limits how many quick tunnels can be requested in a row. Waiting a minute usually fixes it.",
  "No se llega a Cloudflare desde este ordenador. Suele ser el antivirus o el cortafuegos bloqueando cloudflared, una red que lo prohíbe (trabajo, universidad, residencia) o falta de conexión.": "This computer can't reach Cloudflare. Usually an antivirus or firewall blocking cloudflared, a network that forbids it (work, university, dorm) or no connection.",
  "cloudflared se ha cerrado sin dar una dirección.": "cloudflared closed without giving an address.", "Expulsar": "Kick out", "Mesa cerrada": "Table closed", "Mesa abierta": "Table open",
  "No entra nadie nuevo. Quien ya está dentro sigue jugando.": "Nobody new can join. Whoever is in keeps playing.",
  "Cualquiera con la dirección puede entrar como jugador.": "Anyone with the address can join as a player.",
  "Mesa abierta: se puede entrar": "Table open: people can join", "Mesa cerrada: no entra nadie nuevo": "Table closed: nobody new can join",
  "Desde cualquier sitio": "From anywhere", "En la misma wifi": "On the same wifi", "En la misma wifi que este ordenador": "On the same wifi as this computer",
  "Sirve desde casa de cada uno, con datos o con cualquier wifi, y se puede instalar como aplicación. Cualquiera con la dirección puede entrar: pásala solo a tu grupo, y cierra la mesa cuando estéis todos.":
    "Works from everyone's home, on mobile data or any wifi, and can be installed as an app. Anyone with the address can join: share it only with your group, and close the table once you're all in.",
  "En la entrada eligen": "At the entrance they choose",
  "Para jugar cada uno desde su casa, arranca Mesa con «Jugar por internet». Lo explica el README.": "To play from different homes, start Mesa with “Play over the internet”. The README explains it.",
  "La mesa está cerrada: solo entra el DM. Pídele que la abra.": "The table is closed: only the DM can join. Ask them to open it.",
  "La mesa está cerrada: pide al DM que la abra para entrar.": "The table is closed: ask the DM to open it so you can join.",
  "Tu sesión ha terminado: el DM te ha sacado de la mesa o la partida ha empezado de cero.": "Your session ended: the DM removed you from the table or the game restarted.",
  "Demasiados intentos con el código del DM. Espera unos minutos.": "Too many attempts with the DM code. Wait a few minutes.",
  "No puedes expulsarte a ti mismo": "You can't kick yourself out", "Mesa cerrada: no entra nadie nuevo ": "Table closed", "Crear criatura": "Create creature", "Dirige la partida": "Runs the game", "FUE": "STR", "DES": "DEX", "SAB": "WIS", "CAR": "CHA", "Copiar": "Copy", "Dirección copiada": "Address copied",
  "No se pudo copiar: selecciónala y cópiala a mano": "Couldn't copy: select it and copy it by hand",
  "Conectad los móviles a la": "Connect the phones to the", "misma wifi": "same wifi", "que este ordenador.": "as this computer.",
  "Abrid esta dirección en el navegador:": "Open this address in the browser:",
  "Hay varias redes en este ordenador: la buena suele empezar por 192.168.": "This computer has several networks: the right one usually starts with 192.168.",
  "Eligen": "They choose", ", escriben su nombre y se quedan con su personaje.": ", type their name and take their character.",
  "Desde fuera de casa, mira «Jugar sin estar en la misma casa» en el README.": "From outside home, see “Playing from different places” in the README.", "Conectado": "Connected", "Desconectado": "Disconnected", "Cantidad": "Amount", "Enviar": "Send", "Clase de armadura": "Armor class", "Velocidad (pies)": "Speed (feet)", "tirar": "roll",

  /* Cómo de herido parece un enemigo (lo escribe el servidor) */
  "Ileso": "Unhurt", "Con algún rasguño": "Scratched", "Herido": "Wounded", "Malherido": "Badly wounded",
  "Al borde de caer": "About to fall", "Fuera de combate": "Out of the fight",

  /* Clases y especies del manual: suelen escribirse tal cual en la ficha */
  "Bárbaro": "Barbarian", "Bárbara": "Barbarian", "Bardo": "Bard", "Barda": "Bard",
  "Clérigo": "Cleric", "Clériga": "Cleric", "Druida": "Druid", "Guerrero": "Fighter", "Guerrera": "Fighter",
  "Monje": "Monk", "Monja": "Monk", "Paladín": "Paladin", "Paladina": "Paladin",
  "Explorador": "Ranger", "Exploradora": "Ranger", "Pícaro": "Rogue", "Pícara": "Rogue",
  "Hechicero": "Sorcerer", "Hechicera": "Sorcerer", "Brujo": "Warlock", "Bruja": "Warlock",
  "Mago": "Wizard", "Maga": "Wizard", "Artífice": "Artificer",
  "Humano": "Human", "Humana": "Human", "Elfo": "Elf", "Elfa": "Elf", "Enano": "Dwarf", "Enana": "Dwarf",
  "Mediano": "Halfling", "Mediana": "Halfling", "Gnomo": "Gnome", "Gnoma": "Gnome",
  "Semielfo": "Half-elf", "Semielfa": "Half-elf", "Semiorco": "Half-orc", "Semiorca": "Half-orc",
  "Dracónido": "Dragonborn", "Dracónida": "Dragonborn", "Tiflin": "Tiefling", "Tiefling": "Tiefling",

  /* Mapa: muros en diagonal, salas, zonas, terreno difícil y dibujo */
  "Diagonal": "Diagonal", "Dibujar": "Draw", "Difícil": "Difficult", "Sala": "Room", "Revelar": "Reveal",
  "Ocultar": "Hide", "Trazo": "Stroke", "Todo": "All", "Lo ve la party": "Party sees it", "Color": "Colour",
  "Terreno": "Terrain", "Zonas": "Zones", "Dibujo": "Drawing",
  "Muro por los bordes de las casillas": "Wall along square edges",
  "Muro en diagonal, de esquina a esquina": "Diagonal wall, corner to corner",
  "Puerta: cerrada, abierta, sin puerta": "Door: closed, open, none",
  "Quitar muros, diagonales y puertas": "Remove walls, diagonals and doors",
  "Dibujar a mano alzada": "Freehand drawing",
  "Terreno difícil: entrar cuesta el doble de movimiento": "Difficult terrain: entering costs double movement",
  "Quitar terreno pintado y terreno difícil": "Remove painted terrain and difficult terrain",
  "Sala: al entrar, la party ve la sala entera": "Room: on entering, the party sees the whole room",
  "Revelar: la party lo ve siempre": "Reveal: the party always sees it",
  "Ocultar: la party no lo ve nunca": "Hide: the party never sees it",
  "Quitar salas y zonas reveladas u ocultas": "Remove rooms and revealed or hidden zones",
  "Si no, solo lo ves tú": "Otherwise only you see it",
  "Borrar un trazo": "Erase a stroke", "Borrar uno de tus trazos": "Erase one of your strokes",
  "Borrar todos los dibujos de este mapa": "Erase every drawing on this map",
  "¿Borrar todos los dibujos de este mapa?": "Erase every drawing on this map?",
  "Dibujar sobre el plano: lo ve toda la mesa": "Draw on the map: the whole table sees it",
  "Arrastra por las casillas: la diagonal (\\ o /) la marca dónde empiezas": "Drag across squares: where you start sets the diagonal (\\ or /)",
  "Dibuja con el ratón o el dedo; elige color y si lo ve la party": "Draw with mouse or finger; pick a colour and whether the party sees it",
  "Dibuja con el ratón o el dedo": "Draw with mouse or finger", "Pulsa un trazo para borrarlo": "Tap a stroke to erase it",
  "Pinta el terreno difícil: entrar en esas casillas cuesta el doble": "Paint difficult terrain: entering those squares costs double",
  "Pinta lo que la party verá siempre": "Paint what the party will always see",
  "Pinta lo que la party no verá nunca, aunque lo tenga delante": "Paint what the party will never see, even right in front of them",
  "Arrastra para quitar salas y zonas": "Drag to remove rooms and zones",
  "Arrastra para quitar muros y puertas": "Drag to remove walls and doors",
  "Coloca el área: pulsa para dejarla y arrastra para girarla": "Place the area: tap to drop it and drag to rotate it",

  /* Conjuros: el libro y la ventana de lanzar */
  "Conjuros": "Spells", "Característica": "Ability", "Inteligencia": "Intelligence", "Sabiduría": "Wisdom", "Carisma": "Charisma",
  "CD": "DC", "ataque": "attack", "CD fija": "Fixed DC", "Ataque fijo": "Fixed attack", "auto": "auto",
  "Espacios:": "Slots:", "Trucos": "Cantrips", "truco": "cantrip", "Lanzar": "Cast", "Quitar de la lista": "Remove from list",
  "Dificultad de las salvaciones contra tus conjuros": "DC of saves against your spells",
  "Bonificador a los ataques de conjuro": "Spell attack bonus",
  "Sin espacios de conjuro apuntados en la ficha: los trucos se lanzan igual.": "No spell slots on the sheet: cantrips can still be cast.",
  "Sin conjuros todavía": "No spells yet", "Añádelos de la biblioteca: ya saben qué hacen.": "Add them from the library: they already know what they do.",
  "Añadir de la biblioteca": "Add from library", "Biblioteca de conjuros": "Spell library", "Añadir": "Add",
  "Buscar conjuro o nivel (0 a 5)": "Search spell or level (0 to 5)", "Buscar conjuro": "Search spell",
  "Espacio": "Slot", "Objetivos": "Targets", "(los del área)": "(those in the area)",
  "Colocar el área en el mapa": "Place the area on the map", "No hay nadie a la vista en el mapa.": "Nobody in sight on the map.",
  "personaje": "character", "criatura": "creature", "concentración": "concentration", "potenciado": "upcast",
  "ataque a distancia": "ranged attack", "ataque cuerpo a cuerpo": "melee attack",
  "Ese conjuro no está en su lista": "That spell is not on their list",
  "Apunta sus espacios de conjuro en la ficha": "Set their spell slots on the sheet first",
  "Elige al menos un objetivo": "Choose at least one target",
  "Bendición": "Bless",
  "agarrado": "grappled", "apresado": "restrained", "asustado": "frightened", "aturdido": "stunned", "cegado": "blinded",
  "derribado": "prone", "encantado": "charmed", "ensordecido": "deafened", "envenenado": "poisoned", "incapacitado": "incapacitated",
  "paralizado": "paralysed", "petrificado": "petrified", "inconsciente": "unconscious",
  "contundente y frío": "bludgeoning and cold", "fuego y radiante": "fire and radiant",
  "Evocación": "Evocation", "Encantamiento": "Enchantment", "Nigromancia": "Necromancy", "Conjuración": "Conjuration",
  "Abjuración": "Abjuration", "Ilusión": "Illusion",

  /* Los conjuros de la biblioteca */
  "Rayo de fuego": "Fire Bolt", "Rayo de escarcha": "Ray of Frost", "Llama sagrada": "Sacred Flame", "Burla dañina": "Vicious Mockery",
  "Toque helado": "Chill Touch", "Descarga sobrenatural": "Eldritch Blast", "Rociada venenosa": "Poison Spray", "Salpicadura ácida": "Acid Splash",
  "Proyectil mágico": "Magic Missile", "Manos ardientes": "Burning Hands", "Ola atronadora": "Thunderwave", "Curar heridas": "Cure Wounds",
  "Palabra curativa": "Healing Word", "Saeta guía": "Guiding Bolt", "Infligir heridas": "Inflict Wounds", "Dormir": "Sleep",
  "Hechizar persona": "Charm Person", "Orden imperiosa": "Command", "Enmarañar": "Entangle", "Bendecir": "Bless",
  "Escudo de fe": "Shield of Faith", "Inmovilizar persona": "Hold Person", "Rayo abrasador": "Scorching Ray", "Telaraña": "Web",
  "Ceguera/sordera": "Blindness/Deafness", "Romper": "Shatter", "Arma espiritual": "Spiritual Weapon", "Bola de fuego": "Fireball",
  "Relámpago": "Lightning Bolt", "Miedo": "Fear", "Espíritus guardianes": "Spirit Guardians", "Palabra curativa en masa": "Mass Healing Word",
  "Revivificar": "Revivify", "Tormenta de hielo": "Ice Storm", "Destierro": "Banishment", "Cono de frío": "Cone of Cold",
  "Golpe flamígero": "Flame Strike", "Curar heridas en masa": "Mass Cure Wounds", "Inmovilizar monstruo": "Hold Monster",
  "Ataque de conjuro a distancia. Un objeto inflamable que impacte arde.": "Ranged spell attack. A flammable object it hits ignites.",
  "Ataque de conjuro a distancia. Si impacta, su velocidad baja 10 pies hasta tu próximo turno.": "Ranged spell attack. On a hit, its speed drops by 10 feet until your next turn.",
  "Salvación de Destreza o recibe el daño. No le sirve de nada estar a cubierto.": "Dexterity save or take the damage. Cover gives no benefit.",
  "Salvación de Sabiduría o recibe el daño y tiene desventaja en su próxima tirada de ataque.": "Wisdom save or take the damage and have disadvantage on its next attack roll.",
  "Ataque de conjuro a distancia. Si impacta, no puede recuperar vida hasta tu próximo turno.": "Ranged spell attack. On a hit, it can't regain hit points until your next turn.",
  "Un rayo por nivel de truco (2 a nivel 5, 3 a nivel 11, 4 a nivel 17); cada uno es un ataque.": "One beam per cantrip tier (2 at level 5, 3 at 11, 4 at 17); each is an attack.",
  "Salvación de Constitución o recibe el daño.": "Constitution save or take the damage.",
  "Una o dos criaturas a 5 pies entre sí. Salvación de Destreza o reciben el daño.": "One or two creatures within 5 feet of each other. Dexterity save or take the damage.",
  "Tres dardos que impactan siempre, uno más por cada nivel por encima del 1. Se reparten entre los objetivos.": "Three darts that always hit, one more per slot level above 1st. Split among the targets.",
  "Salvación de Destreza: daño completo si falla, la mitad si la supera.": "Dexterity save: full damage on a failure, half on a success.",
  "Salvación de Constitución: si falla, recibe el daño y sale empujada 10 pies; si la supera, la mitad.": "Constitution save: on a failure, takes the damage and is pushed 10 feet; on a success, half.",
  "Recupera 1d8 más tu característica de lanzamiento, y 1d8 más por cada nivel por encima del 1.": "Restores 1d8 plus your spellcasting modifier, and 1d8 more per slot level above 1st.",
  "Recupera 1d4 más tu característica de lanzamiento, a distancia y con una acción adicional.": "Restores 1d4 plus your spellcasting modifier, at range and as a bonus action.",
  "Ataque de conjuro a distancia. El siguiente ataque contra el objetivo tiene ventaja.": "Ranged spell attack. The next attack against the target has advantage.",
  "Ataque de conjuro cuerpo a cuerpo.": "Melee spell attack.",
  "Tira 5d8: duermen las criaturas del área de menos a más vida hasta agotar la cuenta.": "Roll 5d8: creatures in the area fall asleep, lowest hit points first, until the total runs out.",
  "Salvación de Sabiduría o queda encantada una hora. Una criatura más por cada nivel por encima del 1.": "Wisdom save or be charmed for an hour. One more creature per slot level above 1st.",
  "Salvación de Sabiduría o cumple una orden de una palabra (huye, suelta, cae, alto…).": "Wisdom save or obey a one-word command (flee, drop, grovel, halt…).",
  "obedece la orden en su próximo turno": "obeys the command on its next turn",
  "Un cuadrado de 20 pies de maleza. Salvación de Fuerza o queda apresada.": "A 20-foot square of grasping weeds. Strength save or be restrained.",
  "Hasta tres criaturas suman 1d4 a sus ataques y salvaciones.": "Up to three creatures add 1d4 to their attacks and saves.",
  "Una criatura gana +2 a la CA mientras dure.": "One creature gains +2 AC for the duration.",
  "Salvación de Sabiduría o queda paralizado. Repite la salvación al final de cada turno suyo.": "Wisdom save or be paralysed. It repeats the save at the end of each of its turns.",
  "Tres rayos, uno más por cada nivel por encima del 2. Cada uno es un ataque; se reparten entre los objetivos.": "Three rays, one more per slot level above 2nd. Each is an attack; split among the targets.",
  "Un cubo de 20 pies de telarañas. Salvación de Destreza o queda apresada.": "A 20-foot cube of webs. Dexterity save or be restrained.",
  "Salvación de Constitución o queda cegada (o ensordecida, a elegir) un minuto.": "Constitution save or be blinded (or deafened, your choice) for a minute.",
  "Esfera de 10 pies. Salvación de Constitución: completo si falla, la mitad si la supera.": "10-foot sphere. Constitution save: full damage on a failure, half on a success.",
  "Ataque de conjuro cuerpo a cuerpo con el arma flotante; se puede repetir cada turno con una acción adicional.": "Melee spell attack with the floating weapon; repeat it each turn as a bonus action.",
  "Esfera de 20 pies. Salvación de Destreza: completo si falla, la mitad si la supera.": "20-foot sphere. Dexterity save: full damage on a failure, half on a success.",
  "Línea de 100 por 5 pies. Salvación de Destreza: completo si falla, la mitad si la supera.": "100 by 5-foot line. Dexterity save: full damage on a failure, half on a success.",
  "Salvación de Sabiduría o suelta lo que lleve y queda asustada.": "Wisdom save or drop what it holds and become frightened.",
  "Daño a quien entre o empiece su turno en el área. Salvación de Sabiduría para la mitad.": "Damages whoever enters or starts its turn in the area. Wisdom save for half.",
  "Hasta seis criaturas recuperan 1d4 más tu característica de lanzamiento.": "Up to six creatures regain 1d4 plus your spellcasting modifier.",
  "Una criatura muerta en el último minuto vuelve con 1 punto de vida.": "A creature that died within the last minute returns with 1 hit point.",
  "Cilindro de 20 pies. Salvación de Destreza: completo si falla, la mitad si la supera.": "20-foot cylinder. Dexterity save: full damage on a failure, half on a success.",
  "Salvación de Carisma o desaparece mientras dure.": "Charisma save or vanish for the duration.",
  "queda desterrada a otro plano": "is banished to another plane",
  "Salvación de Constitución: completo si falla, la mitad si la supera.": "Constitution save: full damage on a failure, half on a success.",
  "Columna de 10 pies de radio. Salvación de Destreza: completo si falla, la mitad si la supera.": "10-foot-radius column. Dexterity save: full damage on a failure, half on a success.",
  "Hasta seis criaturas recuperan 3d8 más tu característica de lanzamiento.": "Up to six creatures regain 3d8 plus your spellcasting modifier.",
  "Como Inmovilizar persona, pero sirve con cualquier criatura.": "Like Hold Person, but works on any creature.",

  /* Voz */
  "Voz": "Voice", "Hablar por voz con la mesa": "Voice chat with the table", "Activar el micro": "Unmute mic",
  "Silenciar el micro": "Mute mic", "Salir de la voz": "Leave voice", "Solo tú": "Just you",
  "Estás en la voz de la mesa": "You're in the table's voice chat",
  "Sin permiso para el micro. Actívalo en el candado de la barra de direcciones.": "No microphone permission. Allow it from the padlock in the address bar.",
  "No se ha encontrado ningún micro.": "No microphone found.",
  "La voz necesita una conexión segura": "Voice needs a secure connection",
  "El navegador solo deja usar el micro en páginas seguras (https) o en el propio ordenador.": "Browsers only allow the microphone on secure pages (https) or on the computer itself.",
  "Por internet: entrad todos con el enlace https de «Jugar por internet». Funciona en todos los aparatos, también en la misma wifi.":
    "Over the internet: everyone joins with the https link from “Jugar por internet”. It works on every device, on the same wifi too.",
  "En el ordenador del DM funciona con http://localhost.": "On the DM's computer it works with http://localhost.",
  "Por la wifi, con una dirección http://192.168…, el navegador lo bloquea.": "Over wifi, with an http://192.168… address, the browser blocks it.",
  /* Accesos y pasadizos */
  "Escalera o pasadizo: a otro mapa o a otro punto de este": "Stairs or passage: to another map or another spot on this one",
  "Este mismo mapa": "This same map", "Marcar la llegada en el mapa": "Mark the arrival on the map", "Al pisarlo": "When stepped on",
  "Preguntar quién cruza (puede ir la party entera)": "Ask who goes through (the whole party can go)",
  "Cruza solo quien lo pisa": "Only whoever steps on it goes through", "Nada: solo lo marca": "Nothing: it's just a marker",
  "Si lleva a otro mapa, la mesa cambia de plano con quien cruce.": "If it leads to another map, the table switches map with whoever goes through.",
  "Marca a qué casilla de este mapa lleva": "Mark which square on this map it leads to",
  "Pulsa la casilla de llegada": "Tap the arrival square", "Pulsa en el mapa la casilla de llegada": "Tap the arrival square on the map",
  "Toda la party": "Whole party", "Todos": "Everyone", "Nadie más": "Nobody else", "Quedarse aquí": "Stay here", "Cruzar": "Go through",
  "No hay nadie más en este mapa.": "There's nobody else on this map.",
  "Ese acceso no lleva a ningún sitio": "That passage doesn't lead anywhere", "Elige quién cruza": "Choose who goes through",
  "Alguien tiene que estar sobre el acceso": "Someone has to be standing on the passage",
  "Solo cruza quien lo pisa y quien elija ir con él": "Only whoever steps on it, and those they choose, go through",
  "No hay sitio al otro lado": "There's no room on the other side",
  "Entendido": "Got it", "La pantalla no entra en la voz": "The screen doesn't join voice",
  "Esa persona no está en la voz": "That person isn't in voice chat"
};

/* Tamaños y tipos de criatura, para «Humanoide pequeño» y compañía */
const SIZES = { diminuto: "Tiny", pequeño: "Small", mediano: "Medium", grande: "Large", enorme: "Huge", gargantuesco: "Gargantuan" };
const TYPES = {
  humanoide: "humanoid", bestia: "beast", "no muerto": "undead", monstruosidad: "monstrosity", gigante: "giant",
  dragón: "dragon", aberración: "aberration", celestial: "celestial", constructo: "construct", elemental: "elemental",
  feérico: "fey", infernal: "fiend", demonio: "fiend", diablo: "fiend", planta: "plant", cieno: "ooze", criatura: "creature"
};
function creature(text) {
  const t = text.trim().toLowerCase();
  let m = t.match(/^(.+?) (diminuto|pequeño|mediano|grande|enorme|gargantuesco)(.*)$/);
  if (m && TYPES[m[1]]) return `${SIZES[m[2]]} ${TYPES[m[1]]}${m[3]}`;
  m = t.match(/^(diminuto|pequeño|mediano|grande|enorme|gargantuesco) (.+?)$/);
  if (m && TYPES[m[2]]) return `${SIZES[m[1]]} ${TYPES[m[2]]}`;
  return null;
}

/* Traduce una palabra suelta si está en el diccionario, y si no la deja igual.
   Lo usan los patrones para las partes que sí se pueden traducir. */
const word = s => EN[String(s).trim()] || s;

/* Frases con números o nombres dentro. Se aplican después del diccionario. */
/* Conjuros: «salvación de DES (mitad)», «1d8 frío», «esfera de 20 pies»… */
const SAVE_EN = { FUE: "STR", DES: "DEX", CON: "CON", INT: "INT", SAB: "WIS", CAR: "CHA" };
const ABIL_EN = { Fuerza: "Strength", Destreza: "Dexterity", "Constitución": "Constitution", Inteligencia: "Intelligence", "Sabiduría": "Wisdom", Carisma: "Charisma" };
const SHAPE_EN = { esfera: "sphere", cono: "cone", "línea": "line", cubo: "cube" };
const level = l => l === "truco" ? "cantrip" : l.replace(/^nivel (\d+)$/, "level $1");
const dmgTail = t => t ? " " + t.trim().split(" y ").map(w => word(w)).join(" and ") : "";
function spellPart(rest) {
  return rest.split(" · ").map((part, i) => {
    if (i === 0) for (const [re, out] of SPELL_PARTS) if (re.test(part)) return part.replace(re, out);
    return translateOne(part) ?? part;
  }).join(" · ");
}
/* Una línea del registro troceada por « · »: cada trozo por su lado */
const pieces = s => s.split(" · ").map(part => translateOne(part) ?? part).join(" · ");
const SPELL_PARTS = [
  [/^(\d+) ataques de conjuro (.+)$/, "$1 spell attacks $2"],
  [/^ataque de conjuro (.+)$/, "spell attack $1"],
  [/^salvación de (\S+) CD (\d+)$/, (m, a, dc) => `${ABIL_EN[a] || a} save DC ${dc}`],
  [/^(\d+) dardos que no fallan$/, "$1 darts that never miss"],
  [/^cura (.+)$/, "heals $1"],
  [/^(\d+) puntos de sueño$/, "$1 points of sleep"]
];
const PATTERNS = [
  /* Conjuros */
  [/^Conjuros de (.+)$/, "$1 · spells"],
  [/^Conjuros \((\d+)\)$/, "Spells ($1)"],
  [/^(.+) · (truco|nivel \d+)$/, (m, sp, l) => `${word(sp)} · ${level(l)}`],
  [/^Nivel (\d+)( · potenciado)?$/, (m, n, up) => `Level ${n}${up ? " · upcast" : ""}`],
  [/^Nivel (\d+) · quedan (\d+)( · potenciado)?$/, (m, n, f, up) => `Level ${n} · ${f} left${up ? " · upcast" : ""}`],
  [/^Espacios de nivel (\d+)$/, "Level $1 slots"],
  [/^(\d+) conjuros añadidos$/, "$1 spells added"],
  [/^(.+) añadido$/, (m, sp) => `${word(sp)} added`],
  [/^\(hasta (\d+)\)$/, "(up to $1)"],
  [/^No le quedan espacios de nivel (\d+)$/, "No level $1 slots left"],
  [/^CD (\d+)$/, "DC $1"],
  [/^([+-]\d+) al ataque$/, "$1 to hit"],
  [/^salvación de (FUE|DES|CON|INT|SAB|CAR)( \(mitad\))?$/, (m, a, h) => `${SAVE_EN[a]} save${h ? " (half)" : ""}`],
  [/^(\d+d\d+(?:[+-]\d+(?:d\d+)?)*)( .+)?$/, (m, d, t) => `${d}${dmgTail(t)}`],
  [/^(esfera|cono|línea|cubo) de (\d+) pies$/, (m, sh, n) => `${n}-foot ${SHAPE_EN[sh]}`],
  [/^(\d+) dardos$/, "$1 darts"],
  [/^cura (\S+)( \+ car\.)?$/, (m, d, mod) => `heals ${d}${mod ? " + mod" : ""}`],
  [/^sueño (\S+)$/, "sleep $1"],
  /* Lo que escribe el servidor al lanzar */
  [/^((?:(?! contra )[^:·])+): (salvación \d+|\d+) · (.+)$/,
    (m, who, first, rest) => `${who}: ${first.replace("salvación", "save")} · ${pieces(rest)}`],
  [/^(.+?) \((truco|nivel \d+)\)(?: sobre ([^:·]+))?(?:: (.+))?$/,
    (m, sp, l, on, rest) => `${word(sp)} (${level(l)})${on ? " on " + on : ""}${rest ? ": " + spellPart(rest) : ""}`],
  [/^(\d+) de daño( (?!y cae$)[^()]+?)?( \(la mitad si la supera\))?( y cae)?$/,
    (m, n, t, half, down) => `${n} ${dmgTail(t).trim() ? dmgTail(t).trim() + " " : ""}damage${half ? " (half on a success)" : ""}${down ? " and goes down" : ""}`],
  [/^(.+?): (\d+) de daño( (?!y cae$)[^()]+?)?( y cae)?$/,
    (m, who, n, t, down) => `${who}: ${n} ${dmgTail(t).trim() ? dmgTail(t).trim() + " " : ""}damage${down ? " and goes down" : ""}`],
  [/^(.+?): salvación (\d+)$/, "$1: save $2"],
  [/^(.+?): salvación (\d+) \((la supera|falla)\) · recibe (\d+) de daño( y cae)?$/,
    (m, who, n, r, d, down) => `${who}: save ${n} (${r === "falla" ? "fails" : "succeeds"}) · takes ${d} damage${down ? " and goes down" : ""}`],
  [/^(.+?): salvación de (\S+) CD (\d+)(?: para (.+?))?(?: · (\d+) de daño(.*))?$/,
    (m, atk, a, dc, tgt, d, t) => `${word(atk)}: ${ABIL_EN[a] || SAVE_EN[a] || a} save DC ${dc}${tgt ? " for " + tgt : ""}${d ? ` · ${d}${dmgTail(t)} damage` : ""}`],
  [/^la supera$/, "succeeds"], [/^falla$/, "fails"], [/^impacta$/, "hits"], [/^pifia$/, "fumble"], [/^¡CRÍTICO!$/, "CRITICAL!"],
  [/^queda (.+)$/, (m, c) => `now ${word(c)}`],
  [/^(.+?) resiste el sueño$/, "$1 resists the sleep"],
  [/^(.+?) se duerme$/, "$1 falls asleep"],
  [/^(.+?) se concentra en (.+)$/, (m, who, sp) => `${who} concentrates on ${word(sp)}`],
  [/^(.+?) deja de concentrarse en (.+)$/, (m, who, sp) => `${who} stops concentrating on ${word(sp)}`],
  [/^Concentrado en ([^·]+)$/, (m, sp) => `Concentrating on ${word(sp.trim())}`],
  /* Voz */
  [/^(.+): conectando…$/, "$1: connecting…"],
  [/^(.+): no se ha podido conectar$/, "$1: couldn't connect"],
  [/^No se ha podido conectar la voz con (.+)\. Puede que su red lo impida\.$/, "Couldn't connect voice with $1. Their network may be blocking it."],
  [/^(\d+) en la mesa$/, "$1 at the table"],
  [/^ronda (\d+)$/i, "round $1"],
  [/^Ronda (\d+) · turno de$/i, "Round $1 · turn of"],
  [/^después: (.+)$/, "next: $1"],
  [/^nivel (\d+)$/i, "level $1"],
  /* «Pícara Elfa nivel 3»: clase y especie sueltas y el nivel al final */
  [/^(.+?) nivel (\d+)$/i, (m, who, n) => `${who.split(" ").map(w => word(w)).join(" ")} level ${n}`],
  [/^Turno de ([^·]+)$/, "$1's turn"],
  [/^después ([^·]+)$/, "next $1"],
  [/^Concentrado en ([^·]+)$/, "Concentrating on $1"],
  [/^le habéis hecho (\d+) de daño$/, "you've dealt $1 damage"],
  [/^Lo que le queda a (.+) en este turno$/, "What $1 has left this turn"],
  [/^(.+) no tiene ningún ataque apuntado\. Añádelo en su ficha\.$/, "$1 has no attacks listed. Add one on their sheet."],
  [/^Ronda (\d+) · le toca a$/i, "Round $1 · up now"],
  [/^(\d+) en pie$/, "$1 standing"],
  [/^¿Expulsar a (.+)\? Su aparato vuelve a la entrada\.( Cierra la mesa si no quieres que vuelva a entrar\.)?$/,
    (m, who, tail) => `Kick ${who} out? Their device goes back to the entrance.${tail ? " Close the table if you don't want them back." : ""}`],
  [/^(.+) ha salido de la mesa$/, "$1 has left the table"],
  [/^Le toca a$/, "Up now:"],
  [/^Lleva a (.+)$/, "Plays $1"], [/^Llevaba a (.+)$/, "Played $1"],
  [/^Ya no llevas a (.+)\. Elige personaje para seguir\.$/, "You no longer play $1. Choose a character to continue."],
  [/^¿Liberar a (.+)\? Quien lo lleve volverá a elegir personaje\.$/, "Release $1? Whoever plays them will choose again."],
  [/^(.+) queda libre$/, "$1 is free"],
  [/^(.+) ya lo lleva (.+) en otro aparato\. Si eres tú, sal allí primero o pide al DM que lo libere\.$/,
    "$2 is already playing $1 on another device. If that's you, leave there first or ask the DM to release it."],
  [/^Ya hay alguien conectado como «(.+)»\. Elige otro nombre\.$/, "Someone is already connected as “$1”. Choose another name."],
  [/^Dado de golpe \((\d+)\)$/, "Hit die ($1)"],
  [/^(.+) \(pantalla\)$/, (m, who) => `${word(who)} (screen)`],
  [/^VD (.+) · (\d+) PX$/, "CR $1 · $2 XP"],
  [/^CA (\d+)$/, "AC $1"],
  [/^(\d+) pies · (\d+) casillas?$/, "$1 feet · $2 squares"],
  [/^(\d+) de (\d+) pies$/, "$1 of $2 feet"],
  [/^Dado de golpe \((\d+)\)$/, "Hit die ($1)"],
  [/^Ajustes de (.+)$/, "Settings · $1"],
  [/^Editar (.+)$/, "Edit $1"],
  [/^Estados de (.+)$/, "$1 · conditions"],
  [/^Ataques de (.+)$/, "$1 · attacks"],
  [/^(.+) fichas elegidas$/, "$1 tokens selected"],
  [/^Colocar en (\d+), (\d+)$/, "Place at $1, $2"],
  [/^(\d+) × (.+) al encuentro\. Pulsa una casilla del mapa para colocarlos\.$/,
    "$1 × $2 joined the fight. Tap a square on the map to place them."],

  /* Bestiario */
  [/^VD (.+) · (\d+) PX$/, "CR $1 · $2 XP"],
  [/^(.+) · CA (\d+) · (\d+) PV(?: \((.+)\))?$/,
    (m, tipo, ac, hp, dados) => `${word(tipo)} · AC ${ac} · ${hp} HP${dados ? " (" + dados + ")" : ""}`],
  [/^(.+) · (?:VD|CR) (.+) · (\d+) (?:PX|XP)$/, (m, tipo, cr, xp) => `${word(tipo)} · CR ${cr} · ${xp} XP`],
  [/^(\d+) × (.+)$/, "$1 × $2"],

  /* La línea del encuentro */
  [/^enemigos? · (\d+) PX ajustados, dificultad (trivial|fácil|media|difícil|mortal)$/,
    (m, xp, d) => `enemies · ${xp} adjusted XP, ${word(d)} difficulty`],
  [/^(\d+) personajes? · (\d+) puntos de vida en pie$/,
    (m, n, hp) => `${n} ${n === "1" ? "character" : "characters"} · ${hp} hit points still standing`],
  [/^(\d+) caídos?$/, "$1 down"],
  [/^(\d+) enemigos?$/, (m, n) => `${n} ${n === "1" ? "enemy" : "enemies"}`],

  /* Menús y títulos con un nombre dentro */
  [/^Atacar con (.+)$/, "Attack with $1"],
  [/^Ajustes de (.+)$/, "$1 · settings"],
  [/^La cámara sigue a (.+)$/, "The camera follows $1"],
  [/^La cámara de la party sigue a (.+)$/, "The party camera now follows $1"],
  [/^Apuntando a (.+)$/, "Targeting $1"],
  [/^(.+) sale del combate$/, "$1 leaves the fight"],
  [/^iniciativa (-?\d+)$/, "initiative $1"],
  [/^(.+?) — \+(-?\d+) al ataque — (.+)$/,
    (m, arma, atk, resto) => `${word(arma)} — +${atk} to hit — ${resto.replace(/\b(cortante|perforante|contundente|fuego|frío|veneno|ácido|relámpago|necrótico|radiante|psíquico|trueno|fuerza)\b/g, w => word(w))}`],
  [/^Ronda (\d+) · le toca a$/i, "Round $1 · up now"],

  /* Lo que escribe el servidor en el registro */
  [/^(.+?) recibe (\d+) de daño(?: \((.+?)\))?( y cae| y vuelve en sí)?$/,
    (m, who, n, note, tail) => `${who} takes ${n} damage${note ? " (" + note + ")" : ""}${tail === " y cae" ? " and goes down" : ""}`],
  [/^(.+?) recupera (\d+) de vida(?: \((.+?)\))?( y vuelve en sí)?$/,
    (m, who, n, note, tail) => `${who} regains ${n} hit points${note ? " (" + note + ")" : ""}${tail ? " and comes round" : ""}`],
  [/^(.+?) gana (\d+) de vida temporal$/, "$1 gains $2 temporary hit points"],
  [/^(.+?) tiene que superar una salvación de Constitución CD (\d+) o pierde la concentración en (.+)$/,
    "$1 must make a DC $2 Constitution save or lose concentration on $3"],
  [/^(.+?): se le pasa (.+)$/, "$1: $2 wears off"],
  [/^(.+?) cruzan? por (.+)$/, (m, who, p) => `${who.replace(/ y ([^,]+)$/, " and $1")} go${/ y [^,]+$/.test(who) ? "" : "es"} through ${word(p)}`],
  [/^(.+) está en (.+), que lleva a (.+)\.$/, (m, who, p, to) => `${who} is on ${p}, which leads to ${to === "otro punto de este mapa" ? "another spot on this map" : to === "otro mapa" ? "another map" : to}.`],
  [/^¿Quién va con (.+)\?$/, "Who goes with $1?"],
  [/^Sala (\d+): pinta a trazos, todo es la misma sala\. Empieza dentro de otra para seguirla, o pulsa «Sala» otra vez para una nueva$/,
    "Room $1: paint in strokes, it's all one room. Start inside another to continue it, or press “Room” again for a new one"],
  [/^Cruzar por (.+)$/, (m, p) => `Go through ${word(p)}`],
  [/^a (\d+) pies$/, "$1 feet away"],
  [/^(.+?) encuentra algo: (.+)$/, "$1 finds something: $2"],
  [/^Empieza el combate$/, "Combat begins"],
  [/^Termina el combate$/, "Combat ends"],
  [/^(.+?) retrasa su turno$/, "$1 delays their turn"],
  [/^La party toma un descanso (corto|largo)$/, (m, k) => `The party takes a ${k === "corto" ? "short" : "long"} rest`],
  [/^(.+?) pierde la concentración$/, "$1 loses concentration"],
  [/^(.+?) (cae|encaja el golpe)$/, (m, who, v) => `${who} ${v === "cae" ? "goes down" : "takes the hit"}`],
  [/^(.+?) contra (.+?): (\d+)( · .+)?$/, (m, atk, tgt, n, tail) => `${atk} against ${tgt}: ${n}${(tail || "")
    .replace("· ¡CRÍTICO!", "· CRITICAL!").replace("· impacta", "· hits").replace("· falla", "· misses")
    .replace("· pifia", "· fumble").replace(/de daño/, "damage")}`]
];

/* ---------- Aplicación ---------- */
const ATTRS = ["placeholder", "title", "aria-label"];
let working = false;
let observer = null;

function translate(text) {
  const raw = text.trim();
  if (!raw) return null;
  const whole = translateOne(raw);
  if (whole !== null) return text.replace(raw, whole);
  /* Una lista en varias líneas (quién está conectado): línea a línea */
  if (raw.includes("\n")) {
    const lines = raw.split("\n").map(l => translate(l) ?? l);
    const out = lines.join("\n");
    return out === raw ? null : text.replace(raw, out);
  }
  /* Las líneas compuestas con «·» (clase · especie · nivel, herida · daño
     hecho, ronda · quién va después) se traducen trozo a trozo. */
  if (raw.includes(" · ")) {
    let changed = false;
    const parts = raw.split(" · ").map(part => {
      const out = translateOne(part);
      if (out === null) return part;
      changed = true;
      return out;
    });
    if (changed) return text.replace(raw, parts.join(" · "));
  }
  return null;
}

/* Los párrafos de las plantillas llegan partidos en varias líneas con su
   sangría: se comparan como una sola línea para no tener que repetir cada
   frase con sus espacios exactos. */
function translateOne(raw) {
  if (EN[raw]) return EN[raw];
  const flat = raw.replace(/\s+/g, " ");
  if (EN[flat]) return EN[flat];
  for (const [re, out] of PATTERNS) {
    if (re.test(raw)) return raw.replace(re, out);
  }
  return creature(raw);
}

/* Un pequeño selector de idioma, igual en todas las vistas. */
export function langPicker() {
  const box = document.createElement("label");
  box.className = "lang-pick";
  box.innerHTML = `<span class="sr">Idioma</span>
    <select aria-label="Idioma">${LANGS.map(([c, n]) => `<option value="${c}" ${c === lang ? "selected" : ""}>${n}</option>`).join("")}</select>`;
  box.querySelector("select").addEventListener("change", e => setLang(e.target.value));
  return box;
  return null;
}

function sweep(root) {
  if (lang === "es" || !root) return;
  working = true;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const jobs = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.parentElement && n.parentElement.closest("[data-keep], textarea, .said")) continue;
    const out = translate(n.nodeValue);
    if (out !== null) jobs.push([n, out]);
  }
  jobs.forEach(([n, out]) => { n.nodeValue = out; });

  const nodes = root.nodeType === 1 ? [root, ...root.querySelectorAll("*")] : [...root.querySelectorAll("*")];
  for (const el of nodes) {
    for (const a of ATTRS) {
      const v = el.getAttribute && el.getAttribute(a);
      if (!v) continue;
      const out = translate(v);
      if (out !== null) el.setAttribute(a, out);
    }
  }
  if (observer) observer.takeRecords();
  working = false;
}

/* Se vigila el documento entero: las ventanas y los avisos se cuelgan del
   body, no de la vista. */
export function startI18n() {
  document.documentElement.lang = lang;
  observer = new MutationObserver(records => {
    if (working || lang === "es") return;
    for (const r of records) {
      /* Un título o un texto de ayuda que se cambia después de pintar */
      if (r.type === "attributes") {
        const v = r.target.getAttribute(r.attributeName);
        const out = v && translate(v);
        if (out !== null && out !== undefined && out !== v) { working = true; r.target.setAttribute(r.attributeName, out); working = false; }
        continue;
      }
      if (r.type === "characterData") { const out = translate(r.target.nodeValue); if (out !== null) { working = true; r.target.nodeValue = out; working = false; } }
      for (const node of r.addedNodes) {
        if (node.nodeType === 3) { const out = translate(node.nodeValue); if (out !== null) { working = true; node.nodeValue = out; working = false; } }
        else if (node.nodeType === 1) sweep(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  sweep(document.body);
}

/* Para los textos que se arman en JavaScript y no llegan al DOM (avisos, el
   lienzo del mapa). */
export const t = s => (lang === "en" && EN[s]) || s;
