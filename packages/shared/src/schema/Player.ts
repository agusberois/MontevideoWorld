import { Schema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") sessionId = "";
  @type("string") name = "";
  @type("string") color = "#ffffff";
  /** Aspecto elegido al entrar (ver `appearance.ts`): sexo, índices de piel y color de pelo, peinado. */
  @type("string") gender = "m";
  @type("uint8") skin = 0;
  @type("uint8") hairColor = 0;
  @type("string") hairStyle = "short";
  /** Tile actual (coordenadas de grilla, no píxeles). */
  @type("uint8") x = 0;
  @type("uint8") y = 0;
  /** Sentado en el banco del tile actual. */
  @type("boolean") sitting = false;
  /** Pescando desde la escollera (los demás lo ven con la caña). */
  @type("boolean") fishing = false;
  /** Caña con la que está pescando (id de `RODS`; "" si no pesca): los demás la ven de su color. */
  @type("string") rod = "";
  /** Vendiendo en la explanada del Centenario (los demás lo ven con su carrito). */
  @type("boolean") vending = false;
  /** Carrito con el que está vendiendo (id de `CARTS`; "" si no vende): los demás lo ven de su color. */
  @type("string") cart = "";
  /** Mascota que lo sigue (id de `PETS`; "" = ninguna) y su nombre: todos la ven. */
  @type("string") pet = "";
  @type("string") petName = "";
  /** Preso en el COMCAR (`/ban`): segundos que le quedan (0 = libre). */
  @type("uint32") jailLeft = 0;
  /** Hincha que se acerca al carrito (`CustomerState`: nadie, llegando, compró, siguió de largo). */
  @type("uint8") customer = 0;
  /** Sube en cada venta: los clientes muestran "¡Vendido!" sobre el vendedor. */
  @type("uint16") sales = 0;
  /** Sube en cada patada (a un picudo): los clientes animan la patada del avatar. */
  @type("uint16") kicks = 0;
  /** Energía 0–100 (redondeada; el server lleva el valor exacto). Ver `needs.ts`. */
  @type("uint8") energy = 100;
  /** Donador: aporta plata al proyecto. Se muestra un distintivo arriba del nombre (lo pone el admin con /donador). */
  @type("boolean") donor = false;
  /** Entró con el nombre de admin (`ADMIN_NAME` del server): puede cambiar cosas del barrio. */
  @type("boolean") admin = false;
  /** Prendas puestas: id de `ITEMS` o "" si no tiene nada en ese lugar. */
  @type("string") hat = "";
  @type("string") top = "";
  @type("string") bottom = "";
  @type("string") shoes = "";
}
