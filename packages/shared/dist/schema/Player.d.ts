import { Schema } from "@colyseus/schema";
export declare class Player extends Schema {
    sessionId: string;
    name: string;
    color: string;
    /** Aspecto elegido al entrar (ver `appearance.ts`): sexo, índices de piel y color de pelo, peinado. */
    gender: string;
    skin: number;
    hairColor: number;
    hairStyle: string;
    /** Tile actual (coordenadas de grilla, no píxeles). */
    x: number;
    y: number;
    /** Sentado en el banco del tile actual. */
    sitting: boolean;
    /** Pescando desde la escollera (los demás lo ven con la caña). */
    fishing: boolean;
    /** Caña con la que está pescando (id de `RODS`; "" si no pesca): los demás la ven de su color. */
    rod: string;
    /** Vendiendo en la explanada del Centenario (los demás lo ven con su carrito). */
    vending: boolean;
    /** Carrito con el que está vendiendo (id de `CARTS`; "" si no vende): los demás lo ven de su color. */
    cart: string;
    /** Mascota que lo sigue (id de `PETS`; "" = ninguna) y su nombre: todos la ven. */
    pet: string;
    petName: string;
    /** Preso en el COMCAR (`/ban`): segundos que le quedan (0 = libre). */
    jailLeft: number;
    /** Hincha que se acerca al carrito (`CustomerState`: nadie, llegando, compró, siguió de largo). */
    customer: number;
    /** Sube en cada venta: los clientes muestran "¡Vendido!" sobre el vendedor. */
    sales: number;
    /** Sube en cada patada (a un picudo): los clientes animan la patada del avatar. */
    kicks: number;
    /** Energía 0–100 (redondeada; el server lleva el valor exacto). Ver `needs.ts`. */
    energy: number;
    /** Donador: aporta plata al proyecto. Se muestra un distintivo arriba del nombre (lo pone el admin con /donador). */
    donor: boolean;
    /** Entró con el nombre de admin (`ADMIN_NAME` del server): puede cambiar cosas del barrio. */
    admin: boolean;
    /** Prendas puestas: id de `ITEMS` o "" si no tiene nada en ese lugar. */
    hat: string;
    top: string;
    bottom: string;
    shoes: string;
}
//# sourceMappingURL=Player.d.ts.map