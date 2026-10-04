/* Mesa · servidor de partida
   Node 18+, sin dependencias. Sirve la aplicación, guarda el estado en disco
   y mantiene al día a todos los dispositivos conectados.

   node server.js [--port 8080] [--pin 123456] [--data ./data] [--cert cert.pem --key key.pem] [--internet]

   Con --internet (o MESA_INTERNET=1) abre además un túnel de Cloudflare: una
   dirección https pública que sirve desde cualquier sitio, sin VPN y sin
   tocar el router. Necesita el programa «cloudflared» instalado o junto a
   este archivo.

   Con --cert y --key (o MESA_CERT y MESA_KEY) sirve por HTTPS, que es lo que
   necesitan los móviles para instalar Mesa como aplicación.
*/
"use strict";

import { createServer } from "node:http";
import { createServer as createSecureServer } from "node:https";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { existsSync, createReadStream, statSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { gzipSync } from "node:zlib";
import { networkInterfaces } from "node:os";
import { spawn } from "node:child_process";
import { promises as dns } from "node:dns";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { migrate } from "./public/js/schema.js";
import { createEngine } from "./public/js/engine.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(HERE, "public");

/* ---------- Argumentos ---------- */
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf("--" + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const PORT = Number(process.env.PORT || arg("port", 8080));
const DATA = path.resolve(HERE, arg("data", "data"));
const IMAGES = path.join(DATA, "images");
const STATE_FILE = path.join(DATA, "mesa.json");
const WALL_MODEL_FILE = path.join(DATA, "wallmodel.json");   // lo aprendido de planos corregidos
const CERT = process.env.MESA_CERT || arg("cert", "");
const KEY = process.env.MESA_KEY || arg("key", "");
const INTERNET = argv.includes("--internet") || process.env.MESA_INTERNET === "1";

/* ---------- Estado ----------
   Las reglas viven en public/js/engine.js; aquí solo hay red y disco. */
const rid = n => randomBytes(n).toString("hex");
const engine = createEngine({
  rid, absorbImages: d => absorbLegacyImages(d), onPresence: () => broadcastPresence(),
  /* Al expulsar a alguien se le corta el flujo: su aparato vuelve a la entrada */
  onKick: client => { if (client.res) { try { client.res.end(); } catch {} client.res = null; } }
});
const clients = engine.clients;   // testigo -> { id, name, role, charId, res }

const MAX_BODY = 24 * 1024 * 1024;   // 24 MB: cabe un plano grande
const IMG_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

async function boot() {
  await mkdir(IMAGES, { recursive: true });
  try {
    const saved = JSON.parse(await readFile(STATE_FILE, "utf8"));
    engine.doc = await absorbLegacyImages(migrate(saved.doc || saved));
    engine.pin = saved.pin || "";
    engine.loadClients(saved.clients);
    engine.purge();
  } catch { /* partida nueva */ }
  if (!engine.pin) engine.pin = process.env.MESA_PIN || arg("pin", "") || String(randomBytes(4).readUInt32BE() % 900000 + 100000);
  await persist();
}

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => persist().catch(e => console.error("No se pudo guardar:", e.message)), 400);
}
async function persist() {
  const tmp = STATE_FILE + ".tmp";
  const doc = engine.doc;
  const saved = { pin: engine.pin, clients: engine.saveClients(), doc: { ...doc, session: { ...doc.session, alert: null, ping: null } } };
  await writeFile(tmp, JSON.stringify(saved, null, 1), "utf8");
  await rename(tmp, STATE_FILE);
}

/* ---------- Difusión ---------- */
let pushTimer = null;
function push() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    const rev = engine.advance();
    for (const c of clients.values()) send(c, "state", { rev, doc: engine.snapshot(c) });
  }, 50);
  scheduleSave();
}
function send(client, event, payload) {
  if (!client.res || client.res.writableEnded) return;
  try {
    client.res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
  } catch { /* se limpia al cerrarse */ }
}
function broadcastPresence() {
  const roster = engine.presence();
  for (const c of clients.values()) send(c, "presence", roster);
}

/* Las copias de la versión anterior llevaban los planos y los retratos dentro
   del propio archivo, en base64. Al entrar se sacan a la carpeta de imágenes:
   así el estado que viaja por la red se queda en unas pocas decenas de KB. */
