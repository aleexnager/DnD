/* Idioma. Mesa se escribió en español; el inglés se aplica encima, sobre el
   texto ya pintado, en vez de partir cada plantilla en dos.

   Suena raro, pero es lo correcto aquí: la interfaz se repinta entera a cada
   cambio de estado, así que basta con revisar lo que aparece. Se traduce solo
   lo que coincide *exactamente* con una entrada del diccionario, de modo que
   los nombres de los personajes, lo que escribe la gente en el chat y las
   notas del DM se quedan como están. */

import { CATALOG } from "./catalog.js";

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
  "Restar vida (1 si no pones cantidad)": "Take hit points (1 if no amount)", "Curar (1 si no pones cantidad)": "Heal (1 if no amount)",
  "Estados": "Conditions", "Atacar": "Attack", "Apuntar con los ataques": "Target with attacks", "Dejar de apuntarle": "Stop targeting",
  "Tirar un ataque": "Roll an attack", "Iniciativa": "Initiative", "Velocidad": "Speed",
  "Concentrado en": "Concentrating on", "Agotamiento": "Exhaustion", "Inspiración": "Inspiration",
  "En el mapa": "On the map", "Tirar la salvación de concentración": "Roll the concentration save",
  "Salvación…": "Saving throw…", "Habilidad…": "Skill check…", "Salvaciones": "Saving throws",
  "Habilidades": "Skills", "Éxitos": "Successes", "Fallos": "Failures",
  "Tirar salvación de muerte": "Roll a death save", "Salvación de muerte": "Death save",
  "Salvación de concentración": "Concentration save", "Tirar iniciativa": "Roll initiative",
  "Sentidos": "Senses", "Idiomas": "Languages", "Resistencias": "Resistances", "Rasgos": "Traits",
  "Acciones": "Actions", "Ataques": "Attacks", "Conjuros": "Spells", "Equipo": "Inventory", "Notas": "Notes",
  "Daño": "Damage", "Curación": "Healing", "Temp": "Temp", "CA": "AC", "PV": "HP", "Editar": "Edit",
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
  "Encajar cuadrícula con el plano": "Match the grid to the floor plan",
  "Encajar la cuadrícula con el plano": "Match the grid to the floor plan",
  "Buscando la cuadrícula del plano…": "Looking for the floor plan's grid…",
  "Ver a tamaño real": "Actual size", "Casillas cuadradas": "Square cells",
  "Casilla, ancho (px)": "Cell width (px)", "Casilla, alto (px)": "Cell height (px)",
  "Primera línea X (px)": "First line X (px)", "Primera línea Y (px)": "First line Y (px)",
  "Casilla a la mitad": "Halve the cell", "Casilla al doble": "Double the cell", "Buscar otra vez": "Search again",
  "Estirar sin encajar": "Stretch without matching",
  "Muros y puertas del plano": "Floor plan walls and doors",
  "Buscando muros y puertas en el plano…": "Looking for walls and doors on the floor plan…",
  "Sensibilidad": "Sensitivity", "Menos muros": "Fewer walls", "Más muros": "More walls",
  "Muro en diagonal": "Diagonal wall", "Diagonal o muro libre": "Diagonal or freehand wall", "Enseñar con este plano": "Teach with this floor plan",
  "Olvidar lo aprendido": "Forget what was learned", "Olvidar": "Forget",
  "Lo aprendido para proponer muros": "What wall proposals have learned", "Exportar": "Export", "Importar": "Import", "Muro libre": "Freehand wall", "Muros libres": "Freehand walls",
  "Traza la pared como un dibujo (con Mayúsculas, recta). Puerta y Borrar valen igual": "Draw the wall like a sketch (Shift for a straight line). Door and Erase work the same", "Ahora no": "Not now", "Poner muros y puertas": "Place walls and doors",
  "Sustituirlos por los propuestos": "Replace them with the proposed ones",
  "Añadir los propuestos y dejar los que hay": "Add the proposed ones and keep the current ones",
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
  "Muro: por los bordes, recto; desde el centro de una casilla, en diagonal": "Wall: along edges for straight, from a square's centre for diagonal",
  "Puerta, recta o en diagonal: se abre y se cierra": "Door, straight or diagonal: opens and closes",
  "Arrastra por los bordes para un muro recto, o empieza en el centro de una casilla para uno en diagonal": "Drag along edges for a straight wall, or start in a square's centre for a diagonal one",
  "Pulsa un borde para una puerta recta, o el centro de una casilla para una en diagonal. Otra pulsación la abre o la cierra; para quitarla, Borrar": "Tap an edge for a straight door, or a square's centre for a diagonal one. Tap again to open or close it; to remove it, Erase",
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
  "Ocho horas. Vida, dados de golpe, espacios de conjuro y recursos al máximo; baja un nivel de agotamiento.": "Eight hours. Hit points, hit dice, spell slots and resources to full; one level of exhaustion less.",
  "Descanso largo: la party recupera toda la vida, todos los dados de golpe, los espacios de conjuro y los recursos, y baja un nivel de agotamiento. Los monstruos no se enteran.": "Long rest: the party regains all hit points, all hit dice, spell slots and resources, and loses one level of exhaustion. Monsters are unaffected.",
  "No le quedan dados de golpe": "No hit dice left",
  /* Editor del bestiario, ficha de 2024 */
  "Añadir acción adicional": "Add bonus action", "Añadir acción legendaria": "Add legendary action", "Añadir reacción": "Add reaction",
  "Bonificador por competencia": "Proficiency bonus", "Iniciativa (en blanco: la de Destreza)": "Initiative (blank: from Dexterity)",
  "Velocidad a pie (pies)": "Walking speed (feet)", "Velocidades (texto)": "Speeds (text)",
  "Competente en las salvaciones de": "Proficient in saving throws of",
  "Desencadenante: le impacta un ataque cuerpo a cuerpo. Respuesta: +2 a la CA.": "Trigger: a melee attack hits it. Response: +2 AC.",
  "Un ataque se escribe así para poder tirarlo: «+4 al ataque — 1d6+2 cortante · alcance 5 pies», y una salvación, «CD 13 de Destreza — … Fallo: 6d6 fuego».": "Write an attack like this so it can be rolled: «+4 al ataque — 1d6+2 cortante · alcance 5 pies», and a save, «CD 13 de Destreza — … Fallo: 6d6 fuego».",
  /* La hoja de personaje de 2024 (los rótulos de la hoja oficial en inglés) */
  "Nombre del personaje": "Character Name", "Subclase": "Subclass", "PX": "XP", "Máx.": "Max", "Dados de golpe": "Hit Dice",
  "Gastados": "Spent", "Salvaciones contra muerte": "Death Saves", "Hoja de personaje": "Character Sheet",
  "Puntuación": "Score", "Tirada de salvación": "Saving Throw", "Inspiración heroica": "Heroic Inspiration",
  "Entrenamiento y competencias con equipo": "Equipment Training & Proficiencies", "Entrenamiento con armaduras": "Armor Training",
  "Medias": "Medium", "Pesadas": "Heavy", "Escudos": "Shields", "Armas": "Weapons",
  "Armas y trucos de daño": "Weapons & Damage Cantrips", "Bonif. atq./CD": "Atk Bonus / DC", "Daño y tipo": "Damage & Type",
  "Rasgos de clase": "Class Features", "Atributos de especie": "Species Traits", "Dotes": "Feats",
  "Añadir arma o ataque": "Add weapon or attack", "Usos y recursos": "Uses and resources", "Añadir atributo": "Add trait", "Añadir dote": "Add feat",
  "Aptitud mágica": "Spellcasting Ability", "Modificador por aptitud mágica": "Spellcasting Modifier",
  "CD de salvación de conjuros": "Spell Save DC", "Bonificador de ataque de conjuros": "Spell Attack Bonus",
  "Trucos y conjuros preparados": "Cantrips & Prepared Spells", "Tiempo de lanzamiento": "Casting Time", "C · R · M": "C · R · M",
  "Concentración, ritual y material necesario": "Concentration, Ritual & Required Material",
  "Aspecto": "Appearance", "Historia y personalidad": "Backstory & Personality", "Sintonización con objetos mágicos": "Magic Item Attunement",
  "Sintonizado": "Attuned", "Monedas": "Coins", "Eq.": "Eq.", "Total": "Total",
  "PC": "CP", "PP": "SP", "PE": "EP", "PO": "GP", "PPT": "PP",
  "Piezas de cobre": "Copper pieces", "Piezas de plata": "Silver pieces", "Piezas de electro": "Electrum pieces", "Piezas de oro": "Gold pieces", "Piezas de platino": "Platinum pieces",
  "Sin conjuros todavía. Añádelos de la biblioteca o crea uno.": "No spells yet. Add them from the library or create one.",
  "En blanco: la de Destreza": "Blank: from Dexterity", "En blanco: 8 + competencia + modificador": "Blank: 8 + proficiency + modifier",
  "En blanco: competencia + modificador": "Blank: proficiency + modifier",
  "+5 o CD 13 DES": "+5 or CD 13 DES", "Bonificador al ataque o CD": "Attack bonus or DC", "Notas: alcance": "Notes: range",
  "Espacio de conjuro y área": "Spell slot and area", "Furia, ki, canalizar divinidad…": "Rage, ki, channel divinity…", "Recurso": "Resource",
  "Retocar este conjuro": "Edit this spell", "Sale de la tabla de conjuros": "Comes from the spell table",
  "Lo de esta franja es de la mesa: el retrato, el color en el tablero y lo que ve y alcanza en el mapa (una antorcha alumbra 4 casillas; la visión en la oscuridad de un enano, 12).":
    "This strip belongs to the table: the portrait, the colour on the board and what the character sees and reaches on the map (a torch lights 4 squares; a dwarf's darkvision, 12).",
  "Concentración": "Concentration",
  /* Dados 3D */
  "¡Crítico!": "Critical!", "Pifia": "Fumble", "Dados de los jugadores solo en la tele": "Players' dice only on the TV",
  "No te saltan en tu pantalla": "They don't pop up on your screen",
  "Los dados 3D de los jugadores solo salen en la pantalla de la mesa": "Players' 3D dice only show on the table screen",
  /* Indicadores de ataques y conjuros */
  "Cuerpo a cuerpo": "Melee", "Personal": "Self", "Hay que tocar al objetivo": "You must touch the target",
  "Sale de quien lo lanza": "Originates from the caster", "Impacta": "Hits", "Cura": "Heals", "Sueño": "Sleep",
  "Invoca": "Summons", "Conc.": "Conc.", "Pide concentración": "Requires concentration",
  "Recupera puntos de golpe": "Restores hit points", "Duerme a las criaturas": "Puts creatures to sleep",
  /* Editor de conjuros */
  "Componentes": "Components", "Crea o invoca algo que se queda en el tablero": "Creates or summons something that stays on the board",
  "Suma la característica de lanzamiento al daño (como Arma espiritual)": "Adds the spellcasting modifier to damage (like Spiritual Weapon)",
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
  /* Conjuros de la biblioteca, reglas de 2024 */
  "Ataque de conjuro a distancia contra una criatura u objeto. Un objeto inflamable que impacte y que nadie lleve puesto ni cargue empieza a arder. Sube 1d10 a los niveles 5, 11 y 17.": "Ranged spell attack against a creature or object. A flammable object it hits that isn't worn or carried starts burning. Increases by 1d10 at levels 5, 11 and 17.",
  "Toque": "Touch",
  "Instantáneo": "Instantaneous", "1 asalto": "1 round", "1 minuto": "1 minute", "1 hora": "1 hour",
  "Acción adicional": "Bonus Action", "Concentración, hasta 1 minuto": "Concentration, up to 1 minute",
  "Concentración, hasta 10 minutos": "Concentration, up to 10 minutes", "Concentración, hasta 1 hora": "Concentration, up to 1 hour",
  "Transmutación": "Transmutation",
  "Personal (cono de 15 pies)": "Self (15-foot cone)", "Personal (cubo de 15 pies)": "Self (15-foot cube)",
  "Personal (línea de 100 pies)": "Self (100-foot line)", "Personal (cono de 30 pies)": "Self (30-foot cone)",
  "Personal (emanación de 15 pies)": "Self (15-foot emanation)", "Personal (cono de 60 pies)": "Self (60-foot cone)",
  "Ataque de conjuro a distancia. Si impacta, su velocidad baja 10 pies hasta el principio de tu siguiente turno. Sube 1d8 a los niveles 5, 11 y 17.": "Ranged spell attack. On a hit, its speed drops by 10 feet until the start of your next turn. Increases by 1d8 at levels 5, 11 and 17.",
  "Una criatura que veas hace una salvación de Destreza o recibe el daño. La cobertura media o de tres cuartos no le sirve. Sube 1d8 a los niveles 5, 11 y 17.": "A creature you can see makes a Dexterity save or takes the damage. Half and three-quarters cover give no benefit. Increases by 1d8 at levels 5, 11 and 17.",
  "Una criatura que veas u oigas hace una salvación de Sabiduría o recibe el daño y tiene desventaja en la próxima tirada de ataque que haga antes del final de su siguiente turno. Sube 1d6 a los niveles 5, 11 y 17.": "A creature you can see or hear makes a Wisdom save or takes the damage and has disadvantage on the next attack roll it makes before the end of its next turn. Increases by 1d6 at levels 5, 11 and 17.",
  "desventaja en su próxima tirada de ataque antes del final de su siguiente turno": "disadvantage on its next attack roll before the end of its next turn",
  "Ataque de conjuro cuerpo a cuerpo contra un objetivo a tu alcance. Si impacta, no puede recuperar puntos de golpe hasta el final de tu siguiente turno. Sube 1d10 a los niveles 5, 11 y 17.": "Melee spell attack against a target within reach. On a hit, it can't regain hit points until the end of your next turn. Increases by 1d10 at levels 5, 11 and 17.",
  "Ataque de conjuro a distancia contra una criatura u objeto. Crea dos rayos a nivel 5, tres a nivel 11 y cuatro a nivel 17, contra el mismo objetivo o contra varios, con una tirada de ataque por rayo.": "Ranged spell attack against a creature or object. Two beams at level 5, three at 11 and four at 17, at the same target or different ones, with one attack roll per beam.",
  "Ataque de conjuro a distancia con una niebla tóxica. Sube 1d12 a los niveles 5, 11 y 17.": "Ranged spell attack with a toxic mist. Increases by 1d12 at levels 5, 11 and 17.",
  "Una burbuja de ácido estalla en una esfera de 5 pies de radio: cada criatura dentro hace una salvación de Destreza o recibe el daño. Sube 1d6 a los niveles 5, 11 y 17.": "A bubble of acid bursts in a 5-foot-radius sphere: each creature inside makes a Dexterity save or takes the damage. Increases by 1d6 at levels 5, 11 and 17.",
  "Tres dardos de fuerza que impactan siempre a criaturas que veas, todos a la vez y repartidos como quieras. Un dardo más por cada nivel de espacio por encima del 1.": "Three force darts that always hit creatures you can see, all at once and split as you like. One more dart per slot level above 1st.",
  "Cada criatura en un cono de 15 pies hace una salvación de Destreza: daño completo si falla, la mitad si la supera. Los objetos inflamables del cono que nadie lleve empiezan a arder. +1d6 por nivel de espacio por encima del 1.": "Each creature in a 15-foot cone makes a Dexterity save: full damage on a failure, half on a success. Flammable objects in the cone that aren't worn or carried start burning. +1d6 per slot level above 1st.",
  "Cada criatura en un cubo de 15 pies que sale de ti hace una salvación de Constitución: si falla, recibe el daño y sale empujada 10 pies; si la supera, solo la mitad del daño. Los objetos sueltos también salen empujados y el estruendo se oye a 300 pies. +1d8 por nivel de espacio por encima del 1.": "Each creature in a 15-foot cube originating from you makes a Constitution save: on a failure, it takes the damage and is pushed 10 feet; on a success, only half the damage. Loose objects are pushed too and the boom is heard 300 feet away. +1d8 per slot level above 1st.",
  "sale empujada 10 pies": "is pushed 10 feet",
  "Una criatura que toques recupera 2d8 más tu modificador de característica de lanzamiento. +2d8 por nivel de espacio por encima del 1.": "A creature you touch regains 2d8 plus your spellcasting modifier. +2d8 per slot level above 1st.",
  "Una criatura que veas recupera 2d4 más tu modificador de característica de lanzamiento. +2d4 por nivel de espacio por encima del 1.": "A creature you can see regains 2d4 plus your spellcasting modifier. +2d4 per slot level above 1st.",
  "Ataque de conjuro a distancia. Si impacta, la siguiente tirada de ataque contra el objetivo antes del final de tu siguiente turno tiene ventaja. +1d6 por nivel de espacio por encima del 1.": "Ranged spell attack. On a hit, the next attack roll against the target before the end of your next turn has advantage. +1d6 per slot level above 1st.",
  "Una criatura que toques hace una salvación de Constitución: daño completo si falla, la mitad si la supera. +1d10 por nivel de espacio por encima del 1.": "A creature you touch makes a Constitution save: full damage on a failure, half on a success. +1d10 per slot level above 1st.",
  "Cada criatura que elijas en una esfera de 5 pies de radio hace una salvación de Sabiduría o queda incapacitada hasta el final de su siguiente turno; entonces repite la salvación y, si falla, queda inconsciente mientras dure. Termina en ella si recibe daño o alguien a 5 pies la despierta con una acción. Quien no duerme (como los elfos) o es inmune al agotamiento la supera sin tirar.": "Each creature you choose in a 5-foot-radius sphere makes a Wisdom save or is incapacitated until the end of its next turn; then it repeats the save and, on a failure, falls unconscious for the duration. It ends on a creature that takes damage or that someone within 5 feet wakes with an action. Creatures that don't sleep (like elves) or are immune to exhaustion succeed automatically.",
  "al final de su siguiente turno repite la salvación; si vuelve a fallar, queda inconsciente mientras dure": "at the end of its next turn it repeats the save; if it fails again, it falls unconscious for the duration",
  "V, S, M (un pellizco de arena o pétalos de rosa)": "V, S, M (a pinch of sand or rose petals)",
  "Un humanoide que veas hace una salvación de Sabiduría, con ventaja si tú o tus aliados estáis luchando contra él. Si falla, queda encantado hasta que acabe o hasta que le hagáis daño, y es amistoso contigo. Al acabar sabe que lo encantaste. Un objetivo más por nivel de espacio por encima del 1.": "A humanoid you can see makes a Wisdom save, with advantage if you or your allies are fighting it. On a failure, it is charmed until the spell ends or you damage it, and it is friendly to you. When it ends, it knows you charmed it. One more target per slot level above 1st.",
  "Una criatura que veas hace una salvación de Sabiduría o cumple en su siguiente turno una orden de una palabra: Acércate (va hacia ti por la ruta más directa), Suelta (suelta lo que lleva y acaba el turno), Huye (se aleja de ti lo más rápido que pueda), Al suelo (queda derribada y acaba el turno) o Alto (no se mueve ni hace acciones ni acciones adicionales). Una criatura más por nivel de espacio por encima del 1.": "A creature you can see makes a Wisdom save or follows a one-word command on its next turn: Approach (moves toward you by the most direct route), Drop (drops what it holds and ends its turn), Flee (moves away from you as fast as it can), Grovel (falls prone and ends its turn) or Halt (doesn't move or take actions or bonus actions). One more creature per slot level above 1st.",
  "obedece la orden en su siguiente turno": "obeys the command on its next turn",
  "Brotan plantas en un cuadrado de 20 pies que se vuelve terreno difícil. Cada criatura dentro al lanzarlo (salvo tú) hace una salvación de Fuerza o queda apresada mientras dure. Con una acción puede hacer una prueba de Fuerza (Atletismo) contra tu CD de conjuros para soltarse.": "Grasping plants sprout in a 20-foot square that becomes difficult terrain. Each creature inside when you cast it (other than you) makes a Strength save or is restrained for the duration. As an action it can make a Strength (Athletics) check against your spell save DC to break free.",
  "Hasta tres criaturas suman 1d4 a sus tiradas de ataque y salvaciones mientras dure. Un objetivo más por nivel de espacio por encima del 1.": "Up to three creatures add 1d4 to their attack rolls and saving throws for the duration. One more target per slot level above 1st.",
  "V, S, M (un símbolo sagrado de 5 po o más)": "V, S, M (a holy symbol worth 5+ GP)",
  "Una criatura que elijas gana +2 a la CA mientras dure.": "A creature of your choice gains +2 AC for the duration.",
  "V, S, M (un pergamino con una plegaria)": "V, S, M (a prayer scroll)",
  "Un humanoide que veas hace una salvación de Sabiduría o queda paralizado mientras dure. Al final de cada uno de sus turnos repite la salvación y, si la supera, se libra. Un humanoide más por nivel de espacio por encima del 2.": "A humanoid you can see makes a Wisdom save or is paralysed for the duration. At the end of each of its turns it repeats the save, ending the effect on a success. One more humanoid per slot level above 2nd.",
  "V, S, M (una pieza recta de hierro)": "V, S, M (a straight piece of iron)",
  "Tres rayos contra uno o varios objetivos, con un ataque de conjuro a distancia por rayo. Un rayo más por nivel de espacio por encima del 2.": "Three rays at one or more targets, with a ranged spell attack per ray. One more ray per slot level above 2nd.",
  "Un cubo de 20 pies de telarañas: terreno difícil y poco oscuro. Si no está anclada entre dos superficies o sobre una, se desploma al principio de tu siguiente turno. La primera vez en un turno que una criatura entra o empieza su turno en ella, hace una salvación de Destreza o queda apresada mientras siga dentro; con una acción y una prueba de Fuerza (Atletismo) contra tu CD se suelta. Arde: cada cubo de 5 pies expuesto al fuego se quema en un asalto y hace 2d4 fuego a quien empiece el turno allí.": "A 20-foot cube of webs: difficult terrain and lightly obscured. If it isn't anchored between two surfaces or layered over one, it collapses at the start of your next turn. The first time on a turn a creature enters it or starts its turn there, it makes a Dexterity save or is restrained while in the webs; an action and a Strength (Athletics) check against your DC frees it. It burns: each 5-foot cube exposed to fire burns away in a round, dealing 2d4 fire to anyone starting its turn there.",
  "V, S, M (un trozo de telaraña)": "V, S, M (a bit of spiderweb)",
  "Una criatura que veas hace una salvación de Constitución o queda cegada o ensordecida (a tu elección) mientras dure. Al final de cada uno de sus turnos repite la salvación y, si la supera, se libra. Un objetivo más por nivel de espacio por encima del 2.": "A creature you can see makes a Constitution save or is blinded or deafened (your choice) for the duration. At the end of each of its turns it repeats the save, ending the effect on a success. One more target per slot level above 2nd.",
  "Cada criatura en una esfera de 10 pies de radio hace una salvación de Constitución: daño completo si falla, la mitad si la supera. Los constructos tienen desventaja. Los objetos no mágicos que nadie lleve también reciben el daño. +1d8 por nivel de espacio por encima del 2.": "Each creature in a 10-foot-radius sphere makes a Constitution save: full damage on a failure, half on a success. Constructs have disadvantage. Nonmagical objects that aren't worn or carried take the damage too. +1d8 per slot level above 2nd.",
  "V, S, M (una lasca de mica)": "V, S, M (a chip of mica)",
  "Creas una fuerza espectral con forma de arma que flota a tu elección y haces un ataque de conjuro cuerpo a cuerpo contra una criatura a 5 pies de ella: 1d8 más tu modificador de característica de lanzamiento de daño de fuerza. En tus turnos siguientes, con una acción adicional la mueves hasta 20 pies y repites el ataque. +1d8 por nivel de espacio por encima del 2.": "You create a floating spectral force shaped like a weapon and make a melee spell attack against a creature within 5 feet of it: 1d8 plus your spellcasting modifier force damage. On later turns, as a bonus action you move it up to 20 feet and repeat the attack. +1d8 per slot level above 2nd.",
  "Cada criatura en una esfera de 20 pies de radio hace una salvación de Destreza: daño completo si falla, la mitad si la supera. Los objetos inflamables que nadie lleve empiezan a arder. +1d6 por nivel de espacio por encima del 3.": "Each creature in a 20-foot-radius sphere makes a Dexterity save: full damage on a failure, half on a success. Flammable objects that aren't worn or carried start burning. +1d6 per slot level above 3rd.",
  "V, S, M (una bola de guano de murciélago y azufre)": "V, S, M (a ball of bat guano and sulfur)",
  "Cada criatura en una línea de 100 pies de largo y 5 de ancho hace una salvación de Destreza: daño completo si falla, la mitad si la supera. +1d6 por nivel de espacio por encima del 3.": "Each creature in a 100-foot-long, 5-foot-wide line makes a Dexterity save: full damage on a failure, half on a success. +1d6 per slot level above 3rd.",
  "V, S, M (un poco de pelaje y una varilla de cristal)": "V, S, M (a bit of fur and a crystal rod)",
  "Cada criatura en un cono de 30 pies hace una salvación de Sabiduría o suelta lo que lleve y queda asustada mientras dure: en cada turno usa la acción de Correr para alejarse de ti por la ruta más segura. Si acaba su turno sin línea de visión hacia ti, repite la salvación y, si la supera, se libra.": "Each creature in a 30-foot cone makes a Wisdom save or drops what it holds and is frightened for the duration: on each turn it takes the Dash action to move away from you by the safest route. If it ends its turn without line of sight to you, it repeats the save, ending the effect on a success.",
  "suelta lo que lleve y huye de ti con la acción de Correr": "drops what it holds and flees from you with the Dash action",
  "V, S, M (una pluma blanca)": "V, S, M (a white feather)",
  "Espíritus en una emanación de 15 pies alrededor de ti. Las criaturas que no excluyas tienen la velocidad a la mitad dentro y, cuando la emanación entra en su espacio o ellas entran o acaban el turno dentro, hacen una salvación de Sabiduría (una vez por turno): 3d8 radiante (necrótico si eres malvado) si fallan, la mitad si la superan. +1d8 por nivel de espacio por encima del 3.": "Spirits fill a 15-foot emanation around you. Creatures you don't exclude have their speed halved inside and, when the emanation enters their space or they enter or end their turn inside, make a Wisdom save (once per turn): 3d8 radiant (necrotic if you're evil) on a failure, half on a success. +1d8 per slot level above 3rd.",
  "Hasta seis criaturas que veas recuperan 2d4 más tu modificador de característica de lanzamiento. +1d4 por nivel de espacio por encima del 3.": "Up to six creatures you can see regain 2d4 plus your spellcasting modifier. +1d4 per slot level above 3rd.",
  "Una criatura que haya muerto en el último minuto revive con 1 punto de golpe. No sirve si murió de vejez ni devuelve partes del cuerpo perdidas.": "A creature that died within the last minute returns to life with 1 hit point. It doesn't work on death from old age and doesn't restore missing body parts.",
  "V, S, M (un diamante de 300 po o más, que se consume)": "V, S, M (a diamond worth 300+ GP, which the spell consumes)",
  "Granizo en un cilindro de 20 pies de radio y 40 de alto: cada criatura dentro hace una salvación de Destreza; si falla, 2d10 contundente y 4d6 frío, y si la supera, la mitad. El suelo es terreno difícil hasta el final de tu siguiente turno. El daño contundente sube 1d10 por nivel de espacio por encima del 4.": "Hail in a 20-foot-radius, 40-foot-high cylinder: each creature inside makes a Dexterity save; on a failure, 2d10 bludgeoning and 4d6 cold, on a success half. The ground is difficult terrain until the end of your next turn. The bludgeoning damage increases by 1d10 per slot level above 4th.",
  "V, S, M (una manopla)": "V, S, M (a mitten)",
  "Una criatura que veas hace una salvación de Carisma o va a un semiplano inofensivo mientras dure, donde está incapacitada. Al acabar vuelve a su sitio, salvo que sea una aberración, un celestial, un elemental, un feérico o un infernal y el conjuro dure el minuto entero: entonces va a un plano de su tipo. Un objetivo más por nivel de espacio por encima del 4.": "A creature you can see makes a Charisma save or is sent to a harmless demiplane for the duration, where it is incapacitated. When it ends it returns to its place, unless it is an aberration, celestial, elemental, fey or fiend and the spell lasted the full minute: then it goes to a plane of its kind. One more target per slot level above 4th.",
  "queda desterrada a un semiplano inofensivo": "is banished to a harmless demiplane",
  "V, S, M (un pentáculo)": "V, S, M (a pentacle)",
  "Cada criatura en un cono de 60 pies hace una salvación de Constitución: daño completo si falla, la mitad si la supera. Quien muera por él se convierte en una estatua helada hasta que se descongele. +1d8 por nivel de espacio por encima del 5.": "Each creature in a 60-foot cone makes a Constitution save: full damage on a failure, half on a success. A creature killed by it becomes a frozen statue until it thaws. +1d8 per slot level above 5th.",
  "V, S, M (un pequeño cono de cristal o vidrio)": "V, S, M (a small crystal or glass cone)",
  "Una columna de fuego en un cilindro de 10 pies de radio y 40 de alto: cada criatura dentro hace una salvación de Destreza; si falla, 5d6 fuego y 5d6 radiante, y si la supera, la mitad. Cada uno de los dos daños sube 1d6 por nivel de espacio por encima del 5.": "A column of fire in a 10-foot-radius, 40-foot-high cylinder: each creature inside makes a Dexterity save; on a failure, 5d6 fire and 5d6 radiant, on a success half. Each of the two damages increases by 1d6 per slot level above 5th.",
  "V, S, M (un pellizco de azufre)": "V, S, M (a pinch of sulfur)",
  "Elige hasta seis criaturas en una esfera de 30 pies de radio: cada una recupera 5d8 más tu modificador de característica de lanzamiento. +1d8 por nivel de espacio por encima del 5.": "Choose up to six creatures in a 30-foot-radius sphere: each regains 5d8 plus your spellcasting modifier. +1d8 per slot level above 5th.",
  "Una criatura que veas hace una salvación de Sabiduría o queda paralizada mientras dure. Al final de cada uno de sus turnos repite la salvación y, si la supera, se libra. Un objetivo más por nivel de espacio por encima del 5.": "A creature you can see makes a Wisdom save or is paralysed for the duration. At the end of each of its turns it repeats the save, ending the effect on a success. One more target per slot level above 5th.",
  /* Estados, con el texto de 2024 */
  "Velocidad 0. Desventaja al atacar a cualquiera que no sea quien le agarra. Quien le agarra puede moverlo.": "Speed 0. Disadvantage on attacks against anyone but the grappler. The grappler can drag it.",
  "Velocidad 0. Sus ataques con desventaja y los que recibe con ventaja. Desventaja en las salvaciones de DES.": "Speed 0. Its attacks have disadvantage and attacks against it have advantage. Disadvantage on DEX saves.",
  "Desventaja en pruebas y ataques mientras vea la fuente del miedo. No puede acercarse a ella por voluntad propia.": "Disadvantage on checks and attacks while it can see the source of fear. It can't willingly move closer to it.",
  "Incapacitado. Falla las salvaciones de FUE y DES. Los ataques contra él tienen ventaja.": "Incapacitated. Fails STR and DEX saves. Attacks against it have advantage.",
  "No ve: falla lo que exija vista. Sus ataques con desventaja y los que recibe con ventaja.": "Can't see: fails anything that needs sight. Its attacks have disadvantage and attacks against it have advantage.",
  "Se arrastra o se levanta gastando la mitad de su velocidad. Desventaja al atacar. Contra él, ventaja a 5 pies y desventaja más lejos.": "Crawls, or stands up using half its speed. Disadvantage on attacks. Against it: advantage within 5 feet, disadvantage farther away.",
  "No puede atacar ni dañar a quien le encanta, que tiene ventaja en las pruebas sociales con él.": "Can't attack or harm the charmer, who has advantage on social checks with it.",
  "Desventaja en las tiradas de ataque y en las pruebas de característica.": "Disadvantage on attack rolls and ability checks.",
  "Sin acciones, acciones adicionales ni reacciones. No se concentra ni habla. Iniciativa con desventaja.": "No actions, bonus actions or reactions. Can't concentrate or speak. Disadvantage on initiative.",
  "Ventaja en la iniciativa. Sus ataques con ventaja y los que recibe con desventaja, salvo que le vean.": "Advantage on initiative. Its attacks have advantage and attacks against it disadvantage, unless it can be seen.",
  "Incapacitado y velocidad 0. Falla las salvaciones de FUE y DES. Ataques con ventaja; a 5 pies, críticos.": "Incapacitated and speed 0. Fails STR and DEX saves. Attacks have advantage; within 5 feet, they crit.",
  "Convertido en piedra: incapacitado, velocidad 0, falla FUE y DES, resiste todo el daño e inmune al veneno.": "Turned to stone: incapacitated, speed 0, fails STR and DEX saves, resists all damage and is immune to poison.",
  "Incapacitado y derribado; suelta lo que lleve. Falla FUE y DES. Ataques con ventaja; a 5 pies, críticos.": "Incapacitated and prone; drops what it holds. Fails STR and DEX saves. Attacks have advantage; within 5 feet, they crit.",
  "Acumulativo: −2 a las pruebas de d20 y −5 pies de velocidad por nivel. Con 6, muere. El descanso largo quita uno.": "Cumulative: −2 to d20 tests and −5 feet of speed per level. At 6, it dies. A long rest removes one.",
  "Al recibir daño, salvación de CON: CD 10 o la mitad del daño (hasta 30). Se pierde si queda incapacitado.": "When it takes damage, CON save: DC 10 or half the damage (up to 30). Lost if incapacitated.",

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
  "Dejar que los jugadores dibujen en el mapa": "Let players draw on the map",
  "Enseñar los muros y las puertas a la party": "Show walls and doors to the party",
  "El DM ha desactivado el dibujo": "The DM has turned off drawing",
  "Entendido": "Got it", "La pantalla no entra en la voz": "The screen doesn't join voice",
  "Esa persona no está en la voz": "That person isn't in voice chat",

  /* Bestiario: filtros y ficha desplegable */
  "Ficha": "Stat block", "Todos los tipos": "All types", "Tipo de criatura": "Creature type",
  /* Fotos de las criaturas y homebrew */
  "Fotos": "Photos", "Poner fotos a muchas criaturas de golpe": "Add photos to many creatures at once",
  "Todas": "All", "Con foto": "With photo", "Sin foto": "No photo", "Homebrew": "Homebrew", "Las mías": "Mine",
  "Qué criaturas mostrar": "Which creatures to show", "Cambiar la foto": "Change the photo", "Ponerle una foto": "Give it a photo",
  "Encuadre de la foto": "Photo framing", "Elige, pega o arrastra una foto": "Choose, paste or drop a photo", "Acercar": "Zoom",
  "Arrastra la foto para que la cara quede dentro del círculo: así se verá en el mapa.": "Drag the photo so the face sits inside the circle: that's how it will look on the map.",
  "Subir archivo": "Upload file", "Buscar en internet": "Search the web", "Quitar foto": "Remove photo",
  "Dirección de una imagen (https://…)": "Image address (https://…)", "Dirección de una imagen": "Image address", "Traer": "Fetch",
  "También puedes copiar una imagen en el navegador y pegarla aquí con Ctrl+V.": "You can also copy an image in your browser and paste it here with Ctrl+V.",
  "Guardar foto": "Save photo", "Primero elige una foto": "Choose a photo first",
  "Fotos de las criaturas": "Creature photos", "Poner las fotos": "Add the photos", "Suelta aquí las fotos": "Drop the photos here",
  "Elegir fotos": "Choose photos", "Elegir carpeta": "Choose folder",
  "Ponle cara a muchas criaturas de una vez: llama a cada archivo como la criatura, en castellano o en inglés (Goblin.jpg, Dragón rojo adulto.png, owlbear.webp), y suéltalos aquí o elige una carpeta entera.":
    "Give many creatures a face at once: name each file after the creature, in Spanish or English (Goblin.jpg, Dragón rojo adulto.png, owlbear.webp), and drop them here or choose a whole folder.",
  "Cada foto se encuadra sola en el círculo de la ficha. Si alguna queda mal, ábrela desde su criatura y muévela. Las fotos se guardan en tu partida, en tu ordenador.":
    "Each photo is framed in the token circle automatically. If one looks off, open it from its creature and move it. Photos are saved in your game, on your computer.",
  "No hay ninguna foto con el nombre de una criatura": "No photo is named after a creature",
  "Quitar todas las fotos": "Remove all photos", "Quitar las fotos": "Remove the photos", "Todas las criaturas vuelven a su icono": "Every creature is back to its icon",
  "¿Quitar la foto de 1 criatura? Vuelve a su icono.": "Remove the photo of 1 creature? It goes back to its icon.",
  "La dirección tiene que empezar por http:// o https://": "The address must start with http:// or https://",
  "Esa dirección no es una imagen: copia la dirección de la imagen, no la de la página": "That address isn't an image: copy the image's address, not the page's",
  "No se pudo descargar la imagen": "Couldn't download the image", "La web tarda demasiado en contestar": "The website takes too long to answer",
  "Esa web no deja copiar la imagen desde aquí: guárdala y súbela, o cópiala y pégala con Ctrl+V": "That website won't let the image be copied from here: save it and upload it, or copy it and paste it with Ctrl+V",
  "Criatura de la casa: diseño propio de Mesa a partir del folclore, que es de dominio público": "House creature: Mesa's own design based on public-domain folklore", "Folclore:": "Folklore:",
  "Cualquier VD": "Any CR", "Valor de desafío": "Challenge rating",
  "VD 0 a 1/2": "CR 0 to 1/2", "VD 1 a 2": "CR 1 to 2", "VD 3 a 4": "CR 3 to 4", "VD 5 a 8": "CR 5 to 8",
  "VD 9 a 16": "CR 9 to 16", "VD 17 o más": "CR 17 or higher",
  "No hay ninguna criatura así.": "No creature matches.", "1 criatura": "1 creature",

  /* Ficha del personaje y de las criaturas, al estilo de D&D Beyond */
  "Puntos de golpe": "Hit Points", "Actuales": "Current", "Máximos": "Max", "Temp.": "Temp",
  "Competencia": "Proficiency", "Desafío": "Challenge", "Recursos": "Resources",
  "Sin estados": "No conditions", "Salvaciones de muerte": "Death saves",
  "Cómo se tira": "Roll mode", "Tirada secreta": "Secret roll", "Solo la ves tú": "Only you see it",
  "Mensajes nuevos": "New messages",
  "Encuadrar salas": "Frame rooms",
  /* Tiradas al estilo de Beyond20: efectos, extras del ataque y teclas */
  "Efectos": "Effects", "Efectos activos": "Active effects", "Añadir o quitar efectos": "Add or remove effects",
  "Mientras estén encendidos se suman solos a las tiradas: el ataque, el daño, las salvaciones o las pruebas.":
    "While they're on they add themselves to rolls: attacks, damage, saving throws or ability checks.",
  "Habituales": "Common", "A medida": "Custom", "Al daño": "To damage",
  "A las salvaciones": "To saving throws", "A las pruebas": "To ability checks", "Bendición del templo": "Temple blessing",
  "Hecho": "Done", "Ningún efecto todavía.": "No effects yet.", "Caben doce efectos": "Twelve effects at most",
  "Ponle un nombre": "Give it a name", "Escribe al menos una fórmula, como 1d4 o 2": "Write at least one formula, like 1d4 or 2",
  "No entiendo esa fórmula. Prueba con 1d4, 2 o -1d4": "I don't understand that formula. Try 1d4, 2 or -1d4",
  "Perdición": "Bane", "Guía": "Guidance", "Resistencia": "Resistance", "Marca del cazador": "Hunter's Mark",
  "Maleficio": "Hex", "Arma mágica +1": "Magic Weapon +1", "Favor divino": "Divine Favor",
  "Se suma:": "Adds:", "Castigo divino": "Divine Smite", "Espacio para el castigo": "Slot for the smite", "Daño extra": "Extra damage",
  "Mayús": "Shift", "ventaja": "advantage", "desventaja": "disadvantage", "en secreto": "in secret", "solo al DM": "DM only",
  "ataque furtivo": "sneak attack",
  /* Biblioteca de sonidos */
  "Biblioteca de Mesa": "Mesa library", "biblioteca": "library", "Usar": "Use", "Elegido": "Chosen", "Escuchar o parar": "Play or stop",
  "Sonidos y música hechos para Mesa: se pueden usar sin pedir permiso a nadie.": "Sounds and music made for Mesa: free to use without asking anyone.",
  "Elige un audio tuyo o uno de la biblioteca": "Choose your own audio or one from the library",
  "Clima": "Weather", "Fuego y forja": "Fire and forge", "Lugares": "Places", "Bajo tierra": "Underground",
  "Magia": "Magic", "Música": "Music",
  "Lluvia": "Rain", "Tormenta": "Storm", "Lluvia desde dentro": "Rain from indoors", "Viento en la llanura": "Wind on the plains",
  "Ventisca": "Blizzard", "Bosque de día": "Forest by day", "Bosque oscuro": "Dark forest", "Noche en el campo": "Night in the countryside",
  "Arroyo": "Stream", "Cascada": "Waterfall", "Olas en la costa": "Waves on the shore", "Pantano": "Swamp", "Hoguera": "Campfire",
  "Antorchas y braseros": "Torches and braziers", "Campamento de noche": "Camp at night", "Forja": "Forge", "Lava y volcán": "Lava and volcano",
  "Taberna llena": "Busy tavern", "Plaza de la ciudad": "Town square", "Templo y órgano": "Temple and organ", "Biblioteca": "Library",
  "Barco en alta mar": "Ship at sea", "Cueva con goteo": "Dripping cave", "Mazmorra": "Dungeon", "Cripta": "Crypt", "Alcantarillas": "Sewers",
  "Energía arcana": "Arcane energy", "Giga de taberna": "Tavern jig", "Viaje y exploración": "Travel and exploration",
  "Descanso junto al fuego": "Rest by the fire", "Bosque feérico": "Fey forest", "Misterio": "Mystery", "Lamento": "Lament",
  "Combate": "Combat", "Batalla épica": "Epic battle", "Terror": "Horror",
  /* Creador de personajes */
  "Una furia primordial que convierte cada golpe en una avalancha.": "A primal fury that turns every blow into an avalanche.",
  "Magia tejida con palabras y música para inspirar o confundir.": "Magic woven from words and music to inspire or confound.",
  "La voluntad de un dios hecha luz, curación y castigo.": "A god's will made light, healing and punishment.",
  "Guardián de lo salvaje que habla con la tierra y cambia de forma.": "A guardian of the wild who speaks with the land and changes shape.",
  "Maestro de las armas y de la armadura, el muro de la party.": "Master of weapons and armor, the party's wall.",
  "Cuerpo y espíritu afilados hasta convertir los puños en armas.": "Body and spirit honed until fists become weapons.",
  "Un juramento sagrado que se defiende con acero y fe.": "A sacred oath upheld with steel and faith.",
  "Rastreador incansable de la frontera, letal a distancia.": "A tireless tracker of the frontier, deadly at range.",
  "Sigilo, ingenio y un golpe certero donde más duele.": "Stealth, wit and a precise strike where it hurts most.",
  "Magia en la sangre, desatada a fuerza de voluntad.": "Magic in the blood, unleashed by sheer will.",
  "Un pacto con un ser de otro mundo a cambio de poder prohibido.": "A pact with an otherworldly being in exchange for forbidden power.",
  "El estudio paciente de lo arcano convertido en poder.": "Patient study of the arcane turned into power.",
  "Ambiciosos y adaptables: no hay rincón al que no lleguen.": "Ambitious and adaptable: there's no corner they can't reach.",
  "Gracia y longevidad, con un pie en el mundo feérico.": "Grace and long life, with one foot in the Feywild.",
  "Tozudos como la piedra de las montañas que los vieron nacer.": "Stubborn as the stone of the mountains where they were born.",
  "Pequeños, valientes y con una suerte que roza lo increíble.": "Small, brave and with almost unbelievable luck.",
  "Sangre de dragón y un aliento que arrasa a los enemigos.": "Dragon blood and a breath that sweeps enemies away.",
  "Curiosos inventores con una mente difícil de embrujar.": "Curious inventors with minds hard to bewitch.",
  "Entre dos mundos, con lo mejor de cada uno.": "Between two worlds, with the best of each.",
  "Fuerza feroz y una resistencia que no se rinde.": "Fierce strength and endurance that never gives up.",
  "Herederos de un pacto infernal que llevan con orgullo.": "Heirs to an infernal pact they wear with pride.",
  "Acólito": "Acolyte", "Criminal": "Criminal", "Sabio": "Sage", "Soldado": "Soldier", "A tu medida": "Custom",
  "Creciste al servicio de un templo.": "You grew up in the service of a temple.",
  "Sobreviviste al margen de la ley.": "You survived outside the law.",
  "Pasaste años entre libros y maestros.": "You spent years among books and masters.",
  "Serviste en un ejército o una mesnada.": "You served in an army or a warband.",
  "Inventas tu pasado y eliges dos habilidades.": "You invent your past and choose two skills.",
  "Legal bueno": "Lawful good", "Neutral bueno": "Neutral good", "Caótico bueno": "Chaotic good",
  "Legal neutral": "Lawful neutral", "Neutral": "Neutral", "Caótico neutral": "Chaotic neutral",
  "Legal malvado": "Lawful evil", "Neutral malvado": "Neutral evil", "Caótico malvado": "Chaotic evil",
  /* Rasgos de clase y de especie */
  "Furia": "Rage",
  "Dos veces por descanso largo: ventaja en pruebas y salvaciones de FUE, +2 al daño cuerpo a cuerpo y resistencia al daño contundente, cortante y perforante.":
    "Twice per long rest: advantage on STR checks and saves, +2 melee damage and resistance to bludgeoning, slashing and piercing damage.",
  "Defensa sin armadura": "Unarmored Defense",
  "Sin armadura, tu CA es 10 + DES + CON.": "Without armor, your AC is 10 + DEX + CON.",
  "Sin armadura ni escudo, tu CA es 10 + DES + SAB.": "Without armor or shield, your AC is 10 + DEX + WIS.",
  "Lanzamiento de conjuros": "Spellcasting",
  "Usas el Carisma para lanzar conjuros de bardo.": "You use Charisma to cast bard spells.",
  "Usas la Sabiduría para lanzar conjuros de clérigo.": "You use Wisdom to cast cleric spells.",
  "Usas la Sabiduría para lanzar conjuros de druida.": "You use Wisdom to cast druid spells.",
  "Usas el Carisma para lanzar conjuros de hechicero.": "You use Charisma to cast sorcerer spells.",
  "Usas la Inteligencia y tu libro de conjuros.": "You use Intelligence and your spellbook.",
  "Inspiración bárdica": "Bardic Inspiration",
  "Como acción adicional, das a un aliado un d6 que puede sumar a una tirada. Tantas veces como tu modificador de CAR por descanso largo.":
    "As a bonus action, you give an ally a d6 they can add to a roll. As many times as your CHA modifier per long rest.",
  "Dominio de la vida": "Life Domain",
  "Tus conjuros de curación curan 2 + el nivel del conjuro más.": "Your healing spells heal an extra 2 + the spell's level.",
  "Druídico": "Druidic", "Conoces el idioma secreto de los druidas.": "You know the secret language of druids.",
  "Artes marciales": "Martial Arts",
  "Tus golpes sin armas hacen 1d4 y puedes dar uno más como acción adicional.": "Your unarmed strikes deal 1d4 and you can make one more as a bonus action.",
  "Sentido divino": "Divine Sense", "Notas a celestiales, infernales y muertos vivientes cercanos.": "You sense nearby celestials, fiends and undead.",
  "Imposición de manos": "Lay on Hands", "Una reserva de 5 puntos de vida por descanso largo para curar con el tacto.": "A pool of 5 hit points per long rest to heal by touch.",
  "Enemigo predilecto": "Favored Enemy", "Ventaja para rastrear y recordar datos de un tipo de criatura.": "Advantage to track and recall lore about one type of creature.",
  "Explorador nato": "Natural Explorer", "En tu terreno favorito el viaje es más rápido y no te pierdes.": "In your favored terrain you travel faster and never get lost.",
  "Una vez por turno, 1d6 de daño extra si tienes ventaja o un aliado está junto al objetivo.": "Once per turn, 1d6 extra damage if you have advantage or an ally is next to the target.",
  "Pericia": "Expertise", "Doble competencia en dos habilidades que elijas.": "Double proficiency in two skills of your choice.",
  "Jerga de ladrones": "Thieves' Cant", "Un código secreto de gestos y palabras.": "A secret code of signs and words.",
  "Linaje dracónico": "Draconic Bloodline", "+1 vida por nivel y, sin armadura, tu CA es 13 + DES.": "+1 hit point per level and, without armor, your AC is 13 + DEX.",
  "Patrón infernal": "The Fiend", "Al derribar a un enemigo, ganas vida temporal.": "When you drop an enemy, you gain temporary hit points.",
  "Magia del pacto": "Pact Magic", "Un espacio de conjuro que vuelve con cada descanso corto.": "A spell slot that comes back with every short rest.",
  "En un descanso corto recuperas un espacio de conjuro de nivel 1.": "On a short rest you recover one level 1 spell slot.",
  "Versátil": "Versatile", "+1 a todas las características.": "+1 to every ability score.",
  "Ves en la penumbra a 60 pies.": "You see in dim light within 60 feet.",
  "Trance": "Trance", "Cuatro horas de meditación te bastan.": "Four hours of meditation are enough for you.",
  "Ventaja contra el veneno y resistencia a su daño.": "Advantage against poison and resistance to its damage.",
  "Dureza enana": "Dwarven Toughness", "+1 a la vida máxima por nivel.": "+1 maximum hit point per level.",
  "Afortunado": "Lucky", "Si sacas un 1 en el d20, repites la tirada.": "If you roll a 1 on the d20, you reroll it.",
  "Ventaja contra quedar asustado.": "Advantage against being frightened.",
  "Ventaja contra quedar encantado.": "Advantage against being charmed.",
  "Agilidad de mediano": "Halfling Nimbleness", "Puedes atravesar el espacio de criaturas más grandes.": "You can move through the space of larger creatures.",
  "Arma de aliento": "Breath Weapon",
  "Exhalas fuego en un cono de 15 pies: 2d6 de daño, salvación de DES para la mitad.": "You exhale fire in a 15-foot cone: 2d6 damage, DEX save for half.",
  "Resistencia al fuego": "Fire Resistance", "Resistencia al daño de fuego.": "Resistance to fire damage.",
  "Astucia gnoma": "Gnome Cunning", "Ventaja en salvaciones de INT, SAB y CAR contra la magia.": "Advantage on INT, WIS and CHA saves against magic.",
  "Versatilidad": "Versatility", "+1 a dos características y dos habilidades más a tu elección.": "+1 to two ability scores and two more skills of your choice.",
  "Aguante implacable": "Relentless Endurance", "Una vez por descanso, si caes a 0 de vida, te quedas a 1.": "Once per rest, if you drop to 0 hit points, you stay at 1.",
  "Ataques salvajes": "Savage Attacks", "En un crítico, un dado de daño más.": "On a critical hit, one more damage die.",
  "Resistencia infernal": "Hellish Resistance",
  /* Equipo inicial */
  "Gran hacha": "Greataxe", "Estoque": "Rapier", "Dardo": "Dart", "Dardos": "Darts", "Jabalinas": "Javelins",
  "Paquete de explorador": "Explorer's pack", "Paquete de artista": "Entertainer's pack", "Paquete de sacerdote": "Priest's pack",
  "Paquete de mazmorreo": "Dungeoneer's pack", "Paquete de ladrón": "Burglar's pack", "Paquete de erudito": "Scholar's pack",
  "Laúd": "Lute", "Escudo de madera": "Wooden shield", "Foco druídico": "Druidic focus", "Foco arcano": "Arcane focus",
  /* Pasos y pantallas */
  "Resumen": "Summary", "Pasos": "Steps", "Siguiente": "Next", "Atrás": "Back", "Bajar": "Lower", "Subir": "Raise",
  "Fuerza": "Strength", "Destreza": "Dexterity", "Constitución": "Constitution",
  "Rasgos de nivel 1": "Level 1 features", "Dado de golpe": "Hit die", "Característica principal": "Primary ability",
  "Armaduras": "Armor", "Ligeras": "Light", "Ligeras, intermedias y escudos": "Light, medium and shields",
  "Ligeras, intermedias y escudos (no de metal)": "Light, medium and shields (not metal)", "Todas y escudos": "All and shields", "Ninguna": "None",
  "Mejora de características": "Ability score increase", "+1 a dos características": "+1 to two ability scores", "Dos habilidades más": "Two more skills",
  "Serie estándar": "Standard array", "Compra de puntos": "Point buy", "Tirar dados": "Roll dice", "A mano": "Manual",
  "Sin bonificador": "No bonus", "Cómo se reparten": "How they're assigned",
  "Reparte 15, 14, 13, 12, 10 y 8 entre las seis características.": "Assign 15, 14, 13, 12, 10 and 8 among the six abilities.",
  "Cada característica empieza en 8 y sube hasta 15.": "Each ability starts at 8 and goes up to 15.",
  "Se tiran 4d6 seis veces y se quita el dado más bajo de cada tirada. Luego repartes los resultados.": "Roll 4d6 six times and drop the lowest die each time. Then assign the results.",
  "Escribe las puntuaciones que ya tengas, de 3 a 18.": "Enter the scores you already have, from 3 to 18.",
  "Gastas": "You spend", "de 27 puntos.": "of 27 points.", "es lo más importante para tu clase (marcada).": "matters most for your class (marked).",
  "o": "or", "y": "and",
  "Volver a tirar": "Reroll", "Tirar los dados": "Roll the dice",
  "Elige una clase": "Choose a class", "Elige una especie": "Choose a species", "Elige un trasfondo": "Choose a background",
  "Elige al menos un conjuro": "Choose at least one spell",
  "Tira los dados para tener tus seis puntuaciones": "Roll the dice to get your six scores",
  "Asigna una puntuación a cada característica": "Assign a score to each ability",
  "A mano, cada puntuación va de 3 a 18": "Entered by hand, each score goes from 3 to 18",
  "Ya la tienes por otro lado": "You already have it from elsewhere",
  "ya las tenías: elige otras a cambio.": "you already had them: choose others instead.",
  "ya la tenías: elige otra a cambio.": "you already had it: choose another instead.",
  "Habilidades de tu trasfondo": "Background skills", "Habilidades a cambio": "Replacement skills", "Tus habilidades": "Your skills",
  "Sin armadura": "Unarmored", "+ DES (máx. 2)": "+ DEX (max 2)", "+ DES": "+ DEX", "+ 1 por Defensa": "+ 1 for Defense", "+ 2 del escudo": "+ 2 from the shield",
  "10 + DES": "10 + DEX", "10 + DES + CON": "10 + DEX + CON", "10 + DES + SAB": "10 + DEX + WIS", "13 + DES": "13 + DEX",
  "Elige hasta": "Choose up to",
  "Nivel inicial": "Starting level", "Del 1 al 20: vida, competencia, rasgos, mejoras y conjuros se calculan para ese nivel.": "1 to 20: hit points, proficiency, features, improvements and spells are worked out for that level.",
  "Bajar de nivel": "Level down", "Subir de nivel": "Level up", "Mejora de característica": "Ability Score Improvement",
  "La del SRD trae sus rasgos; si escribes otra, la llevas sin rasgos automáticos y los apuntas en la ficha.": "The SRD one brings its features; if you write another, you take it without automatic features and note them on the sheet.",
  "La repartes en el paso de características.": "You assign it in the ability scores step.", "Mejoras de característica": "Ability Score Improvements",
  "En cada una, +1 a dos características o +2 a una (elige la misma dos veces). Ninguna pasa de 20.": "Each one is +1 to two abilities or +2 to one (pick the same twice). None goes above 20.", "conjuros para empezar. Luego puedes cambiarlos desde «Conjuros» en la ficha.": "spells to start with. You can change them later from “Spells” on the sheet.",
  "Subir un retrato": "Upload a portrait", "Cambiar retrato": "Change portrait", "Sin nombre": "Unnamed",
  "Ponle nombre a tu personaje": "Give your character a name", "Cómo se llama tu personaje": "Your character's name", "Quién lo lleva": "Who plays it",
  "¿Salir sin crear el personaje? Se pierde lo elegido.": "Leave without creating the character? Your choices will be lost.",
  "Sí, adelante": "Yes, go ahead",
  "Rellenar la ficha a mano": "Fill in the sheet by hand",
  /* Sonido ambiente */
  "Sonido": "Sound", "Ambiente": "Ambience",
  "Sonido ambiente: una hoguera, un río, la música de la taberna": "Ambient sound: a campfire, a river, the tavern music",
  "Pulsa donde suena: una casilla vacía pone un sonido nuevo; uno que ya esté, lo abre": "Tap where it sounds: an empty square adds a new sound; an existing one opens it",
  "Desde este punto": "From this spot", "En toda la sala": "Across the whole room", "En todo el mapa (música)": "Across the whole map (music)",
  "Hoguera, río, taberna…": "Campfire, river, tavern…", "Elegir audio": "Choose audio", "Sin audio todavía": "No audio yet",
  "Audio subido": "Audio uploaded", "Escuchar": "Listen", "Subiendo…": "Uploading…",
  "MP3, OGG, WAV o M4A, hasta 15 MB. Mejor un bucle que empiece y acabe igual: sonará sin cortes.":
    "MP3, OGG, WAV or M4A, up to 15 MB. Best a loop that starts and ends the same: it will play seamlessly.",
  "Cómo se oye": "How it's heard", "Volumen": "Volume", "Alcance (casillas)": "Range (squares)",
  "Más fuerte a medida que se acercan": "Louder as they get closer",
  "Las paredes lo tapan: detrás de un muro o una puerta cerrada apenas se oye": "Walls block it: behind a wall or a closed door it's barely heard",
  "Suena igual en toda la sala de esta casilla, y fuera de ella no se oye.": "It sounds the same across this square's room, and isn't heard outside it.",
  "Esta casilla no está en ninguna sala: márcala con la herramienta «Sala» para que suene en toda ella.": "This square isn't in any room: mark it with the “Room” tool so it sounds across it.",
  "Sonando": "Playing", "Sonido del mapa": "Map sound", "Poner un sonido": "Add a sound",
  "Sonando de prueba. Se para al cerrar la ventana": "Test playback. It stops when you close the window",
  "Ese audio pasa de 15 MB. Prueba con un MP3 u OGG más corto": "That audio is over 15 MB. Try a shorter MP3 or OGG",
  "Elige un archivo de audio para este sonido": "Choose an audio file for this sound",
  "Silenciar el sonido ambiente en este aparato": "Mute ambient sound on this device",
  "Oír el sonido ambiente en este aparato": "Hear ambient sound on this device",
  "Toca la pantalla para oír el ambiente": "Tap the screen to hear the ambience",
  "Formato de audio no admitido: usa MP3, OGG, WAV o M4A": "Audio format not supported: use MP3, OGG, WAV or M4A",
  "Cuando la party entre en una sala, su cámara la encuadra entera; al salir, vuelve a la de antes": "When the party enters a room, their camera frames all of it; on leaving, it goes back to the previous one",
  "La cámara de la party encuadrará cada sala al entrar": "The party camera will frame each room on entering",
  "Activado. Marca las salas con la herramienta «Sala» para que se encuadren": "On. Mark rooms with the “Room” tool so they get framed",
  "La cámara de la party ya no encuadra las salas": "The party camera no longer frames rooms",
  "Encuadrar cada sala marcada cuando la party entre en ella (al salir, vuelve esta cámara)": "Frame each marked room when the party enters it (on leaving, this camera comes back)",

  /* Pestañas de la ficha */
  "Salvación de": "Save ability", "Cantidad de vida": "Amount of hit points", "Tu ficha": "Your sheet", "El DM te enseña algo": "The DM is showing you something",
  "Entran la party y las criaturas vivas que la party ve, que están en su misma sala o que ya ha visto y están cerca sin un muro por medio. Quita o añade a quien quieras, y escribe la iniciativa a mano o tírala.": "In come the party and the living creatures the party can see, that are in the same room, or that it has already seen and are near with no wall in between. Remove or add anyone you like, and type the initiative by hand or roll it.",
  "Pulsa los vértices de la forma; doble clic, Intro o el primer punto para cerrarla. Esc la deja": "Click the shape's corners; double-click, Enter or the first point closes it. Esc drops it",
  "Ajusta las medidas a la izquierda si quieres; pulsa para colocar y arrastra para girar": "Adjust the measurements on the left if you like; click to place and drag to rotate",
  "Camino o río": "Path or river", "Puerta": "Door",
  "Pulsa una pieza para elegirla y arrástrala para moverla. Mayús suma a la selección; arrastra en vacío para elegir varias. Q/W giran, Supr borra.": "Click a piece to select it and drag it to move it. Shift adds to the selection; drag on empty space to select several. Q/W rotate, Del deletes.",
  "Arrastra para dibujar una sala; las paredes salen solas. Mayús: cuadrada. Con «Recortar» quita suelo.": "Drag to draw a room; the walls appear by themselves. Shift: square. With “Cut” it removes floor.",
  "Pulsa los vértices; doble clic, Intro o el primer punto para cerrar. Esc cancela.": "Click the corners; double-click, Enter or the first point closes it. Esc cancels.",
  "Pulsa los puntos de un camino o un río; doble clic o Intro para acabar.": "Click the points of a path or a river; double-click or Enter to finish.",
  "Ahora recorta: quita suelo (X para sumar).": "Now cutting: removes floor (X to add).", "Ahora suma suelo (X para recortar).": "Now adding floor (X to cut).",
  "Ancho del pasillo": "Corridor width", "Sala más grande": "Largest room", "1 casilla": "1 square", "2 casillas": "2 squares", "3 casillas": "3 squares",
  "Ataque": "Attack", "Alcance": "Range", "Golpe/CD": "Hit/DC", "Acciones en combate": "Actions in combat",
  "Lanzar un conjuro": "Cast a spell", "Correr": "Dash", "Destrabarse": "Disengage", "Esquivar": "Dodge",
  "Ayudar": "Help", "Esconderse": "Hide", "Preparar": "Ready", "Buscar": "Search", "Usar un objeto": "Use an object",
  "Agarrar": "Grapple", "Empujar": "Shove",
  "Un ataque con arma o sin armas (más si tienes Ataque adicional).": "One weapon or unarmed attack (more with Extra Attack).",
  "Un conjuro cuyo tiempo de lanzamiento sea 1 acción.": "A spell with a casting time of 1 action.",
  "Ganas tanto movimiento extra como tu velocidad.": "Gain extra movement equal to your speed.",
  "Tu movimiento no provoca ataques de oportunidad este turno.": "Your movement doesn't provoke opportunity attacks this turn.",
  "Desventaja para quien te ataque; ventaja en salvaciones de DES.": "Attackers have disadvantage; you have advantage on DEX saves.",
  "Un aliado tiene ventaja en su próxima prueba o ataque.": "An ally gains advantage on their next check or attack.",
  "Prueba de Destreza (Sigilo) para ocultarte.": "Dexterity (Stealth) check to hide.",
  "Eliges un desencadenante y reaccionas cuando ocurra.": "Choose a trigger and react when it happens.",
  "Prueba de Sabiduría (Percepción) o Inteligencia (Investigación).": "Wisdom (Perception) or Intelligence (Investigation) check.",
  "Interactuar con un segundo objeto, o usar uno que lo pida.": "Interact with a second object, or use one that requires an action.",
  "Prueba de Atletismo contra Atletismo o Acrobacias del objetivo.": "Athletics check against the target's Athletics or Acrobatics.",
  "Derribar o apartar 5 pies a una criatura con Atletismo.": "Knock a creature prone or push it 5 feet with Athletics.",
  "Tirar el ataque": "Roll the attack", "Tirar el daño": "Roll the damage",
  "Sin ataques apuntados. Añádelos al editar la ficha.": "No attacks yet. Add them when editing the sheet.", "CD de salvación": "Save DC",
  "No conoce ningún conjuro todavía.": "Doesn't know any spells yet.", "Gestionar conjuros": "Manage spells",
  "Equipado": "Equipped", "Sin equipar": "Not equipped", "Objeto": "Item", "Cant.": "Qty", "Peso": "Weight",
  "Peso total": "Total weight", "Sin equipo apuntado. Añádelo al editar la ficha.": "No items yet. Add them when editing the sheet.",
  "Sin rasgos apuntados. Añádelos al editar la ficha.": "No features yet. Add them when editing the sheet.", "Especie": "Species", "Dote": "Feat", "Otro": "Other",
  "Sin notas. Escríbelas al editar la ficha.": "No notes. Write them when editing the sheet.",

  /* Editor de la ficha */ "Tipo": "Type", "Área": "Area", "Tamaño (pies)": "Size (feet)", "Peso (lb)": "Weight (lb)",
  "Origen": "Source", "Qué hace": "What it does", "Añadir objeto": "Add item", "Añadir rasgo": "Add feature",
  "Añadir acción": "Add action", "Rasgos y aptitudes": "Features & traits",
  "Cada ataque sale en la pestaña «Acciones» de la ficha: se toca el golpe o el daño para tirarlo.":
    "Each attack shows in the sheet's “Actions” tab: tap the hit or the damage to roll it.",
  "El peso es por unidad, en libras. Lo equipado se marca también desde la ficha.":
    "Weight is per unit, in pounds. Equipped items can also be toggled from the sheet.",
  "Se eligen de la biblioteca o se crean desde «Conjuros» en la ficha, y salen en su pestaña listos para lanzar.":
    "Pick them from the library or create them from “Spells” on the sheet; they show in their tab ready to cast.",
  "Un ataque se escribe así para poder tirarlo: «+4 al ataque — 1d6+2 cortante».":
    "Write an attack like this so it can be rolled: “+4 to hit — 1d6+2 slashing”.", "5 pies": "5 ft.", "Cuerda de cáñamo": "Hempen rope",
  "Ataque furtivo": "Sneak Attack", "Huida ágil": "Nimble escape",
  "Se desengancha o se esconde como acción adicional.": "Disengages or hides as a bonus action.",
  "+4 al ataque — 1d6+2 cortante": "+4 to hit — 1d6+2 slashing",

  /* Mapa: lo que faltaba */
  "Muro a mano alzada, para paredes redondas o irregulares (con Mayúsculas, recto)": "Freehand wall, for round or irregular walls (straight with Shift)",
  "Puerta, recta, en diagonal o en un muro libre: se abre y se cierra": "Door, straight, diagonal or on a freehand wall: opens and closes",
  "Quitar muros, diagonales, muros libres y puertas": "Remove walls, diagonals, freehand walls and doors",
  "Pulsa un borde (recta), el centro de una casilla (diagonal) o un muro libre. Otra pulsación la abre o la cierra; para quitarla, Borrar":
    "Tap an edge (straight), the centre of a square (diagonal) or a freehand wall. Tap again to open or close it; to remove it, Erase",
  "Arrastra para quitar muros y puertas, también trozos de muro libre": "Drag to remove walls and doors, including bits of freehand wall",
  "Todavía no se ha enseñado con ningún plano. Cuando los muros de un plano estén bien, «Enseñar con este plano».":
    "Nothing has been taught from a map yet. When a map's walls are right, use “Teach from this map”.",
  "Todavía no se ha enseñado con ningún plano": "Nothing has been taught from a map yet",
  "Cuando los muros de este plano estén bien puestos, la propuesta aprende de ellos para los próximos planos":
    "When this map's walls are right, the suggestion learns from them for future maps",
  "Un archivo con los planos enseñados, para otra instalación o una versión nueva": "A file with the taught maps, for another install or a new version",
  "Aprender de un archivo exportado desde Mesa": "Learn from a file exported from Mesa",

  /* La partida de ejemplo */
  "Partida de prueba": "Test game", "Sala de la guardia": "Guard room",
  "Busca al hombre de la cicatriz que traicionó a su gremio.": "Looking for the scarred man who betrayed her guild.", "Flechas": "Arrows", "Armadura de cuero": "Leather armour",
  "Herramientas de ladrón": "Thieves' tools", "50 pies": "50 ft.", "Hacha de batalla": "Battleaxe", "Hacha de mano": "Handaxe",
  "Cota de malla": "Chain mail", "Escudo": "Shield", "Raciones": "Rations", "Bastón": "Quarterstaff", "Libro de conjuros": "Spellbook",
  "Bolsa de componentes": "Component pouch", "Tinta y pluma": "Ink and quill", "Maza": "Mace", "Cota de escamas": "Scale mail",
  "Símbolo sagrado": "Holy symbol", "Kit de sanador": "Healer's kit", "10 usos": "10 uses",
  "Una vez por turno, 2d6 de daño extra si tienes ventaja o un aliado está a 5 pies del objetivo.":
    "Once per turn, 2d6 extra damage if you have advantage or an ally is within 5 feet of the target.",
  "Acción astuta": "Cunning Action", "Correr, Destrabarse o Esconderse como acción adicional.": "Dash, Disengage or Hide as a bonus action.",
  "Visión en la oscuridad": "Darkvision", "Ves en la penumbra a 60 pies como si hubiera luz.": "You see in dim light within 60 feet as if it were bright.",
  "Ascendencia feérica": "Fey Ancestry", "Ventaja contra quedar encantado; la magia no te duerme.": "Advantage against being charmed; magic can't put you to sleep.",
  "Tomar aliento": "Second Wind", "Como acción adicional recuperas 1d10 + tu nivel de vida, una vez por descanso.":
    "As a bonus action, regain 1d10 + your level in hit points, once per rest.",
  "Oleada de acción": "Action Surge", "Una acción más en tu turno, una vez por descanso.": "One more action on your turn, once per rest.",
  "Estilo de combate: Defensa": "Fighting Style: Defense", "+1 a la CA mientras lleves armadura.": "+1 to AC while wearing armour.",
  "Resistencia enana": "Dwarven Resilience", "Ventaja en salvaciones contra veneno y resistencia a su daño.":
    "Advantage on saves against poison and resistance to poison damage.",
  "Recuperación arcana": "Arcane Recovery", "En un descanso corto recuperas espacios de conjuro que sumen hasta 2 niveles.":
    "On a short rest, recover spell slots totalling up to 2 levels.",
  "Tradición arcana: Evocación": "Arcane Tradition: Evocation", "Tus conjuros de área pueden no afectar a tus aliados.":
    "Your area spells can spare your allies.",
  "Canalizar divinidad": "Channel Divinity", "Expulsar muertos vivientes, una vez por descanso.": "Turn Undead, once per rest.",
  "Afortunada": "Lucky", "Si sacas un 1 en el d20, vuelves a tirar y te quedas con el nuevo.": "When you roll a 1 on the d20, reroll and use the new roll.",
  "Valiente": "Brave", "Ventaja en salvaciones contra quedar asustada.": "Advantage on saves against being frightened.", "daño": "damage",
  "Volver a la ficha de serie": "Back to the stock stat block",
  "Humanoide": "Humanoid", "Bestia": "Beast", "Muerto viviente": "Undead", "Monstruosidad": "Monstrosity",
  "Gigante": "Giant", "Dragón": "Dragon", "Aberración": "Aberration", "Infernal": "Fiend", "Hada": "Fey",
  "Elemental": "Elemental", "Constructo": "Construct", "Cieno": "Ooze", "Planta": "Plant", "Celestial": "Celestial",

  /* La biblioteca del DM (el texto de los libros va en español) */
  "Buscar en toda la biblioteca": "Search the whole library",
  "Enseñar a la party a quién se apunta al atacar (tú lo ves siempre)": "Show the party who is being targeted in an attack (you always see it)",
  "Buscar por nombre (también en inglés) o escuela": "Search by name (Spanish or English) or school", "Todas las clases": "All classes", "Todos los niveles": "All levels",
  "Control del campo": "Battlefield control", "Defensa y mejoras": "Defense and buffs", "Invocación": "Summoning",
  "Información": "Information", "Utilidad": "Utility", "Curación": "Healing", "Movimiento": "Movement", "Categoría": "Category",
  "Artífice": "Artificer", "Directo": "Direct", "PG temp.": "Temp HP", "Da puntos de golpe temporales": "Grants temporary hit points",
  "Daño directo (tras impactar)": "Direct damage (after a hit)", "Ninguna": "None", "Puntos de golpe temporales": "Temporary hit points",
  "Vida temporal: se gasta antes que la vida y no se suma a la máxima": "Temporary hit points: spent before hit points and not added to the maximum",
  "Restar 1 de vida temporal": "Remove 1 temporary hit point", "Sumar 1 de vida temporal": "Add 1 temporary hit point",
  "Guardar la biblioteca": "Put the library away", "Reglas de D&D": "D&D Rules", "Ediciones, versiones y reglas para jugar": "Editions, versions and rules of play",
  "Manual del jugador": "Player's manual", "Clases, subclases, especies y trasfondos": "Classes, subclasses, species and backgrounds",
  "Compendio de conjuros": "Spell compendium", "Todos los conjuros por nivel": "Every spell, by level",
  "Criaturas por tipo, con su ficha completa": "Creatures by type, with full stat blocks", "Reglas": "Rules",
  "Cerrar el libro": "Close the book", "Buscar en el libro…": "Search this book…", "Buscar en el libro": "Search this book",
  "Dónde buscar": "Where to search", "Todo el libro": "Whole book", "Esta sección": "This section", "Secciones": "Sections",
  "Abriendo el libro…": "Opening the book…", "Sección anterior": "Previous section", "Sección siguiente": "Next section",
  "resultado": "result", "resultados": "results", "No aparece. Prueba con otra palabra.": "Not found. Try another word.",
  "No aparece. Prueba con otra palabra o busca en todo el libro.": "Not found. Try another word or search the whole book.",
  "Este libro aún no tiene nada.": "This book is still empty.", "Nueva sección": "New section", "Escribir": "Write", "Leer": "Read",
  "Ver original": "View original", "Enseñar a la mesa": "Show the table", "Descargar": "Download", "Renombrar": "Rename",
  "Color de la tapa": "Cover colour", "Quitar de la biblioteca": "Remove from the library",
  "Un cuaderno en blanco. Añade una sección para empezar a escribir.": "A blank notebook. Add a section to start writing.",
  "Nada que leer todavía.": "Nothing to read yet.", "Título de la sección": "Section title", "Texto": "Text",
  "Escribe aquí. Las fórmulas como 2d6+3 se podrán tirar al leer.": "Write here. Formulas like 2d6+3 become rollable when reading.",
  "Se guarda solo": "Saves by itself", "Guardado": "Saved", "Quitar sección": "Remove section", "Página en blanco.": "Blank page.", "Sin texto.": "No text.",
  "Caben ochenta secciones por cuaderno": "A notebook holds up to eighty sections", "La mesa ya la está viendo": "The table is looking at it now",
  "Título": "Title", "Página anterior": "Previous page", "Página siguiente": "Next page", "Añadir a la biblioteca": "Add to the library",
  "Un manual o una aventura. Se le saca el texto para poder buscar.": "A rulebook or an adventure. Its text is extracted so you can search it.",
  "Texto o Markdown": "Text or Markdown", ".txt o .md; los títulos se convierten en secciones.": ".txt or .md; headings become sections.",
  "Imagen": "Image", "Un mapa, una carta, un retrato que enseñar a la mesa.": "A map, a letter, a portrait to show the table.",
  "Cuaderno": "Notebook", "Tus notas de campaña, escritas aquí, por secciones.": "Your campaign notes, written here, in sections.",
  "Leyendo el PDF…": "Reading the PDF…", "Subiendo el PDF…": "Uploading the PDF…", "Subiendo el texto…": "Uploading the text…",
  "Subiendo la imagen…": "Uploading the image…", "Ese PDF pasa de 150 MB": "That PDF is over 150 MB", "Ese texto pasa de 8 MB": "That text is over 8 MB",
  "Eso no es una imagen": "That is not an image", "Esa imagen pasa de 20 MB": "That image is over 20 MB", "No se ha podido añadir": "Could not add it",
  "Un conjuro, un monstruo, una regla…": "A spell, a monster, a rule…", "Busca en todos los libros a la vez.": "Search every book at once.",
  "Buscando…": "Searching…", "No aparece en ningún libro.": "Not found in any book.", "Buscar en la biblioteca": "Search the library",
  "La biblioteca ya tiene sesenta libros": "The library already holds sixty books", "Cuaderno del DM": "DM notebook",
  "Ese libro ya no está en la biblioteca": "That book is no longer in the library", "No se encuentra el texto": "The text cannot be found",
  "No se encuentra el texto del PDF": "The PDF text cannot be found", "No se ha podido abrir el libro": "The book could not be opened",
  "Esta página no tiene texto (puede ser una imagen). Mírala en «Ver original».": "This page has no text (it may be an image). See it with “View original”.",
  "Cuaderno de campaña": "Campaign notebook", "Primera sesión": "First session", "Sección nueva": "New section",
  "Al azar": "Random", "Personaje al azar, directo a la mesa y al mapa": "Random character, straight to the table and the map",
  "Un personaje entero al azar: luego puedes cambiar lo que quieras": "A whole random character: change anything you like afterwards",
  "Plegar los dados y la mesa": "Fold the dice and table panel", "Abrir los dados y la mesa": "Open the dice and table panel",
  "Ocultar las herramientas del mapa": "Hide the map tools", "Enseñar las herramientas del mapa": "Show the map tools",
  "Por desafío": "By challenge", "Aberraciones": "Aberrations", "Bestias": "Beasts", "Celestiales": "Celestials", "Cienos": "Oozes",
  "Constructos": "Constructs", "Dragones": "Dragons", "Elementales": "Elementals", "Gigantes": "Giants", "Hadas": "Fey", "Humanoides": "Humanoids",
  "Infernales": "Fiends", "Monstruosidades": "Monstrosities", "Muertos vivientes": "Undead", "Plantas": "Plants",
  "Un recorrido guiado por cada pantalla, por secciones": "A guided tour of every screen, in sections",
  "Ejemplo del tutorial · solo lo ves tú": "Tutorial example · only you can see it",
  "Combate de ejemplo del tutorial · solo lo ves tú": "Tutorial example combat · only you can see it",
  "Es un ejemplo del tutorial: no cambia la partida": "This is a tutorial example: it does not change the game",
  "Comienzo": "Beginning", "Formato de archivo no admitido": "File format not supported", "Página": "Page", "Páginas": "Pages",
  /* Ronda 6: barra lateral del mapa, plantillas, CA temporal, conjuros, personajes, forja */
  "Herramientas del mapa": "Map tools", "Fichas y medidas": "Tokens and measuring", "Muros y puertas": "Walls and doors",
  "Salas y zonas": "Rooms and zones", "Notas, sonido y accesos": "Notes, sound and passages", "Plantillas de área": "Area templates",
  "Forja de mapas": "Map forge", "Anillo": "Ring", "Rectángulo": "Rectangle", "Polígono": "Polygon", "rectángulo": "rectangle", "línea": "line",
  "Anillo (radio de fuera y de dentro): un muro de fuego redondo": "Ring (outer and inner radius): a round wall of fire",
  "Rectángulo girable (largo y ancho)": "Rotatable rectangle (length and width)", "Cono (largo y abertura)": "Cone (length and opening)",
  "Línea (largo y ancho)": "Line (length and width)", "Esfera o ráfaga (radio)": "Sphere or burst (radius)",
  "Forma libre: pulsa los vértices, doble clic o Intro para cerrar": "Free shape: click the corners, double-click or Enter to close",
  "Radio, largo o lado en pies": "Radius, length or side in feet", "Ancho (pies)": "Width (feet)", "Abertura (grados)": "Opening (degrees)",
  "Radio de dentro (pies)": "Inner radius (feet)", "La ve la party": "The party sees it", "Color de serie": "Default colour",
  "Cerca es a cuántas casillas": "How many squares count as near", "en la misma sala": "in the same room", "en otro mapa": "on another map",
  "oculto a la party": "hidden from the party",
  "CA temporal": "Temporary AC", "Temporal": "Temporary", "Base": "Base", "de base": "base", "Cobertura media": "Half cover",
  "Cobertura de tres cuartos": "Three-quarters cover", "Escudo de fe": "Shield of Faith", "CA temporal: Escudo, cobertura…": "Temporary AC: Shield, cover…",
  "Bajar la CA temporal": "Lower the temporary AC", "Subir la CA temporal": "Raise the temporary AC", "Sumar vida": "Add hit points",
  "Escribe cuánta vida": "Type how many hit points",
  "Vida: cada toque resta o suma 1": "Hit points: each tap takes or adds 1", "Restar 1 de vida": "Take 1 hit point", "Sumar 1 de vida": "Add 1 hit point",
  "Imagen del DM": "DM's image", "Volver a ver la imagen que enseña el DM": "See the image the DM is showing again",
  "Puedes cerrarla para mirar el mapa: mientras el DM la enseñe, el botón «Imagen del DM» de arriba la vuelve a abrir.": "You can close it to look at the map: while the DM keeps showing it, the “DM's image” button at the top opens it again.",
  "Mi personaje": "My character", "La cámara sigue la acción": "The camera follows the action", "La cámara sigue a tu personaje": "The camera follows your character",
  "Encendido, la cámara se queda en tu personaje. Apagado, sigue la acción, como en la tele.": "On, the camera stays on your character. Off, it follows the action, like the TV.",
  "Solo lectura": "Read only",
  "Exportar personajes": "Export characters", "Importar personajes": "Import characters", "Exportar mi ficha": "Export my sheet",
  "Traer mi ficha": "Bring my sheet", "Traer mi ficha de otra partida": "Bring my sheet from another game", "Personajes": "Characters",
  "Criaturas en la mesa": "Creatures at the table", "Elige al menos un personaje": "Pick at least one character",
  "Uno, varios o toda la party, con sus retratos, para otra campaña": "One, several or the whole party, with portraits, for another campaign",
  "Fichas de otra campaña: entran como nuevas, sin pisar a nadie": "Sheets from another campaign: they come in as new, overwriting nobody",
  "Un archivo con las fichas enteras y sus retratos, para llevarlas a otra campaña con «Importar personajes».": "One file with the full sheets and their portraits, to take them to another campaign with “Import characters”.",
  "Entran como fichas nuevas, sin colocar en el mapa. Las que ya tengas no se tocan.": "They come in as new sheets, not placed on the map. The ones you already have stay untouched.",
  "Entra como tu personaje en esta partida.": "It comes in as your character in this game.",
  "Guardar mi ficha en un archivo, para otra campaña": "Save my sheet to a file, for another campaign",
  "En ese archivo no hay personajes": "There are no characters in that file", "En ese archivo no hay ningún personaje": "There is no character in that file",
  "Ese archivo no es de personajes de Mesa": "That file is not a Mesa characters file",
  "Conjuro": "Spell", "Conjuro nuevo": "New spell", "Crear un conjuro": "Create a spell", "Crear en la biblioteca": "Create in the library",
  "Retocar el conjuro": "Edit the spell", "Retocar en la biblioteca": "Edit in the library", "Retocar este conjuro en esta ficha": "Edit this spell on this sheet",
  "Restaurar el de serie": "Restore the original", "Restaurado el de serie": "Original restored", "Restaurar": "Restore", "retocado": "edited", "propio": "custom",
  "Cambia el conjuro solo en esta ficha. La biblioteca se queda como está.": "Changes the spell on this sheet only. The library stays as it is.",
  "Es un conjuro tuyo de la biblioteca.": "It is one of your own library spells.",
  "Es uno de serie: tu versión sustituye a la de serie en esta partida. Puedes volver a la de serie cuando quieras.": "It is a built-in spell: your version replaces the original in this game. You can go back to the original any time.",
  "La biblioteca de conjuros está llena": "The spell library is full", "Nada con ese nombre.": "Nothing by that name.",
  "Buscar conjuro, escuela o nivel (0 a 9)": "Search spell, school or level (0 to 9)",
  "Cómo se resuelve": "How it resolves", "Tirada de ataque": "Attack roll", "Salvación": "Saving throw", "Impacta siempre (dardos)": "Always hits (darts)",
  "Cura": "Healing", "Sueño (reserva de vida)": "Sleep (hit point pool)", "Sin tirada (solo efecto)": "No roll (effect only)",
  "Daño (o reserva de sueño)": "Damage (or sleep pool)", "Dados de más por cada espacio mayor": "Extra dice per higher slot",
  "Objetivos de más por espacio": "Extra targets per slot", "Rayos de más por espacio": "Extra rays per slot", "Rayos (ataques)": "Rays (attacks)",
  "La mitad de daño si supera la salvación": "Half damage on a successful save", "Si falla, además": "On a failure, also",
  "Estado que pone": "Condition it applies", "Rondas que dura el estado (0: hasta quitarlo)": "Rounds the condition lasts (0: until removed)",
  "Necesita concentración": "Needs concentration", "Suma la característica de lanzamiento a la cura": "Adds the spellcasting ability to the healing",
  "Truco que sube de daño con el nivel (5, 11 y 17)": "Cantrip that scales damage with level (5, 11 and 17)",
  "Truco que suma rayos con el nivel (como Descarga sobrenatural)": "Cantrip that adds beams with level (like Eldritch Blast)",
  "Escuela": "School", "Tiempo": "Casting time", "Duración": "Duration", "Descripción": "Description", "Efecto": "Effect", "Truco": "Cantrip",
  "1 acción": "1 action", "Concentración, 1 minuto": "Concentration, 1 minute", "Esfera": "Sphere", "Ataque cuerpo a cuerpo": "Melee attack",
  "Tirar el ataque de conjuro": "Roll the spell attack", "Tirar la cura": "Roll the healing", "Golpe / CD": "Hit / DC", "Lanzar": "Cast",
  "Solo el DM": "DM only", "Enseñar": "Show",
  /* La forja */
  "Abrir": "Open", "Nuevo": "New", "Guardar proyecto": "Save project", "Guardar el proyecto": "Save the project", "Exportar imagen": "Export image",
  "Usar en este mapa": "Use on this map", "Usar el plano": "Use the plan", "Usar esta": "Use this one", "Generar": "Generate",
  "Generar una mazmorra": "Generate a dungeon", "Atajos de la forja": "Forge shortcuts", "Atajos de teclado": "Keyboard shortcuts",
  "Deshacer": "Undo", "Rehacer": "Redo", "Deshacer (Ctrl+Z)": "Undo (Ctrl+Z)", "Rehacer (Ctrl+Y)": "Redo (Ctrl+Y)",
  "Duplicar (Ctrl+D)": "Duplicate (Ctrl+D)", "Borrar (Supr)": "Delete (Del)", "Supr": "Del", "Rueda": "Wheel", "Acercar": "Zoom in", "Alejar": "Zoom out",
  "Herramienta": "Tool", "Herramientas": "Tools", "Pieza": "Piece", "Capas": "Layers", "Capa": "Layer", "Estilo": "Style",
  "Elegir y mover": "Select and move", "Mover la vista (o mantener Espacio)": "Pan the view (or hold Space)", "Círculo u óvalo": "Circle or oval",
  "Sala": "Room", "Pincel de casillas": "Square brush", "Cueva": "Cave", "Agua": "Water", "Muro suelto": "Loose wall", "Camino": "Path",
  "Objeto": "Object", "Texto": "Text", "Luz": "Light", "Sumar o recortar suelo": "Add or cut floor", "Copiar": "Copy", "Pegar": "Paste",
  "Duplicar": "Duplicate", "Borrar lo elegido": "Delete the selection", "Mover lo elegido": "Move the selection",
  "Girar a la izquierda (con Mayús, de 15 en 15)": "Rotate left (with Shift, by 15)", "Girar a la derecha (con Mayús, de 15 en 15)": "Rotate right (with Shift, by 15)",
  "Al dibujar: cuadrado o círculo perfecto": "While drawing: perfect square or circle", "Sin ajustar a la cuadrícula": "Without snapping to the grid",
  "Acercar y alejar": "Zoom in and out",
  "Sumar suelo o recortarlo (X)": "Add floor or cut it (X)", "Sumar": "Add", "Recortar": "Cut", "Suma suelo": "Adds floor", "Recorta suelo": "Cuts floor",
  "A qué se ajusta lo que dibujas (Alt: suelto)": "What your drawing snaps to (Alt: free)", "Casilla": "Square", "Media casilla": "Half square", "Libre": "Free", "Suelto": "Free",
  "Arrastra para mover la vista. La rueda acerca y aleja.": "Drag to pan the view. The wheel zooms in and out.",
  "Arrastra para un círculo o un óvalo. Mayús: redondo.": "Drag for a circle or an oval. Shift: round.",
  "Arrastra para un estanque o un río. El agua se dibuja encima del suelo.": "Drag for a pond or a river. Water is drawn over the floor.",
  "Arrastra por las casillas para pintar suelo casilla a casilla.": "Drag across the squares to paint floor square by square.",
  "Arrastra como con un pincel grueso: deja una cueva de bordes irregulares.": "Drag like a thick brush: it leaves a cave with rough edges.",
  "Elige un objeto a la derecha y pulsa donde va. Q/W lo giran una vez colocado.": "Pick an object on the right and click where it goes. Q/W rotate it once placed.",
  "Pulsa donde va el texto y escríbelo a la derecha.": "Click where the text goes and type it on the right.",
  "Pulsa donde va la luz: una antorcha, un brasero, una ventana.": "Click where the light goes: a torch, a brazier, a window.",
  "Pulsa junto a un borde para una puerta recta, o en el centro de una casilla para una en diagonal. Corta la pared sola.": "Click near an edge for a straight door, or in the middle of a square for a diagonal one. It cuts the wall by itself.",
  "Pulsa los puntos de un muro suelto (un tabique, una columna). Doble clic o Intro para acabar.": "Click the points of a loose wall (a partition, a column). Double-click or Enter to finish.",
  "Lo nuevo va a la capa marcada. Las de abajo se pintan primero.": "New things go to the marked layer. The lower ones are painted first.",
  "Nueva capa": "New layer", "Nombre de la capa": "Layer name", "Quitar la capa": "Remove the layer", "Tiene que quedar una capa": "At least one layer must remain",
  "La capa está bloqueada": "The layer is locked", "La capa está oculta": "The layer is hidden", "Bloquear": "Lock", "Desbloquear": "Unlock",
  "Delante": "Forward", "Detrás": "Backward", "Delante de todo": "To the front", "Detrás de todo": "To the back",
  "Espejo": "Mirror", "Espejo horizontal": "Mirror horizontally", "Espejo vertical": "Mirror vertically",
  "Forma": "Shape", "Ancho": "Width", "Ancho (casillas)": "Width (squares)", "Radio": "Radius", "Radio (casillas)": "Radius (squares)",
  "Esquinas redondeadas": "Rounded corners", "Esquinas redondeadas (casillas)": "Rounded corners (squares)", "Rugosidad": "Roughness", "Semilla": "Seed",
  "Curvas suaves": "Smooth curves", "Curvas suaves entre los puntos": "Smooth curves between points", "Giro (°)": "Rotation (°)", "Grosor": "Thickness",
  "Grosor del pincel (casillas)": "Brush size (squares)", "Letra": "Font", "Negrita": "Bold", "Alineación": "Alignment", "Izquierda": "Left", "Centro": "Centre", "Derecha": "Right",
  "Clásica": "Classic", "Moderna": "Modern", "Máquina": "Typewriter", "A mano": "Handwritten", "Modo": "Mode", "Vertical": "Vertical",
  "Suelo": "Floor", "Paredes": "Walls", "Puertas": "Doors", "Objetos": "Objects", "Textos": "Texts", "Fondo": "Background", "Rayado": "Hatching",
  "Ancho del rayado": "Hatching width", "Rayado de roca alrededor": "Rock hatching around", "Sombra bajo el suelo": "Shadow under the floor",
  "Grosor de las paredes": "Wall thickness", "Textura del suelo": "Floor texture", "Cuadrícula": "Grid", "Fuerza de la cuadrícula": "Grid strength",
  "Con cuadrícula": "With grid", "Sin cuadrícula": "No grid", "Solo en el suelo": "Only on the floor", "En todo el plano": "Over the whole plan",
  "Tamaño del plano": "Plan size", "Volver al estilo de serie": "Back to the default style", "Pergamino": "Parchment", "Mazmorra": "Dungeon",
  "Tinta": "Ink", "Plano azul": "Blueprint", "Bosque": "Forest", "Suelo y paredes": "Floor and walls",
  "Puerta abierta": "Open door", "Puerta doble": "Double door", "Puerta secreta": "Secret door", "Rastrillo": "Portcullis", "Arco (hueco)": "Arch (opening)", "Ventana": "Window",
  "Marca (X)": "Mark (X)", "Marcas": "Marks", "Recorrido": "Route", "A trazos (un sendero)": "Dashed (a trail)",
  "Mobiliario": "Furniture", "Luz y fuego": "Light and fire", "Templo y cripta": "Temple and crypt", "Otra": "Other",
  "Alfombra": "Rug", "Altar": "Altar", "Antorcha de pared": "Wall torch", "Arbusto": "Bush", "Armero": "Weapon rack", "Ataúd": "Coffin", "Barca": "Boat",
  "Barril": "Barrel", "Brasero": "Brazier", "Caja": "Crate", "Caldero": "Cauldron", "Cama": "Bed", "Cofre": "Chest", "Columna": "Column",
  "Escalera de caracol": "Spiral stairs", "Escalera de mano": "Ladder", "Escaleras abajo": "Stairs down", "Escaleras arriba": "Stairs up", "Escombros": "Rubble",
  "Estandarte": "Banner", "Estantería": "Bookcase", "Estatua": "Statue", "Foso": "Pit", "Fuente": "Fountain", "Huesos": "Bones", "Jaula": "Cage",
  "Lámpara": "Lamp", "Mesa redonda": "Round table", "Pilar cuadrado": "Square pillar", "Pozo": "Well", "Sarcófago": "Sarcophagus", "Silla": "Chair",
  "Trampilla": "Trapdoor", "Trono": "Throne", "Tumba": "Grave", "Yunque": "Anvil", "Árbol": "Tree", "Recto (árbol)": "Straight (tree)",
  "Óvalo": "Oval", "Círculo": "Circle", "Paso": "Passages", "Recorte": "Cut-out", "Limpiar": "Clear", "Sustituir": "Replace",
  "Salas": "Rooms", "Forma de las salas": "Room shape", "Cuadradas": "Square", "Redondeadas": "Rounded", "Variadas": "Mixed", "Irregulares (cueva)": "Irregular (cave)",
  "Otra forma irregular": "Another irregular shape", "Paredes irregulares": "Irregular walls", "Con bucles": "With loops", "Serpenteante": "Winding", "Equilibrado": "Balanced",
  "Con escaleras y algunos objetos": "With stairs and some objects", "Sala más pequeña": "Smallest room", "Sala del trono": "Throne room",
  "El plano está vacío: dibuja algo o genera una mazmorra": "The plan is empty: draw something or generate a dungeon",
  "Dibuja algo de suelo primero": "Draw some floor first", "No se pudo usar el plano": "The plan could not be used",
  "Ese archivo no es un plano de la forja": "That file is not a forge plan", "Proyecto abierto": "Project opened", "Proyecto guardado en tus descargas": "Project saved to your downloads",
  "Se descarga como PNG.": "Downloads as PNG.", "Resolución": "Resolution", "50 píxeles por casilla": "50 pixels per square",
  "70 (la de Roll20 y Foundry)": "70 (the Roll20 and Foundry one)", "140 (para imprimir)": "140 (for printing)",
  "La mazmorra nueva sustituye al plano de ahora. Se puede volver atrás con Deshacer.": "The new dungeon replaces the current plan. You can go back with Undo.",
  "¿Empezar un plano en blanco? Lo de ahora se puede recuperar con Deshacer.": "Start a blank plan? The current one can be recovered with Undo.",
  "Que las luces del plano alumbren en Mesa (casillas de luz fija)": "Make the plan's lights shine in Mesa (fixed lit squares)",
  "Elige una clase para ver qué la hace especial.": "Pick a class to see what makes it special.",
  "Reglas 2024": "2024 rules", "Ficha 2014": "2014 stat block", "Vulnerabilidades": "Vulnerabilities",
  "Inmunidades": "Immunities", "VD": "CR", "Acciones adicionales": "Bonus Actions", "Reacciones": "Reactions",
  "Acciones legendarias": "Legendary Actions", "mod.": "mod.", "salv.": "save", "Modificador": "Modifier", "Salvación": "Saving throw",
  "Habilidades": "Skills", "Casillas": "Squares", "Capa:": "Layer:", "(cámbiala en «Capas»).": "(change it in “Layers”).", "Clase de armadura": "Armour class",
  "Escudo": "Shield", "Quitar": "Remove", "Lanzar": "Cast", "Conjuros": "Spells",
};

