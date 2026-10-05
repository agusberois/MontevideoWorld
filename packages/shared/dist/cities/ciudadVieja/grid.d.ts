import type { TileRect } from "../types";
/**
 * La grilla de Ciudad Vieja, sobre el plano real (OpenStreetMap, ver
 * `docs/finished/ciudad-vieja-mapa-real.md`): metros girados como las calles (u = a lo largo de
 * Sarandí, de la punta oeste hacia la Plaza Independencia; v = de la bahía, al norte, hacia el río) y
 * su paso a tiles a `METERS_PER_TILE`. Cada calle es una franja de 4 tiles: vereda, dos de calzada y
 * vereda (`streetBand`); entre franja y franja queda la manzana, de unos 4 tiles, donde entran los
 * edificios de 2 × 2.
 */
export declare const METERS_PER_TILE = 12;
export declare const WIDTH = 150;
export declare const HEIGHT = 96;
/** Metros → tile (los corrimientos dejan lugar a la escollera al oeste y a la bahía al norte). */
export declare function tileX(u: number): number;
export declare function tileY(v: number): number;
/** Calles "de oeste a este" (filas), de la bahía al río: v real en metros. */
export declare const ROW_STREETS: {
    readonly rambla25DeAgosto: -342;
    readonly piedras: -236;
    readonly cerrito: -145;
    readonly veinticincoDeMayo: -54;
    readonly rincon: 41;
    readonly sarandi: 147;
    readonly buenosAires: 243;
    readonly reconquista: 342;
};
/** Calles "de norte a sur" (columnas), de la punta oeste a la Plaza Independencia: u real en metros. */
export declare const COLUMN_STREETS: {
    readonly juanLindolfoCuestas: -685;
    readonly maciel: -526;
    readonly perezCastellano: -432;
    readonly colon: -333;
    readonly solis: -236;
    readonly zabala: -138;
    readonly misiones: -43;
    readonly treintaYTres: 49;
    readonly ituzaingo: 148;
    readonly juanCarlosGomez: 255;
    readonly bartolomeMitre: 333;
    readonly juncal: 445;
    readonly florida: 568;
};
/** Primer y último tile de la franja de una calle (vereda, calzada de 2, vereda) centrada en `center`. */
export declare function streetBand(center: number): [number, number];
/** Las franjas, ya en tiles. */
export declare const ROW_BANDS: [number, number][];
export declare const COLUMN_BANDS: [number, number][];
/** Rectángulo de tiles. */
export declare function rect(x: number, y: number, width: number, height?: number): TileRect;
//# sourceMappingURL=grid.d.ts.map