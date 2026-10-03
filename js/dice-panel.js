/* Dados, charla y registro de la partida. Lo ven todos: cuando alguien tira,
   sale en la pantalla de los demás. El DM además puede tirar en secreto y
   cualquiera puede susurrarle sin que se entere la mesa. */

import { el, on, esc, hhmm, toast, modal } from "./util.js";
import { icon, withIcon } from "./icons.js";
import { roll, detail } from "./dice.js";
import { store, addLog, op } from "./net.js";

let mode = "normal";
let secret = false;
let filter = "todo";
let whisperTo = [];      // identificadores de ficha, y "dm" para el máster

export function throwDice(formula, { label = "", mode: m = mode, secret: s = false } = {}) {
  const result = roll(formula, m);
  if (!result) { toast("No entiendo esa fórmula. Prueba con 1d20+3", "bad"); return null; }
  addLog({
    kind: "roll",
    label,
    formula: result.formula,
    mode: result.mode,
    total: result.total,
    detail: detail(result),
    crit: result.crit,
    fumble: result.fumble,
    secret: !!s
  });
  return result;
}

export function tellTable(text, { secret: s = false } = {}) {
  addLog({ kind: "event", text, secret: !!s });
}

export function say(text, to = []) {
  const clean = String(text || "").trim();
  if (!clean) return;
  op("chat", { text: clean, to });
}

/* A quién se puede susurrar: al DM y a cada personaje que no seas tú. */
function audience() {
  const doc = store.doc;
  const me = store.session || {};
  const list = [];
  if (me.role !== "dm") list.push({ id: "dm", name: "DM" });
  for (const c of (doc ? doc.chars : [])) {
    if (c.kind !== "pc" || c.id === me.charId) continue;
    list.push({ id: c.id, name: c.name, color: c.color });
  }
  return list;
}

