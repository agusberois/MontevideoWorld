"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminName = adminName;
exports.isAdminName = isAdminName;
exports.dayLengthMinutes = dayLengthMinutes;
const node_path_1 = __importDefault(require("node:path"));
const shared_1 = require("@montevideo-world/shared");
/**
 * Carga `apps/server/.env` (si existe) en `process.env` antes que cualquier otro módulo lea la
 * configuración: por eso `index.ts` importa este archivo primero. Las variables que ya vengan del
 * entorno (shell, PM2, systemd) tienen prioridad sobre las del archivo.
 */
const envFile = node_path_1.default.resolve(__dirname, "../.env");
try {
    process.loadEnvFile(envFile);
}
catch (error) {
    if (error.code !== "ENOENT")
        throw error;
}
/**
 * Nombre con el que se entra como admin (`ADMIN_NAME`), o null si no hay. Se compara sin
 * distinguir mayúsculas. Ojo: sin cuentas ni contraseña, cualquiera que use ese nombre es admin.
 */
function adminName() {
    const name = process.env.ADMIN_NAME?.trim();
    return name ? name : null;
}
function isAdminName(name) {
    const admin = adminName();
    return admin !== null && name.toLocaleLowerCase("es") === admin.toLocaleLowerCase("es");
}
/** Cuántos minutos reales dura un día del juego (`DAY_LENGTH_MINUTES`, por defecto 24). */
function dayLengthMinutes() {
    const value = Number(process.env.DAY_LENGTH_MINUTES);
    return Number.isFinite(value) && value > 0 ? value : shared_1.DEFAULT_DAY_LENGTH_MINUTES;
}
//# sourceMappingURL=env.js.map