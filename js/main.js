/* Puerta de entrada: quién eres y con qué personaje juegas. */

import { $, el, esc, toast, initials, imgURL } from "./util.js";
import { icon, withIcon } from "./icons.js";
import { store, savedSession, forgetSession, join, lobby, ping, connect, onState, DEMO } from "./net.js";
import { startI18n, langPicker } from "./i18n.js";

const SHARED = typeof SharedWorker === "function";

const app = () => document.getElementById("app");

/* El papel puede venir por la dirección (?role=screen). Si viene, manda: cada
   pestaña entra con el suyo y no hereda la sesión de otra. */
const askedRole = () => {
  const r = new URLSearchParams(location.search).get("role");
  return ["dm", "player", "screen"].includes(r) ? r : null;
};

async function boot() {
  const wanted = askedRole();
  const saved = savedSession(wanted);
  if (saved && (!wanted || saved.role === wanted)) {
    store.session = saved;
    const alive = await ping(saved.token);
    if (alive) return start(saved.role);
    forgetSession(saved.role);
  }
  /* La tele no tiene nada que elegir: si la abre el DM con ?role=screen,
     entra sola, que es lo cómodo cuando la ventana ya está en el proyector. */
  if (wanted === "screen") {
    try {
      const data = await join({ name: "Pantalla", role: "screen" });
      return start(data.role);
    } catch { /* si falla, se enseña la entrada normal */ }
  }
  gate(wanted);
}

async function start(role) {
  let mount;
  if (role === "dm") mount = (await import("./dm.js")).mountDM;
  else if (role === "screen") mount = (await import("./screen.js")).mountScreen;
  else mount = (await import("./player.js")).mountPlayer;

  const once = new Promise(resolve => onState(resolve));
  connect();
  await once;                       // no se pinta nada hasta tener el estado
  app().className = "";
  mount(app());
}

