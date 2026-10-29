/* La forja de mapas: el editor.

   Se dibuja el suelo (salas, círculos, polígonos, pincel de casillas,
   cuevas), y las paredes salen solas alrededor. Encima van puertas, muros
   sueltos, agua, caminos, objetos, textos y luces, por capas. Se puede
   generar una mazmorra al azar, cambiar el estilo entero, deshacer, guardar
   el proyecto y exportar la imagen. «Usar en este mapa» sube el plano como
   fondo, con la cuadrícula ya encajada, y pone sus muros y puertas en Mesa.

   Atajos: V elegir · H mano (o barra espaciadora) · R sala · E círculo ·
   P polígono · B pincel · C cueva · A agua · L muro · D puerta · O objeto ·
   T texto · I luz · K camino · X sumar/recortar · Ctrl+Z / Ctrl+Y ·
   Supr borrar · Ctrl+C / Ctrl+V / Ctrl+D · flechas mover · Q/W girar. */

import { el, esc, toast, confirmBox, modal, clamp } from "./util.js";
import { icon } from "./icons.js";
import * as F from "./forja-core.js";
import { renderDesign, drawProp, drawDoor, itemOutline, PROPS, PROP_GROUPS } from "./forja-draw.js";

const TOOLS = [
  ["select", "pointer", "Elegir y mover", "V"], ["hand", "hand", "Mover la vista", "H"],
  null,
  ["rect", "roomShape", "Sala", "R"], ["ellipse", "ellipse", "Círculo", "E"], ["poly", "polygon", "Polígono", "P"],
  ["cells", "brush", "Pincel de casillas", "B"], ["cave", "cave", "Cueva", "C"], ["water", "drop", "Agua", "A"],
  null,
  ["wall", "wall", "Muro suelto", "L"], ["door", "door", "Puerta", "D"], ["path", "route", "Camino o río", "K"],
  null,
  ["prop", "stairs", "Objeto", "O"], ["text", "type", "Texto", "T"], ["light", "bulb", "Luz", "I"]
];
const KEYS = Object.fromEntries(TOOLS.filter(Boolean).map(t => [t[3].toLowerCase(), t[0]]));
const DOOR_NAMES = { door: "Puerta", open: "Puerta abierta", double: "Puerta doble", secret: "Puerta secreta", portcullis: "Rastrillo", arch: "Arco (hueco)", window: "Ventana" };
const DRAFT = id => "mesa.forja." + (id || "nuevo");

