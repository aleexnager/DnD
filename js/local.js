/* El transporte de la versión de prueba: en vez de hablar con un servidor,
   la aplicación habla con el anfitrión que corre en el propio navegador
   (local-host.js). Si el navegador tiene SharedWorker, un único anfitrión
   sirve a todas las pestañas; si no (Chrome en Android), corre dentro de esta
   pestaña y la partida vive solo en ella. */

import { registerLocalImage } from "./util.js";

export const SHARED = typeof SharedWorker === "function";

export async function localTransport() {
  let port;
  if (SHARED) {
    const worker = new SharedWorker(new URL("./local-worker.js", import.meta.url), { type: "module", name: "mesa" });
    port = worker.port;
  } else {
    const { createHost } = await import("./local-host.js");
    const channel = new MessageChannel();
    createHost(new URL("../", import.meta.url).href).attach(channel.port1);
    port = channel.port2;
  }

  let seq = 0;
  const waiting = new Map();
  let streamOn = null;
  port.onmessage = e => {
    const m = e.data || {};
    if (m.event && streamOn) return streamOn[m.event] && streamOn[m.event](m.data);
    const w = waiting.get(m.reply);
    if (!w) return;
    waiting.delete(m.reply);
    if (m.ok) w.resolve(m.data);
    else w.reject(Object.assign(new Error(m.error), { status: m.status }));
  };
  port.start();
  const ask = (kind, extra = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    waiting.set(id, { resolve, reject });
    port.postMessage({ id, kind, ...extra });
  });

  return {
    hello: () => ask("hello"),
    join: body => ask("join", { body }),
    ping: token => ask("ping", { token }).catch(() => null),
    stream(token, on) {
      streamOn = on;
      ask("stream", { token }).catch(err => { if (err.status === 401) on.error(); });
      return () => { streamOn = null; };
    },
    ops: (token, ops) => ask("ops", { token, ops }),
    async image(token, blob) {
      const id = await ask("image", { token, blob });
      registerLocalImage(id, URL.createObjectURL(blob));
      return id;
    },
    leave: token => { port.postMessage({ kind: "leave", token }); }
  };
}
