/* Encajar la cuadrícula de Mesa con la que trae dibujada el plano, y
   después proponer sus muros y puertas.

   1. Busca sola la cuadrícula (gridfind.js), la pinta encima del plano y
      deja corregirla: tamaño de casilla, dónde empieza (también arrastrando
      sobre la imagen), columnas y filas. Al guardar, el mapa recuerda dónde
      cae la cuadrícula en la imagen (imgGrid) y el tablero la dibuja a esa
      escala, sin recortar ni estirar la imagen a mano.
   2. Con la cuadrícula ya puesta, propone muros y puertas (wallfind.js) y
      los enseña sobre el plano para revisarlos antes de ponerlos. */

import { modal, toast, imgURL, confirmBox } from "./util.js";
import { patchMap, getWallModel, saveWallModel } from "./net.js";
import { MAX_COLS, MAX_ROWS } from "./schema.js";
import { toGray, detectGrid, fitCount } from "./gridfind.js";
import { measureWalls, classifyWalls, trainingSet, learnFromMap, usableModel, BASE_MODEL } from "./wallfind.js";

const mod = (a, b) => ((a % b) + b) % b;
const fmt = (v, d = 2) => String(Math.round(v * 10 ** d) / 10 ** d).replace(".", ",");

async function loadImage(imageId) {
  const img = new Image();
  img.src = imgURL(imageId);
  await img.decode();
  return img;
}

/* Los píxeles RGBA de la imagen */
function rgba(img) {
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, w, h).data;
}

/* Lienzo de vista previa: la imagen entera (o a tamaño real), con lo que
   queda fuera del tablero en sombra. Devuelve el contexto ya escalado a
   píxeles de la imagen y el factor de escala. */
function paintBase(canvas, view, img, g, real) {
  const W = img.naturalWidth, H = img.naturalHeight;
  const scale = real ? 1 : Math.min(1, (view.clientWidth || 800) / W);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * scale * dpr);
  canvas.height = Math.round(H * scale * dpr);
  canvas.style.width = Math.round(W * scale) + "px";
  canvas.style.height = Math.round(H * scale) + "px";
  const ctx = canvas.getContext("2d");
  const k = scale * dpr;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.drawImage(img, 0, 0, W, H);
  const bx = g.x, by = g.y, bw = g.cols * g.w, bh = g.rows * g.h;
  ctx.fillStyle = "rgba(0,0,0,.55)";
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.rect(bx, by, bw, bh);   // agujero: el tablero
  ctx.fill("evenodd");
  return { ctx, k };
}

/* Quitar el diálogo de la escucha de «resize» cuando se cierre */
function onResizeWhileOpen(body, fn) {
  addEventListener("resize", fn, { passive: true });
  new MutationObserver((_, obs) => {
    if (!body.isConnected) { removeEventListener("resize", fn); obs.disconnect(); }
  }).observe(document.body, { childList: true });
}

/* Columnas y filas que caben con este tamaño y este punto de partida */
function fitAll(g, W, H) {
  const fx = fitCount(W, g.w, mod(g.x, g.w));
  const fy = fitCount(H, g.h, mod(g.y, g.h));
  return { x: fx.origin, y: fy.origin, cols: fx.count, rows: fy.count };
}

function verdict(found) {
  if (!found) return ["", ""];
  const size = `casillas de ${fmt(found.cellW, 1)} px, ${found.cols} × ${found.rows}`;
  if (found.confidence >= 0.6) return ["good", `Cuadrícula encontrada: ${size}. Comprueba que las líneas rosas pisan las del plano.`];
  if (found.confidence >= 0.25) return ["warn", `Creo que es esta (${size}), pero no lo tengo claro. Mírala de cerca antes de guardar.`];
  return ["bad", `No veo una cuadrícula clara en este plano. Te dejo la mejor apuesta (${size}): ajústala a mano o arrástrala sobre la imagen.`];
}

/* map: el mapa (id, imageId, cols, rows, imgGrid, edges).
   onApply: avisa de las columnas y filas nuevas (para refrescar otros formularios).
   walls: al guardar, pasar a proponer muros y puertas. */
