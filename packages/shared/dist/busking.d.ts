import { InstrumentItem } from "./items";
/**
 * Tocar en la calle (el Centro: 18 de Julio y sus plazas): reglas que comparten el server (que
 * sortea y paga) y el cliente (que las muestra en la tienda, la mochila y el panel de tocar).
 *
 * Funciona como la venta en el Centenario: se toca un tema, se espera y alguien deja (o no) una
 * propina. Lo propio de la calle es el **público**: cada jugador que esté cerca escuchando (sin
 * tocar) suma propina, y los que tocan cerca a la vez arman una **comparsa** y ganan todos un poco más.
 */
/**
 * El público de mentira (NPCs que sólo ve el músico, `busk:crowd`): se arriman `CROWD_ARRIVE_MS`
 * después de empezar el tema y, al terminar, aplauden y dejan plata (`Tipped`) o se van sin dejar
 * nada (`Left`). Cortar el tema (moverse, etc.) los manda a `None`: se van sin decir nada.
 */
export declare const CrowdState: {
    readonly None: 0;
    readonly Arriving: 1;
    readonly Tipped: 2;
    readonly Left: 3;
};
export type CrowdState = (typeof CrowdState)[keyof typeof CrowdState];
export declare const CROWD_ARRIVE_MS = 600;
/** Hasta cuántos tiles (en cualquier dirección) cuenta alguien como público o como compañero de comparsa. */
export declare const BUSK_LISTEN_RADIUS = 6;
/** Cada jugador escuchando suma esto a la propina… */
export declare const BUSK_LISTENER_BONUS = 0.15;
/** …hasta este tope (con 4 escuchando, el doble). */
export declare const BUSK_MAX_LISTENER_BONUS = 1;
/** Cada uno que toca cerca a la vez (la comparsa) suma esto… */
export declare const BUSK_PARTNER_BONUS = 0.1;
/** …hasta este tope. */
export declare const BUSK_MAX_PARTNER_BONUS = 0.3;
/** Lo que multiplica la propina con `listeners` escuchando y `partners` tocando cerca. */
export declare function buskMultiplier(listeners: number, partners: number): number;
/**
 * Plata que deja en promedio un tema con este instrumento, contando que nadie deje nada. Sin
 * público ni comparsa: es el piso.
 */
export declare function tipValue(instrument: InstrumentItem): number;
/** Las ventajas de un instrumento en frases cortas, para la tienda, la mochila y el panel de tocar. */
export declare function instrumentPerks(instrument: InstrumentItem): string[];
//# sourceMappingURL=busking.d.ts.map