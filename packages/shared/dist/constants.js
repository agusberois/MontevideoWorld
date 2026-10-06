"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAYER_COLORS = exports.TYPING_TIMEOUT_MS = exports.TYPING_REFRESH_MS = exports.CHAT_BUBBLE_MS = exports.CHAT_COOLDOWN_MS = exports.CHAT_MAX_LENGTH = exports.NAME_MAX_LENGTH = exports.GOD_FLIGHT_TILES = exports.STEP_MS = exports.TILE_HEIGHT = exports.TILE_WIDTH = exports.MAX_PLAYERS_PER_ROOM = exports.DEFAULT_PORT = exports.ROOM_NAME = void 0;
/** Nombre con el que el servidor registra la sala principal. */
exports.ROOM_NAME = "city";
exports.DEFAULT_PORT = 2567;
/**
 * Jugadores por sala. Con la sala llena, Colyseus abre otra copia del mismo barrio (no se ven entre
 * sí: el HUD muestra "· 2"). Pensado para que 25–50 jugadores entren holgados en una sola.
 */
exports.MAX_PLAYERS_PER_ROOM = 80;
/** Tamaño de un tile isométrico en píxeles (rombo 2:1, estilo Habbo). */
exports.TILE_WIDTH = 64;
exports.TILE_HEIGHT = 32;
/** Milisegundos que tarda un avatar en avanzar un tile. Servidor y cliente lo usan igual. */
exports.STEP_MS = 250;
/** Tiles que avanza por tick un admin volando con `/god` (en línea recta, sin esquivar nada). */
exports.GOD_FLIGHT_TILES = 3;
exports.NAME_MAX_LENGTH = 16;
exports.CHAT_MAX_LENGTH = 120;
exports.CHAT_COOLDOWN_MS = 400;
exports.CHAT_BUBBLE_MS = 5000;
/**
 * "Está escribiendo" (💬 sobre la cabeza): mientras escribe, el cliente lo vuelve a avisar cada
 * `TYPING_REFRESH_MS`; si el server no sabe nada en `TYPING_TIMEOUT_MS` (se fue, se cortó), lo apaga.
 */
exports.TYPING_REFRESH_MS = 3000;
exports.TYPING_TIMEOUT_MS = 7000;
exports.PLAYER_COLORS = [
    "#e63946",
    "#f4a261",
    "#2a9d8f",
    "#457b9d",
    "#8338ec",
    "#ff006e",
    "#3a86ff",
    "#06d6a0",
];
//# sourceMappingURL=constants.js.map