export function openGridFit(map, { onApply, walls = false } = {}) {
  if (!map.imageId) return toast("Este mapa no tiene imagen de fondo", "bad");

  const body = document.createElement("div");
  body.className = "gridfit";
  body.innerHTML = `
    <p class="gridfit-status">Buscando la cuadrícula del plano…</p>
    <div class="gridfit-view"><canvas></canvas></div>
    <div class="row gridfit-tools">
      <label class="check"><input type="checkbox" name="zoom"> Ver a tamaño real</label>
      <label class="check"><input type="checkbox" name="square" checked> Casillas cuadradas</label>
    </div>
    <div class="gridfit-fields">
      <label class="field"><span>Casilla, ancho (px)</span><input name="w" type="number" step="0.01" min="2"></label>
      <label class="field"><span>Casilla, alto (px)</span><input name="h" type="number" step="0.01" min="2"></label>
      <label class="field"><span>Primera línea X (px)</span><input name="x" type="number" step="0.1"></label>
      <label class="field"><span>Primera línea Y (px)</span><input name="y" type="number" step="0.1"></label>
      <label class="field"><span>Columnas</span><input name="cols" type="number" min="5" max="${MAX_COLS}"></label>
      <label class="field"><span>Filas</span><input name="rows" type="number" min="5" max="${MAX_ROWS}"></label>
    </div>
    <div class="row">
      <button type="button" class="btn sm" data-act="half">Casilla a la mitad</button>
      <button type="button" class="btn sm" data-act="double">Casilla al doble</button>
      <button type="button" class="btn sm" data-act="detect">Buscar otra vez</button>
    </div>
    <p class="hint">Arrastra sobre la imagen para mover la cuadrícula. Si las líneas rosas caen
      una sí y una no sobre las del plano, prueba «al doble» o «a la mitad».</p>`;

  const canvas = body.querySelector("canvas");
  const view = body.querySelector(".gridfit-view");
  const status = body.querySelector(".gridfit-status");
  const input = n => body.querySelector(`[name="${n}"]`);
  let img = null, W = 0, H = 0, gray = null, found = null;
  let g = null;   // { x, y, w, h, cols, rows }

  const setStatus = (tone, text) => { status.className = "gridfit-status " + tone; status.textContent = text; };

  function fillInputs() {
    input("w").value = Math.round(g.w * 100) / 100;
    input("h").value = Math.round(g.h * 100) / 100;
    input("x").value = Math.round(g.x * 10) / 10;
    input("y").value = Math.round(g.y * 10) / 10;
    input("cols").value = g.cols;
    input("rows").value = g.rows;
  }

  /* Tras tocar tamaño o posición se vuelve a contar lo que cabe */
  function refit() {
    Object.assign(g, fitAll(g, W, H));
    fillInputs();
    draw();
  }

  function draw() {
    if (!img || !g) return;
    const { ctx, k } = paintBase(canvas, view, img, g, input("zoom").checked);
    /* Líneas de la cuadrícula de Mesa */
    const bx = g.x, by = g.y, bw = g.cols * g.w, bh = g.rows * g.h;
    ctx.strokeStyle = "rgba(255, 61, 200, .85)";
    ctx.lineWidth = 1 / k;
    ctx.beginPath();
    for (let i = 0; i <= g.cols; i++) { const x = bx + i * g.w; ctx.moveTo(x, by); ctx.lineTo(x, by + bh); }
    for (let j = 0; j <= g.rows; j++) { const y = by + j * g.h; ctx.moveTo(bx, y); ctx.lineTo(bx + bw, y); }
    ctx.stroke();
  }

  function detect() {
    setStatus("", "Buscando la cuadrícula del plano…");
    /* Un respiro para que se pinte el aviso antes del cálculo */
    setTimeout(() => {
      try {
        gray = gray || toGray(rgba(img), W, H);
        found = detectGrid(gray, W, H);
        g = { x: found.x, y: found.y, w: found.cellW, h: found.cellH, cols: found.cols, rows: found.rows };
        if (input("square").checked && Math.abs(g.w - g.h) / g.w > 0.01) input("square").checked = false;
        fillInputs();
        draw();
        setStatus(...verdict(found));
      } catch (err) {
        setStatus("bad", "No se pudo analizar la imagen: " + err.message);
      }
    }, 30);
  }

  /* Campos */
  for (const n of ["w", "h"]) input(n).addEventListener("change", () => {
    const v = +input(n).value;
    if (!(v >= 2)) return fillInputs();
    g[n] = v;
    if (input("square").checked) g[n === "w" ? "h" : "w"] = v;
    refit();
  });
  for (const n of ["x", "y"]) input(n).addEventListener("change", () => {
    g[n] = +input(n).value || 0;
    refit();
  });
  input("cols").addEventListener("change", () => { g.cols = Math.max(5, Math.min(MAX_COLS, Math.trunc(+input("cols").value) || g.cols)); fillInputs(); draw(); });
  input("rows").addEventListener("change", () => { g.rows = Math.max(5, Math.min(MAX_ROWS, Math.trunc(+input("rows").value) || g.rows)); fillInputs(); draw(); });
  input("zoom").addEventListener("change", draw);
  input("square").addEventListener("change", () => {
    if (input("square").checked && g) { g.h = g.w; refit(); }
  });
  body.querySelector("[data-act=half]").addEventListener("click", () => { if (g) { g.w /= 2; g.h /= 2; refit(); } });
  body.querySelector("[data-act=double]").addEventListener("click", () => { if (g) { g.w *= 2; g.h *= 2; refit(); } });
  body.querySelector("[data-act=detect]").addEventListener("click", () => { if (img) detect(); });

  /* Arrastrar para mover la cuadrícula */
  let drag = null;
  canvas.addEventListener("pointerdown", e => {
    if (!g) return;
    drag = { sx: e.clientX, sy: e.clientY, x: g.x, y: g.y, scale: canvas.clientWidth / W };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", e => {
    if (!drag) return;
    g.x = drag.x + (e.clientX - drag.sx) / drag.scale;
    g.y = drag.y + (e.clientY - drag.sy) / drag.scale;
    draw();
  });
  const endDrag = () => { if (drag) { drag = null; refit(); } };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  const dialog = modal({
    title: "Encajar la cuadrícula con el plano", body, wide: true,
    actions: [
      { label: "Cancelar" },
      {
        label: "Estirar sin encajar",
        run: () => {
          patchMap(map.id, { imgGrid: null });
          toast("El plano se estira para llenar el tablero, como antes");
        }
      },
      {
        label: "Guardar", tone: "primary",
        run: () => {
          if (!g) return false;
          const cols = Math.max(5, Math.min(MAX_COLS, g.cols)), rows = Math.max(5, Math.min(MAX_ROWS, g.rows));
          patchMap(map.id, { imgGrid: { x: g.x, y: g.y, w: g.w, h: g.h }, cols, rows });
          if (g.cols > MAX_COLS || g.rows > MAX_ROWS)
            toast(`Mesa admite hasta ${MAX_COLS} × ${MAX_ROWS} casillas: el tablero se queda en ${cols} × ${rows}`, "bad");
          else toast(`Cuadrícula encajada: ${cols} × ${rows}`, "good");
          if (onApply) onApply({ cols, rows });
          if (walls) openWallFit({ ...map, imgGrid: { x: g.x, y: g.y, w: g.w, h: g.h }, cols, rows });
        }
      }
    ]
  });

  onResizeWhileOpen(body, draw);

  loadImage(map.imageId).then(loaded => {
    img = loaded; W = img.naturalWidth; H = img.naturalHeight;
    if (map.imgGrid) {
      /* Ya estaba encajada: se enseña tal cual, sin volver a buscar */
      g = { ...map.imgGrid, cols: map.cols, rows: map.rows };
      input("square").checked = Math.abs(g.w - g.h) / g.w <= 0.01;
      fillInputs();
      draw();
      setStatus("", `Cuadrícula guardada: casillas de ${fmt(g.w, 1)} px, ${g.cols} × ${g.rows}. «Buscar otra vez» la vuelve a calcular.`);
    } else detect();
  }).catch(() => {
    setStatus("bad", "No se pudo cargar la imagen del plano.");
  });

  return dialog;
}

