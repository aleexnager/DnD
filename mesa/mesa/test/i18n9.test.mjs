/* La versión en inglés: los patrones del registro, los rasgos del creador y
   los textos de los conjuros (que se cargan aparte) */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.localStorage = { getItem: () => "en", setItem() {} };
globalThis.document = { documentElement: {}, body: null };
const { translateLine: tr, t, loadSpellTexts } = await import("../public/js/i18n.js");
await loadSpellTexts();
const { CONJUROS_EN } = await import("../public/js/libros/conjuros-en.js");
const { JUGADOR_EN } = await import("../public/js/libros/jugador-en.js");
const { SPELL_LIBRARY } = await import("../public/js/spells.js");

test("los patrones del registro y del creador traducen en inglés", () => {
  assert.equal(tr("Orco: salvación 12 · falla · 7 de daño trueno · queda derribado"), "Orco: save 12 · fails · 7 thunder damage · now prone");
  assert.equal(tr("Orco: 9 de daño radiante · queda cegado"), "Orco: 9 radiant damage · now blinded");
  assert.equal(tr("Aria gana 9 de vida temporal"), "Aria gains 9 temporary hit points");
  assert.equal(tr("Nv 3"), "Lv 3");
  assert.equal(tr("52 conjuros"), "52 spells");
  assert.equal(tr("CD 13 SAB"), "DC 13 WIS");
  assert.equal(tr("Furia, Defensa sin armadura"), "Rage, Unarmored Defense");
  assert.equal(tr("Destruir muertos vivientes (VD 1/2)"), "Destroy Undead (CR 1/2)");
  assert.equal(tr("Rasgo de monje de nivel 4."), "Monk feature at level 4.");
  /* Una frase normal con comas que no se traduce entera se queda como está */
  assert.equal(tr("Hola, mundo raro"), "Hola, mundo raro");
});

test("cada conjuro de la biblioteca tiene nombre y descripción en inglés", () => {
  const dict = { ...CONJUROS_EN };
  /* Geas y Tsunami se llaman igual en los dos idiomas */
  const en = s => t(s) !== s || dict[s] || ["Geas", "Tsunami"].includes(s);
  /* El alcance «60 pies» lo resuelve un patrón («60 ft.»), no el diccionario */
  const missing = SPELL_LIBRARY.filter(sp => !en(sp.name) || !en(sp.desc) || !en(sp.duration) || (tr(sp.range) === sp.range && !en(sp.range))).map(sp => sp.name);
  assert.deepEqual(missing, []);
  assert.equal(dict["Castigo atronador"] || t("Castigo atronador"), "Thunderous Smite");
  assert.ok(Object.keys(JUGADOR_EN).length > 250);
});
