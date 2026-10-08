"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.god = void 0;
/**
 * /god (admin): modo vuelo. Prendido, el admin se mueve en línea recta por arriba de todo, rápido y
 * sin que lo vean; otra vez /god y cae en la baldosa caminable más cercana. Sirve para recorrer el
 * mapa rápido (ver `startFlying` / `land` en `systems/movement.ts`).
 */
const god = ({ client, player }, host) => {
    host.setFlying(client, !player.flying);
};
exports.god = god;
//# sourceMappingURL=god.js.map