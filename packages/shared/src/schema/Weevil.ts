import { Schema, type } from "@colyseus/schema";

/**
 * Picudo rojo en el barrio (ver `weevils.ts`). Lo mueve el server; la posición es continua (se
 * arrastra en cualquier dirección, no de tile en tile) y viaja en centésimas de tile como entero
 * (`WEEVIL_POSITION_SCALE`, `weevilTile` para leerla): son lo que más se actualiza del barrio.
 */
export class Weevil extends Schema {
  /** Posición en centésimas de tile (`weevilTile` la pasa a tiles). */
  @type("uint16") x = 0;
  @type("uint16") y = 0;
  /** `WeevilMode` como su índice en `WEEVIL_MODES` (`weevilModeOf`): emerge, chase, leave, dead. */
  @type("uint8") mode = 0;
  /** A quién persigue (sessionId) o "". */
  @type("string") targetId = "";
  /** Sube en cada picadura: los clientes animan el mordisco y el "-2" sobre el picado. */
  @type("uint16") bites = 0;
}
