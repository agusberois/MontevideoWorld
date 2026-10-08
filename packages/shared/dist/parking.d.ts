/**
 * Cuidar coches (el trabajo del cuidacoches, frente a cualquier edificio con nombre de los barrios,
 * `CityMap.canParkAt`; nunca frente a tiendas ni kioscos): reglas que
 * comparten el server (que sortea y paga) y el cliente (que las muestra en el panel).
 *
 * Funciona como tocar en la calle, pero sin herramienta que se gaste: hace falta tener **puesto el
 * chaleco flúo** (`SAFETY_VEST_ID`) y pararse frente a un edificio con nombre. Llega un auto,
 * estaciona al lado, el cuidacoches le hace señas con la franela y, al rato, el dueño vuelve y deja
 * (o no) una moneda.
 */
/**
 * El auto de mentira (sólo lo ve el cuidacoches, `park:car`): llega y estaciona `CAR_ARRIVE_MS`
 * después de empezar y, al terminar, el dueño deja plata (`Tipped`) o se va sin dejar nada (`Left`).
 * Cortar (moverse, etc.) lo manda a `None`: arranca y se va.
 */
export declare const CarState: {
    readonly None: 0;
    readonly Arriving: 1;
    readonly Tipped: 2;
    readonly Left: 3;
};
export type CarState = (typeof CarState)[keyof typeof CarState];
export declare const CAR_ARRIVE_MS = 400;
/** La propina, en pesos enteros (sorteada pareja entre los dos). */
export declare const PARK_TIP_MIN = 6;
export declare const PARK_TIP_MAX = 14;
/** Que el dueño se vaya sin dejar nada ("hoy no tengo cambio"). */
export declare const PARK_NO_TIP_CHANCE = 0.3;
/** Cuánto tarda el dueño en volver (al azar entre los dos, sorteado aparte del resultado). */
export declare const PARK_WAIT_MIN_MS = 5000;
export declare const PARK_WAIT_MAX_MS = 8000;
/** ¿Tiene puesto el chaleco flúo? (Sin él no se puede cuidar coches.) */
export declare function wearsSafetyVest(top: string): boolean;
/** Plata que deja en promedio cada auto, contando los que no dejan nada. */
export declare function parkValue(): number;
/** Plata por hora cuidando coches (con lo que hay que descansar para reponer la energía; no hay herramienta que se gaste). */
export declare function parkingHourlyIncome(): number;
/** Las reglas en frases cortas, para el panel. */
export declare function parkingPerks(): string[];
//# sourceMappingURL=parking.d.ts.map