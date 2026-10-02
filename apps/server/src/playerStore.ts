import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { InventoryStack, OutfitIds } from "@montevideo-world/shared";

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
  updatedAt: string;
}

/** Cada cuánto se escribe el archivo como máximo (los cambios se juntan en una sola escritura). */
const WRITE_DELAY_MS = 2000;

/**
 * Almacén de jugadores en un archivo JSON (`PLAYER_DATA_FILE`, por defecto `apps/server/data/players.json`).
 * Alcanza para una sola instancia del server (como Colyseus en memoria); para escalar habría que
 * pasar a una base de datos. Escribe a un archivo temporal y lo renombra: si el proceso se corta a
 * mitad de una escritura, el archivo anterior queda intacto.
 */
class PlayerStore {
  private readonly file = process.env.PLAYER_DATA_FILE
    ? path.resolve(process.env.PLAYER_DATA_FILE)
    : path.resolve(__dirname, "../data/players.json");
  private records = new Map<string, PlayerRecord>();
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    try {
      const parsed = JSON.parse(readFileSync(this.file, "utf8")) as Record<string, PlayerRecord>;
      this.records = new Map(Object.entries(parsed));
      console.log(`[PlayerStore] ${this.records.size} jugadores guardados en ${this.file}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      console.log(`[PlayerStore] sin datos todavía; se van a guardar en ${this.file}`);
    }
  }

  get(key: string): PlayerRecord | undefined {
    return this.records.get(key);
  }

  set(key: string, record: Omit<PlayerRecord, "updatedAt">) {
    this.records.set(key, { ...record, updatedAt: new Date().toISOString() });
    this.timer ??= setTimeout(() => this.flush(), WRITE_DELAY_MS);
  }

  /** Escribe ya (al apagar el server). */
  flush() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(Object.fromEntries(this.records), null, 2));
    renameSync(tmp, this.file);
  }
}

export const playerStore = new PlayerStore();

/**
 * Boletos pagados (por clave de jugador): a un barrio que no es el de spawn sólo se entra con uno
 * vigente para ese barrio. Se consume al entrar. Así viajar cuesta plata y no alcanza con pedirle
 * al server otra sala desde el cliente.
 */
export const travelTickets = new Map<string, { cityId: string; expiresAt: number }>();

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
