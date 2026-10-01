import { MapSchema, Schema, type } from "@colyseus/schema";
import { Player } from "./Player";
import { Weevil } from "./Weevil";

export class GameState extends Schema {
  /** Clave = sessionId del cliente. */
  @type({ map: Player }) players = new MapSchema<Player>();
  /** Hora del juego, minuto del día 0–1439 (reloj global del server, ver `time.ts`). */
  @type("uint16") minuteOfDay = 0;
  /** Picudos rojos sueltos en el barrio. Clave = id del picudo. */
  @type({ map: Weevil }) weevils = new MapSchema<Weevil>();
}
