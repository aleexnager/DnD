/* Voz en la mesa.

   Cada aparato habla directamente con los demás (WebRTC): el audio no pasa
   por el ordenador del DM, que solo hace de presentador. Para eso sirven
   /api/rtc y el evento «rtc» del flujo: la oferta, la respuesta y las rutas
   de red de cada uno. Con cuatro o cinco personas, que es una mesa, una red
   «todos con todos» va de sobra.

   Quién llama a quién: siempre el de identificador menor. Así dos aparatos
   nunca se llaman a la vez.

   El navegador solo deja usar el micro en una conexión segura: con el
   enlace https de «Jugar por internet», o en el propio ordenador del DM
   (localhost). Por la wifi con http://192.168… no se puede, y se explica. */

import { store, op, onPresence, onRtc, onStatus, sendRtc, DEMO } from "./net.js";
import { el, esc, initials, modal, toast } from "./util.js";
import { icon } from "./icons.js";

const ICE = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];
const SPEAKING = 0.035;   // nivel a partir del cual alguien «está hablando»

let local = null;          // MediaStream del micro
let muted = false;
let active = false;
const peers = new Map();   // id -> { pc, audio, initiator, queue, state, level }
let audioCtx = null;
const meters = new Map();  // id ("me" o el de otro) -> { analyser, data }
let widgets = [];
let meterTimer = null;
let wired = false;

const myId = () => store.session && store.session.id;
const nameOf = id => (store.presence.find(p => p.id === id) || {}).name || "Alguien";

/* ---------- La pieza de la cabecera ---------- */
export function voiceWidget() {
  const host = el('<div class="voice"></div>');
  if (DEMO || !store.session || store.session.role === "screen") {
    host.classList.add("hidden");
    return host;
  }
  widgets.push(host);
  wire();
  host.addEventListener("click", e => {
    const b = e.target.closest("[data-voice]");
    if (!b) return;
    const what = b.dataset.voice;
    if (what === "join") start();
    else if (what === "leave") stop();
    else if (what === "mute") setMuted(!muted);
  });
  paint();
  return host;
}

function wire() {
  if (wired) return;
  wired = true;
  onPresence(() => { sync(); paint(); });
  onRtc(msg => receive(msg).catch(() => {}));
  /* Si se corta la conexión, el servidor da la voz por cerrada: al volver se
     reabre sola. */
  onStatus(ok => { if (ok && active) op("voice.set", { on: true }); });
  addEventListener("pagehide", () => { if (active) stop(true); });
}

function paint() {
  widgets = widgets.filter(w => w.isConnected || !w.dataset.mounted);
  for (const w of widgets) {
    w.dataset.mounted = "1";
    w.classList.toggle("on", active);
    if (!active) {
      w.innerHTML = `<button class="btn sm" data-voice="join" title="Hablar por voz con la mesa">${icon("headset", 17)}<span class="lbl">Voz</span></button>`;
      continue;
    }
    const others = store.presence.filter(p => p.voice && p.id !== myId() && p.role !== "screen");
    const chips = others.map(p => {
      const peer = peers.get(p.id);
      const state = peer ? peer.state : "waiting";
      const tip = state === "connected" ? p.name : state === "failed" ? `${p.name}: no se ha podido conectar` : `${p.name}: conectando…`;
      return `<span class="vchip ${state}" data-vid="${esc(p.id)}" title="${esc(tip)}">${esc(initials(p.name))}</span>`;
    }).join("");
    w.innerHTML = `
      <button class="icon-btn vmute ${muted ? "is-muted" : ""}" data-voice="mute" data-vid="me"
        title="${muted ? "Activar el micro" : "Silenciar el micro"}" aria-label="${muted ? "Activar el micro" : "Silenciar el micro"}">${icon(muted ? "micOff" : "mic", 18)}</button>
      <span class="vchips">${chips || '<span class="vnone">Solo tú</span>'}</span>
      <button class="icon-btn" data-voice="leave" title="Salir de la voz" aria-label="Salir de la voz">${icon("close", 16)}</button>`;
  }
}

/* ---------- Entrar y salir ---------- */
async function start() {
  if (active) return;
  if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.RTCPeerConnection) {
    insecureHelp();
    return;
  }
  try {
    local = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
  } catch (e) {
    toast(e && e.name === "NotAllowedError"
      ? "Sin permiso para el micro. Actívalo en el candado de la barra de direcciones."
      : "No se ha encontrado ningún micro.", "bad");
    return;
  }
  active = true;
  muted = false;
  ensureAudio();
  addMeter("me", local);
  op("voice.set", { on: true });
  paint();
  toast("Estás en la voz de la mesa");
}

function stop(silent = false) {
  if (!active) return;
  active = false;
  for (const id of [...peers.keys()]) drop(id);
  if (local) local.getTracks().forEach(t => t.stop());
  local = null;
  meters.delete("me");
  if (!silent) op("voice.set", { on: false });
  paint();
}

function setMuted(value) {
  muted = value;
  if (local) local.getAudioTracks().forEach(t => { t.enabled = !muted; });
  paint();
}