async function absorbLegacyImages(d) {
  const save = async dataURL => {
    const [head, b64] = String(dataURL).split(",");
    const mime = (head.match(/data:([^;]+)/) || [])[1];
    const id = randomBytes(8).toString("hex") + "." + (IMG_TYPES[mime] || "png");
    await writeFile(path.join(IMAGES, id), Buffer.from(b64 || "", "base64"));
    return id;
  };
  for (const m of d.maps) {
    if (typeof m.image === "string" && m.image.startsWith("data:") && !m.imageId) m.imageId = await save(m.image);
    delete m.image;
  }
  for (const c of d.chars) {
    if (typeof c.avatar === "string" && c.avatar.startsWith("data:") && !c.avatarId) c.avatarId = await save(c.avatar);
    delete c.avatar;
  }
  return d;
}

/* ---------- HTTP ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json"
};

const json = (res, code, obj) => {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
};

function readBody(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", d => {
      size += d.length;
      if (size > limit) { reject(new Error("Archivo demasiado grande")); req.destroy(); return; }
      chunks.push(d);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/* La aplicación se pide entera cada vez que alguien entra o recarga. Con
   ETag, el navegador pregunta «¿ha cambiado?» y el servidor contesta 304 sin
   mandar nada; y lo que sí viaja, va comprimido (unos 360 KB de código se
   quedan en menos de 100). Se guarda comprimido en memoria mientras el
   archivo no cambie. */
const gzCache = new Map();   // ruta -> { mtime, size, etag, gz }
const COMPRESSIBLE = new Set([".html", ".js", ".css", ".json", ".svg", ".webmanifest"]);

function serveStatic(req, res, file) {
  const st = statSync(file);
  const ext = path.extname(file);
  const etag = `"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`;
  const headers = {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": "no-cache",
    ETag: etag,
    Vary: "Accept-Encoding"
  };
  if (path.basename(file) === "sw.js") headers["Service-Worker-Allowed"] = "/";
  if (req.headers["if-none-match"] === etag) { res.writeHead(304, headers); return res.end(); }

  const gzipOK = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(String(req.headers["accept-encoding"] || ""));
  if (gzipOK) {
    let hit = gzCache.get(file);
    if (!hit || hit.etag !== etag) {
      hit = { etag, gz: gzipSync(readFileSync(file), { level: 9 }) };
      gzCache.set(file, hit);
    }
    res.writeHead(200, { ...headers, "Content-Encoding": "gzip", "Content-Length": hit.gz.length });
    return res.end(req.method === "HEAD" ? undefined : hit.gz);
  }
  res.writeHead(200, { ...headers, "Content-Length": st.size });
  if (req.method === "HEAD") return res.end();
  createReadStream(file).pipe(res);
}

/* Quién llama, para contar intentos fallidos. Detrás del túnel todo llega
   desde este mismo ordenador, así que se usa la cabecera que pone Cloudflare. */
const pinFails = new Map();
function clientKey(req) {
  const h = req.headers;
  return String(h["cf-connecting-ip"] || String(h["x-forwarded-for"] || "").split(",")[0] || req.socket.remoteAddress || "?").trim();
}

