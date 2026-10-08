"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.travelTickets = exports.playerStore = exports.INACTIVE_KEY_MS = exports.activeSessions = void 0;
exports.playerId = playerId;
exports.isUntouched = isUntouched;
exports.issueTravelTicket = issueTravelTicket;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const shared_1 = require("@montevideo-world/shared");
const metrics_1 = require("./metrics");
/**
 * Id con el que se guarda un jugador: SHA-256 (hex) de su clave. El archivo nunca tiene las claves:
 * si se filtra, no sirve para entrar como nadie (la clave tiene 128 bits al azar, no hace falta sal).
 * Las primeras 8 letras son la que sale en los logs (`audit.ts`).
 */
function playerId(key) {
    return (0, node_crypto_1.createHash)("sha256").update(key).digest("hex");
}
/** Formato del archivo: `{ version: 2, players: { [playerId]: PlayerRecord } }`. El viejo (sin versión) era `{ [clave]: PlayerRecord }`. */
const FILE_VERSION = 2;
/**
 * Qué sesión está usando cada clave ahora (en cualquier sala). Una clave = una sesión a la vez: si
 * entra de nuevo (otra pestaña, recargar antes de que se cierre la anterior), la vieja se guarda y
 * se cierra. Así nadie puede duplicar ítems abriendo dos pestañas con la misma mochila.
 */
exports.activeSessions = new Map();
/** Cada cuánto se escribe el archivo como máximo (los cambios se juntan en una sola escritura). */
const WRITE_DELAY_MS = 2000;
/** Claves sin cambios en este tiempo y sin progreso (ver `isUntouched`) se borran del archivo. */
exports.INACTIVE_KEY_MS = 90 * 24 * 60 * 60 * 1000;
/** Claves nuevas intactas (sólo en memoria): se olvidan si nadie las usa en este tiempo. */
const EPHEMERAL_KEY_MS = 60 * 60 * 1000;
const EPHEMERAL_SWEEP_MS = 10 * 60 * 1000;
/** Cada cuánto se buscan claves para borrar (además de al arrancar). */
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;
/**
 * ¿Es un jugador que entró y nunca avanzó? Sin plata de más, sin nada en la mochila que no sea del
 * kit inicial, sin mascota, sin ser donador y sin estar preso. Perder uno de éstos no le quita nada
 * a nadie: si vuelve, arranca igual que como estaba.
 */
