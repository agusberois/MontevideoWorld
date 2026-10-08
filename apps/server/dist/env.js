"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowAnyOrigin = exports.allowedOrigins = void 0;
exports.isOriginAllowed = isOriginAllowed;
exports.adminName = adminName;
exports.isAdminName = isAdminName;
exports.healthToken = healthToken;
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
 * Orígenes (páginas) que pueden usar el server (`CORS_ORIGIN`: `*` o lista separada por comas, p. ej.
 * `https://montevideoworld.com,https://app.montevideoworld.com`). Sin definir = `*` (desarrollo).
 */
exports.allowedOrigins = (process.env.CORS_ORIGIN ?? "*")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
/** ¿Acepta cualquier origen? En producción no debería (se avisa al arrancar). */
exports.allowAnyOrigin = exports.allowedOrigins.length === 0 || exports.allowedOrigins.includes("*");
/**
 * ¿Puede una página de este origen usar el server? Sin `Origin` (un script, `curl`) se deja pasar:
 * esto no frena bots, sí que otra página use el navegador de sus visitantes contra el server.
 */
function isOriginAllowed(origin) {
    return exports.allowAnyOrigin || !origin || exports.allowedOrigins.includes(origin);
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
/**
 * Token para ver `/health/full` desde afuera de la máquina (`HEALTH_TOKEN`, header
 * `Authorization: Bearer …`), o null si no hay: entonces sólo se ve desde la misma máquina.
 */
function healthToken() {
    const token = process.env.HEALTH_TOKEN?.trim();
    return token ? token : null;
}
/** Cuántos minutos reales dura un día del juego (`DAY_LENGTH_MINUTES`, por defecto 24). */
function dayLengthMinutes() {
    const value = Number(process.env.DAY_LENGTH_MINUTES);
    return Number.isFinite(value) && value > 0 ? value : shared_1.DEFAULT_DAY_LENGTH_MINUTES;
}
//# sourceMappingURL=env.js.map