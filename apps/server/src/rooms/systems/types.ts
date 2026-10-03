import type { ClientToServerMessages } from "@montevideo-world/shared";
import type { PlayerSession } from "../session";

/**
 * Qué hace la sala con cada mensaje del cliente, ya validado por su guard (`MESSAGE_GUARDS`) y sólo
 * para jugadores que están en la sala. Cada sistema arma las rutas de sus mensajes; `CityRoom` las
 * junta en un `MessageRoutes` completo (no compila si falta alguno).
 */
export type MessageRoutes = {
  [K in keyof ClientToServerMessages]: (session: PlayerSession, message: ClientToServerMessages[K]) => void;
};