async function gate(wanted) {
  let info = await lobby().catch(() => ({ players: [], title: "Mesa", offline: true }));
  let role = wanted || "player";
  let charId = null;

  app().className = "gate";
  app().innerHTML = `
    <div class="panel">
      <div class="gate-logo">${icon("shield", 30)}</div>
      <h1>Mesa</h1>
      <p class="sub">${esc(info.title || "Partida de D&D")}</p>
      ${DEMO ? `<div class="demo-note">
        <b>Versión de prueba</b>
        <p>Todo corre en este navegador, sin servidor. Entra como <b>DM</b> aquí y abre la <b>Pantalla</b> en otra pestaña o ventana: las dos juegan la misma partida y puedes proyectar esa pestaña. ${SHARED ? "" : "En este navegador cada pestaña lleva su propia partida."}</p>
        <p>Para jugar con los móviles de tus jugadores hace falta el servidor: <a href="https://github.com/aleexnager/DnD/archive/refs/heads/main.zip" rel="noopener">descargar Mesa</a> y abrir <i>Abrir Mesa</i>.</p>
      </div>` : ""}

      ${info.locked ? `<div class="notice">${icon("lock", 16)}<span>La mesa está cerrada: solo entra el DM. Pídele que la abra.</span></div>` : ""}
      <div class="roles" role="radiogroup" aria-label="Cómo entras">
        <button data-role="dm" aria-pressed="false">${icon("crown", 22)}<b>DM</b><small>llevas la partida</small></button>
        <button data-role="player" aria-pressed="true">${icon("user", 22)}<b>Jugador</b><small>llevas un personaje</small></button>
        <button data-role="screen" aria-pressed="false">${icon("tv", 22)}<b>Pantalla</b><small>la tele de la mesa</small></button>
      </div>

      <label class="field"><span>Tu nombre</span>
        <input id="name" maxlength="24" placeholder="Como te llaman en la mesa" autocomplete="nickname"></label>

      <label class="field hidden" id="pinField"><span>Código del DM</span>
        <input id="pin" inputmode="numeric" placeholder="Sale en la ventana del servidor"></label>

      <div id="picker"></div>

      <p class="form-error hidden" id="gateError" role="alert"></p>
      <button class="btn primary go" id="go">${withIcon("next", "Entrar a la partida")}</button>
      <p class="prose hint" id="hint"></p>
      <div class="install hidden" id="install"></div>
      <div class="gate-lang" id="gateLang"></div>
    </div>`;

  $("#gateLang").appendChild(langPicker());
  /* Por qué se ha vuelto a la entrada, si no ha sido por gusto */
  try {
    const why = sessionStorage.getItem("mesa.notice");
    if (why) { sessionStorage.removeItem("mesa.notice"); setTimeout(() => fail(why), 0); }
  } catch {}
  if (info.offline && !DEMO) toast("No se encuentra el servidor de la partida. ¿Está abierta la ventana de Mesa?", "bad");
  paintInstall();

  const nameInput = $("#name");
  nameInput.value = localStorage.getItem("mesa.name") || "";

  const paint = () => {
    document.querySelectorAll("[data-role]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.role === role)));
    $("#pinField").classList.toggle("hidden", role !== "dm" || DEMO);
    $("#hint").textContent = role === "dm"
      ? (DEMO ? "En la versión de prueba no hace falta código." : "El código aparece en la ventana donde arrancaste Mesa.")
      : role === "screen"
        ? "Ponla en la tele o el proyector. Doble clic para pantalla completa."
        : "Elige tu personaje, o entra sin él y créalo desde dentro.";
    /* Un personaje que lleva alguien conectado no se puede elegir: sale
       apagado y con el nombre de quien lo lleva. */
    if (charId && (info.players || []).some(p => p.id === charId && p.taken)) charId = null;
    $("#picker").innerHTML = role !== "player" ? "" : `
      <p class="field-label">Tu personaje</p>
      <div class="pick-list">
        ${(info.players || []).map(p => `
          <button class="pick ${p.taken ? "taken" : ""}" data-char="${p.id}" aria-pressed="${charId === p.id}" ${p.taken ? "disabled" : ""}>
            ${p.avatarId ? `<img class="avatar sm" src="${imgURL(p.avatarId)}" alt="">` : `<span class="avatar sm" style="--tone:${esc(p.color)}">${initials(p.name)}</span>`}
            <span class="pick-text"><b>${esc(p.name)}</b><small>${esc([p.className, "nivel " + p.level].filter(Boolean).join(" · "))}</small></span>
            ${p.taken ? `<span class="pick-tag">${icon("user", 12)}${esc(p.takenBy || "ocupado")}</span>` : charId === p.id ? `<span class="pick-check">${icon("check", 16)}</span>` : ""}
          </button>`).join("")}
        <button class="pick new" data-char="" aria-pressed="${charId === null}">
          <span class="avatar sm ghost">${icon("userPlus", 16)}</span>
          <span class="pick-text"><b>Todavía no tengo</b><small>lo creas al entrar</small></span>
          ${charId === null ? `<span class="pick-check">${icon("check", 16)}</span>` : ""}
        </button>
      </div>`;
  };
  paint();

  app().addEventListener("click", e => {
    const roleBtn = e.target.closest("[data-role]");
    if (roleBtn) { role = roleBtn.dataset.role; paint(); return; }
    const charBtn = e.target.closest("[data-char]");
    if (charBtn && !charBtn.disabled) { charId = charBtn.dataset.char || null; paint(); }
  });

  /* Los errores se dicen junto al botón, que es donde se está mirando */
  const fail = msg => {
    const box = $("#gateError");
    box.innerHTML = `${icon("info", 16)}<span>${esc(msg)}</span>`;
    box.classList.remove("hidden");
  };
  let busy = false;
  $("#go").addEventListener("click", async () => {
    if (busy) return;
    $("#gateError").classList.add("hidden");
    const name = nameInput.value.trim() || (role === "dm" ? "DM" : role === "screen" ? "Pantalla" : "");
    if (!name) { nameInput.focus(); return fail("Escribe tu nombre para entrar."); }
    localStorage.setItem("mesa.name", name);
    busy = true;
    $("#go").disabled = true;
    try {
      const data = await join({ name, role, pin: $("#pin").value.trim(), charId });
      await start(data.role);
    } catch (err) {
      fail(err.message);
      /* Lo que cambió mientras elegías (alguien cogió ese personaje) se repinta */
      info = await lobby().catch(() => info);
      paint();
    } finally {
      busy = false;
      const go = $("#go");
      if (go) go.disabled = false;
    }
  });

  app().addEventListener("keydown", e => { if (e.key === "Enter") $("#go").click(); });
}

/* ---------- Instalar como aplicación ----------
   Chrome y Edge avisan de que se puede instalar; Safari en iPhone no, así
   que ahí se explica el gesto. Y sin HTTPS (fuera de este ordenador) el
   navegador no deja instalar nada: se dice en vez de enseñar un botón que no
   haría nada. */
let installPrompt = null;
const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  installPrompt = e;
  paintInstall();
});
window.addEventListener("appinstalled", () => {
  installPrompt = null;
  paintInstall();
  toast("Mesa ya está instalada", "good");
});

function paintInstall() {
  const box = document.getElementById("install");
  if (!box) return;
  let html = "";
  if (standalone()) html = "";
  else if (installPrompt) html = `<button class="btn" id="installBtn" style="width:100%">Instalar Mesa como aplicación</button>`;
  else if (isIOS() && window.isSecureContext) html = `<p class="prose" style="font-size:12px;margin:0">Para tenerla como aplicación: botón <b>Compartir</b> → <b>Añadir a pantalla de inicio</b>.</p>`;
  else if (!window.isSecureContext) html = `<p class="prose" style="font-size:12px;margin:0">Para instalar Mesa como aplicación en este aparato hace falta entrar por HTTPS. Mira «Instalar como aplicación» en el README.</p>`;
  box.innerHTML = html;
  box.classList.toggle("hidden", !html);
  const btn = document.getElementById("installBtn");
  if (btn) btn.addEventListener("click", async () => {
    const ev = installPrompt;
    installPrompt = null;
    if (!ev) return;
    ev.prompt();
    await ev.userChoice.catch(() => null);
    paintInstall();
  });
}

if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

startI18n();
boot();
