"use strict";
/**
 * Picudo rojo: plaga de las palmeras. Clic en una palmera la sacude y salen picudos que persiguen
 * al jugador **más cercano** (no al que sacudió) y lo pican (le sacan energía). Se matan a patadas
 * (clic sobre el picudo, estando cerca) y cada uno paga una recompensa. Los mueve el server y viajan
 * en el Schema (`GameState.weevils`): todos los ven igual. Distancias en tiles, tiempos en ms.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEEVIL_REWARD = exports.WEEVIL_KICK_RANGE = exports.WEEVIL_LIFETIME_MS = exports.WEEVIL_BITE_STAMINA = exports.WEEVIL_BITE_MS = exports.WEEVIL_BITE_RANGE = exports.WEEVIL_AGGRO_RANGE = exports.WEEVIL_SPEED = exports.WEEVIL_EMERGE_MS = exports.PALM_COOLDOWN_MS = exports.MAX_WEEVILS = exports.WEEVILS_PER_PALM = void 0;
/** Cuántos salen al sacudir una palmera (al azar entre los dos). */
exports.WEEVILS_PER_PALM = { min: 2, max: 4 };
/** Tope de picudos vivos por sala, para que no se llene el barrio. */
exports.MAX_WEEVILS = 24;
/** Una palmera recién sacudida no larga más picudos hasta que pase esto. */
exports.PALM_COOLDOWN_MS = 8000;
/** Al salir de la palmera tardan esto en empezar a perseguir. */
exports.WEEVIL_EMERGE_MS = 700;
/** Velocidad (tiles por segundo): más lentos que un jugador caminando (4/s), se los puede dejar atrás. */
exports.WEEVIL_SPEED = 2.2;
/** Persiguen al jugador más cercano dentro de este radio; si no hay nadie, vuelven a la palmera. */
exports.WEEVIL_AGGRO_RANGE = 6;
/** A esta distancia del objetivo pican. */
exports.WEEVIL_BITE_RANGE = 0.55;
/** Tiempo mínimo entre dos picaduras del mismo picudo. */
exports.WEEVIL_BITE_MS = 1500;
/** Energía que saca cada picadura. */
exports.WEEVIL_BITE_STAMINA = 2;
/** Pasado este tiempo se vuelven a la palmera aunque tengan a quién picar. */
exports.WEEVIL_LIFETIME_MS = 30_000;
/** Distancia máxima (desde el tile del jugador) para patear un picudo. */
exports.WEEVIL_KICK_RANGE = 1.6;
/** Plata por cada picudo aplastado. */
exports.WEEVIL_REWARD = 1;
//# sourceMappingURL=weevils.js.map