/* ---------- Muros y puertas ---------- */

/* map: el mapa con su cuadrícula ya encajada (imgGrid, cols, rows, edges) */
export function openWallFit(map) {
  if (!map.imageId) return toast("Este mapa no tiene imagen de fondo", "bad");
  if (!map.imgGrid) return toast("Primero encaja la cuadrícula con el plano", "bad");
  const g = { ...map.imgGrid, cols: map.cols, rows: map.rows };
  const existing = Object.keys(map.edges || {}).length + (map.walls || []).length;

  const body = document.createElement("div");
  body.className = "gridfit";
  body.innerHTML = `
    <p class="gridfit-status">Buscando muros y puertas en el plano…</p>
    <div class="gridfit-view"><canvas></canvas></div>
    <div class="row gridfit-tools">
      <label class="check"><input type="checkbox" name="zoom"> Ver a tamaño real</label>
      <span class="gridfit-legend"><i class="wall"></i>Muro <i class="diag"></i>Diagonal o muro libre <i class="door"></i>Puerta</span>
    </div>
    <label class="field gridfit-range"><span>Sensibilidad</span>
      <span class="gridfit-range-row"><small>Menos muros</small>
      <input name="sens" type="range" min="0" max="1" step="0.05" value="0.5">
      <small>Más muros</small></span></label>
    ${existing ? `<fieldset>
      <legend>Este mapa ya tiene ${existing} muros, muros libres o puertas</legend>
      <label class="check"><input type="radio" name="mode" value="replace" checked> Sustituirlos por los propuestos</label>
      <label class="check" style="margin-top:6px"><input type="radio" name="mode" value="add"> Añadir los propuestos y dejar los que hay</label>
    </fieldset>` : ""}
    <p class="hint">Es una propuesta: después se corrige con las herramientas Muro, Diagonal, Puerta y Borrar
      del mapa. Las puertas salen cerradas.</p>`;

  const canvas = body.querySelector("canvas");
  const view = body.querySelector(".gridfit-view");
  const status = body.querySelector(".gridfit-status");
  const input = n => body.querySelector(`[name="${n}"]`);
  const setStatus = (tone, text) => { status.className = "gridfit-status " + tone; status.textContent = text; };
  let img = null, measured = null, result = null, model = null;

  function classify() {
    result = classifyWalls(measured, { sensitivity: +input("sens").value, model });
    const { walls, doors, diagonals, free, floorMask } = result.stats;
    const odd = [diagonals ? `${diagonals} en diagonal` : "", free ? `${free} ${free === 1 ? "libre" : "libres"} en paredes curvas o giradas` : ""].filter(Boolean).join(", ");
    const what = `${walls} ${walls === 1 ? "muro" : "muros"}${odd ? ` (${odd})` : ""} y ${doors} ${doors === 1 ? "puerta" : "puertas"}`;
    const learned = (model && model.maps && model.maps.length) || 0;
    const extra = learned ? ` Uso lo aprendido de ${learned} ${learned === 1 ? "plano corregido" : "planos corregidos"}.` : "";
    if (!walls && !doors) setStatus("bad", "No encuentro muros claros en este plano. Prueba a subir la sensibilidad o ponlos a mano.");
    else if (floorMask) setStatus("good", `Propongo ${what}. Revísalos sobre el plano antes de ponerlos.${extra}`);
    else setStatus("warn", `Propongo ${what}. En este plano no distingo el suelo de lo que no lo es, así que solo
      salen muros dibujados como líneas largas: seguramente falten algunos.${extra}`);
    draw();
  }

  function draw() {
    if (!img) return;
    const { ctx, k } = paintBase(canvas, view, img, g, input("zoom").checked);
    if (!result) return;
    const X = c => g.x + c * g.w, Y = r => g.y + r * g.h;
    ctx.lineCap = "round";
    for (const [key, type] of Object.entries(result.edges)) {
      const [cx, cy, dir] = key.split(",");
      const x = +cx, y = +cy;
      ctx.strokeStyle = type === "door" ? "#3fd2ff" : dir === "d" || dir === "a" ? "#ffa31a" : "#ff3b3b";
      ctx.lineWidth = Math.max(2 / k, g.w * (type === "door" ? 0.22 : 0.14));
      ctx.beginPath();
      if (dir === "v") { ctx.moveTo(X(x), Y(y)); ctx.lineTo(X(x), Y(y + 1)); }
      else if (dir === "d") { ctx.moveTo(X(x), Y(y)); ctx.lineTo(X(x + 1), Y(y + 1)); }
      else if (dir === "a") { ctx.moveTo(X(x + 1), Y(y)); ctx.lineTo(X(x), Y(y + 1)); }
      else { ctx.moveTo(X(x), Y(y)); ctx.lineTo(X(x + 1), Y(y)); }
      ctx.stroke();
    }
    /* Muros libres propuestos: paredes curvas o giradas */
    ctx.strokeStyle = "#ffa31a";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(2 / k, g.w * 0.14);
    for (const w of result.walls || []) {
      ctx.beginPath();
      w.points.forEach(([px, py], i) => (i ? ctx.lineTo(X(px), Y(py)) : ctx.moveTo(X(px), Y(py))));
      ctx.stroke();
    }
  }

  input("sens").addEventListener("input", () => { if (measured) classify(); });
  input("zoom").addEventListener("change", draw);

  const dialog = modal({
    title: "Muros y puertas del plano", body, wide: true,
    actions: [
      { label: "Ahora no" },
      {
        label: "Poner muros y puertas", tone: "primary",
        run: host => {
          if (!result) return false;
          const now = map.edges || {};
          const mode = existing ? host.querySelector('[name="mode"]:checked').value : "replace";
          const proposed = result.walls || [];
          const edges = mode === "add" ? { ...result.edges, ...now } : { ...result.edges };
          const walls = mode === "add" ? [...(map.walls || []), ...proposed] : proposed;
          patchMap(map.id, { edges, walls });
          toast(`Puestos ${result.stats.walls} muros y ${result.stats.doors} puertas`, "good");
        }
      }
    ]
  });

  onResizeWhileOpen(body, draw);

  Promise.all([loadImage(map.imageId), getWallModel().catch(() => null)]).then(([loaded, saved]) => {
    img = loaded;
    model = usableModel(saved);
    draw();
    setTimeout(() => {
      try {
        measured = measureWalls(rgba(img), img.naturalWidth, img.naturalHeight, g);
        classify();
      } catch (err) {
        setStatus("bad", "No se pudo analizar la imagen: " + err.message);
      }
    }, 30);
  }).catch(() => setStatus("bad", "No se pudo cargar la imagen del plano."));

  return dialog;
}

