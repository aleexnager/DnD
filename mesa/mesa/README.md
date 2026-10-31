# Mesa

Partida de D&D en red. Tú llevas la partida desde el ordenador y cada jugador
abre la suya en el móvil: su ficha, sus dados y el trozo de mazmorra que su
personaje alcanza a ver. En la tele puedes poner una tercera pantalla con el
mapa y los turnos.

No necesita instalar nada más que Node.js, no tiene dependencias y funciona sin
internet: basta con que todos estéis en el mismo wifi.

## Probarla sin instalar nada

En **<https://aleexnager.github.io/DnD/>** está la versión de prueba: la misma
aplicación, pero con la partida corriendo dentro de tu navegador, sin
servidor. Trae una partida de ejemplo (cuatro personajes y unos goblins al
otro lado de una puerta) y se guarda en ese navegador.

Entra como **DM** (no pide código) y abre la **Pantalla** en otra pestaña o
ventana: las dos juegan la misma partida, así que puedes proyectar esa
pestaña igual que harías en casa. También se puede abrir un **Jugador** en
una tercera pestaña para ver lo que vería su móvil. Lo que **no** puede es
recibir a tus jugadores desde sus teléfonos: para eso hace falta el servidor,
que es lo de abajo. En Chrome para Android, que no comparte la partida entre
pestañas, cada pestaña lleva la suya.

## Arrancarla

1. Instala **Node.js** una vez, desde <https://nodejs.org> (opción LTS).
2. Doble clic en `Abrir Mesa (Windows).bat` o en `Abrir Mesa (Mac y Linux).command`.
   Desde una terminal es `npm start`.

Para jugar cada uno desde su casa, en vez de esos dos archivos usa los de
**Jugar por internet** (más abajo).

La ventana que se abre te dice tres cosas:

```
Tú (DM)        http://localhost:8080
Tus jugadores  http://192.168.1.34:8080
Código del DM  482193
```

Tú entras por la primera dirección y eliges «DM» con ese código. Tus jugadores
abren la segunda en su móvil, eligen «Jugador» y se quedan con su personaje.
La tele o el proyector entran por la misma dirección y eligen «Pantalla».

Esa ventana tiene que quedarse abierta mientras jugáis: es el servidor.

### ¿Hace falta estar en la misma wifi?

Depende de cómo arranques Mesa. En todos los casos el DM es el servidor: la
partida se guarda en su ordenador y los demás se conectan a él.

| Cómo se arranca | Quién puede entrar | Qué necesitan los jugadores |
|---|---|---|
| **Abrir Mesa** | Solo quien esté en **la misma wifi** que el DM | El navegador del móvil, nada más |
| **Jugar por internet** | **Cualquiera con la dirección**, desde cualquier sitio: su casa, datos del móvil, otra wifi | El navegador del móvil, nada más. **Sin VPN** y sin tocar el router |
| Con Tailscale (opcional) | Solo quien esté en vuestra red privada de Tailscale | Instalar Tailscale (es una VPN) |

**Jugar por internet** es un doble clic en `Jugar por internet (Windows).bat`
o `Jugar por internet (Mac y Linux).command`. La primera vez instala un
programa gratuito de Cloudflare (`cloudflared`) que abre un túnel: una
dirección `https://…trycloudflare.com` que la ventana del servidor enseña y
que también sale en **⋯ → Cómo entran mis jugadores**, con botón de copiar.
Por esa dirección los móviles pueden además **instalar Mesa como
aplicación**, porque es HTTPS. Desde una terminal es
`node server.js --internet`.

Lo que conviene saber:

- **La dirección cambia cada vez** que arrancas Mesa por internet: se pasa
  por el grupo al empezar la sesión. Una app instalada con la dirección de
  otro día no encontrará la partida; basta con abrir la nueva.
- **Quien tenga la dirección puede entrar como jugador.** Por eso:
  - pásala solo a tu grupo;
  - cuando estéis todos, **cierra la mesa** (pulsando el contador de
    conectados, arriba): nadie nuevo entra y los de dentro siguen jugando;
  - desde ahí mismo puedes **expulsar** a alguien;
  - el código del DM tiene seis cifras y, tras cinco intentos fallidos, ese
    aparato espera diez minutos. Nadie puede hacerse DM probando códigos.
- El ordenador del DM tiene que seguir encendido y con la ventana abierta
  mientras jugáis, igual que en casa.

#### Si no sale la dirección de internet

La ventana del servidor dice por qué y lo vuelve a intentar sola cuatro
veces. Lo más habitual:

- **«Tu DNS bloquea los túneles de Cloudflare»** (en la ventana sale
  `getaddrinfow: The requested name is valid, but no data…` o
  `no such host`): el DNS de tu conexión no deja buscar `trycloudflare.com`.
  Lo hacen los filtros de «navegación segura» del operador o del router, la
  protección web de algunos antivirus y bloqueadores como AdGuard o NextDNS,
  porque esos túneles también se usan para estafas. Arreglo: cambia el DNS
  del ordenador a `1.1.1.1` y `1.0.0.1` (Configuración → Red e Internet →
  Wi-Fi → Propiedades de hardware → Asignación de servidor DNS → Editar →
  Manual), ejecuta `ipconfig /flushdns` y vuelve a abrir Mesa. Mesa lo
  detecta sola comparando tu DNS con uno público y lo explica en la ventana.
- **«No se llega a Cloudflare»**: el antivirus o el cortafuegos de Windows
  bloquea `cloudflared` (permítelo cuando pregunte, o añádelo a las
  excepciones), o estás en una red que lo prohíbe (trabajo, universidad,
  residencia). Prueba con otra red o compartiendo datos desde el móvil.
- **«Cloudflare limita…»**: se han pedido muchos túneles seguidos. Espera un
  minuto.
- **Archivo de configuración**: si alguna vez configuraste cloudflared, hay
  una carpeta `.cloudflared` en tu usuario con un `config.yml` que impide el
  túnel rápido. Renómbralo.

Para ver el error completo, abre otra ventana y escribe
`cloudflared tunnel --url http://127.0.0.1:8080`. Mientras tanto, Mesa
sigue funcionando en la wifi con la dirección que da la ventana.

