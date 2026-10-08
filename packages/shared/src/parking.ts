import { formatPercent } from "./fishing";
import { SAFETY_VEST_ID } from "./items";
import { formatMoney } from "./money";
import { PARK_ENERGY_COST, SIT_ENERGY_REGEN } from "./needs";

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
export const CarState = { None: 0, Arriving: 1, Tipped: 2, Left: 3 } as const;
export type CarState = (typeof CarState)[keyof typeof CarState];
export const CAR_ARRIVE_MS = 400;

/** La propina, en pesos enteros (sorteada pareja entre los dos). */
export const PARK_TIP_MIN = 6;
export const PARK_TIP_MAX = 14;
/** Que el dueño se vaya sin dejar nada ("hoy no tengo cambio"). */
export const PARK_NO_TIP_CHANCE = 0.3;
/** Cuánto tarda el dueño en volver (al azar entre los dos, sorteado aparte del resultado). */
export const PARK_WAIT_MIN_MS = 5000;
export const PARK_WAIT_MAX_MS = 8000;

/** ¿Tiene puesto el chaleco flúo? (Sin él no se puede cuidar coches.) */
export function wearsSafetyVest(top: string): boolean {
  return top === SAFETY_VEST_ID;
}

/** Plata que deja en promedio cada auto, contando los que no dejan nada. */
export function parkValue(): number {
  return (1 - PARK_NO_TIP_CHANCE) * ((PARK_TIP_MIN + PARK_TIP_MAX) / 2);
}

/** Plata por hora cuidando coches (con lo que hay que descansar para reponer la energía; no hay herramienta que se gaste). */
export function parkingHourlyIncome(): number {
  const seconds = (PARK_WAIT_MIN_MS + PARK_WAIT_MAX_MS) / 2000 + PARK_ENERGY_COST / SIT_ENERGY_REGEN;
  return (parkValue() * 3600) / seconds;
}

/** Las reglas en frases cortas, para el panel. */
export function parkingPerks(): string[] {
  return [
    `Propina: ${formatMoney(PARK_TIP_MIN)}–${formatMoney(PARK_TIP_MAX)} por auto`,
    `Que el dueño no deje nada: ${formatPercent(PARK_NO_TIP_CHANCE)}`,
    "No se gasta nada: sólo hace falta el chaleco flúo puesto",
  ];
}
