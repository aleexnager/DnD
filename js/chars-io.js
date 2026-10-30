/* Personajes de una campaña a otra.

   Exportar: uno o varios en un archivo .json, con la ficha entera (conjuros,
   equipo, ataques, rasgos, notas) y el retrato dentro, porque las imágenes
   viven en cada partida y en otra no existirían.

   Importar: se elige el archivo, se marca a quién traer y entran como fichas
   nuevas (con su id nuevo, sin sitio en el mapa), así que nunca pisan a nadie
   de la partida. Un jugador puede traer la suya y se queda con ella. */

import { el, esc, toast, modal, imgURL, initials } from "./util.js";
import { normalizeChar } from "./schema.js";
import { op, uploadImage, store } from "./net.js";

export const FILE_KIND = "mesa-personajes";

/* Lo que no viaja: dónde estaba, quién la llevaba y lo que la party sabía */
const LOCAL = ["mapId", "mx", "my", "claimedBy", "discovered", "lastSeen", "hidden", "initiative", "used", "condMeta"];

async function imageData(id) {
  if (!id) return "";
  try {
    const blob = await (await fetch(imgURL(id))).blob();
    return await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
  } catch { return ""; }
}

export async function exportChars(list, name) {
  if (!list.length) return toast("Elige al menos un personaje", "bad");
  const chars = [];
  for (const c of list) {
    const copy = { ...c };
    LOCAL.forEach(k => delete copy[k]);
    copy.avatar = await imageData(c.avatarId);
    delete copy.avatarId;
    chars.push(copy);
  }
  const blob = new Blob([JSON.stringify({ mesa: FILE_KIND, version: 1, exported: new Date().toISOString(), chars }, null, 1)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const base = name || (list.length === 1 ? list[0].name : `personajes-${list.length}`);
  a.download = `${base.replace(/[^\wáéíóúñü-]+/gi, "-")}.mesa-personajes.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast(list.length === 1 ? `Ficha de ${list[0].name} guardada en tus descargas` : `${list.length} fichas guardadas en tus descargas`, "good");
}

/* El DM elige a quién exportar */
export function openExportChars(all) {
  const pcs = all.filter(c => c.kind === "pc"), foes = all.filter(c => c.kind !== "pc");
  const row = (c, on) => `<label class="pick-row"><input type="checkbox" value="${esc(c.id)}" ${on ? "checked" : ""}>
    <span class="avatar sm" style="--tone:${esc(c.color)}">${esc(initials(c.name))}</span>
    <span><b>${esc(c.name)}</b><small>${esc(c.kind === "pc" ? [c.className, "nivel " + c.level].filter(Boolean).join(" · ") : c.sizeType || "criatura")}</small></span></label>`;
  const body = el(`<div>
    <p class="prose small"><span>Un archivo con las fichas enteras y sus retratos, para llevarlas a otra campaña con «Importar personajes».</span></p>
    ${pcs.length ? `<h4 class="menu-sec">Personajes</h4><div class="pick-list">${pcs.map(c => row(c, true)).join("")}</div>` : ""}
    ${foes.length ? `<h4 class="menu-sec">Criaturas en la mesa</h4><div class="pick-list">${foes.map(c => row(c, false)).join("")}</div>` : ""}
  </div>`);
  modal({ title: "Exportar personajes", body, wide: true, actions: [{ label: "Cancelar" }, { label: "Exportar", tone: "primary", run: host => {
    const ids = [...host.querySelectorAll("input:checked")].map(i => i.value);
    exportChars(all.filter(c => ids.includes(c.id)));
  } }] });
}

/* Leer un archivo de personajes (o una copia entera de partida: se sacan sus fichas) */
export function readCharsFile(text) {
  const raw = JSON.parse(text);
  const list = Array.isArray(raw) ? raw : raw.chars || (raw.doc && raw.doc.chars) || (raw.kind || raw.name ? [raw] : []);
  if (!Array.isArray(list) || !list.length) throw new Error("En ese archivo no hay personajes");
  return list.slice(0, 60);
}

async function blobFromData(data) {
  return (await fetch(data)).blob();
}

/* Importar: se marca a quién y entran como fichas nuevas */
export function importChars({ isDM = true, onDone } = {}) {
  const input = document.createElement("input");
  input.type = "file"; input.accept = "application/json,.json";
  input.addEventListener("change", async () => {
    const f = input.files[0];
    if (!f) return;
    let list;
    try { list = readCharsFile(await f.text()); } catch (e) { return toast(e.message && !/JSON/.test(e.message) ? e.message : "Ese archivo no es de personajes de Mesa", "bad"); }
    if (!isDM) list = list.filter(c => c.kind !== "monster").slice(0, 1);
    if (!list.length) return toast("En ese archivo no hay ningún personaje", "bad");
    const body = el(`<div>
      <p class="prose small"><span>${isDM ? "Entran como fichas nuevas, sin colocar en el mapa. Las que ya tengas no se tocan." : "Entra como tu personaje en esta partida."}</span></p>
      <div class="pick-list">${list.map((c, i) => `<label class="pick-row"><input type="checkbox" value="${i}" checked ${isDM ? "" : "disabled"}>
        ${/^data:image\/(png|jpeg|webp|gif);base64,/.test(c.avatar || "") ? `<img class="avatar sm" src="${esc(c.avatar)}" alt="">` : `<span class="avatar sm" style="--tone:${/^#[0-9a-f]{3,8}$/i.test(c.color || "") ? c.color : "#c89b4a"}">${esc(initials(c.name || "?"))}</span>`}
        <span><b>${esc(c.name || "Sin nombre")}</b><small>${esc(c.kind === "monster" ? c.sizeType || "criatura" : [c.className, c.race, "nivel " + (c.level || 1)].filter(Boolean).join(" · "))}</small></span></label>`).join("")}</div>
    </div>`);
    modal({ title: isDM ? "Importar personajes" : "Traer mi ficha", body, wide: true, actions: [{ label: "Cancelar" }, { label: "Importar", tone: "primary", run: async host => {
      const picks = [...host.querySelectorAll("input:checked")].map(i => list[+i.value]);
      const out = [];
      for (const raw of picks) {
        let avatarId = "";
        if (typeof raw.avatar === "string" && raw.avatar.startsWith("data:image/")) {
          try { avatarId = await uploadImage(await blobFromData(raw.avatar)); } catch { avatarId = ""; }
        }
        const c = { ...raw, avatarId };
        delete c.avatar; delete c.id;
        LOCAL.forEach(k => delete c[k]);
        out.push(normalizeChar({ ...c, mapId: "", mx: null, my: null }));
      }
      if (!out.length) return;
      /* Nombres repetidos: se numeran para no confundirlos en la mesa */
      const taken = new Set(((store.doc && store.doc.chars) || []).map(c => c.name));
      for (const c of out) { let n = c.name, k = 2; while (taken.has(n)) n = `${c.name} ${k++}`; c.name = n; taken.add(n); }
      op("char.add", isDM ? { chars: out } : { char: out[0] });
      toast(out.length === 1 ? `${out[0].name} ya está en la partida` : `${out.length} personajes importados`, "good");
      onDone && onDone(out);
    } }] });
  });
  input.click();
}
