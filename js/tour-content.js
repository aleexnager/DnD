/* El contenido del tutorial: un recorrido por pantalla (DM, jugador, tele y
   entrada), partido en secciones y pasos.

   Cada paso: t, el control que se señala (un selector; si no está a la
   vista, la tarjeta sale en el centro), y el título y el texto en español
   (es) y en inglés (en). En el texto, **negrita**, [[tecla]] y líneas que
   empiezan por «- » para listas.

   scene prepara la pantalla para el paso: cambiar de pestaña, desplegar una
   ficha, abrir una ventana… Devuelve cómo dejarla como estaba. Ninguna toca
   la partida. */

const $ = s => document.querySelector(s);
const click = s => { const n = $(s); if (n) n.click(); return !!n; };
const later = ms => new Promise(r => setTimeout(r, ms));
/* La última ventana abierta (que no sea el índice del tutorial) */
const closeModal = () => {
  const m = [...document.querySelectorAll(".modal-back:not(.tour-host):not(.closing)")].pop();
  const x = m && m.querySelector("[data-close]");
  if (x) x.click();
};
const dmTab = name => { const b = $(`.tabs [data-tab="${name}"]`); if (b && b.getAttribute("aria-selected") !== "true") b.click(); };
const pTab = name => { const b = $(`.tabbar [data-ptab="${name}"]`); if (b && b.getAttribute("aria-selected") !== "true") b.click(); };
const firstPC = () => [...document.querySelectorAll("#tableView .card")].find(c => !c.querySelector('[data-act="hide"]'));
const firstFoe = () => [...document.querySelectorAll("#tableView .card")].find(c => c.querySelector('[data-act="hide"]'));
/* Desplegar una tarjeta y, al salir, plegarla si estaba plegada */
const unfold = card => {
  if (!card || card.querySelector(".detail")) return null;
  const id = card.dataset.id;
  card.querySelector('[data-act="fold"]').click();
  return () => { const n = $(`#tableView .card[data-id="${id}"]`); if (n && n.querySelector(".detail")) n.querySelector('[data-act="fold"]').click(); };
};
/* Abrir una ventana con un botón y cerrarla al salir */
const opens = (sel, pre) => async () => {
  if (pre) await pre();
  if (!click(sel)) return null;
  await later(120);
  return closeModal;
};
const wide = () => innerWidth > 1080;

/* Las fichas de ejemplo (ver tour-example.js): se encienden en la pantalla
   del DM y se apagan al salir del paso. after abre algo sobre ellas. */
const EX_PC = '#tableView .card[data-id="tour-ex-pc"]';
const EX_FOE = '#tableView .card[data-id="tour-ex-foe"]';
const withExample = (opts = {}, after = null) => async () => {
  dmTab("mesa");
  const dm = await import("./dm.js");
  dm.tourExample(true, { open: "", ...opts });
  await later(90);
  let close = null;
  if (after) close = await after();
  return async () => { if (close) await close(); dm.tourExample(false); };
};
const openOn = sel => async () => {
  if (!click(sel)) return null;
  await later(140);
  return closeModal;
};

export const SCENES = {
  /* DM */
  "dm.table": () => { dmTab("mesa"); },
  /* Mejor alguien que lance conjuros: así se ven también sus espacios */
  "dm.card": async () => {
    dmTab("mesa");
    const { store } = await import("./net.js");
    const caster = ((store.doc && store.doc.chars) || []).find(c => c.kind === "pc" && (c.slots || []).some(n => n > 0));
    return unfold((caster && $(`#tableView .card[data-id="${caster.id}"]`)) || firstPC());
  },
  "dm.foe": () => { dmTab("mesa"); return unfold(firstFoe()); },
  "dm.builder": async () => {
    if (!click("#addBtn")) return null;
    await later(150);
    return () => { const x = $(".builder-back [data-close]"); if (x) x.click(); };
  },
  "dm.editor": opens("#tableView .card [data-act=edit]", () => dmTab("mesa")),
  "dm.attack": opens("#tableView .card [data-act=attack]", () => dmTab("mesa")),
  "dm.spells": async () => {
    dmTab("mesa");
    const { store } = await import("./net.js");
    const who = ((store.doc && store.doc.chars) || []).find(c => c.kind === "pc" && (c.spellbook || []).length);
    const btn = (who && $(`#tableView .card[data-id="${who.id}"] [data-act=spells]`)) || $("#tableView .card [data-act=spells]");
    if (!btn) return null;
    btn.click();
    await later(120);
    return closeModal;
  },
  "dm.conditions": opens("#tableView .card [data-act=conditions]", () => dmTab("mesa")),
  "dm.bestiary": async () => {
    if ($("#drawer")) return null;
    click("#bestiaryBtn");
    await later(120);
    return () => click('#drawer [data-beast="close"]');
  },
  /* Con las fichas de ejemplo */
  "dm.ex": withExample(),
  "dm.excard": withExample({ open: "pc" }),
  "dm.exfoe": withExample({ open: "foe" }),
  "dm.exeditor": withExample({}, openOn(`${EX_PC} [data-act=edit]`)),
  "dm.exconditions": withExample({}, openOn(`${EX_PC} [data-act=conditions]`)),
  "dm.exattack": withExample({}, openOn(`${EX_PC} [data-act=attack]`)),
  "dm.exspells": withExample({}, openOn(`${EX_PC} [data-act=spells]`)),
  "dm.exrail": withExample({ turn: 0 }),
  "dm.exturn": withExample({ turn: 1 }),
  /* El mapa como lo ve la party */
  "dm.preview": async () => {
    dmTab("mapa");
    await later(150);
    const dm = await import("./dm.js");
    dm.tourPartyPreview(true);
    return () => dm.tourPartyPreview(false);
  },
  /* Combate: solo se abre la lista si no hay uno en marcha (el mismo botón lo terminaría) */
  "dm.roster": withExample({}, async () => {
    const b = $("#combatBtn");
    if (!b || b.classList.contains("on")) return null;
    b.click();
    await later(140);
    return closeModal;
  }),

  "dm.dock": () => {
    const dock = $("#dock");
    if (!dock) return null;
    const toggle = dock.querySelector("[data-toggle]");
    if (wide() && dock.classList.contains("collapsed")) { toggle.click(); return () => { const d = $("#dock"); if (d && !d.classList.contains("collapsed")) d.querySelector("[data-toggle]").click(); }; }
    if (!wide() && !dock.classList.contains("open")) { toggle.click(); return () => { const d = $("#dock"); if (d && d.classList.contains("open")) d.querySelector("[data-toggle]").click(); }; }
    return null;
  },
  "dm.map": () => {
    dmTab("mapa");
    if ($(".map-wrap.bar-hidden")) { click('[data-map="showBar"]'); return () => click('[data-map="hideBar"]'); }
    return null;
  },
  "dm.mapsettings": opens('[data-map="settings"]', async () => { dmTab("mapa"); await later(150); }),
  "dm.rest": opens("#restBtn"),
  "dm.presence": opens("#presence"),
  "dm.menu": opens("#moreBtn"),
  "dm.shelf": () => {
    const s = $(".shelf");
    if (!s || s.dataset.open === "1") return null;
    click(".shelf-toggle");
    return () => click('.shelf [data-shelf="hide"]');
  },
  "dm.book": async () => {
    const s = $(".shelf");
    const wasClosed = s && s.dataset.open !== "1";
    if (wasClosed) click(".shelf-toggle");
    if (!click('[data-book="b-conjuros"]')) return null;
    await later(1100);
    return async () => {
      click('.tome [data-t="close"]');
      await later(150);
      if (wasClosed) click('.shelf [data-shelf="hide"]');
    };
  },
  /* Jugador */
  "pl.sheet": () => { pTab("ficha"); },
  "pl.party": () => { pTab("party"); },
  "pl.map": () => { pTab("mapa"); },
  "pl.dice": () => { pTab("dados"); },
  "pl.attack": opens('.action-grid [data-act="attack"]', () => pTab("ficha")),
  "pl.spells": opens('.action-grid [data-act="spells"]', () => pTab("ficha")),
  /* Entrada */
  "gate.dm": () => {
    const prev = ($("[data-role][aria-pressed=true]") || {}).dataset;
    click('[data-role="dm"]');
    return () => prev && click(`[data-role="${prev.role}"]`);
  },
  "gate.player": () => {
    const prev = ($("[data-role][aria-pressed=true]") || {}).dataset;
    click('[data-role="player"]');
    return () => prev && click(`[data-role="${prev.role}"]`);
  }
};

const S = (t, es, en, scene) => ({ t, es, en, ...(scene !== undefined ? { scene } : {}) });
const sec = (id, icon, es, en, scene, steps) => ({ id, icon, es, en, scene, steps });

/* ======================================================================
   DM
   ====================================================================== */
