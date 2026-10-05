import { Appearance, sanitizeAppearance, sanitizeName } from "@montevideo-world/shared";
import { getPlayerKey, newPlayerKey, setPlayerKey } from "./playerKey";

/**
 * Personajes de este navegador: nombre, aspecto y su clave (con la clave el server guarda el
 * progreso de cada uno: mochila, plata, ropa…). En `mw:characters`; elegir uno pone su clave como la
 * activa (`mw:playerKey`). Del formato viejo (un solo personaje en `mw:name` / `mw:appearance`) se
 * migra solo, con la clave que ya tenía, así no se pierde el progreso.
 */
export interface Character {
  key: string;
  name: string;
  appearance: Appearance;
}

const CHARACTERS_KEY = "mw:characters";
const LEGACY_NAME_KEY = "mw:name";
const LEGACY_APPEARANCE_KEY = "mw:appearance";
/** Como mucho estos personajes por navegador. */
export const MAX_CHARACTERS = 6;

export function listCharacters(): Character[] {
  try {
    const raw = window.localStorage.getItem(CHARACTERS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.flatMap(parseCharacter);
    }
    return migrateLegacy();
  } catch {
    return [];
  }
}

function parseCharacter(value: unknown): Character[] {
  if (typeof value !== "object" || value === null) return [];
  const { key, name, appearance } = value as Record<string, unknown>;
  const look = sanitizeAppearance(appearance);
  const clean = sanitizeName(typeof name === "string" ? name : "");
  return typeof key === "string" && /^[A-Za-z0-9_-]{32,64}$/.test(key) && look && clean ? [{ key, name: clean, appearance: look }] : [];
}

/** El personaje de antes (nombre y aspecto sueltos) pasa a la lista con la clave que ya tenía. */
function migrateLegacy(): Character[] {
  const name = sanitizeName(window.localStorage.getItem(LEGACY_NAME_KEY) ?? "");
  const rawLook = window.localStorage.getItem(LEGACY_APPEARANCE_KEY);
  const appearance = rawLook ? sanitizeAppearance(JSON.parse(rawLook)) : null;
  const key = getPlayerKey();
  if (!name || !appearance || !key) return [];
  const characters = [{ key, name, appearance }];
  write(characters);
  return characters;
}

function write(characters: Character[]) {
  try {
    window.localStorage.setItem(CHARACTERS_KEY, JSON.stringify(characters));
  } catch {
    // Sin almacenamiento: no se recuerda.
  }
}

/** Jugar con este personaje: su clave pasa a ser la activa. */
export function selectCharacter(character: Character) {
  setPlayerKey(character.key);
}

/**
 * Crear un personaje: el primero de este navegador usa la clave que ya había (por si jugaba sin
 * personaje guardado); los siguientes, una clave nueva (progreso desde cero). Queda como el activo.
 */
export function createCharacter(name: string, appearance: Appearance): Character | null {
  const characters = listCharacters();
  const used = new Set(characters.map((character) => character.key));
  const current = getPlayerKey();
  const key = current && !used.has(current) && characters.length === 0 ? current : newPlayerKey();
  if (!key) return null;
  const character = { key, name, appearance };
  write([...characters, character].slice(-MAX_CHARACTERS));
  setPlayerKey(key);
  return character;
}
