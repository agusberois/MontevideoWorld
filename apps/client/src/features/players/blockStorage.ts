import { nameKey } from "@montevideo-world/shared";

/**
 * Jugadores bloqueados: no ves su chat, sus globos ni sus mensajes privados. Es una preferencia del
 * navegador (como la barra rápida), no pasa por el server: el otro no se entera. Se guarda el
 * esqueleto del nombre (`nameKey`), así también quedan afuera "juan" o "Juán" si bloqueaste a "Juan".
 */
const STORAGE_KEY = "montevideo-world:blocked";
/** Tope para que la lista no crezca sin fin. */
const MAX_BLOCKED = 200;

export function loadBlocked(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === "string").slice(0, MAX_BLOCKED) : [];
  } catch {
    return [];
  }
}

export function saveBlocked(blocked: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blocked.slice(-MAX_BLOCKED)));
  } catch {
    // Sin almacenamiento (modo privado, etc.): el bloqueo anda igual, sólo no se recuerda.
  }
}

/** La lista con `name` agregado, o sacado si ya estaba. */
export function toggleInList(blocked: string[], name: string): string[] {
  const key = nameKey(name);
  return blocked.includes(key) ? blocked.filter((other) => other !== key) : [...blocked, key].slice(-MAX_BLOCKED);
}