Con [Tailscale](https://tailscale.com) instalado en todos los aparatos, la
dirección de la máquina del DM en esa red funciona tal cual y no cambia
nunca; a cambio, cada jugador tiene que instalarlo.

## Instalar como aplicación

Mesa es una **aplicación web instalable** (PWA): se abre en su propia ventana,
sin barra del navegador, con su icono en el escritorio o en la pantalla de
inicio, y con accesos directos a **DM**, **Jugador** y **Pantalla** (clic
derecho o pulsación larga en el icono).

- **En el ordenador del DM** (Chrome o Edge), entrando por
  `http://localhost:8080`: icono de instalar en la barra de direcciones, o el
  botón **Instalar Mesa como aplicación** de la pantalla de entrada.
- **En Android**: menú ⋮ → *Instalar aplicación*.
- **En iPhone y iPad** (Safari): *Compartir* → *Añadir a pantalla de inicio*.

**Jugando por internet ya está resuelto:** la dirección del túnel es HTTPS y
cualquiera puede instalar Mesa desde ella.

**En casa, por la wifi:** los navegadores solo dejan instalar una aplicación
desde `localhost` o por **HTTPS**. Desde el ordenador donde corre Mesa funciona
tal cual; en los móviles, con `http://192.168.x.x` se puede jugar igual de
bien, pero no instalar. Tres formas de tener HTTPS, de menos a más trabajo:

1. **Tailscale** (recomendado si ya lo usáis, con HTTPS activado en su consola): `tailscale serve --bg 8080`
   publica Mesa en `https://tu-maquina.tu-red.ts.net` con certificado válido,
   solo para tu red privada.
2. **Un túnel** de un comando: `cloudflared tunnel --url http://localhost:8080`
   da una dirección `https://…trycloudflare.com` mientras dure la sesión.
3. **Certificado propio** con [mkcert](https://github.com/FiloSottile/mkcert):

   ```bash
   mkcert -install
   mkcert 192.168.1.34 localhost        # la IP que te da la ventana de Mesa
   node server.js --cert 192.168.1.34+1.pem --key 192.168.1.34+1-key.pem
   ```

   Cada móvil tiene que confiar en la autoridad de mkcert una vez (el archivo
   `rootCA.pem` que indica `mkcert -CAROOT`). También vale con las variables
   `MESA_CERT` y `MESA_KEY`.

Instalada o no, la partida vive en el servidor: la aplicación guarda solo el
código y las imágenes (planos y retratos no se vuelven a descargar), nunca el
estado. Si el servidor no está en marcha, la entrada lo dice en vez de quedarse
en blanco.

## Jugadores, personajes y sesiones

- **Cada personaje lo lleva una sola persona.** En la entrada, los que ya
  lleva alguien conectado salen apagados y con su nombre; no se pueden elegir.
  Desde dentro tampoco se le puede quitar el personaje a nadie.
- **No puede haber dos personas conectadas con el mismo nombre** (da igual
  mayúsculas o minúsculas): el nombre es lo que se lee en el registro y en la
  charla. Si pasa, se dice junto al botón de entrar.
- **Bloquear el móvil no te echa.** La sesión se queda guardada aunque se
  corte la conexión; al volver, sigues en tu ficha sin pasar por la entrada.
  Y como se guarda en disco, **reiniciar el servidor tampoco echa a nadie**.
- **Cambiar de móvil.** Si tu sesión está desconectada (el móvil viejo sin
  batería), entras desde otro aparato con tu personaje y el viejo lo pierde.
  Si sigue conectado, sal allí primero o pide al DM que lo libere.
- **El DM manda.** En cada tarjeta se ve quién lleva el personaje, con un
  punto verde si está conectado. Con el botón de **liberar** (en la tarjeta o
  en el contador de conectados de arriba) el personaje queda libre y quien lo
  llevara vuelve a elegir, con un aviso de por qué.
- Los susurros se reconocen por la sesión y el personaje, no por el nombre:
  alguien que entra otro día con tu mismo nombre no lee lo que susurraste.
- **Las fichas de los compañeros se ven, no se tocan.** En la pestaña
  **Party**, pulsar a un compañero abre su ficha y su ficha detallada (con
  sus pestañas de acciones, conjuros, equipo, rasgos y notas) en **solo
  lectura**: sin botones de vida, de dados ni de editar. El servidor tampoco
  dejaría cambiarla.

### Llevar personajes a otra campaña

**⋯ → Exportar personajes** guarda en un archivo `.mesa-personajes.json`
uno, varios o toda la party (y las criaturas que marques), con la ficha
entera —ataques, conjuros con sus retoques, equipo, rasgos, notas— y el
**retrato dentro**, porque las imágenes viven en cada partida. **⋯ →
Importar personajes** los mete en otra partida como **fichas nuevas**: con
un identificador nuevo, sin colocar en el mapa y sin pisar a nadie (si ya
hay uno con el mismo nombre, el nuevo sale numerado, «Aria 2»). No viaja lo
que es de la partida vieja: dónde estaba, quién lo llevaba, la iniciativa o
lo que la party sabía de él. También vale una copia entera de partida: se
sacan sus fichas.

Cada jugador tiene además en su ficha el botón **Exportar mi ficha**, y al
entrar en otra partida sin personaje, **Traer mi ficha de otra partida**: entra
como suya.

En **⋯ → Cómo entran mis jugadores** sale la dirección de la red del
ordenador del DM (la de `localhost` no le sirve a nadie más), con un botón
para copiarla.

## Idioma

Arriba a la derecha (o en **⋯ → Idioma**, y en la propia pantalla de entrada)
se elige entre **español** e **inglés**, y cada persona lo elige para su
aparato: el DM puede tenerlo en español y un jugador en inglés en la misma
partida. Al cambiarlo, la página se recarga sola y no se pierde nada.

El inglés se aplica sobre la interfaz ya escrita en español, con un
diccionario. Se traducen los botones, los rótulos, los avisos, las pistas de las
herramientas, los dieciséis estados con su explicación, las dieciocho
habilidades, lo que escribe el programa en el registro y **el bestiario que
viene de fábrica** (también las criaturas ya puestas en el mapa con su número,
«Hongo chillón 2» sale «Shrieker Fungus 2», en el rótulo del mapa, el globo,
las tarjetas y el registro), con sus 396 criaturas, sus fichas técnicas, sus rasgos y
sus ataques ("Cimitarra — +4 al ataque — 1d6+2 cortante" sale como "Scimitar —
+4 to hit — 1d6+2 slashing"). También **los 391 conjuros** (nombre, tiempo,
alcance, componentes, duración y descripción, en la ficha, la biblioteca, la
ventana de lanzar, el registro y el compendio): los del SRD con su texto
oficial en inglés y los demás con un resumen propio; y **los rasgos de clase**
del creador guiado. Estos textos (unos 300 KB) solo se descargan si el idioma
es inglés. Quedan en español los libros de consulta de la estantería
(Reglas, la prosa del Manual del jugador y las fichas largas del bestiario
dentro del libro). Lo que escribís vosotros no se toca: los
nombres de los personajes, la charla, tus notas y las criaturas que te inventes
se quedan tal cual, que es como tiene que ser.

## En el teléfono

Los jugadores juegan desde el móvil, así que la aplicación está pensada para
eso y no solo adaptada:

- Las ventanas (crear personaje, editar la ficha, estados) suben desde abajo
  como una hoja, con **guardar y cancelar pegados al borde inferior** y siempre
  a la vista por larga que sea la ficha. Se mide con la altura real del
  navegador, no con la nominal, que es lo que dejaba los botones fuera de
  pantalla cuando la barra de direcciones ocupaba su sitio.
- En el mapa, **un dedo arrastra el plano** y un toque mueve tu ficha; dos
  dedos acercan, alejan y desplazan a la vez. Con zoom ya se puede recorrer el
  plano para ver el detalle.
- Los botones tienen tamaño de dedo, los campos usan cuerpo 16 para que iOS no
  haga zoom solo al escribir, y se respeta la franja inferior del iPhone.
- La barra de herramientas del mapa rueda de lado en vez de comerse el tablero.

## Tutorial guiado

Cada pantalla trae su **recorrido guiado**, al que se llega desde el botón
**?** de la cabecera (el DM también desde **⋯ → Tutorial**, y en la entrada
desde **Tutorial**). La primera vez se ofrece solo, con un aviso pequeño junto
a ese botón que desaparece en cuanto empiezas a usar la pantalla.

El recorrido **señala el control de verdad**: oscurece el resto, lo rodea y lo
explica en una tarjeta al lado. Si hace falta, cambia de pestaña, despliega
una ficha o abre la ventana que toca para enseñarla, y la vuelve a cerrar al
pasar de paso; nunca cambia la partida. Mientras se lee, el control se puede
probar.

Para que se entienda aunque la partida esté vacía, el tutorial del DM trae
**ejemplos**: pone en tu mesa a Brisa, una clériga de ejemplo con vida
temporal, un veneno de dos rondas, concentración, espacios de conjuro gastados
y Bendecir encendido, y a un goblin herido; con ellos explica cada parte de la
tarjeta y de la ficha, la ventana de estados, la de ataque y la de conjuros,
y enseña un **combate de ejemplo** en el que se ve pasar el turno. En el mapa,
un paso te enseña el plano **tal como lo ve la party**. Los ejemplos solo
existen en tu pantalla, llevan una etiqueta que lo dice, desaparecen al
cerrar el tutorial y nada de lo que se haga con ellos llega a la partida (sus
tiradas quedan como secretas, solo para ti).

Va **por secciones**: el del DM tiene quince (la cabecera, crear personajes,
las tarjetas, la ficha desplegada, el bestiario, el combate, dados y charla,
tres del mapa, sus ajustes, descansos, gestionar la mesa, la biblioteca y los
atajos de teclado); el del jugador, ocho; y hay otro para la tele y otro para
la entrada. Desde el **índice** se salta a cualquier sección, se ve cuáles has
terminado, se sigue donde lo dejaste y se **busca un control por su nombre**
(«niebla», «susurrar», «iniciativa») para ir directo a su explicación.
**Siguiente**, **Atrás** o las flechas `←` `→` avanzan; «Saltar a la siguiente
sección» se salta lo que ya sabes; `Esc` lo cierra. Los recorridos de otras
pantallas también se pueden leer (el DM puede ver qué tiene el jugador): sin
nada que señalar, la tarjeta sale en el centro.

Está en español y en inglés, según el idioma elegido.

## Las tres vistas

| | DM | Jugador | Pantalla |
|---|---|---|---|
| Personajes | ficha completa de todos | la suya entera, del resto vida y CA | nombre, vida y estados |
| Enemigos | todo: PV, CA, rasgos, acciones | nombre y estado aparente | nombre y estado aparente |
| Vida del enemigo | números exactos | «Herido», «Malherido»… y el daño hecho | igual que el jugador |
| Mapa | entero, editable | solo lo que ve su party | lo mismo, en grande |
| Bestiario y notas | sí | nunca | nunca |
| Dados | tira y puede tirar en secreto | tira, y todos lo ven | enseña la última tirada |

**Lo que no se enseña no viaja.** El servidor recorta el estado antes de
mandarlo: un monstruo escondido, los rasgos de una criatura o el trozo de mapa
sin explorar no llegan al navegador del jugador, así que no hay nada que
descubrir mirando el inspector del navegador. Es la diferencia de fondo con una
proyección compartida.

## La mesa

Cada personaje tiene su tarjeta con vida, CA, estados y, al desplegarla con
**Ver más** (solo se abre esa: las de al lado no se estiran),
características, salvaciones, habilidades, espacios de conjuro, recursos
propios y sus notas. Los botones **−** y **+** con la casilla del medio aplican
daño y curación; `Intro` aplica daño y `Mayús + Intro`, curación. La vida
temporal se descuenta antes que la de verdad y el aviso de concentración salta
solo, con la CD ya calculada.

La **CA temporal** funciona igual que la vida temporal: pulsando el escudo de
la CA (en la tarjeta, en la ficha del jugador o con − y + en el globo del
mapa) se suma o se resta de uno en uno o con un atajo (**Escudo +5**, **Escudo
de fe +2**, **cobertura media +2**, **de tres cuartos +5**). El escudo enseña la
**total** y el extra va aparte en una etiqueta dorada («17 +2»); al pasar el
ratón se lee «15 de base + 2 temporal». Los ataques y conjuros comparan con la
total. Se quita con **Quitar** o poniéndola a 0.

Los estados son los del reglamento, con su explicación al pasar el ratón, y se
quitan pulsando la etiqueta. El agotamiento va aparte, por niveles.

Cada estado deja **su marca en la ficha del mapa**: un ojo tachado para cegado,
una red para apresado, una gota para envenenado, un rayo para paralizado. Caben
tres chapitas en arco sobre la ficha y, si hay más, la última dice cuántas
faltan, porque cinco marcas diminutas no se distinguen desde el otro lado de la
mesa.

Cada estado puede llevar **una duración en rondas**: al cerrarse el turno de
quien lo sufre, la cuenta baja sola y el estado se cae solo cuando toca, con
aviso en el registro. El agotamiento va aparte, por niveles: como en 2024,
cada nivel resta 2 a todas las tiradas de d20 (ataques, salvaciones y
pruebas), y Mesa lo suma solo. Las descripciones de los estados son las de
2024.

**Descansar** abre las dos opciones. El **largo** devuelve vida, espacios,
recursos y **todos** los dados de golpe (regla de 2024), y baja un nivel de
agotamiento. En el
**corto**, cada personaje gasta sus dados de golpe desde su propia ficha (tira
el dado, suma Constitución y se cura). A los monstruos no les afecta ninguno.

El botón **↶** (o `Ctrl/Cmd + Z`) deshace el último cambio. Se guardan los
veinte últimos, así que un daño mal apuntado o un borrado por error se arreglan
en un segundo. La biblioteca no entra en el deshacer: lo que escribas en un
cuaderno no se pierde al deshacer un golpe.

### La ficha: la hoja de personaje de 2024

El lápiz de cada tarjeta (y **Rellenar la ficha a mano** en el creador) abre
la ficha con **el formato de la hoja oficial de 2024**, en dos páginas y con
los colores de la mesa; en inglés, con los rótulos de la hoja inglesa:

- **Primera página**: nombre, trasfondo, clase, especie y subclase; nivel y
  PX en el óvalo; **CA** en su escudo (con el rombo de escudo), **puntos de
  golpe** actuales, temporales y máximos, dados de golpe gastados y salvaciones
  contra muerte. A la izquierda, el bonificador por competencia y las seis
  **características** con su modificador en el círculo, su puntuación, su
  salvación y sus habilidades (el círculo marca la competencia); la
  inspiración heroica y el entrenamiento con armaduras, armas y herramientas.
  A la derecha, iniciativa, velocidad, tamaño y percepción pasiva; **armas y
  trucos de daño**; rasgos de clase con sus usos; atributos de especie y dotes.
- **Segunda página**: aptitud mágica con su modificador, CD y ataque; los
  **espacios de conjuro** con sus rombos de gastados; la tabla de **trucos y
  conjuros preparados** (nivel, nombre, tiempo, alcance, C·R·M y notas, con sus
  indicadores), donde se añaden de la biblioteca, se crean, se retocan o se
  quitan; aspecto, historia y personalidad, alineamiento, idiomas, equipo,
  sintonización con objetos mágicos y monedas.

Los números que dependen de otros (modificadores, salvaciones, habilidades,
percepción pasiva, CD y ataque de conjuros, la competencia según el nivel) se
recalculan mientras escribes. Los conjuros que hacen daño salen también en
«Armas y trucos de daño», y **en combate cuentan como ataques**: la ventana de
**Atacar** los lista en su sección y, al elegir uno, abre su ventana de lanzar
con el objetivo ya marcado. Arriba, aparte de la hoja, lo que es de la mesa:
retrato, color, jugador, visión, luz y alcance. En el teléfono las cajas se
apilan en el mismo orden y las tablas pasan a tarjetas.

### Crear un personaje

**Añadir personaje** abre el creador paso a paso, que hace personajes de
**cualquier nivel, del 1 al 20**: en el paso de clase se elige el nivel inicial
y Mesa calcula la vida (el dado entero a nivel 1 y la media en cada nivel
siguiente, más la Constitución), la competencia, los dados de golpe, los
**rasgos de clase** de cada nivel con su explicación, la **subclase** del SRD
con sus rasgos (o una tuya, sin rasgos automáticos), las **mejoras de
característica** de los niveles que tocan (+1 a dos o +2 a una, sin pasar de
20; el guerrero y el pícaro tienen las suyas de más), los **espacios de
conjuro** de 2024 (lanzador completo, medio lanzador o pacto del brujo), cuántos
trucos y conjuros preparados elige y de qué nivel, y los recursos que crecen
(Furia, Imposición de manos, Canalizar divinidad, Forma salvaje…). Como en
2024, el paladín y el explorador lanzan conjuros desde el nivel 1.

**Al azar** (arriba, junto a «Añadir personaje») crea un personaje entero de
nivel 1 con un clic y lo sienta directamente en la mesa y en el mapa, en la
primera casilla libre junto a la party: especie, clase, trasfondo,
características repartidas según la clase, habilidades, conjuros, equipo y un
nombre a juego con su especie. Dentro del creador paso a paso, el mismo botón
rellena todo (al nivel que hayas elegido) y te deja en el resumen para cambiar
lo que quieras antes de crearlo.

## Combate

**Iniciar combate** monta el orden con las iniciativas que ya haya.
**Tirar iniciativa** las tira todas de golpe (las de los monstruos, en secreto)
y reordena. Cada jugador puede tirar la suya desde su móvil.

Al empezar un combate, Mesa propone quién entra y te deja retocarlo antes de
arrancar. No entra todo el que esté en el mapa. Entran la party y las criaturas
**vivas**, **no ocultas** y **de este mapa** que cumplan una de tres cosas:

- **la party las ve ahora** (con los muros, la luz y la visión de cada uno);
- están **en la misma sala** que alguien de la party;
- la party **ya las ha visto** y están **cerca** (6 casillas de serie) de un
  personaje o de quien hizo lo último, **sin un muro por medio**.

Se quedan fuera los que están a 0 puntos de vida, las ocultas a la party, las
de otro mapa, las que la party aún no ha visto (meterlas delataría que hay algo
ahí) y las lejanas. De cada uno se dice **por qué** está dentro o fuera («a la
vista», «en la misma sala», «a 25 pies de Aria», «oculto a la party»…), la
casilla **Cerca es a cuántas casillas** cambia el radio y rehace la lista, y
cualquiera se marca o desmarca a mano.

La **iniciativa se escribe a mano** en la misma ventana, en la casilla de cada
uno. Si prefieres tirarla, hay un dado por fila, un botón para tirar por todos y
otro para tirar solo por las criaturas (en secreto, como siempre). Lo que
escribas manda sobre lo que tuvieran guardado.

La barra de arriba enseña la ronda, quién actúa y quién sigue; se puede saltar a
cualquiera pulsándolo, **reordenar la iniciativa arrastrando**, meter a alguien
que llega tarde con **Añadir…**, **sacarlo** con la equis de su turno y
**Retrasar** el turno del que quiere esperar.
`Barra espaciadora` o `Intro` pasan turno.

Debajo del turno actual están sus recursos del asalto: **acción**, **adicional**
y **reacción** se marcan al gastarlas, y al lado va el movimiento que le queda
de su velocidad, que se descuenta solo según arrastras su ficha por el mapa. Al
empezar su siguiente turno vuelve todo a cero.

Los que están a 0 PV se saltan solos en el orden (los monstruos; a los
personajes se les da su turno para las salvaciones de muerte).

### Ataques

Cada ficha tiene su botón **Atacar**. La lista sale de dos sitios: los ataques
que apuntes en la ficha y los que Mesa **lee de las acciones de la criatura**
(«Cimitarra — +4 al ataque — 1d6+2 cortante · alcance 5 pies»), también de sus
acciones adicionales, reacciones y acciones legendarias. De ahí saca el
bonificador, el daño, el tipo, el alcance, el área («cono de 15 pies») y el
estado que puede poner («queda derribado»).

**Indicadores.** Cada ataque y cada conjuro llevan unas pastillas con icono que
dicen de un vistazo lo que hace, con la explicación entera al pasar el ratón:

| Pastilla | Qué dice |
|---|---|
| espada · «5 pies» | cuerpo a cuerpo, con su alcance |
| flecha · «80/320 pies» | a distancia: normal / máximo (con desventaja) |
| mano · «Toque», silueta · «Personal» | hay que tocar / sale de quien lo lanza |
| esfera, cono, línea, cubo · «20 pies» | de área, con su tamaño (ámbar) |
| dado · «Ataque», escudo · «DES ½» | tirada de ataque / salvación y si es a mitad |
| corazón · «Cura», rayo · «Impacta» | cura / impacta siempre |
| espiral · «Paralizado» | el estado que puede poner (violeta) |
| figura en un círculo · «Invoca» | crea o invoca algo que se queda en el tablero |
| rombo con C · «Conc.» | pide concentración |

Salen en la tabla de ataques y de conjuros de la ficha (el alcance, en su
columna), en la ventana de atacar, en el libro de conjuros, al lanzar, en la
biblioteca y en el creador de personajes.

Cada ataque puede llevar además **un nivel de conjuro** y **una forma de área**
(esfera, cono, línea o cubo, con su tamaño en pies). Con nivel, al lanzarlo se
gasta un espacio de ese nivel y, si no te quedan, no te deja lanzarlo. Con
forma, aparece en «Mis áreas» del mapa.

Eliges objetivo, ventaja o desventaja y ya: se tira el ataque, se compara con la
CA, un 20 natural duplica los dados de daño y el daño se resta de la ficha del
objetivo. Todo queda en el registro con los dados a la vista.

En la ventana del ataque se puede sumar daño al impactar: **Ataque furtivo**
para el pícaro (los dados de su nivel), **Castigo divino** para el paladín
(eliges el espacio; solo se gasta si el golpe entra, y suma un dado más contra
muertos vivientes e infernales) y una casilla de **daño extra** para lo demás.
Sin objetivo, se tira el golpe y el daño igual.

**La tirada la hace el servidor, no tu navegador.** Es lo que permite que un
jugador ataque a un monstruo sin saber su CA y sin poder decidir por su cuenta
que ha impactado. Los ataques con salvación ("CD 13 de Destreza") también se
reconocen y se anuncian con su CD.

El resumen de encuentro calcula los PX ajustados por número de criaturas y los
compara con el presupuesto de la party, así que ves si el combate es fácil,
medio, difícil o mortal antes de que empiece.

## Bestiario

Trae **396 criaturas listas**: **todas las del SRD 5.2.1** (las reglas de
2024), cuatro de 2014 y 62 de la casa (ver «Criaturas de la casa» más
abajo), de VD 0 a 30. Del
plebeyo, el gato o la rata a la tarasca, pasando por los diez dragones
cromáticos y metálicos en sus cuatro edades (cría, joven, adulto y anciano) y el
dragón tortuga, los diablos y demonios (del lémur al diablo de la sima y el
balor), ángeles (deva, planetar, solar), genios, gólems, gigantes de los seis
tipos, licántropos, nagas, esfinges, sagas, mephits, enjambres, dinosaurios y
toda la fauna (más de ochenta bestias). Hay de los
catorce tipos (humanoides, bestias, muertos vivientes, monstruosidades,
infernales, feéricos, dragones, gigantes, elementales, constructos, cienos,
plantas, celestiales y aberraciones), con la **ficha de 2024** completa:
iniciativa propia, características con su modificador y su salvación (las
competentes, marcadas), bonificador por competencia, habilidades, equipo,
vulnerabilidades, resistencias, inmunidades, sentidos, idiomas, rasgos,
acciones, **acciones adicionales, reacciones y acciones legendarias**, y sus
ataques listos para tirar de un clic, alientos y conjuros con salvación
incluidos. Llevan los nombres de la traducción oficial de 2024 (Guerrero goblin,
Mimeto, Gul, Pendenciero, Batidor, Broza movediza, Aparición…); el nombre que
tenían antes en Mesa sigue sirviendo para buscarlas, así que «mímico» encuentra
al mimeto. Cuatro no están en el SRD de
2024 (orco, drow, hombre lagarto y banshee) y conservan su ficha de 2014: lo
dice una etiqueta en su ficha («Ficha 2014»). Al sacarlas a la mesa, la
iniciativa se tira con su bonificador de 2024 y sus salvaciones usan su
competencia.

Arriba del bestiario se busca por nombre, sin tildes y también en inglés
(«owlbear» encuentra al oso lechuza, «dragon azul» a los cuatro azules) y se filtra **por tipo** y **por VD** (0 a 1/2, 1 a
2, 3 a 4, 5 a 8, 9 a 16, 17 o más). La lista sale ordenada por desafío, y
cada criatura despliega su **ficha** sin salir de ella (la ficha se pinta al
abrirla, así que la lista no se ralentiza aunque sean más de trescientas).

Las salvaciones que no hacen daño (un aliento que duerme, una mirada que
asusta) se tiran igual desde «Atacar»: Mesa tira la salvación del objetivo y
apunta si la supera o la falla, sin inventarse daño.

**Todas tienen retrato y todas del mismo estilo**: una silueta en tinta sobre
el color de su tipo, de modo que en el tablero se distingue de un vistazo un
muerto viviente (hueso) de un infernal (carmesí) o un cieno (verde ácido), y
la silueta dice cuál es. Dragones y elementales llevan el color de su
elemento. Al ser siluetas se leen igual a 30 píxeles en el móvil que en la
tele, que es donde un retrato pintado se convierte en una mancha.

### Fotos de las criaturas

Los iconos sirven para cualquier partida, pero para que cada monstruo **tenga
cara** se le puede poner una foto o una ilustración, y desde entonces todas las
que invoques salen con ella: en la tarjeta, en la ficha redonda del mapa (con
un aro del color de su tipo, para seguir distinguiendo de un vistazo un
muerto viviente de un infernal) y en las pantallas de los jugadores y de la
tele. El tamaño también viaja, así que un ogro guardado como «Grande» ocupa
2×2 en cuanto lo pones en el tablero.

- **Una a una**: pulsa el retrato de la criatura en el bestiario. Puedes subir
  un archivo, **pegar** una imagen copiada en el navegador (Ctrl+V), pegar la
  **dirección web** de una imagen (la descarga el servidor de Mesa) o pulsar
  **Buscar en internet**, que abre una búsqueda de imágenes con el nombre de la
  criatura en inglés. Antes de guardar, se arrastra y se acerca la foto para
  que la cara quede dentro del círculo de la ficha.
- **De golpe**: el botón **Fotos** del bestiario acepta muchas imágenes (o una
  carpeta entera) y las reparte solas por el nombre del archivo, en castellano o
  en inglés: «Goblin.jpg», «Dragón rojo adulto.png», «owlbear.webp»,
  «Oso lechuza (2).jpg». Dice qué archivos no ha reconocido.
- **Arrastrando** una imagen encima de una criatura de la lista.

El filtro **Mostrar → Sin foto** enseña las que aún no tienen cara. Quitar la
foto la devuelve a su icono. Los monstruos que ya están en la mesa estrenan la
foto nueva al ponérsela.

Las fotos se guardan **en tu partida, en la carpeta de datos de tu ordenador**
(`data/images`, que no se sube a git): no forman parte de la aplicación ni del
repositorio. Por eso Mesa no trae ilustraciones de los manuales ni de otras
webs: la aplicación es pública en GitHub y no se pueden redistribuir. Lo que tú
pongas para jugar con tus amigos se queda en tu mesa.

### Criaturas de la casa (homebrew)

Además del SRD, Mesa trae **62 criaturas de la casa** sacadas del folclore,
con ficha de 2024 completa (y su inglés) y equilibradas con las cifras de
referencia de cada VD (CA, puntos de golpe, bonificador al ataque, daño por
asalto y CD). Son diseño propio: de cada leyenda se toma lo que cuenta la
tradición y se traduce a reglas; no se copia ninguna ficha de otra web (las de
D&D Wiki, por ejemplo, tienen su propia licencia). Cada ficha dice de dónde
viene la leyenda («Folclore: Japón»).

**Bestiario del mundo** (40, VD 1/8 a 17): el jackalope, el chupacabras, el
tokoloshe, la selkie, el kappa, el dokkaebi, el jiangshi, el curupira, el yeti,
la rusalka, el cadejo negro, la manananggal, el kelpie, el tengu, el aswang, el
tikbalang, la pontianak, La Llorona, el bunyip, el draugr, la jorōgumo, el
krampus, la yuki-onna, el vetala, la boitatá, la kitsune, el impundulu, el
mapinguari, el leshy, el nian, el **wendigo**, el dullahan, el lamassu, el
mokèlé-mbèmbé, el gashadokuro, el lindworm, el taniwha, la grootslang, el
simurgh y Baba Yagá. Llevan sus debilidades de la leyenda: el kappa se queda
quieto si se le vacía el plato de la cabeza, el jiangshi no ve a quien contiene
la respiración, el wendigo vuelve salvo que se funda su corazón de hielo, el
dullahan no cruza un umbral con oro y el nian huye del rojo y de los petardos.

**Bestiario de la Península** (22, VD 0 a 18), del folclore de Asturias,
Cantabria, Galicia, el País Vasco y Cataluña: el ventolín, el tentirujo, el trasgu, la pesanta, la xana, la lamiña,
el busgosu, la guaxa, la lavandera nocturna, el sacamantecas, el mouro, el
coco, el nuberu, el diaño burlón, el cuegle, la Santa Compaña, el ojáncanu, el
cuélebre, el basajaun, el gaueko, el herensuge y la Dama de Amboto (VD 0 a 18).
Llevan la etiqueta **Homebrew** en su ficha y se filtran con **Mostrar →
Homebrew**. Cada una trae su gancho de folclore en los rasgos: el pelo blanco
del ojáncanu, el peine de oro de la lamiña, la cruz de la Santa Compaña…

Se elige cantidad y **PV al azar** para que dos goblins no aguanten lo mismo.
Entran al encuentro numerados (Goblin 1, Goblin 2…) y con su iniciativa
tirada.

Puedes editar cualquiera y crear las tuyas. Las de serie no viven en la
partida sino en la aplicación, así que no pesan en lo que viaja por la red y
las nuevas llegan solas al actualizar Mesa. Si retocas una de serie, se guarda
tu versión en la partida; la equis la devuelve a la ficha original. Las tuyas
se borran con esa misma equis. El ojo (👁) de cada ficha ya en la mesa la oculta
por completo de las otras dos vistas, para emboscadas.

Las partidas de antes se ponen al día solas al abrirlas: conservan lo que
editaste y los monstruos que ya estaban en la mesa estrenan retrato.

### Créditos del bestiario

Las fichas incluyen material del *System Reference Document 5.2.1* (y del 5.1
para las cuatro de 2014) de Wizards of the Coast, publicado bajo [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode).
Las 219 que se añadieron después salen del SRD 5.2.1 por campos del paquete
[@opencharacter/5e-srd-5.2](https://www.npmjs.com/package/@opencharacter/5e-srd-5.2)
(CC BY 4.0), traducidas con `tools/bestiario-srd.mjs` y la tabla
`tools/bestiario-srd-es.json`; el guion explica cómo regenerarlas.
Los retratos son iconos de [game-icons.net](https://game-icons.net) (Lorc,
Delapouite y otros autores), bajo [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/),
recoloreados para la mesa con `tools/retratos-bestiario.mjs`. El detalle está
en `public/bestiario/LICENCIA.txt`.

No se incluyen ilustraciones oficiales de los manuales: son de Wizards of the
Coast, no tienen licencia libre y esta aplicación se publica en abierto (la
versión de prueba está en GitHub Pages). Si las tienes por tus libros, súbelas
como retrato de cada criatura y se quedan en tu partida, sin salir de tu
ordenador.

## Mapa

Cada mapa tiene su imagen de fondo, su cuadrícula, sus muros y su niebla.

Al **cargar un plano**, Mesa busca sola la cuadrícula que trae dibujada
(tamaño de casilla, dónde empieza, columnas y filas) y la enseña encima de la
imagen para confirmarla o corregirla: se puede arrastrar, cambiar de tamaño o
probar «casilla al doble» y «a la mitad». Después **propone los muros y las
puertas** sobre el plano, con un control de sensibilidad, para revisarlos
antes de ponerlos. Es una propuesta: se corrige con las herramientas de
siempre. Las dos ventanas están también en los ajustes del mapa.

Las herramientas del DM están en una **barra a la izquierda**, por
**secciones que se pliegan**: Mapa (zoom, ajustes, forja, encuadrar salas,
ambiente), Fichas y medidas, Muros y puertas, Terreno, Salas y zonas, Notas,
sonido y accesos, Plantillas de área y Dibujo. Cada sección recuerda en ese
navegador si la dejaste abierta. La flecha junto al selector de mapa **oculta
la barra** y el tablero ocupa todo el ancho; un botón pequeño en la esquina del
plano la vuelve a sacar. La casilla bajo el puntero se lee **arriba a la
derecha** del tablero, donde no la tapa la estantería de la biblioteca.

**Pulsar una ficha** abre su globo: arriba, la **vida** y la **CA temporal**,
cada una con **−** y **+** de uno en uno, sin cerrarlo, para ir rápido en
combate. La vida funciona como la CA: el número es el total y, con la vida
llena, el **+** sigue subiendo como **vida temporal** (el número se pone
azul); el **−** es daño, que gasta antes la temporal y luego la vida. Se
puede pulsar seguido: el globo lleva la cuenta hasta que la partida contesta.
La vida temporal se ve como una insignia azul (+5) junto a la vida en el
globo, en las tarjetas del DM, en la lista de compañeros del jugador y en la
tele, y como un arco azul por fuera del aro de vida de la ficha en el mapa.
La **CA temporal** también se ve en el mapa: un aro de placas verdes alrededor
de la ficha y un escudo con el extra (+2), en rojo si la CA baja. La party no
la ve en los enemigos, como no ve su CA. Debajo, apuntarle, atacar,
estados, abrir la ficha, ocultarla, centrar la cámara de la party o sacarla del
mapa.

**A quién se apunta.** Cuando alguien abre su ventana de ataques o de lanzar
un conjuro y elige objetivo, los tres mapas (el del DM, el de los jugadores y
la tele) dibujan una **flecha a rayas que avanza**, del color de quien ataca,
y una **mira roja** que gira alrededor del objetivo; cambia al cambiar de
objetivo y se quita al cerrar la ventana. El objetivo que el DM deja marcado
desde el globo (o con [[Ctrl]]+clic) sale apuntado por quien tiene el turno y
pasa al siguiente al avanzar la iniciativa. **El DM lo ve siempre**; para la
party y la tele está encendido de serie y se apaga en **Ajustes del mapa →
Enseñar a la party a quién se apunta**. Lo que se tira en secreto, y las
criaturas que la party no ve, no se enseñan.

### La propuesta de muros aprende de tus planos

Cuando los muros de un plano estén bien puestos (corregidos o a mano), en
**Ajustes del mapa → Enseñar con este plano** la propuesta aprende de ellos
para los planos siguientes. Se nota sobre todo con planos del mismo estilo o
del mismo dibujante. Lo aprendido vale para todas las partidas de ese
ordenador (en la versión de prueba, para ese navegador).

Mesa guarda los **planos enseñados** (imagen, cuadrícula, muros y puertas),
así que no hay que volver a enseñarlos nunca:

- **Al actualizar Mesa** a una versión nueva, conserva la carpeta `data/`
  (ahí está `wallmodel.json`). Si la versión nueva cambia la forma de
  proponer muros, vuelve a aprender sola de todos los planos enseñados la
  primera vez que propone muros.
- **Para llevártelo a otro ordenador**, o si vas a empezar con una carpeta
  `data/` vacía: **Exportar** da un archivo
  `mesa-planos-ensenados-AAAA-MM-DD.json` con todos los planos enseñados
  (imágenes incluidas); en el otro Mesa, **Importar** ese archivo y aprende de
  todos de una vez. Importar dos veces el mismo archivo no duplica nada.
- **Olvidar lo aprendido** vuelve a la propuesta de serie y borra los planos
  enseñados: exporta antes si quieres conservarlos.

- **Fichas** arrastra por las casillas. Al arrastrar se pinta **hasta dónde
  llega** con la velocidad que le quede, rodeando muros, y un contador dice
  cuántos pies lleva. Un recuadro sobre el tablero **elige varias** y las mueve
  juntas guardando la formación; `Mayús` + clic añade o quita de la selección.
- **Regla** mide entre dos casillas en pies y en casillas, con la regla del
  manual o la variante 5-10-5, la que elijas en los ajustes.
- **Plantillas**: esfera, cono, línea, cubo, **anillo** (un muro de fuego
  redondo, con radio de fuera y de dentro), **rectángulo** girable y forma
  **libre** (pulsa los vértices y cierra con doble clic, `Intro` o el primer
  punto; `Esc` la deja). Debajo se ajusta el **tamaño** en pies y, según la
  forma, el **ancho**, la **abertura** del cono (de 10 a 360 grados) o el
  **radio de dentro**, además de un **nombre** que se lee en el plano, el
  **color** y si **la ve la party**. Los cambios se aplican a la plantilla
  que llevas pegada al cursor. Un clic la deja fija; si arrastras antes de
  soltar, la giras. Dice a quién coge y se quitan todas con **Quitar**.
- **Niebla**, **Oscuridad** y **Luz** son pinceles de casilla. Ver más abajo.
- **Muro**, recto o en diagonal con la misma herramienta. **Junto a un
  borde** de casilla pinta una pared recta y se puede arrastrar para trazar un
  tramo. **Empezando en el centro** de una casilla pone un muro a 45 grados,
  de esquina a esquina, para salas en diagonal, torres redondas o cuevas: la
  dirección del arrastre decide si es `\` o `/`, y el trazo se ajusta solo a
  la diagonal aunque el pulso no sea perfecto. Cortan la visión y el paso
  igual que un muro normal, y **la casilla que atraviesa un muro diagonal no
  se puede pisar** (es medio muro: así nadie se cuela por la rendija).
- **Puerta**, también recta o en diagonal: pulsa **junto a un borde** para una
  puerta recta o **en el centro de una casilla** para una en diagonal (no hace
  falta muro debajo; si lo hay, se convierte en puerta). Cada pulsación la
  **abre o la cierra**; para quitarla se usa **Borrar**. Cerrada corta la
  visión y es pared; abierta deja ver y pasar, también por su casilla si es
  diagonal. En el plano se ven como un bloque: macizo si está cerrada y hueco
  si está abierta.
- **Muro libre**, a mano alzada como **Dibujar**, para paredes redondas,
  cuevas o edificios girados que no siguen la cuadrícula (con `Mayús`, en
  línea recta). Es un muro como los demás: corta la visión y el paso, separa
  salas, **Puerta** convierte en puerta el trozo de una casilla que pulses (y
  luego la abre y la cierra) y **Borrar** quita solo el trozo por el que
  pasas. A los jugadores solo les llega lo que ya han visto.
- **Borrar** quita muros, diagonales, muros libres y puertas.
- **Difícil** pinta terreno difícil (escombros, barro, maleza): **entrar en
  esas casillas cuesta el doble**. Se ve con un rayado suave en todas las
  pantallas, el alcance que se pinta al arrastrar ya lo descuenta, y el
  contador de pies del turno también. Funciona con las dos reglas de
  diagonales.
- **Dibujar** es dibujo a mano alzada sobre el plano, con cinco colores. Lo
  del DM puede verlo la party o solo él (va con el borde a rayas); lo de los
  jugadores lo ve siempre toda la mesa. Cada jugador puede borrar sus trazos;
  el DM, cualquiera, o todos de golpe.
- **Nota** clava una chincheta con texto y tipo (nota, peligro, tesoro, algo
  raro). Por defecto solo la ves tú, y se dibuja en morado con el borde a
  rayas; las que ve la party van en ámbar. **Cuando un personaje pisa la
  casilla te salta el aviso con la nota**, la vea la party o no, y si era
  secreta tienes ahí mismo el botón para enseñársela. Las marcadas para la
  party no aparecen hasta que alguien las **tiene a la vista por primera vez**;
  a partir de ahí se quedan en el mapa si está activo «recordar lo explorado»,
  y si no, solo mientras las estén viendo. Tú las ves todas siempre.
- **Acceso** pone una escalera, una trampilla o un pasadizo. Puede llevar a
  **otro mapa** o a **otro punto del mismo mapa**; la llegada se escribe o se
  marca pulsando en el plano («Marcar la llegada en el mapa»), y el DM ve una
  línea a rayas hasta ella. Al pisarlo puede pasar una de tres cosas:
  - **Preguntar quién cruza** (lo normal): a quien ha movido la ficha, sea el
    DM o un jugador, le sale una ventana con el resto de la party de ese mapa
    (y a qué distancia está cada uno). Marca a quien va, o «Toda la party», y
    cruzan juntos; se colocan alrededor de la llegada sin meter a nadie en un
    muro ni al otro lado de una pared. «Quedarse aquí» no hace nada.
  - **Cruza solo quien lo pisa**, sin preguntar.
  - **Nada**: solo marca el sitio.

  Si lleva a otro mapa, la mesa cambia de plano con quien cruce. Un jugador
  solo puede usarlo con su personaje encima, y solo se lleva a personajes, no a
  monstruos; el DM puede llevarse a cualquiera.
- Pulsa una casilla vacía para **colocar** ahí a quien todavía no esté en el
  tablero; pulsa una ficha para su menú (apuntar, atacar, estados, sacarla).
- `Alt` + clic **señala** un punto: sale un círculo animado en la pantalla de
  todos. Los jugadores tienen su propio botón «Señalar».
- Botón derecho (o `Mayús` + arrastrar) mueve la vista; `Ctrl` + rueda hace
  zoom. En el móvil se hace con dos dedos.

La niebla es de verdad: cada personaje ilumina un radio de casillas y **los
muros y las puertas cerradas cortan la línea de visión**. Con **recordar lo
explorado** activado, todo lo que la party ha llegado a ver se queda dibujado
el resto de la partida, con un velo muy leve encima para distinguir lo que
están viendo ahora de lo que solo recuerdan. El plano se va destapando solo a
medida que caminan.

En las pantallas de los jugadores y en la tele la niebla **no va a
escalones**: el borde de lo que se ve sale redondeado y se apaga con un
degradado suave, como la luz de una antorcha. Justo más allá de la vista hay
una franja de **penumbra**: esas casillas no se ven, pero se adivinan tras una
bruma. **Si en la penumbra hay una criatura, se ve una sombra con un
interrogante**: la party sabe que hay algo y dónde (y si es grande), pero no
qué es. Del servidor solo sale eso, la casilla y el tamaño: ni el nombre, ni
el color, ni nada más. Lo que esté detrás de un muro no se intuye.

La memoria vale también para los enemigos: una criatura que hayan visto se
queda dibujada, apagada y con el borde a rayas, **en el sitio donde la vieron**.
No se mueve sola, porque lo que la party recuerda es dónde estaba. **En cuanto
vuelven a mirar esa casilla y la ven vacía, la marca se cae**: ya saben que se
ha movido, dejársela ahí sería engañarles. Cuando vuelven a tenerla delante, se
actualiza. En su lista aparecen aparte, bajo «Vistos antes». Si apagas
«recordar lo explorado», no se recuerda nada ni de mapa ni de enemigos.

Lo que **no** saben nunca, salvo que tú lo abras, es cuánta vida le queda a un
enemigo: ni el aro del mapa, ni la etiqueta de herida, ni el daño acumulado.
El dato ni siquiera viaja a su navegador. Está en los ajustes del mapa y en el
panel de la pantalla, por si en tu mesa preferís jugar con las cifras a la
vista.

Una criatura **no existe para la party hasta que alguien la ve**. Sacarla del
bestiario no la enseña, y colocarla al otro lado del mapa tampoco: aparece en
su lista y en su mapa cuando entra en el campo de visión de alguno. Si después
se esconde tras una esquina, desaparece otra vez; lo único que se queda es su
sitio en la iniciativa, si ya estaban peleando.

### Lo que se ve, por capas

Hay tres niveles, de más a menos fiable:

**Visión verdadera.** La casilla se ve entera, pase lo que pase con el terreno.
La dan tres cosas: la **visión en la oscuridad** del personaje, la **luz que
lleva encima** y las casillas pintadas como **luz fija** (un brasero, una
antorcha de pared, una grieta con luz de día), que se ven siempre y desde donde
sea. Ni la niebla ni la oscuridad tapan la visión verdadera; los muros, sí.

**Vista normal.** El radio del mapa, cortado por los muros.

**Terreno pintado**, encima de lo anterior:

- **Oscuridad**: apenas se ve. Dentro alcanzas las ocho casillas de alrededor y
  nada más, y desde fuera no se ve al otro lado, solo el borde de la nube. Humo
  denso, una zarza cerrada, un conjuro de oscuridad. La visión en la oscuridad
  y la antorcha sí la atraviesan, hasta donde lleguen.
- **Niebla**: se ve algo más, y con un degradado. Hasta dos casillas se ve
  todo; de ahí en adelante cada casilla puede verse o no, con menos
  probabilidad cuanto más lejos, hasta que a siete ya no se ve ninguna. El
  efecto es el de mirar dentro de un banco de niebla: cerca se distingue todo,
  lejos solo se adivinan retazos sueltos. El sorteo es estable, así que el mapa
  no parpadea mientras nadie se mueve, pero cambia al moverte, que es
  exactamente lo que hace la niebla de verdad.

Con un personaje en mitad de un banco de niebla, medido: ve las 8 casillas de
alrededor, 13 de las 16 a distancia 2, 17 de 24 a distancia 3, 6 de 40 a
distancia 5 y ninguna a partir de 7.

Con **mapa a oscuras** la cosa cambia: cada personaje ve solo hasta donde llega
su **visión en la oscuridad** (la que le pongas en su ficha, en casillas) más
todo lo que esté **iluminado** por una antorcha y tenga a la vista. Una hoguera
al fondo del pasillo se ve aunque el tramo de en medio siga negro. La luz que
lleva cada uno también se configura en su ficha; una antorcha son 4 casillas.

Las criaturas ocupan lo que les toca por tamaño, como en el manual: diminuto y
pequeño comparten casilla con mediano, **grande** llena 2×2, **enorme** 3×3 y
**gargantuesco** 4×4. El tamaño se deduce solo del bestiario ("Gigante grande"
→ 2×2), y el tablero lo hace cumplir: una criatura no se coloca si no cabe en el
mapa, si se queda a caballo de un muro o si hay otra debajo. Mientras arrastras,
la casilla de destino se marca en rojo cuando no cabe. Un ogro de 2×2 no pasa
por una puerta de una casilla, que es justo lo que se quiere que se note.

En **Ajustes del mapa** decides si la party ve el mapa, si se revela entero, si
cada jugador puede mover su ficha desde el móvil, si los jugadores pueden
**dibujar** en el mapa (quitado, desaparece su botón y el servidor rechaza
cualquier trazo; tú sigues dibujando), si la party ve **los muros y las
puertas** dibujados (quitado, no les llega ni el trazo: siguen cortando la
vista y el paso igual, solo deja de verse la línea), si puede acercarse y alejarse,
si se pinta el alcance al arrastrar, cuántos pies mide una casilla, cómo cuentan
las diagonales y si la cámara enseña todo el plano o sigue al personaje.

En una **partida o un mapa nuevos**, de serie: los jugadores **no mueven** sus
fichas, **no dibujan** y **no ven muros ni puertas**; la cámara de la party
**sigue a los personajes con 18 casillas a lo ancho** y **encuadra las salas**
al entrar y vuelve a la de antes al salir. Las partidas que ya tenías conservan
sus ajustes.

Cada jugador tiene en su mapa el botón **Mi personaje**: encendido, su cámara
se queda centrada en **su** personaje aunque el DM lleve la acción a otro sitio;
apagado, sigue la acción como la tele. Se recuerda en su aparato.

### Forja de mapas

**Mapa → Forja de mapas** (también en los ajustes del mapa) abre un editor de
planos a pantalla completa, al estilo de **Dungeon Scrawl**, para dibujar tus
mapas dentro de Mesa y usarlos en la partida con los muros ya puestos.

- **El suelo hace las paredes.** Sala (rectángulo, con esquinas redondeadas),
  círculo u óvalo, polígono (con curvas suaves si quieres), pincel de casillas
  y **cueva** (un pincel de bordes irregulares). Lo que se toca se une en una
  sola planta y la pared sale sola alrededor; **Recortar** (`X`) quita suelo
  con la misma forma. Las paredes salen rectas y con las esquinas exactas.
- **Agua**, **caminos y ríos** (rectos, con curvas o a trazos), **muros
  sueltos** (tabiques, columnas) y **puertas**: normal, abierta, doble,
  secreta, rastrillo, arco o ventana. La puerta corta la pared sola.
- **42 objetos** vectoriales por grupos (mobiliario, templo y cripta,
  escaleras y trampillas, luz y fuego, naturaleza y marcas), con giro, tamaño,
  color y espejo; **textos** con letra, tamaño, negrita, giro y sombra, y
  **luces** con radio y color.
- **Elegir** para mover, girar (`Q`/`W`), copiar y pegar, duplicar, hacer
  **espejo** o borrar; ajuste a la casilla, a la media casilla o suelto (`Alt`).
  **Deshacer y rehacer** sin límite (`Ctrl + Z` / `Ctrl + Y`).
- **Capas** con visibilidad, bloqueo, nombre, opacidad y orden.
- **Estilos** de serie (Pergamino, Mazmorra, Cueva, Tinta, Plano azul, Bosque)
  o a mano: colores, grosor de pared, rayado de roca alrededor, sombra,
  textura del suelo, cuadrícula (en el suelo, en todo o sin ella) y tamaño
  del plano.
- **Generar una mazmorra**: salas (cuántas y de qué tamaño), su forma
  (cuadradas, redondeadas, variadas o cueva), ancho de pasillo, trazado
  (equilibrado, con bucles, serpenteante), puertas, escaleras y objetos. La
  **semilla** la repite igual y se ve antes de aceptarla.
- **Guardar proyecto** y **Abrir** (un `.json` para seguir otro día o llevarlo
  a otra partida), **Exportar imagen** en PNG a 50, 70 o 140 píxeles por
  casilla, y un borrador que se guarda solo en el navegador mientras dibujas.

**Usar en este mapa** convierte el plano en la imagen de fondo con la
cuadrícula ya encajada y pone sus paredes, puertas y ventanas como **muros de
Mesa**: las puertas se abren y se cierran, las secretas son pared para la party
y los arcos son hueco. Si quieres, las luces del plano alumbran como casillas de
luz fija. El diseño se guarda con el mapa (no se manda a los jugadores) para
volver a abrirlo y retocarlo.

### Salas, zonas reveladas y zonas ocultas

Tres pinceles más, en el grupo **Zonas**, que solo ve el DM (la party nunca
recibe dónde están):

- **Sala**: pinta la zona de una sala grande, la del jefe, o un pasillo largo.
  **En cuanto un personaje entra, la party ve la sala entera**, aunque la luz
  o el radio de visión no lleguen al fondo. Al salir, deja de verse (o se
  queda como recuerdo, si está activado «recordar lo explorado»).

  Cada pulsación del botón **Sala empieza una sala nueva**, con su propio
  color; todos los trazos que hagas después son de esa misma sala, así que se
  puede pintar fila a fila. Para seguir pintando una que ya existe, empieza el
  trazo dentro de ella. Por eso **dos salas pegadas, sin pared entre ellas,
  se revelan por separado**: entrar en la primera no enseña la segunda.

  Además, los muros y las puertas parten una sala, **también los diagonales**:
  una sala cortada por un muro en diagonal de pared a pared son dos trozos, y
  se revela solo el lado en el que estás. Un tramo diagonal suelto que no
  cierra nada no parte la sala.
- **Revelar**: la party ve esas casillas siempre, esté donde esté. Para un
  patio a la luz del día o una sala que ya conocen.
- **Ocultar**: la party **no** ve esas casillas nunca, aunque las tenga
  delante, y se borran también de lo que recordaba. Para guardar una sorpresa
  o tapar una parte del plano que aún no toca. Ni lo que haya dentro ni las
  criaturas que estén ahí viajan a sus aparatos.
- La goma de ese grupo quita salas y zonas.

Si en los ajustes del mapa está «revelar entero», manda eso: se ve todo,
también lo ocultado.

### Sonido ambiente y música

La herramienta **Sonido** del mapa pone audio en una casilla: una hoguera, un
río, la música de la taberna. Cada sonido se oye **desde ese punto** (con su
alcance, más fuerte al acercarse si quieres, y apagado detrás de una pared o
una puerta cerrada), **en toda la sala** donde está o **en todo el mapa**. Cada
móvil oye lo que oye su personaje; la tele, lo que oye la party.

Si no tienes tus propios audios, la **Biblioteca de Mesa** trae 36 listos para
usar, en bucle sin cortes: clima (lluvia, tormenta, ventisca…), naturaleza
(bosque, noche, arroyo, costa, pantano…), fuego y forja, lugares (taberna,
plaza, templo, biblioteca, barco), bajo tierra (cueva, mazmorra, cripta,
alcantarillas), magia y nueve piezas de música (taberna, exploración, descanso,
bosque feérico, misterio, lamento, combate, batalla épica y terror). Al elegir
uno se propone cómo colocarlo; todo se puede cambiar.

Están **sintetizados para Mesa** con `tools/sonidos/generar.mjs` (hace falta
ffmpeg): no hay grabaciones ni música de nadie, así que se pueden usar y
compartir sin pedir permiso. Van en estéreo y se apoyan en modelos físicos:
las gotas son golpes y burbujas que resuenan como en el agua de verdad. La
gente no habla en primer plano (una voz sintética de cerca suena a robot):
la taberna y la plaza son un rumor lejano de decenas de voces, con la sala
alrededor, y lo que se oye de cerca son jarras, pasos, cascos, campanas y un
laúd al fondo; el templo es un órgano y la cripta, piedra y viento. Cada
aparato guarda los que ha sonado y no los vuelve a descargar, y suelta de la
memoria los que llevan un rato sin sonar.

## La biblioteca del DM

Abajo a la izquierda, solo en la vista del DM, hay una **estantería** con los
libros de la partida. Un toque en un lomo lo saca de la balda y lo abre en
doble página: a la izquierda el índice y el buscador, a la derecha el texto
en pergamino, con letra capitular, filigranas y las runas de la tapa
encendidas. Las flechas del pie (o `←` `→`) pasan de sección con su paso de
página, `Esc` lo cierra y cada libro recuerda por dónde ibas. La flecha de la
estantería la guarda y deja solo un botón «Biblioteca» para la vista limpia.

Vienen **cuatro libros de serie**, que no se pueden quitar:

- **Reglas de D&D**: la historia de las ediciones (de la caja blanca de 1974 a
  la revisión de 2024), lo esencial de la quinta edición, una sección para las
  reglas de 2014 (SRD 5.1) y otra para las de 2024 (SRD 5.2), y luego combate,
  magia, aventura y exploración, estados, equipo, reglas opcionales y
  herramientas para el DM.
- **Manual del jugador**: una sección por clase (rasgos básicos, progresión de
  los 20 niveles, rasgos, la subclase del SRD, el resto de subclases y qué
  cambia en 2024), más especies y trasfondos.
- **Compendio de conjuros**: los 339 conjuros del SRD 5.2.1 (reglas de 2024), por nivel (trucos y
  niveles 1 a 9) con su ficha completa, más índices por clase y por escuela.
  Las fórmulas se tiran con un clic, como en el resto de Mesa.
- **Bestiario**: las criaturas de Mesa y las tuyas, por tipo (aberraciones,
  bestias, dragones…) con la ficha completa, y un índice por desafío.

**Buscar** no distingue mayúsculas ni tildes («bola de fuego», «dragon rojo»),
marca lo encontrado y lleva a la sección; se puede buscar en todo el libro o
solo en la sección abierta. La lupa de la estantería busca en **todos los
libros a la vez**.

Con el **+** añades tus documentos:

- **PDF** (hasta 150 MB): al subirlo se saca su texto en tu navegador, con
  pdf.js, para poder buscar; su índice se convierte en secciones (y, si no
  tiene, va por bloques de diez páginas). «Ver original» enseña la página tal
  cual.
- **Texto o Markdown**: los títulos se convierten en secciones.
- **Imagen**: un mapa, una carta o un retrato, con un botón para enseñarla a
  la mesa.
- **Cuaderno**: tu documentación, escrita en la propia página y por
  secciones; se guarda sola mientras escribes.

Dentro de cada libro tuyo puedes buscar, descargarlo, renombrarlo, cambiar el
color de la tapa o **quitarlo de la biblioteca**. La biblioteca **solo la ve el
DM**: ni los jugadores ni la tele la reciben, y solo el DM puede subir
documentos.

### Créditos de los libros

Las reglas, las clases y los conjuros están resumidos y redactados para Mesa a
partir del *System Reference Document* 5.1 y 5.2 de Wizards of the Coast,
publicados bajo [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode);
cada libro lo recuerda en su sección de créditos. No se copia el texto de los
manuales oficiales, que no tienen licencia libre: si los tienes en PDF, súbelos
a tu biblioteca y se quedan en tu partida. Los PDF se leen con
[pdf.js](https://mozilla.github.io/pdf.js/) de Mozilla (Apache 2.0, en
`public/vendor/pdfjs/`).

## Ver un área antes de lanzarla

Un jugador con conjuros de área tiene en su mapa el botón **Mis áreas**. Elige
uno, la plantilla se le pega al cursor y un toque la deja fija: entonces le dice
a quién cogería. **Eso se dibuja solo en su pantalla.** Ni el DM ni el resto de
la mesa lo ven, y no gasta nada: es para mirar a ojo si el cono coge a los tres
goblins antes de decidirse, sin tener que pedirle al DM que lo mida.

Se distingue de las plantillas de la mesa porque va con el borde a rayas, y se
quita con «Quitar áreas». Para lanzarlo de verdad se usa **Atacar** en la ficha,
que es donde se gasta el espacio de conjuro.

## Conjuros

Cada personaje, y cada monstruo que los tenga, lleva su **lista de conjuros**
(botón **Conjuros** en la ficha). Se añaden desde una **biblioteca con los 391
conjuros del Manual del Jugador de 2024**, de trucos a nivel 9 y de todas las
clases (bardo, brujo, clérigo, druida, explorador, hechicero, mago, paladín y
también el artífice) y especies: los 339 del SRD 5.2.1 y los 52 que solo
están en el manual (Maleficio, Armadura de Agathys, Doblar por los muertos,
los Invocar…, los castigos de paladín, Estática sináptica…). Están
**contrastados con dos fuentes**: el texto oficial del SRD 5.2.1 (vía Open5e)
y la lista completa de 2024 conjuro a conjuro (nivel, escuela, clases,
tiempo, alcance, componentes y duración); de ahí salieron 12 componentes que
estaban mal en el compendio y se han corregido.

Al **añadir de la biblioteca** se busca por nombre (también **en inglés**) o
escuela y se filtra por **nivel** (trucos, 1 a 9), **categoría** (daño,
curación, estados, control del campo, defensa y mejoras, invocación,
movimiento, información y utilidad; un conjuro puede estar en varias) y
**clase**, con el recuento de lo que queda a la vista. **156 se resuelven
solos** en Mesa (ataque, salvación, daño directo, cura o vida temporal, con su
daño, estado y área); el resto entran como «solo efecto»: gastan el espacio y
el registro cuenta lo que hacen. Los de siempre llevan su versión de 2024 (Curar heridas 2d8,
Palabra curativa 2d4, Dormir con salvación de Sabiduría, Arma espiritual con
concentración, Toque helado cuerpo a cuerpo…), y las copias que ya estaban en
las fichas sin retocar se ponen al día solas; las retocadas se respetan. La
característica de lanzamiento se adivina por la clase y se puede
cambiar; la CD y el bonificador de ataque salen solos de la ficha, y el DM
puede fijarlos a mano para un monstruo.

Al **lanzar** se elige el espacio (también uno mayor, para potenciarlo), los
objetivos y, si es de área, se puede **colocar el área en el mapa** y coger
directamente a quien quede dentro. Después **el servidor lo resuelve todo**:

- **Ataque de conjuro**: tira el ataque contra la CA de cada objetivo, con
  ventaja o desventaja, críticos incluidos; los de varios rayos tiran uno por
  rayo, y los trucos suben de daño con el nivel del personaje.
- **Salvación**: tira la salvación de cada objetivo con su característica y
  su competencia; quien falla recibe el daño entero y el estado (paralizado,
  apresado, asustado…), y quien la supera, la mitad o nada, según el conjuro.
- **Proyectil mágico**: los dardos impactan siempre y se reparten.
- **Curas**: suman la característica de lanzamiento y levantan a quien
  estaba en el suelo.
- **Daño directo**: los castigos y golpes que se lanzan tras impactar
  (Castigo divino, Castigo atronador, Golpe atrapador…) meten su daño sin
  tirar para impactar y, si piden salvación, solo quien la falla se queda con
  el estado.
- **Vida temporal**: Falsa vida, Armadura de Agathys… dan sus puntos de golpe
  temporales, potenciados con espacios mayores.
- **Dormir**: tira la reserva y duerme de menos a más vida.
- **Concentración**: si el conjuro la pide, el personaje queda concentrado (la
  salvación al recibir daño es CD 10 o la mitad del daño, como mucho 30); si
  ya lo estaba en otro, ese se pierde y se dice en el registro. Los estados
  que pone duran lo que dura el conjuro y se quitan solos.

Gasta el espacio solo si el lanzamiento es válido (si no hay objetivos o no
quedan espacios, avisa y no gasta nada). El DM puede lanzar en secreto. Un
jugador solo puede lanzar los de su propio personaje.

En la pestaña **Acciones** de la ficha, debajo de los ataques, sale la **tabla
de conjuros**: nombre y nivel, alcance, golpe o CD, y efecto (daño y tipo, o
cura), con el bonificador y el daño listos para tirar con un toque y el botón
**Lanzar**. Los trucos ya salen con el daño de su nivel.

**Todo conjuro se puede retocar**, como un ataque: el lápiz de cada uno en la
lista de conjuros cambia nombre, nivel, tiempo, alcance, duración, cómo se
resuelve (ataque, salvación, dardos, cura, sueño, daño directo, vida temporal o solo efecto), daño y tipo,
mitad si salva, lo que sube con espacios mayores, el estado que pone y cuántas
rondas, objetivos, área y concentración. Ese cambio es solo de esa ficha.
**Crear un conjuro** hace uno desde cero.

**La biblioteca también es editable.** Si un conjuro de serie se queda
anticuado o tu mesa lo juega de otra forma, el DM lo retoca en **Añadir de la
biblioteca** y, en esa partida, su versión **sustituye** a la de serie (sale
marcado como **retocado**); al guardarlo puede aplicarlo también a las fichas
que ya lo tienen. **Restaurar el de serie** lo deshace, en la biblioteca y en
esas fichas. **Crear en la biblioteca** añade conjuros propios para toda la
mesa. Los retoques viajan con la copia de la partida.

## Voz

Botón **Voz** en la barra de arriba, para el DM y para cada jugador. Al
pulsarlo, el navegador pide permiso para el micro y entras en la voz de la
mesa: todos los que estén dentro se oyen entre sí. Se puede **silenciar el
micro** sin salir, y un círculo con la inicial de cada uno se ilumina **cuando
habla**. La tele no entra en la voz (para que no se acople).

El audio va **directamente de aparato a aparato** (WebRTC): no pasa por el
ordenador del DM, que solo hace de presentador para que se encuentren. Con una
mesa de 4 o 5 personas va de sobra.

Dos límites que conviene saber:

- **Hace falta una conexión segura.** El navegador solo deja usar el micro en
  https o en `localhost`. Funciona con el enlace de **Jugar por internet**
  (también si estáis en la misma wifi: entrad todos por ese enlace) y en el
  propio ordenador del DM. Con la dirección de la wifi (`http://192.168…`)
  el navegador lo bloquea, y Mesa lo explica al pulsar el botón. Arrancar con
  `--cert` y un certificado de confianza también lo resuelve.
- **Algunas redes no dejan conectar aparato con aparato** (ciertos datos
  móviles o redes de empresa muy cerradas). Ahí la voz de esa persona sale como
  «no se ha podido conectar». Mesa no lleva un servidor de retransmisión
  (TURN) propio; si os pasa a menudo, Discord sigue siendo la alternativa.

En la versión de prueba (GitHub Pages) no hay voz: no hay servidor que presente
a los aparatos.

## Dados y charla

El panel de la derecha (abajo, en el móvil) tira `1d20+5`, `2d6`, `8d6` y lo que
le eches, con botones para ventaja y desventaja. Los críticos y las pifias se
marcan.

**Dados en 3D.** Cada tirada rueda por encima de la pantalla con dados de
verdad, uno por cada dado tirado y de su tipo (d4, d6, d8, d10, d12, d20; el
d100 son dos d10, decenas y unidades), del color de quien tira: caen, rebotan
contra los bordes, se paran y una placa enseña el total (verde y «¡Crítico!»
con un 20 natural, roja y «Pifia» con un 1). La caída se simula antes y el
dado se numera para que la cara de arriba sea el resultado que salió: rueda de
verdad y el número es el bueno. El **d4** se apoya en una cara con la punta
hacia arriba, y el resultado es el número de esa punta, como en un d4 de
verdad. El **6 y el 9** (y el 60 y el 90 del d100) llevan una raya debajo para
no confundirlos. También ruedan los dados de los ataques y
conjuros que resuelve el servidor. Se ven **en la tele y en la pantalla del
DM**; las tiradas **secretas** del DM, solo en la suya. Con **Dados de los
jugadores solo en la tele** (en el panel del DM), las tiradas de los jugadores
no le saltan en su pantalla y siguen saliendo en la tele. Con «reducir
movimiento» se ve el final sin la caída. Los dibuja
[three.js](https://threejs.org) (MIT, en `public/vendor/three/`), que se carga
la primera vez que hace falta. Todo va a un registro común que ven todos, salvo lo que el DM tire con
**En secreto**. Las características, salvaciones y habilidades de cada ficha se
tiran desde la propia ficha, ya con su modificador.

Debajo del registro hay una **caja para hablar**. El botón del bocadillo abre
la lista de la mesa: marcas al DM, a un jugador o a varios, y el mensaje se
convierte en un **susurro** que solo leen ellos. Vale para todos, no solo para
el DM: un jugador puede pasarle una idea a otro, y el DM puede contarles algo a
dos a la vez sin que se entere el resto. Lo que susurras no llega siquiera al
navegador de los demás y **nunca sale en la tele de la mesa**. Sin marcar a
nadie, lo lee toda la mesa.

Como con Beyond20, **las fórmulas de los textos se tocan para tirar**: el
«2d6» de un rasgo, el «1d6 + 2» de una acción del bestiario o el «+5 al ataque»
de un objeto salen subrayados y un clic los tira a nombre de quien los tiene.
Y con el teclado, cualquier tirada se modifica al pulsar: **Mayús** tira con
ventaja, **Ctrl** (o **Cmd**) con desventaja y **Alt** en secreto; un jugador,
con Alt, tira **solo para el DM** (lo ven el DM y él, nadie más).

Cada ficha tiene **Efectos** en su pestaña de Acciones: Bendecir, Perdición,
Guía, Furia, Marca del cazador, Maleficio… o uno a medida. Mientras estén
encendidos se suman solos al ataque, al daño, a las salvaciones o a las
pruebas, también en las tiradas que hace el servidor y en las salvaciones de
quien recibe un conjuro. Se apagan con un toque sin borrarlos.

El registro se filtra por **Todo**, **Tiradas** o **Charla**, y en el móvil sale
un punto en la pestaña cuando hay algo sin leer.

En el ordenador, la flecha de la cabecera **pliega el panel** en una tira
estrecha a la derecha y la mesa o el mapa ganan ese ancho; si llega algo nuevo
al registro, la tira lo marca con un punto. Se despliega con la misma flecha o
tocando la tira, y cada aparato recuerda cómo lo dejaste.

Desde **⋯ → Pedir una tirada a la party** eliges qué pides, a quién y con qué
CD; a cada jugador le sale un botón grande en su móvil y, al pulsarlo, tira y se
anuncia si supera la dificultad. Y con **Enseñar una imagen a la mesa** sale a
pantalla completa en la tele y en el móvil de todos: mapas de tesoro, cartas,
retratos del villano. Cada jugador puede **cerrarla** para mirar el mapa o su
ficha y **reabrirla** con el botón **Imagen del DM** de arriba mientras la
sigas enseñando; cuando la guardas, se cierra en todos y el botón desaparece.

## La pantalla de la mesa

La tele es **una sesión aparte**, con su propio nombre y su propio testigo: no
hereda la tuya aunque la abras en el mismo ordenador, y no puede tocar nada de
la partida. Desde **⋯ → Pantalla de la party** la abres, ves cuántas hay
conectadas y decides qué enseña: el mapa, los puntos de vida exactos de la
party y si se revela el plano entero. La propia pantalla tiene, arriba y muy
discreto, el botón de pantalla completa y el de salir, que devuelve al menú de
entrada igual que en las otras dos vistas.

### Lo que se ve en la tele

Fuera de combate, las cartas de la party ocupan la fila entera, con su retrato,
su clase, su barra de vida, su CA y sus estados como etiquetas.

El mapa manda: ocupa todo el alto que sobra, centrado, con margen a los cuatro
lados. Con el plano entero a la vista, el hueco toma la forma del mapa para que
no queden franjas negras; siguiendo a un personaje, el encuadre se adapta al
hueco y, cuando alguien llega al borde del plano, **lo que se mueve es él dentro
del encuadre**, en vez de quedarse el mapa a un lado con una franja negra al
otro.

Fuera de combate no hay nada encima del mapa: solo el plano y, debajo, la
party **en segundo plano**: una franja fina con cara, nombre, vida y estados.
En combate **el mapa sigue mandando**: se queda en el centro con todo
el alto libre, **la party pegada al borde izquierdo y los enemigos pegados al
borde derecho**, en espejo y con cartas compactas (cara, nombre, vida y
estados). Si todavía no hay enemigos a la vista, su columna se la queda el
mapa. **Quien tiene el turno** va en una franja arriba: retrato, vida, clase de
armadura, los pies de movimiento que le quedan, si ha gastado ya la acción, la
adicional o la reacción, los estados que sufre, en qué está concentrado y quién
va después. Debajo, la tira de iniciativa. Los que no están en la pelea se
apagan. Al empezar y al acabar el combate, las cartas viajan de la franja de
abajo a la columna de la izquierda (y vuelven) en vez de saltar.

Con la mazmorra llena de fichas, las columnas no necesitan que nadie las
desplace desde el sofá: primero se compactan y, si aun así no caben, los
enemigos se **agrupan por tipo** («Goblin ×12, 9 en pie») con un punto de
color por cada uno según cómo está. En una pantalla estrecha o en vertical
todo se apila con el mapa primero.

### Proyectar la tele

La pantalla es una ventana más del navegador del DM. En **⋯ → Pantalla de la
party**:

- **Abrir en una ventana aparte**: sale sin barras y se arrastra al segundo
  monitor o al proyector. Doble clic dentro y queda a pantalla completa.
- **Abrir en el otro monitor** (Chrome y Edge): la coloca directamente en la
  otra pantalla conectada por cable. La primera vez el navegador pide permiso.
- **Abrir en otra pestaña**: para enviarla al **Chromecast** desde el menú del
  navegador (*Enviar…* → *Enviar pestaña*).

La pantalla entra sola, sin pasar por el menú de entrada. Aunque esa pestaña
no sea la que tienes delante, el mapa se mantiene al día: si el navegador no
le da fotogramas, las fichas se colocan en su sitio en vez de quedarse a
medio deslizar.

### Movimiento

Las animaciones son pocas y con intención: solo se mueve lo que acaba de
cambiar. **La tirada** es el momento de la mesa: en el registro y en la tele el
número cae girando y se asienta; un **crítico** suelta un aro verde y brilla, y
una **pifia** tiembla en rojo. Solo se anima la entrada que acaba de llegar,
nunca las anteriores al repintar. Las fichas **se deslizan** de casilla a casilla (y la cámara que sigue
a un personaje lo acompaña sin saltos); al empezar un turno, un **aro dorado**
se abre una vez desde la ficha de quien actúa; un golpe deja un **halo rojo** y
una cura uno verde, en el mapa y en su carta, y las barras de vida bajan
deslizándose. Las ventanas, el bestiario y las pestañas entran con un fundido
corto. Nada se anima en bucle, así que la tele no gasta de más, y quien tenga
activado «reducir movimiento» en su sistema no ve nada que se desplace, gire
o tiemble: lo nuevo aparece con un fundido y los colores (el verde del
crítico, el rojo del golpe) siguen diciendo qué ha pasado.

Una criatura que sale de la niebla aparece sin deslizarse: si lo hiciera,
enseñaría por dónde ha venido.

## Dónde viven los datos

En la carpeta `data/` junto al programa: `mesa.json` con la partida, `images/`
con los planos y los retratos, y `wallmodel.json` con lo que ha aprendido la
propuesta de muros y los planos con los que se enseñó. Se guarda solo, unas décimas después de cada
cambio, y sobrevive a que cierres la ventana.

Desde **⋯ → Guardar copia de la partida** te llevas un `.json` con todo, y
**Cargar una copia** lo devuelve. Las copias de la versión anterior de Mesa (la
de escritorio) se cargan igual: personajes, bestiario, mapas, muros y retratos
se convierten solos. Los planos y las caras, que en aquellos archivos iban
incrustados en el propio `.json`, se sacan a `data/images/` al importarlos: por
eso una partida de medio mega se queda en unos 27 KB de estado, que es lo que
viaja a cada cambio.

## Atajos del DM

| Acción | Atajo |
|---|---|
| Añadir personaje | `Ctrl/Cmd + N` |
| Iniciar o terminar combate | `Ctrl/Cmd + K` |
| Abrir el bestiario | `Ctrl/Cmd + B` |
| Siguiente turno | `barra espaciadora` o `Ctrl/Cmd + →` |
| Turno anterior | `Ctrl/Cmd + ←` |
| Deshacer | `Ctrl/Cmd + Z` |
| Soltar la selección o la plantilla | `Esc` |
| Apuntar a una ficha del mapa | `Ctrl/Cmd` + clic |
| Señalar un punto | `Alt` + clic |

En la pantalla de la party, doble clic entra y sale de pantalla completa.

## Estructura

```
server.js              servidor: red, disco y reparto a cada aparato
public/
  index.html           el documento; la interfaz la monta el JavaScript
  manifest.webmanifest lo que hace falta para instalarla como aplicación
  sw.js                trabajador de fondo: guarda el código y las imágenes
  icons/               iconos de la aplicación (normal, «maskable» y Apple)
  css/mesa.css         estilos
  js/
    main.js            entrada a la partida y reparto de vistas
    net.js             conexión, reconexión y envío de operaciones
    engine.js          las reglas de la partida (lo usan el servidor y la versión de prueba)
    local.js           versión de prueba: habla con la partida que corre en el navegador
    local-host.js      versión de prueba: el «servidor» dentro del navegador
    local-worker.js    versión de prueba: lo comparte entre pestañas
    schema.js          forma de los datos y migración (lo usan servidor y navegador)
    los.js             muros, luz, visión, distancias y plantillas (compartido)
    attacks.js         leer y lanzar ataques
    hoja.js            la ficha con el formato de la hoja de personaje de 2024
    dice3d.js          dados en 3D: la escena, las caras y quién los ve
    dice3d-core.js     dados en 3D: forma de cada dado, física y numeración
    chips.js           indicadores con icono de ataques y conjuros (alcance, área, estado…)
    bestiario-datos.js las 334 fichas del SRD del bestiario (reglas de 2024), con su inglés
    bestiario-homebrew.js las 22 criaturas de la casa del folclore de la península
    bestiario-mundo.js las 40 criaturas de la casa del folclore del mundo
    retratos.js        fotos de las criaturas: encuadre, carga en bloque, pegar y traer de internet
    chars-io.js        exportar e importar personajes entre campañas
    forja.js           la forja de mapas: el editor a pantalla completa
    forja-core.js      la forja: geometría del plano, paredes, puertas y generador
    forja-draw.js      la forja: estilos, objetos y cómo se pinta el plano
    spells.js          biblioteca de conjuros (los 391, con su mecánica y categorías)
    spellbook.js       lista de conjuros de cada personaje y ventana de lanzar
    voice.js           voz entre aparatos (WebRTC)
    portals.js         cruzar un acceso con varios a la vez
    attacks-core.js    el trozo de los ataques que también usa el servidor
    map.js             el tablero en canvas
    dm.js              vista del DM
    player.js          vista del jugador
    screen.js          pantalla de la party
    dice.js            motor de dados
    dice-panel.js      panel de dados y registro
    char-editor.js     editor de fichas
    catalog.js         criaturas de partida
    library.js         la biblioteca del DM: estantería, libro abierto y documentos
    library-core.js    trocear Markdown y PDF en secciones y buscar en los libros
    tour.js            el tutorial guiado: foco, tarjeta, índice y buscador
    tour-content.js    los recorridos de cada pantalla, por secciones (español e inglés)
    tour-example.js    las fichas de ejemplo del tutorial (solo en la pantalla del DM)
    libros/            los cuatro libros de serie (reglas, jugador, conjuros, bestiario);
                       conjuros-lista.js (los 391), conjuros-mec.js (cómo se
                       resuelve cada uno y su nombre en inglés), conjuros-en.js y
                       jugador-en.js (los textos en inglés, que solo se cargan en inglés)
  vendor/pdfjs/        pdf.js de Mozilla, para leer los PDF de la biblioteca
  vendor/three/        three.js (MIT), para los dados en 3D
data/                  la partida y las imágenes (se crea al arrancar)
```

## Seguridad, con nombre y apellidos

- El rol de DM pide un código que solo sale en tu terminal.
- Cada jugador solo puede tocar su ficha, y solo puede mover su token a
  casillas que su party ve; el servidor lo comprueba, no el navegador.
- Lo que un jugador no debe saber no se le manda: ni la CA de un monstruo, ni
  sus PV exactos, ni tus notas del mapa, ni las plantillas que no compartas, ni
  los susurros de otro, ni tu biblioteca.
- Las tiradas de ataque y el reparto de puntos de vida se resuelven en el
  servidor. Nadie puede decidir desde su navegador que ha impactado.
- La voz va de aparato a aparato. El servidor solo reenvía los mensajes para
  que se encuentren, y únicamente entre dos personas que tengan la voz abierta.
- El código del DM tiene seis cifras y, tras cinco intentos fallidos, ese
  aparato espera diez minutos antes de poder probar otro.
- El DM puede **cerrar la mesa** (no entra nadie nuevo) y **expulsar** a
  cualquiera desde el contador de conectados.
- Pensado para jugar con amigos. No hay cuentas: quien tenga la dirección
  puede entrar como jugador mientras la mesa esté abierta. Por internet, el
  túnel de «Jugar por internet» cifra la conexión (HTTPS); en casa, por la
  wifi, va sin cifrar salvo que arranques con `--cert`.

## Lo que aún no hace

- Los libros de serie son resúmenes del SRD, no los manuales oficiales
  completos. El compendio de conjuros y los rasgos de clase salen en inglés;
  Reglas, la prosa del Manual del jugador y las fichas del bestiario dentro
  del libro siguen en español (la interfaz sí se traduce). De las subclases
  que no son del SRD solo va el nombre y la idea.
- Un PDF escaneado (páginas que son fotos) no tiene texto que buscar: se lee
  con «Ver original», pero el buscador no lo encuentra.

- Los dados en 3D se ven en la tele y en la pantalla del DM, no en el móvil
  de los jugadores (en el suyo se lee la tirada en el registro).
- La biblioteca trae los 391 conjuros del Manual del Jugador de 2024; los de
  suplementos (Forgotten Realms, Eberron, Arcana Unleashed y las entregas de
  D&D Beyond) no están. De los 391, los que no hacen daño, curan, dan vida
  temporal ni ponen un estado (Escudo de fe, Bendecir, Revivificar…) se anotan
  en el registro y el efecto lo aplicas tú; los que reparten una cantidad
  entre varios (Palabra de poder: fortalecer, Curar en masa) también.
- En inglés, los conjuros del SRD muy largos (Deseo, Polimorfar…) llevan su
  texto oficial recortado; el entero está en el SRD.
- La voz no tiene servidor de retransmisión: en redes que no dejan conectar
  aparato con aparato, no llega.
- Los muros diagonales van de esquina a esquina; curvas de otro ángulo se
  aproximan con varios tramos.
- La forja dibuja en cuadrícula cuadrada: no hace mapas hexagonales ni
  isométricos, ni exporta a PDF o al formato UVTT de otros programas (sí a
  PNG y a su propio proyecto). La imagen se genera en el navegador del DM.

Del inglés, además: se traduce la interfaz, no la partida. Si escribes tus
notas o el bestiario en español, en inglés seguirán en español.