/* ---------- Enseñar con un plano corregido ----------
   Los muros que el DM deja puestos en un plano (después de corregir la
   propuesta, o puestos a mano) enseñan a la propuesta cómo son los muros de
   ese estilo de plano. Lo aprendido se guarda en el servidor y vale para
   todas las partidas. */
const USER_WEIGHT = 2;   // un plano del DM cuenta el doble que uno de los de serie

export async function teachFromMap(map) {
  if (!map.imageId || !map.imgGrid) return toast("Primero carga el plano y encaja su cuadrícula", "bad");
  const straight = Object.keys(map.edges || {}).length, free = (map.walls || []).length;
  if (straight + free * 4 < 20) return toast("Este plano tiene muy pocos muros: ponlos o corrígelos antes de enseñar con él", "bad");
  try {
    const [img, saved] = await Promise.all([loadImage(map.imageId), getWallModel().catch(() => null)]);
    const current = usableModel(saved);
    const again = (current.maps || []).some(x => x.id === map.id);
    if (again && !(await confirmBox("Ya se enseñó con este plano. Enseñar otra vez le da el doble de peso. ¿Seguir?", { danger: false, okLabel: "Enseñar otra vez" }))) return;
    toast("Aprendiendo de este plano…");
    await new Promise(r => setTimeout(r, 30));
    const g = { ...map.imgGrid, cols: map.cols, rows: map.rows };
    const { X, y } = trainingSet(rgba(img), img.naturalWidth, img.naturalHeight, g, map.edges || {}, map.walls || []);
    const next = learnFromMap(current, X, y, { weight: USER_WEIGHT, mapId: map.id, name: map.name });
    await saveWallModel(next);
    toast(`Aprendido. La propuesta de muros ya cuenta con ${next.maps.length} ${next.maps.length === 1 ? "plano corregido" : "planos corregidos"}`, "good");
  } catch (err) {
    toast("No se pudo aprender de este plano: " + err.message, "bad");
  }
}

export async function forgetLearned() {
  await saveWallModel(null);
  toast("La propuesta de muros vuelve a la de serie");
}

export async function learnedCount() {
  const saved = await getWallModel().catch(() => null);
  return usableModel(saved) === BASE_MODEL ? 0 : (saved.maps || []).length;
}
