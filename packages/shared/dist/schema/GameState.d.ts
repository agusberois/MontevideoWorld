import { MapSchema, Schema } from "@colyseus/schema";
import { Player } from "./Player";
import { Weevil } from "./Weevil";
export declare class GameState extends Schema {
    /** Clave = sessionId del cliente. */
    players: MapSchema<Player, string>;
    /** Hora del juego, minuto del día 0–1439 (reloj global del server, ver `time.ts`). */
    minuteOfDay: number;
    /** Picudos rojos sueltos en el barrio. Clave = id del picudo. */
    weevils: MapSchema<Weevil, string>;
}
//# sourceMappingURL=GameState.d.ts.map