const handler = async (req, res) => {
  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
  const p = url.pathname;

  try {
    /* Con las direcciones de red del DM: «localhost» no le sirve a nadie más */
    if (p === "/api/hello") return json(res, 200, { ...engine.hello(), addresses: lanAddresses(), publicUrl, tunnel });

    if (p === "/api/ping") {
      const ok = clients.has(url.searchParams.get("token") || "");
      return json(res, ok ? 200 : 401, { ok });
    }

    if (p === "/api/join" && req.method === "POST") {
      const body = JSON.parse((await readBody(req, 8192)).toString() || "{}");
      /* Con la mesa abierta a internet, el código del DM no se puede probar
         a fuerza de intentos: cinco fallos y hay que esperar diez minutos. */
      const who = clientKey(req);
      const tries = pinFails.get(who);
      if (body.role === "dm" && tries && tries.n >= 5 && Date.now() - tries.since < 10 * 60 * 1000) {
        return json(res, 429, { error: "Demasiados intentos con el código del DM. Espera unos minutos." });
      }
      const out = engine.join(body);
      if (out.error) {
        if (out.status === 403 && body.role === "dm") {
          const t = tries && Date.now() - tries.since < 10 * 60 * 1000 ? tries : { n: 0, since: Date.now() };
          t.n++;
          pinFails.set(who, t);
        }
        return json(res, out.status || 403, { error: out.error });
      }
      if (body.role === "dm") pinFails.delete(who);
      out.client.res = null;
      scheduleSave();
      return json(res, 200, { token: out.token, id: out.client.id, role: out.client.role, charId: out.client.charId });
    }

    if (p === "/api/stream") {
      const client = clients.get(url.searchParams.get("token") || "");
      if (!client) return json(res, 401, { error: "sesión caducada" });
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      });
      res.write(": mesa\n\n");
      if (client.res && client.res !== res) { try { client.res.end(); } catch {} }
      client.res = res;
      engine.setOnline(client, true);
      engine.refresh();     // quien acaba de entrar recibe la visibilidad de ahora, no la de antes
      send(client, "state", { rev: engine.rev, doc: engine.snapshot(client) });
      broadcastPresence();
      const ping = setInterval(() => { try { res.write(": ping\n\n"); } catch {} }, 20000);
      req.on("close", () => {
        clearInterval(ping);
        /* Al reconectar, la conexión vieja puede cerrarse después de abrirse
           la nueva: solo cuenta si sigue siendo la suya. La sesión no se
           borra: un móvil bloqueado vuelve a su sitio al desbloquearse. */
        if (client.res !== res) return;
        client.res = null;
        engine.setOnline(client, false);
        broadcastPresence();
        scheduleSave();
      });
      return;
    }

    if (p === "/api/op" && req.method === "POST") {
      const body = JSON.parse((await readBody(req, 8 * 1024 * 1024)).toString() || "{}");
      const client = clients.get(body.token || "");
      if (!client) return json(res, 401, { error: "sesión caducada" });
      const ops = Array.isArray(body.ops) ? body.ops : [body.op];
      const out = await engine.run(client, ops);
      if (out.applied) push();
      if (out.error) return json(res, 400, { error: out.error });
      return json(res, 200, { ok: true, charId: client.charId });
    }

    /* Voz: los aparatos se presentan entre sí (oferta, respuesta, rutas de
       red) a través de aquí. El audio no pasa por el servidor. Solo se
       reenvía entre dos sesiones que tienen la voz abierta. */
    if (p === "/api/rtc" && req.method === "POST") {
      const body = JSON.parse((await readBody(req, 64 * 1024)).toString() || "{}");
      const client = clients.get(body.token || "");
      if (!client) return json(res, 401, { error: "sesión caducada" });
      const target = [...clients.values()].find(c => c.id === body.to);
      if (!client.voice || !target || !target.voice) return json(res, 409, { error: "Esa persona no está en la voz" });
      send(target, "rtc", { from: client.id, data: body.data });
      return json(res, 200, { ok: true });
    }

    /* Lo que la propuesta de muros ha aprendido: el modelo y los planos con
       los que se enseñó (para volver a aprender si cambia la versión, o
       llevárselo a otra instalación). Vale para todas las partidas de este
       servidor; solo el DM. */
    if (p === "/api/wallmodel") {
      const token = req.method === "GET" ? url.searchParams.get("token") : null;
      const body = req.method === "POST" ? JSON.parse((await readBody(req, 16 * 1024 * 1024)).toString() || "{}") : {};
      const client = clients.get(token || body.token || "");
      if (!client || client.role !== "dm") return json(res, 403, { error: "Solo el DM" });
      let saved = existsSync(WALL_MODEL_FILE) ? JSON.parse(await readFile(WALL_MODEL_FILE, "utf8")) : null;
      if (saved && Array.isArray(saved.w)) saved = { model: saved, lessons: [] };   // formato de la primera versión
      saved = saved || { model: null, lessons: [] };
      if (req.method === "GET") return json(res, 200, saved);
      if (req.method === "POST") {
        const nums = a => Array.isArray(a) && a.every(v => Number.isFinite(v));
        if ("model" in body) {
          const m = body.model;
          if (m !== null && (!m || !nums(m.w) || !Number.isFinite(m.bias) || !Array.isArray(m.H) || m.H.length !== m.w.length + 1
            || !m.H.every(nums) || !Array.isArray(m.names))) return json(res, 400, { error: "Modelo no válido" });
          saved.model = m;
        }
        if ("lessons" in body) {
          const l = body.lessons;
          if (!Array.isArray(l) || l.length > 1000 || !l.every(x => x && typeof x === "object" && typeof x.imageId === "string"))
            return json(res, 400, { error: "Planos enseñados no válidos" });
          saved.lessons = l;
        }
        await writeFile(WALL_MODEL_FILE + ".tmp", JSON.stringify(saved));
        await rename(WALL_MODEL_FILE + ".tmp", WALL_MODEL_FILE);
        return json(res, 200, { ok: true });
      }
    }

    if (p === "/api/image" && req.method === "POST") {
      const client = clients.get(url.searchParams.get("token") || "");
      if (!client) return json(res, 401, { error: "sesión caducada" });
      const mime = String(req.headers["content-type"] || "").split(";")[0];
      const ext = IMG_TYPES[mime];
      if (!ext) return json(res, 415, { error: "Formato de imagen no admitido" });
      const buf = await readBody(req);
      const id = randomBytes(8).toString("hex") + "." + ext;
      await writeFile(path.join(IMAGES, id), buf);
      return json(res, 200, { imageId: id, bytes: buf.length });
    }

    if (p.startsWith("/img/")) {
      const name = path.basename(p.slice(5));
      const file = path.join(IMAGES, name);
      if (!existsSync(file)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, {
        "Content-Type": MIME[path.extname(name)] || "application/octet-stream",
        "Content-Length": statSync(file).size,
        "Cache-Control": "public, max-age=31536000, immutable"
      });
      return createReadStream(file).pipe(res);
    }

    /* Estático */
    const rel = p === "/" ? "index.html" : decodeURIComponent(p).replace(/^\/+/, "");
    const file = path.join(PUBLIC, rel);
    if (!file.startsWith(PUBLIC + path.sep) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("No está aquí");
    }
    return serveStatic(req, res, file);
  } catch (err) {
    if (!res.headersSent) json(res, 500, { error: err.message });
    else res.end();
  }
};

