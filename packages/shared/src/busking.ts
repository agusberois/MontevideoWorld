import { formatPercent } from "./fishing";
import { InstrumentItem } from "./items";
import { formatMoney } from "./money";

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
export const CrowdState = { None: 0, Arriving: 1, Tipped: 2, Left: 3 } as const;
export type CrowdState = (typeof CrowdState)[keyof typeof CrowdState];
export const CROWD_ARRIVE_MS = 600;

/** Hasta cuántos tiles (en cualquier dirección) cuenta alguien como público o como compañero de comparsa. */
export const BUSK_LISTEN_RADIUS = 6;
/** Cada jugador escuchando suma esto a la propina… */
export const BUSK_LISTENER_BONUS = 0.15;
/** …hasta este tope (con 4 escuchando, el doble). */
export const BUSK_MAX_LISTENER_BONUS = 1;
/** Cada uno que toca cerca a la vez (la comparsa) suma esto… */
export const BUSK_PARTNER_BONUS = 0.1;
/** …hasta este tope. */
export const BUSK_MAX_PARTNER_BONUS = 0.3;

/** Lo que multiplica la propina con `listeners` escuchando y `partners` tocando cerca. */
export function buskMultiplier(listeners: number, partners: number): number {
  return 1 + Math.min(BUSK_MAX_LISTENER_BONUS, listeners * BUSK_LISTENER_BONUS) + Math.min(BUSK_MAX_PARTNER_BONUS, partners * BUSK_PARTNER_BONUS);
}

/**
 * Plata que deja en promedio un tema con este instrumento, contando que nadie deje nada. Sin
 * público ni comparsa: es el piso.
 */
export function tipValue(instrument: InstrumentItem): number {
  return (1 - instrument.noTipChance) * ((instrument.tipMin + instrument.tipMax) / 2);
}

/** Las ventajas de un instrumento en frases cortas, para la tienda, la mochila y el panel de tocar. */
export function instrumentPerks(instrument: InstrumentItem): string[] {
  const perks = [
    `Propina: ${formatMoney(instrument.tipMin)}–${formatMoney(instrument.tipMax)} (con público, hasta el doble)`,
    `Que nadie deje nada: ${formatPercent(instrument.noTipChance)}`,
  ];
  if (instrument.waitFactor < 1) perks.push(`Propinas ${Math.round((1 - instrument.waitFactor) * 100)} % más rápido`);
  perks.push(`Dura ${instrument.maxUses} temas y rinde ~${formatMoney(Math.floor(tipValue(instrument) * instrument.maxUses))} en total (sin público)`);
  return perks;
}
