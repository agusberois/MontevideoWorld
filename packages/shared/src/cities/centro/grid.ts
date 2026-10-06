import type { TileRect } from "../types";

/**
 * La grilla del Centro, con el mismo patrón que Ciudad Vieja: cada calle es una franja de vereda,
 * calzada de 2 y vereda (4 tiles) y entre franja y franja quedan las manzanas, de 6 tiles de ancho y
 * 8 de alto (justo para los edificios de relleno de 2 × 2). **18 de Julio** es la avenida (6 tiles:
 * vereda doble a cada lado, para la gente que camina mirando vidrieras) y cruza el mapa de oeste a este: entra
 * desde la Plaza Independencia (Ciudad Vieja, por el borde oeste) y llega a la explanada de la
 * Intendencia, pasando Ejido.
 *
 * Calles en su orden real (Ciudad Nueva de 1829), con las distancias comprimidas: las paralelas a
 * 18 de Julio, de norte a sur (filas), y las que la cruzan, de la Plaza Independencia a la
 * Intendencia (columnas).
 */

export const WIDTH = 127;
export const HEIGHT = 68;

/** Primera fila de cada calle "de oeste a este". */
export const ROW_STREETS = {
  mercedes: 4,
  colonia: 16,
  dieciochoDeJulio: 28,
  sanJose: 42,
  soriano: 54,
} as const;

/** 18 de Julio: dos de vereda, dos de calzada y dos de vereda (filas 28 a 33). */
export const AVENUE_WIDTH = 6;

/** Primera columna de cada calle "de norte a sur". */
export const COLUMN_STREETS = {
  andes: 4,
  convencion: 14,
  rioBranco: 24,
  julioHerreraYObes: 34,
  rioNegro: 44,
  paraguay: 54,
  rondeau: 64,
  zelmarMichelini: 74,
  yi: 84,
  yaguaron: 94,
  ejido: 104,
} as const;

export const STREET_WIDTH = 4;

/** La manzana de la Intendencia: de Ejido al borde este, sin San José (la corta el palacio). */
export const INTENDENCIA_X = COLUMN_STREETS.ejido + STREET_WIDTH;

/** Filas de 18 de Julio: la vereda norte (las dos primeras) y la sur (las dos últimas). */
export const AVENUE = {
  y0: ROW_STREETS.dieciochoDeJulio,
  y1: ROW_STREETS.dieciochoDeJulio + AVENUE_WIDTH - 1,
  /** Primera fila de manzana al norte (pegada a la vereda) y al sur. */
  northFront: ROW_STREETS.dieciochoDeJulio - 1,
  southFront: ROW_STREETS.dieciochoDeJulio + AVENUE_WIDTH,
} as const;

/** Rectángulo de tiles. */
export function rect(x: number, y: number, width: number, height = width): TileRect {
  return { x, y, width, height };
}
