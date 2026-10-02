import { playerStore } from "./playerStore";

/**
 * Presos en el COMCAR (`/ban`): hasta cuándo (ms, `Date.now()`). Se anotan por clave del jugador
 * (y quedan en su guardado, `PlayerRecord.jailedUntil`, así siguen presos si se reinicia el server)
 * y también por nombre, para los que entran sin clave o banear a alguien que no está conectado.
 * Vive en memoria del proceso, como `playerDirectory`: alcanza con una sola instancia.
 */
class Bans {
  /** Clave → hasta cuándo. 0 = liberado a mano (pisa lo que diga el guardado). */
  private readonly byKey = new Map<string, number>();
  private readonly byName = new Map<string, number>();

  /** Preso hasta `until` (0 = liberarlo). */
  set(key: string | null, name: string, until: number) {
    if (key) this.byKey.set(key, until);
    this.byName.set(normalizeName(name), until);
  }

  /** Hasta cuándo está preso (0 si no lo está o ya cumplió). */
  until(key: string | null, name: string, now = Date.now()): number {
    const byKey = key ? (this.byKey.get(key) ?? playerStore.get(key)?.jailedUntil ?? 0) : 0;
    const byName = this.byName.get(normalizeName(name)) ?? 0;
    const until = Math.max(byKey, byName);
    return until > now ? until : 0;
  }

  /** Para el guardado: hasta cuándo está preso por su clave (undefined si no lo está). */
  savedUntil(key: string): number | undefined {
    const until = this.byKey.get(key) ?? playerStore.get(key)?.jailedUntil ?? 0;
    return until > Date.now() ? until : undefined;
  }
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

export const bans = new Bans();
