import { Schema } from "@colyseus/schema";
export declare class Player extends Schema {
    sessionId: string;
    name: string;
    color: string;
    /**
     * Aspecto elegido al entrar (ver `appearance.ts`): sexo, índices de piel y color de pelo, peinado,
     * índice del color de ojos, barba y lentes.
     */
    gender: string;
    skin: number;
    hairColor: number;
    hairStyle: string;
    eyeColor: number;
    facialHair: string;
    glasses: string;
    /** Tile actual (coordenadas de grilla, no píxeles). */
    x: number;
    y: number;
    /** Escribiendo en el chat: los demás ven 💬 sobre su cabeza (lo apaga el server al hablar o si deja de avisar). */
    typing: boolean;
    /** Sentado en el banco del tile actual. */
    sitting: boolean;
    /** Metido en el jacuzzi (el lugar del tile actual; las Termas del Donador): todos lo ven en el agua. */
    bathing: boolean;
    /** Pescando desde la escollera (los demás lo ven con la caña). */
    fishing: boolean;
    /** Caña con la que está pescando (id de `RODS`; "" si no pesca): los demás la ven de su color. */
    rod: string;
    /** Vendiendo en la explanada del Centenario (los demás lo ven con su carrito). */
    vending: boolean;
    /** Carrito con el que está vendiendo (id de `CARTS`; "" si no vende): los demás lo ven de su color. */
    cart: string;
    /** Tocando en la calle en el Centro (los demás lo ven con su instrumento y las notas). */
    busking: boolean;
    /** Instrumento con el que toca (id de `INSTRUMENTS`; "" si no toca). */
    instrument: string;
    /** Sube con cada propina: los clientes muestran la moneda cayendo en el estuche. */
    tips: number;
    /** Barra a la que pertenece: sigla (2–4 letras; "" = ninguna) y su color principal ("#rrggbb"). La ven todos. */
    barraTag: string;
    barraColor: string;
    /** Nombre de la barra ("" = ninguna), para los detalles del jugador. */
    barraName: string;
    /** Mascota que lo sigue (id de `PETS`; "" = ninguna) y su nombre: todos la ven. */
    pet: string;
    petName: string;
    /** Preso en el COMCAR (`/ban`): segundos que le quedan (0 = libre). */
    jailLeft: number;
    /** Sube en cada venta: los clientes muestran "¡Vendido!" sobre el vendedor. */
    sales: number;
    /** Sube en cada patada (a un picudo): los clientes animan la patada del avatar. */
    kicks: number;
    /** Gesto que está haciendo (id de `GESTURES`; "" = ninguno). Lo pone y lo saca el server (`systems/gestures.ts`). */
    gesture: string;
    /** Gesto de a dos (`PAIR_GESTURES`): con quién (sessionId) y si lo invitó él (en el mate, el que convida). */
    gesturePartner: string;
    gestureLead: boolean;
    /** Energía 0–100 (redondeada; el server lleva el valor exacto). Ver `needs.ts`. */
    energy: number;
    /** Cansado: camina `TIRED_STEP_TICKS` veces más lento (lo decide el server; todos lo ven así). */
    tired: boolean;
    /** Donador: aporta plata al proyecto. Se muestra un distintivo arriba del nombre (lo pone el admin con /donador). */
    donor: boolean;
    /** Entró con el nombre de admin (`ADMIN_NAME` del server): puede cambiar cosas del barrio. */
    admin: boolean;
    /**
     * Admin volando con `/god`: se mueve en línea recta por arriba de todo (`GOD_FLIGHT_TILES` por
     * tick) y los demás clientes no lo dibujan (ni en la lista de jugadores). Al bajar cae en la
     * baldosa caminable más cercana.
     */
    flying: boolean;
    /** A quién sigue (sessionId; "" = a nadie): camina solo detrás de él (`systems/follow.ts`). */
    following: string;
    /** Prendas puestas: id de `ITEMS` o "" si no tiene nada en ese lugar. */
    hat: string;
    top: string;
    bottom: string;
    shoes: string;
}
//# sourceMappingURL=Player.d.ts.map