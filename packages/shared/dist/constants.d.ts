/** Nombre con el que el servidor registra la sala principal. */
export declare const ROOM_NAME = "city";
export declare const DEFAULT_PORT = 2567;
/**
 * Jugadores por sala. Con la sala llena, Colyseus abre otra copia del mismo barrio (no se ven entre
 * sí: el HUD muestra "· 2"). Pensado para que 25–50 jugadores entren holgados en una sola.
 */
export declare const MAX_PLAYERS_PER_ROOM = 80;
/** Tamaño de un tile isométrico en píxeles (rombo 2:1, estilo Habbo). */
export declare const TILE_WIDTH = 64;
export declare const TILE_HEIGHT = 32;
/** Milisegundos que tarda un avatar en avanzar un tile. Servidor y cliente lo usan igual. */
export declare const STEP_MS = 250;
export declare const NAME_MAX_LENGTH = 16;
export declare const CHAT_MAX_LENGTH = 120;
export declare const CHAT_COOLDOWN_MS = 400;
export declare const CHAT_BUBBLE_MS = 5000;
export declare const PLAYER_COLORS: readonly ["#e63946", "#f4a261", "#2a9d8f", "#457b9d", "#8338ec", "#ff006e", "#3a86ff", "#06d6a0"];
//# sourceMappingURL=constants.d.ts.map