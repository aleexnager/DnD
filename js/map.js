/* El tablero. Un solo lienzo pinta el plano, la cuadrícula, los muros, la luz,
   la niebla, las plantillas y las fichas; asi el mapa va suave aunque se
   arrastre a 60 fotogramas.

   Se usa igual en las tres vistas: el DM lo ve entero y puede editarlo, la
   party solo recibe lo que su personaje alcanza a ver. */

import { cellKey, edgeKey, clamp, footprint, conditionName } from "./schema.js";
import { visibleCells, reachableCells, shapeCells, gridDistance, occupied, fits, nextRoomId } from "./los.js";
import { initials, imgURL, pct, hpTone, reducedMotion } from "./util.js";
import { drawGlyph } from "./icons.js";

const COLORS = {
  void: "#07080c",
  grid: "rgba(236,228,212,.10)",
  wall: "#e2d3ae",
  door: "#c88a3a",
  doorOpen: "rgba(200,138,58,.45)",
  fog: "#05060a",
  known: "rgba(5,6,10,.24)",     // lo ya explorado: se distingue, pero muy poco
  dark: "rgba(4,5,9,.55)",
  sight: "rgba(200,155,74,.10)",
  lit: "rgba(255,214,140,.10)",
  pick: "rgba(200,155,74,.55)",
  reach: "rgba(120,170,255,.16)",
  reachEdge: "rgba(140,185,255,.5)",
  measure: "#7fd0ff",
  select: "#c89b4a",
  target: "#b8383b"
};

const images = new Map();
function image(id) {
  if (!id) return null;
  if (images.has(id)) return images.get(id);
  const img = new Image();
  img.src = imgURL(id);
  images.set(id, img);
  img.onload = () => document.dispatchEvent(new CustomEvent("mesa:image"));
  return img;
}

/* Distancia de un punto a un segmento */
function segDist(px, py, a, b) {
  const vx = b[0] - a[0], vy = b[1] - a[1];
  const len = vx * vx + vy * vy;
  const t = len ? Math.max(0, Math.min(1, ((px - a[0]) * vx + (py - a[1]) * vy) / len)) : 0;
  return Math.hypot(px - (a[0] + vx * t), py - (a[1] + vy * t));
}

/* Ramer-Douglas-Peucker: un trazo de 300 puntos se queda en 30 sin cambiar
   de forma, que es lo que viaja por la red y se guarda */
function simplify(points, eps) {
  if (points.length < 3) return points;
  let idx = 0, max = 0;
  const a = points[0], b = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = segDist(points[i][0], points[i][1], a, b);
    if (d > max) { max = d; idx = i; }
  }
  if (max <= eps) return [a, b];
  return [...simplify(points.slice(0, idx + 1), eps).slice(0, -1), ...simplify(points.slice(idx), eps)];
}

export class MapView {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.mode = opts.mode || "party";        // "dm" | "party"
    this.opts = opts;
    this.zoom = 1;
    this.center = null;
    this.tool = "token";
    this.pending = null;                      // plantilla a punto de colocarse
    this.localShapes = [];                    // áreas que solo ve quien las coloca
    this.hover = null;
    this.drag = null;
    this.band = null;                         // selección con recuadro
    this.measure = null;
    this.selection = new Set();
    this.target = null;                       // ficha apuntada
    this.data = { map: null, chars: [], session: null, you: null };
    this._geom = null;
    this._anim = null;
    this._glide = new Map();                  // id -> trayecto de la ficha que se desliza
    this._held = new Map();                   // id -> dónde se soltó, hasta que el servidor confirme
    this._marks = new Map();                  // id -> destello de golpe o de cura
    this._hp = new Map();                     // id -> última vida vista, para saber si ha bajado
    this._frame = 0;
    this._pulse = null;                       // aro que se abre al empezar un turno
    this._lastNow = undefined;
    this._seenMemo = { map: null, chars: null, reveal: null, seen: null };
    this._cam = null;                         // cámara que sigue a alguien, suavizada

