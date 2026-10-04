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
viene de fábrica**, con sus 115 criaturas, sus fichas técnicas, sus rasgos y
sus ataques ("Cimitarra — +4 al ataque — 1d6+2 cortante" sale como "Scimitar —
+4 to hit — 1d6+2 slashing"). Lo que escribís vosotros no se toca: los
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

Cada personaje tiene su tarjeta con vida, CA, estados y, al desplegarla,
características, salvaciones, habilidades, espacios de conjuro, recursos
propios y sus notas. Los botones **−** y **+** con la casilla del medio aplican
daño y curación; `Intro` aplica daño y `Mayús + Intro`, curación. La vida
temporal se descuenta antes que la de verdad y el aviso de concentración salta
solo, con la CD ya calculada.

Los estados son los del reglamento, con su explicación al pasar el ratón, y se
quitan pulsando la etiqueta. El agotamiento va aparte, por niveles.

Cada estado deja **su marca en la ficha del mapa**: un ojo tachado para cegado,
una red para apresado, una gota para envenenado, un rayo para paralizado. Caben
tres chapitas en arco sobre la ficha y, si hay más, la última dice cuántas
faltan, porque cinco marcas diminutas no se distinguen desde el otro lado de la
mesa.

Cada estado puede llevar **una duración en rondas**: al cerrarse el turno de
quien lo sufre, la cuenta baja sola y el estado se cae solo cuando toca, con
aviso en el registro. El agotamiento va aparte, por niveles.

**Descansar** abre las dos opciones. El **largo** devuelve vida, espacios,
recursos y la mitad de los dados de vida, y baja un nivel de agotamiento. En el
**corto**, cada personaje gasta sus dados de golpe desde su propia ficha (tira
el dado, suma Constitución y se cura). A los monstruos no les afecta ninguno.

El botón **↶** (o `Ctrl/Cmd + Z`) deshace el último cambio. Se guardan los
veinte últimos, así que un daño mal apuntado o un borrado por error se arreglan
en un segundo.

## Combate

**Iniciar combate** monta el orden con las iniciativas que ya haya.
**Tirar iniciativa** las tira todas de golpe (las de los monstruos, en secreto)
y reordena. Cada jugador puede tirar la suya desde su móvil.

Al empezar un combate, Mesa propone quién entra y te deja retocarlo antes de
arrancar. No entra todo el que esté en el mapa: se quedan fuera los que están a
0 puntos de vida, las criaturas que **la party todavía no ha visto** (meterlas
delataría que hay algo ahí) y las que están a más de doce casillas de la pelea.
De cada uno se dice por qué está dentro o fuera, y se marca o desmarca a mano.

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
que apuntes en la ficha y los que Mesa **lee de las acciones de la criatura**,
que vienen escritos en prosa en el bestiario ("Cimitarra. Ataque con arma cuerpo
a cuerpo: +4 al ataque… Impacto: 5 (1d6+2) de daño cortante"). De ahí saca el
bonificador, el daño y el tipo.

Cada ataque puede llevar además **un nivel de conjuro** y **una forma de área**
(esfera, cono, línea o cubo, con su tamaño en pies). Con nivel, al lanzarlo se
gasta un espacio de ese nivel y, si no te quedan, no te deja lanzarlo. Con
forma, aparece en «Mis áreas» del mapa.

Eliges objetivo, ventaja o desventaja y ya: se tira el ataque, se compara con la
CA, un 20 natural duplica los dados de daño y el daño se resta de la ficha del
objetivo. Todo queda en el registro con los dados a la vista.

**La tirada la hace el servidor, no tu navegador.** Es lo que permite que un
jugador ataque a un monstruo sin saber su CA y sin poder decidir por su cuenta
que ha impactado. Los ataques con salvación ("CD 13 de Destreza") también se
reconocen y se anuncian con su CD.

El resumen de encuentro calcula los PX ajustados por número de criaturas y los
compara con el presupuesto de la party, así que ves si el combate es fácil,
medio, difícil o mortal antes de que empiece.

## Bestiario

Trae **115 criaturas listas**, de VD 0 a 30: del plebeyo y el goblin a la
tarasca, pasando por necrófagos, oso lechuza, mantícora, trol, elementales,
gigantes, dragones de cría a adulto, vampiro, liche, balor y kraken. Hay de los
catorce tipos (humanoides, bestias, muertos vivientes, monstruosidades,
infernales, hadas, dragones, gigantes, elementales, constructos, cienos,
plantas, celestiales y aberraciones), con fichas completas: características,
sentidos, idiomas, resistencias, rasgos y acciones, y sus ataques listos para
tirar de un clic, alientos y conjuros con salvación incluidos.

Arriba del bestiario se busca por nombre (también en inglés: «owlbear»
encuentra al oso lechuza) y se filtra **por tipo** y **por VD** (0 a 1/2, 1 a
2, 3 a 4, 5 a 8, 9 a 16, 17 o más). La lista sale ordenada por desafío, y
cada criatura despliega su **ficha** sin salir de ella.

**Todas tienen retrato y todas del mismo estilo**: una silueta en tinta sobre
el color de su tipo, de modo que en el tablero se distingue de un vistazo un
muerto viviente (hueso) de un infernal (carmesí) o un cieno (verde ácido), y
la silueta dice cuál es. Dragones y elementales llevan el color de su
elemento. Al ser siluetas se leen igual a 30 píxeles en el móvil que en la
tele, que es donde un retrato pintado se convierte en una mancha.

Cada criatura puede llevar **su propio retrato**: se sube una vez en el
bestiario y todas las que invoques salen ya con esa cara, en la tarjeta y en
su ficha del mapa. El tamaño también viaja, así que un ogro guardado como
«Grande» ocupa 2×2 en cuanto lo pones en el tablero.

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

Las fichas incluyen material del *System Reference Document 5.1* de Wizards
of the Coast, publicado bajo [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode).
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

Cada mapa tiene su imagen de fondo, su cuadrícula, sus muros y su niebla. Al
cargar una imagen, las filas se ajustan solas a su proporción para que el plano
no salga deformado.

- **Fichas** arrastra por las casillas. Al arrastrar se pinta **hasta dónde
  llega** con la velocidad que le quede, rodeando muros, y un contador dice
  cuántos pies lleva. Un recuadro sobre el tablero **elige varias** y las mueve
  juntas guardando la formación; `Mayús` + clic añade o quita de la selección.
- **Regla** mide entre dos casillas en pies y en casillas, con la regla del
  manual o la variante 5-10-5, la que elijas en los ajustes.
- **Plantillas**: círculo, cono, línea y cuadrado. Al elegir una se pega al
  cursor y va contigo por el tablero; un clic la deja fija donde estés, y si
  arrastras antes de soltar, la giras. Para moverla, vuelve a pulsar su botón.
  Se ven en la mesa y en los móviles, y se quitan todas con la ✕.
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
- **Borrar** quita muros, diagonales y puertas.
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
(botón **Conjuros** en la ficha). Se añaden desde una **biblioteca de 39
conjuros del SRD** ya preparados, de trucos a nivel 5: Rayo de fuego, Llama
sagrada, Descarga sobrenatural, Proyectil mágico, Dormir, Curar heridas,
Inmovilizar persona, Bola de fuego, Relámpago, Espíritus guardianes, Cono de
frío… La característica de lanzamiento se adivina por la clase y se puede
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
- **Dormir**: tira la reserva y duerme de menos a más vida.
- **Concentración**: si el conjuro la pide, el personaje queda concentrado; si
  ya lo estaba en otro, ese se pierde y se dice en el registro. Los estados
  que pone duran lo que dura el conjuro y se quitan solos.

Gasta el espacio solo si el lanzamiento es válido (si no hay objetivos o no
quedan espacios, avisa y no gasta nada). El DM puede lanzar en secreto. Un
jugador solo puede lanzar los de su propio personaje.

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
marcan. Todo va a un registro común que ven todos, salvo lo que el DM tire con
**En secreto**. Las características, salvaciones y habilidades de cada ficha se
tiran desde la propia ficha, ya con su modificador.

Debajo del registro hay una **caja para hablar**. El botón del bocadillo abre
la lista de la mesa: marcas al DM, a un jugador o a varios, y el mensaje se
convierte en un **susurro** que solo leen ellos. Vale para todos, no solo para
el DM: un jugador puede pasarle una idea a otro, y el DM puede contarles algo a
dos a la vez sin que se entere el resto. Lo que susurras no llega siquiera al
navegador de los demás y **nunca sale en la tele de la mesa**. Sin marcar a
nadie, lo lee toda la mesa.

El registro se filtra por **Todo**, **Tiradas** o **Charla**, y en el móvil sale
un punto en la pestaña cuando hay algo sin leer.

Desde **⋯ → Pedir una tirada a la party** eliges qué pides, a quién y con qué
CD; a cada jugador le sale un botón grande en su móvil y, al pulsarlo, tira y se
anuncia si supera la dificultad. Y con **Enseñar una imagen a la mesa** sale a
pantalla completa en la tele y en el móvil de todos: mapas de tesoro, cartas,
retratos del villano.

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
cambiar. Las fichas **se deslizan** de casilla a casilla (y la cámara que sigue
a un personaje lo acompaña sin saltos); al empezar un turno, un **aro dorado**
se abre una vez desde la ficha de quien actúa; un golpe deja un **halo rojo** y
una cura uno verde, en el mapa y en su carta, y las barras de vida bajan
deslizándose. Las ventanas, el bestiario y las pestañas entran con un fundido
corto. Nada se anima en bucle, así que la tele no gasta de más, y quien tenga
activado «reducir movimiento» en su sistema no ve ninguna animación.

Una criatura que sale de la niebla aparece sin deslizarse: si lo hiciera,
enseñaría por dónde ha venido.

## Dónde viven los datos

En la carpeta `data/` junto al programa: `mesa.json` con la partida e `images/`
con los planos y los retratos. Se guarda solo, unas décimas después de cada
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
    spells.js          biblioteca de conjuros del SRD
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
data/                  la partida y las imágenes (se crea al arrancar)
```

## Seguridad, con nombre y apellidos

- El rol de DM pide un código que solo sale en tu terminal.
- Cada jugador solo puede tocar su ficha, y solo puede mover su token a
  casillas que su party ve; el servidor lo comprueba, no el navegador.
- Lo que un jugador no debe saber no se le manda: ni la CA de un monstruo, ni
  sus PV exactos, ni tus notas del mapa, ni las plantillas que no compartas, ni
  los susurros de otro.
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

- Los conjuros de la biblioteca son los del SRD hasta nivel 5. Los que no
  hacen daño ni ponen un estado (Escudo de fe, Bendecir, Revivificar…) se
  anotan en el registro y el efecto lo aplicas tú.
- La voz no tiene servidor de retransmisión: en redes que no dejan conectar
  aparato con aparato, no llega.
- Los muros diagonales van de esquina a esquina; curvas de otro ángulo se
  aproximan con varios tramos.

Del inglés, además: se traduce la interfaz, no la partida. Si escribes tus
notas o el bestiario en español, en inglés seguirán en español.
