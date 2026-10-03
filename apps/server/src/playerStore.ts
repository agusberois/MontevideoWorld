import { readFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { InventoryStack, OutfitIds, STARTER_INVENTORY, STARTING_MONEY, SavedNeeds, TilePoint } from "@montevideo-world/shared";
import { round } from "./metrics";

/**
 * Lo que se guarda de cada jugador entre sesiones, por su clave secreta (`JoinOptions.playerKey`).
 * Lo decide y lo escribe sólo el server: el navegador guarda la clave, nunca la mochila ni la plata.
 */
export interface PlayerRecord {
  name: string;
  money: number;
  inventory: InventoryStack[];
  outfit: OutfitIds;
  /** Donador del proyecto (lo marca el admin con /donador). Los guardados viejos no lo tienen. */
  donor?: boolean;
  /** Preso en el COMCAR hasta este momento (ms), por `/ban`. Sin el campo, libre. */
  jailedUntil?: number;
  /** Necesidades (por ahora la energía), así salir y volver a entrar no las llena. */
  needs?: SavedNeeds;
  /** Mascota adoptada (id de `PETS`) y su nombre. */
  pet?: { id: string; name: string };
  updatedAt: string;
}

/** Cómo salió la última escritura del archivo (para `/health`). */
export interface FlushStats {
  /** Cuándo terminó (ISO). */
  at: string;
  /** Armar el JSON: el tiempo que el server queda frenado. */
  serializeMs: number;
  /** Total, incluida la escritura asíncrona al disco (el server sigue andando mientras tanto). */
  totalMs: number;
  bytes: number;
  players: number;
  ok: boolean;
}

/** Sala que puede cerrar una sesión duplicada (misma clave en otra pestaña). */
export interface SessionOwner {
  evictDuplicate(sessionId: string): void;
}

/**
 * Qué sesión está usando cada clave ahora (en cualquier sala). Una clave = una sesión a la vez: si
 * entra de nuevo (otra pestaña, recargar antes de que se cierre la anterior), la vieja se guarda y
 * se cierra. Así nadie puede duplicar ítems abriendo dos pestañas con la misma mochila.
 */
export const activeSessions = new Map<string, { owner: SessionOwner; sessionId: string }>();

/** Cada cuánto se escribe el archivo como máximo (los cambios se juntan en una sola escritura). */
const WRITE_DELAY_MS = 2000;
/** Claves sin cambios en este tiempo y sin progreso (ver `isUntouched`) se borran del archivo. */
export const INACTIVE_KEY_MS = 90 * 24 * 60 * 60 * 1000;
/** Cada cuánto se buscan claves para borrar (además de al arrancar). */
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * ¿Es un jugador que entró y nunca avanzó? Sin plata de más, sin nada en la mochila que no sea del
 * kit inicial, sin mascota, sin ser donador y sin estar preso. Perder uno de éstos no le quita nada
 * a nadie: si vuelve, arranca igual que como estaba.
 */
export function isUntouched(record: PlayerRecord, now = Date.now()): boolean {
  const starter = new Set<string>(STARTER_INVENTORY);
  return (
    record.money <= STARTING_MONEY &&
    (record.inventory ?? []).every((stack) => starter.has(stack.itemId)) &&
    !record.pet &&
    !record.donor &&
    !(record.jailedUntil && record.jailedUntil > now)
  );
}

/**
 * Almacén de jugadores en un archivo JSON (`PLAYER_DATA_FILE`, por defecto `apps/server/data/players.json`).
 * Alcanza para una sola instancia del server (como Colyseus en memoria).
 *
 * - `set` sólo marca para escribir si el jugador **cambió** (las salas guardan a todos cada 15 s,
 *   aunque estén quietos): sin cambios, el archivo no se toca.
 * - La escritura es asíncrona y de a una: el proceso sólo queda ocupado mientras arma el JSON (sin
 *   indentar), no mientras escribe el disco. Si llegan cambios durante una escritura, se escribe otra
 *   vez al terminar.
 * - Escribe a un archivo temporal y lo renombra: si el proceso se corta a mitad, el anterior queda intacto.
 */
class PlayerStore {
  private readonly file = process.env.PLAYER_DATA_FILE
    ? path.resolve(process.env.PLAYER_DATA_FILE)
    : path.resolve(__dirname, "../data/players.json");
  private records = new Map<string, PlayerRecord>();
  /** Lo último guardado de cada clave (sin `updatedAt`), para saber si cambió. */
  private fingerprints = new Map<string, string>();
  private timer: NodeJS.Timeout | null = null;
  /** Escritura en curso (una a la vez) y si quedaron cambios para otra. */
  private writing: Promise<void> | null = null;
  private dirty = false;
  /** Última escritura (null hasta la primera). */
  lastFlush: FlushStats | null = null;

  constructor() {
    try {
      const parsed = JSON.parse(readFileSync(this.file, "utf8")) as Record<string, PlayerRecord>;
      this.records = new Map(Object.entries(parsed));
      for (const [key, { updatedAt: _, ...record }] of this.records) this.fingerprints.set(key, JSON.stringify(record));
      console.log(`[PlayerStore] ${this.records.size} jugadores guardados en ${this.file}`);
      this.prune();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      console.log(`[PlayerStore] sin datos todavía; se van a guardar en ${this.file}`);
    }
    setInterval(() => this.prune(), PRUNE_INTERVAL_MS).unref();
  }

  /**
   * Borra las claves sin cambios hace más de `INACTIVE_KEY_MS` que nunca avanzaron (`isUntouched`):
   * cada navegador nuevo suma una clave y, sin esto, el archivo (y armarlo) crecería sin techo. Las
   * claves en uso (`activeSessions`) no se tocan. Devuelve cuántas borró.
   */
  prune(now = Date.now()): number {
    let removed = 0;
    for (const [key, record] of this.records) {
      const updatedAt = Date.parse(record.updatedAt);
      if (activeSessions.has(key) || !(now - updatedAt > INACTIVE_KEY_MS) || !isUntouched(record, now)) continue;
      this.records.delete(key);
      this.fingerprints.delete(key);
      removed += 1;
    }
    if (removed > 0) {
      console.log(`[PlayerStore] se borraron ${removed} claves sin actividad (quedan ${this.records.size})`);
      this.dirty = true;
      this.timer ??= setTimeout(() => void this.flush(), WRITE_DELAY_MS);
    }
    return removed;
  }

  /** Cuántos jugadores hay guardados. */
  get size() {
    return this.records.size;
  }

  get(key: string): PlayerRecord | undefined {
    return this.records.get(key);
  }

  /** Claves de los jugadores guardados con ese nombre (sin distinguir mayúsculas ni espacios de más). */
  keysByName(name: string): string[] {
    const wanted = name.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
    const keys: string[] = [];
    for (const [key, record] of this.records) {
      if (record.name.trim().replace(/\s+/g, " ").toLocaleLowerCase("es") === wanted) keys.push(key);
    }
    return keys;
  }

  /** Preso hasta `until` (0 = libre) para un jugador guardado que no está conectado (`/ban`). */
  setJailedUntil(key: string, until: number) {
    const record = this.records.get(key);
    if (!record) return;
    const { updatedAt: _, ...rest } = record;
    this.set(key, { ...rest, jailedUntil: until || undefined });
  }

  /** Guarda el jugador si cambió desde la última vez; si no, no hace nada. */
  set(key: string, record: Omit<PlayerRecord, "updatedAt">) {
    const fingerprint = JSON.stringify(record);
    if (this.fingerprints.get(key) === fingerprint) return;
    this.fingerprints.set(key, fingerprint);
    this.records.set(key, { ...record, updatedAt: new Date().toISOString() });
    this.dirty = true;
    this.timer ??= setTimeout(() => void this.flush(), WRITE_DELAY_MS);
  }

  /** Escribe lo pendiente ya (al apagar el server); espera a que termine. */
  async flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    // Una escritura a la vez: si hay una en curso, se espera y, si quedó algo nuevo, se escribe después.
    while (this.writing) await this.writing;
    if (!this.dirty) return;
    this.dirty = false;
    this.writing = this.write().finally(() => {
      this.writing = null;
    });
    await this.writing;
  }

  private async write() {
    const started = performance.now();
    const json = JSON.stringify(Object.fromEntries(this.records));
    const serializedMs = performance.now() - started;
    const stats = (ok: boolean): FlushStats => ({
      at: new Date().toISOString(),
      serializeMs: round(serializedMs),
      totalMs: round(performance.now() - started),
      bytes: Buffer.byteLength(json),
      players: this.records.size,
      ok,
    });
    try {
      await mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      await writeFile(tmp, json);
      await rename(tmp, this.file);
    } catch (error) {
      // Se reintenta en la próxima: lo que está en memoria no se pierde.
      this.dirty = true;
      this.lastFlush = stats(false);
      console.error("[PlayerStore] no se pudo escribir", error);
      return;
    }
    this.lastFlush = stats(true);
    if (serializedMs > 50) {
      console.warn(`[PlayerStore] armar el archivo (${this.records.size} jugadores) frenó el server ${Math.round(serializedMs)} ms`);
    }
  }
}