function insecureHelp() {
  modal({
    title: "La voz necesita una conexión segura",
    body: `<p>El navegador solo deja usar el micro en páginas seguras (https) o en el propio ordenador.</p>
      <ul class="plain">
        <li>Por internet: entrad todos con el enlace https de «Jugar por internet». Funciona en todos los aparatos, también en la misma wifi.</li>
        <li>En el ordenador del DM funciona con http://localhost.</li>
        <li>Por la wifi, con una dirección http://192.168…, el navegador lo bloquea.</li>
      </ul>`,
    actions: [{ label: "Entendido", tone: "primary" }]
  });
}

/* ---------- Con quién hay que estar conectado ---------- */
function sync() {
  if (!active) return;
  const me = store.presence.find(p => p.id === myId());
  const want = new Set(store.presence
    .filter(p => p.voice && p.id !== myId() && p.role !== "screen")
    .map(p => p.id));
  for (const id of [...peers.keys()]) if (!want.has(id)) drop(id);
  // Se llama solo cuando el servidor ya sabe que estoy dentro: si no, no reenvía
  if (!me || !me.voice) return;
  for (const id of want) if (!peers.has(id) && myId() < id) call(id);
}

function makePeer(id, initiator) {
  const pc = new RTCPeerConnection({ iceServers: ICE });
  const audio = document.createElement("audio");
  audio.autoplay = true;
  audio.setAttribute("playsinline", "");
  audio.className = "voice-out";
  document.body.appendChild(audio);
  const peer = { pc, audio, initiator, queue: [], state: "connecting" };
  peers.set(id, peer);
  if (local) local.getTracks().forEach(t => pc.addTrack(t, local));
  pc.onicecandidate = e => { if (e.candidate) sendRtc(id, { ice: e.candidate.toJSON() }); };
  pc.ontrack = e => {
    const stream = e.streams[0] || new MediaStream([e.track]);
    audio.srcObject = stream;
    audio.play().catch(() => {});
    addMeter(id, stream);
  };
  pc.onconnectionstatechange = () => {
    const s = pc.connectionState;
    peer.state = s === "connected" ? "connected" : s === "failed" ? "failed" : peer.state;
    if (s === "failed") {
      toast(`No se ha podido conectar la voz con ${nameOf(id)}. Puede que su red lo impida.`, "bad");
      /* Se vuelve a intentar una vez al rato: a veces la red se lo piensa */
      if (initiator) setTimeout(() => { if (active && peers.get(id) === peer) { drop(id); sync(); } }, 8000);
    }
    paint();
  };
  return peer;
}

async function call(id) {
  const peer = makePeer(id, true);
  const offer = await peer.pc.createOffer();
  await peer.pc.setLocalDescription(offer);
  await sendRtc(id, { sdp: peer.pc.localDescription.toJSON() });
}

async function receive({ from, data }) {
  if (!active || !data) return;
  let peer = peers.get(from);
  if (data.sdp && data.sdp.type === "offer") {
    if (peer) drop(from);            // la otra parte ha vuelto a empezar
    peer = makePeer(from, false);
    await peer.pc.setRemoteDescription(data.sdp);
    const answer = await peer.pc.createAnswer();
    await peer.pc.setLocalDescription(answer);
    await sendRtc(from, { sdp: peer.pc.localDescription.toJSON() });
    flushIce(peer);
    paint();
    return;
  }
  if (!peer) return;
  if (data.sdp && data.sdp.type === "answer") {
    await peer.pc.setRemoteDescription(data.sdp);
    flushIce(peer);
    return;
  }
  if (data.ice) {
    if (!peer.pc.remoteDescription) peer.queue.push(data.ice);
    else await peer.pc.addIceCandidate(data.ice).catch(() => {});
  }
}

function flushIce(peer) {
  for (const c of peer.queue.splice(0)) peer.pc.addIceCandidate(c).catch(() => {});
}

function drop(id) {
  const peer = peers.get(id);
  if (!peer) return;
  peers.delete(id);
  meters.delete(id);
  try { peer.pc.close(); } catch {}
  peer.audio.srcObject = null;
  peer.audio.remove();
}

/* ---------- Quién está hablando ---------- */
function ensureAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  if (!meterTimer) meterTimer = setInterval(measure, 160);
}

function addMeter(id, stream) {
  if (!audioCtx) return;
  try {
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    audioCtx.createMediaStreamSource(stream).connect(analyser);   // solo se mide: no suena dos veces
    meters.set(id, { analyser, data: new Float32Array(analyser.fftSize) });
  } catch { /* sin medidor no pasa nada */ }
}

function measure() {
  if (!active) return;
  for (const [id, m] of meters) {
    m.analyser.getFloatTimeDomainData(m.data);
    let sum = 0;
    for (const v of m.data) sum += v * v;
    const loud = Math.sqrt(sum / m.data.length) > SPEAKING && !(id === "me" && muted);
    for (const w of widgets) {
      const node = w.querySelector(`[data-vid="${CSS.escape(id)}"]`);
      if (node) node.classList.toggle("speaking", loud);
    }
  }
}
