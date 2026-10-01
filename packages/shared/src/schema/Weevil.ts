import { Schema, type } from "@colyseus/schema";

/**
 * Picudo rojo en el barrio (ver `weevils.ts`). Lo mueve el server; la posición es continua (en
 * tiles, con decimales) porque se arrastra en cualquier dirección, no de tile en tile.
 */
export class Weevil extends Schema {
  @type("float32") x = 0;
  @type("float32") y = 0;
  /** `WeevilMode`: "emerge" | "chase" | "leave" | "dead". */
  @type("string") mode = "emerge";
  /** A quién persigue (sessionId) o "". */
  @type("string") targetId = "";
  /** Sube en cada picadura: los clientes animan el mordisco y el "-2" sobre el picado. */
  @type("uint16") bites = 0;
}
