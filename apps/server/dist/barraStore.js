"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.barraStore = void 0;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const shared_1 = require("@montevideo-world/shared");
const FILE_VERSION = 1;
/** Cada cuánto se escribe el archivo como mucho (los cambios se juntan en una escritura). */
const WRITE_DELAY_MS = 1000;
/**
 * Las barras en un archivo JSON (`BARRA_DATA_FILE`, por defecto `apps/server/data/barras.json`), todas
 * en memoria con un índice por integrante. Escritura asíncrona, de a una, a un temporal que después se
 * renombra (como `playerStore`). Alcanza para una sola instancia del server.
 */
class JsonBarraStore {
    constructor() {
        this.file = process.env.BARRA_DATA_FILE ? node_path_1.default.resolve(process.env.BARRA_DATA_FILE) : node_path_1.default.resolve(__dirname, "../data/barras.json");
        this.barras = new Map();
        /** `playerId` → id de su barra. */
        this.byMember = new Map();
        this.timer = null;
        this.writing = null;
        this.dirty = false;
        try {
            const parsed = JSON.parse((0, node_fs_1.readFileSync)(this.file, "utf8"));
            for (const barra of parsed.barras ?? [])
                this.index(barra);
            console.log(`[BarraStore] ${this.barras.size} barras guardadas en ${this.file}`);
        }
        catch (error) {
            if (error.code !== "ENOENT")
                throw error;
            console.log(`[BarraStore] sin barras todavía; se van a guardar en ${this.file}`);
        }
    }
    get(id) {
        return this.barras.get(id);
    }
    ofMember(playerId) {
        const id = this.byMember.get(playerId);
        return id ? this.barras.get(id) : undefined;
    }
    nameTaken(name) {
        const wanted = (0, shared_1.nameKey)(name);
        return [...this.barras.values()].some((barra) => (0, shared_1.nameKey)(barra.name) === wanted);
    }
    tagTaken(tag) {
        return [...this.barras.values()].some((barra) => barra.tag === tag);
    }
    create({ name, tag, colors, founderId, founderName }) {
        const now = new Date().toISOString();
        const barra = {
            id: (0, node_crypto_1.randomUUID)(),
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
    addMember(barraId, playerId, name) {
        const barra = this.barras.get(barraId);
        if (!barra || this.byMember.has(playerId))
            return false;
        barra.members[playerId] = { name, role: "integrante", joinedAt: new Date().toISOString() };
        this.byMember.set(playerId, barraId);
        this.changed();
        return true;
    }
    removeMember(barraId, playerId) {
        const barra = this.barras.get(barraId);
        if (!barra?.members[playerId])
            return false;
        delete barra.members[playerId];
        this.byMember.delete(playerId);
        this.changed();
        return true;
    }
    renameMember(barraId, playerId, name) {
        const member = this.barras.get(barraId)?.members[playerId];
        if (!member || member.name === name)
            return;
        member.name = name;
        this.changed();
    }
    disband(barraId) {
        const barra = this.barras.get(barraId);
        if (!barra)
            return undefined;
        for (const id of Object.keys(barra.members))
            this.byMember.delete(id);
        this.barras.delete(barraId);
        this.changed();
        return barra;
    }
    /** Escribe lo pendiente ya (al apagar el server). */
    async flush() {
        if (this.timer)
            clearTimeout(this.timer);
        this.timer = null;
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
    index(barra) {
        this.barras.set(barra.id, barra);
        for (const id of Object.keys(barra.members))
            this.byMember.set(id, barra.id);
    }
    changed() {
        this.dirty = true;
        this.timer ??= setTimeout(() => void this.flush(), WRITE_DELAY_MS);
    }
    async write() {
        const json = JSON.stringify({ version: FILE_VERSION, barras: [...this.barras.values()] });
        try {
            await (0, promises_1.mkdir)(node_path_1.default.dirname(this.file), { recursive: true, mode: 0o700 });
            const tmp = `${this.file}.tmp`;
            await (0, promises_1.writeFile)(tmp, json, { mode: 0o600 });
            await (0, promises_1.chmod)(tmp, 0o600);
            await (0, promises_1.rename)(tmp, this.file);
        }
        catch (error) {
            // Se reintenta en la próxima: lo que está en memoria no se pierde.
            this.dirty = true;
            console.error("[BarraStore] no se pudo escribir", error);
        }
    }
}
exports.barraStore = new JsonBarraStore();
//# sourceMappingURL=barraStore.js.map