/* Las criaturas de serie traen su inglés en el catálogo: nombre, tipo, sentidos
   y cada línea de rasgos y acciones, con el nombre del ataque suelto para los
   botones de «Atacar». Lo que ya esté a mano arriba manda. */
for (const b of CATALOG) {
  const pair = (es, en) => { if (es && en && !(es in EN)) EN[es] = en; };
  pair(b.name, b.en.name);
  for (const k of ["origin", "sizeType", "alignment", "senses", "languages", "resistances", "vulnerabilities", "immunities", "skills", "gear", "speedText"]) pair(b[k], b.en[k]);
  /* «Feérico pequeño (goblinoide), caótico neutral» va en una sola línea */
  if (b.sizeType && b.alignment && b.en.sizeType && b.en.alignment) pair(`${b.sizeType}, ${b.alignment}`, `${b.en.sizeType}, ${b.en.alignment}`);
  for (const k of ["traits", "actions", "bonus", "reactions", "legendary"]) {
    const es = String(b[k] || "").split("\n"), en = String(b.en[k] || "").split("\n");
    es.forEach((line, i) => {
      pair(line, en[i]);
      pair(line.split(" — ")[0], (en[i] || "").split(" — ")[0]);
      /* el resto del rasgo, que la ficha en pergamino pinta con mayúscula */
      const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
      pair(cap(line.split(" — ").slice(1).join(" — ")), cap((en[i] || "").split(" — ").slice(1).join(" — ")));
    });
  }
}

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
const CHIP_SHAPE = { ...SHAPE_EN, anillo: "ring", "rectángulo": "rectangle", "emanación": "emanation", cilindro: "cylinder", "área": "area", linea: "line", emanacion: "emanation" };
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
  [/^(\d+) puntos de sueño$/, "$1 points of sleep"],
  [/^(\S+) de vida temporal$/, "$1 temporary hit points"]
];
/* Un nombre en una línea: si es una criatura del bestiario (con o sin
   número, «Hongo chillón 2»), en inglés; los de los personajes, tal cual */
