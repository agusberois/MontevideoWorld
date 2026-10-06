/** Nombre con el que el servidor registra la sala principal. */
export const ROOM_NAME = "city";

export const DEFAULT_PORT = 2567;
/**
 * Jugadores por sala. Con la sala llena, Colyseus abre otra copia del mismo barrio (no se ven entre
 * sí: el HUD muestra "· 2"). Pensado para que 25–50 jugadores entren holgados en una sola.
 */
export const MAX_PLAYERS_PER_ROOM = 80;

/** Tamaño de un tile isométrico en píxeles (rombo 2:1, estilo Habbo). */
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

/** Milisegundos que tarda un avatar en avanzar un tile. Servidor y cliente lo usan igual. */
export const STEP_MS = 250;
/** Tiles que avanza por tick un admin volando con `/god` (en línea recta, sin esquivar nada). */
export const GOD_FLIGHT_TILES = 3;

export const NAME_MAX_LENGTH = 16;
export const CHAT_MAX_LENGTH = 120;
export const CHAT_COOLDOWN_MS = 400;
export const CHAT_BUBBLE_MS = 5000;
/**
 * "Está escribiendo" (💬 sobre la cabeza): mientras escribe, el cliente lo vuelve a avisar cada
 * `TYPING_REFRESH_MS`; si el server no sabe nada en `TYPING_TIMEOUT_MS` (se fue, se cortó), lo apaga.
 */
export const TYPING_REFRESH_MS = 3000;
export const TYPING_TIMEOUT_MS = 7000;

export const PLAYER_COLORS = [
  "#e63946",
  "#f4a261",
  "#2a9d8f",
  "#457b9d",
  "#8338ec",
  "#ff006e",
  "#3a86ff",
  "#06d6a0",
] as const;
