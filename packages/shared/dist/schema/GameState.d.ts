import { MapSchema, Schema } from "@colyseus/schema";
import { Player } from "./Player";
import { Weevil } from "./Weevil";
export declare class GameState extends Schema {
    /** Clave = sessionId del cliente. */
    players: MapSchema<Player, string>;
    /** Hora del juego, minuto del día 0–1439 (reloj global del server, ver `time.ts`). */
    minuteOfDay: number;
    /**
     * Qué copia del barrio es esta sala (1 = la primera). Con una sala llena se abre otra copia del
     * mismo barrio; el HUD lo muestra para que no parezca que no hay nadie.
     */
    copy: number;
    /** Partido que se juega ahora en el Centenario ("" = ninguno): lo ve todo el barrio (hinchas en el estadio). */
    match: string;
    /** Si el admin forzó el partido (`MatchMode`): para su panel. */
    matchMode: string;
    /** Picudos rojos sueltos en el barrio. Clave = id del picudo. */
    weevils: MapSchema<Weevil, string>;
}
//# sourceMappingURL=GameState.d.ts.map