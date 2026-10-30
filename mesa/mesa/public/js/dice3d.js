/* Dados en 3D que ruedan por encima de la pantalla y se paran en el
   resultado de verdad.

   Cómo se consigue que caigan en el número que salió (la tirada la hace el
   servidor o el panel, no la física): primero se simula la caída entera en
   silencio, con gravedad, rebotes contra el suelo y los bordes de la
   pantalla y rozamiento; se mira qué cara queda arriba y se numera el dado
   para que esa cara lleve el resultado; y entonces se reproduce la caída
   ya grabada. El dado rueda de verdad y el número es el bueno.

   Los hay de 4, 6, 8, 10, 12 y 20 caras; el d100 son dos d10 (decenas y
   unidades). Cada uno lleva el color de quien tira. Se dibuja con three.js
   (public/vendor/three, MIT), que solo se carga la primera vez. */

import { store, onState } from "./net.js";
import { shapeOf, simulate, labelsFor, expand, norm, dot, sub, cross } from "./dice3d-core.js";

let THREE = null;
const loadThree = async () => THREE || (THREE = await import("../vendor/three/three.module.min.js"));
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Caras con número ---------- */
function faceTexture(label, color, ink, d4Corners = null) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = color; g.fillRect(0, 0, 128, 128);
  /* Un brillo suave para que no parezca plástico plano */
  const grad = g.createRadialGradient(46, 40, 6, 64, 64, 90);
  grad.addColorStop(0, "rgba(255,255,255,.22)"); grad.addColorStop(1, "rgba(0,0,0,.18)");
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  g.fillStyle = ink; g.textAlign = "center"; g.textBaseline = "middle";
  if (d4Corners) {
    g.font = "700 34px Roboto, system-ui, sans-serif";
    for (const [txt, u, v] of d4Corners) { g.fillText(txt, u * 128, (1 - v) * 128); }
  } else {
    const big = String(label).length > 2 ? 46 : String(label).length > 1 ? 60 : 78;
    g.font = `700 ${big}px Roboto, system-ui, sans-serif`;
    g.fillText(label, 64, 68);
    if (label === "6" || label === "9") g.fillRect(48, 104, 32, 5);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
/* Geometría con un grupo (y una textura) por cara, y la cara proyectada en
   su cuadrado de textura */
function buildMesh(f, labels, color, ink) {
  const { V, F } = shapeOf(f);
  const pos = [], uv = [], groups = [];
  const faceUV = [];
  F.forEach((face, fi) => {
    const pts = face.map(i => V[i]);
    const c = pts.reduce((a, p) => a.map((x, k) => x + p[k] / pts.length), [0, 0, 0]);
    const n = norm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
    /* El primer vértice de la cara, arriba en la textura */
    const up = norm(sub(pts[0], c)), right = cross(up, n);
    const span = Math.max(...pts.map(p => Math.hypot(dot(sub(p, c), right), dot(sub(p, c), up)))) * (f === 4 ? 1.05 : f === 20 || f === 8 ? 0.9 : 1.02);
    const toUV = p => { const r = sub(p, c); return [0.5 + dot(r, right) / (2 * span), 0.5 + dot(r, up) / (2 * span) - (f === 4 ? 0.06 : 0)]; };
    const uvs = pts.map(toUV);
    faceUV.push(uvs);
    const start = pos.length / 3;
    for (let k = 1; k < pts.length - 1; k++) {
      for (const idx of [0, k, k + 1]) { pos.push(...pts[idx]); uv.push(...uvs[idx]); }
    }
    groups.push([start, (pts.length - 2) * 3, fi]);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  groups.forEach(([s, cnt, mi]) => geo.addGroup(s, cnt, mi));
  geo.computeVertexNormals();
  const mats = F.map((face, fi) => {
    let map;
    if (f === 4) {
      /* El d4 se lee por el vértice de arriba: cada esquina lleva el número de su vértice */
      const c = [0.5, 0.44];
      map = faceTexture("", color, ink, face.map((vi, k) => {
        const [u, v] = faceUV[fi][k];
        return [labels[vi], c[0] + (u - c[0]) * 0.62, c[1] + (v - c[1]) * 0.62];
      }));
    } else map = faceTexture(labels[fi], color, ink);
    return new THREE.MeshStandardMaterial({ map, roughness: 0.38, metalness: 0.08, transparent: true });
  });
  const mesh = new THREE.Mesh(geo, mats);
  mesh.castShadow = true;
  return mesh;
}

/* ---------- La escena ---------- */
let scene = null;
async function stage() {
  if (scene) return scene;
  await loadThree();
  const canvas = document.createElement("canvas");
  canvas.className = "dice3d";
  canvas.setAttribute("aria-hidden", "true");
  const label = document.createElement("div");
  label.className = "dice3d-result";
  label.setAttribute("role", "status");
  document.body.append(canvas, label);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const sc = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  camera.position.set(0, 27, 4);
  camera.lookAt(0, 0, 0);
  sc.add(new THREE.HemisphereLight(0xfff4e0, 0x202830, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(-8, 30, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 80 });
  sc.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.38 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  sc.add(floor);
  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  addEventListener("resize", resize);
  resize();
  /* Lo que se ve del suelo a la altura de los dados, para poner las paredes */
  const bounds = () => {
    const vFov = camera.fov * Math.PI / 180, dist = camera.position.length();
    const halfH = Math.tan(vFov / 2) * dist, halfW = halfH * camera.aspect;
    return { x: Math.max(6, halfW * 0.88 - 1), z: Math.max(5, halfH * 0.8 - 1), low: 0.45 };
  };
  return (scene = { renderer, sc, camera, canvas, label, bounds });
}

/* ---------- Colores: los de quien tira ---------- */
const lum = hex => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
function colorFor(entry) {
  const doc = store.doc || {};
  const chars = doc.chars || [];
  const mine = chars.find(c => c.kind === "pc" && (c.claimedBy === entry.actor || (entry.label || "").startsWith(c.name + " ·")));
  const raw = entry.by === "dm" && !mine ? "#8a1f2b" : (mine && /^#[0-9a-f]{6}$/i.test(mine.color) ? mine.color : "#c89b4a");
  return { color: raw, ink: lum(raw) > 0.55 ? "#1b1206" : "#fff8ec" };
}

/* ---------- Una tirada ---------- */
const queue = [];
let busy = false;
export function showRoll(entry) {
  if (!entry || !Array.isArray(entry.dice) || !entry.dice.length) return;
  /* Con la pestaña escondida no se anima (el navegador para las animaciones
     y saltaría tarde, al volver): la tirada ya está en el registro */
  if (typeof document !== "undefined" && document.hidden) return;
  if (queue.length >= 2) queue.shift();
  queue.push(entry);
  if (!busy) next();
}
async function next() {
  const entry = queue.shift();
  if (!entry) { busy = false; return; }
  busy = true;
  try { await play(entry); } catch (err) { console.warn("Dados 3D:", err && err.stack); }
  next();
}

async function play(entry) {
  const st = await stage();
  const { renderer, sc, camera, canvas, label } = st;
  const dice = expand(entry.dice);
  const b = st.bounds();
  const sim = simulate(dice, b);
  const last = sim.frames[sim.frames.length - 1];
  const { color, ink } = colorFor(entry);
  const meshes = dice.map((d, i) => {
    const labels = labelsFor(d, sim.top[i], last[i].q);
    const m = buildMesh(d.shape, labels, color, ink);
    sc.add(m);
    return m;
  });
  const quick = reduced();
  canvas.classList.add("on");
  /* Reproducir lo grabado; con «reducir movimiento», solo el final */
  const frames = quick ? [last] : sim.frames;
  const t0 = performance.now(), fps = 60;
  await new Promise(done => {
    /* Si la pestaña se esconde a mitad, se acaba sin esperar */
    const bail = () => { if (document.hidden) { document.removeEventListener("visibilitychange", bail); done(); } };
    document.addEventListener("visibilitychange", bail);
    const tick = now => {
      if (document.hidden) return;
      /* El reloj de requestAnimationFrame puede ir un pelo por detrás de t0 */
      const k = Math.max(0, Math.min(frames.length - 1, Math.floor((now - t0) / 1000 * fps)));
      frames[k].forEach((s, i) => { meshes[i].position.set(...s.p); meshes[i].quaternion.set(...s.q); });
      renderer.render(sc, camera);
      if (k < frames.length - 1) requestAnimationFrame(tick); else { document.removeEventListener("visibilitychange", bail); done(); }
    };
    requestAnimationFrame(tick);
  });
  /* Los dados descartados (ventaja o desventaja) se apagan */
  dice.forEach((d, i) => { if (d.x) meshes[i].material.forEach(m => { m.opacity = 0.35; }); });
  renderer.render(sc, camera);
  showResult(label, entry);
  await wait(3000);
  canvas.classList.remove("on");
  label.classList.remove("on");
  await wait(quick ? 150 : 420);
  for (const m of meshes) {
    sc.remove(m);
    m.geometry.dispose();
    m.material.forEach(x => { if (x.map) x.map.dispose(); x.dispose(); });
  }
  renderer.render(sc, camera);
}
const wait = ms => new Promise(r => setTimeout(r, ms));

function showResult(label, e) {
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const head = [e.actor, e.label || e.formula].filter(Boolean).join(" · ");
  const big = e.kind === "roll" ? String(e.total) : "";
  const line = e.kind === "roll" ? "" : String(e.text || "").split("\n")[0];
  label.className = "dice3d-result on" + (e.crit ? " crit" : e.fumble ? " fumble" : "") + (big ? "" : " text");
  label.innerHTML = `<small>${esc(head)}</small>${big ? `<b class="tnum">${esc(big)}</b>` : `<span>${esc(line)}</span>`}${e.crit ? "<i>¡Crítico!</i>" : e.fumble ? "<i>Pifia</i>" : ""}`;
}

/* ---------- Quién ve qué ----------
   La tele: todas las tiradas que le llegan (el servidor no le manda las
   secretas del DM ni las de un jugador solo al DM). El DM: las suyas
   siempre (también las secretas) y las de los jugadores salvo que haya
   pedido no verlas («Tiradas de los jugadores solo en la tele»). */
let started = false;
export function startDice3D({ role, quiet = () => false } = {}) {
  if (started || (role !== "screen" && role !== "dm")) return;
  started = true;
  /* three.js se trae en segundo plano al poco de entrar: así la primera
     tirada no espera a descargarlo en una tele o un portátil lentos */
  setTimeout(() => { loadThree().catch(() => {}); }, 2500);
  const seen = new Set();
  let ready = false;
  /* Lo que ya estaba en el registro al entrar no se tira otra vez */
  if (store.doc) { (store.doc.log || []).forEach(e => seen.add(e.id)); ready = true; }
  onState(() => {
    if (!store.doc) return;
    const log = store.doc.log || [];
    if (!ready) { log.forEach(e => seen.add(e.id)); ready = true; return; }
    for (const e of log) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      if (!e.dice || !e.dice.length) continue;
      if (role === "dm" && e.by !== "dm" && quiet()) continue;
      showRoll(e);
    }
  });
}
