import { Schema } from "@colyseus/schema";
/**
 * Picudo rojo en el barrio (ver `weevils.ts`). Lo mueve el server; la posición es continua (se
 * arrastra en cualquier dirección, no de tile en tile) y viaja en centésimas de tile como entero
 * (`WEEVIL_POSITION_SCALE`, `weevilTile` para leerla): son lo que más se actualiza del barrio.
 */
export declare class Weevil extends Schema {
    /** Posición en centésimas de tile (`weevilTile` la pasa a tiles). */
    x: number;
    y: number;
    /** `WeevilMode` como su índice en `WEEVIL_MODES` (`weevilModeOf`): emerge, chase, leave, dead. */
    mode: number;
    /** A quién persigue (sessionId) o "". */
    targetId: string;
    /** Sube en cada picadura: los clientes animan el mordisco y el "-2" sobre el picado. */
    bites: number;
}
//# sourceMappingURL=Weevil.d.ts.map