const secure = !!(CERT && KEY);
const server = secure
  ? createSecureServer({ cert: readFileSync(path.resolve(CERT)), key: readFileSync(path.resolve(KEY)) }, handler)
  : createServer(handler);

/* ---------- Arranque ---------- */
/* Las direcciones de este ordenador en la red de casa. Se descartan las que
   no sirven a nadie: 169.254.x.x es un adaptador sin conexión (Windows se la
   pone sola) y las de máquinas virtuales. Primero va la típica del router. */
function lanIPs() {
  const out = [];
  for (const [name, list] of Object.entries(networkInterfaces())) {
    for (const net of list || []) {
      if (net.family !== "IPv4" && net.family !== 4) continue;
      if (net.internal || net.address.startsWith("169.254.")) continue;
      const virtual = /vmware|virtualbox|vbox|hyper-v|vethernet|wsl|docker|loopback|tailscale|zerotier|hamachi/i.test(name)
        || net.address.startsWith("192.168.56.");
      const rank = virtual ? 9 : net.address.startsWith("192.168.") ? 0 : net.address.startsWith("10.") ? 1
        : /^172\.(1[6-9]|2\d|3[01])\./.test(net.address) ? 2 : 5;
      out.push({ ip: net.address, rank });
    }
  }
  out.sort((x, y) => x.rank - y.rank);
  const real = out.filter(x => x.rank < 9);
  return (real.length ? real : out).map(x => x.ip);
}
function lanAddresses() {
  return lanIPs().map(ip => `${secure ? "https" : "http"}://${ip}:${PORT}`);
}
const lanIP = () => lanIPs()[0] || "";

/* ---------- Jugar por internet ----------
   Un túnel de Cloudflare («quick tunnel»): gratis, sin cuenta, sin abrir
   puertos en el router y con HTTPS, que además permite instalar Mesa como
   aplicación en los móviles. La dirección cambia cada vez que se arranca. */
let publicUrl = "";
function findCloudflared() {
  const local = path.join(HERE, process.platform === "win32" ? "cloudflared.exe" : "cloudflared");
  return existsSync(local) ? local : "cloudflared";
}
/* Estado del túnel, que también ve el DM en «Cómo entran mis jugadores» */
let tunnel = { state: INTERNET ? "opening" : "off", error: "" };