const DM = {
  id: "dm", role: "dm", icon: "crown", label: ["DM", "DM"],
  where: ["la pantalla del DM", "the DM screen"],
  intro: ["Todo lo que puedes hacer como DM, pantalla por pantalla: la mesa, las fichas, el combate, el mapa, la biblioteca y cómo llevar a tus jugadores.",
    "Everything you can do as the DM, screen by screen: the table, sheets, combat, the map, the library and how to run your players."],
  invite: ["Un recorrido guiado por cada botón de la pantalla del DM, en secciones. Puedes saltar a la parte que te interese.",
    "A guided tour of every button on the DM screen, in sections. Jump to whichever part you need."],
  sections: [
    sec("inicio", "info", ["Primeros pasos", "La cabecera y cómo usar este tutorial"], ["First steps", "The header and how to use this tutorial"], "dm.table", [
      S(null, ["Bienvenida a Mesa", "Mesa lleva la partida en tres pantallas: la tuya, la del DM; el móvil de cada jugador; y la tele o el proyector de la mesa. Lo que cambias aquí llega al momento a los demás, y cada uno ve solo lo que debe ver.\nEl tutorial va por secciones. **Siguiente** avanza, **Índice** salta a cualquier parte o busca un control, y también valen las flechas [[←]] [[→]]. [[Esc]] lo cierra."],
        ["Welcome to Mesa", "Mesa runs the game on three screens: yours, the DM's; each player's phone; and the table's TV or projector. What you change here reaches everyone instantly, and each person only sees what they should.\nThe tutorial goes in sections. **Next** moves on, **Index** jumps anywhere or finds a control, and the [[←]] [[→]] arrow keys work too. [[Esc]] closes it."]),
      S("#campaign", ["El nombre de la campaña", "Escribe aquí el nombre de tu partida. Sale en la entrada, en los móviles y en la tele."],
        ["The campaign name", "Type your game's name here. It appears on the entrance screen, the phones and the TV."]),
      S(".topbar .tabs", ["La mesa y el mapa", "Dos pestañas. **La mesa** reúne las fichas de personajes y enemigos; **Mapa** es el tablero con muros, niebla y fichas. Cambia cuando quieras: no se pierde nada."],
        ["The table and the map", "Two tabs. **The table** gathers the character and enemy cards; **Map** is the board with walls, fog and tokens. Switch whenever you like: nothing is lost."]),
      S("#presence", ["Quién está conectado", "El punto verde dice que estás conectado y el número, cuánta gente hay en la mesa. Al pulsarlo ves quién lleva cada personaje y puedes liberarlo, expulsar a alguien o cerrar la mesa. Tiene su sección: «Gestionar la mesa»."],
        ["Who is connected", "The green dot says you are online and the number how many people are at the table. Click it to see who plays each character, free a character, kick someone or lock the table. It has its own section: “Running the table”."]),
      S(".topbar .voice:not(.hidden)", ["Voz", "Abre una llamada de voz con la mesa, de aparato a aparato. Dentro ves quién habla, silencias tu micro o sales. (En la versión de prueba no está.)"],
        ["Voice", "Opens a voice call with the table, device to device. Inside you see who is talking, mute your mic or leave. (Not available in the demo.)"]),
      S("#undoBtn", ["Deshacer", "Deshace el último cambio de la partida; también con [[Ctrl]]+[[Z]]. Se guardan los veinte últimos, así que un daño mal apuntado o un borrado por error se arreglan en un segundo. Lo escrito en la biblioteca no se deshace."],
        ["Undo", "Undoes the last change to the game; also [[Ctrl]]+[[Z]]. The last twenty are kept, so a wrong damage entry or an accidental deletion is fixed in a second. What you write in the library is never undone."]),
      S("#moreBtn", ["Más opciones", "El menú de la partida: la pantalla de la tele, cómo entran tus jugadores, enseñar una imagen, pedir una tirada, guardar y cargar copias, el idioma y salir. Lo verás en «Gestionar la mesa»."],
        ["More options", "The game menu: the TV screen, how your players join, showing a picture, asking for a roll, saving and loading backups, the language and leaving. Covered in “Running the table”."]),
      S(".topbar .tour-btn", ["Este tutorial", "Siempre está aquí. En el índice vuelves a cualquier sección, ves cuáles has terminado y buscas un control por su nombre."],
        ["This tutorial", "It is always here. In the index you go back to any section, see which ones you have finished and search for a control by name."])
    ]),

    sec("personajes", "userPlus", ["Crear personajes", "El creador paso a paso, el azar y la ficha completa"], ["Creating characters", "The step-by-step builder, random characters and the full sheet"], "dm.table", [
      S("#addBtn", ["Añadir personaje", "Abre el **creador paso a paso**: clase, especie, características, trasfondo, conjuros (si los lanza), equipo y resumen. Al terminar, el personaje se sienta en la mesa y en el mapa. Atajo: [[Ctrl]]+[[N]]."],
        ["Add character", "Opens the **step-by-step builder**: class, species, abilities, background, spells (if a caster), equipment and summary. When done, the character joins the table and the map. Shortcut: [[Ctrl]]+[[N]]."]),
      S(".builder .bd-steps", ["Los pasos", "Arriba, los pasos: los ya vistos llevan una marca y puedes volver a cualquiera pulsándolo. Abajo, **Atrás** y **Siguiente**; si falta algo para seguir, se dice al lado del botón."],
        ["The steps", "At the top, the steps: those you have seen get a tick and you can go back to any by clicking it. At the bottom, **Back** and **Next**; if something is missing, it is said next to the button."], "dm.builder"),
      S(".builder [data-random]", ["Al azar, dentro del creador", "Rellena todo con un personaje coherente (características según la clase, habilidades, conjuros, equipo y un nombre a juego) y te deja en el resumen para cambiar lo que quieras antes de crearlo."],
        ["Random, inside the builder", "Fills everything with a sensible character (abilities by class, skills, spells, equipment and a fitting name) and leaves you on the summary to change anything before creating it."], "dm.builder"),
      S(".builder [data-manual]", ["Rellenar la ficha a mano", "Para un PNJ rápido o un personaje que ya tienes en papel: abre la ficha completa en blanco."],
        ["Fill in the sheet by hand", "For a quick NPC or a character you already have on paper: opens the full blank sheet."], "dm.builder"),
      S("#randomBtn", ["Al azar, en un clic", "Crea un personaje entero de nivel 1 sin preguntar nada y lo coloca en el mapa, en la primera casilla libre junto a la party. Para un PNJ improvisado o un jugador que llega tarde."],
        ["Random, in one click", "Creates a whole level 1 character without asking anything and places it on the map, on the first free square next to the party. For an improvised NPC or a latecomer."]),
      S(`${EX_PC} [data-act=edit]`, ["Editar una ficha", "Para enseñártelo con algo delante, el tutorial pone en tu mesa a **Brisa**, una clériga de ejemplo (y más adelante a un goblin). Solo la ves tú, se va al cerrar el tutorial y nada de lo que hagas con ella cambia la partida.\nEl **lápiz** de cada tarjeta abre su ficha completa. Cada jugador puede editar también la suya desde el móvil."],
        ["Edit a sheet", "To show you with something on screen, the tutorial puts **Brisa**, an example cleric, on your table (and a goblin later on). Only you see her, she leaves when the tutorial closes, and nothing you do with her changes the game.\nThe **pencil** on each card opens its full sheet. Each player can also edit their own from their phone."], "dm.ex"),
      S(".modal fieldset", ["Dentro de la ficha", "Esta es la ficha de Brisa. Va por bloques:\n- **Quién es**: nombre, clase, especie, nivel, jugador, color\n- **En combate**: vida, CA, velocidad, iniciativa, dados de golpe\n- **Ataques**: se escriben una vez y se tiran con un clic; Brisa lleva una Maza (+3 al ataque, 1d6+1 contundente)\n- **Características**, **espacios de conjuro** (4 de nivel 1 y 2 de nivel 2), **recursos propios**, **equipo**, **rasgos**, **conjuros** y **notas**\n**Guardar** aplica los cambios; **Cancelar** o cerrar los descarta."],
        ["Inside the sheet", "This is Brisa's sheet. It goes in blocks:\n- **Identity**: name, class, species, level, player, colour\n- **In combat**: hit points, AC, speed, initiative, hit dice\n- **Attacks**: written once, rolled with one click; Brisa carries a Mace (+3 to hit, 1d6+1 bludgeoning)\n- **Abilities**, **spell slots** (4 at level 1 and 2 at level 2), **own resources**, **equipment**, **features**, **spells** and **notes**\n**Save** applies the changes; **Cancel** or closing discards them."], "dm.exeditor")
    ]),

    sec("tarjetas", "users", ["Las tarjetas de la mesa", "Vida, daño, estados y lo que dice cada tarjeta"], ["The table cards", "Hit points, damage, conditions and what each card shows"], "dm.ex", [
      S("#tableView .band", ["El resumen", "Cuántos personajes hay, cuánta vida les queda en pie, cuántos han caído y, si hay enemigos, la **dificultad del encuentro** según las reglas de PX. (Las fichas de ejemplo del tutorial no cuentan aquí.)"],
        ["The summary", "How many characters there are, how many hit points are still standing, how many are down and, with enemies, the **encounter difficulty** by the XP rules. (The tutorial's example sheets do not count here.)"]),
      S(EX_PC, ["Una tarjeta", "Cada personaje tiene la suya. La de Brisa, la clériga de ejemplo, dice:\n- **17 / 24**: puntos de golpe actuales y máximos, y **+4 temporales**\n- **CA 16**, en el escudo de la derecha\n- la **barra de vida**, que cambia de color al bajar\nLa etiqueta de arriba solo sale en el ejemplo."],
        ["A card", "Every character has one. Brisa's, the example cleric, says:\n- **17 / 24**: current and maximum hit points, plus **+4 temporary**\n- **AC 16**, on the shield to the right\n- the **health bar**, which changes colour as it drops\nThe label on top only appears on the example."]),
      S(`${EX_PC} .acts`, ["Los botones de arriba", "- **Liberar** (el eslabón): a Brisa la lleva un jugador, Lu; liberarla la deja libre para otro\n- **Lápiz**: editar la ficha\n- **Equis**: quitarla de la mesa (pide confirmación)\n- **Flecha**: desplegar la ficha completa\nLos enemigos tienen además el **ojo** (ocultarlo a la party) y **duplicar**."],
        ["The top buttons", "- **Release** (the link): Brisa is played by Lu; releasing frees her for someone else\n- **Pencil**: edit the sheet\n- **Cross**: remove from the table (asks first)\n- **Arrow**: unfold the full sheet\nEnemies also have the **eye** (hide from the party) and **duplicate**."]),
      S(`${EX_PC} .dealer`, ["Daño y curación", "Escribe una cantidad y pulsa **−** para restar vida o **+** para curar; con la casilla vacía van de uno en uno. En la casilla, [[Intro]] aplica daño y [[Mayús]]+[[Intro]] cura. **Temp** da vida temporal.\nEjemplo: Brisa tiene 4 temporales; un golpe de **5** se come primero esos 4 y luego 1 de vida, y se queda en 16. Como está concentrada, salta el aviso de la salvación con la CD ya calculada (10, o la mitad del daño si es mayor)."],
        ["Damage and healing", "Type an amount and press **−** to deal damage or **+** to heal; with the box empty they go one by one. In the box, [[Enter]] deals damage and [[Shift]]+[[Enter]] heals. **Temp** grants temporary hit points.\nExample: Brisa has 4 temporary; a **5** damage hit eats those 4 first and then 1 real point, leaving her at 16. Since she is concentrating, the save prompt appears with the DC worked out (10, or half the damage if higher)."]),
      S(`${EX_PC} [data-act=conditions]`, ["Estados", "Los estados del reglamento (cegado, apresado, envenenado…), el agotamiento y la concentración. Salen como etiqueta en la tarjeta (púlsala para quitarlo) y como marca en su ficha del mapa.\nEjemplo: Brisa está **envenenada 2 rondas** («Envenenado 2r»): al acabar cada turno suyo la cuenta baja y el estado se cae solo."],
        ["Conditions", "The rulebook conditions (blinded, grappled, poisoned…), exhaustion and concentration. They show as a tag on the card (click it to remove) and as a badge on its map token.\nExample: Brisa is **poisoned for 2 rounds** (“Poisoned 2r”): at the end of each of her turns the count drops and the condition ends by itself."]),
      S(".modal .cond-list", ["La ventana de estados", "Marca los estados que tenga y, si duran un tiempo, escribe las **rondas** (en blanco, hasta que se lo quiten). Pasa el ratón por uno para leer qué hace. Abajo, el **agotamiento** (0 a 6) y en qué está **concentrado**. En Brisa: Envenenado con 2 rondas y concentrada en Bendecir."],
        ["The conditions window", "Tick the conditions it has and, if they last a while, type the **rounds** (blank means until removed). Hover over one to read what it does. Below, **exhaustion** (0 to 6) and what it is **concentrating** on. For Brisa: Poisoned for 2 rounds and concentrating on Bless."], "dm.exconditions"),
      S(`${EX_PC} [data-act=attack]`, ["Atacar y conjuros", "**Atacar** abre sus ataques con el objetivo, la ventaja y los extras; **Conjuros** abre su lista para lanzarlos. Los dos se ven abiertos, con Brisa, en «Combate»."],
        ["Attack and spells", "**Attack** opens its attacks with the target, advantage and extras; **Spells** opens its list to cast them. Both are shown open, with Brisa, in “Combat”."]),
      S(`${EX_PC} [data-act=target]`, ["Apuntar", "Marca a este personaje como **objetivo**: los ataques que abras después lo traen ya elegido. Ejemplo: apunta al goblin y, al pulsar Atacar en cualquier ficha, ya sale como objetivo. En el mapa, [[Ctrl]]+clic sobre una ficha hace lo mismo."],
        ["Target", "Marks this character as the **target**: attacks you open next have it preselected. Example: target the goblin and when you press Attack on any sheet it is already chosen. On the map, [[Ctrl]]+click on a token does the same."]),
      S(`${EX_PC} .meta`, ["Etiquetas", "Lo que conviene ver de un vistazo. En Brisa:\n- **Iniciativa 14** y **Velocidad 30**\n- **Concentrado en Bendecir · tirar**: púlsala para la salvación de concentración\n- **Envenenado 2r**: el estado y las rondas que le quedan\n- **Inspiración**, quién la lleva (**Lu**, en verde si está conectado) y **En el mapa**"],
        ["Tags", "What is worth seeing at a glance. On Brisa:\n- **Initiative 14** and **Speed 30**\n- **Concentrating on Bless · roll**: click it for the concentration save\n- **Poisoned 2r**: the condition and its remaining rounds\n- **Inspiration**, who plays her (**Lu**, green when online) and **On the map**"])
    ]),

    sec("ficha", "shield", ["La ficha desplegada", "Tiradas, espacios, muerte, pestañas y efectos"], ["The unfolded sheet", "Rolls, slots, death saves, tabs and effects"], "dm.excard", [
      S(`${EX_PC} .detail .abilities`, ["Características", "Al desplegar la tarjeta (la flecha) sale la ficha entera; aquí, la de Brisa. Pulsa una característica para hacer la prueba con su modificador: Brisa tiene **Sabiduría 16**, así que su prueba es 1d20+3. Con el teclado: [[Mayús]] ventaja, [[Ctrl]] desventaja y [[Alt]] en secreto. (Las tiradas del ejemplo solo salen en tu registro, como secretas.)"],
        ["Abilities", "Unfolding the card (the arrow) shows the whole sheet; here, Brisa's. Click an ability to roll the check with its modifier: Brisa has **Wisdom 16**, so her check is 1d20+3. With the keyboard: [[Shift]] advantage, [[Ctrl]] disadvantage and [[Alt]] secret. (Rolls from the example only reach your log, as secret.)"]),
      S(`${EX_PC} .detail > .row`, ["Tiradas rápidas", "- **Iniciativa**: la tira y la apunta en la tarjeta\n- **Salvación…** y **Habilidad…**: eliges cuál, ya con la competencia sumada (Brisa es competente en Sabiduría y Carisma)\n- **Inspiración**: la da o la quita\n- **Dado de golpe (2)**: cura un d8 más la Constitución; le quedan 2 de 3 porque ya gastó uno"],
        ["Quick rolls", "- **Initiative**: rolls it and records it on the card\n- **Save…** and **Skill…**: pick which one, proficiency included (Brisa is proficient in Wisdom and Charisma)\n- **Inspiration**: grants or removes it\n- **Hit die (2)**: heals a d8 plus Constitution; she has 2 of 3 left because she spent one"]),
      S(`${EX_PC} .detail .slots`, ["Espacios y recursos", "Cada cuadradito es un espacio de conjuro: Brisa tiene **4 de nivel 1** (uno ya gastado, en gris) y **2 de nivel 2**. Pulsa uno para gastarlo; al pasar del máximo vuelven todos. Los recursos propios funcionan igual: **Canalizar divinidad 1/1**."],
        ["Slots and resources", "Each little square is a spell slot: Brisa has **4 at level 1** (one already spent, greyed out) and **2 at level 2**. Click one to spend it; past the maximum they all come back. Own resources work the same: **Channel Divinity 1/1**."]),
      S(`${EX_PC} .detail .deaths`, ["Salvaciones de muerte", "Para cuando un personaje cae a 0. Brisa lleva **1 éxito y 1 fallo** (en el ejemplo, para que los veas marcados). Márcalos a mano o pulsa **Tirar salvación de muerte**: con 10 o más es un éxito, un 20 natural la levanta con 1 PV y un 1 cuenta como dos fallos. Tres éxitos, estable; tres fallos, muerta."],
        ["Death saves", "For when a character drops to 0. Brisa has **1 success and 1 failure** (in the example, so you see them ticked). Tick them by hand or press **Roll death save**: 10 or more is a success, a natural 20 brings her back with 1 HP and a 1 counts as two failures. Three successes, stable; three failures, dead."]),
      S(`${EX_PC} .detail .sheet-tabs`, ["Las pestañas de la ficha", "- **Acciones**: sus ataques (en Brisa, la Maza: toca **+3** para el ataque o **1d6+1** para el daño), las acciones de combate con su regla y los efectos\n- **Conjuros**: Llama sagrada, Bendecir, Curar heridas…\n- **Equipo**, **Rasgos** (Canalizar divinidad, Visión en la oscuridad) y **Notas**\nCualquier fórmula de un texto sale subrayada y se tira con un clic."],
        ["The sheet tabs", "- **Actions**: its attacks (for Brisa, the Mace: tap **+3** for the attack or **1d6+1** for damage), combat actions with their rule, and effects\n- **Spells**: Sacred Flame, Bless, Cure Wounds…\n- **Equipment**, **Features** (Channel Divinity, Darkvision) and **Notes**\nAny formula in a text is underlined and rolls with one click."]),
      S(`${EX_PC} .detail .buffs`, ["Efectos activos", "Brisa tiene **Bendecir** encendido: mientras lo esté, sus ataques y sus salvaciones suman 1d4 solos (la tirada lo dice: «· Bendecir»). Hay más listos (Perdición, Guía, Furia, Marca del cazador…) y se pueden crear a medida. Un toque los apaga sin borrarlos."],
        ["Active effects", "Brisa has **Bless** switched on: while it is, her attacks and saves add 1d4 by themselves (the roll says so: “· Bless”). More are ready (Bane, Guidance, Rage, Hunter's Mark…) and you can make custom ones. One tap switches them off without deleting them."])
    ]),

    sec("enemigos", "skull", ["Enemigos y bestiario", "Buscar criaturas, meterlas en el encuentro y crear las tuyas"], ["Enemies and bestiary", "Finding creatures, adding them to the encounter and making your own"], "dm.bestiary", [
      S("#bestiaryBtn", ["El bestiario", "Más de cien criaturas del SRD listas para la mesa, y las que crees tú. Atajo: [[Ctrl]]+[[B]]."],
        ["The bestiary", "Over a hundred SRD creatures ready for the table, plus the ones you create. Shortcut: [[Ctrl]]+[[B]]."], "dm.table"),
      S("#drawer .drawer-search", ["Buscar y filtrar", "Busca por nombre (también en inglés: «owlbear» encuentra al oso lechuza) y filtra por **tipo** y por **valor de desafío**, para preparar un encuentro a la medida de la party."],
        ["Search and filter", "Search by name (Spanish or English) and filter by **type** and **challenge rating**, to build an encounter that fits the party."]),
      S("#drawer .beast", ["Cada criatura", "Nombre, tipo, CA, vida y VD con sus PX. **Ficha** despliega el bloque completo, con las fórmulas listas para tirar."],
        ["Each creature", "Name, type, AC, hit points and CR with its XP. **Stat block** unfolds the full block, with formulas ready to roll."]),
      S("#drawer .beast .go", ["Al combate", "Elige **cuántas** y si llevan **PV al azar** (para que dos goblins no aguanten lo mismo) y pulsa **Al combate**: entran en la mesa con nombres correlativos y su iniciativa tirada; luego pulsa una casilla del mapa para colocarlas. El lápiz edita la criatura y la equis devuelve tu versión a la de serie o borra una propia."],
        ["Into combat", "Choose **how many** and whether they get **random HP** (so two goblins don't last the same) and press **Into combat**: they join the table with numbered names and rolled initiative; then click a map square to place them. The pencil edits the creature and the cross restores the stock version or deletes your own."]),
      S('#drawer [data-beast="new"]', ["Crear una criatura", "Tu propio monstruo: retrato, tamaño, VD, CA, vida, características, sentidos, idiomas, resistencias, rasgos y acciones. Escribe los ataques como «+4 al ataque — 1d6+2 cortante» para poder tirarlos."],
        ["Create a creature", "Your own monster: portrait, size, CR, AC, hit points, abilities, senses, languages, resistances, traits and actions. Write attacks like “+4 to hit — 1d6+2 slashing” so they can be rolled."]),
      S(EX_FOE, ["Los enemigos en la mesa", "Salen bajo **Enemigos**. Ejemplo: el **Goblin** tiene 4 de 7 PV; desplegado, su ficha de monstruo trae las acciones listas para tirar (Cimitarra, Arco corto). El **ojo** lo oculta a la party (para emboscadas), **duplicar** crea otro igual y **Retirar monstruos** los quita a todos al acabar. La party solo ve lo herido que parece, nunca su vida ni su CA."],
        ["Enemies at the table", "They appear under **Enemies**. Example: the **Goblin** has 4 of 7 HP; unfolded, its stat block has the actions ready to roll (Scimitar, Shortbow). The **eye** hides it from the party (for ambushes), **duplicate** makes another and **Clear monsters** removes them all afterwards. The party only sees how hurt it looks, never its HP or AC."], "dm.exfoe")
    ]),

    sec("combate", "swords", ["Combate", "Iniciativa, turnos, ataques y conjuros"], ["Combat", "Initiative, turns, attacks and spells"], "dm.table", [
      S("#combatBtn", ["Iniciar combate", "Abre la lista de **quién entra**: la party y las criaturas que la party ya ha visto y están cerca. El mismo botón termina el combate. Atajo: [[Ctrl]]+[[K]]."],
        ["Start combat", "Opens the list of **who joins**: the party and the creatures the party has already seen nearby. The same button ends combat. Shortcut: [[Ctrl]]+[[K]]."]),
      S(".modal .pick-list", ["Quién entra", "Quita o añade a quien quieras, escribe la iniciativa a mano o tírala: **Tirar por todos** o **solo por las criaturas** (las suyas se tiran en secreto). **Empezar** ordena a todos por iniciativa. Aquí salen también Brisa y el goblin de ejemplo, con su iniciativa (14 y 12): Brisa iría primero. (Si ya hay un combate en marcha, esta ventana no se abre aquí.)"],
        ["Who joins", "Remove or add anyone, type initiative by hand or roll it: **Roll for everyone** or **only for creatures** (theirs are rolled in secret). **Start** sorts everyone by initiative. Brisa and the example goblin appear here too, with their initiative (14 and 12): Brisa would go first. (If a combat is already running, this window is not opened here.)"], "dm.roster"),
      S("#rail:not(.hidden)", ["La barra de turnos", "Si no hay un combate en marcha, el tutorial enseña uno de ejemplo (solo lo ves tú). Durante el combate sale arriba:\n- la **ronda** y el **orden**: pulsa a alguien para darle el turno, arrástralo para reordenar y su equis lo saca del combate\n- **Siguiente turno** ([[Espacio]], [[Intro]] o [[Ctrl]]+[[→]]) y el anterior ([[Ctrl]]+[[←]])\n- lo que le queda a quien juega: **acción**, **adicional**, **reacción** y los **pies** de movimiento\n- **Atacar**, **Retrasar**, **Tirar iniciativa** y **Añadir al combate**\nEn el ejemplo: ronda 2, le toca a **Brisa**, que ya ha gastado su **acción** y ha andado 10 de sus 30 pies; después va el goblin."],
        ["The turn bar", "If no combat is running, the tutorial shows an example one (only you see it). During combat it sits at the top:\n- the **round** and the **order**: click someone to give them the turn, drag to reorder, and their cross removes them from combat\n- **Next turn** ([[Space]], [[Enter]] or [[Ctrl]]+[[→]]) and the previous one ([[Ctrl]]+[[←]])\n- what the active creature has left: **action**, **bonus**, **reaction** and **feet** of movement\n- **Attack**, **Delay**, **Roll initiative** and **Add to combat**\nIn the example: round 2, it is **Brisa**'s turn, she has already used her **action** and walked 10 of her 30 feet; the goblin goes next."], "dm.exrail"),
      S("#rail:not(.hidden)", ["Al pasar turno", "Así queda el ejemplo tras pulsar **Siguiente turno**: le toca al **goblin**, con su acción y sus 30 pies enteros, y el veneno de Brisa ha bajado de 2 a **1 ronda** al acabar su turno. En una partida de verdad, además, se salta a los monstruos caídos y al jugador le llega al móvil «Es tu turno»."],
        ["When the turn passes", "This is the example after pressing **Next turn**: it is the **goblin**'s turn, with its action and full 30 feet, and Brisa's poison went down from 2 to **1 round** at the end of her turn. In a real game, fallen monsters are also skipped and the player's phone says “It's your turn”."], "dm.exturn"),
      S(".modal", ["La ventana de ataque", "Los ataques de Brisa. Arriba eliges el **objetivo** (aquí, el **Goblin (ejemplo)**; con la distancia si están en el mapa) y cómo se tira; debajo, «Se suma: **Bendecir**», porque lo tiene encendido. Al pulsar la **Maza**, el servidor tira 1d20+3+1d4, lo compara con la CA 15 del goblin y, si impacta, le resta el daño. A un pícaro le sale **Ataque furtivo**, a un paladín **Castigo divino**, y cualquiera puede sumar **daño extra**. (Con el ejemplo no se ataca de verdad.)"],
        ["The attack window", "Brisa's attacks. At the top you pick the **target** (here, the **Goblin (example)**; with the distance if they are on the map) and how to roll; below, “Adds: **Bless**”, since it is on. Pressing the **Mace**, the server rolls 1d20+3+1d4, compares it with the goblin's AC 15 and, on a hit, subtracts the damage. A rogue gets **Sneak Attack**, a paladin **Divine Smite**, and anyone can add **extra damage**. (With the example nothing really attacks.)"], "dm.exattack"),
      S(".modal", ["Lanzar conjuros", "Los conjuros de Brisa, por nivel, con su CD y su ataque de conjuro calculados de su Sabiduría, y los espacios que le quedan. **Lanzar** gasta el espacio y tira el ataque o las salvaciones de los objetivos y el daño: Llama sagrada pide una salvación de Destreza; Curar heridas cura 1d8 más su Sabiduría. Los de área se colocan en el mapa como plantilla y dicen a quién cogen. Se añaden más desde la biblioteca del SRD."],
        ["Casting spells", "Brisa's spells, by level, with her DC and spell attack worked out from her Wisdom, and the slots she has left. **Cast** spends the slot and rolls the attack or the targets' saves and the damage: Sacred Flame asks for a Dexterity save; Cure Wounds heals 1d8 plus her Wisdom. Area spells are placed on the map as a template and say who they catch. More are added from the SRD library."], "dm.exspells")
    ]),

    sec("dados", "dice", ["Dados y charla", "Tirar, el registro, hablar y susurrar"], ["Dice and chat", "Rolling, the log, talking and whispering"], "dm.dock", [
      S("#dock .dice-pad", ["Dados rápidos", "Un toque tira ese dado; **2d20** tira dos a la vez."],
        ["Quick dice", "One tap rolls that die; **2d20** rolls two at once."]),
      S("#dock .roll-opts .adv", ["Cómo se tira", "**Desventaja**, **Normal** o **Ventaja** para tus tiradas. Y sin tocar nada, al pulsar cualquier tirada de la app: [[Mayús]] ventaja, [[Ctrl]] desventaja y [[Alt]] en secreto."],
        ["How to roll", "**Disadvantage**, **Normal** or **Advantage** for your rolls. And without touching anything, when you click any roll in the app: [[Shift]] advantage, [[Ctrl]] disadvantage and [[Alt]] secret."]),
      S("#dock [data-secret]", ["Tirada secreta", "Encendida, lo que tiras solo lo ves tú: ni los jugadores ni la tele."],
        ["Secret roll", "When on, what you roll is seen only by you: not the players, not the TV."]),
      S("#dock .dice-form", ["Cualquier fórmula", "Escribe «1d20+5», «2d6+3» o «8d6» y pulsa **Tirar**."],
        ["Any formula", "Type “1d20+5”, “2d6+3” or “8d6” and press **Roll**."]),
      S("#dock .log-tabs", ["El registro", "Todo lo que se tira y se dice queda aquí para todos, salvo lo secreto. Filtra por **Todo**, **Tiradas** o **Charla**; los críticos y las pifias se marcan."],
        ["The log", "Everything rolled and said stays here for everyone, except secrets. Filter by **All**, **Rolls** or **Chat**; criticals and fumbles are marked."]),
      S("#dock .chat-form", ["Hablar y susurrar", "Escribe a toda la mesa. El **bocadillo** abre la lista para **susurrar**: marca a uno o a varios y solo ellos lo leen. Un susurro nunca sale en la tele."],
        ["Talk and whisper", "Write to the whole table. The **speech bubble** opens the list to **whisper**: tick one or several people and only they read it. A whisper never shows on the TV."]),
      S("#dock [data-clear]", ["Vaciar el registro", "Borra el registro para empezar la sesión limpio."],
        ["Clear the log", "Wipes the log to start the session clean."]),
      S("#dock [data-toggle]", ["Plegar el panel", "En el ordenador lo pliega en una tira a la derecha y la mesa o el mapa ganan ese ancho; si llega algo nuevo, la tira lo marca con un punto. En pantallas estrechas abre y cierra el panel desde abajo."],
        ["Fold the panel", "On a computer it folds into a strip on the right and the table or map gains that width; new messages light a dot on the strip. On narrow screens it opens and closes the panel from the bottom."])
    ]),

    sec("mapa", "map", ["El mapa: moverse", "Elegir mapa, mover fichas, zoom y la barra"], ["The map: getting around", "Choosing a map, moving tokens, zoom and the toolbar"], "dm.map", [
      S("#mapPick", ["El mapa activo", "El que ven todos. Se crean más desde **Ajustes del mapa**."],
        ["The active map", "The one everybody sees. Create more from **Map settings**."]),
      S("#board", ["El tablero", "Rueda del ratón para acercar o alejar; botón derecho o central arrastrando para moverte; en el móvil, dos dedos. Abajo a la izquierda se ve la casilla que hay bajo el puntero."],
        ["The board", "Mouse wheel to zoom; right or middle button drag to pan; on a phone, two fingers. The bottom-left corner shows the square under the pointer."]),
      S('[data-tool="token"]', ["Fichas", "La herramienta normal:\n- **arrastra** una ficha para moverla (se pinta su alcance)\n- un **recuadro** elige varias para moverlas juntas\n- **pulsa una ficha** para su menú: apuntarle, atacar, estados, abrir la ficha, ocultarla, centrar en ella la cámara de la party o sacarla del mapa\n- **pulsa una casilla vacía** para colocar a quien falte\n- [[Alt]]+clic señala un punto a todos y [[Ctrl]]+clic en una ficha la apunta"],
        ["Tokens", "The default tool:\n- **drag** a token to move it (its reach is painted)\n- a **box** selects several to move together\n- **click a token** for its menu: target, attack, conditions, open the sheet, hide it, centre the party camera on it or take it off the map\n- **click an empty square** to place whoever is missing\n- [[Alt]]+click pings a spot for everyone and [[Ctrl]]+click on a token targets it"]),
      S('[data-map="fit"]', ["Encajar y zoom", "**Encajar** vuelve a ver el mapa entero; **−** y **+** acercan y alejan."],
        ["Fit and zoom", "**Fit** shows the whole map again; **−** and **+** zoom out and in."]),
      S("#mapPane .ambient-btn", ["Ambiente", "Enciende o apaga en este aparato los sonidos y la música que hayas puesto en el mapa."],
        ["Ambience", "Turns the sounds and music placed on the map on or off on this device."]),
      S('[data-map="roomCam"]', ["Encuadrar salas", "Cuando la party entra en una sala marcada, la cámara de la tele y de los móviles la encuadra entera; al salir, vuelve a la de antes."],
        ["Frame rooms", "When the party enters a marked room, the TV and phone cameras frame the whole room; on leaving, they return to the previous view."]),
      S(".bar-fold", ["Ocultar la barra", "La flecha recoge las herramientas y el tablero ocupa todo el alto. El botón **Herramientas** de la esquina las vuelve a sacar."],
        ["Hide the toolbar", "The arrow tucks the tools away and the board takes the full height. The **Tools** button in the corner brings them back."])
    ]),

    sec("muros", "wall", ["El mapa: muros y visión", "Muros, puertas, terreno, salas y lo que ve la party"], ["The map: walls and vision", "Walls, doors, terrain, rooms and what the party sees"], "dm.map", [
      S('[data-tool="measure"]', ["Regla", "Arrastra de una casilla a otra para medir en pies, con la regla de diagonales del mapa."],
        ["Ruler", "Drag from one square to another to measure in feet, using the map's diagonal rule."]),
      S('[data-tool="wall"]', ["Muro", "Arrastra por los **bordes** de las casillas para un muro recto, o empieza en el **centro** de una casilla para uno en diagonal. Los muros cortan la vista y el paso."],
        ["Wall", "Drag along square **edges** for a straight wall, or start at a square's **centre** for a diagonal one. Walls block sight and movement."]),
      S('[data-tool="freewall"]', ["Muro libre", "Una pared a mano alzada, para cuevas y paredes redondas; con [[Mayús]], recta."],
        ["Free wall", "A freehand wall, for caves and round walls; hold [[Shift]] for a straight one."]),
      S('[data-tool="door"]', ["Puerta", "Pulsa un borde, el centro de una casilla o un muro libre para poner una puerta. Otra pulsación la abre o la cierra; para quitarla, **Borrar**."],
        ["Door", "Click an edge, a square's centre or a free wall to add a door. Another click opens or closes it; to remove it, **Erase**."]),
      S('[data-tool="erase"]', ["Borrar", "Arrastra para quitar muros, diagonales, trozos de muro libre y puertas."],
        ["Erase", "Drag to remove walls, diagonals, pieces of free wall and doors."]),
      S("#terrain", ["Terreno", "Pinta casillas:\n- **Niebla**: ver a través cuesta el triple\n- **Oscuridad**: no se ve a través\n- **Luz**: alumbra aunque el mapa esté a oscuras\n- **Difícil**: entrar cuesta el doble de movimiento\n- la **goma** lo limpia"],
        ["Terrain", "Paint squares:\n- **Fog**: seeing through costs triple\n- **Darkness**: cannot be seen through\n- **Light**: lit even on a dark map\n- **Difficult**: entering costs double movement\n- the **eraser** clears it"]),
      S("#zones", ["Salas y zonas", "- **Sala**: al entrar, la party ve la sala entera (cada pulsación empieza una sala nueva)\n- **Revelar**: la party lo ve siempre\n- **Ocultar**: no lo ve nunca, aunque lo tenga delante\n- la **goma** quita salas y zonas"],
        ["Rooms and zones", "- **Room**: on entering, the party sees the whole room (each click starts a new room)\n- **Reveal**: the party always sees it\n- **Hide**: they never see it, even right in front of them\n- the **eraser** removes rooms and zones"]),
      S("#board", ["Cómo ve la party", "Durante este paso ves el mapa **como lo ve la party**: lo negro no lo ven, lo gris es lo ya explorado y lo claro es lo que ven ahora. Cada personaje ve desde su ficha, con el radio de visión del mapa, los muros (una puerta cerrada corta la vista), la luz y su visión en la oscuridad. Lo que no ven no llega a sus pantallas: ni las fichas ni las notas. Si no hay nadie de la party en el mapa, lo ven todo a oscuras; «Revelar el mapa entero», en los ajustes, se lo enseña todo. Al pasar de paso vuelves a tu vista de DM, donde lo que ve la party sale iluminado."],
        ["How the party sees", "During this step you see the map **as the party sees it**: black is what they cannot see, grey is already explored and clear is what they see now. Each character sees from its token, with the map's vision radius, walls (a closed door blocks sight), light and darkvision. What they cannot see never reaches their screens: no tokens, no notes. With nobody from the party on the map they see everything dark; “Reveal the whole map”, in the settings, shows them everything. Moving on returns you to your DM view, where what the party sees is highlighted."], "dm.preview")
    ]),

    sec("historia", "note", ["El mapa: contar la historia", "Notas, sonido, accesos, dibujos y plantillas"], ["The map: telling the story", "Notes, sound, passages, drawings and templates"], "dm.map", [
      S('[data-tool="pin"]', ["Notas", "Clava una nota en una casilla: una trampa, un tesoro, una pista. Elige qué es y si la ve la party. Cuando alguien la pisa te avisa y puedes enseñársela en ese momento."],
        ["Notes", "Pin a note to a square: a trap, a treasure, a clue. Choose what it is and whether the party sees it. When someone steps on it you are told and can reveal it on the spot."]),
      S('[data-tool="sound"]', ["Sonido", "Tu propio audio o uno de la **biblioteca de Mesa** (lluvia, taberna, cueva, música de combate…). Suena **desde un punto** con su alcance, **en toda la sala** o **en todo el mapa**, y cada móvil oye lo que oye su personaje."],
        ["Sound", "Your own audio or one from **Mesa's library** (rain, tavern, cave, battle music…). It plays **from a point** with a reach, **in the whole room** or **across the map**, and each phone hears what its character hears."]),
      S('[data-tool="portal"]', ["Accesos", "Escaleras, trampillas o pasadizos a otro mapa o a otro punto de este. Al pisarlo puede preguntar quién cruza (la party entera), cruzar solo quien lo pisa o solo marcarlo."],
        ["Passages", "Stairs, trapdoors or tunnels to another map or another point on this one. When stepped on it can ask who crosses (the whole party), move only whoever stepped on it, or just mark it."]),
      S('[data-tool="draw"]', ["Dibujar", "Trazos a mano alzada: elige el color, si los ve la party, borra un trazo o todos."],
        ["Draw", "Freehand strokes: choose the colour, whether the party sees them, erase one stroke or all."]),
      S("#shapes", ["Plantillas de área", "Esfera, cono, línea o cubo del tamaño en pies que escribas. Pulsa para colocarla y arrastra para girarla; dice a quién coge. La equis las quita todas."],
        ["Area templates", "Sphere, cone, line or cube of the size in feet you type. Click to place it and drag to rotate it; it says who is caught. The cross removes them all."])
    ]),

    sec("ajustes", "gear", ["Ajustes del mapa", "El plano, la cuadrícula, lo que ve la party y la cámara"], ["Map settings", "The battle map, grid, what the party sees and the camera"], "dm.mapsettings", [
      S(".modal .cols2", ["Lo básico", "Nombre, radio de visión en casillas, columnas y filas."],
        ["The basics", "Name, vision radius in squares, columns and rows."]),
      S(".modal #imgBtn", ["El plano", "**Imagen de fondo** carga tu plano. Mesa busca sola la cuadrícula dibujada y la enseña para confirmarla (**Encajar cuadrícula**) y después **propone muros y puertas** (**Muros y puertas del plano**) para revisarlos antes de ponerlos."],
        ["The battle map", "**Background image** loads your map. Mesa finds the drawn grid by itself and shows it for you to confirm (**Fit grid**), then **proposes walls and doors** (**Walls and doors from the map**) for you to review before adding them."]),
      S(".modal #teachWalls", ["La propuesta aprende", "Cuando los muros de un plano estén bien, **Enseñar con este plano** hace que la propuesta acierte más en los siguientes. Lo aprendido se puede exportar, importar u olvidar."],
        ["The proposal learns", "Once a map's walls are right, **Teach with this map** makes the proposal better on the next ones. What it learned can be exported, imported or forgotten."]),
      S('.modal [name="show"]', ["Qué ve la party", "- enseñar el mapa en la tele y revelarlo entero\n- recordar lo explorado y dibujar la cuadrícula\n- dejar que cada jugador mueva su ficha o dibuje\n- enseñar muros y puertas\n- mapa a oscuras: solo se ve con luz o visión en la oscuridad\n- dejar hacer zoom a los jugadores\n- pintar el alcance al arrastrar y enseñar la vida de los enemigos"],
        ["What the party sees", "- show the map on the TV and reveal it all\n- remember explored areas and draw the grid\n- let each player move their token or draw\n- show walls and doors\n- dark map: only seen with light or darkvision\n- let players zoom\n- paint the reach while dragging and show enemies' health"]),
      S('.modal [name="camera"]', ["Cámara y medidas", "La cámara de la party (todo el mapa o centrada en el personaje, con cuántas casillas a lo ancho), encuadrar salas, los pies por casilla y cómo cuentan las diagonales: 5 pies cada una o la variante 5-10-5."],
        ["Camera and measures", "The party camera (whole map or centred on the character, how many squares wide), framing rooms, feet per square and how diagonals count: 5 feet each or the 5-10-5 variant."]),
      S(".modal #resetFog", ["Limpiezas", "**Restablecer niebla** borra lo explorado; **Vaciar muros**, **Quitar niebla y oscuridad** pintadas y **Cerrar contorno** pone un muro alrededor del mapa."],
        ["Clean-ups", "**Reset fog** wipes explored areas; **Clear walls**, **Remove fog and darkness** painted squares, and **Close outline** walls the map's edge."]),
      S(".modal #newMap", ["Mapas nuevos", "**Mapa nuevo** crea otro en la partida; **Borrar este mapa** lo elimina con todo lo dibujado (pide confirmación). Para que los cambios de esta ventana se apliquen, **Guardar**."],
        ["New maps", "**New map** adds another to the game; **Delete this map** removes it with everything drawn (asks first). To apply the changes in this window, **Save**."])
    ]),

    sec("descanso", "moon", ["Descansos", "Corto y largo"], ["Rests", "Short and long"], "dm.rest", [
      S("#restBtn", ["Descansar", "Abre los dos descansos para toda la party."],
        ["Rest", "Opens both rests for the whole party."], "dm.table"),
      S(".modal .choice-list", ["Corto y largo", "**Corto**: una hora; cada jugador gasta sus dados de golpe desde su ficha. **Largo**: ocho horas; vida, espacios y recursos al máximo, la mitad de los dados de golpe y un nivel menos de agotamiento. A los monstruos no les afecta ninguno."],
        ["Short and long", "**Short**: one hour; each player spends hit dice from their sheet. **Long**: eight hours; hit points, slots and resources to full, half the hit dice back and one level of exhaustion less. Monsters are not affected."])
    ]),

    sec("gestion", "wifi", ["Gestionar la mesa", "Quién entra, la tele, imágenes, tiradas y copias"], ["Running the table", "Who joins, the TV, pictures, roll requests and backups"], "dm.menu", [
      S(".modal .lock-row", ["Abrir y cerrar la mesa", "Con la mesa **cerrada** no entra nadie nuevo; quien ya está sigue jugando. Ciérrala cuando estéis todos."],
        ["Open and lock the table", "With the table **locked** nobody new can join; whoever is in keeps playing. Lock it once everyone is in."], "dm.presence"),
      S(".modal .people", ["Quién está", "Cada persona conectada con su papel y su personaje. **Liberar** deja el personaje libre para otro; el círculo tachado **expulsa** (su aparato vuelve a la entrada). Debajo, quién se desconectó llevando un personaje."],
        ["Who is here", "Everyone connected with their role and character. **Release** frees the character for someone else; the barred circle **kicks** (their device returns to the entrance). Below, who disconnected while holding a character."], "dm.presence"),
      S('.modal [data-menu="screen"]', ["Pantalla de la party", "Abre la tele o el proyector en una ventana aparte, en el otro monitor o en otra pestaña, y elige qué enseña: el mapa, la vida exacta de la party, lo heridos que están los enemigos o el mapa sin niebla."],
        ["Party screen", "Opens the TV or projector view in a separate window, on the other monitor or in another tab, and chooses what it shows: the map, the party's exact HP, how hurt enemies are, or the map without fog."]),
      S('.modal [data-menu="link"]', ["Cómo entran tus jugadores", "La dirección para la misma wifi y, si arrancaste con «Jugar por internet», la de internet, con botón para copiarla. En la entrada eligen **Jugador**, escriben su nombre y cogen su personaje."],
        ["How your players join", "The address for the same wifi and, if you started with “Play over the internet”, the internet one, with a copy button. On the entrance screen they pick **Player**, type their name and take their character."]),
      S('.modal [data-menu="handout"]', ["Enseñar una imagen", "Un mapa del tesoro, una carta, el retrato del villano: sale a pantalla completa en la tele y en todos los móviles. Una barra arriba te recuerda que la estás enseñando y la guarda con un clic."],
        ["Show a picture", "A treasure map, a letter, the villain's portrait: it fills the TV and every phone. A bar at the top reminds you it is showing and hides it with one click."]),
      S('.modal [data-menu="ask"]', ["Pedir una tirada", "Qué pides («Percepción»), la fórmula, la dificultad y a quién. A cada jugador le sale un botón en el móvil; al pulsarlo tira y se anuncia si supera la CD."],
        ["Ask for a roll", "What you ask for (“Perception”), the formula, the DC and who. Each player gets a button on their phone; pressing it rolls and announces whether they beat the DC."]),
      S('.modal [data-menu="export"]', ["Copias de la partida", "**Guardar copia** descarga un archivo con toda la partida; **Cargar una copia** la sustituye por la de un archivo. Útil antes de una sesión importante o para llevarla a otro ordenador."],
        ["Game backups", "**Save backup** downloads a file with the whole game; **Load a backup** replaces it with one from a file. Handy before a big session or to move to another computer."]),
      S(".modal .menu-item.static", ["Idioma y salir", "El idioma cambia solo en este aparato. **Salir de la sesión** te devuelve a la entrada; la partida sigue guardada."],
        ["Language and leaving", "The language changes on this device only. **Leave the session** takes you back to the entrance; the game stays saved."])
    ]),

    sec("biblioteca", "book", ["La biblioteca", "Libros de reglas, conjuros, bestiario y tus documentos"], ["The library", "Rule books, spells, bestiary and your documents"], "dm.shelf", [
      S(".shelf-books", ["La estantería", "Abajo a la izquierda, solo para ti. Cuatro libros de serie (reglas, manual del jugador, conjuros y bestiario) y los tuyos. Pulsa un lomo para abrirlo."],
        ["The shelf", "Bottom left, for your eyes only. Four built-in books (rules, player's manual, spells and bestiary) plus your own. Click a spine to open it."]),
      S(".tome .tome-toc", ["Dentro de un libro", "A la izquierda, el índice por secciones; a la derecha, el texto. Las flechas del pie o [[←]] [[→]] pasan de sección, [[Esc]] lo cierra y cada libro recuerda por dónde ibas."],
        ["Inside a book", "On the left, the index by sections; on the right, the text. The arrows at the foot or [[←]] [[→]] turn sections, [[Esc]] closes it and each book remembers where you were."], "dm.book"),
      S(".tome .tome-search", ["Buscar en el libro", "Sin tildes ni mayúsculas, en todo el libro o solo en la sección abierta. Los resultados llevan a su sitio y marcan lo encontrado."],
        ["Search the book", "Accent and case insensitive, in the whole book or just the open section. Results take you there and highlight the match."], "dm.book"),
      S('.shelf [data-shelf="search"]', ["Buscar en toda la biblioteca", "Un conjuro, un monstruo o una regla en todos los libros a la vez."],
        ["Search the whole library", "A spell, a monster or a rule across every book at once."]),
      S('.shelf [data-shelf="add"]', ["Añadir documentos", "Un **PDF** (se saca su texto para buscar y su índice hace de secciones), un **texto o Markdown**, una **imagen** para enseñar a la mesa o un **cuaderno** para tus notas. Dentro de cada uno puedes renombrarlo, cambiar la tapa, descargarlo o quitarlo."],
        ["Add documents", "A **PDF** (its text is extracted for searching and its outline becomes sections), a **text or Markdown** file, an **image** to show the table, or a **notebook** for your notes. Inside each one you can rename it, change the cover, download it or remove it."]),
      S('.shelf [data-shelf="hide"]', ["Guardar la estantería", "La recoge y deja solo el botón **Biblioteca**, para una vista limpia."],
        ["Put the shelf away", "Tucks it away leaving only the **Library** button, for a clean view."])
    ]),

    sec("atajos", "key", ["Atajos de teclado", "Todo lo que se hace sin ratón"], ["Keyboard shortcuts", "Everything you can do without the mouse"], null, [
      S(null, ["La partida", "- [[Ctrl]]+[[K]]: iniciar o terminar el combate\n- [[Espacio]], [[Intro]] o [[Ctrl]]+[[→]]: siguiente turno\n- [[Ctrl]]+[[←]]: turno anterior\n- [[Ctrl]]+[[B]]: abrir o cerrar el bestiario\n- [[Ctrl]]+[[N]]: personaje nuevo\n- [[Ctrl]]+[[Z]]: deshacer\n(En Mac, [[Cmd]] en lugar de [[Ctrl]].)"],
        ["The game", "- [[Ctrl]]+[[K]]: start or end combat\n- [[Space]], [[Enter]] or [[Ctrl]]+[[→]]: next turn\n- [[Ctrl]]+[[←]]: previous turn\n- [[Ctrl]]+[[B]]: open or close the bestiary\n- [[Ctrl]]+[[N]]: new character\n- [[Ctrl]]+[[Z]]: undo\n(On a Mac, [[Cmd]] instead of [[Ctrl]].)"]),
      S(null, ["Tiradas y fichas", "- al pulsar una tirada: [[Mayús]] ventaja, [[Ctrl]] desventaja, [[Alt]] en secreto\n- en la casilla de vida: [[Intro]] daño, [[Mayús]]+[[Intro]] curación\n- en el mapa: [[Alt]]+clic señala, [[Ctrl]]+clic en una ficha la apunta, [[Esc]] suelta la selección\n- en un libro: [[←]] [[→]] pasan de sección, [[Esc]] lo cierra"],
        ["Rolls and sheets", "- when clicking a roll: [[Shift]] advantage, [[Ctrl]] disadvantage, [[Alt]] secret\n- in the HP box: [[Enter]] damage, [[Shift]]+[[Enter]] heal\n- on the map: [[Alt]]+click pings, [[Ctrl]]+click on a token targets it, [[Esc]] drops the selection\n- in a book: [[←]] [[→]] turn sections, [[Esc]] closes it"])
    ])
  ]
};

