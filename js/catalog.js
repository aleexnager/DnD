/* Criaturas listas para arrastrar a la mesa. Todo es editable desde el bestiario. */
export const CATALOG = [
  { id: "cat-goblin", name: "Goblin", sizeType: "Humanoide pequeño", cr: "1/4", xp: 50, ac: 15, hpAvg: 7, hpDice: "2d6",
    speed: 30, str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8, color: "#6a8f3d",
    senses: "Visión en la oscuridad 60 pies", languages: "Común, goblin",
    traits: "Huida ágil — se desengancha o se esconde como acción adicional.",
    actions: "Cimitarra — +4 al ataque — 1d6+2 cortante\nArco corto — +4 al ataque — 1d6+2 perforante (80/320 pies)" },

  { id: "cat-kobold", name: "Kobold", sizeType: "Humanoide pequeño", cr: "1/8", xp: 25, ac: 12, hpAvg: 5, hpDice: "2d6-2",
    speed: 30, str: 7, dex: 15, con: 9, int: 8, wis: 7, cha: 8, color: "#a2542f",
    senses: "Visión en la oscuridad 60 pies", languages: "Común, dracónico",
    traits: "Tácticas de manada — ventaja al atacar si un aliado está junto al objetivo.\nSensibilidad a la luz solar — desventaja bajo luz solar directa.",
    actions: "Daga — +4 al ataque — 1d4+2 perforante\nHonda — +4 al ataque — 1d4+2 contundente (30/120 pies)" },

  { id: "cat-bandido", name: "Bandido", sizeType: "Humanoide mediano", cr: "1/8", xp: 25, ac: 12, hpAvg: 11, hpDice: "2d8+2",
    speed: 30, str: 11, dex: 12, con: 12, int: 10, wis: 10, cha: 10, color: "#7a6a4a",
    languages: "Cualquiera",
    actions: "Cimitarra — +3 al ataque — 1d6+1 cortante\nBallesta ligera — +3 al ataque — 1d8+1 perforante (80/320 pies)" },

  { id: "cat-guardia", name: "Guardia", sizeType: "Humanoide mediano", cr: "1/8", xp: 25, ac: 16, hpAvg: 11, hpDice: "2d8+2",
    speed: 30, str: 13, dex: 12, con: 12, int: 10, wis: 11, cha: 10, color: "#4a6b8a",
    languages: "Cualquiera",
    actions: "Lanza — +3 al ataque — 1d6+1 perforante (1d8+1 a dos manos)" },

  { id: "cat-lobo", name: "Lobo", sizeType: "Bestia mediana", cr: "1/4", xp: 50, ac: 13, hpAvg: 11, hpDice: "2d8+2",
    speed: 40, str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6, color: "#6b7280",
    senses: "Oído y olfato agudos",
    traits: "Tácticas de manada — ventaja al atacar si un aliado está junto al objetivo.",
    actions: "Mordisco — +4 al ataque — 2d4+2 perforante; salvación de Fuerza CD 11 o derribado" },

  { id: "cat-esqueleto", name: "Esqueleto", sizeType: "Muerto viviente mediano", cr: "1/4", xp: 50, ac: 13, hpAvg: 13, hpDice: "2d8+4",
    speed: 30, str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5, color: "#b9b3a1",
    senses: "Visión en la oscuridad 60 pies", languages: "Entiende lo que hablaba en vida",
    resistances: "Vulnerable a contundente · inmune a veneno y al estado envenenado",
    actions: "Espada corta — +4 al ataque — 1d6+2 perforante\nArco corto — +4 al ataque — 1d6+2 perforante" },

  { id: "cat-zombi", name: "Zombi", sizeType: "Muerto viviente mediano", cr: "1/4", xp: 50, ac: 8, hpAvg: 22, hpDice: "3d8+9",
    speed: 20, str: 13, dex: 6, con: 16, int: 3, wis: 6, cha: 5, color: "#5c6f4a",
    senses: "Visión en la oscuridad 60 pies",
    resistances: "Inmune a veneno y al estado envenenado",
    traits: "Tenacidad no muerta — al caer a 0 PV, salvación de Constitución CD 5 + daño para quedarse con 1 PV.",
    actions: "Golpe — +3 al ataque — 1d6+1 contundente" },

  { id: "cat-orco", name: "Orco", sizeType: "Humanoide mediano", cr: "1/2", xp: 100, ac: 13, hpAvg: 15, hpDice: "2d8+6",
    speed: 30, str: 16, dex: 12, con: 16, int: 7, wis: 11, cha: 10, color: "#4f7a4a",
    senses: "Visión en la oscuridad 60 pies", languages: "Común, orco",
    traits: "Agresivo — como acción adicional se mueve su velocidad hacia un enemigo visible.",
    actions: "Hacha grande — +5 al ataque — 1d12+3 cortante\nJabalina — +5 al ataque — 1d6+3 perforante (30/120 pies)" },

  { id: "cat-hobgoblin", name: "Trasgo", sizeType: "Humanoide mediano", cr: "1/2", xp: 100, ac: 18, hpAvg: 11, hpDice: "2d8+2",
    speed: 30, str: 13, dex: 12, con: 12, int: 10, wis: 10, cha: 9, color: "#8a3f3f",
    senses: "Visión en la oscuridad 60 pies", languages: "Común, goblin",
    traits: "Ventaja marcial — una vez por turno, 2d6 de daño extra si un aliado está junto al objetivo.",
    actions: "Espada larga — +3 al ataque — 1d8+1 cortante\nArco largo — +3 al ataque — 1d8+1 perforante (150/600 pies)" },

  { id: "cat-arana", name: "Araña gigante", sizeType: "Bestia grande", cr: "1", xp: 200, ac: 14, hpAvg: 26, hpDice: "4d10+4",
    speed: 30, str: 14, dex: 16, con: 12, int: 2, wis: 11, cha: 4, color: "#5b4a7a",
    senses: "Visión ciega 10 pies, visión en la oscuridad 60 pies",
    traits: "Caminar por telarañas — trepa por superficies difíciles sin tirada.\nSentido de telaraña — nota lo que toca sus telas.",
    actions: "Mordisco — +5 al ataque — 1d8+3 perforante y 2d8 de veneno; salvación de Constitución CD 11 para mitad\nTelaraña (recarga 5-6) — CD 12 Destreza o apresado" },

  { id: "cat-oso", name: "Oso pardo", sizeType: "Bestia grande", cr: "1", xp: 200, ac: 11, hpAvg: 34, hpDice: "4d10+12",
    speed: 40, str: 19, dex: 10, con: 16, int: 2, wis: 13, cha: 7, color: "#8a5a3b",
    senses: "Olfato agudo",
    actions: "Multiataque — un mordisco y un zarpazo\nMordisco — +5 al ataque — 1d8+4 perforante\nZarpazo — +5 al ataque — 2d6+4 cortante" },

  { id: "cat-osgo", name: "Osgo", sizeType: "Humanoide mediano", cr: "1", xp: 200, ac: 16, hpAvg: 27, hpDice: "5d8+5",
    speed: 30, str: 15, dex: 14, con: 13, int: 8, wis: 11, cha: 9, color: "#7a5a2f",
    senses: "Visión en la oscuridad 60 pies", languages: "Común, goblin",
    traits: "Brutal — un dado de daño extra en los ataques cuerpo a cuerpo.\nEmboscador — ventaja contra criaturas sorprendidas.",
    actions: "Maza estrella — +4 al ataque — 2d8+2 perforante\nJabalina — +4 al ataque — 1d6+2 perforante" },

  { id: "cat-ogro", name: "Ogro", sizeType: "Gigante grande", cr: "2", xp: 450, ac: 11, hpAvg: 59, hpDice: "7d10+21",
    speed: 40, str: 19, dex: 8, con: 16, int: 5, wis: 7, cha: 7, color: "#96702f",
    senses: "Visión en la oscuridad 60 pies", languages: "Común, gigante",
    actions: "Garrote — +6 al ataque — 2d8+4 contundente\nJabalina — +6 al ataque — 2d6+4 perforante (30/120 pies)" }
];
