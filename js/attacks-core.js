/* Trozo del módulo de ataques que también necesita el servidor: aquí no puede
   haber nada que toque el navegador. */

/* Un crítico duplica los dados, no el bonificador. */
export function critDamage(formula) {
  return String(formula).replace(/(\d*)d(\d+)/gi, (m, n, f) => `${(Number(n || 1) * 2)}d${f}`);
}
