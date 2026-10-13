/* Cruzar un acceso con varios a la vez.

   Al pisar una escalera o un pasadizo que «pregunta», quien ha movido la
   ficha (el DM o el jugador) elige en su pantalla quién va con ella. El
   servidor hace el resto: comprueba que alguien esté encima, lleva a los
   elegidos y los coloca juntos alrededor de la llegada. */

import { store, op } from "./net.js";
import { el, esc, initials, modal } from "./util.js";
import { gridDistance } from "./los.js";

const activeMap = () => {
  const d = store.doc;
  return d && (d.maps.find(m => m.id === d.session.activeMapId) || d.maps[0]);
};

/* ¿Lleva a algún sitio? A otro mapa, o a otra casilla del mismo */
export function portalLeads(map, p) {
  if (p.toMap && p.toMap !== map.id) return true;
  return p.toX !== null && p.toY !== null && (p.toX !== p.x || p.toY !== p.y);
}

/* Se llama justo después de pedir un movimiento. Espera a que la ficha esté
   de verdad sobre el acceso (si el servidor rechaza el paso, no pregunta). */
export function afterMove(id, x, y, { isDM = false } = {}) {
  const map = activeMap();
  if (!map) return;
  const portal = (map.portals || []).find(p => p.x === x && p.y === y && p.auto && p.ask && portalLeads(map, p));
  if (!portal) return;
  let tries = 0;
  const wait = () => {
    const c = store.doc && store.doc.chars.find(ch => ch.id === id);
    if (c && c.mapId === map.id && c.mx === x && c.my === y) return askCrossing(map, portal, c, isDM);
    if (++tries < 14) setTimeout(wait, 150);
  };
  setTimeout(wait, 120);
}

export function askCrossing(map, portal, mover, isDM) {
  const dest = portal.toMap && portal.toMap !== map.id
    ? (store.doc.maps.find(m => m.id === portal.toMap) || {}).name || "otro mapa"
    : "otro punto de este mapa";
  /* Con quién puede ir: los de su bando que estén en este mapa */
  const kind = isDM ? mover.kind : "pc";
  const others = store.doc.chars
    .filter(c => c.id !== mover.id && c.kind === kind && c.mapId === map.id && c.mx !== null && (c.kind !== "pc" || c.hp > 0))
    .map(c => ({ c, d: gridDistance(c.mx, c.my, portal.x, portal.y, map.diagonals) * (map.feet || 5) }))
    .sort((a, b) => a.d - b.d);

  const body = el(`<div class="crossing">
    <p class="prose small"><span>${esc(mover.name)} está en ${esc(portal.label)}, que lleva a ${esc(dest)}.</span></p>
    ${others.length ? `
      <div class="cast-targets-head"><span class="field-label">¿Quién va con ${esc(mover.name)}?</span>
        <button type="button" class="btn sm" data-all>${kind === "pc" ? "Toda la party" : "Todos"}</button></div>
      <div class="cast-targets">${others.map(({ c, d }) => `
        <label class="pick-row"><input type="checkbox" value="${esc(c.id)}">
          <span class="avatar sm" style="--tone:${esc(c.color)}">${esc(initials(c.name))}</span>
          <span class="sb-text"><b>${esc(c.name)}</b><small>a ${d} pies</small></span></label>`).join("")}</div>`
      : `<p class="prose small"><span>No hay nadie más en este mapa.</span></p>`}
  </div>`);
  const all = body.querySelector("[data-all]");
  if (all) all.addEventListener("click", () => {
    const boxes = [...body.querySelectorAll("input[type=checkbox]")];
    const on = boxes.some(b => !b.checked);
    boxes.forEach(b => { b.checked = on; });
    all.textContent = on ? "Nadie más" : kind === "pc" ? "Toda la party" : "Todos";
  });
  modal({
    title: "Cruzar por " + portal.label,
    body,
    actions: [
      { label: "Quedarse aquí" },
      { label: "Cruzar", tone: "primary", run: host => {
        const ids = [mover.id, ...[...host.querySelectorAll("input[type=checkbox]:checked")].map(b => b.value)];
        op("portal.cross", { mapId: map.id, portalId: portal.id, ids });
      } }
    ]
  });
}
