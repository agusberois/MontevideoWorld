import { Schema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") sessionId = "";
  @type("string") name = "";
  @type("string") color = "#ffffff";
  /** Tile actual (coordenadas de grilla, no píxeles). */
  @type("uint8") x = 0;
  @type("uint8") y = 0;
  /** Sentado en el banco del tile actual. */
  @type("boolean") sitting = false;
  /** Pescando desde la escollera (los demás lo ven con la caña). */
  @type("boolean") fishing = false;
  /** Energía 0–100 (redondeada; el server lleva el valor exacto). Ver `stamina.ts`. */
  @type("uint8") stamina = 100;
  /** Entró con el nombre de admin (`ADMIN_NAME` del server): puede cambiar cosas del barrio. */
  @type("boolean") admin = false;
  /** Prendas puestas: id de `ITEMS` o "" si no tiene nada en ese lugar. */
  @type("string") hat = "";
  @type("string") top = "";
  @type("string") bottom = "";
  @type("string") shoes = "";
}