const nm = w => {
  const k = String(w).trim(), m = /^(.+?) (\d{1,3})$/.exec(k);
  return EN[k] || (m && EN[m[1]] ? `${EN[m[1]]} ${m[2]}` : w);
};
const PATTERNS = [
  [/^Foto de (.+)$/, (m, b) => `Photo of ${nm(b)}`],
  [/^(.+) ya tiene cara$/, (m, b) => `${nm(b)} has a face now`],
  [/^¿Quitar las fotos de (\d+) criaturas\? Todas vuelven a su icono\.$/, "Remove the photos of $1 creatures? They all go back to their icons."],
  [/^(.+) vuelve a su icono$/, (m, b) => `${nm(b)} is back to its icon`],
  [/^1 foto reconocida$/, "1 photo recognised"], [/^(\d+) fotos reconocidas$/, "$1 photos recognised"],
  [/^(\d+) sin criatura$/, "$1 without a creature"],
  [/^Sin criatura \(cambia el nombre del archivo\): (.+)$/, "No creature (rename the file): $1"],
  [/^Poniendo fotos: (\d+) de (\d+)…$/, "Adding photos: $1 of $2…"],
  [/^(\d+) criaturas? tienen? cara( · (\d+) no se pudieron leer)?$/, (m, n, t, f) => `${n} ${n === "1" ? "creature has" : "creatures have"} a face${f ? ` · ${f} couldn't be read` : ""}`],
  [/^La web contestó (\d+): no deja descargar esa imagen$/, "The website answered $1: it won't let that image be downloaded"],
  /* La ficha de criatura de 2024 */
  [/^(\S+) \(([\d.,]+) PX; BC ([+−-]\d+)\)$/, "$1 (XP $2; PB $3)"],
  [/^Ficha de las reglas de 2024 \(SRD 5\.2\.1\)(?: · (.+))?$/, (m, n) => "2024 rules stat block (SRD 5.2.1)" + (n ? " · " + n : "")],
  [/^Esta criatura no está en el SRD de 2024: su ficha es la de 2014$/, "This creature isn't in the 2024 SRD: its stat block is the 2014 one"],
  /* Indicadores de ataques y conjuros (chips.js) */
  [/^(FUE|DES|CON|INT|SAB|CAR) ½$/, (m, ab) => (EN[ab] || ab) + " ½"],
  [/^Ataque ×(\d+)$/, "Attack ×$1"],
  [/^(esfera|cono|línea|cubo|anillo|rectángulo|emanación|cilindro|área) (\d+) pies$/, (m, sh, n) => `${n} ft ${CHIP_SHAPE[sh]}`],
  [/^Cuerpo a cuerpo, alcance (\d+) pies$/, "Melee, reach $1 feet"],
  [/^A distancia: hasta (\d+) pies normal y (\d+) como máximo, con desventaja$/, "Ranged: up to $1 feet normally, $2 at most with disadvantage"],
  [/^Alcance máximo: (\d+) pies$/, "Maximum range: $1 feet"],
  [/^Alcance: (.+)$/, (m, r) => "Range: " + (EN[r] || r)],
  [/^De área: (\S+) de (\d+) pies( de radio)?$/, (m, sh, n, rad) => `Area: ${n}-foot${rad ? "-radius" : ""} ${CHIP_SHAPE[sh.toLowerCase()] || sh}`],
  [/^Tirada de ataque de conjuro (cuerpo a cuerpo|a distancia)(?:, (\d+) rayos)?$/, (m, k, n) => `${k === "a distancia" ? "Ranged" : "Melee"} spell attack roll${n ? `, ${n} rays` : ""}`],
  [/^Salvación de (Fuerza|Destreza|Constitución|Inteligencia|Sabiduría|Carisma)(; si la supera, la mitad del daño)?$/, (m, ab, half) => `${EN[ab] || ab} saving throw${half ? "; half damage on a success" : ""}`],
  [/^Salvación de (Fuerza|Destreza|Constitución|Inteligencia|Sabiduría|Carisma) CD (\d+)$/, (m, ab, dc) => `DC ${dc} ${EN[ab] || ab} saving throw`],
  [/^Impacta siempre(?:: (\d+) dardos)?$/, (m, n) => "Always hits" + (n ? `: ${n} darts` : "")],
  [/^Puede dejarlo (.+)$/, (m, c) => "Can leave it " + (EN[c] || c)],
  /* Ronda 6 */
  [/^Se descarga como PNG\. (\d+) × (\d+) casillas\.$/, "Downloads as PNG. $1 × $2 squares."],
  [/^(.+) \(([A-Z]|Supr)\)$/, (m, a, k) => EN[a] ? `${EN[a]} (${k === "Supr" ? "Del" : k})` : m],
  [/^CA temporal de (.+)$/, "$1's temporary AC"], [/^Conjuro nuevo para (.+)$/, "New spell for $1"], [/^Ficha de (.+)$/, "$1's sheet"],
  [/^Ver la ficha de (.+)$/, "See $1's sheet"],
  [/^Clase de armadura: (\d+) de base ([+−]) (\d+) temporal( · pulsa para la CA temporal)?$/, (m, b, s, n, tail) => `Armour class: ${b} base ${s} ${n} temporary${tail ? " · click for the temporary AC" : ""}`],
  [/^Clase de armadura( · pulsa para la CA temporal)?$/, (m, tail) => "Armour class" + (tail ? " · click for the temporary AC" : "")],
  [/^Cambiarlo también en las (\d+) fichas que ya lo tienen$/, "Also change it on the $1 sheets that already have it"],
  [/^¿Volver a «(.+)» tal como viene de serie\?(?: Las (\d+) fichas que lo tienen también vuelven a la de serie\.)?$/, (m, n, k) => `Go back to “${n}” as it comes built in?${k ? ` The ${k} sheets that have it go back to the original too.` : ""}`],
  [/^¿Quitar «(.+)» de la biblioteca\? Las fichas que ya lo tienen lo conservan\.$/, "Remove “$1” from the library? Sheets that already have it keep it."],
  [/^«(.+)» guardado en la biblioteca$/, "“$1” saved in the library"],
  [/^¿Quitar la capa «(.*)» con sus (\d+) piezas\?$/, "Remove the layer “$1” with its $2 pieces?"],
  [/^El plano pasa a ser el fondo de este mapa, con la cuadrícula ya encajada \((\d+) × (\d+) casillas\), y sus paredes, puertas y ventanas sustituyen a los muros que tenga\.$/, "The plan becomes this map's background, with the grid already aligned ($1 × $2 squares), and its walls, doors and windows replace the map's walls."],
  [/^Plano listo: (\d+) tramos de pared y (\d+) puertas y ventanas$/, "Plan ready: $1 wall runs and $2 doors and windows"],
  [/^a (\d+) pies de (.+)$/, "$1 ft from $2"],
  [/^(\d+) fichas guardadas en tus descargas$/, "$1 sheets saved to your downloads"], [/^Ficha de (.+) guardada en tus descargas$/, "$1's sheet saved to your downloads"],
  [/^(.+) ya está en la partida$/, "$1 is in the game now"], [/^(\d+) personajes importados$/, "$1 characters imported"],
  /* La biblioteca */
  [/^Desafío (\S+)$/, "Challenge $1"], [/^([\d.]+) PX$/, (m, n) => n.replace(/\./g, ",") + " XP"], [/^Desafío (\S+) a (\S+)$/, "Challenge $1 to $2"], [/^Desafío (\S+) o más$/, "Challenge $1 or higher"],
  [/^La biblioteca ya tiene (\d+) libros$/, "The library already holds $1 books"],
  [/^¿Quitar «(.+)» de la biblioteca\? No se puede deshacer\.$/, "Remove “$1” from the library? This cannot be undone."],
  [/^¿Quitar «(.+)» del cuaderno\?$/, "Remove “$1” from the notebook?"],
  [/^«(.+)» ya no está en la biblioteca$/, "“$1” is no longer in the library"],
  [/^«(.+)» ya está en la estantería$/, "“$1” is on the shelf now"],
  [/^Leyendo el texto: página (\d+) de (\d+)$/, "Reading the text: page $1 of $2"],
  [/^No se ha podido abrir el PDF: (.+)$/, "Could not open the PDF: $1"],
  [/^(\d+) páginas$/, "$1 pages"], [/^Página (\d+)$/, "Page $1"], [/^Páginas (\d+)–(\d+)$/, "Pages $1–$2"],
  /* Tiradas: efectos, extras y detalles del ataque */
  [/^Efectos de (.+)$/, "$1's effects"],
  [/^(.+) ya está en la lista$/, (m, n) => `${word(n)} is already on the list`],
  [/^Tirar (\S+)$/, "Roll $1"],
  [/^(.+) con (ventaja|desventaja)$/, (m, w, k) => `${w.includes(" · ") ? pieces(w) : translateOne(w) ?? w} with ${k === "ventaja" ? "advantage" : "disadvantage"}`],
  [/^[+-]\S+ (?:ataque|daño|salvación|prueba)(?:, [+-]\S+ (?:ataque|daño|salvación|prueba))*$/,
    m => m.replace(/ataque|daño|salvación|prueba/g, w => ({ ataque: "attack", daño: "damage", salvación: "save", prueba: "check" })[w])],
  [/^(.+?)(  \|  .+)$/, (m, head, rest) => head + rest.split("  |  ").slice(1).map(part => "  |  " + part
    .replace(/^daño /, "damage ")
    .split(", ").map(x => x
      .replace(/^castigo divino de nivel (\d+)$/, "divine smite (level $1)")
      .replace(/^sin espacios de nivel (\d+) para el castigo$/, "no level $1 slots for the smite")
      .replace(/^daño extra (\S+)$/, "extra damage $1")
      .replace(/^ataque furtivo$/, "sneak attack")
      .replace(/^.+$/, w => EN[w] || w)).join(", ")).join("")],
  /* Creador de personajes */
  [/^Elige (\d+) habilidad(?:es)? más de tu (clase|especie|trasfondo)$/, (m, n, w) => `Choose ${n} more ${n === "1" ? "skill" : "skills"} from your ${{ clase: "class", especie: "species", trasfondo: "background" }[w]}`],
  [/^Elige (\d+) características? más para subir \+1$/, (m, n) => `Choose ${n} more ${n === "1" ? "ability" : "abilities"} to raise by +1`],
  [/^(FUE|DES|CON|INT|SAB|CAR) \+(\d+) por especie$/, (m, a, n) => `${SAVE_EN[a]} +${n} from species`],
  /* Creador de cualquier nivel */
  [/^(FUE|DES|CON|INT|SAB|CAR) \+(\d+) por especie · \+(\d+) por mejoras$/, (m, a, n, k) => `${SAVE_EN[a]} +${n} from species · +${k} from improvements`],
  [/^Sin bonificador · \+(\d+) por mejoras$/, "No bonus · +$1 from improvements"],
  [/^Subclase \(llega a nivel (\d+)\)$/, "Subclass (arrives at level $1)"],
  [/^Lo que gana hasta el nivel (\d+)$/, "What it gains up to level $1"],
  [/^Mejora del nivel (\d+)$/, "Level $1 improvement"],
  [/^(Fuerza|Destreza|Constitución|Inteligencia|Sabiduría|Carisma) \+1$/, (m, a) => `${EN[a] || a} +1`],
  [/^trucos y conjuros preparados de nivel (\d+), hasta conjuros de nivel (\d+)\. Luego puedes cambiarlos desde «Conjuros» en la ficha\.$/,
    "cantrips and prepared spells for level $1, up to level $2 spells. You can change them later from “Spells” on the sheet."],
  [/^trucos y conjuros preparados\. Luego puedes cambiarlos desde «Conjuros» en la ficha\.$/, "cantrips and prepared spells. You can change them later from “Spells” on the sheet."],
  [/^(\S+) · (\S+) · nivel (\d+)(?: · (.+))?$/, (m, c, s, n, sub) => `${EN[c] || c} · ${EN[s] || s} · level ${n}${sub ? " · " + sub : ""}`],
  [/^(FUE|DES|CON|INT|SAB|CAR) \+(\d+)$/, (m, a, n) => `${SAVE_EN[a]} +${n}`],
  [/^y \+1 a otras (\d+)$/, "and +1 to $1 others"],
  [/^elige (\d+)$/, "choose $1"],
  [/^(.+?) se sienta a la mesa$/, "$1 takes a seat at the table"],
  [/^(\d+) criaturas$/, "$1 creatures"],
  [/^(\d+) pies$/, "$1 ft."],
  [/^vd (\S+)$/i, "CR $1"],
  [/^¿Borrar (.+) del bestiario\?$/, "Delete $1 from the bestiary?"],
  [/^¿Devolver (.+) a su ficha de serie\? Se pierden tus cambios\.$/, "Put $1 back to its stock stat block? Your changes will be lost."],
  /* Conjuros */
  [/^Conjuros de (.+)$/, "$1 · spells"],
  [/^Conjuros \((\d+)\)$/, "Spells ($1)"],
  [/^(.+) · (truco|nivel \d+)$/, (m, sp, l) => `${sp.includes(" · ") ? pieces(sp) : word(sp)} · ${level(l)}`],
  [/^Nivel (\d+)( · potenciado)?$/, (m, n, up) => `Level ${n}${up ? " · upcast" : ""}`],
  [/^Nivel (\d+) · quedan (\d+)( · potenciado)?$/, (m, n, f, up) => `Level ${n} · ${f} left${up ? " · upcast" : ""}`],
  [/^Espacios de nivel (\d+)$/, "Level $1 slots"],
  [/^Objeto sintonizado (\d)$/, "Attuned item $1"], [/^Éxito (\d)$/, "Success $1"], [/^Fallo (\d)$/, "Failure $1"],
  [/^Gastado (\d+) de nivel (\d+)$/, "Level $2 slot $1 spent"],
  [/^(\d+) conjuros añadidos$/, "$1 spells added"],
  [/^(.+) añadido$/, (m, sp) => `${word(sp)} added`],
  [/^\(hasta (\d+)\)$/, "(up to $1)"],
  [/^No le quedan espacios de nivel (\d+)$/, "No level $1 slots left"],
  [/^CD (\d+)$/, "DC $1"],
  [/^CD (\d+) (FUE|DES|CON|INT|SAB|CAR)$/, (m, dc, a) => `DC ${dc} ${SAVE_EN[a]}`],
  [/^([+-]\d+) al ataque$/, "$1 to hit"],
  [/^salvación de (FUE|DES|CON|INT|SAB|CAR)( \(mitad\))?$/, (m, a, h) => `${SAVE_EN[a]} save${h ? " (half)" : ""}`],
  [/^(\d+d\d+(?:[+-]\d+(?:d\d+)?)*)( .+)?$/, (m, d, t) => `${d}${dmgTail(t)}`],
  [/^(esfera|cono|línea|cubo) de (\d+) pies$/, (m, sh, n) => `${n}-foot ${SHAPE_EN[sh]}`],
  [/^(\d+) dardos$/, "$1 darts"],
  /* Rasgos de clase del creador: «Crítico brutal (1 dado)», «Destruir muertos vivientes (VD 1/2)», listas con comas */
  [/^Rasgo de (\S+) de nivel (\d+)\.$/, (m, c, n) => `${word(c[0].toUpperCase() + c.slice(1))} feature at level ${n}.`],
  [/^([^(),]+) \((\d+) dados?\)$/, (m, f, n) => `${word(f)} (${n} ${n === "1" ? "die" : "dice"})`],
  [/^([^(),]+) \(VD ([\d/]+)\)$/, (m, f, n) => `${word(f)} (CR ${n})`],
  [/^([^(),]+) \(nivel (\d)\)$/, (m, f, n) => `${word(f)} (level ${n})`],
  [/^([^(),]+) \((d\d+|\d+|\d+d\d+)\)$/, (m, f, d) => EN[f.trim()] ? `${word(f)} (${d})` : m],
  /* Biblioteca de conjuros (filtros) y los modos de daño directo y vida temporal */
  [/^Nv (\d)$/, "Lv $1"],
  [/^(\d+) conjuros$/, "$1 spells"], [/^1 conjuro$/, "1 spell"],
  [/^daño directo(?:, salvación de (FUE|DES|CON|INT|SAB|CAR))?$/, (m, a) => `direct damage${a ? `, ${SAVE_EN[a]} save` : ""}`],
  [/^vida temporal (\S+)(?: \(\+(\S+) por nivel\))?$/, (m, f, up) => `temp HP ${f}${up ? ` (+${up} per level)` : ""}`],
  [/^Directo · (FUE|DES|CON|INT|SAB|CAR)$/, (m, a) => `Direct · ${SAVE_EN[a]}`],
  [/^El daño entra sin tirar \(se lanza tras impactar\)(?:; salvación de (\S+) para el estado)?$/,
    (m, a) => `The damage lands without a roll (cast after a hit)${a ? `; ${ABIL_EN[a] || a} save against the condition` : ""}`],
  [/^salvación de (Fuerza|Destreza|Constitución|Inteligencia|Sabiduría|Carisma) CD (\d+)$/, (m, a, dc) => `${ABIL_EN[a]} save DC ${dc}`],
  [/^(.+?) gana (\d+) de vida temporal$/, "$1 gains $2 temporary hit points"],
  [/^cura (\S+)( \+ car\.)?$/, (m, d, mod) => `heals ${d}${mod ? " + mod" : ""}`],
  [/^sueño (\S+)$/, "sleep $1"],
  /* Lo que escribe el servidor al lanzar */
  [/^((?:(?! contra )[^:·])+): (salvación \d+|\d+) · (.+)$/,
    (m, who, first, rest) => `${nm(who)}: ${first.replace("salvación", "save")} · ${pieces(rest)}`],
  [/^((?:(?! contra )[^:·])+): (\d+ de daño[^·]*(?: · .+)?)$/, (m, who, rest) => `${nm(who)}: ${pieces(rest)}`],
  [/^((?:(?! contra )[^:·])+): sin efecto$/, "$1: no effect"],
  [/^(.+?) \((truco|nivel \d+)\)(?: sobre ([^:·]+))?(?:: (.+))?$/,
    (m, sp, l, on, rest) => `${word(sp)} (${level(l)})${on ? " on " + nm(on) : ""}${rest ? ": " + spellPart(rest) : ""}`],
  [/^(\d+) de daño( (?!y cae$)[^()]+?)?( \(la mitad si la supera\))?( y cae)?$/,
    (m, n, t, half, down) => `${n} ${dmgTail(t).trim() ? dmgTail(t).trim() + " " : ""}damage${half ? " (half on a success)" : ""}${down ? " and goes down" : ""}`],
  [/^(.+?): (\d+) de daño( (?!y cae$)[^()]+?)?( y cae)?$/,
    (m, who, n, t, down) => `${nm(who)}: ${n} ${dmgTail(t).trim() ? dmgTail(t).trim() + " " : ""}damage${down ? " and goes down" : ""}`],
  [/^(.+?): salvación (\d+)$/, (m, who, n) => `${nm(who)}: save ${n}`],
  [/^(.+?): salvación (\d+) \((la supera|falla)\)$/, (m, who, n, r) => `${nm(who)}: save ${n} (${r === "falla" ? "fails" : "succeeds"})`],
  [/^(.+?): salvación (\d+) \((la supera|falla)\) · recibe (\d+) de daño( y cae)?$/,
    (m, who, n, r, d, down) => `${nm(who)}: save ${n} (${r === "falla" ? "fails" : "succeeds"}) · takes ${d} damage${down ? " and goes down" : ""}`],
  [/^(.+?): salvación de (\S+) CD (\d+)(?: para (.+?))?(?: · (\d+) de daño(.*))?$/,
    (m, atk, a, dc, tgt, d, t) => `${word(atk)}: ${ABIL_EN[a] || SAVE_EN[a] || a} save DC ${dc}${tgt ? " for " + tgt : ""}${d ? ` · ${d}${dmgTail(t)} damage` : ""}`],
  [/^la supera$/, "succeeds"], [/^falla$/, "fails"], [/^impacta$/, "hits"], [/^pifia$/, "fumble"], [/^¡CRÍTICO!$/, "CRITICAL!"],
  [/^queda (.+)$/, (m, c) => `now ${word(c)}`],
  [/^(.+?) resiste el sueño$/, (m, who) => `${nm(who)} resists the sleep`],
  [/^(.+?) se duerme$/, (m, who) => `${nm(who)} falls asleep`],
  [/^(.+?) se concentra en (.+)$/, (m, who, sp) => `${nm(who)} concentrates on ${word(sp)}`],
  [/^(.+?) deja de concentrarse en (.+)$/, (m, who, sp) => `${nm(who)} stops concentrating on ${word(sp)}`],
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
  [/^Turno de ([^·]+)$/, (m, who) => `${nm(who)}'s turn`],
  [/^después ([^·]+)$/, "next $1"],
  [/^Concentrado en ([^·]+)$/, "Concentrating on $1"],
  [/^le habéis hecho (\d+) de daño$/, "you've dealt $1 damage"],
  [/^Lo que le queda a (.+) en este turno$/, "What $1 has left this turn"],
  [/^(.+) no tiene ningún ataque apuntado\. Añádelo en su ficha\.$/, "$1 has no attacks listed. Add one on their sheet."],
  [/^Ronda (\d+) · le toca a$/i, "Round $1 · up now"],
  [/^(\d+) en pie$/, "$1 standing"],
  [/^¿Expulsar a (.+)\? Su aparato vuelve a la entrada\.( Cierra la mesa si no quieres que vuelva a entrar\.)?$/,
    (m, who, tail) => `Kick ${nm(who)} out? Their device goes back to the entrance.${tail ? " Close the table if you don't want them back." : ""}`],
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
  [/^(\d+)\/(\d+) pies$/, "$1/$2 ft."],
  [/^Salvación de (.+)$/, "Saving throw · $1"],
  [/^Prueba de (.+)$/, "Ability check · $1"],
  [/^Iniciativa de (.+)$/, "Initiative · $1"],
  [/^(\S+) \((\d+) PX\)$/, "$1 ($2 XP)"],
  [/^(\d+) pies · (\d+) casillas?$/, "$1 feet · $2 squares"],
  [/^(\d+) de (\d+) pies$/, "$1 of $2 feet"],
  [/^Dado de golpe \((\d+)\)$/, "Hit die ($1)"],
  [/^Ajustes de (.+)$/, (m, what) => `Settings · ${word(what)}`],
  [/^Editar (.+)$/, (m, who) => `Edit ${word(who)}`],
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
  [/^Atacar con (.+)$/, (m, who) => `Attack with ${translateOne(who) ?? who}`],
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
    (m, who, n, note, tail) => `${nm(who)} takes ${n} damage${note ? " (" + note + ")" : ""}${tail === " y cae" ? " and goes down" : ""}`],
  [/^(.+?) recupera (\d+) de vida(?: \((.+?)\))?( y vuelve en sí)?$/,
    (m, who, n, note, tail) => `${nm(who)} regains ${n} hit points${note ? " (" + note + ")" : ""}${tail ? " and comes round" : ""}`],
  [/^(.+?) gana (\d+) de vida temporal$/, "$1 gains $2 temporary hit points"],
  [/^(.+?) tiene que superar una salvación de Constitución CD (\d+) o pierde la concentración en (.+)$/,
    "$1 must make a DC $2 Constitution save or lose concentration on $3"],
  [/^(.+?): se le pasa (.+)$/, "$1: $2 wears off"],
  [/^(.+?) cruzan? por (.+)$/, (m, who, p) => `${who.replace(/ y ([^,]+)$/, " and $1")} go${/ y [^,]+$/.test(who) ? "" : "es"} through ${word(p)}`],
  [/^(.+) está en (.+), que lleva a (.+)\.$/, (m, who, p, to) => `${nm(who)} is on ${p}, which leads to ${to === "otro punto de este mapa" ? "another spot on this map" : to === "otro mapa" ? "another map" : to}.`],
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
  [/^(.+?) (cae|encaja el golpe)$/, (m, who, v) => `${nm(who)} ${v === "cae" ? "goes down" : "takes the hit"}`],
  [/^(.+?) contra (.+?): (\d+)( · .+)?$/, (m, atk, tgt, n, tail) => `${word(atk)} against ${nm(tgt)}: ${n}${(tail || "")
    .replace("· ¡CRÍTICO!", "· CRITICAL!").replace("· impacta", "· hits").replace("· falla", "· misses")
    .replace("· pifia", "· fumble").replace(/(\d+) de daño( [^\s·]+)?/, (m, n, t) => `${n} ${t ? word(t.trim()) + " " : ""}damage`)}`],
  /* «Engaño +4»: una habilidad o característica con su modificador */
  [/^([^\d+−-][^+]*?) ([+-]\d+)$/, (m, what, mod) => EN[what.trim()] ? `${EN[what.trim()]} ${mod}` : m],
  /* Una criatura del bestiario con su número al ponerla en el mapa: «Hongo chillón 2» */
  [/^(.+?) (\d{1,3})$/, (m, name, n) => EN[name.trim()] ? `${EN[name.trim()]} ${n}` : m],
  /* Lo último: una lista con comas («Furia, Defensa sin armadura»), trozo a trozo,
     solo si todos los trozos se traducen */
  [/^[^,]+(?:, [^,]+)+$/, s => { const parts = s.split(", ").map(p => { const o = translateOne(p); return o && o !== p ? o : null; }); return parts.every(Boolean) ? parts.join(", ") : s; }]
];

