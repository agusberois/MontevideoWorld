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
export declare const WIDTH = 126;
export declare const HEIGHT = 68;
/** Primera fila de cada calle "de oeste a este". */
export declare const ROW_STREETS: {
    readonly mercedes: 4;
    readonly colonia: 16;
    readonly dieciochoDeJulio: 28;
    readonly sanJose: 42;
    readonly soriano: 54;
};
/** 18 de Julio: dos de vereda, dos de calzada y dos de vereda (filas 28 a 33). */
export declare const AVENUE_WIDTH = 6;
/** Primera columna de cada calle "de norte a sur". */
export declare const COLUMN_STREETS: {
    readonly andes: 4;
    readonly convencion: 14;
    readonly rioBranco: 24;
    readonly julioHerreraYObes: 34;
    readonly rioNegro: 44;
    readonly paraguay: 54;
    readonly rondeau: 64;
    readonly zelmarMichelini: 74;
    readonly yi: 84;
    readonly yaguaron: 94;
    readonly ejido: 104;
};
export declare const STREET_WIDTH = 4;
/** La manzana de la Intendencia: de Ejido al borde este, sin San José (la corta el palacio). */
export declare const INTENDENCIA_X: number;
/** Filas de 18 de Julio: la vereda norte (las dos primeras) y la sur (las dos últimas). */
export declare const AVENUE: {
    readonly y0: 28;
    readonly y1: number;
    /** Primera fila de manzana al norte (pegada a la vereda) y al sur. */
    readonly northFront: number;
    readonly southFront: number;
};
/** Rectángulo de tiles. */
export declare function rect(x: number, y: number, width: number, height?: number): TileRect;
//# sourceMappingURL=grid.d.ts.map