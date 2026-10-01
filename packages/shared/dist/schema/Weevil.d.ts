import { Schema } from "@colyseus/schema";
/**
 * Picudo rojo en el barrio (ver `weevils.ts`). Lo mueve el server; la posición es continua (en
 * tiles, con decimales) porque se arrastra en cualquier dirección, no de tile en tile.
 */
export declare class Weevil extends Schema {
    x: number;
    y: number;
    /** `WeevilMode`: "emerge" | "chase" | "leave" | "dead". */
    mode: string;
    /** A quién persigue (sessionId) o "". */
    targetId: string;
    /** Sube en cada picadura: los clientes animan el mordisco y el "-2" sobre el picado. */
    bites: number;
}
//# sourceMappingURL=Weevil.d.ts.map