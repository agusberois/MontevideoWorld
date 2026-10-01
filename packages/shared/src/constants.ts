/** Nombre con el que el servidor registra la sala principal. */
export const ROOM_NAME = "city";

export const DEFAULT_PORT = 2567;
export const MAX_PLAYERS_PER_ROOM = 50;

/** Tamaño de un tile isométrico en píxeles (rombo 2:1, estilo Habbo). */
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

/** Milisegundos que tarda un avatar en avanzar un tile. Servidor y cliente lo usan igual. */
export const STEP_MS = 250;

export const NAME_MAX_LENGTH = 16;
export const CHAT_MAX_LENGTH = 120;
export const CHAT_COOLDOWN_MS = 400;
export const CHAT_BUBBLE_MS = 5000;

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