export const playerStore = new PlayerStore();

/**
 * Boletos pagados (por clave de jugador): a un barrio que no es el de spawn sólo se entra con uno
 * vigente para ese barrio. Se consume al entrar. Así viajar cuesta plata y no alcanza con pedirle
 * al server otra sala desde el cliente.
 */
export interface TravelTicket {
  cityId: string;
  expiresAt: number;
  /** `/trace`: al entrar aparece al lado de este jugador (sessionId), si sigue en la sala. */
  near?: string;
  /** Desmayo: al entrar aparece en este tile (la puerta del sanatorio), si es caminable. */
  at?: TilePoint;
}

export const travelTickets = new Map<string, TravelTicket>();

/**
 * Emitir un boleto (reemplaza el anterior de esa clave). De paso se borran los vencidos que nadie
 * usó (pagó y no viajó): sin esto el `Map` crecería para siempre. Recorrerlo es barato: hay como
 * mucho un boleto por clave y duran `TRAVEL_TICKET_MS`.
 */
export function issueTravelTicket(
  key: string,
  cityId: string,
  expiresAt: number,
  now = Date.now(),
  place: Pick<TravelTicket, "near" | "at"> = {},
) {
  for (const [other, ticket] of travelTickets) {
    if (ticket.expiresAt < now) travelTickets.delete(other);
  }
  travelTickets.set(key, { cityId, expiresAt, ...place });
}