export function dicePanel({ isDM = false } = {}) {
  const node = el(`
    <aside class="dock" id="dock">
      <header>
        <h2>${icon("dice", 18)}<span>Dados y mesa</span></h2>
        <span class="spacer"></span>
        ${isDM ? `<button class="icon-btn" data-clear title="Vaciar el registro">${icon("trash")}</button>` : ""}
        <button class="icon-btn" data-toggle title="Abrir o cerrar">${icon("up")}</button>
      </header>
      <div class="dice-pad">
        ${[4, 6, 8, 10, 12, 20, 100].map(d => `<button class="die" data-die="${d}">d${d}</button>`).join("")}
        <button class="die" data-die="20" data-many="2">2d20</button>
      </div>
      <div class="adv">
        <button data-mode="dis" aria-pressed="false">Desventaja</button>
        <button data-mode="normal" aria-pressed="true">Normal</button>
        <button data-mode="adv" aria-pressed="false">Ventaja</button>
        ${isDM ? `<button data-secret aria-pressed="false" title="En secreto: nadie más lo ve" aria-label="En secreto">${icon("eyeOff", 15)}<span>Secreto</span></button>` : ""}
      </div>
      <form class="dice-form">
        <input name="f" placeholder="1d20+5, 2d6, 8d6…" aria-label="Fórmula de dados" autocomplete="off">
        <button class="btn primary sm" type="submit">${withIcon("dice", "Tirar", 16)}</button>
      </form>
      <div class="log-tabs">
        <button data-filter="todo" aria-pressed="true">Todo</button>
        <button data-filter="roll" aria-pressed="false">Tiradas</button>
        <button data-filter="chat" aria-pressed="false">Charla</button>
      </div>
      <div class="log" id="log"></div>
      <div class="whisper-to hidden" id="whisperTo"></div>
      <form class="chat-form">
        <button type="button" class="icon-btn" data-whisper title="Susurrar a alguien en concreto" aria-pressed="false">${icon("whisper")}</button>
        <input name="t" placeholder="Escribe a la mesa…" aria-label="Mensaje" autocomplete="off" maxlength="500">
        <button class="btn sm" type="submit" title="Enviar" aria-label="Enviar">${icon("send", 16)}</button>
      </form>
    </aside>`);

  node.querySelector(".dice-form").addEventListener("submit", e => {
    e.preventDefault();
    const input = e.target.f;
    if (throwDice(input.value.trim(), { secret })) input.select();
  });

  node.querySelector(".chat-form").addEventListener("submit", e => {
    e.preventDefault();
    const input = e.target.t;
    say(input.value, whisperTo);
    input.value = "";
  });

  const wBtn = node.querySelector("[data-whisper]");
  const paintTo = () => {
    const bar = node.querySelector("#whisperTo");
    const people = audience().filter(p => whisperTo.includes(p.id));
    bar.classList.toggle("hidden", !people.length);
    bar.innerHTML = people.length
      ? `<span>En privado a</span>${people.map(p => `<button class="tagx" data-untag="${p.id}">${esc(p.name)} ${icon("close", 12)}</button>`).join("")}`
      : "";
    wBtn.setAttribute("aria-pressed", String(people.length > 0));
    node.querySelector(".chat-form input").placeholder = people.length
      ? `Solo lo leerán ${people.map(p => p.name).join(", ")}…`
      : "Escribe a la mesa…";
  };
  on(node, "click", "[data-untag]", (e, b) => { whisperTo = whisperTo.filter(x => x !== b.dataset.untag); paintTo(); });
  wBtn.addEventListener("click", () => openWhisperPicker(paintTo));
  paintTo();

  on(node, "click", "[data-die]", (e, b) => throwDice((b.dataset.many || 1) + "d" + b.dataset.die, { secret }));

  on(node, "click", "[data-mode]", (e, b) => {
    mode = b.dataset.mode;
    node.querySelectorAll("[data-mode]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  });

  on(node, "click", "[data-filter]", (e, b) => {
    filter = b.dataset.filter;
    node.querySelectorAll("[data-filter]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    renderLog(node.querySelector("#log"));
  });

  const secretBtn = node.querySelector("[data-secret]");
  if (secretBtn) secretBtn.addEventListener("click", () => {
    secret = !secret;
    secretBtn.setAttribute("aria-pressed", String(secret));
  });

  node.querySelector("[data-toggle]").addEventListener("click", () => node.classList.toggle("open"));
  node.querySelector("header").addEventListener("click", e => {
    if (window.innerWidth <= 1080 && !e.target.closest("button")) node.classList.toggle("open");
  });
  const clear = node.querySelector("[data-clear]");
  if (clear) clear.addEventListener("click", () => op("log.clear"));

  return node;
}

/* Quién va a leerlo: se eligen uno o varios; sin nadie marcado, lo lee la mesa. */
function openWhisperPicker(done) {
  const people = audience();
  if (!people.length) return toast("No hay nadie más en la mesa todavía");
  const body = el(`<div>
    <div class="cond-grid">
      ${people.map(p => `<label><input type="checkbox" value="${p.id}" ${whisperTo.includes(p.id) ? "checked" : ""}>${esc(p.name)}</label>`).join("")}
    </div>
    <p class="prose" style="font-size:12px;margin-top:10px">
      Sin marcar a nadie, el mensaje lo lee toda la mesa. Lo que susurres no llega
      siquiera al navegador de los demás, y la pantalla de la tele nunca lo enseña.
    </p>
  </div>`);
  modal({
    title: "¿A quién se lo dices?", body, wide: true,
    actions: [
      { label: "A toda la mesa", run: host => { whisperTo = []; done(); } },
      { label: "Susurrar", tone: "primary", run: host => {
        whisperTo = [...host.querySelectorAll("input:checked")].map(i => i.value);
        done();
      } }
    ]
  });
}

export const currentMode = () => mode;
export const isSecret = () => secret;

export function renderLog(host) {
  const doc = store.doc;
  if (!host || !doc) return;
  const keep = e => filter === "todo" ? true
    : filter === "chat" ? e.kind === "chat"
    : e.kind === "roll" || e.kind === "attack";
  const stick = host.scrollHeight - host.scrollTop - host.clientHeight < 60;

  host.innerHTML = doc.log.filter(keep).slice(-70).map(e => {
    const cls = [e.kind, e.crit ? "crit" : "", e.fumble ? "fumble" : "", e.secret ? "secret" : ""].join(" ");
    if (e.kind === "chat") {
      const mine = store.session && e.actor === store.session.name;
      const who = (e.names || []).join(", ");
      return `<div class="entry chat ${e.private ? "secret" : ""}">
        <div class="top"><span class="who">${esc(e.actor || "")}</span>
          ${e.private ? `<span class="detail">${mine ? "solo a " + esc(who) : "en privado"}</span>` : ""}
          <span class="time">${hhmm(e.ts)}</span></div>
        <p class="said">${esc(e.text)}</p></div>`;
    }
    if (e.kind === "note") {
      return `<div class="entry event">
        <div class="top"><span class="who">${esc(e.actor || "")}</span><span class="time">${hhmm(e.ts)}</span></div>
        <p>${esc(e.text)}</p></div>`;
    }
    if (e.kind === "event") {
      return `<div class="entry ${cls}">
        <div class="top"><span class="who">${esc(e.actor || "")}</span><span class="time">${hhmm(e.ts)}</span></div>
        <p>${esc(e.text)}</p></div>`;
    }
    if (e.kind === "attack") {
      return `<div class="entry ${cls}">
        <div class="top"><span class="who">${esc(e.actor || "")}</span>
          <span class="detail">${esc(e.label || "")}</span><span class="time">${hhmm(e.ts)}</span></div>
        <p>${esc(e.text)}</p>
        <div class="detail">${esc(e.detail || "")}</div></div>`;
    }
    const tag = e.mode === "adv" ? " con ventaja" : e.mode === "dis" ? " con desventaja" : "";
    return `<div class="entry ${cls}">
      <div class="top">
        <span class="who">${esc(e.actor || "")}</span>
        <span class="detail">${esc(e.label || e.formula)}${tag}${e.secret ? " · en secreto" : ""}</span>
        <span class="time">${hhmm(e.ts)}</span>
      </div>
      <div><span class="result tnum">${e.total}</span>
        <span class="detail">${esc(e.detail)}</span>
        ${e.crit ? '<span class="detail"> · crítico</span>' : ""}${e.fumble ? '<span class="detail"> · pifia</span>' : ""}
      </div>
    </div>`;
  }).join("");

  if (stick) host.scrollTop = host.scrollHeight;
}