/* opts: { design, title, onUse(design, { lights }) } */
export function openForja(opts = {}) {
  let design = F.normalizeDesign(opts.design || draft(opts.draftId) || F.newDesign({ cols: opts.cols || 28, rows: opts.rows || 18 }));
  let undo = [], redo = [];
  let tool = "rect", mode = "add", snap = "cell";
  let activeLayer = design.layers[0].id;
  let sel = [];                                   // ids elegidos
  let view = { zoom: 1, x: 0, y: 0 };            // casilla de arriba a la izquierda y zoom
  let preview = null;                             // lo que se está dibujando
  let shapeOpts = { r: 0, rough: 0, smooth: false, radius: 1.2, doorKind: "door", doorLen: 1, prop: "barrel", textSize: 0.7,
    lightRadius: 4, lightColor: "#ffcf7a", pathWidth: 1, pathColor: "#8a6d45", wallKind: "wall" };
  let clipboard = null;

  const root = el(`<div class="forja" role="dialog" aria-label="Forja de mapas">
    <header class="fj-top">
      <b class="fj-title">${icon("map", 18)} Forja de mapas</b>
      <div class="fj-group">
        <button class="icon-btn" data-fj="undo" title="Deshacer (Ctrl+Z)" aria-label="Deshacer">${icon("undo")}</button>
        <button class="icon-btn" data-fj="redo" title="Rehacer (Ctrl+Y)" aria-label="Rehacer">${icon("redo")}</button>
      </div>
      <label class="fj-snap" title="A qué se ajusta lo que dibujas (Alt: suelto)">${icon("grid", 16)}
        <select data-fj-snap><option value="cell">Casilla</option><option value="half">Media casilla</option><option value="free">Suelto</option></select></label>
      <div class="fj-zoom">
        <button class="icon-btn" data-fj="zoomOut" aria-label="Alejar">${icon("minus")}</button>
        <span class="tnum" data-fj-zoom>100%</span>
        <button class="icon-btn" data-fj="zoomIn" aria-label="Acercar">${icon("plus")}</button>
        <button class="btn sm" data-fj="fit">Encajar</button>
      </div>
      <span class="spacer"></span>
      <button class="btn sm" data-fj="generate">${icon("wand", 15)} Generar</button>
      <button class="btn sm" data-fj="new">Nuevo</button>
      <button class="btn sm" data-fj="open">${icon("upload", 15)} Abrir</button>
      <button class="btn sm" data-fj="save">${icon("save", 15)} Guardar proyecto</button>
      <button class="btn sm" data-fj="png">${icon("image", 15)} Exportar imagen</button>
      <button class="icon-btn" data-fj="help" title="Atajos de teclado" aria-label="Atajos de teclado">${icon("help")}</button>
      ${opts.onUse ? `<button class="btn sm primary" data-fj="use">${icon("check", 15)} Usar en este mapa</button>` : ""}
      <button class="icon-btn" data-fj="close" title="Cerrar" aria-label="Cerrar">${icon("close")}</button>
      <input type="file" accept="application/json,.json,.mesaplano" hidden data-fj-file>
    </header>
    <nav class="fj-tools" aria-label="Herramientas">
      ${TOOLS.map(t => t ? `<button data-tool="${t[0]}" title="${esc(t[2])} (${t[3]})" aria-label="${esc(t[2])}">${icon(t[1], 19)}<span>${esc(t[2])}</span></button>` : `<hr>`).join("")}
      <hr>
      <button data-fj="mode" class="fj-mode" title="Sumar suelo o recortarlo (X)">${icon("plus", 19)}<span>Sumar</span></button>
    </nav>
    <div class="fj-stage"><canvas></canvas><div class="fj-hint" data-fj-hint></div><div class="fj-coords tnum" data-fj-coords></div></div>
    <aside class="fj-side">
      <nav class="fj-tabs" role="tablist">
        <button role="tab" data-tab="props" aria-selected="true">${icon("pencil", 15)} Pieza</button>
        <button role="tab" data-tab="layers" aria-selected="false">${icon("layers", 15)} Capas</button>
        <button role="tab" data-tab="style" aria-selected="false">${icon("palette", 15)} Estilo</button>
      </nav>
      <div class="fj-panel" data-fj-panel></div>
    </aside>
  </div>`);
  document.body.appendChild(root);
  document.documentElement.classList.add("forja-open");
  const canvas = root.querySelector("canvas"), stage = root.querySelector(".fj-stage");
  const ctx = canvas.getContext("2d");
  let tab = "props";

  /* ---------- Historia ---------- */
  const commit = (next, { keepSel = false } = {}) => {
    undo.push(design); if (undo.length > 120) undo.shift();
    redo = [];
    design = next;
    if (!keepSel) sel = sel.filter(id => findItem(id));
    saveDraft();
    paintPanel(); draw();
  };
  const doUndo = () => { if (!undo.length) return; redo.push(design); design = undo.pop(); sel = sel.filter(id => findItem(id)); saveDraft(); paintPanel(); draw(); };
  const doRedo = () => { if (!redo.length) return; undo.push(design); design = redo.pop(); saveDraft(); paintPanel(); draw(); };
  const saveDraft = () => { try { localStorage.setItem(DRAFT(opts.draftId), JSON.stringify(design)); } catch {} };

  /* Copia del plano con una capa cambiada */
  const withLayers = f => ({ ...design, layers: design.layers.map(f) });
  const layerOf = id => design.layers.find(l => l.items.some(i => i.id === id));
  const findItem = id => { for (const l of design.layers) { const it = l.items.find(i => i.id === id); if (it) return it; } return null; };
  const addItems = (items, layerId = activeLayer) => {
    const list = items.map(F.normalizeItem).filter(Boolean);
    commit(withLayers(l => l.id === layerId ? { ...l, items: [...l.items, ...list] } : l));
    return list;
  };
  const replaceItem = (id, next) => withLayers(l => ({ ...l, items: l.items.map(i => i.id === id ? next : i) }));
  const removeIds = ids => withLayers(l => ({ ...l, items: l.items.filter(i => !ids.includes(i.id)) }));
  const ensureActive = () => {
    const l = design.layers.find(x => x.id === activeLayer);
    if (!l) activeLayer = design.layers[0].id;
    const cur = design.layers.find(x => x.id === activeLayer);
    if (cur.locked) { toast("La capa está bloqueada", "bad"); return false; }
    if (!cur.visible) { toast("La capa está oculta", "bad"); return false; }
    return true;
  };

  /* ---------- Vista ---------- */
  const geom = () => {
    const r = stage.getBoundingClientRect();
    const fit = Math.min((r.width - 40) / design.cols, (r.height - 40) / design.rows);
    const cell = Math.max(4, fit * view.zoom);
    return { r, cell, ox: r.width / 2 - (design.cols / 2 + view.x) * cell, oy: r.height / 2 - (design.rows / 2 + view.y) * cell };
  };
  const toCell = (cx, cy) => { const g = geom(); return { x: (cx - g.r.left - g.ox) / g.cell, y: (cy - g.r.top - g.oy) / g.cell }; };
  const snapV = (v, e) => {
    const m = e && e.altKey ? "free" : snap;
    return m === "cell" ? Math.round(v) : m === "half" ? Math.round(v * 2) / 2 : Math.round(v * 100) / 100;
  };
  const snapP = (p, e) => ({ x: snapV(p.x, e), y: snapV(p.y, e) });
  const center = (p, e) => { const m = e && e.altKey ? "free" : snap; return m === "free" ? { x: p.x, y: p.y } : m === "half" ? { x: Math.round(p.x * 2) / 2, y: Math.round(p.y * 2) / 2 } : { x: Math.floor(p.x) + 0.5, y: Math.floor(p.y) + 0.5 }; };

  /* El plano pintado se guarda en un lienzo aparte mientras no cambie */
  let cache = { design: null, ppc: 0, canvas: null };
  const planImage = ppc => {
    ppc = Math.max(12, Math.min(96, Math.round(ppc)));
    if (Math.max(design.cols, design.rows) * ppc > 7000) ppc = Math.floor(7000 / Math.max(design.cols, design.rows));
    if (cache.design === design && cache.ppc === ppc) return cache;
    const c = cache.canvas || document.createElement("canvas");
    c.width = design.cols * ppc; c.height = design.rows * ppc;
    renderDesign(c.getContext("2d"), design, { ppc });
    cache = { design, ppc, canvas: c };
    return cache;
  };

  let raf = 0;
  const draw = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(paint); };
  function paint() {
    const g = geom(), dpr = Math.min(2, devicePixelRatio || 1);
    if (canvas.width !== Math.round(g.r.width * dpr) || canvas.height !== Math.round(g.r.height * dpr)) {
      canvas.width = Math.round(g.r.width * dpr); canvas.height = Math.round(g.r.height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0d0f14"; ctx.fillRect(0, 0, g.r.width, g.r.height);
    const img = planImage(g.cell * dpr);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img.canvas, g.ox, g.oy, design.cols * g.cell, design.rows * g.cell);
    ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 1;
    ctx.strokeRect(g.ox - 0.5, g.oy - 0.5, design.cols * g.cell + 1, design.rows * g.cell + 1);

    ctx.save();
    ctx.translate(g.ox, g.oy);
    /* Lo que se está dibujando */
    if (preview) paintPreview(g);
    /* Lo elegido */
    for (const id of sel) {
      const it = findItem(id);
      if (!it) continue;
      ctx.save();
      ctx.strokeStyle = "#7fd0ff"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      if (it.type === "floor" || it.type === "water") ctx.stroke(itemOutline(it, g.cell));
      const b = F.boundsOf(it);
      ctx.setLineDash([]); ctx.strokeStyle = "rgba(127,208,255,.6)"; ctx.lineWidth = 1;
      ctx.strokeRect(b.x * g.cell - 3, b.y * g.cell - 3, b.w * g.cell + 6, b.h * g.cell + 6);
      for (const h of handles(it)) { ctx.fillStyle = "#7fd0ff"; ctx.fillRect(h.x * g.cell - 5, h.y * g.cell - 5, 10, 10); ctx.strokeStyle = "#0d0f14"; ctx.strokeRect(h.x * g.cell - 5, h.y * g.cell - 5, 10, 10); }
      ctx.restore();
    }
    if (band) {
      ctx.strokeStyle = "#7fd0ff"; ctx.setLineDash([5, 4]); ctx.lineWidth = 1;
      ctx.strokeRect(Math.min(band.x0, band.x1) * g.cell, Math.min(band.y0, band.y1) * g.cell, Math.abs(band.x1 - band.x0) * g.cell, Math.abs(band.y1 - band.y0) * g.cell);
      ctx.setLineDash([]);
    }
    ctx.restore();
    const z = root.querySelector("[data-fj-zoom]"); if (z) z.textContent = Math.round(view.zoom * 100) + "%";
  }

  function paintPreview(g) {
    const p = preview, c = g.cell;
    ctx.save();
    const ink = p.op === "cut" ? "#ff8a8a" : "#7fd0ff";
    ctx.strokeStyle = ink; ctx.fillStyle = p.op === "cut" ? "rgba(255,90,90,.18)" : "rgba(127,208,255,.18)"; ctx.lineWidth = 2;
    if (p.kind === "shape") { const path = itemOutline(F.normalizeItem(p.item), c); ctx.fill(path, "evenodd"); ctx.stroke(path); }
    if (p.kind === "line") {
      ctx.beginPath(); p.points.forEach(([x, y], i) => (i ? ctx.lineTo(x * c, y * c) : ctx.moveTo(x * c, y * c)));
      if (p.hover) ctx.lineTo(p.hover.x * c, p.hover.y * c);
      ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);
      for (const [x, y] of p.points) { ctx.beginPath(); ctx.arc(x * c, y * c, 4, 0, Math.PI * 2); ctx.fillStyle = ink; ctx.fill(); }
    }
    if (p.kind === "door") drawDoor(ctx, F.normalizeItem(p.item), c, F.styleOf(design));
    if (p.kind === "ghost") {
      const it = F.normalizeItem(p.item);
      ctx.globalAlpha = 0.7;
      if (it.type === "prop") drawProp(ctx, it, c, F.styleOf(design).wall);
      if (it.type === "light") { ctx.beginPath(); ctx.arc(it.x * c, it.y * c, it.radius * c, 0, Math.PI * 2); ctx.setLineDash([5, 4]); ctx.stroke(); }
      if (it.type === "text") { ctx.font = `${Math.round(it.size * c)}px Georgia, serif`; ctx.textAlign = "center"; ctx.fillStyle = ink; ctx.fillText("Texto", it.x * c, it.y * c); }
    }
    ctx.restore();
  }

  /* Asas para cambiar el tamaño o mover un vértice */
  function handles(it) {
    if ((it.type === "floor" || it.type === "water") && (it.shape === "rect" || it.shape === "ellipse"))
      return [[0, 0], [1, 0], [1, 1], [0, 1]].map(([a, b], i) => ({ i, x: it.x + a * it.w, y: it.y + b * it.h }));
    if (it.points && it.shape !== "cave" && it.shape !== "cells") return it.points.map(([x, y], i) => ({ i, x, y, vertex: true }));
    if (it.type === "door") return [{ i: 0, x: it.x1, y: it.y1, end: 1 }, { i: 1, x: it.x2, y: it.y2, end: 2 }];
    return [];
  }

  /* ---------- Ratón ---------- */
  let drag = null, band = null, spaceDown = false;
  canvas.addEventListener("pointerdown", e => {
    canvas.setPointerCapture(e.pointerId);
    const p = toCell(e.clientX, e.clientY);
    if (e.button === 1 || e.button === 2 || tool === "hand" || spaceDown) {
      drag = { pan: true, sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
      return;
    }
    if (tool === "select") return selectDown(e, p);
    if (!ensureActive()) return;
    const s = snapP(p, e);
    switch (tool) {
      case "rect": case "ellipse": case "water":
        preview = { kind: "shape", op: tool === "water" ? "add" : mode, start: s, item: { type: tool === "water" ? "water" : "floor", shape: tool === "water" ? (shapeOpts.waterShape || "ellipse") : tool, op: tool === "water" ? mode : mode, x: s.x, y: s.y, w: 0.1, h: 0.1, r: shapeOpts.r, rough: shapeOpts.rough, seed: Math.floor(Math.random() * 1e6) } };
        break;
      case "cells": {
        const k = Math.floor(p.x) + "," + Math.floor(p.y);
        preview = { kind: "shape", op: mode, item: { type: "floor", shape: "cells", op: mode, cells: [k] } };
        break;
      }
      case "cave":
        preview = { kind: "shape", op: mode, item: { type: "floor", shape: "cave", op: mode, points: [[p.x, p.y]], radius: shapeOpts.radius, rough: Math.max(0.35, shapeOpts.rough), seed: Math.floor(Math.random() * 1e6) } };
        break;
      case "poly": case "wall": case "path":
        if (!preview || preview.kind !== "line" || preview.tool !== tool) preview = { kind: "line", tool, op: mode, points: [] };
        /* Pulsar el primer punto cierra el polígono */
        if (tool === "poly" && preview.points.length > 2 && Math.hypot(s.x - preview.points[0][0], s.y - preview.points[0][1]) < 0.4) return finishLine();
        {
          const last = preview.points[preview.points.length - 1];
          if (!last || last[0] !== s.x || last[1] !== s.y) preview.points.push([s.x, s.y]);
        }
        if (e.detail >= 2) return finishLine();
        break;
      case "door": {
        const d = doorAt(p, e);
        addItems([{ type: "door", kind: shapeOpts.doorKind, ...d }]);
        break;
      }
      case "prop": {
        const c = center(p, e);
        const [it] = addItems([{ type: "prop", kind: shapeOpts.prop, x: c.x, y: c.y, rot: shapeOpts.propRot || 0, scale: shapeOpts.propScale || 1 }]);
        sel = [it.id]; paintPanel();
        break;
      }
      case "light": {
        const c = center(p, e);
        addItems([{ type: "light", x: c.x, y: c.y, radius: shapeOpts.lightRadius, color: shapeOpts.lightColor }]);
        break;
      }
      case "text": {
        const c = center(p, e);
        const [it] = addItems([{ type: "text", text: "Sala del trono", x: c.x, y: c.y + 0.25, size: shapeOpts.textSize }]);
        sel = [it.id]; tab = "props"; paintPanel();
        setTimeout(() => { const box = root.querySelector('[data-p="text"]'); if (box) { box.focus(); box.select(); } }, 30);
        break;
      }
    }
    draw();
  });
  canvas.addEventListener("pointermove", e => {
    const p = toCell(e.clientX, e.clientY);
    const co = root.querySelector("[data-fj-coords]");
    if (co) co.textContent = `${Math.floor(p.x)}, ${Math.floor(p.y)}`;
    if (drag && drag.pan) {
      const g = geom();
      view.x = drag.vx - (e.clientX - drag.sx) / g.cell; view.y = drag.vy - (e.clientY - drag.sy) / g.cell;
      return draw();
    }
    if (drag && drag.select) return selectMove(e, p);
    if (band) { band.x1 = p.x; band.y1 = p.y; return draw(); }
    if (!preview) {
      if (tool === "door") { preview = { kind: "door", hover: true, item: { type: "door", kind: shapeOpts.doorKind, ...doorAt(p, e) } }; draw(); preview = null; }
      if (tool === "prop" || tool === "light" || tool === "text") {
        const c = center(p, e);
        preview = { kind: "ghost", hover: true, item: tool === "prop" ? { type: "prop", kind: shapeOpts.prop, x: c.x, y: c.y, rot: shapeOpts.propRot || 0, scale: shapeOpts.propScale || 1 }
          : tool === "light" ? { type: "light", x: c.x, y: c.y, radius: shapeOpts.lightRadius } : { type: "text", x: c.x, y: c.y, size: shapeOpts.textSize } };
        draw(); preview = null;
      }
      return;
    }
    const s = snapP(p, e);
    if (preview.kind === "shape" && preview.start) {
      const it = preview.item, a = preview.start;
      let x = Math.min(a.x, s.x), y = Math.min(a.y, s.y), w = Math.abs(s.x - a.x), h = Math.abs(s.y - a.y);
      if (e.shiftKey) { const m = Math.max(w, h); w = m; h = m; x = s.x < a.x ? a.x - m : a.x; y = s.y < a.y ? a.y - m : a.y; }
      Object.assign(it, { x, y, w: Math.max(0.1, w), h: Math.max(0.1, h) });
    } else if (preview.kind === "shape" && preview.item.shape === "cells" && e.buttons) {
      const k = Math.floor(p.x) + "," + Math.floor(p.y);
      if (!preview.item.cells.includes(k)) preview.item.cells.push(k);
    } else if (preview.kind === "shape" && preview.item.shape === "cave" && e.buttons) {
      const last = preview.item.points[preview.item.points.length - 1];
      if (Math.hypot(p.x - last[0], p.y - last[1]) > 0.35) preview.item.points.push([Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100]);
    } else if (preview.kind === "line") preview.hover = s;
    draw();
  });
  canvas.addEventListener("pointerup", e => {
    if (drag && drag.select) { selectUp(); drag = null; return; }
    drag = null;
    if (band) {
      const x0 = Math.min(band.x0, band.x1), x1 = Math.max(band.x0, band.x1), y0 = Math.min(band.y0, band.y1), y1 = Math.max(band.y0, band.y1);
      const hits = [];
      for (const l of design.layers) if (l.visible && !l.locked) for (const it of l.items) {
        const b = F.boundsOf(it);
        if (b.x >= x0 && b.y >= y0 && b.x + b.w <= x1 && b.y + b.h <= y1) hits.push(it.id);
      }
      sel = e.shiftKey ? [...new Set([...sel, ...hits])] : hits;
      band = null; paintPanel(); return draw();
    }
    if (!preview || preview.kind !== "shape") return;
    const it = preview.item;
    preview = null;
    if ((it.shape === "rect" || it.shape === "ellipse") && (it.w < 0.4 || it.h < 0.4)) return draw();
    if (it.shape === "cave" && it.points.length === 1) it.points.push([it.points[0][0] + 0.01, it.points[0][1]]);
    addItems([it]);
  });
  canvas.addEventListener("dblclick", () => { if (preview && preview.kind === "line") finishLine(); });
  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    const before = toCell(e.clientX, e.clientY);
    view.zoom = clamp(view.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 0.3, 12);
    const after = toCell(e.clientX, e.clientY);
    view.x += before.x - after.x; view.y += before.y - after.y;
    draw();
  }, { passive: false });
  canvas.addEventListener("contextmenu", e => e.preventDefault());

  function finishLine() {
    const p = preview;
    preview = null;
    if (!p || p.kind !== "line") return draw();
    if (p.tool === "poly" && p.points.length >= 3) addItems([{ type: "floor", shape: "poly", op: p.op, points: p.points, smooth: shapeOpts.smooth, rough: shapeOpts.rough, seed: Math.floor(Math.random() * 1e6) }]);
    else if (p.tool === "wall" && p.points.length >= 2) addItems([{ type: "wall", kind: shapeOpts.wallKind, points: p.points, smooth: shapeOpts.smooth }]);
    else if (p.tool === "path" && p.points.length >= 2) addItems([{ type: "path", points: p.points, width: shapeOpts.pathWidth, color: shapeOpts.pathColor, smooth: true }]);
    draw();
  }

  /* La puerta va al borde de casilla más cercano, o a la diagonal si se pulsa en el centro */
  function doorAt(p, e) {
    const len = shapeOpts.doorLen || 1;
    const fx = p.x - Math.floor(p.x), fy = p.y - Math.floor(p.y), x = Math.floor(p.x), y = Math.floor(p.y);
    const near = Math.min(fx, 1 - fx, fy, 1 - fy);
    if (near > 0.3 && !(e && e.shiftKey)) {
      /* diagonal de la casilla: la más cercana */
      return Math.abs(fx - fy) <= Math.abs(fx + fy - 1) ? { x1: x, y1: y, x2: x + 1, y2: y + 1 } : { x1: x + 1, y1: y, x2: x, y2: y + 1 };
    }
    const opts2 = [[fx, "v", x], [1 - fx, "v", x + 1], [fy, "h", y], [1 - fy, "h", y + 1]].sort((a, b) => a[0] - b[0]);
    const [, dir, at] = opts2[0];
    const off = Math.floor((len - 1) / 2);
    return dir === "v" ? { x1: at, y1: y - off, x2: at, y2: y - off + len } : { x1: x - off, y1: at, x2: x - off + len, y2: at };
  }

  /* ---------- Elegir y mover ---------- */
  function selectDown(e, p) {
    /* ¿Un asa de lo elegido? */
    const g = geom();
    for (const id of sel) {
      const it = findItem(id);
      if (!it) continue;
      for (const h of handles(it)) {
        if (Math.hypot(h.x - p.x, h.y - p.y) * g.cell < 9) {
          drag = { select: true, handle: h, id, orig: it, start: p, base: design };
          return;
        }
      }
    }
    const hit = F.hitTest(design, p.x, p.y, { tol: 6 / g.cell });
    if (!hit) {
      if (!e.shiftKey) sel = [];
      band = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
      paintPanel(); return draw();
    }
    if (e.shiftKey) sel = sel.includes(hit.item.id) ? sel.filter(i => i !== hit.item.id) : [...sel, hit.item.id];
    else if (!sel.includes(hit.item.id)) sel = [hit.item.id];
    drag = { select: true, start: p, base: design, moved: false };
    tab = "props"; paintPanel(); draw();
  }
  function selectMove(e, p) {
    const dx0 = p.x - drag.start.x, dy0 = p.y - drag.start.y;
    if (!drag.moved && Math.hypot(dx0, dy0) < 0.08) return;
    drag.moved = true;
    const m = e.altKey ? "free" : snap;
    const q = v => m === "cell" ? Math.round(v) : m === "half" ? Math.round(v * 2) / 2 : v;
    let next = drag.base;
    if (drag.handle) {
      const it = drag.orig, h = drag.handle, s = snapP(p, e);
      let out = it;
      if (h.vertex) out = { ...it, points: it.points.map((pt, i) => i === h.i ? [s.x, s.y] : pt) };
      else if (h.end) out = h.end === 1 ? { ...it, x1: s.x, y1: s.y } : { ...it, x2: s.x, y2: s.y };
      else {
        const ax = h.i === 0 || h.i === 3 ? it.x + it.w : it.x, ay = h.i < 2 ? it.y + it.h : it.y;
        out = { ...it, x: Math.min(ax, s.x), y: Math.min(ay, s.y), w: Math.max(0.2, Math.abs(s.x - ax)), h: Math.max(0.2, Math.abs(s.y - ay)) };
      }
      design = replaceItemIn(drag.base, it.id, out);
    } else {
      const dx = q(dx0), dy = q(dy0);
      next = { ...drag.base, layers: drag.base.layers.map(l => ({ ...l, items: l.items.map(i => sel.includes(i.id) && !l.locked ? F.moveItem(i, dx, dy) : i) })) };
      design = next;
    }
    draw();
  }
  function selectUp() {
    if (drag.moved && drag.base !== design) {
      const moved = design;
      design = drag.base;
      commit(moved, { keepSel: true });
    }
  }
  const replaceItemIn = (d, id, next) => ({ ...d, layers: d.layers.map(l => ({ ...l, items: l.items.map(i => i.id === id ? next : i) })) });

  /* ---------- Teclado ---------- */
  const keys = e => {
    if (!root.isConnected) return;
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName);
    if (e.key === " " && !typing) { spaceDown = e.type === "keydown"; e.preventDefault(); return; }
    if (e.type !== "keydown") return;
    if (e.key === "Escape") {
      if (preview) { preview = null; return draw(); }
      if (sel.length) { sel = []; paintPanel(); return draw(); }
      return;
    }
    if (typing) return;
    const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (ctrl && k === "z") { e.preventDefault(); return e.shiftKey ? doRedo() : doUndo(); }
    if (ctrl && k === "y") { e.preventDefault(); return doRedo(); }
    if (ctrl && k === "c") { clipboard = sel.map(findItem).filter(Boolean); return toast(clipboard.length + " copiado"); }
    if (ctrl && k === "v") { e.preventDefault(); return paste(); }
    if (ctrl && k === "d") { e.preventDefault(); clipboard = sel.map(findItem).filter(Boolean); return paste(); }
    if (ctrl && k === "s") { e.preventDefault(); return saveProject(); }
    if (e.key === "Enter" && preview && preview.kind === "line") return finishLine();
    if ((e.key === "Delete" || e.key === "Backspace") && sel.length) { commit(removeIds(sel)); sel = []; paintPanel(); return draw(); }
    if (e.key.startsWith("Arrow") && sel.length) {
      e.preventDefault();
      const st = e.shiftKey ? 1 : snap === "free" ? 0.1 : snap === "half" ? 0.5 : 1;
      const dx = e.key === "ArrowLeft" ? -st : e.key === "ArrowRight" ? st : 0, dy = e.key === "ArrowUp" ? -st : e.key === "ArrowDown" ? st : 0;
      return commit(withLayers(l => ({ ...l, items: l.items.map(i => sel.includes(i.id) ? F.moveItem(i, dx, dy) : i) })), { keepSel: true });
    }
    if ((k === "q" || k === "w") && sel.length) {
      const d = (k === "q" ? -1 : 1) * (e.shiftKey ? 15 : 90);
      return commit(withLayers(l => ({ ...l, items: l.items.map(i => sel.includes(i.id) && "rot" in i ? { ...i, rot: ((i.rot || 0) + d + 360) % 360 } : i) })), { keepSel: true });
    }
    if (k === "x") return setMode(mode === "add" ? "cut" : "add");
    if (k === "+" || k === "=") { view.zoom = clamp(view.zoom * 1.2, 0.3, 12); return draw(); }
    if (k === "-") { view.zoom = clamp(view.zoom / 1.2, 0.3, 12); return draw(); }
    if (KEYS[k] && !ctrl) setTool(KEYS[k]);
  };
  document.addEventListener("keydown", keys, true);
  document.addEventListener("keyup", keys, true);
  const onResize = () => draw();
  window.addEventListener("resize", onResize);

  function paste() {
    if (!clipboard || !clipboard.length || !ensureActive()) return;
    const copies = clipboard.map(it => ({ ...F.moveItem(it, 1, 1), id: F.uidF() }));
    const list = addItems(copies);
    sel = list.map(i => i.id); paintPanel(); draw();
  }

  /* ---------- Herramientas y paneles ---------- */
  const HINTS = {
    select: "Pulsa una pieza para elegirla y arrástrala para moverla. Mayús suma a la selección; arrastra en vacío para elegir varias. Q/W giran, Supr borra.",
    hand: "Arrastra para mover la vista. La rueda acerca y aleja.",
    rect: "Arrastra para dibujar una sala; las paredes salen solas. Mayús: cuadrada. Con «Recortar» quita suelo.",
    ellipse: "Arrastra para un círculo o un óvalo. Mayús: redondo.",
    poly: "Pulsa los vértices; doble clic, Intro o el primer punto para cerrar. Esc cancela.",
    cells: "Arrastra por las casillas para pintar suelo casilla a casilla.",
    cave: "Arrastra como con un pincel grueso: deja una cueva de bordes irregulares.",
    water: "Arrastra para un estanque o un río. El agua se dibuja encima del suelo.",
    wall: "Pulsa los puntos de un muro suelto (un tabique, una columna). Doble clic o Intro para acabar.",
    door: "Pulsa junto a un borde para una puerta recta, o en el centro de una casilla para una en diagonal. Corta la pared sola.",
    path: "Pulsa los puntos de un camino o un río; doble clic o Intro para acabar.",
    prop: "Elige un objeto a la derecha y pulsa donde va. Q/W lo giran una vez colocado.",
    text: "Pulsa donde va el texto y escríbelo a la derecha.",
    light: "Pulsa donde va la luz: una antorcha, un brasero, una ventana."
  };
  function setTool(t) {
    if (preview && preview.kind === "line" && preview.tool !== t) finishLine();
    tool = t; preview = null;
    root.querySelectorAll("[data-tool]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tool === t)));
    root.querySelector("[data-fj-hint]").textContent = HINTS[t] || "";
    canvas.style.cursor = t === "hand" ? "grab" : t === "select" ? "default" : "crosshair";
    if (t !== "select") { tab = "props"; }
    paintPanel(); draw();
  }
  function setMode(m) {
    mode = m;
    const b = root.querySelector('[data-fj="mode"]');
    b.classList.toggle("cut", m === "cut");
    b.innerHTML = `${icon(m === "cut" ? "scissors" : "plus", 19)}<span>${m === "cut" ? "Recortar" : "Sumar"}</span>`;
  }

  const field = (label, html) => `<label class="field"><span>${label}</span>${html}</label>`;
  const range = (key, min, max, step, val) => `<input type="range" data-o="${key}" min="${min}" max="${max}" step="${step}" value="${val}">`;
  function paintPanel() {
    root.querySelectorAll("[data-tab]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    const host = root.querySelector("[data-fj-panel]");
    if (tab === "layers") host.innerHTML = layersHTML();
    else if (tab === "style") host.innerHTML = styleHTML();
    else host.innerHTML = sel.length ? itemHTML() : toolHTML();
  }

  function toolHTML() {
    const t = tool;
    const parts = [`<h4 class="fj-h">${esc((TOOLS.find(x => x && x[0] === t) || [, , "Herramienta"])[2])}</h4>`, `<p class="fj-note">${esc(HINTS[t] || "")}</p>`];
    if (t === "rect") parts.push(field("Esquinas redondeadas (casillas)", range("r", 0, 6, 0.25, shapeOpts.r)));
    if (["rect", "ellipse", "poly", "water"].includes(t)) parts.push(field("Paredes irregulares", range("rough", 0, 1, 0.05, shapeOpts.rough)));
    if (t === "water") parts.push(field("Forma", `<select data-o="waterShape"><option value="ellipse">Óvalo</option><option value="rect" ${shapeOpts.waterShape === "rect" ? "selected" : ""}>Rectángulo</option></select>`));
    if (t === "poly" || t === "wall") parts.push(`<label class="check"><input type="checkbox" data-o="smooth" ${shapeOpts.smooth ? "checked" : ""}> Curvas suaves entre los puntos</label>`);
    if (t === "cave") parts.push(field("Grosor del pincel (casillas)", range("radius", 0.4, 5, 0.1, shapeOpts.radius)), field("Rugosidad", range("rough", 0.2, 1, 0.05, Math.max(0.35, shapeOpts.rough))));
    if (t === "wall") parts.push(field("Tipo", `<select data-o="wallKind"><option value="wall">Muro</option><option value="window" ${shapeOpts.wallKind === "window" ? "selected" : ""}>Ventana</option></select>`));
    if (t === "door") parts.push(field("Tipo", `<select data-o="doorKind">${Object.entries(DOOR_NAMES).map(([k, n]) => `<option value="${k}" ${k === shapeOpts.doorKind ? "selected" : ""}>${n}</option>`).join("")}</select>`),
      field("Ancho (casillas)", `<select data-o="doorLen">${[1, 2, 3].map(n => `<option ${n === shapeOpts.doorLen ? "selected" : ""}>${n}</option>`).join("")}</select>`));
    if (t === "path") parts.push(field("Ancho (casillas)", range("pathWidth", 0.2, 4, 0.1, shapeOpts.pathWidth)), field("Color", `<input type="color" data-o="pathColor" value="${shapeOpts.pathColor}">`));
    if (t === "light") parts.push(field("Radio (casillas)", range("lightRadius", 1, 12, 0.5, shapeOpts.lightRadius)), field("Color", `<input type="color" data-o="lightColor" value="${shapeOpts.lightColor}">`));
    if (t === "text") parts.push(field("Tamaño", range("textSize", 0.3, 3, 0.1, shapeOpts.textSize)));
    if (t === "prop") parts.push(propLibraryHTML());
    if (["rect", "ellipse", "poly", "cells", "cave", "water"].includes(t)) parts.push(`<p class="fj-note">${mode === "cut" ? "Ahora recorta: quita suelo (X para sumar)." : "Ahora suma suelo (X para recortar)."}</p>`);
    parts.push(`<p class="fj-note">Capa: <b>${esc((design.layers.find(l => l.id === activeLayer) || {}).name || "")}</b> (cámbiala en «Capas»).</p>`);
    return parts.join("");
  }
  function propLibraryHTML() {
    return `<div class="fj-props">${PROP_GROUPS.map(([g, list]) => `<h5>${esc(g)}</h5><div class="fj-prop-grid">${list.map(k =>
      `<button type="button" data-prop="${k}" aria-pressed="${k === shapeOpts.prop}" title="${esc(PROPS[k].name)}"><canvas width="44" height="44" data-thumb="${k}"></canvas><span>${esc(PROPS[k].name)}</span></button>`).join("")}</div>`).join("")}</div>`;
  }

  function itemHTML() {
    const items = sel.map(findItem).filter(Boolean);
    if (!items.length) return toolHTML();
    const it = items[0], many = items.length > 1;
    const L = layerOf(it.id);
    const common = `<div class="fj-row">
      <button class="btn sm" data-act="dup" title="Duplicar (Ctrl+D)">${icon("copy", 15)} Duplicar</button>
      <button class="btn sm" data-act="mirrorX" title="Espejo horizontal">${icon("mirror", 15)} Espejo</button>
      <button class="btn sm" data-act="mirrorY" title="Espejo vertical">${icon("mirror", 15)} Vertical</button>
      <button class="btn sm" data-act="front" title="Delante de todo">${icon("layerUp", 15)} Delante</button>
      <button class="btn sm" data-act="back" title="Detrás de todo">${icon("down", 15)} Detrás</button>
      <button class="btn sm danger" data-act="del" title="Borrar (Supr)">${icon("trash", 15)} Borrar</button></div>
      ${field("Capa", `<select data-act-layer>${design.layers.map(l => `<option value="${l.id}" ${L && l.id === L.id ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select>`)}`;
    if (many) return `<h4 class="fj-h">${items.length} piezas</h4>${common}`;
    const P = (key, html) => field(key, html);
    const num = (k, v, step = 0.5, min = -999) => `<input type="number" data-p="${k}" value="${Math.round(v * 100) / 100}" step="${step}" min="${min}">`;
    const rows = [];
    const title = it.type === "floor" ? (it.op === "cut" ? "Recorte" : { rect: "Sala", ellipse: "Círculo", poly: "Polígono", cells: "Casillas", cave: "Cueva" }[it.shape])
      : { water: "Agua", wall: it.kind === "window" ? "Ventana" : "Muro suelto", door: DOOR_NAMES[it.kind], prop: (PROPS[it.kind] || {}).name || "Objeto", text: "Texto", light: "Luz", path: "Camino" }[it.type];
    if ((it.type === "floor" || it.type === "water") && (it.shape === "rect" || it.shape === "ellipse")) {
      rows.push(`<div class="fj-grid4">${P("X", num("x", it.x))}${P("Y", num("y", it.y))}${P("Ancho", num("w", it.w, 0.5, 0.2))}${P("Alto", num("h", it.h, 0.5, 0.2))}</div>`);
      if (it.shape === "rect") rows.push(P("Esquinas redondeadas", `<input type="range" data-p="r" min="0" max="${Math.min(it.w, it.h) / 2}" step="0.25" value="${it.r}">`));
    }
    if (it.type === "floor" || it.type === "water") {
      if (it.shape !== "cells") rows.push(P("Paredes irregulares", `<input type="range" data-p="rough" min="0" max="1" step="0.05" value="${it.rough}">`));
      if (it.shape === "poly") rows.push(`<label class="check"><input type="checkbox" data-p="smooth" ${it.smooth ? "checked" : ""}> Curvas suaves</label>`);
      if (it.shape === "cave") rows.push(P("Grosor", `<input type="range" data-p="radius" min="0.4" max="5" step="0.1" value="${it.radius}">`));
      if (it.type === "floor") rows.push(P("Efecto", `<select data-p="op"><option value="add">Suma suelo</option><option value="cut" ${it.op === "cut" ? "selected" : ""}>Recorta suelo</option></select>`));
      rows.push(`<button class="btn sm" data-act="reseed">${icon("dice", 15)} Otra forma irregular</button>`);
    }
    if (it.type === "wall") rows.push(P("Tipo", `<select data-p="kind"><option value="wall">Muro</option><option value="window" ${it.kind === "window" ? "selected" : ""}>Ventana</option></select>`), `<label class="check"><input type="checkbox" data-p="smooth" ${it.smooth ? "checked" : ""}> Curvas suaves</label>`);
    if (it.type === "door") rows.push(P("Tipo", `<select data-p="kind">${Object.entries(DOOR_NAMES).map(([k, n]) => `<option value="${k}" ${k === it.kind ? "selected" : ""}>${n}</option>`).join("")}</select>`));
    if (it.type === "path") rows.push(P("Ancho", `<input type="range" data-p="width" min="0.2" max="4" step="0.1" value="${it.width}">`), P("Color", `<input type="color" data-p="color" value="${it.color}">`), `<label class="check"><input type="checkbox" data-p="dashed" ${it.dashed ? "checked" : ""}> A trazos (un sendero)</label>`);
    if (it.type === "prop") rows.push(`<div class="fj-grid4">${P("X", num("x", it.x))}${P("Y", num("y", it.y))}${P("Giro (°)", num("rot", it.rot, 15))}${P("Tamaño", num("scale", it.scale, 0.25, 0.2))}</div>`,
      P("Objeto", `<select data-p="kind">${Object.entries(PROPS).map(([k, d]) => `<option value="${k}" ${k === it.kind ? "selected" : ""}>${esc(d.name)}</option>`).join("")}</select>`),
      P("Color", `<input type="color" data-p="color" value="${it.color || "#9a6a3c"}">`), `<button class="btn sm" data-act="nocolor">Color de serie</button>`);
    if (it.type === "text") rows.push(P("Texto", `<input data-p="text" value="${esc(it.text)}" maxlength="120">`),
      `<div class="fj-grid4">${P("Tamaño", num("size", it.size, 0.1, 0.2))}${P("Giro (°)", num("rot", it.rot, 15))}${P("X", num("x", it.x))}${P("Y", num("y", it.y))}</div>`,
      P("Letra", `<select data-p="font">${[["serif", "Clásica"], ["sans", "Moderna"], ["mono", "Máquina"], ["hand", "A mano"]].map(([k, n]) => `<option value="${k}" ${k === it.font ? "selected" : ""}>${n}</option>`).join("")}</select>`),
      P("Alineación", `<select data-p="align">${[["left", "Izquierda"], ["center", "Centro"], ["right", "Derecha"]].map(([k, n]) => `<option value="${k}" ${k === it.align ? "selected" : ""}>${n}</option>`).join("")}</select>`),
      P("Color", `<input type="color" data-p="color" value="${it.color || F.styleOf(design).text}">`),
      `<label class="check"><input type="checkbox" data-p="bold" ${it.bold ? "checked" : ""}> Negrita</label><label class="check"><input type="checkbox" data-p="shadow" ${it.shadow ? "checked" : ""}> Sombra</label>`);
    if (it.type === "light") rows.push(P("Radio", `<input type="range" data-p="radius" min="1" max="12" step="0.5" value="${it.radius}">`), P("Color", `<input type="color" data-p="color" value="${it.color}">`));
    return `<h4 class="fj-h">${esc(title || "Pieza")}</h4>${rows.join("")}${common}`;
  }

  function layersHTML() {
    return `<h4 class="fj-h">Capas</h4><p class="fj-note">Lo nuevo va a la capa marcada. Las de abajo se pintan primero.</p>
      <div class="fj-layers">${design.layers.slice().reverse().map(l => `<div class="fj-layer ${l.id === activeLayer ? "on" : ""}" data-layer="${l.id}">
        <button class="icon-btn" data-l="vis" title="${l.visible ? "Ocultar" : "Enseñar"}" aria-label="${l.visible ? "Ocultar" : "Enseñar"}">${icon(l.visible ? "eye" : "eyeOff", 15)}</button>
        <button class="icon-btn" data-l="lock" title="${l.locked ? "Desbloquear" : "Bloquear"}" aria-label="${l.locked ? "Desbloquear" : "Bloquear"}">${icon(l.locked ? "lock" : "unlock", 15)}</button>
        <input data-l="name" value="${esc(l.name)}" aria-label="Nombre de la capa">
        <span class="fj-count tnum">${l.items.length}</span>
        <button class="icon-btn" data-l="up" title="Subir" aria-label="Subir">${icon("up", 15)}</button>
        <button class="icon-btn" data-l="down" title="Bajar" aria-label="Bajar">${icon("down", 15)}</button>
        <button class="icon-btn" data-l="del" title="Quitar la capa" aria-label="Quitar la capa">${icon("trash", 15)}</button>
        <input type="range" data-l="opacity" min="0.1" max="1" step="0.05" value="${l.opacity}" aria-label="Opacidad" title="Opacidad">
      </div>`).join("")}</div>
      <button class="btn sm" data-l-add>${icon("plus", 15)} Nueva capa</button>`;
  }

  function styleHTML() {
    const st = F.styleOf(design), c = design.style.custom || {};
    const color = (k, label) => field(label, `<input type="color" data-s="${k}" value="${st[k]}">`);
    return `<h4 class="fj-h">Estilo</h4>
      <div class="fj-presets">${Object.entries(F.STYLES).map(([k, s]) => `<button type="button" data-preset="${k}" aria-pressed="${design.style.preset === k}" style="--bg:${s.bg};--fl:${s.floor};--wl:${s.wall}"><i></i>${esc(s.name)}</button>`).join("")}</div>
      <div class="fj-grid2">${color("floor", "Suelo")}${color("wall", "Paredes")}${color("bg", "Fondo")}${color("hatchColor", "Rayado")}${color("water", "Agua")}${color("gridColor", "Cuadrícula")}${color("text", "Textos")}</div>
      ${field("Grosor de las paredes", `<input type="range" data-s="wallWidth" min="0.05" max="0.4" step="0.01" value="${st.wallWidth}">`)}
      <label class="check"><input type="checkbox" data-s="hatch" ${st.hatch ? "checked" : ""}> Rayado de roca alrededor</label>
      ${field("Ancho del rayado", `<input type="range" data-s="hatchWidth" min="0.3" max="2.5" step="0.1" value="${st.hatchWidth}">`)}
      <label class="check"><input type="checkbox" data-s="shadow" ${st.shadow ? "checked" : ""}> Sombra bajo el suelo</label>
      ${field("Cuadrícula", `<select data-s="grid"><option value="floor" ${st.grid === "floor" ? "selected" : ""}>Solo en el suelo</option><option value="all" ${st.grid === "all" ? "selected" : ""}>En todo el plano</option><option value="none" ${st.grid === "none" ? "selected" : ""}>Sin cuadrícula</option></select>`)}
      ${field("Fuerza de la cuadrícula", `<input type="range" data-s="gridAlpha" min="0" max="0.6" step="0.02" value="${st.gridAlpha}">`)}
      ${field("Textura del suelo", `<input type="range" data-s="texture" min="0" max="0.4" step="0.02" value="${st.texture}">`)}
      ${Object.keys(c).length ? `<button class="btn sm" data-s-reset>Volver al estilo de serie</button>` : ""}
      <h4 class="fj-h" style="margin-top:16px">Tamaño del plano</h4>
      <div class="fj-grid2">${field("Columnas", `<input type="number" data-size="cols" min="5" max="150" value="${design.cols}">`)}${field("Filas", `<input type="number" data-size="rows" min="5" max="150" value="${design.rows}">`)}</div>`;
  }

  const paintThumbs = () => root.querySelectorAll("[data-thumb]").forEach(cv => {
    const x = cv.getContext("2d"); x.clearRect(0, 0, 44, 44);
    drawProp(x, F.normalizeItem({ type: "prop", kind: cv.dataset.thumb, x: 0.5, y: 0.5, scale: 0.9 }), 44, "#2b2116");
  });
  const panelObserver = new MutationObserver(paintThumbs);
  panelObserver.observe(root.querySelector("[data-fj-panel]"), { childList: true });

  /* Cambios desde los paneles */
  const panel = root.querySelector("[data-fj-panel]");
  panel.addEventListener("input", e => {
    const t = e.target;
    if (t.dataset.o) { shapeOpts[t.dataset.o] = t.type === "checkbox" ? t.checked : t.type === "range" || t.type === "number" ? +t.value : (t.dataset.o === "doorLen" ? +t.value : t.value); if (t.dataset.o === "doorLen") shapeOpts.doorLen = +t.value; return; }
    if (t.dataset.p && sel.length && (t.type === "range" || t.type === "color" || t.type === "text" || t.tagName === "INPUT")) setProp(t, e.type);
    if (t.dataset.s && (t.type === "range" || t.type === "color")) setStyle(t.dataset.s, t.type === "range" ? +t.value : t.value, true);
    if (t.dataset.l === "opacity") setLayer(t.closest("[data-layer]").dataset.layer, { opacity: +t.value }, true);
  });
  panel.addEventListener("change", e => {
    const t = e.target;
    if (t.dataset.o) { shapeOpts[t.dataset.o] = t.type === "checkbox" ? t.checked : (t.dataset.o === "doorLen" ? +t.value : t.value); return; }
    if (t.dataset.p && sel.length) setProp(t, "change");
    if (t.dataset.s) setStyle(t.dataset.s, t.type === "checkbox" ? t.checked : t.type === "range" ? +t.value : t.value);
    if (t.dataset.l === "name") setLayer(t.closest("[data-layer]").dataset.layer, { name: t.value.trim() || "Capa" });
    if (t.dataset.l === "opacity") setLayer(t.closest("[data-layer]").dataset.layer, { opacity: +t.value });
    if (t.dataset.size) {
      const v = clamp(Math.trunc(+t.value || 5), 5, 150);
      commit({ ...design, [t.dataset.size]: v });
    }
    if (t.hasAttribute("data-act-layer")) {
      const to = t.value, items = sel.map(findItem).filter(Boolean);
      commit({ ...removeIds(sel), layers: removeIds(sel).layers.map(l => l.id === to ? { ...l, items: [...l.items, ...items] } : l) }, { keepSel: true });
    }
  });
  /* Un cambio de propiedad mientras se arrastra un control: se ve al momento
     pero solo se apunta en la historia al soltarlo */
  let live = null;
  function setProp(t, kind) {
    const it = findItem(sel[0]);
    if (!it) return;
    const k = t.dataset.p;
    let v = t.type === "checkbox" ? t.checked : t.type === "number" || t.type === "range" ? +t.value : t.value;
    if (k === "rot") v = ((v % 360) + 360) % 360;
    const next = F.normalizeItem({ ...it, [k]: v });
    if (kind === "input" && (t.type === "range" || t.type === "color" || t.type === "text" || t.tagName === "INPUT")) {
      if (!live) live = design;
      design = replaceItem(it.id, next);
      return draw();
    }
    const base = live || design;
    live = null;
    design = base;
    commit(replaceItemIn(base, it.id, next), { keepSel: true });
  }
  let liveStyle = null;
  function setStyle(k, v, liveOnly = false) {
    const next = { ...design, style: { ...design.style, custom: { ...design.style.custom, [k]: v } } };
    if (liveOnly) { if (!liveStyle) liveStyle = design; design = next; return draw(); }
    const base = liveStyle || design; liveStyle = null; design = base;
    commit(next);
  }
  let liveLayer = null;
  function setLayer(id, patch, liveOnly = false) {
    const next = withLayers(l => l.id === id ? { ...l, ...patch } : l);
    if (liveOnly) { if (!liveLayer) liveLayer = design; design = next; return draw(); }
    const base = liveLayer || design; liveLayer = null; design = base;
    commit(next);
  }

  panel.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.prop) { shapeOpts.prop = b.dataset.prop; panel.querySelectorAll("[data-prop]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); return; }
    if (b.dataset.preset) return commit({ ...design, style: { preset: b.dataset.preset, custom: {} } });
    if (b.hasAttribute("data-s-reset")) return commit({ ...design, style: { ...design.style, custom: {} } });
    if (b.hasAttribute("data-l-add")) {
      const l = { id: F.uidF(), name: "Capa " + (design.layers.length + 1), visible: true, locked: false, opacity: 1, items: [] };
      activeLayer = l.id;
      return commit({ ...design, layers: [...design.layers, l] });
    }
    const row = b.closest("[data-layer]");
    if (row && b.dataset.l) {
      const id = row.dataset.layer, i = design.layers.findIndex(l => l.id === id), L = design.layers[i];
      if (b.dataset.l === "vis") return setLayer(id, { visible: !L.visible });
      if (b.dataset.l === "lock") return setLayer(id, { locked: !L.locked });
      if (b.dataset.l === "up" || b.dataset.l === "down") {
        const j = b.dataset.l === "up" ? i + 1 : i - 1;
        if (j < 0 || j >= design.layers.length) return;
        const ls = design.layers.slice(); [ls[i], ls[j]] = [ls[j], ls[i]];
        return commit({ ...design, layers: ls });
      }
      if (b.dataset.l === "del") {
        if (design.layers.length < 2) return toast("Tiene que quedar una capa", "bad");
        return confirmBox(`¿Quitar la capa «${L.name}» con sus ${L.items.length} piezas?`).then(okk => {
          if (!okk) return;
          if (activeLayer === id) activeLayer = design.layers.find(l => l.id !== id).id;
          commit({ ...design, layers: design.layers.filter(l => l.id !== id) });
        });
      }
    }
    const act = b.dataset.act;
    if (!act) return;
    const items = sel.map(findItem).filter(Boolean);
    if (act === "del") { commit(removeIds(sel)); sel = []; return paintPanel(); }
    if (act === "dup") { clipboard = items; return paste(); }
    if (act === "mirrorX" || act === "mirrorY") return commit(withLayers(l => ({ ...l, items: l.items.map(i => sel.includes(i.id) ? F.mirrorItem(i, act === "mirrorX" ? "x" : "y") : i) })), { keepSel: true });
    if (act === "front" || act === "back") return commit(withLayers(l => {
      const mine = l.items.filter(i => sel.includes(i.id)), rest = l.items.filter(i => !sel.includes(i.id));
      return { ...l, items: act === "front" ? [...rest, ...mine] : [...mine, ...rest] };
    }), { keepSel: true });
    if (act === "reseed") return commit(withLayers(l => ({ ...l, items: l.items.map(i => sel.includes(i.id) ? { ...i, seed: Math.floor(Math.random() * 1e6), rough: i.rough || 0.3 } : i) })), { keepSel: true });
    if (act === "nocolor") return commit(withLayers(l => ({ ...l, items: l.items.map(i => sel.includes(i.id) ? { ...i, color: "" } : i) })), { keepSel: true });
  });
  /* Pulsar una capa la hace la activa */
  panel.addEventListener("pointerdown", e => {
    const row = e.target.closest("[data-layer]");
    if (row && !e.target.closest("button, input")) { activeLayer = row.dataset.layer; paintPanel(); }
  });

  /* ---------- Barra de arriba ---------- */
  root.querySelector(".fj-tools").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.tool) setTool(b.dataset.tool);
    if (b.dataset.fj === "mode") { setMode(mode === "add" ? "cut" : "add"); paintPanel(); }
  });
  root.querySelector(".fj-tabs").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b) { tab = b.dataset.tab; paintPanel(); } });
  root.querySelector("[data-fj-snap]").addEventListener("change", e => { snap = e.target.value; });
  const file = root.querySelector("[data-fj-file]");
  file.addEventListener("change", async () => {
    const f = file.files[0];
    file.value = "";
    if (!f) return;
    try {
      const raw = JSON.parse(await f.text());
      const next = F.normalizeDesign(raw.design || raw);
      commit(next); activeLayer = next.layers[0].id; sel = []; fit();
      toast("Proyecto abierto", "good");
    } catch { toast("Ese archivo no es un plano de la forja", "bad"); }
  });
  root.querySelector(".fj-top").addEventListener("click", async e => {
    const b = e.target.closest("[data-fj]");
    if (!b) return;
    const what = b.dataset.fj;
    if (what === "undo") return doUndo();
    if (what === "redo") return doRedo();
    if (what === "zoomIn") { view.zoom = clamp(view.zoom * 1.25, 0.3, 12); return draw(); }
    if (what === "zoomOut") { view.zoom = clamp(view.zoom / 1.25, 0.3, 12); return draw(); }
    if (what === "fit") return fit();
    if (what === "generate") return openGenerator();
    if (what === "new") {
      if (hasContent() && !(await confirmBox("¿Empezar un plano en blanco? Lo de ahora se puede recuperar con Deshacer."))) return;
      const next = F.newDesign({ cols: design.cols, rows: design.rows, preset: design.style.preset });
      activeLayer = next.layers[0].id; sel = [];
      return commit(next);
    }
    if (what === "open") return file.click();
    if (what === "save") return saveProject();
    if (what === "png") return exportPNG();
    if (what === "help") return showHelp();
    if (what === "use") return use();
    if (what === "close") return close();
  });
  const hasContent = () => design.layers.some(l => l.items.length);

  function fit() { view = { zoom: 1, x: 0, y: 0 }; draw(); }
  function close() {
    document.removeEventListener("keydown", keys, true);
    document.removeEventListener("keyup", keys, true);
    window.removeEventListener("resize", onResize);
    panelObserver.disconnect();
    root.remove();
    document.documentElement.classList.remove("forja-open");
    opts.onClose && opts.onClose(design);
  }

  function download(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function saveProject() {
    download(new Blob([JSON.stringify({ mesa: "plano", version: F.DESIGN_VERSION, design }, null, 1)], { type: "application/json" }), `${(opts.title || "plano").replace(/[^\w-]+/g, "-")}.mesaplano.json`);
    toast("Proyecto guardado en tus descargas", "good");
  }
  /* La imagen final, a la resolución que se pida */
  function renderPNG(ppc, grid = true) {
    const c = document.createElement("canvas");
    c.width = design.cols * ppc; c.height = design.rows * ppc;
    renderDesign(c.getContext("2d"), design, { ppc, grid: grid ? undefined : false });
    return c;
  }
  function exportPNG() {
    const body = el(`<div>
      ${field("Resolución", `<select id="ppc">${[[50, "50 píxeles por casilla"], [70, "70 (la de Roll20 y Foundry)"], [100, "100"], [140, "140 (para imprimir)"]].map(([v, n]) => `<option value="${v}" ${v === 70 ? "selected" : ""}>${n}</option>`).join("")}</select>`)}
      <label class="check"><input type="checkbox" id="pngGrid" checked> Con cuadrícula</label>
      <p class="fj-note">Se descarga como PNG. ${design.cols} × ${design.rows} casillas.</p></div>`);
    modal({ title: "Exportar imagen", body, actions: [{ label: "Cancelar" }, { label: "Descargar", tone: "primary", run: host => {
      let ppc = +host.querySelector("#ppc").value;
      if (Math.max(design.cols, design.rows) * ppc > 12000) ppc = Math.floor(12000 / Math.max(design.cols, design.rows));
      renderPNG(ppc, host.querySelector("#pngGrid").checked).toBlob(b => download(b, `${(opts.title || "plano").replace(/[^\w-]+/g, "-")}-${design.cols}x${design.rows}.png`), "image/png");
    } }] });
  }
  async function use() {
    if (!hasContent()) return toast("El plano está vacío: dibuja algo o genera una mazmorra", "bad");
    const s = F.solve(design);
    if (!s.floorLoops.length && !design.layers.some(l => l.items.some(i => i.type === "wall"))) return toast("Dibuja algo de suelo primero", "bad");
    const lights = design.layers.some(l => l.items.some(i => i.type === "light"));
    const body = el(`<div>
      <p class="prose small"><span>El plano pasa a ser el fondo de este mapa, con la cuadrícula ya encajada (${design.cols} × ${design.rows} casillas), y sus paredes, puertas y ventanas sustituyen a los muros que tenga.</span></p>
      ${lights ? `<label class="check"><input type="checkbox" id="useLights"> Que las luces del plano alumbren en Mesa (casillas de luz fija)</label>` : ""}
    </div>`);
    modal({ title: "Usar en este mapa", body, actions: [{ label: "Cancelar" }, { label: "Usar el plano", tone: "primary", run: host => {
      const withLights = !!(host.querySelector("#useLights") && host.querySelector("#useLights").checked);
      const ppc = Math.max(24, Math.min(70, Math.floor(4096 / Math.max(design.cols, design.rows))));
      const c = renderPNG(ppc, true);
      c.toBlob(async blob => {
        try {
          await opts.onUse(design, { blob, ppc, width: c.width, height: c.height, ...F.toMesa(design, { lights: withLights }) });
          try { localStorage.removeItem(DRAFT(opts.draftId)); } catch {}
          close();
        } catch (err) { toast(err.message || "No se pudo usar el plano", "bad"); }
      }, "image/webp", 0.92);
    } }] });
  }

  function openGenerator() {
    const g = { cols: design.cols, rows: design.rows, rooms: 8, roomMin: 3, roomMax: 8, corridor: 1, layout: "balanced", doors: 0.7, shape: "mixed", roughness: 0, props: true, seed: Math.floor(Math.random() * 1e6) };
    const body = el(`<div class="fj-gen">
      <div class="fj-grid2">
        ${field("Columnas", `<input type="number" name="cols" min="12" max="150" value="${g.cols}">`)}${field("Filas", `<input type="number" name="rows" min="12" max="150" value="${g.rows}">`)}
        ${field("Salas", `<input type="number" name="rooms" min="1" max="60" value="${g.rooms}">`)}${field("Ancho del pasillo", `<select name="corridor"><option value="1">1 casilla</option><option value="2">2 casillas</option><option value="3">3 casillas</option></select>`)}
        ${field("Sala más pequeña", `<input type="number" name="roomMin" min="2" max="20" value="${g.roomMin}">`)}${field("Sala más grande", `<input type="number" name="roomMax" min="3" max="30" value="${g.roomMax}">`)}
        ${field("Recorrido", `<select name="layout"><option value="straight">Recto (árbol)</option><option value="balanced" selected>Equilibrado</option><option value="forking">Con bucles</option><option value="winding">Serpenteante</option></select>`)}
        ${field("Forma de las salas", `<select name="shape"><option value="mixed">Variadas</option><option value="square">Cuadradas</option><option value="rounded">Redondeadas</option><option value="irregular">Irregulares (cueva)</option></select>`)}
      </div>
      ${field("Puertas", `<input type="range" name="doors" min="0" max="1" step="0.05" value="${g.doors}">`)}
      ${field("Paredes irregulares", `<input type="range" name="roughness" min="0" max="1" step="0.05" value="0">`)}
      <label class="check"><input type="checkbox" name="props" checked> Con escaleras y algunos objetos</label>
      <div class="fj-row">${field("Semilla", `<input type="number" name="seed" value="${g.seed}">`)}<button type="button" class="btn sm" data-reseed>${icon("dice", 15)} Otra</button></div>
      <canvas class="fj-gen-prev" width="420" height="300"></canvas>
    </div>`);
    const read = () => {
      const v = n => body.querySelector(`[name="${n}"]`);
      return { cols: clamp(+v("cols").value || 28, 12, 150), rows: clamp(+v("rows").value || 18, 12, 150), rooms: clamp(+v("rooms").value || 8, 1, 60),
        roomMin: clamp(+v("roomMin").value || 3, 2, 20), roomMax: clamp(+v("roomMax").value || 8, 3, 30), corridor: +v("corridor").value,
        layout: v("layout").value, shape: v("shape").value, doors: +v("doors").value, roughness: +v("roughness").value, props: v("props").checked,
        seed: Math.trunc(+v("seed").value || 1), preset: design.style.preset };
    };
    const prev = body.querySelector("canvas");
    let last = null;
    const show = () => {
      const o = read();
      if (o.roomMax < o.roomMin) o.roomMax = o.roomMin;
      last = F.generate(o);
      last.style = { ...design.style };
      const ppc = Math.min(prev.width / last.cols, prev.height / last.rows);
      const x = prev.getContext("2d"); x.fillStyle = "#0d0f14"; x.fillRect(0, 0, prev.width, prev.height);
      x.save(); x.translate((prev.width - last.cols * ppc) / 2, (prev.height - last.rows * ppc) / 2);
      renderDesign(x, last, { ppc });
      x.restore();
    };
    body.addEventListener("change", show);
    body.querySelector("[data-reseed]").addEventListener("click", () => { body.querySelector('[name="seed"]').value = Math.floor(Math.random() * 1e6); show(); });
    setTimeout(show, 30);
    modal({ title: "Generar una mazmorra", body, wide: true, actions: [{ label: "Cancelar" }, { label: "Usar esta", tone: "primary", run: async () => {
      if (!last) return false;
      const okk = !hasContent() || await confirmBox("La mazmorra nueva sustituye al plano de ahora. Se puede volver atrás con Deshacer.", { okLabel: "Sustituir" });
      if (!okk) return;
      activeLayer = last.layers[0].id; sel = [];
      commit(last); fit();
    } }] });
  }

  function showHelp() {
    const K = k => k.split("+").map(x => `<kbd>${x}</kbd>`).join("+");
    const rows = [["V", "Elegir y mover"], ["H", "Mover la vista (o mantener Espacio)"], ["R", "Sala"], ["E", "Círculo u óvalo"], ["P", "Polígono"],
      ["B", "Pincel de casillas"], ["C", "Cueva"], ["A", "Agua"], ["L", "Muro suelto"], ["D", "Puerta"], ["K", "Camino"], ["O", "Objeto"],
      ["T", "Texto"], ["I", "Luz"], ["X", "Sumar o recortar suelo"], ["Ctrl+Z", "Deshacer"], ["Ctrl+Y", "Rehacer"], ["Ctrl+C", "Copiar"], ["Ctrl+V", "Pegar"],
      ["Ctrl+D", "Duplicar"], ["Supr", "Borrar lo elegido"], ["Ctrl+S", "Guardar el proyecto"], ["Flechas", "Mover lo elegido"],
      ["Q", "Girar a la izquierda (con Mayús, de 15 en 15)"], ["W", "Girar a la derecha (con Mayús, de 15 en 15)"],
      ["Mayús", "Al dibujar: cuadrado o círculo perfecto"], ["Alt", "Sin ajustar a la cuadrícula"], ["Rueda", "Acercar y alejar"]];
    modal({ title: "Atajos de la forja", body: `<dl class="fj-help">${rows.map(([k, t]) => `<dt>${K(k)}</dt><dd>${t}</dd>`).join("")}</dl>`, actions: [{ label: "Entendido", tone: "primary" }] });
  }

  setTool(design.layers.some(l => l.items.length) ? "select" : "rect");
  setMode("add");
  requestAnimationFrame(() => { fit(); });
  /* Para las pruebas */
  root.__forja = { get design() { return design; }, setTool, commit, undo: doUndo, redo: doRedo, get sel() { return sel; } };
  return root;
}

function draft(id) {
  try { const raw = localStorage.getItem(DRAFT(id)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
