import { nameKey, sanitizeLabel } from "./sanitize";

/**
 * Barras: los grupos de amigos ("¿de qué barra sos?"). Se fundan en el Registro de Barras de Ciudad
 * Vieja pagando `BARRA_FOUND_COST`, con un nombre, una sigla de 2 a 4 letras y dos colores. La sigla se
 * ve debajo del nombre de cada integrante. Reglas que comparten el server (que valida) y el cliente
 * (que arma el formulario). Ver `docs/pending/funcionalidades-primera-version.md` (2.2).
 */

/** Lo que cuesta fundar una barra (saca plata de la economía y hace que fundarla sea un logro). */
export const BARRA_FOUND_COST = 5000;
/** Tope de integrantes, para que haya muchas barras y no una gigante. */
export const BARRA_MAX_MEMBERS = 30;
export const BARRA_NAME_MIN = 3;
export const BARRA_NAME_MAX = 24;
export const BARRA_TAG_MIN = 2;
export const BARRA_TAG_MAX = 4;
/** Lo que dura una invitación sin responder. */
export const BARRA_INVITE_MS = 60_000;

/** Los colores para elegir (dos por barra, como la camiseta de un club de barrio). */
export const BARRA_COLORS = [
  { id: "celeste", name: "Celeste", hex: "#6cace4" },
  { id: "azul", name: "Azul", hex: "#1d4fa0" },
  { id: "blanco", name: "Blanco", hex: "#f1f1f1" },
  { id: "negro", name: "Negro", hex: "#26262b" },
  { id: "rojo", name: "Rojo", hex: "#d62828" },
  { id: "amarillo", name: "Amarillo", hex: "#f2c94c" },
  { id: "verde", name: "Verde", hex: "#2e9e5b" },
  { id: "violeta", name: "Violeta", hex: "#8a4dff" },
  { id: "naranja", name: "Naranja", hex: "#f28c28" },
  { id: "bordo", name: "Bordó", hex: "#7b1e2b" },
] as const;
export type BarraColorId = (typeof BARRA_COLORS)[number]["id"];

export function isBarraColorId(value: unknown): value is BarraColorId {
  return BARRA_COLORS.some((color) => color.id === value);
}

export function barraColorHex(id: string): string {
  return BARRA_COLORS.find((color) => color.id === id)?.hex ?? "#f1f1f1";
}

/** Texto que se lee sobre un fondo de este color ("#rrggbb"): negro sobre claros, blanco sobre oscuros (la sigla de la barra). */
export function readableOn(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const luminance = (0.299 * ((value >> 16) & 255) + 0.587 * ((value >> 8) & 255) + 0.114 * (value & 255)) / 255;
  return luminance > 0.6 ? "#1a1a1f" : "#ffffff";
}

/** Siglas que nadie puede usar (parecen del staff del juego). Se comparan en mayúsculas. */
const RESERVED_TAGS = new Set(["ADM", "ADMN", "ADMI", "MOD", "MODS", "STAF", "SIST", "SYS", "GM", "DEV", "MW", "OFIC"]);

/** La sigla como se guarda y se muestra: mayúsculas, sólo letras y números. */
export function normalizeBarraTag(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/** El nombre como se guarda (la misma limpieza que los nombres de jugador). */
export function normalizeBarraName(raw: string): string {
  return sanitizeLabel(raw, BARRA_NAME_MAX + 1);
}

/** Por qué este nombre no sirve (null = sirve). Recibe el nombre ya normalizado. */
export function barraNameProblem(name: string): string | null {
  if (name.length < BARRA_NAME_MIN) return `El nombre tiene que tener al menos ${BARRA_NAME_MIN} letras.`;
  if (name.length > BARRA_NAME_MAX) return `El nombre puede tener hasta ${BARRA_NAME_MAX} letras.`;
  const key = nameKey(name);
  if (["admin", "moderador", "sistema", "staff", "montevideoworld"].some((word) => key.includes(word))) {
    return "Ese nombre no se puede usar.";
  }
  return null;
}

/** Por qué esta sigla no sirve (null = sirve). Recibe la sigla ya normalizada. */
export function barraTagProblem(tag: string): string | null {
  if (tag.length < BARRA_TAG_MIN || tag.length > BARRA_TAG_MAX) {
    return `La sigla tiene que tener de ${BARRA_TAG_MIN} a ${BARRA_TAG_MAX} letras o números.`;
  }
  if (RESERVED_TAGS.has(tag) || tag.startsWith("ADM") || tag.startsWith("MOD")) return "Esa sigla no se puede usar.";
  return null;
}

export type BarraRole = "fundador" | "integrante";

/** Un integrante como lo ve el panel: si está conectado y en qué barrio. */
export interface BarraMemberView {
  name: string;
  role: BarraRole;
  online: boolean;
  /** Barrio donde está (sólo si está conectado). */
  cityName?: string;
  /** Es el que mira el panel. */
  you: boolean;
}

/** Tu barra, como la ve el panel "Mi barra". */
export interface BarraView {
  id: string;
  name: string;
  tag: string;
  colors: [BarraColorId, BarraColorId];
  /** Fecha de fundación (ISO). */
  createdAt: string;
  members: BarraMemberView[];
  /** Sos el fundador (invita y puede disolverla). */
  founder: boolean;
}