/* La dirección de un túnel rápido es «palabras-sueltas.trycloudflare.com».
   «api.trycloudflare.com» NO lo es: es a quien se le pide el túnel, y sale
   en los mensajes de error. */
const QUICK_URL = /https:\/\/(?!api\.)[a-z0-9]+(?:-[a-z0-9]+)+\.trycloudflare\.com/i;

function openTunnel(attempt = 1) {
  const bin = findCloudflared();
  const log = [];
  let child;
  tunnel = { state: "opening", error: "" };
  try {
    /* 127.0.0.1 y no «localhost»: en Windows «localhost» puede ir por IPv6 y
       Mesa escucha en IPv4, y el túnel daría error 502 aunque abriera. */
    child = spawn(bin, ["tunnel", "--no-autoupdate", "--url", `http://127.0.0.1:${PORT}`], { stdio: ["ignore", "pipe", "pipe"] });
  } catch { return tunnelMissing(); }
  child.on("error", err => { if (err.code === "ENOENT") tunnelMissing(); else tunnelFailed([err.message], attempt).catch(() => {}); });
  const seek = chunk => {
    const text = String(chunk);
    for (const line of text.split(/\r?\n/)) if (line.trim()) { log.push(line.trim()); if (log.length > 40) log.shift(); }
    const m = text.match(QUICK_URL);
    if (m && !publicUrl) {
      publicUrl = m[0];
      tunnel = { state: "open", error: "" };
      console.log(`
  ─────────────────────────────────────────────────────────
  Por internet   ${publicUrl}
  Cualquiera con esta dirección puede entrar como jugador:
  pásala solo a tu grupo. Cambia cada vez que abres Mesa.
  (Puede tardar unos segundos en responder la primera vez.)
  ─────────────────────────────────────────────────────────
`);
    }
  };
  child.stdout.on("data", seek);
  child.stderr.on("data", seek);
  child.on("exit", code => {
    const had = publicUrl;
    publicUrl = "";
    if (had) {
      console.log("  El túnel de internet se ha cerrado" + (code ? ` (código ${code})` : "") + ". Reintentando…");
      setTimeout(() => openTunnel(1), 3000);
    } else if (code !== null) tunnelFailed(log, attempt).catch(() => {});
  });
  process.on("exit", () => { try { child.kill(); } catch {} });
}

/* No se abrió: se dice por qué, con lo que haya contado cloudflared, y se
   reintenta solo cuando tiene pinta de ser pasajero. */
/* ¿Es el DNS? Se pregunta por el mismo nombre al DNS de este ordenador (el
   del router o del operador, o el que imponga el antivirus) y a dos públicos.
   Si el de casa no lo da y los públicos sí, alguien lo está filtrando. */
const TUNNEL_HOST = "api.trycloudflare.com";
async function dnsCheck() {
  const local = await dns.lookup(TUNNEL_HOST, { family: 4 }).then(() => true, () => false);
  if (local) return "ok";
  const pub = new dns.Resolver({ timeout: 3000, tries: 1 });
  pub.setServers(["1.1.1.1", "8.8.8.8"]);
  const outside = await pub.resolve4(TUNNEL_HOST).then(list => list.length > 0, () => false);
  return outside ? "filtered" : "offline";
}

const DNS_HELP = `
  Tu conexión no deja buscar ${TUNNEL_HOST}: el DNS de este ordenador
  (el del router o del operador) no da su dirección, y los DNS públicos sí.
  Es un filtro de seguridad que bloquea los túneles de Cloudflare: la
  «navegación segura» del operador o del router, la protección web del
  antivirus o un bloqueador como AdGuard o NextDNS.

  Arreglo (Windows 11): Configuración → Red e Internet → Wi-Fi (o Ethernet)
  → Propiedades de hardware → Asignación de servidor DNS → Editar →
  Manual → IPv4: DNS preferido 1.1.1.1 y alternativo 1.0.0.1 → Guardar.
  Luego, en una ventana: ipconfig /flushdns  y vuelve a abrir Mesa.
  (Windows 10: Panel de control → Centro de redes → Cambiar configuración
  del adaptador → tu wifi → Propiedades → Protocolo IPv4 → Usar estas
  direcciones DNS.)

  Si así tampoco va, es el antivirus o el router: desactiva su protección
  web o «navegación segura» mientras jugáis, o prueba compartiendo datos
  desde el móvil para confirmarlo.
`;

