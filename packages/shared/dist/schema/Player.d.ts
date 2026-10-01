import { Schema } from "@colyseus/schema";
export declare class Player extends Schema {
    sessionId: string;
    name: string;
    color: string;
    /** Tile actual (coordenadas de grilla, no píxeles). */
    x: number;
    y: number;
    /** Sentado en el banco del tile actual. */
    sitting: boolean;
    /** Pescando desde la escollera (los demás lo ven con la caña). */
    fishing: boolean;
    /** Energía 0–100 (redondeada; el server lleva el valor exacto). Ver `stamina.ts`. */
    stamina: number;
    /** Entró con el nombre de admin (`ADMIN_NAME` del server): puede cambiar cosas del barrio. */
    admin: boolean;
    /** Prendas puestas: id de `ITEMS` o "" si no tiene nada en ese lugar. */
    hat: string;
    top: string;
    bottom: string;
    shoes: string;
}
//# sourceMappingURL=Player.d.ts.map