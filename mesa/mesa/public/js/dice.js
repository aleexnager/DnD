/* Dados. Núcleo sin interfaz: entra una fórmula y sale el detalle de la tirada,
   para que el registro pueda enseñar cada dado y no solo el total. */

const rand = max => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] % max) + 1;
};

export const rollDie = faces => rand(Math.max(2, faces));

const TERM = /^([+-]?)\s*(?:(\d*)d(\d+)|(\d+))$/i;

/* "2d6 + 1d4 + 3" o "d20-1". Devuelve null si no se entiende. */
export function parse(formula) {
  const clean = String(formula || "").replace(/\s+/g, "").toLowerCase();
  if (!clean) return null;
  const chunks = clean.match(/[+-]?[^+-]+/g);
  if (!chunks) return null;
  const terms = [];
  for (const chunk of chunks) {
    const m = chunk.match(TERM);
    if (!m) return null;
    const neg = m[1] === "-";
    if (m[3]) terms.push({ kind: "dice", count: Math.min(60, Number(m[2] || 1)), faces: Number(m[3]), neg });
    else terms.push({ kind: "flat", value: Number(m[4]), neg });
  }
  return terms;
}

/* mode: "normal" | "adv" | "dis". La ventaja solo tiene sentido sobre un d20
   suelto, así que se aplica al primero que aparezca. */
export function roll(formula, mode = "normal") {
  const terms = parse(formula);
  if (!terms) return null;
  let total = 0;
  const parts = [];
  let advApplied = false;
  let natural = null;

  for (const t of terms) {
    if (t.kind === "flat") {
      total += t.neg ? -t.value : t.value;
      parts.push({ kind: "flat", value: t.value, neg: t.neg });
      continue;
    }
    const rolls = [];
    for (let i = 0; i < t.count; i++) rolls.push(rollDie(t.faces));
    let kept = rolls.slice();
    let dropped = [];
    if (!advApplied && mode !== "normal" && t.faces === 20 && t.count === 1) {
      const second = rollDie(20);
      const pair = [rolls[0], second];
      const pick = mode === "adv" ? Math.max(...pair) : Math.min(...pair);
      kept = [pick];
      dropped = [pair[0] === pick ? pair[1] : pair[0]];
      rolls.push(second);
      advApplied = true;
    }
    if (t.faces === 20 && natural === null) natural = kept[0];
    const sum = kept.reduce((a, b) => a + b, 0);
    total += t.neg ? -sum : sum;
    parts.push({ kind: "dice", faces: t.faces, count: t.count, rolls, kept, dropped, neg: t.neg });
  }

  return {
    formula: String(formula).trim(),
    mode, total, parts, natural,
    crit: natural === 20, fumble: natural === 1
  };
}

/* Los dados de una tirada, uno a uno, para la animación de dados en 3D:
   { f: caras, v: lo que sacó, x: descartado (ventaja o desventaja) }.
   Como mucho 30: más no caben en la pantalla. */
export const DIE_FACES = [4, 6, 8, 10, 12, 20, 100];
export function diceOf(result) {
  const out = [];
  for (const p of (result && result.parts) || []) {
    if (p.kind !== "dice" || !DIE_FACES.includes(p.faces)) continue;
    const dropped = [...p.dropped];
    for (const v of p.rolls) {
      const i = dropped.indexOf(v);
      const x = i >= 0 && p.kept.filter(k => k === v).length < p.rolls.filter(r => r === v).length;
      if (x) dropped.splice(i, 1);
      out.push(x ? { f: p.faces, v, x: true } : { f: p.faces, v });
      if (out.length >= 30) return out;
    }
  }
  return out;
}
/* Lo que llega de un aparato se limpia antes de guardarlo */
export const cleanDice = list => (Array.isArray(list) ? list : []).slice(0, 30)
  .filter(d => d && DIE_FACES.includes(+d.f) && Number.isInteger(+d.v) && +d.v >= 1 && +d.v <= +d.f)
  .map(d => d.x ? { f: +d.f, v: +d.v, x: true } : { f: +d.f, v: +d.v });

/* Texto corto para el registro: "1d20+5 → 14 + 5" */
export function detail(result) {
  return result.parts.map(p => {
    const s = p.neg ? "−" : "+";
    if (p.kind === "flat") return `${s} ${p.value}`;
    const shown = p.rolls.map(r => (p.dropped.includes(r) && p.kept.indexOf(r) === -1 ? `⟨${r}⟩` : `${r}`)).join(" ");
    return `${s} ${p.count}d${p.faces} [${shown}]`;
  }).join(" ").replace(/^\+\s*/, "");
}

/* Tiradas habituales, para los botones rápidos */
export const d20 = mod => "1d20" + (mod >= 0 ? "+" + mod : mod);

/* PV de una criatura a partir de sus dados de vida ("2d8+2") */
export function rollHitPoints(hpDice, fallback) {
  const r = roll(hpDice);
  return r ? Math.max(1, r.total) : fallback;
}