/* No se abrió: se dice por qué, con lo que haya contado cloudflared, y se
   reintenta solo cuando tiene pinta de ser pasajero. */
async function tunnelFailed(log, attempt) {
  const text = log.join("\n");
  const errors = log.filter(l => /\b(ERR|error|failed)\b/i.test(l)).slice(-4);
  let why, help = "", retry = attempt < 4;
  if (/429|too many requests/i.test(text)) why = "Cloudflare limita cuántos túneles rápidos se piden seguidos. Suele bastar con esperar un minuto.";
  else if (/config|ingress|credentials/i.test(text)) why = "cloudflared ha encontrado un archivo de configuración propio (carpeta .cloudflared de tu usuario) que no deja abrir el túnel rápido. Renómbralo o bórralo y vuelve a probar.";
  else if (/lookup|no such host|getaddrinfo|name resolution/i.test(text)) {
    const verdict = await dnsCheck();
    if (verdict === "filtered") {
      why = "Tu DNS (el del router, el operador o el antivirus) bloquea los túneles de Cloudflare. Cambia el DNS a 1.1.1.1: la ventana del servidor explica cómo.";
      help = attempt === 1 ? DNS_HELP : "";
      retry = false;          // no se arregla solo: hace falta cambiar el DNS
    } else if (verdict === "offline") {
      why = "Este ordenador no consigue resolver nombres de internet: comprueba la conexión.";
    } else {
      why = "Este ordenador sí encuentra a Cloudflare, pero a cloudflared se lo impiden: suele ser el antivirus filtrando ese programa. Añade cloudflared a sus excepciones (o desactiva su protección web mientras jugáis).";
    }
  }
  else if (/dial tcp|i\/o timeout|timeout|connection refused|connectex|network is unreachable|tls|certificate|x509/i.test(text)) why = "No se llega a Cloudflare desde este ordenador. Suele ser el antivirus o el cortafuegos bloqueando cloudflared, una red que lo prohíbe (trabajo, universidad, residencia) o falta de conexión.";
  else why = "cloudflared se ha cerrado sin dar una dirección.";
  tunnel = { state: retry ? "opening" : "failed", error: why };
  console.log(`
  No se ha podido abrir el túnel de internet (intento ${attempt} de 4).
  ${why}
${errors.length ? "\n  Lo que dice cloudflared:\n" + errors.map(l => "    " + l.slice(0, 280)).join("\n") + "\n" : ""}${help}`);
  if (retry) {
    const wait = [0, 5, 20, 60][attempt];
    console.log(`  Se vuelve a intentar en ${wait} segundos. Mesa sigue funcionando en tu wifi.\n`);
    setTimeout(() => openTunnel(attempt + 1), wait * 1000);
  } else {
    console.log(`  Mesa sigue funcionando en tu wifi. Cuando lo arregles, vuelve a abrir «Jugar por internet».
`);
  }
}
function tunnelMissing() {
  tunnel = { state: "failed", error: "Falta el programa cloudflared en este ordenador." };
  console.log(`
  Para jugar por internet falta «cloudflared» (gratis, de Cloudflare):
    Windows   winget install --id Cloudflare.cloudflared
    Mac       brew install cloudflared
    Linux     https://github.com/cloudflare/cloudflared/releases
  O descárgalo y déjalo en esta misma carpeta. Mientras, Mesa sigue
  funcionando en tu wifi con la dirección de arriba.
`);
}

await boot();
setInterval(() => engine.purge(), 3600 * 1000).unref();
server.listen(PORT, "0.0.0.0", () => {
  const ip = lanIP();
  const scheme = secure ? "https" : "http";
  console.log(`
  Mesa está en marcha${secure ? " (HTTPS)" : ""}.

  Tú (DM)        ${scheme}://localhost:${PORT}
  Tus jugadores  ${ip ? `${scheme}://${ip}:${PORT}` : "(este ordenador no está conectado a ninguna red)"}
  Código del DM  ${engine.pin}

  Los datos se guardan en ${DATA}
  Para parar: Ctrl+C
`);
  if (INTERNET) openTunnel();
});

/* Al cerrar (Ctrl+C, o el sistema parando el proceso) se guarda lo último */
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, async () => {
    clearTimeout(saveTimer);
    try { await persist(); } catch (e) { console.error("No se pudo guardar:", e.message); }
    process.exit(0);
  });
}
