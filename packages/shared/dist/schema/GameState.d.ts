import { MapSchema, Schema } from "@colyseus/schema";
import { Player } from "./Player";
export declare class GameState extends Schema {
    /** Clave = sessionId del cliente. */
    players: MapSchema<Player, string>;
    /** Hora del juego, minuto del día 0–1439 (reloj global del server, ver `time.ts`). */
    minuteOfDay: number;
}
//# sourceMappingURL=GameState.d.ts.map