    const redraw = () => this.draw();
    this._ro = new ResizeObserver(redraw);
    this._ro.observe(canvas.parentElement || canvas);
    document.addEventListener("mesa:image", redraw);
    /* Una pestaña en segundo plano no recibe fotogramas: al volver, se pinta
       el estado final en vez de seguir una animación congelada. */
    document.addEventListener("visibilitychange", redraw);
    this._base = null;                        // plano y cuadrícula ya pintados
    this.bind();
  }

  destroy() { this._ro.disconnect(); cancelAnimationFrame(this._anim); }

  set(data) {
    this.data = { ...this.data, ...data };
    this.noticeChanges();
    this.draw();
  }

  /* Lo que acaba de cambiar y merece un gesto en el tablero: un golpe, una
     cura, un turno nuevo. Nada se anima en bucle. */
  /* Sin animaciones: si el sistema pide menos movimiento o si la pestaña no
     se está viendo (el navegador no da fotogramas y la ficha se quedaría a
     medio camino). */
  still() { return reducedMotion() || (typeof document !== "undefined" && document.hidden); }

  noticeChanges() {
    const { chars, session } = this.data;
    const t = performance.now();
    for (const c of chars || []) {
      const hp = c.hpPct !== undefined ? c.hpPct : c.hp;
      const before = this._hp.get(c.id);
      this._hp.set(c.id, hp);
      if (before !== undefined && hp !== before) this._marks.set(c.id, { kind: hp < before ? "hurt" : "heal", t0: t });
    }
    const combat = session && session.combat;
    const nowId = combat && combat.on && combat.order.length ? combat.order[combat.index] : null;
    if (this._lastNow !== undefined && nowId && nowId !== this._lastNow) this._pulse = { id: nowId, t0: t };
    this._lastNow = nowId;
  }

  /* Las fichas se deslizan de casilla a casilla en vez de saltar. Si una
     aparece de la nada, viene de muy lejos o no estaba dibujada en el
     fotograma anterior, se coloca sin más: así una criatura que sale de la
     niebla no enseña por dónde ha venido. */
  glide(c, x, y, t) {
    const DUR = 280;
    let s = this._glide.get(c.id);
    const fresh = !s || s.mapId !== c.mapId || s.frame !== this._frame - 1;
    if (fresh || this.still()) {
      s = { fx: x, fy: y, tx: x, ty: y, t0: t, mapId: c.mapId, frame: this._frame };
      this._glide.set(c.id, s);
      return { x, y };
    }
    if (s.tx !== x || s.ty !== y) {
      const cur = this.glideAt(s, t, DUR);
      const far = Math.hypot(x - cur.x, y - cur.y) > 8;
      Object.assign(s, far ? { fx: x, fy: y } : { fx: cur.x, fy: cur.y }, { tx: x, ty: y, t0: t });
    }
    s.frame = this._frame;
    const pos = this.glideAt(s, t, DUR);
    if (t - s.t0 < DUR) this._moving = true;
    return pos;
  }

  glideAt(s, t, dur) {
    const k = Math.min(1, (t - s.t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    return { x: s.fx + (s.tx - s.fx) * e, y: s.fy + (s.ty - s.fy) * e };
  }

  /* Visión del DM: es cara (rayos contra muros) y antes se recalculaba a cada
     movimiento del ratón. Solo cambia cuando cambian las fichas o el mapa. */
  dmSight(map, chars, reveal) {
    const m = this._seenMemo;
    if (m.map !== map || m.chars !== chars || m.reveal !== reveal) {
      this._seenMemo = { map, chars, reveal, seen: reveal ? null : visibleCells({ chars }, map) };
    }
    return this._seenMemo.seen;
  }

  /* ---------- Geometría ---------- */
  geometry() {
    const { map } = this.data;
    const box = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (this.canvas.width !== Math.round(box.width * dpr) || this.canvas.height !== Math.round(box.height * dpr)) {
      this.canvas.width = Math.round(box.width * dpr);
      this.canvas.height = Math.round(box.height * dpr);
    }
    if (!map) return null;

    const W = box.width, H = box.height;
    const free = this.mode === "dm" || map.playerZoom !== false;
    const aspect = W / H;
    let cropW, focus, fill = false;
    if (this.mode === "dm") {
      cropW = map.cols / this.zoom;
      focus = this.center || { x: map.cols / 2, y: map.rows / 2 };
      fill = this.zoom > 1;
    } else if (this.zoom > 1 && free) {
      cropW = map.cols / this.zoom;
      focus = this.center || { x: map.cols / 2, y: map.rows / 2 };
      fill = true;
    } else if (map.camera === "follow") {
      cropW = Math.min(map.cols, map.followSpan) / (map.partyZoom || 1);
      const f = this.data.chars.find(c => c.id === (this.data.session && this.data.session.focusId));
      focus = this.smoothCam(f && f.mx !== null ? { x: f.mx + 0.5, y: f.my + 0.5 } : { x: map.cols / 2, y: map.rows / 2 });
      fill = true;
    } else {
      cropW = map.cols / (map.partyZoom || 1);
      focus = { x: map.cols / 2, y: map.rows / 2 };
    }

    /* Con la cámara siguiendo a alguien o con zoom, el recorte toma la forma
       del hueco disponible y se aprovecha entero: si el personaje llega al
       borde del plano, lo que se mueve es él dentro del encuadre, en vez de
       quedarse el mapa a un lado con una franja negra al otro. */
    let cropH;
    if (fill) {
      cropH = cropW / aspect;
      if (cropH > map.rows) { cropH = map.rows; cropW = cropH * aspect; }
      if (cropW > map.cols) { cropW = map.cols; cropH = cropW / aspect; }
    } else {
      cropH = cropW * (map.rows / map.cols);
    }

    const cx = clamp(focus.x, cropW / 2, Math.max(cropW / 2, map.cols - cropW / 2));
    const cy = clamp(focus.y, cropH / 2, Math.max(cropH / 2, map.rows - cropH / 2));
    const cell = Math.min(W / cropW, H / cropH);
    return { W, H, dpr, cell, originX: W / 2 - cx * cell, originY: H / 2 - cy * cell, cols: map.cols, rows: map.rows };
  }

  /* La cámara que sigue a un personaje lo acompaña en vez de dar saltos */
  smoothCam(to) {
    const t = performance.now(), DUR = 420;
    const c = this._cam;
    if (!c || this.still() || Math.hypot(to.x - c.tx, to.y - c.ty) > 30) {
      this._cam = { fx: to.x, fy: to.y, tx: to.x, ty: to.y, t0: t };
      return to;
    }
    if (c.tx !== to.x || c.ty !== to.y) {
      const cur = this.glideAt(c, t, DUR);
      Object.assign(c, { fx: cur.x, fy: cur.y, tx: to.x, ty: to.y, t0: t });
    }
    if (t - c.t0 < DUR) this._moving = true;
    return this.glideAt(c, t, DUR);
  }

  toCell(clientX, clientY) {
    const g = this._geom;
    if (!g) return null;
    const box = this.canvas.getBoundingClientRect();
    const fx = (clientX - box.left - g.originX) / g.cell;
    const fy = (clientY - box.top - g.originY) / g.cell;
    return { fx, fy, x: Math.floor(fx), y: Math.floor(fy) };
  }

  edgeAt(fx, fy, withDiagonals = false) {
    const x = Math.floor(fx), y = Math.floor(fy);
    const dx = fx - x, dy = fy - y;
    const options = [
      { d: dx, key: edgeKey(x, y, "v") },
      { d: 1 - dx, key: edgeKey(x + 1, y, "v") },
      { d: dy, key: edgeKey(x, y, "h") },
      { d: 1 - dy, key: edgeKey(x, y + 1, "h") }
    ];
    /* La puerta y la goma también cogen las diagonales que haya en la casilla */
    if (withDiagonals) {
      const edges = (this.data.map && this.data.map.edges) || {};
      if (edges[edgeKey(x, y, "d")]) options.push({ d: Math.abs(dx - dy) / Math.SQRT2, key: edgeKey(x, y, "d") });
      if (edges[edgeKey(x, y, "a")]) options.push({ d: Math.abs(dx + dy - 1) / Math.SQRT2, key: edgeKey(x, y, "a") });
    }
    return options.sort((a, b) => a.d - b.d)[0].key;
  }

  /* Muro en diagonal: la que pase más cerca del puntero (\ o /) */
  diagonalAt(fx, fy) {
    const x = Math.floor(fx), y = Math.floor(fy);
    const dx = fx - x, dy = fy - y;
    return Math.abs(dx - dy) <= Math.abs(dx + dy - 1) ? "d" : "a";
  }

  /* Una ficha grande responde en todas las casillas que ocupa. */
  tokenAt(x, y) {
    const map = this.data.map;
    return this.data.chars.find(c => {
      if (c.mapId !== map.id || c.mx === null) return false;
      const n = footprint(c);
      return x >= c.mx && x < c.mx + n && y >= c.my && y < c.my + n;
    });
  }

  canDrag(c) { return this.mode === "dm" || c.id === this.data.you; }

  /* ---------- Interacción ---------- */
  bind() {
    const cv = this.canvas;
    cv.style.touchAction = "none";
    this.touches = new Map();

    cv.addEventListener("pointerdown", e => {
      if (!this.data.map) return;
      const p = this.toCell(e.clientX, e.clientY);
      if (!p) return;
      const map = this.data.map;
      const inside = p.x >= 0 && p.y >= 0 && p.x < map.cols && p.y < map.rows;

      if (e.pointerType === "touch") {
        this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.touches.size === 2) { this.startPinch(); this.drag = null; this.band = null; return; }
      }

      /* Señalar un punto: lo ve toda la mesa */
      if (inside && e.altKey && this.opts.onPing) { this.opts.onPing(p.x, p.y); return; }

      if (e.button === 2 || e.button === 1 || (e.shiftKey && this.tool === "pan")) {
        this.startPan(e);
        return;
      }
      if (!inside) return;

      /* Plantilla pendiente de colocar */
      if (this.pending) {
        this.pending = { ...this.pending, x: this.snap(p.fx), y: this.snap(p.fy) };
        this.placing = true;
        cv.setPointerCapture(e.pointerId);
        return this.draw();
      }

      if (this.tool === "measure") {
        this.measure = { from: { x: p.x, y: p.y }, to: { x: p.x, y: p.y } };
        cv.setPointerCapture(e.pointerId);
        return this.draw();
      }

      if (this.mode === "dm" && (this.tool === "cell" || this.tool === "layer")) {
        this.painting = this.tool;
        this.lastPaint = null;
        /* Sala: se sigue pintando la sala en curso (la empieza el botón
           «Sala»); si el trazo empieza dentro de otra, se pasa a esa */
        if (this.tool === "layer" && this.layer === "rooms" && this.layerValue) {
          const here = Number((map.rooms || {})[cellKey(p.x, p.y)]);
          if (here) this.roomId = here;
          else if (!this.roomId) this.roomId = nextRoomId(map);
          this.opts.onRoom && this.opts.onRoom(this.roomId);
        }
        this.paintAt(p);
        cv.setPointerCapture(e.pointerId);
        return;
      }
      if (this.mode === "dm" && this.tool === "diag") {
        /* La dirección se elige en la primera casilla y se mantiene durante
           el trazo: así una pared larga sale recta */
        this.painting = "diag";
        this.diag = { sx: p.x, sy: p.y, dir: null, done: new Set(), fx: p.fx, fy: p.fy };
        cv.setPointerCapture(e.pointerId);
        return;
      }
      if (this.mode === "dm" && (this.tool === "wall" || this.tool === "door" || this.tool === "erase")) {
        this.painting = this.tool;
        /* La puerta y la goma también valen para los muros diagonales */
        this.opts.onEdge && this.opts.onEdge(this.edgeAt(p.fx, p.fy, this.tool !== "wall"), this.tool);
        cv.setPointerCapture(e.pointerId);
        return;
      }
      /* Dibujo a mano alzada: lo pueden usar el DM y los jugadores */
      if (this.tool === "draw") {
        this.stroke = { points: [[p.fx, p.fy]] };
        cv.setPointerCapture(e.pointerId);
        return this.draw();
      }
      if (this.tool === "drawErase") {
        const hit = this.drawingAt(p.fx, p.fy);
        if (hit && this.opts.onDrawingErase) this.opts.onDrawingErase(hit.id);
        return;
      }
      if (this.mode === "dm" && this.tool === "pin") return this.opts.onPin && this.opts.onPin(p.x, p.y);
      if (this.mode === "dm" && this.tool === "portal") return this.opts.onPortal && this.opts.onPortal(p.x, p.y);

      const token = this.tokenAt(p.x, p.y);
      if (token && this.canDrag(token)) {
        if (e.shiftKey && this.mode === "dm") {
          this.selection.has(token.id) ? this.selection.delete(token.id) : this.selection.add(token.id);
          return this.draw();
        }
        const group = this.selection.has(token.id)
          ? [...this.selection].map(id => this.data.chars.find(c => c.id === id)).filter(c => c && this.canDrag(c))
          : [token];
        this.drag = {
          id: token.id, from: { x: token.mx, y: token.my }, at: { x: p.x, y: p.y }, moved: false, ok: true,
          group: group.map(c => ({ id: c.id, dx: c.mx - token.mx, dy: c.my - token.my })),
          range: this.rangeFor(token)
        };
        cv.setPointerCapture(e.pointerId);
        return this.draw();
      }

      if (token && !this.canDrag(token)) {
        this.opts.onToken && this.opts.onToken(token.id, e);
        return;
      }

      /* Sitio vacío. Con ratón, el DM traza un recuadro para elegir fichas.
         En todo lo demás se espera a ver qué hace el dedo: si se queda quieto
         es un toque (mover, colocar, señalar) y si se mueve, arrastra el mapa.
         Sin esto, en el móvil no había forma de recorrer un plano con zoom. */
      const touch = e.pointerType === "touch";
      if (this.mode === "dm" && !touch) {
        if (!e.shiftKey) this.selection.clear();
        this.band = { from: { x: p.fx, y: p.fy }, to: { x: p.fx, y: p.fy } };
        cv.setPointerCapture(e.pointerId);
        return this.draw();
      }
      this.tap = {
        x: e.clientX, y: e.clientY, cell: { x: p.x, y: p.y }, moved: false,
        from: { ...(this.center || { x: map.cols / 2, y: map.rows / 2 }) }
      };
      cv.setPointerCapture(e.pointerId);
    });

    cv.addEventListener("pointermove", e => {
      if (e.pointerType === "touch" && this.touches.has(e.pointerId)) {
        this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.touches.size === 2) return this.movePinch();
      }
      const p = this.toCell(e.clientX, e.clientY);
      if (!p) return;
      if (this.pan) {
        const g = this._geom;
        this.center = {
          x: this.pan.from.x - (e.clientX - this.pan.x) / g.cell,
          y: this.pan.from.y - (e.clientY - this.pan.y) / g.cell
        };
        return this.draw();
      }
      if (this.placing) {
        const dx = p.fx - this.pending.x, dy = p.fy - this.pending.y;
        if (Math.hypot(dx, dy) > 0.3 && this.pending.kind !== "circle" && this.pending.kind !== "square") {
          this.pending.angle = Math.atan2(dy, dx);
        }
        return this.draw();
      }
      if (this.measure) {
        if (this.measure.done) return;   // ya se soltó: la medida se queda quieta
        this.measure.to = { x: p.x, y: p.y };
        return this.draw();
      }
      if (this.painting === "diag") { this.diagonalTo(p); return; }
      if (this.painting === "cell" || this.painting === "layer") {
        this.paintAt(p);
        return;
      }
      if (this.painting) {
        if (this.painting !== "door") this.opts.onEdge && this.opts.onEdge(this.edgeAt(p.fx, p.fy, this.painting === "erase"), this.painting);
        return;
      }
      if (this.stroke) {
        const last = this.stroke.points[this.stroke.points.length - 1];
        if (Math.hypot(p.fx - last[0], p.fy - last[1]) > 0.06) {
          this.stroke.points.push([p.fx, p.fy]);
          this.draw();
        }
        return;
      }
      if (this.tap) {
        const dx = e.clientX - this.tap.x, dy = e.clientY - this.tap.y;
        if (!this.tap.moved && Math.hypot(dx, dy) < 9) return;   // margen para que un toque siga siendo un toque
        this.tap.moved = true;
        const g = this._geom;
        this.center = { x: this.tap.from.x - dx / g.cell, y: this.tap.from.y - dy / g.cell };
        return this.draw();
      }
      if (this.band) { this.band.to = { x: p.fx, y: p.fy }; return this.draw(); }
      if (this.drag) {
        if (this.drag.at.x !== p.x || this.drag.at.y !== p.y) {
          this.drag.at = { x: p.x, y: p.y };
          this.drag.moved = true;
          const who = this.data.chars.find(c => c.id === this.drag.id);
          this.drag.ok = !(who && this.drag.group.length === 1
            && fits(this.data.map, this.data.chars, who, p.x, p.y));
          this.draw();
        }
        return;
      }
      /* La plantilla va pegada al cursor hasta que se suelta con un clic */
      if (this.pending) {
        this.pending.x = this.snap(p.fx);
        this.pending.y = this.snap(p.fy);
        return this.draw();
      }
      const key = p.x + "," + p.y;
      if (this.hover !== key) { this.hover = key; this.draw(); }
    });

    const release = e => {
      this.touches.delete(e.pointerId);
      if (this.touches.size < 2) this.pinch = null;
      if (this.pan) { this.pan = null; return; }
      if (this.placing) {
        this.placing = false;
        const shape = { ...this.pending };
        this.pending = null;
        /* Las áreas «privadas» se quedan en este navegador y no se mandan a
           nadie: sirven para mirar a ojo si el conjuro coge a los tres
           goblins antes de gastar el espacio. */
        if (shape.local) {
          this.localShapes = [...this.localShapes.slice(-5), shape];
          this.opts.onLocalShape && this.opts.onLocalShape(shape);
        } else this.opts.onShape && this.opts.onShape(shape);
        return this.draw();
      }
      if (this.measure) {
        this.measure.done = true;
        if (this.opts.onMeasureEnd) this.opts.onMeasureEnd(this.measure);
        setTimeout(() => { if (this.measure && this.measure.done) { this.measure = null; this.draw(); } }, 1600);
        return;
      }
      if (this.painting === "diag" && this.diag && !this.diag.dir) {
        /* un clic sin arrastrar: la diagonal que pase más cerca del puntero */
        const d = this.diag;
        this.opts.onEdge && this.opts.onEdge(edgeKey(d.sx, d.sy, this.diagonalAt(d.fx, d.fy)), "wall");
      }
      if (this.painting) { this.painting = null; this.lastPaint = null; this.diag = null; return; }
      if (this.stroke) {
        const pts = simplify(this.stroke.points, 0.04);
        this.stroke = null;
        if (pts.length > 1 && this.opts.onDrawing) this.opts.onDrawing(pts);
        else if (pts.length === 1 && this.opts.onDrawing) this.opts.onDrawing([pts[0], [pts[0][0] + 0.01, pts[0][1] + 0.01]]);
        return this.draw();
      }
      if (this.tap) {
        const t = this.tap;
        this.tap = null;
        if (!t.moved) {
          if (this.pinging && this.opts.onPing) this.opts.onPing(t.cell.x, t.cell.y);
          else if (this.mode === "dm") this.opts.onCell && this.opts.onCell(t.cell.x, t.cell.y, e);
          else if (this.data.you && this.opts.onMove) {
            const me = this.data.chars.find(c => c.id === this.data.you);
            if (me && me.mx !== null) this.opts.onMove(this.data.you, t.cell.x, t.cell.y);
          }
        }
        return this.draw();
      }
      if (this.band) {
        const b = this.band;
        this.band = null;
        const x0 = Math.min(b.from.x, b.to.x), x1 = Math.max(b.from.x, b.to.x);
        const y0 = Math.min(b.from.y, b.to.y), y1 = Math.max(b.from.y, b.to.y);
        if (Math.abs(x1 - x0) < 0.4 && Math.abs(y1 - y0) < 0.4) {
          const p = this.toCell(e.clientX, e.clientY);
          this.opts.onCell && this.opts.onCell(p.x, p.y, e);
        } else {
          for (const c of this.data.chars) {
            if (c.mapId !== this.data.map.id || c.mx === null) continue;
            if (c.mx + 0.5 >= x0 && c.mx + 0.5 <= x1 && c.my + 0.5 >= y0 && c.my + 0.5 <= y1) this.selection.add(c.id);
          }
          this.opts.onSelect && this.opts.onSelect([...this.selection]);
        }
        return this.draw();
      }
      if (this.drag) {
        const { id, at, moved, group, from } = this.drag;
        this.drag = null;
        if (moved && this.opts.onMove) {
          const dx = at.x - from.x, dy = at.y - from.y;
          const until = performance.now() + 1500;
          for (const gi of group) this._held.set(gi.id, { x: from.x + gi.dx + dx, y: from.y + gi.dy + dy, until });
          setTimeout(() => this.draw(), 1550);
          if (group.length > 1) this.opts.onMoveMany(group.map(g => ({ id: g.id, x: from.x + g.dx + dx, y: from.y + g.dy + dy })));
          else this.opts.onMove(id, at.x, at.y);
        } else if (!moved && this.opts.onToken) this.opts.onToken(id, e);
        this.draw();
      }
    };
    cv.addEventListener("pointerup", release);
    cv.addEventListener("pointercancel", e => {
      this.touches.delete(e.pointerId);
      this.pan = this.painting = this.drag = this.band = this.measure = this.tap = this.stroke = null;
      this.placing = false;
      this.draw();
    });
    cv.addEventListener("contextmenu", e => e.preventDefault());
    cv.addEventListener("pointerleave", () => { this.hover = null; this.draw(); });

    cv.addEventListener("wheel", e => {
      if (this.mode !== "dm" && !(this.data.map && this.data.map.playerZoom !== false)) return;
      if (!e.ctrlKey && !e.metaKey && this.mode !== "dm") return;
      e.preventDefault();
      this.setZoom(this.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), this.toCell(e.clientX, e.clientY));
    }, { passive: false });
  }

  snap(v) { return Math.round(v * 2) / 2; }

  /* Pinta la casilla bajo el puntero una sola vez por pasada */
  paintAt(p) {
    const map = this.data.map;
    if (!map || p.x < 0 || p.y < 0 || p.x >= map.cols || p.y >= map.rows) return;
    const key = p.x + "," + p.y;
    if (this.lastPaint === key) return;
    this.lastPaint = key;
    if (this.painting === "cell") this.opts.onPaintCell && this.opts.onPaintCell(p.x, p.y, this.brush);
    else if (this.painting === "layer") this.opts.onPaintLayer && this.opts.onPaintLayer(p.x, p.y, this.layer, this.layer === "rooms" && this.layerValue ? this.roomId : this.layerValue);
    else if (this.painting === "diag") this.opts.onEdge && this.opts.onEdge(edgeKey(p.x, p.y, this.diagDir), "wall");
  }

  /* Muro diagonal arrastrando: la dirección la marca el propio arrastre (hacia
     arriba a la derecha es «/», hacia abajo a la derecha «\») y el trazo se
     ajusta a una línea de 45° desde la primera casilla, rellenando las de en
     medio aunque el ratón vaya deprisa. */
  diagonalTo(p) {
    const d = this.diag;
    if (!d) return;
    const dx = p.x - d.sx, dy = p.y - d.sy;
    if (!d.dir) {
      if (!dx || !dy) return;                 // todavía no se sabe hacia dónde
      d.dir = dx * dy < 0 ? "a" : "d";
      d.sgn = Math.sign(dx);
    }
    const k = Math.max(0, Math.round((Math.abs(dx) + Math.abs(dy)) / 2) * Math.sign(dx * d.sgn || 1));
    const map = this.data.map;
    for (let i = 0; i <= Math.abs(k); i++) {
      const step = i * d.sgn * Math.sign(k || 1);
      const x = d.sx + step, y = d.dir === "d" ? d.sy + step : d.sy - step;
      if (!map || x < 0 || y < 0 || x >= map.cols || y >= map.rows) continue;
      const key = edgeKey(x, y, d.dir);
      if (d.done.has(key)) continue;
      d.done.add(key);
      this.opts.onEdge && this.opts.onEdge(key, "wall");
    }
  }

  /* El trazo más cercano al puntero, si está a menos de un tercio de casilla */
  drawingAt(fx, fy) {
    let best = null, bestD = 0.35;
    for (const d of (this.data.map && this.data.map.drawings) || []) {
      for (let i = 1; i < d.points.length; i++) {
        const dist = segDist(fx, fy, d.points[i - 1], d.points[i]);
        if (dist < bestD) { bestD = dist; best = d; }
      }
    }
    return best;
  }

  startPan(e) {
    const map = this.data.map;
    this.pan = { x: e.clientX, y: e.clientY, from: { ...(this.center || { x: map.cols / 2, y: map.rows / 2 }) } };
    this.canvas.setPointerCapture(e.pointerId);
  }

  startPinch() {
    const [a, b] = [...this.touches.values()];
    const map = this.data.map;
    this.tap = null;
    this.pinch = {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      zoom: this.zoom,
      center: { ...(this.center || { x: map.cols / 2, y: map.rows / 2 }) }
    };
  }

  /* Dos dedos: separar y juntar acerca y aleja, y moverlos a la vez desplaza. */
  movePinch() {
    if (!this.pinch) return;
    const [a, b] = [...this.touches.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const g = this._geom;
    this.center = {
      x: this.pinch.center.x - (mid.x - this.pinch.mid.x) / (g ? g.cell : 40),
      y: this.pinch.center.y - (mid.y - this.pinch.mid.y) / (g ? g.cell : 40)
    };
    this.setZoom(this.pinch.zoom * (d / this.pinch.dist));
  }

  setZoom(value, anchor) {
    const free = this.mode === "dm" || (this.data.map && this.data.map.playerZoom !== false);
    if (!free) return;
    const z = clamp(value, 1, 10);
    const map = this.data.map;
    if (anchor && z > 1) this.center = { x: anchor.fx, y: anchor.fy };
    /* Al acercarse sin señalar un punto, la vista se queda donde estaba: así
       hay un centro concreto sobre el que arrastrar después. */
    else if (z > 1 && !this.center && map) this.center = { x: map.cols / 2, y: map.rows / 2 };
    this.zoom = z;
    if (z <= 1) { this.zoom = 1; this.center = null; }
    else if (this.center && map) {
      const w = map.cols / this.zoom, h = w * (map.rows / map.cols);
      this.center = { x: clamp(this.center.x, w / 2, map.cols - w / 2), y: clamp(this.center.y, h / 2, map.rows - h / 2) };
    }
    this.draw();
    this.opts.onZoom && this.opts.onZoom(this.zoom);
  }

  /* Hasta dónde llega una ficha con lo que le queda de velocidad */
  rangeFor(c) {
    const map = this.data.map;
    const session = this.data.session;
    if (!map || !session || session.showMoveRange === false) return null;
    const speed = Math.max(0, (c.speed || 30) - (c.used && c.used.move || 0));
    if (!speed) return null;
    const busy = new Set();
    for (const other of this.data.chars) {
      if (other.id === c.id || other.mapId !== map.id || other.mx === null) continue;
      for (const [x, y] of occupied(other)) busy.add(cellKey(x, y));
    }
    return reachableCells(map, { x: c.mx, y: c.my }, speed, { blocked: (x, y) => busy.has(cellKey(x, y)) });
  }

  /* ---------- Dibujado ---------- */
  draw() {
    this._frame++;
    this._moving = false;
    const g = this._geom = this.geometry();
    const ctx = this.ctx;
    const { map, chars, session } = this.data;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!g || !map) return;
    const X = c => g.originX + c * g.cell;
    const Y = c => g.originY + c * g.cell;
    const dm = this.mode === "dm";

    /* Plano y cuadrícula: lo más caro de pintar (una imagen grande escalada)
       y lo que menos cambia. Se pinta una vez en un lienzo aparte y se copia
       mientras no cambien el encuadre ni el plano: al arrastrar fichas o al
       pasar el ratón ya no se reescala el mapa entero a cada fotograma. */
    if (!this.canvas.width || !this.canvas.height) return;   // pestaña oculta: no hay nada que pintar
    ctx.drawImage(this.baseLayer(g, map), 0, 0);
    ctx.scale(g.dpr, g.dpr);

    /* Qué se ve */
    let seen = null;
    const known = new Set(map.explored || []);
    if (dm) {
      seen = this.dmSight(map, chars, !!(session && session.revealAll));
    } else {
      seen = map.visible ? new Set(map.visible) : null;
    }

    if (seen) {
      if (dm) {
        ctx.fillStyle = COLORS.sight;
        seen.forEach(k => {
          const [x, y] = k.split(",").map(Number);
          ctx.fillRect(X(x), Y(y), g.cell + 0.5, g.cell + 0.5);
        });
      } else {
        /* Dos trazados y dos rellenos, en vez de un relleno por casilla */
        const fog = new Path2D(), memo = new Path2D();
        for (let y = 0; y < map.rows; y++) {
          for (let x = 0; x < map.cols; x++) {
            const k = cellKey(x, y);
            if (seen.has(k)) continue;
            (known.has(k) ? memo : fog).rect(X(x) - 0.5, Y(y) - 0.5, g.cell + 1, g.cell + 1);
          }
        }
        ctx.fillStyle = COLORS.known; ctx.fill(memo);
        ctx.fillStyle = COLORS.fog; ctx.fill(fog);
      }
    }

    /* Terreno pintado: niebla, oscuridad y luces fijas */
    for (const [k, kind] of Object.entries(map.cells || {})) {
      const [x, y] = k.split(",").map(Number);
      if (!dm && seen && !seen.has(k) && !known.has(k)) continue;
      const px = X(x), py = Y(y);
      if (kind === "fog") {
        ctx.fillStyle = "rgba(168,178,196,.30)";
        ctx.fillRect(px, py, g.cell + 0.5, g.cell + 0.5);
      } else if (kind === "dark") {
        ctx.fillStyle = dm ? "rgba(4,5,9,.62)" : "rgba(4,5,9,.9)";
        ctx.fillRect(px, py, g.cell + 0.5, g.cell + 0.5);
      } else if (kind === "lit") {
        const cx = px + g.cell / 2, cy = py + g.cell / 2;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, g.cell * 1.1);
        grad.addColorStop(0, "rgba(255,206,130,.35)");
        grad.addColorStop(1, "rgba(255,206,130,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(px - g.cell, py - g.cell, g.cell * 3, g.cell * 3);
      }
    }

    /* Terreno difícil: rayado en diagonal, que se lee sin tapar el plano */
    const rough = Object.keys(map.rough || {});
    if (rough.length && g.cell > 5) {
      this.roughMarks(ctx, g, rough, X, Y, dm ? null : seen, known);
    }

    /* Lo que solo ve el DM: salas que se revelan al entrar, y lo que ha
       decidido enseñar u ocultar a mano */
    if (dm) this.dmLayers(ctx, g, map, X, Y);

    /* Alcance de movimiento mientras se arrastra */
    if (this.drag && this.drag.range) {
      ctx.fillStyle = COLORS.reach;
      for (const k of this.drag.range.keys()) {
        const [x, y] = k.split(",").map(Number);
        ctx.fillRect(X(x) + 1, Y(y) + 1, g.cell - 2, g.cell - 2);
      }
    }

    /* Plantillas de área */
    for (const s of map.shapes || []) {
      if (!dm && !s.party) continue;
      this.shape(ctx, g, s, X, Y);
    }
    for (const s of this.localShapes) this.shape(ctx, g, s, X, Y);
    if (this.pending) this.shape(ctx, g, this.pending, X, Y, true);

    /* Muros y puertas */
    const thick = Math.max(2, g.cell * 0.12);
    for (const [key, type] of Object.entries(map.edges || {})) {
      const [x, y, dir] = key.split(",");
      const cx = Number(x), cy = Number(y);
      if (!dm && seen && !seen.has(cellKey(cx, cy)) && !known.has(cellKey(cx, cy))
        && !seen.has(cellKey(cx - (dir === "v" ? 1 : 0), cy - (dir === "h" ? 1 : 0)))) continue;
      ctx.lineWidth = thick;
      ctx.lineCap = "round";
      ctx.strokeStyle = type === "wall" ? COLORS.wall : type === "door" ? COLORS.door : COLORS.doorOpen;
      ctx.setLineDash(type === "doorOpen" ? [thick, thick * 1.6] : []);
      ctx.beginPath();
      if (dir === "v") { ctx.moveTo(X(cx), Y(cy)); ctx.lineTo(X(cx), Y(cy + 1)); }
      else if (dir === "d") { ctx.moveTo(X(cx), Y(cy)); ctx.lineTo(X(cx + 1), Y(cy + 1)); }
      else if (dir === "a") { ctx.moveTo(X(cx + 1), Y(cy)); ctx.lineTo(X(cx), Y(cy + 1)); }
      else { ctx.moveTo(X(cx), Y(cy)); ctx.lineTo(X(cx + 1), Y(cy)); }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    /* Accesos a otros mapas */
    for (const p of map.portals || []) {
      if (!dm && seen && !seen.has(cellKey(p.x, p.y)) && !known.has(cellKey(p.x, p.y))) continue;
      const cx = X(p.x) + g.cell / 2, cy = Y(p.y) + g.cell / 2;
      ctx.save();
      /* El DM ve adónde lleva un pasadizo dentro del mismo mapa */
      if (dm && (!p.toMap || p.toMap === map.id) && p.toX !== null && p.toY !== null) {
        const ax = X(p.toX) + g.cell / 2, ay = Y(p.toY) + g.cell / 2;
        ctx.strokeStyle = "rgba(136,120,216,.7)";
        ctx.lineWidth = Math.max(1.2, g.cell * 0.04);
        ctx.setLineDash([g.cell * 0.15, g.cell * 0.12]);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ax, ay); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(ax, ay, g.cell * 0.28, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.strokeStyle = "#8878d8";
      ctx.fillStyle = "rgba(136,120,216,.22)";
      ctx.lineWidth = Math.max(1.5, g.cell * 0.06);
      ctx.beginPath();
      ctx.roundRect(X(p.x) + 2, Y(p.y) + 2, g.cell - 4, g.cell - 4, g.cell * 0.2);
      ctx.fill(); ctx.stroke();
      if (g.cell > 16) drawGlyph(ctx, "stairs", cx, cy, g.cell * 0.62, "#cfc7ee");
      ctx.restore();
    }

    /* Chinchetas: una placa con su marca. Las que solo ve el DM van en morado
       y con el borde a rayas, pero igual de sólidas: antes se quedaban en un
       emoji translúcido que casi no se veía sobre un plano oscuro. */
    for (const pin of map.pins || []) {
      if (!dm && !pin.party) continue;
      this.pinBadge(ctx, g, pin, X, Y);
    }

    /* Dibujos a mano alzada, y el que se está haciendo ahora */
    for (const d of map.drawings || []) this.stroke2d(ctx, g, d.points, d.color, d.width, X, Y, dm && !d.party);
    if (this.stroke) this.stroke2d(ctx, g, this.stroke.points, this.drawColor || "#e0bd76", this.drawWidth || 0.08, X, Y, false);

    /* Fichas */
    const dragging = this.drag;
    const order = session && session.combat && session.combat.on ? session.combat.order : [];
    const nowId = order.length ? order[session.combat.index] : null;
    const t = performance.now();
    for (const c of chars) {
      if (c.mapId !== map.id || c.mx === null) continue;
      let x = c.mx, y = c.my;
      let direct = false;
      if (dragging) {
        const inGroup = dragging.group.find(gi => gi.id === c.id);
        if (inGroup) {
          x = dragging.from.x + inGroup.dx + (dragging.at.x - dragging.from.x);
          y = dragging.from.y + inGroup.dy + (dragging.at.y - dragging.from.y);
          direct = true;
        }
      }
      /* Recién soltada: se queda donde la dejó el dedo hasta que el servidor
         confirme. Si lo rechaza, vuelve deslizándose a su sitio. */
      const held = this._held.get(c.id);
      if (!direct && held) {
        if (held.x === c.mx && held.y === c.my) this._held.delete(c.id);
        else if (t < held.until) { x = held.x; y = held.y; direct = true; }
        else this._held.delete(c.id);
      }
      /* Lo recordado se pinta aunque ahora mismo no se vea: para eso se recuerda. */
      if (!dm && !c.memory && seen && !occupied({ ...c, mx: x, my: y }).some(([ox, oy]) => seen.has(cellKey(ox, oy)))) continue;
      let pos;
      if (direct) {
        this._glide.set(c.id, { fx: x, fy: y, tx: x, ty: y, t0: t, mapId: c.mapId, frame: this._frame });
        pos = { x, y };
      } else pos = this.glide(c, x, y, t);
      this.token(ctx, g, c, pos.x, pos.y, X, Y, {
        now: c.id === nowId, selected: this.selection.has(c.id), target: this.target === c.id, memory: !!c.memory,
        mark: this._marks.get(c.id), pulse: this._pulse && this._pulse.id === c.id ? this._pulse : null, t
      });
    }

    /* Recuadro de selección */
    if (this.band) {
      const b = this.band;
      ctx.strokeStyle = COLORS.select;
      ctx.fillStyle = "rgba(200,155,74,.10)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      const x = X(Math.min(b.from.x, b.to.x)), y = Y(Math.min(b.from.y, b.to.y));
      const w = Math.abs(b.to.x - b.from.x) * g.cell, h = Math.abs(b.to.y - b.from.y) * g.cell;
      ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }

    /* Si la ficha no cabe ahí, se avisa antes de soltarla */
    if (dragging && dragging.moved && dragging.ok === false) {
      const who = chars.find(c => c.id === dragging.id);
      const n = who ? footprint(who) : 1;
      ctx.save();
      ctx.strokeStyle = "#b8383b";
      ctx.fillStyle = "rgba(184,56,59,.22)";
      ctx.lineWidth = Math.max(2, g.cell * 0.08);
      ctx.fillRect(X(dragging.at.x), Y(dragging.at.y), g.cell * n, g.cell * n);
      ctx.strokeRect(X(dragging.at.x), Y(dragging.at.y), g.cell * n, g.cell * n);
      ctx.restore();
    }

    /* Regla */
    if (this.measure) this.ruler(ctx, g, this.measure.from, this.measure.to, X, Y);
    if (dragging && dragging.moved) {
      this.ruler(ctx, g, dragging.from, dragging.at, X, Y, dragging.range);
    }

    /* Casilla bajo el ratón */
    if (this.hover && !dragging) {
      const [hx, hy] = this.hover.split(",").map(Number);
      if (hx >= 0 && hy >= 0 && hx < map.cols && hy < map.rows) {
        ctx.strokeStyle = COLORS.pick;
        ctx.lineWidth = 2;
        ctx.strokeRect(X(hx) + 1, Y(hy) + 1, g.cell - 2, g.cell - 2);
      }
    }

    /* Señal */
    const ping = session && session.ping;
    if (ping && ping.mapId === map.id && Date.now() - ping.ts < 4000) {
      const t = (Date.now() - ping.ts) / 4000;
      const cx = X(ping.x) + g.cell / 2, cy = Y(ping.y) + g.cell / 2;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = ping.color || "#ffd27f";
      ctx.lineWidth = 3;
      for (const phase of [0, 0.33, 0.66]) {
        const f = ((t * 2 + phase) % 1);
        ctx.beginPath();
        ctx.arc(cx, cy, g.cell * (0.3 + f * 1.4), 0, Math.PI * 2);
        ctx.globalAlpha = (1 - t) * (1 - f) * 0.9;
        ctx.stroke();
      }
      ctx.restore();
      this.tick();
    }
    if (this._moving) this.tick();
  }

  baseLayer(g, map) {
    const img = image(map.imageId);
    const ready = !!(img && img.complete && img.naturalWidth);
    const key = [this.canvas.width, this.canvas.height, g.dpr, g.cell, g.originX, g.originY,
      map.imageId, ready, map.grid, map.cols, map.rows].join("|");
    if (this._base && this._base.key === key) return this._base.canvas;
    const off = (this._base && this._base.canvas) || document.createElement("canvas");
    off.width = this.canvas.width;
    off.height = this.canvas.height;
    const ctx = off.getContext("2d");
    ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
    ctx.fillStyle = COLORS.void;
    ctx.fillRect(0, 0, g.W, g.H);
    const X = c => g.originX + c * g.cell;
    const Y = c => g.originY + c * g.cell;
    if (ready) {
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, X(0), Y(0), map.cols * g.cell, map.rows * g.cell);
    } else {
      ctx.fillStyle = "#12151d";
      ctx.fillRect(X(0), Y(0), map.cols * g.cell, map.rows * g.cell);
    }
    if (map.grid && g.cell > 6) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = COLORS.grid;
      ctx.beginPath();
      for (let x = 0; x <= map.cols; x++) { ctx.moveTo(X(x), Y(0)); ctx.lineTo(X(x), Y(map.rows)); }
      for (let y = 0; y <= map.rows; y++) { ctx.moveTo(X(0), Y(y)); ctx.lineTo(X(map.cols), Y(y)); }
      ctx.stroke();
    }
    this._base = { key, canvas: off };
    return off;
  }

  /* Rayas de terreno difícil, recortadas a cada casilla */
  roughMarks(ctx, g, keys, X, Y, seen, known) {
    ctx.save();
    ctx.strokeStyle = "rgba(214,170,96,.42)";
    ctx.lineWidth = Math.max(1, g.cell * 0.04);
    for (const k of keys) {
      if (seen && !seen.has(k) && !known.has(k)) continue;
      const [x, y] = k.split(",").map(Number);
      const px = X(x), py = Y(y), c = g.cell;
      ctx.save();
      ctx.beginPath(); ctx.rect(px, py, c, c); ctx.clip();
      ctx.beginPath();
      for (let i = -1; i <= 2; i++) { ctx.moveTo(px + c * (i * 0.34), py + c); ctx.lineTo(px + c * (i * 0.34 + 1), py); }
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  dmLayers(ctx, g, map, X, Y) {
    const tint = (keys, fill, stroke, dash) => {
      if (!keys.length) return;
      ctx.save();
      ctx.fillStyle = fill;
      for (const k of keys) {
        const [x, y] = k.split(",").map(Number);
        ctx.fillRect(X(x), Y(y), g.cell + 0.5, g.cell + 0.5);
      }
      /* borde exterior de la mancha, para ver la forma de la zona */
      const set = new Set(keys);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(1.5, g.cell * 0.05);
      if (dash) ctx.setLineDash([g.cell * 0.18, g.cell * 0.12]);
      ctx.beginPath();
      for (const k of keys) {
        const [x, y] = k.split(",").map(Number);
        if (!set.has(cellKey(x - 1, y))) { ctx.moveTo(X(x), Y(y)); ctx.lineTo(X(x), Y(y + 1)); }
        if (!set.has(cellKey(x + 1, y))) { ctx.moveTo(X(x + 1), Y(y)); ctx.lineTo(X(x + 1), Y(y + 1)); }
        if (!set.has(cellKey(x, y - 1))) { ctx.moveTo(X(x), Y(y)); ctx.lineTo(X(x + 1), Y(y)); }
        if (!set.has(cellKey(x, y + 1))) { ctx.moveTo(X(x), Y(y + 1)); ctx.lineTo(X(x + 1), Y(y + 1)); }
      }
      ctx.stroke();
      ctx.restore();
    };
    const vis = Object.entries(map.vis || {});
    /* Cada sala con su color, para distinguir dos pegadas */
    const byRoom = new Map();
    for (const [k, v] of Object.entries(map.rooms || {})) (byRoom.get(v) || byRoom.set(v, []).get(v)).push(k);
    for (const [id, keys] of byRoom) {
      const [r, gg, b] = ROOM_TONES[(Number(id) || 1) % ROOM_TONES.length];
      tint(keys, `rgba(${r},${gg},${b},.12)`, `rgba(${r},${gg},${b},.8)`, true);
    }
    tint(vis.filter(([, v]) => v === "show").map(([k]) => k), "rgba(79,157,93,.16)", "rgba(110,190,125,.8)", false);
    tint(vis.filter(([, v]) => v === "hide").map(([k]) => k), "rgba(60,40,90,.45)", "rgba(136,120,216,.85)", true);
  }

  /* Un trazo a mano alzada; los del DM que la party no ve, a rayas */
  stroke2d(ctx, g, points, color, width, X, Y, privateOne) {
    if (!points || points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, width * g.cell);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (privateOne) { ctx.globalAlpha = 0.75; ctx.setLineDash([g.cell * 0.2, g.cell * 0.15]); }
    ctx.beginPath();
    ctx.moveTo(X(points[0][0]), Y(points[0][1]));
    for (let i = 1; i < points.length; i++) ctx.lineTo(X(points[i][0]), Y(points[i][1]));
    ctx.stroke();
    ctx.restore();
  }

  tick() {
    cancelAnimationFrame(this._anim);
    this._anim = requestAnimationFrame(() => this.draw());
  }

  conditionBadges(ctx, g, conds, cx, cy, r) {
    const shown = conds.length > 3 ? conds.slice(0, 3) : conds;
    const extra = conds.length - shown.length;
    const total = shown.length + (extra ? 1 : 0);
    const br = Math.max(6, Math.min(g.cell * 0.17, r * 0.5));
    const spread = Math.min(Math.PI * 0.72, 0.5 + total * 0.26);
    const start = -Math.PI / 2 - spread / 2;
    const ring = r + br * 0.85;

    for (let i = 0; i < total; i++) {
      const a = total === 1 ? -Math.PI / 2 : start + (spread * i) / (total - 1);
      const bx = cx + Math.cos(a) * ring, by = cy + Math.sin(a) * ring;
      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(10,12,17,.92)";
      ctx.fill();
      ctx.lineWidth = Math.max(1, br * 0.18);
      ctx.strokeStyle = "#b8383b";
      ctx.stroke();
      if (i < shown.length) {
        const mark = COND_MARKS[shown[i]] || COND_MARKS.otro;
        ctx.strokeStyle = "#f0d9c8";
        ctx.fillStyle = "#f0d9c8";
        ctx.lineWidth = Math.max(1.1, br * 0.2);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        mark(ctx, bx, by, br * 0.62);
      } else {
        ctx.fillStyle = "#f0d9c8";
        ctx.font = `700 ${Math.round(br * 1.05)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("+" + extra, bx, by + 0.5);
      }
      ctx.restore();
    }
  }

  pinBadge(ctx, g, pin, X, Y) {
    const cx = X(pin.x) + g.cell / 2, cy = Y(pin.y) + g.cell / 2;
    const r = Math.max(7, g.cell * 0.3);
    const tone = pin.party ? "#d99a2b" : "#8878d8";
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(9,11,16,.9)";
    ctx.fill();
    ctx.strokeStyle = tone;
    ctx.lineWidth = Math.max(2, g.cell * 0.07);
    if (!pin.party) ctx.setLineDash([r * 0.55, r * 0.45]);
    ctx.stroke();
    ctx.setLineDash([]);
    PIN_MARKS[pin.kind] ? PIN_MARKS[pin.kind](ctx, cx, cy, r, tone) : PIN_MARKS.nota(ctx, cx, cy, r, tone);
    ctx.restore();
  }

  /* A quién pillaría esta área, para poder decidir antes de gastar el conjuro */
  covered(shape) {
    const map = this.data.map;
    if (!map) return [];
    const cells = shapeCells(map, shape);
    return this.data.chars.filter(c =>
      c.mapId === map.id && c.mx !== null && occupied(c).some(([x, y]) => cells.has(cellKey(x, y))));
  }

  shape(ctx, g, s, X, Y, ghost = false) {
    const step = this.data.map.feet || 5;
    const r = (s.size / step) * g.cell;
    const ox = X(s.x), oy = Y(s.y);
    ctx.save();
    ctx.globalAlpha = ghost ? 0.55 : 0.85;
    ctx.fillStyle = s.color + "33";
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    if (s.local) ctx.setLineDash([7, 5]);
    ctx.beginPath();
    if (s.kind === "circle") ctx.arc(ox, oy, r, 0, Math.PI * 2);
    else if (s.kind === "square") ctx.rect(ox - r, oy - r, r * 2, r * 2);
    else if (s.kind === "cone") {
      const half = Math.PI / 6;
      ctx.moveTo(ox, oy);
      ctx.arc(ox, oy, r, s.angle - half, s.angle + half);
      ctx.closePath();
    } else {
      const w = (s.width / step) * g.cell / 2;
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle);
      ctx.moveTo(ox - sa * w, oy + ca * w);
      ctx.lineTo(ox + ca * r - sa * w, oy + sa * r + ca * w);
      ctx.lineTo(ox + ca * r + sa * w, oy + sa * r - ca * w);
      ctx.lineTo(ox + sa * w, oy - ca * w);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    if (s.label && g.cell > 14) {
      ctx.fillStyle = "#ece4d4";
      ctx.font = `600 ${Math.max(10, Math.round(g.cell * 0.24))}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(s.label, ox, oy - 4);
    }
    ctx.restore();
  }

  ruler(ctx, g, from, to, X, Y, range) {
    const map = this.data.map;
    const cells = gridDistance(from.x, from.y, to.x, to.y, map.diagonals);
    const feet = range && range.has(cellKey(to.x, to.y))
      ? range.get(cellKey(to.x, to.y)) * (map.feet || 5)
      : cells * (map.feet || 5);
    const ax = X(from.x) + g.cell / 2, ay = Y(from.y) + g.cell / 2;
    const bx = X(to.x) + g.cell / 2, by = Y(to.y) + g.cell / 2;
    ctx.save();
    ctx.strokeStyle = COLORS.measure;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fillStyle = COLORS.measure; ctx.fill();

    const text = `${feet} pies · ${cells} ${cells === 1 ? "casilla" : "casillas"}`;
    ctx.font = "600 13px system-ui, sans-serif";
    const w = ctx.measureText(text).width + 12;
    const lx = clamp((ax + bx) / 2 - w / 2, 2, g.W - w - 2);
    const ly = clamp((ay + by) / 2 - 26, 2, g.H - 26);
    ctx.fillStyle = "rgba(7,8,12,.85)";
    ctx.strokeStyle = "rgba(127,208,255,.5)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(lx, ly, w, 22, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#cfe9ff";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, lx + w / 2, ly + 12);
    ctx.restore();
  }

  token(ctx, g, c, x, y, X, Y, { now, selected, target, memory, mark, pulse, t = 0 } = {}) {
    const n = footprint(c);
    const span = g.cell * n;
    const tiny = /Diminuto|Tiny/i.test(String(c.size || c.sizeType || ""));
    const r = span * (tiny ? 0.26 : 0.4);
    const cx = X(x) + span / 2, cy = Y(y) + span / 2;
    const down = c.hp <= 0;

    /* Golpe o cura: un halo rojo o verde que se apaga en medio segundo */
    if (mark && !this.still()) {
      const k = (t - mark.t0) / 650;
      if (k >= 1) this._marks.delete(c.id);
      else {
        ctx.save();
        const tone = mark.kind === "hurt" ? "184,56,59" : "79,157,93";
        const grad = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * (1.5 + k * 0.6));
        grad.addColorStop(0, `rgba(${tone},${0.55 * (1 - k)})`);
        grad.addColorStop(1, `rgba(${tone},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, r * (1.5 + k * 0.6), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        this._moving = true;
      }
    }

    /* Empieza su turno: un aro dorado se abre una vez desde la ficha */
    if (pulse && !this.still()) {
      const k = (t - pulse.t0) / 900;
      if (k >= 1) this._pulse = null;
      else {
        ctx.save();
        ctx.strokeStyle = `rgba(217,154,43,${0.8 * (1 - k)})`;
        ctx.lineWidth = Math.max(2, g.cell * 0.07) * (1 - k * 0.5);
        ctx.beginPath(); ctx.arc(cx, cy, r + Math.max(4, g.cell * 0.14) + k * g.cell * 0.9, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        this._moving = true;
      }
    }

    /* Luz que lleva encima */
    if (c.light && this.data.map.dark) {
      const rad = c.light * g.cell;
      const grad = ctx.createRadialGradient(cx, cy, r, cx, cy, rad);
      grad.addColorStop(0, "rgba(255,206,130,.16)");
      grad.addColorStop(1, "rgba(255,206,130,0)");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    }

    if (now) {
      ctx.save();
      ctx.strokeStyle = "#d99a2b";
      ctx.lineWidth = Math.max(2, g.cell * 0.08);
      ctx.shadowColor = "#d99a2b"; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(cx, cy, r + Math.max(4, g.cell * 0.14), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    if (memory) ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = c.color || "#c89b4a";
    ctx.globalAlpha *= down ? 0.35 : 1;
    ctx.fill();

    const img = image(c.avatarId);
    if (img && img.complete && img.naturalWidth) {
      ctx.clip();
      ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    } else if (span > 18) {
      ctx.fillStyle = "rgba(10,10,12,.82)";
      ctx.font = `600 ${Math.round(r * 0.9)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initials(c.name), cx, cy + 1);
    }
    ctx.restore();

    if (memory) {
      ctx.save();
      ctx.strokeStyle = "rgba(236,228,212,.55)";
      ctx.setLineDash([Math.max(3, g.cell * 0.1), Math.max(3, g.cell * 0.1)]);
      ctx.lineWidth = Math.max(1.5, g.cell * 0.05);
      ctx.beginPath(); ctx.arc(cx, cy, r + Math.max(3, g.cell * 0.1), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.45;
    }

    /* Aro de vida. En la vista del DM se ve siempre; en la de la party solo
       la de los personajes, y la de los enemigos únicamente si el DM ha
       decidido enseñarla (en cuyo caso el servidor manda el porcentaje). */
    const showRing = this.mode === "dm" || c.kind === "pc" || c.hpPct !== undefined;
    if (showRing && !down) {
      const p = c.hpPct !== undefined ? c.hpPct : pct(c);
      ctx.beginPath();
      ctx.arc(cx, cy, r + Math.max(2, g.cell * 0.055), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (p / 100));
      ctx.lineWidth = Math.max(2, g.cell * 0.09);
      ctx.strokeStyle = { ok: "#4f9d5d", warn: "#d99a2b", bad: "#b8383b", out: "#555" }[hpTone(p)];
      ctx.stroke();
    }
    if (down) {
      ctx.strokeStyle = "#b8383b";
      ctx.lineWidth = Math.max(2, g.cell * 0.07);
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.6, cy - r * 0.6); ctx.lineTo(cx + r * 0.6, cy + r * 0.6);
      ctx.moveTo(cx + r * 0.6, cy - r * 0.6); ctx.lineTo(cx - r * 0.6, cy + r * 0.6);
      ctx.stroke();
    }
    if (c.hidden) {
      ctx.strokeStyle = "rgba(236,228,212,.8)";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (selected) {
      ctx.strokeStyle = COLORS.select;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(X(x) + 1, Y(y) + 1, span - 2, span - 2);
      ctx.setLineDash([]);
    }
    if (target) {
      ctx.strokeStyle = COLORS.target;
      ctx.lineWidth = Math.max(2, g.cell * 0.07);
      ctx.beginPath(); ctx.arc(cx, cy, r + Math.max(5, g.cell * 0.18), 0, Math.PI * 2); ctx.stroke();
    }

    /* Estados: una chapita con su marca por cada uno, en arco sobre la ficha.
       Caben tres; a partir de ahí la última dice cuántos faltan, porque con
       cinco marcas diminutas no se distingue ninguna. Los puntos rojos de
       antes obligaban a abrir la ficha para saber qué le pasaba a quién. */
    const conds = c.conditions || [];
    if (conds.length && g.cell > 18) this.conditionBadges(ctx, g, conds, cx, cy, r);

    /* Nombre */
    if (g.cell > 26) {
      const label = c.name.length > 14 ? c.name.slice(0, 13) + "…" : c.name;
      ctx.font = `600 ${Math.max(9, Math.round(g.cell * 0.2))}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const w = ctx.measureText(label).width + 8;
      ctx.fillStyle = "rgba(7,8,12,.72)";
      ctx.fillRect(cx - w / 2, cy + r + 2, w, g.cell * 0.24);
      ctx.fillStyle = "#ece4d4";
      ctx.fillText(label, cx, cy + r + 4);
    }
    if (memory) ctx.restore();
  }
}

/* Una marca por estado, dibujada a trazo dentro de su chapita. Se reconocen
   de un vistazo desde el otro lado de la mesa, que es de lo que se trata. */
const slash = (ctx, x, y, s) => { ctx.beginPath(); ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s); ctx.stroke(); };
const COND_MARKS = {
  /* ojo tachado */
  cegado: (ctx, x, y, s) => {
    ctx.beginPath();
    ctx.moveTo(x - s, y); ctx.quadraticCurveTo(x, y - s * 0.95, x + s, y);
    ctx.quadraticCurveTo(x, y + s * 0.95, x - s, y);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, s * 0.3, 0, Math.PI * 2); ctx.fill();
    slash(ctx, x, y, s * 0.95);
  },
  /* red */
  apresado: (ctx, x, y, s) => {
    ctx.beginPath();
    for (let i = -1; i <= 1; i++) {
      ctx.moveTo(x - s, y + i * s * 0.7); ctx.lineTo(x + s, y + i * s * 0.7 + s * 0.7);
      ctx.moveTo(x - s, y + i * s * 0.7 + s * 0.7); ctx.lineTo(x + s, y + i * s * 0.7);
    }
    ctx.stroke();
  },
  /* mano que sujeta */
  agarrado: (ctx, x, y, s) => {
    ctx.beginPath(); ctx.arc(x, y, s * 0.75, Math.PI * 0.25, Math.PI * 1.05); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, s * 0.75, Math.PI * 1.25, Math.PI * 2.05); ctx.stroke();
  },
  /* boca abierta de susto */
  asustado: (ctx, x, y, s) => {
    ctx.beginPath();
    ctx.moveTo(x - s, y + s * 0.7); ctx.lineTo(x - s * 0.35, y - s * 0.6);
    ctx.lineTo(x + s * 0.35, y + s * 0.6); ctx.lineTo(x + s, y - s * 0.7);
    ctx.stroke();
  },
  /* estrellitas */
  aturdido: (ctx, x, y, s) => {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI / 3;
      ctx.moveTo(x - Math.cos(a) * s, y - Math.sin(a) * s);
      ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
    }
    ctx.stroke();
  },
  /* figura tumbada */
  derribado: (ctx, x, y, s) => {
    ctx.beginPath(); ctx.arc(x - s * 0.55, y + s * 0.1, s * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - s * 0.15, y + s * 0.1); ctx.lineTo(x + s, y + s * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - s, y + s * 0.75); ctx.lineTo(x + s, y + s * 0.75); ctx.stroke();
  },
  /* corazón */
  encantado: (ctx, x, y, s) => {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.8);
    ctx.bezierCurveTo(x - s * 1.4, y - s * 0.2, x - s * 0.4, y - s * 1.1, x, y - s * 0.3);
    ctx.bezierCurveTo(x + s * 0.4, y - s * 1.1, x + s * 1.4, y - s * 0.2, x, y + s * 0.8);
    ctx.fill();
  },
  /* onda tachada */
  ensordecido: (ctx, x, y, s) => {
    ctx.beginPath(); ctx.arc(x - s * 0.3, y, s * 0.5, -Math.PI / 2.4, Math.PI / 2.4); ctx.stroke();
    ctx.beginPath(); ctx.arc(x - s * 0.3, y, s * 0.95, -Math.PI / 2.4, Math.PI / 2.4); ctx.stroke();
    slash(ctx, x, y, s * 0.9);
  },
  /* gota */
  envenenado: (ctx, x, y, s) => {
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.bezierCurveTo(x + s, y, x + s * 0.75, y + s, x, y + s);
    ctx.bezierCurveTo(x - s * 0.75, y + s, x - s, y, x, y - s);
    ctx.fill();
  },
  /* prohibido */
  incapacitado: (ctx, x, y, s) => {
    ctx.beginPath(); ctx.arc(x, y, s * 0.9, 0, Math.PI * 2); ctx.stroke();
    slash(ctx, x, y, s * 0.62);
  },
  /* contorno a rayas */
  invisible: (ctx, x, y, s) => {
    ctx.save(); ctx.setLineDash([s * 0.45, s * 0.4]);
    ctx.beginPath(); ctx.arc(x, y, s * 0.85, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  },
  /* rayo */
  paralizado: (ctx, x, y, s) => {
    ctx.beginPath();
    ctx.moveTo(x + s * 0.45, y - s); ctx.lineTo(x - s * 0.45, y + s * 0.1);
    ctx.lineTo(x + s * 0.2, y + s * 0.1); ctx.lineTo(x - s * 0.4, y + s);
    ctx.stroke();
  },
  /* piedra */
  petrificado: (ctx, x, y, s) => {
    ctx.beginPath();
    ctx.moveTo(x - s, y + s * 0.7); ctx.lineTo(x - s * 0.45, y - s * 0.75);
    ctx.lineTo(x + s * 0.5, y - s * 0.5); ctx.lineTo(x + s, y + s * 0.7);
    ctx.closePath(); ctx.stroke();
  },
  /* zeta de dormido */
  inconsciente: (ctx, x, y, s) => {
    ctx.beginPath();
    ctx.moveTo(x - s * 0.8, y - s * 0.7); ctx.lineTo(x + s * 0.8, y - s * 0.7);
    ctx.lineTo(x - s * 0.8, y + s * 0.7); ctx.lineTo(x + s * 0.8, y + s * 0.7);
    ctx.stroke();
  },
  /* flecha hacia abajo */
  agotamiento: (ctx, x, y, s) => {
    ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.lineTo(x, y + s * 0.9);
    ctx.moveTo(x - s * 0.6, y + s * 0.25); ctx.lineTo(x, y + s * 0.9); ctx.lineTo(x + s * 0.6, y + s * 0.25);
    ctx.stroke();
  },
  /* círculos concéntricos */
  concentrado: (ctx, x, y, s) => {
    ctx.beginPath(); ctx.arc(x, y, s * 0.9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, s * 0.32, 0, Math.PI * 2); ctx.fill();
  },
  /* cualquier otro que se añada a mano */
  otro: (ctx, x, y, s) => {
    ctx.beginPath(); ctx.arc(x, y, s * 0.45, 0, Math.PI * 2); ctx.fill();
  }
};

/* Las marcas de las chinchetas, dibujadas a trazo */
const PIN_MARKS = {
  nota: (ctx, cx, cy, r, tone) => {
    ctx.strokeStyle = tone; ctx.lineWidth = Math.max(1.4, r * 0.16); ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = -1; i <= 1; i++) { ctx.moveTo(cx - r * 0.42, cy + i * r * 0.34); ctx.lineTo(cx + r * (i === 1 ? 0.1 : 0.42), cy + i * r * 0.34); }
    ctx.stroke();
  },
  peligro: (ctx, cx, cy, r, tone) => {
    ctx.strokeStyle = tone; ctx.lineWidth = Math.max(1.8, r * 0.2); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.45); ctx.lineTo(cx, cy + r * 0.12); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.42, Math.max(1.2, r * 0.11), 0, Math.PI * 2); ctx.fillStyle = tone; ctx.fill();
  },
  tesoro: (ctx, cx, cy, r, tone) => {
    ctx.strokeStyle = tone; ctx.lineWidth = Math.max(1.4, r * 0.16); ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.5); ctx.lineTo(cx + r * 0.5, cy); ctx.lineTo(cx, cy + r * 0.5); ctx.lineTo(cx - r * 0.5, cy);
    ctx.closePath(); ctx.stroke();
  },
  pregunta: (ctx, cx, cy, r, tone) => {
    ctx.strokeStyle = tone; ctx.lineWidth = Math.max(1.5, r * 0.17); ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.16, r * 0.28, Math.PI * 0.9, Math.PI * 2.35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy + r * 0.06); ctx.lineTo(cx, cy + r * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.46, Math.max(1.1, r * 0.1), 0, Math.PI * 2); ctx.fillStyle = tone; ctx.fill();
  }
};

const ROOM_TONES = [[127, 208, 255], [217, 154, 43], [229, 107, 111], [143, 214, 148], [200, 160, 240], [240, 200, 120]];

export const EDGE_CYCLE = { none: "wall", wall: "door", door: "doorOpen", doorOpen: null };
export { cellKey, edgeKey };
