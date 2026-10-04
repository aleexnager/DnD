/* Biblioteca de sonidos de Mesa: para cuando el DM no tiene sus propios
   audios. Los genera tools/sonidos/generar.mjs (no se edita a mano): todo
   está sintetizado para Mesa, sin grabaciones ni música de nadie.

   len es la duración exacta del bucle, en segundos: el reproductor la usa
   para saltarse el silencio que el MP3 añade al principio y al final. Al
   elegir uno, mode, radius y volume son lo que se propone. */

export const SOUND_CATS = [["clima","Clima"],["naturaleza","Naturaleza"],["fuego","Fuego y forja"],["lugares","Lugares"],["subterraneo","Bajo tierra"],["magia","Magia"],["musica","Música"]];

export const SOUND_LIBRARY = [
  {"id":"lluvia","name":"Lluvia","cat":"clima","file":"sonidos/lluvia.mp3","len":30,"mode":"map","radius":6,"volume":0.7},
  {"id":"tormenta","name":"Tormenta","cat":"clima","file":"sonidos/tormenta.mp3","len":40,"mode":"map","radius":6,"volume":0.7},
  {"id":"lluvia-dentro","name":"Lluvia desde dentro","cat":"clima","file":"sonidos/lluvia-dentro.mp3","len":30,"mode":"room","radius":6,"volume":0.7},
  {"id":"viento","name":"Viento en la llanura","cat":"clima","file":"sonidos/viento.mp3","len":30,"mode":"map","radius":6,"volume":0.7},
  {"id":"ventisca","name":"Ventisca","cat":"clima","file":"sonidos/ventisca.mp3","len":30,"mode":"map","radius":6,"volume":0.7},
  {"id":"bosque-dia","name":"Bosque de día","cat":"naturaleza","file":"sonidos/bosque-dia.mp3","len":36,"mode":"map","radius":6,"volume":0.7},
  {"id":"bosque-oscuro","name":"Bosque oscuro","cat":"naturaleza","file":"sonidos/bosque-oscuro.mp3","len":36,"mode":"map","radius":6,"volume":0.7},
  {"id":"noche","name":"Noche en el campo","cat":"naturaleza","file":"sonidos/noche.mp3","len":30,"mode":"map","radius":6,"volume":0.7},
  {"id":"arroyo","name":"Arroyo","cat":"naturaleza","file":"sonidos/arroyo.mp3","len":30,"mode":"point","radius":6,"volume":0.8},
  {"id":"cascada","name":"Cascada","cat":"naturaleza","file":"sonidos/cascada.mp3","len":30,"mode":"point","radius":10,"volume":0.8},
  {"id":"mar","name":"Olas en la costa","cat":"naturaleza","file":"sonidos/mar.mp3","len":40,"mode":"point","radius":14,"volume":0.8},
  {"id":"pantano","name":"Pantano","cat":"naturaleza","file":"sonidos/pantano.mp3","len":30,"mode":"map","radius":6,"volume":0.7},
  {"id":"hoguera","name":"Hoguera","cat":"fuego","file":"sonidos/hoguera.mp3","len":30,"mode":"point","radius":4,"volume":0.8},
  {"id":"antorchas","name":"Antorchas y braseros","cat":"fuego","file":"sonidos/antorchas.mp3","len":30,"mode":"point","radius":3,"volume":0.8},
  {"id":"campamento","name":"Campamento de noche","cat":"fuego","file":"sonidos/campamento.mp3","len":30,"mode":"point","radius":8,"volume":0.8},
  {"id":"forja","name":"Forja","cat":"fuego","file":"sonidos/forja.mp3","len":36,"mode":"point","radius":6,"volume":0.8},
  {"id":"lava","name":"Lava y volcán","cat":"fuego","file":"sonidos/lava.mp3","len":30,"mode":"point","radius":8,"volume":0.8},
  {"id":"taberna","name":"Taberna llena","cat":"lugares","file":"sonidos/taberna.mp3","len":36,"mode":"room","radius":6,"volume":0.7},
  {"id":"ciudad","name":"Plaza de la ciudad","cat":"lugares","file":"sonidos/ciudad.mp3","len":40,"mode":"map","radius":6,"volume":0.7},
  {"id":"templo","name":"Templo y coro","cat":"lugares","file":"sonidos/templo.mp3","len":40,"mode":"room","radius":6,"volume":0.7},
  {"id":"biblioteca","name":"Biblioteca","cat":"lugares","file":"sonidos/biblioteca.mp3","len":30,"mode":"room","radius":6,"volume":0.7},
  {"id":"barco","name":"Barco en alta mar","cat":"lugares","file":"sonidos/barco.mp3","len":36,"mode":"map","radius":6,"volume":0.7},
  {"id":"cueva","name":"Cueva con goteo","cat":"subterraneo","file":"sonidos/cueva.mp3","len":30,"mode":"map","radius":6,"volume":0.7},
  {"id":"mazmorra","name":"Mazmorra","cat":"subterraneo","file":"sonidos/mazmorra.mp3","len":36,"mode":"map","radius":6,"volume":0.7},
  {"id":"cripta","name":"Cripta","cat":"subterraneo","file":"sonidos/cripta.mp3","len":36,"mode":"room","radius":6,"volume":0.7},
  {"id":"alcantarillas","name":"Alcantarillas","cat":"subterraneo","file":"sonidos/alcantarillas.mp3","len":30,"mode":"room","radius":6,"volume":0.7},
  {"id":"magia","name":"Energía arcana","cat":"magia","file":"sonidos/magia.mp3","len":30,"mode":"point","radius":5,"volume":0.8},
  {"id":"musica-taberna","name":"Giga de taberna","cat":"musica","file":"sonidos/musica-taberna.mp3","len":34.56,"mode":"map","radius":6,"volume":0.5},
  {"id":"musica-exploracion","name":"Viaje y exploración","cat":"musica","file":"sonidos/musica-exploracion.mp3","len":48,"mode":"map","radius":6,"volume":0.5},
  {"id":"musica-calma","name":"Descanso junto al fuego","cat":"musica","file":"sonidos/musica-calma.mp3","len":40,"mode":"map","radius":6,"volume":0.5},
  {"id":"musica-feerica","name":"Bosque feérico","cat":"musica","file":"sonidos/musica-feerica.mp3","len":45.714286,"mode":"map","radius":6,"volume":0.5},
  {"id":"musica-misterio","name":"Misterio","cat":"musica","file":"sonidos/musica-misterio.mp3","len":45,"mode":"map","radius":6,"volume":0.5},
  {"id":"musica-lamento","name":"Lamento","cat":"musica","file":"sonidos/musica-lamento.mp3","len":48,"mode":"map","radius":6,"volume":0.5},
  {"id":"musica-combate","name":"Combate","cat":"musica","file":"sonidos/musica-combate.mp3","len":41.142857,"mode":"map","radius":6,"volume":0.5},
  {"id":"musica-epica","name":"Batalla épica","cat":"musica","file":"sonidos/musica-epica.mp3","len":42.666667,"mode":"map","radius":6,"volume":0.5},
  {"id":"musica-terror","name":"Terror","cat":"musica","file":"sonidos/musica-terror.mp3","len":40,"mode":"map","radius":6,"volume":0.5}
];

export const libSound = id => SOUND_LIBRARY.find(s => s.id === id) || null;