function isUntouched(record, now = Date.now()) {
    const starter = new Set(shared_1.STARTER_INVENTORY);
    return (record.money <= shared_1.STARTING_MONEY &&
        (record.inventory ?? []).every((stack) => starter.has(stack.itemId)) &&
        !record.pet &&
        !record.donor &&
        !(record.jailedUntil && record.jailedUntil > now));
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
    constructor() {
        this.file = process.env.PLAYER_DATA_FILE
            ? node_path_1.default.resolve(process.env.PLAYER_DATA_FILE)
            : node_path_1.default.resolve(__dirname, "../data/players.json");
        this.records = new Map();
        /** Lo último guardado de cada clave (sin `updatedAt`), para saber si cambió. */
        this.fingerprints = new Map();
        /** Claves nuevas que siguen intactas: están en `records` pero no se escriben (ver `set`). */
        this.ephemeral = new Set();
        this.timer = null;
        /** Escritura en curso (una a la vez) y si quedaron cambios para otra. */
        this.writing = null;
        this.dirty = false;
        /** Última escritura (null hasta la primera). */
        this.lastFlush = null;
        try {
            const parsed = JSON.parse((0, node_fs_1.readFileSync)(this.file, "utf8"));
            if (parsed.version === FILE_VERSION) {
                this.records = new Map(Object.entries(parsed.players));
            }
            else {
                // Formato viejo, indexado por la clave en texto plano: se pasa a ids y se reescribe ya. Antes
                // se deja una copia (el código viejo no lee el formato nuevo: sirve para volver atrás). Tiene
                // las claves: borrarla cuando ya no haga falta.
                const backup = `${this.file}.v1.bak`;
                (0, node_fs_1.copyFileSync)(this.file, backup);
                (0, node_fs_1.chmodSync)(backup, 0o600);
                const old = Object.entries(parsed);
                this.records = new Map(old.map(([key, record]) => [playerId(key), record]));
                this.dirty = true;
                this.timer = setTimeout(() => void this.flush(), WRITE_DELAY_MS);
                console.log(`[PlayerStore] archivo viejo: ${old.length} claves pasan a guardarse por su hash (copia del original en ${backup})`);
            }
            for (const [id, { updatedAt: _, ...record }] of this.records)
                this.fingerprints.set(id, JSON.stringify(record));
            console.log(`[PlayerStore] ${this.records.size} jugadores guardados en ${this.file}`);
            this.prune();
        }
        catch (error) {
            if (error.code !== "ENOENT")
                throw error;
            console.log(`[PlayerStore] sin datos todavía; se van a guardar en ${this.file}`);
        }
        setInterval(() => this.prune(), PRUNE_INTERVAL_MS).unref();
        setInterval(() => this.forgetEphemeral(), EPHEMERAL_SWEEP_MS).unref();
    }
    /** Olvida las claves sólo-en-memoria que nadie usa hace `EPHEMERAL_KEY_MS`. Devuelve cuántas. */
    forgetEphemeral(now = Date.now()) {
        let removed = 0;
        const active = activeIds();
        for (const id of this.ephemeral) {
            const record = this.records.get(id);
            if (active.has(id) || (record && now - Date.parse(record.updatedAt) < EPHEMERAL_KEY_MS))
                continue;
            this.ephemeral.delete(id);
            this.records.delete(id);
            this.fingerprints.delete(id);
            removed += 1;
        }
        return removed;
    }
    /**
     * Borra las claves sin cambios hace más de `INACTIVE_KEY_MS` que nunca avanzaron (`isUntouched`):
     * cada navegador nuevo suma una clave y, sin esto, el archivo (y armarlo) crecería sin techo. Las
     * claves en uso (`activeSessions`) no se tocan. Devuelve cuántas borró.
     */
    prune(now = Date.now()) {
        let removed = 0;
        const active = activeIds();
        for (const [id, record] of this.records) {
            const updatedAt = Date.parse(record.updatedAt);
            if (active.has(id) || !(now - updatedAt > exports.INACTIVE_KEY_MS) || !isUntouched(record, now))
                continue;
            this.records.delete(id);
            this.fingerprints.delete(id);
            removed += 1;
        }
        if (removed > 0) {
            console.log(`[PlayerStore] se borraron ${removed} claves sin actividad (quedan ${this.size})`);
            this.dirty = true;
            this.timer ??= setTimeout(() => void this.flush(), WRITE_DELAY_MS);
        }
        return removed;
    }
    /** Cuántos jugadores hay guardados (en el archivo; sin las claves sólo en memoria). */
    get size() {
        return this.records.size - this.ephemeral.size;
    }
    /** Lo guardado de la clave (se busca por su hash, `playerId`). */
    get(key) {
        return this.records.get(playerId(key));
    }
    /** Lo guardado de un id (`playerId`), para lo que no tiene la clave (ban a un desconectado). */
    getById(id) {
        return this.records.get(id);
    }
    /** Ids (`playerId`) de los jugadores guardados con ese nombre o uno que se ve igual (`nameKey`). */
    idsByName(name) {
        const wanted = (0, shared_1.nameKey)(name);
        const ids = [];
        for (const [id, record] of this.records) {
            if ((0, shared_1.nameKey)(record.name) === wanted)
                ids.push(id);
        }
        return ids;
    }
    /** Preso hasta `until` (0 = libre) para un jugador guardado que no está conectado (`/ban`). */
    setJailedUntil(id, until) {
        const record = this.records.get(id);
        if (!record)
            return;
        const { updatedAt: _, ...rest } = record;
        this.store(id, { ...rest, jailedUntil: until || undefined });
    }
    /**
     * Guarda el jugador si cambió desde la última vez; si no, no hace nada.
     *
     * Una clave nueva que sigue intacta (`isUntouched`) queda **sólo en memoria** (`ephemeral`): así
     * viajar de barrio, `/trace` o abrir otra pestaña la encuentran (si no, llegaría con el kit y la
     * plata de nuevo), pero entrar y salir (o un script con claves al azar) no suma registros al
     * archivo. Se escribe recién cuando tiene algo que perder, y desde ahí siempre (aunque vuelva a
     * quedar intacta). Las que nadie usa en `EPHEMERAL_KEY_MS` se olvidan (`forgetEphemeral`).
     */
    set(key, record) {
        this.store(playerId(key), record);
    }
    store(key, record) {
        const fingerprint = JSON.stringify(record);
        if (this.fingerprints.get(key) === fingerprint)
            return;
        this.fingerprints.set(key, fingerprint);
        const onlyInMemory = !this.records.has(key) || this.ephemeral.has(key);
        const stored = { ...record, updatedAt: new Date().toISOString() };
        this.records.set(key, stored);
        if (onlyInMemory && isUntouched(stored)) {
            this.ephemeral.add(key);
            return;
        }
        this.ephemeral.delete(key);
        this.dirty = true;
        this.timer ??= setTimeout(() => void this.flush(), WRITE_DELAY_MS);
    }
    /** Escribe lo pendiente ya (al apagar el server); espera a que termine. */
    async flush() {
        if (this.timer)
            clearTimeout(this.timer);
        this.timer = null;
        // Una escritura a la vez: si hay una en curso, se espera y, si quedó algo nuevo, se escribe después.
        while (this.writing)
            await this.writing;
        if (!this.dirty)
            return;
        this.dirty = false;
        this.writing = this.write().finally(() => {
            this.writing = null;
        });
        await this.writing;
    }
    async write() {
        const started = performance.now();
        const file = {
            version: FILE_VERSION,
            players: Object.fromEntries([...this.records].filter(([id]) => !this.ephemeral.has(id))),
        };
        const json = JSON.stringify(file);
        const serializedMs = performance.now() - started;
        const stats = (ok) => ({
            at: new Date().toISOString(),
            serializeMs: (0, metrics_1.round)(serializedMs),
            totalMs: (0, metrics_1.round)(performance.now() - started),
            bytes: Buffer.byteLength(json),
            players: this.size,
            ok,
        });
        try {
            // Sólo el usuario del server puede leerlo: las claves son la única credencial de cada jugador.
            // (`mode` sólo vale al crear: el `chmod` cubre un `.tmp` viejo que haya quedado con otros
            // permisos, y el `rename` le pasa los del `.tmp` al archivo final.)
            await (0, promises_1.mkdir)(node_path_1.default.dirname(this.file), { recursive: true, mode: 0o700 });
            const tmp = `${this.file}.tmp`;
            await (0, promises_1.writeFile)(tmp, json, { mode: 0o600 });
            await (0, promises_1.chmod)(tmp, 0o600);
            await (0, promises_1.rename)(tmp, this.file);
        }
        catch (error) {
            // Se reintenta en la próxima: lo que está en memoria no se pierde.
            this.dirty = true;
            this.lastFlush = stats(false);
            console.error("[PlayerStore] no se pudo escribir", error);
            return;
        }
        this.lastFlush = stats(true);
        if (serializedMs > 50) {
            console.warn(`[PlayerStore] armar el archivo (${this.size} jugadores) frenó el server ${Math.round(serializedMs)} ms`);
        }
    }
}
exports.playerStore = new PlayerStore();
exports.travelTickets = new Map();
/**
 * Emitir un boleto (reemplaza el anterior de esa clave). De paso se borran los vencidos que nadie
 * usó (pagó y no viajó): sin esto el `Map` crecería para siempre. Recorrerlo es barato: hay como
 * mucho un boleto por clave y duran `TRAVEL_TICKET_MS`.
 */
function issueTravelTicket(key, cityId, expiresAt, now = Date.now(), place = {}) {
    for (const [other, ticket] of exports.travelTickets) {
        if (ticket.expiresAt < now)
            exports.travelTickets.delete(other);
    }
    exports.travelTickets.set(key, { cityId, expiresAt, ...place });
}
/** Ids (`playerId`) de las claves que están conectadas ahora: no se borran ni se olvidan. */
function activeIds() {
    return new Set([...exports.activeSessions.keys()].map(playerId));
}
//# sourceMappingURL=playerStore.js.map