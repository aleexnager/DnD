/* Un solo anfitrión para todas las pestañas del navegador: la del DM, la de
   la tele y las de jugadores que se abran aquí mismo. */

import { createHost } from "./local-host.js";

const host = createHost(new URL("../", self.location.href).href);
self.onconnect = e => host.attach(e.ports[0]);
