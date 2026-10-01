/**
 * Clave secreta del jugador en este navegador. El server guarda con ella la mochila, la plata y la
 * ropa, y se las devuelve al volver a entrar: acá sólo vive la clave, nunca el progreso (así no se
 * puede editar desde la consola). Borrar los datos del sitio = empezar de cero.
 */
const PLAYER_KEY_STORAGE_KEY = "mw:playerKey";

/** La clave guardada, o una nueva (32 caracteres hex) si no había. null si no hay almacenamiento. */
export function getPlayerKey(): string | null {
  try {
    const saved = window.localStorage.getItem(PLAYER_KEY_STORAGE_KEY);
    if (saved && /^[A-Za-z0-9_-]{32,64}$/.test(saved)) return saved;
    // getRandomValues (y no randomUUID): anda también por http en la red local, que no es "contexto seguro".
    const key = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
    window.localStorage.setItem(PLAYER_KEY_STORAGE_KEY, key);
    return key;
  } catch {
    // Sin almacenamiento (modo privado estricto): se juega igual, sólo no se guarda el progreso.
    return null;
  }
}
