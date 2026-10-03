import { nameKey } from "@montevideo-world/shared";
import { NAME_BAN_MAX_MS } from "./bans";
import { playerId } from "./playerStore";

/**
 * Silenciados (`/silenciar`): hasta cuándo (ms) no pueden hablar en el chat, mandar `/mensaje`,
 * saludar ni burlarse. Como `bans`: por id (`playerId` de la clave) la condena entera y por nombre
 * (`nameKey`) como mucho `NAME_BAN_MAX_MS`, para el que vuelve sin clave con el mismo nombre. Sólo en
 * memoria del proceso: reiniciar el server los levanta (es una sanción corta, no hace falta guardarla).
 */
class Mutes {
  private readonly byId = new Map<string, number>();
  private readonly byName = new Map<string, number>();

  /** Silenciado hasta `until` (0 = levantarlo). `key`: su clave, o null si no tiene. */
  set(key: string | null, name: string, until: number, now = Date.now()) {
    if (key) this.byId.set(playerId(key), until);
    this.byName.set(nameKey(name), until === 0 ? 0 : Math.min(until, now + NAME_BAN_MAX_MS));
    for (const map of [this.byId, this.byName]) {
      for (const [other, at] of map) if (at !== until && at <= now) map.delete(other);
    }
  }

  /** Hasta cuándo está silenciado (0 si no lo está). */
  until(key: string | null, name: string, now = Date.now()): number {
    const byId = key ? (this.byId.get(playerId(key)) ?? 0) : 0;
    const until = Math.max(byId, this.byName.get(nameKey(name)) ?? 0);
    return until > now ? until : 0;
  }
}

export const mutes = new Mutes();