/* ---------- Aplicación ---------- */
const ATTRS = ["placeholder", "title", "aria-label"];
let working = false;
let observer = null;

function translate(text) {
  const raw = text.trim();
  if (!raw) return null;
  const whole = translateOne(raw);
  /* Si la «traducción» deja el texto igual no hay nada que hacer: devolverlo
     haría que el observador lo reescribiera y se disparase otra vez, sin fin */
  if (whole !== null && whole !== undefined && whole !== raw) return text.replace(raw, whole);
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
/* Los textos de los conjuros (casi 300 KB) y los rasgos de clase solo se cargan en inglés */
let spellsEn = null;
export function loadSpellTexts() {
  if (lang !== "en") return Promise.resolve();
  return spellsEn || (spellsEn = Promise.all([import("./libros/conjuros-en.js"), import("./libros/jugador-en.js")]).then(([c, j]) => {
    for (const list of [c.CONJUROS_EN, j.JUGADOR_EN]) for (const [k, v] of Object.entries(list)) if (!EN[k]) EN[k] = v;
    sweep(document.body);
  }).catch(() => {}));
}
export function startI18n() {
  document.documentElement.lang = lang;
  loadSpellTexts();
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
      if (r.type === "characterData") { const out = translate(r.target.nodeValue); if (out !== null && out !== r.target.nodeValue) { working = true; r.target.nodeValue = out; working = false; } }
      for (const node of r.addedNodes) {
        if (node.nodeType === 3) { const out = translate(node.nodeValue); if (out !== null && out !== node.nodeValue) { working = true; node.nodeValue = out; working = false; } }
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
/* Una línea entera como la traduce el documento (diccionario y patrones): para las pruebas */
export const translateLine = s => lang === "en" ? (translateOne(String(s)) ?? s) : s;
