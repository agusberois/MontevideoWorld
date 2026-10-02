import { MapSchema, Schema, type } from "@colyseus/schema";
import { Player } from "./Player";
import { Weevil } from "./Weevil";

export class GameState extends Schema {
  /** Clave = sessionId del cliente. */
  @type({ map: Player }) players = new MapSchema<Player>();
  /** Hora del juego, minuto del día 0–1439 (reloj global del server, ver `time.ts`). */
  @type("uint16") minuteOfDay = 0;
  /**
   * Qué copia del barrio es esta sala (1 = la primera). Con una sala llena se abre otra copia del
   * mismo barrio; el HUD lo muestra para que no parezca que no hay nadie.
   */
  @type("uint8") copy = 1;
  /** Partido que se juega ahora en el Centenario ("" = ninguno): lo ve todo el barrio (hinchas en el estadio). */
  @type("string") match = "";
  /** Si el admin forzó el partido (`MatchMode`): para su panel. */
  @type("string") matchMode = "auto";
  /** Picudos rojos sueltos en el barrio. Clave = id del picudo. */
  @type({ map: Weevil }) weevils = new MapSchema<Weevil>();
}
