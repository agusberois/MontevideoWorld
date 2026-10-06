import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { chmod, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { BarraColorId, BarraRole, nameKey } from "@montevideo-world/shared";

/**
 * Las barras guardadas. Los integrantes van por `playerId` (el hash de la clave del navegador, como
 * el progreso en `playerStore`): cuando haya cuentas, al vincular la clave con el usuario la barra lo
 * sigue. El resto del server usa sólo `BarraRepository`; hoy la implementa un archivo JSON y mañana,
 * Supabase (tablas `barras` e integrantes, ver `docs/pending/supabase-base-de-datos-y-auth.md`).
 */

export interface BarraMember {
  /** El último nombre con el que entró (para el panel, aunque esté desconectado). */
  name: string;
  role: BarraRole;
  joinedAt: string;
}

export interface BarraRecord {
  id: string;
  name: string;
  tag: string;
  colors: [BarraColorId, BarraColorId];
  /** `playerId` del fundador. */
  founderId: string;
  createdAt: string;
  members: Record<string, BarraMember>;
}

/** Lo que el server necesita de las barras guardadas (lo que hay que reimplementar al migrar). */
export interface BarraRepository {
  get(id: string): BarraRecord | undefined;
  /** La barra de este jugador (`playerId`), si tiene. */
  ofMember(playerId: string): BarraRecord | undefined;
  /** ¿Hay una barra con este nombre (o uno que se ve igual, `nameKey`) o esta sigla? */
  nameTaken(name: string): boolean;
  tagTaken(tag: string): boolean;
  create(input: { name: string; tag: string; colors: [BarraColorId, BarraColorId]; founderId: string; founderName: string }): BarraRecord;
  addMember(barraId: string, playerId: string, name: string): boolean;
  removeMember(barraId: string, playerId: string): boolean;
  /** Actualiza el nombre con el que se lo muestra (al entrar al juego). */
  renameMember(barraId: string, playerId: string, name: string): void;
  disband(barraId: string): BarraRecord | undefined;
}

const FILE_VERSION = 1;
interface StoreFile {
  version: typeof FILE_VERSION;
  barras: BarraRecord[];
}

/** Cada cuánto se escribe el archivo como mucho (los cambios se juntan en una escritura). */
const WRITE_DELAY_MS = 1000;

/**
 * Las barras en un archivo JSON (`BARRA_DATA_FILE`, por defecto `apps/server/data/barras.json`), todas
 * en memoria con un índice por integrante. Escritura asíncrona, de a una, a un temporal que después se
 * renombra (como `playerStore`). Alcanza para una sola instancia del server.
 */
class JsonBarraStore implements BarraRepository {
  private readonly file = process.env.BARRA_DATA_FILE ? path.resolve(process.env.BARRA_DATA_FILE) : path.resolve(__dirname, "../data/barras.json");
  private readonly barras = new Map<string, BarraRecord>();
  /** `playerId` → id de su barra. */
  private readonly byMember = new Map<string, string>();
  private timer: NodeJS.Timeout | null = null;
  private writing: Promise<void> | null = null;
  private dirty = false;

  constructor() {
    try {
      const parsed = JSON.parse(readFileSync(this.file, "utf8")) as StoreFile;
      for (const barra of parsed.barras ?? []) this.index(barra);
      console.log(`[BarraStore] ${this.barras.size} barras guardadas en ${this.file}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      console.log(`[BarraStore] sin barras todavía; se van a guardar en ${this.file}`);
    }
  }

  get(id: string) {
    return this.barras.get(id);
  }

  ofMember(playerId: string) {
    const id = this.byMember.get(playerId);
    return id ? this.barras.get(id) : undefined;
  }

  nameTaken(name: string) {
    const wanted = nameKey(name);
    return [...this.barras.values()].some((barra) => nameKey(barra.name) === wanted);
  }

  tagTaken(tag: string) {
    return [...this.barras.values()].some((barra) => barra.tag === tag);
  }

  create({ name, tag, colors, founderId, founderName }: { name: string; tag: string; colors: [BarraColorId, BarraColorId]; founderId: string; founderName: string }) {
    const now = new Date().toISOString();
    const barra: BarraRecord = {
      id: randomUUID(),
      name,
      tag,
      colors,
      founderId,
      createdAt: now,
      members: { [founderId]: { name: founderName, role: "fundador", joinedAt: now } },
    };
    this.index(barra);
    this.changed();
    return barra;
  }

  addMember(barraId: string, playerId: string, name: string) {
    const barra = this.barras.get(barraId);
    if (!barra || this.byMember.has(playerId)) return false;
    barra.members[playerId] = { name, role: "integrante", joinedAt: new Date().toISOString() };
    this.byMember.set(playerId, barraId);
    this.changed();
    return true;
  }

  removeMember(barraId: string, playerId: string) {
    const barra = this.barras.get(barraId);
    if (!barra?.members[playerId]) return false;
    delete barra.members[playerId];
    this.byMember.delete(playerId);
    this.changed();
    return true;
  }

  renameMember(barraId: string, playerId: string, name: string) {
    const member = this.barras.get(barraId)?.members[playerId];
    if (!member || member.name === name) return;
    member.name = name;
    this.changed();
  }

  disband(barraId: string) {
    const barra = this.barras.get(barraId);
    if (!barra) return undefined;
    for (const id of Object.keys(barra.members)) this.byMember.delete(id);
    this.barras.delete(barraId);
    this.changed();
    return barra;
  }

  /** Escribe lo pendiente ya (al apagar el server). */
  async flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    while (this.writing) await this.writing;
    if (!this.dirty) return;
    this.dirty = false;
    this.writing = this.write().finally(() => {
      this.writing = null;
    });
    await this.writing;
  }

  private index(barra: BarraRecord) {
    this.barras.set(barra.id, barra);
    for (const id of Object.keys(barra.members)) this.byMember.set(id, barra.id);
  }

  private changed() {
    this.dirty = true;
    this.timer ??= setTimeout(() => void this.flush(), WRITE_DELAY_MS);
  }

  private async write() {
    const json = JSON.stringify({ version: FILE_VERSION, barras: [...this.barras.values()] } satisfies StoreFile);
    try {
      await mkdir(path.dirname(this.file), { recursive: true, mode: 0o700 });
      const tmp = `${this.file}.tmp`;
      await writeFile(tmp, json, { mode: 0o600 });
      await chmod(tmp, 0o600);
      await rename(tmp, this.file);
    } catch (error) {
      // Se reintenta en la próxima: lo que está en memoria no se pierde.
      this.dirty = true;
      console.error("[BarraStore] no se pudo escribir", error);
    }
  }
}

export const barraStore = new JsonBarraStore();