/* ======================================================================
   Jugador
   ====================================================================== */
const PLAYER = {
  id: "player", role: "player", icon: "user", label: ["Jugador", "Player"],
  where: ["la pantalla del jugador", "the player screen"],
  intro: ["Todo lo que puede hacer un jugador desde su móvil o su ordenador: la ficha, tirar, atacar, el mapa y la charla.",
    "Everything a player can do from their phone or computer: the sheet, rolling, attacking, the map and the chat."],
  invite: ["Un recorrido guiado por tu ficha, el mapa, los dados y la charla, por secciones. Salta a la parte que quieras.",
    "A guided tour of your sheet, the map, dice and chat, in sections. Jump to whichever part you like."],
  sections: [
    sec("inicio", "info", ["Primeros pasos", "Las pestañas y la cabecera"], ["First steps", "The tabs and the header"], "pl.sheet", [
      S(null, ["Bienvenida", "Esta es tu pantalla de jugador. Lo que haces aquí (curarte, tirar, mover tu ficha) llega al momento al DM y a la tele. **Siguiente** avanza; **Índice** salta a cualquier sección o busca un control; [[Esc]] cierra el tutorial."],
        ["Welcome", "This is your player screen. What you do here (healing, rolling, moving your token) reaches the DM and the TV instantly. **Next** moves on; **Index** jumps to any section or finds a control; [[Esc]] closes the tutorial."]),
      S(".tabbar", ["Las pestañas", "**Mi ficha**, **Party** (tus compañeros y los enemigos a la vista), **Mapa** y **Dados y charla**. Un punto en «Dados y charla» avisa de mensajes sin leer."],
        ["The tabs", "**My sheet**, **Party** (your companions and visible enemies), **Map** and **Dice and chat**. A dot on “Dice and chat” flags unread messages."]),
      S(".player-top .who", ["Tu nombre y la conexión", "El punto verde dice que estás conectado. Si se cae la conexión sale un aviso arriba y se reintenta sola."],
        ["Your name and connection", "The green dot says you are online. If the connection drops a notice appears at the top and it retries by itself."]),
      S(".player-top .voice:not(.hidden)", ["Voz", "Únete a la llamada de voz de la mesa; dentro silencias tu micro o sales."],
        ["Voice", "Join the table's voice call; inside you can mute your mic or leave."]),
      S(".player-top .ambient-btn", ["Sonido ambiente", "Enciende o apaga en este aparato los sonidos del mapa: oyes lo que oye tu personaje, más fuerte cuanto más cerca."],
        ["Ambient sound", "Turns the map sounds on or off on this device: you hear what your character hears, louder the closer you are."]),
      S("#plang", ["Idioma", "Cambia el idioma solo en este aparato."], ["Language", "Changes the language on this device only."]),
      S("#leaveBtn", ["Salir", "Vuelves a la entrada. Tu personaje queda guardado y lo recuperas al volver."],
        ["Leave", "Back to the entrance. Your character stays saved and you get it back when you return."]),
      S(".player-top .tour-btn", ["Este tutorial", "Siempre aquí, con el índice de secciones y un buscador."],
        ["This tutorial", "Always here, with the section index and a search box."])
    ]),

    sec("ficha", "shield", ["Tu ficha", "Vida, estados, características y tiradas"], ["Your sheet", "Hit points, conditions, abilities and rolls"], "pl.sheet", [
      S(".sheet-head", ["Quién eres", "Retrato, nombre, clase, especie y nivel. **Editar** abre tu ficha completa: ataques, características, conjuros, equipo, rasgos y notas."],
        ["Who you are", "Portrait, name, class, species and level. **Edit** opens your full sheet: attacks, abilities, spells, equipment, features and notes."]),
      S(".quick-stats", ["Lo básico", "Competencia, **iniciativa** (púlsala para tirarla y apuntarla), clase de armadura y velocidad."],
        ["The basics", "Proficiency, **initiative** (tap it to roll and record it), armour class and speed."]),
      S(".hp-box", ["Puntos de golpe", "Escribe una cantidad y pulsa **Daño** o **Curar**, o usa −1, −5, +1 y +5. La vida temporal se gasta primero. Si caes a 0, aquí aparecen las salvaciones de muerte."],
        ["Hit points", "Type an amount and press **Damage** or **Heal**, or use −1, −5, +1 and +5. Temporary HP is spent first. If you drop to 0, death saves appear here."]),
      S(".cond-box", ["Estados", "Tus estados, agotamiento, concentración e inspiración. **Estados** abre la lista para ponerte o quitarte alguno; pasa el dedo o el ratón por uno para leer qué hace."],
        ["Conditions", "Your conditions, exhaustion, concentration and inspiration. **Conditions** opens the list to add or remove one; hover over one to read what it does."]),
      S(".sheet .abilities", ["Características", "Toca una para la prueba. Con teclado: [[Mayús]] ventaja, [[Ctrl]] desventaja y [[Alt]] una tirada que **solo ve el DM**."],
        ["Abilities", "Tap one to roll the check. With a keyboard: [[Shift]] advantage, [[Ctrl]] disadvantage and [[Alt]] a roll **only the DM sees**."]),
      S(".action-grid", ["Atacar, conjuros y más", "**Atacar** abre tus ataques; **Conjuros**, tu lista; **Dado de golpe** cura en un descanso corto; y si estás concentrado, la salvación de concentración."],
        ["Attack, spells and more", "**Attack** opens your attacks; **Spells**, your list; **Hit die** heals during a short rest; and if you are concentrating, the concentration save."]),
      S(".sheet .slots", ["Espacios y recursos", "Toca un espacio de conjuro o un recurso (furia, ki…) para gastarlo."],
        ["Slots and resources", "Tap a spell slot or a resource (rage, ki…) to spend it."]),
      S(".roll-box", ["Salvaciones y habilidades", "Toca una fila para tirarla con su modificador. El punto dorado dice que tienes competencia."],
        ["Saves and skills", "Tap a row to roll it with its modifier. The golden dot means you are proficient."]),
      S(".notes-box", ["Acciones, conjuros, equipo, rasgos y notas", "Las pestañas de abajo: tus ataques (toca el bonificador o el daño para tirar), las acciones de combate con su regla y tus **Efectos** activos (Bendecir, Furia…), que se suman solos. Cualquier fórmula subrayada se tira con un toque."],
        ["Actions, spells, equipment, features and notes", "The tabs at the bottom: your attacks (tap the bonus or damage to roll), combat actions with their rule and your active **Effects** (Bless, Rage…), which add themselves. Any underlined formula rolls with a tap."])
    ]),

    sec("atacar", "sword", ["Atacar y lanzar conjuros", "La ventana de ataque y tus conjuros"], ["Attacking and casting", "The attack window and your spells"], "pl.attack", [
      S(".modal", ["La ventana de ataque", "Elige el objetivo, cómo tiras y el ataque. El servidor tira por ti, compara con la CA del objetivo (que tú no ves) y aplica el daño. Si eres pícaro o paladín salen **Ataque furtivo** y **Castigo divino**, y puedes sumar un daño extra."],
        ["The attack window", "Choose the target, how you roll and the attack. The server rolls for you, compares with the target's AC (which you cannot see) and applies the damage. Rogues and paladins get **Sneak Attack** and **Divine Smite**, and you can add extra damage."]),
      S(".modal", ["Tus conjuros", "Lanza un conjuro: se gasta el espacio y se tiran el ataque o las salvaciones y el daño. Los de área se colocan en el mapa."],
        ["Your spells", "Cast a spell: the slot is spent and the attack or saves and damage are rolled. Area spells are placed on the map."], "pl.spells")
    ]),

    sec("turno", "hourglass", ["Tu turno y lo que pide el DM", "Avisos de turno, tiradas pedidas e imágenes"], ["Your turn and DM requests", "Turn alerts, requested rolls and pictures"], "pl.sheet", [
      S("#turnFlash:not(.hidden)", ["Cuando te toca", "En combate, arriba se ve de quién es el turno y quién va después. Cuando es el tuyo se enciende «Es tu turno» y el móvil vibra."],
        ["When it's your turn", "In combat, the top shows whose turn it is and who is next. When it is yours, “It's your turn” lights up and the phone vibrates."]),
      S("#asks button", ["Tiradas que pide el DM", "Si el DM pide una tirada a la party sale un botón grande: «El DM te pide: Percepción · CD 13». Púlsalo para tirar; todos verán si la superas."],
        ["Rolls the DM asks for", "When the DM asks the party for a roll, a big button appears: “The DM asks you: Perception · DC 13”. Press it to roll; everyone sees whether you beat it."]),
      S(null, ["Imágenes del DM", "Cuando el DM enseña una imagen (un mapa, una carta), te sale en grande. **Cerrar** la quita de tu pantalla."],
        ["Pictures from the DM", "When the DM shows a picture (a map, a letter), it pops up large. **Close** removes it from your screen."])
    ]),

    sec("party", "users", ["La party", "Tus compañeros y los enemigos a la vista"], ["The party", "Your companions and visible enemies"], "pl.party", [
      S(".party-strip", ["Tus compañeros", "Su vida, su CA y quién los lleva."],
        ["Your companions", "Their hit points, AC and who plays them."]),
      S(".party-strip ~ .section-title", ["Los enemigos", "**A la vista**: los que tu party ve ahora, con lo heridos que parecen y el daño que les habéis hecho. **Vistos antes**: donde los visteis por última vez. Su vida exacta y su CA solo las sabe el DM."],
        ["The enemies", "**In sight**: those your party can see now, how hurt they look and the damage you have dealt. **Seen before**: where you last saw them. Their exact HP and AC are known only to the DM."])
    ]),

    sec("mapa", "map", ["El mapa", "Mover, medir, señalar, dibujar y ver áreas"], ["The map", "Move, measure, ping, draw and preview areas"], "pl.map", [
      S('[data-ptool="token"]', ["Mover", "Arrastra tu ficha y se pinta hasta dónde llegas. Si el DM no deja moverse a los jugadores, pídeselo a él. Lo que tu personaje no ve está a oscuras; lo explorado se queda en gris."],
        ["Move", "Drag your token and your reach is painted. If the DM does not let players move, ask them. What your character cannot see is dark; explored areas stay grey."]),
      S('[data-ptool="measure"]', ["Medir", "Arrastra de una casilla a otra para medir la distancia en pies."],
        ["Measure", "Drag from one square to another to measure the distance in feet."]),
      S('[data-ptool="ping"]', ["Señalar", "Pulsa un punto y toda la mesa lo ve parpadear: «¡ahí!»."],
        ["Ping", "Tap a spot and the whole table sees it flash: “there!”."]),
      S('[data-ptool="draw"]', ["Dibujar", "Trazos sobre el plano que ve toda la mesa, si el DM lo permite. La goma de al lado borra uno de tus trazos."],
        ["Draw", "Strokes on the map that the whole table sees, if the DM allows it. The eraser next to it removes one of your strokes."]),
      S("#areaBtn", ["Mis áreas", "Elige uno de tus conjuros de área y colócalo para ver a quién cogería. Solo lo ves tú y no gasta nada; para lanzarlo, **Atacar**. **Quitar áreas** lo borra."],
        ["My areas", "Pick one of your area spells and place it to see who it would catch. Only you see it and nothing is spent; to cast it, **Attack**. **Clear areas** removes it."]),
      S('[data-pmap="fit"]', ["Zoom", "**−**, **+** y **Todo**, si el DM deja hacer zoom; con dos dedos también."],
        ["Zoom", "**−**, **+** and **All**, if the DM allows zooming; two fingers work too."]),
      S(null, ["Accesos y notas", "Al pisar una escalera o un pasadizo puedes pasar a otro mapa, a veces con toda la party. Si pisas una nota del DM, puede que te salga lo que pone."],
        ["Passages and notes", "Stepping on stairs or a tunnel can take you to another map, sometimes with the whole party. Step on one of the DM's notes and you may get to read it."])
    ]),

    sec("dados", "dice", ["Dados y charla", "Tirar, el registro, hablar y susurrar"], ["Dice and chat", "Rolling, the log, talking and whispering"], "pl.dice", [
      S(".dice-pad", ["Dados rápidos", "Un toque tira ese dado; **2d20** tira dos."], ["Quick dice", "One tap rolls that die; **2d20** rolls two."]),
      S(".roll-opts .adv", ["Cómo se tira", "**Desventaja**, **Normal** o **Ventaja**. Con teclado: [[Mayús]] ventaja, [[Ctrl]] desventaja y [[Alt]] solo para el DM."],
        ["How to roll", "**Disadvantage**, **Normal** or **Advantage**. With a keyboard: [[Shift]] advantage, [[Ctrl]] disadvantage and [[Alt]] DM only."]),
      S(".dice-form", ["Cualquier fórmula", "Escribe «1d20+5» o «2d6+3» y pulsa **Tirar**."], ["Any formula", "Type “1d20+5” or “2d6+3” and press **Roll**."]),
      S(".log-tabs", ["El registro", "Todas las tiradas y mensajes de la mesa, filtrados por **Todo**, **Tiradas** o **Charla**."],
        ["The log", "Every roll and message at the table, filtered by **All**, **Rolls** or **Chat**."]),
      S(".chat-form", ["Hablar y susurrar", "Escribe a toda la mesa, o usa el **bocadillo** para susurrar al DM o a otro jugador: solo lo leen ellos y nunca sale en la tele."],
        ["Talk and whisper", "Write to the whole table, or use the **speech bubble** to whisper to the DM or another player: only they read it and it never shows on the TV."])
    ]),

    sec("personaje", "userPlus", ["Sin personaje", "Elegir uno o crear el tuyo"], ["No character yet", "Pick one or create your own"], null, [
      S(".picker", ["Elegir o crear", "Si entras sin personaje, eliges uno libre de la mesa (los que lleva otra persona salen ocupados) o pulsas **Crear mi personaje**: el creador paso a paso o uno al azar."],
        ["Pick or create", "If you join without a character, pick a free one from the table (those held by someone else show as taken) or press **Create my character**: the step-by-step builder or a random one."]),
      S(null, ["Si el DM te libera", "Si el DM libera tu personaje se te avisa y vuelves a elegir. Desde otro aparato puedes recuperar el tuyo entrando con tu nombre."],
        ["If the DM releases you", "If the DM releases your character you are told and pick again. From another device you can take yours back by joining with your name."])
    ])
  ]
};

