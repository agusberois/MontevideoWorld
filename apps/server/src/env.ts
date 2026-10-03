import path from "node:path";
import { DEFAULT_DAY_LENGTH_MINUTES } from "@montevideo-world/shared";

/**
 * Carga `apps/server/.env` (si existe) en `process.env` antes que cualquier otro módulo lea la
 * configuración: por eso `index.ts` importa este archivo primero. Las variables que ya vengan del
 * entorno (shell, PM2, systemd) tienen prioridad sobre las del archivo.
 */
const envFile = path.resolve(__dirname, "../.env");
try {
  process.loadEnvFile(envFile);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

/**
 * Orígenes (páginas) que pueden usar el server (`CORS_ORIGIN`: `*` o lista separada por comas, p. ej.
 * `https://montevideoworld.com,https://app.montevideoworld.com`). Sin definir = `*` (desarrollo).
 */
export const allowedOrigins = (process.env.CORS_ORIGIN ?? "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

/** ¿Acepta cualquier origen? En producción no debería (se avisa al arrancar). */
export const allowAnyOrigin = allowedOrigins.length === 0 || allowedOrigins.includes("*");

/**
 * ¿Puede una página de este origen usar el server? Sin `Origin` (un script, `curl`) se deja pasar:
 * esto no frena bots, sí que otra página use el navegador de sus visitantes contra el server.
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  return allowAnyOrigin || !origin || allowedOrigins.includes(origin);
}

/**
 * Nombre con el que se entra como admin (`ADMIN_NAME`), o null si no hay. Se compara sin
 * distinguir mayúsculas. Ojo: sin cuentas ni contraseña, cualquiera que use ese nombre es admin.
 */
export function adminName(): string | null {
  const name = process.env.ADMIN_NAME?.trim();
  return name ? name : null;
}

export function isAdminName(name: string): boolean {
  const admin = adminName();
  return admin !== null && name.toLocaleLowerCase("es") === admin.toLocaleLowerCase("es");
}

/**
 * Token para ver `/health/full` desde afuera de la máquina (`HEALTH_TOKEN`, header
 * `Authorization: Bearer …`), o null si no hay: entonces sólo se ve desde la misma máquina.
 */
export function healthToken(): string | null {
  const token = process.env.HEALTH_TOKEN?.trim();
  return token ? token : null;
}

/** Cuántos minutos reales dura un día del juego (`DAY_LENGTH_MINUTES`, por defecto 24). */
export function dayLengthMinutes(): number {
  const value = Number(process.env.DAY_LENGTH_MINUTES);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_DAY_LENGTH_MINUTES;
}