/* ======================================================================
   La tele
   ====================================================================== */
const SCREEN = {
  id: "screen", role: "screen", icon: "tv", label: ["Pantalla de la mesa", "Table screen"],
  where: ["la pantalla de la mesa", "the table screen"],
  intro: ["La tele o el proyector que ve toda la mesa: qué enseña y cómo se maneja.", "The TV or projector the whole table watches: what it shows and how to handle it."],
  invite: ["Un recorrido corto por lo que enseña la pantalla de la mesa.", "A short tour of what the table screen shows."],
  sections: [
    sec("tele", "tv", ["La pantalla", "Qué es y sus pocos botones"], ["The screen", "What it is and its few buttons"], null, [
      S(null, ["Qué es", "La pantalla que ve toda la mesa: una tele, un proyector o un monitor. No tiene controles que se puedan tocar por error; lo que enseña lo decide el DM desde **⋯ → Pantalla de la party**."],
        ["What it is", "The screen the whole table watches: a TV, a projector or a monitor. It has no controls to bump by accident; what it shows is decided by the DM from **⋯ → Party screen**."]),
      S(".screen-tools", ["Arriba", "El punto de conexión, el nombre de la campaña, el idioma, el **sonido ambiente** (para que la tele sea el altavoz de la mesa), **pantalla completa** (también con doble clic) y salir."],
        ["At the top", "The connection dot, the campaign name, the language, **ambient sound** (so the TV is the table's speaker), **full screen** (also double-click) and leave."])
    ]),
    sec("enseña", "eye", ["Lo que enseña", "La party, el mapa, los enemigos, los turnos y las tiradas"], ["What it shows", "The party, the map, enemies, turns and rolls"], null, [
      S(".side.heroes", ["La party", "Cada personaje con su vida (exacta o por colores, según el DM), su CA y sus estados."],
        ["The party", "Each character with their hit points (exact or as colours, as the DM chooses), AC and conditions."]),
      S(".board-wrap", ["El mapa", "Con la vista de la party: solo lo que ven. La cámara puede seguir a un personaje o encuadrar la sala en la que entran."],
        ["The map", "From the party's point of view: only what they see. The camera can follow a character or frame the room they enter."]),
      S(".side.foes", ["Enemigos", "Los que la party ve, agrupados, con lo heridos que están si el DM lo permite."],
        ["Enemies", "Those the party can see, grouped, with how hurt they are if the DM allows it."]),
      S("#turnbar:not(.hidden)", ["En combate", "Una franja con quien tiene el turno: su vida, lo que le queda de acción y movimiento, sus estados y quién va después; y la tira de iniciativa."],
        ["In combat", "A band with whoever has the turn: hit points, what is left of action and movement, conditions and who is next; plus the initiative strip."]),
      S("#roll", ["La última tirada", "Cada tirada pública sale en grande unos segundos. Las secretas y los susurros no salen nunca."],
        ["The last roll", "Every public roll shows large for a few seconds. Secret rolls and whispers never appear."]),
      S(null, ["Imágenes", "Lo que el DM enseña con «Enseñar una imagen» ocupa la pantalla entera hasta que lo guarda."],
        ["Pictures", "Whatever the DM shows with “Show a picture” fills the screen until they put it away."])
    ])
  ]
};

/* ======================================================================
   La entrada
   ====================================================================== */
const GATE = {
  id: "gate", role: "gate", icon: "key", label: ["Entrada", "Entrance"],
  where: ["la pantalla de entrada", "the entrance screen"],
  intro: ["Cómo se entra a una partida: el papel de cada uno, el código del DM, elegir personaje e instalar Mesa.",
    "How to join a game: each person's role, the DM code, picking a character and installing Mesa."],
  invite: ["Un recorrido corto por la entrada.", "A short tour of the entrance."],
  sections: [
    sec("entrar", "key", ["Entrar a la partida", "Papel, nombre, código y personaje"], ["Joining the game", "Role, name, code and character"], null, [
      S(null, ["Bienvenida", "Mesa es una mesa de D&D en red: el DM lleva la partida en su ordenador, cada jugador su personaje en el móvil y la tele enseña el mapa a todos. Aquí eliges cómo entras."],
        ["Welcome", "Mesa is a networked D&D table: the DM runs the game on a computer, each player their character on a phone and the TV shows the map to everyone. Here you choose how you join."]),
      S(".gate .roles", ["Cómo entras", "**DM**: llevas la partida. **Jugador**: llevas un personaje. **Pantalla**: la tele o el proyector de la mesa."],
        ["How you join", "**DM**: you run the game. **Player**: you play a character. **Screen**: the table's TV or projector."]),
      S(".gate #name", ["Tu nombre", "Como te llaman en la mesa. Se recuerda en este aparato."],
        ["Your name", "What the table calls you. It is remembered on this device."]),
      S(".gate #pinField:not(.hidden)", ["El código del DM", "Para entrar como DM hace falta el código de seis cifras que sale en la ventana donde arrancaste Mesa. Tras cinco fallos, ese aparato espera diez minutos. En la versión de prueba no hace falta."],
        ["The DM code", "To join as DM you need the six-digit code shown in the window where you started Mesa. After five failures that device waits ten minutes. The demo does not need it."], "gate.dm"),
      S(".gate #picker", ["Tu personaje", "Elige tu personaje (los que lleva otra persona salen ocupados) o **Todavía no tengo** para crearlo dentro."],
        ["Your character", "Choose your character (those someone else holds show as taken) or **I don't have one yet** to create it inside."], "gate.player"),
      S(".gate #go", ["Entrar", "Si algo falla, se dice justo encima del botón. [[Intro]] también entra."],
        ["Join", "If something fails it is said right above the button. [[Enter]] joins too."]),
      S(".gate #install:not(.hidden)", ["Instalar como aplicación", "Mesa se puede instalar en el móvil o el ordenador y abrir como una app."],
        ["Install as an app", "Mesa can be installed on a phone or computer and opened like an app."]),
      S(".gate #gateLang", ["Idioma", "Español o inglés, en este aparato."], ["Language", "Spanish or English, on this device."]),
      S(".gate .demo-note", ["Versión de prueba", "Todo corre en este navegador. Entra como DM aquí y abre la Pantalla en otra pestaña: juegan la misma partida. Para los móviles de tus jugadores hace falta descargar Mesa."],
        ["Demo version", "Everything runs in this browser. Join as DM here and open the Screen in another tab: both play the same game. Your players' phones need the downloaded Mesa."])
    ])
  ]
};

export const TOURS = [DM, PLAYER, SCREEN, GATE];
