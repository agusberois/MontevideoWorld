"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLUMN_BANDS = exports.ROW_BANDS = exports.COLUMN_STREETS = exports.ROW_STREETS = exports.HEIGHT = exports.WIDTH = exports.METERS_PER_TILE = void 0;
exports.tileX = tileX;
exports.tileY = tileY;
exports.streetBand = streetBand;
exports.rect = rect;
/**
 * La grilla de Ciudad Vieja, sobre el plano real (OpenStreetMap, ver
 * `docs/finished/ciudad-vieja-mapa-real.md`): metros girados como las calles (u = a lo largo de
 * Sarandí, de la punta oeste hacia la Plaza Independencia; v = de la bahía, al norte, hacia el río) y
 * su paso a tiles a `METERS_PER_TILE`. Cada calle es una franja de 4 tiles: vereda, dos de calzada y
 * vereda (`streetBand`); entre franja y franja queda la manzana, de unos 4 tiles, donde entran los
 * edificios de 2 × 2.
 */
exports.METERS_PER_TILE = 12;
exports.WIDTH = 150;
exports.HEIGHT = 96;
/** Metros → tile (los corrimientos dejan lugar a la escollera al oeste y a la bahía al norte). */
function tileX(u) {
    return Math.round((u + 840) / exports.METERS_PER_TILE) + 16;
}
function tileY(v) {
    return Math.round((v + 400) / exports.METERS_PER_TILE) + 4;
}
/** Calles "de oeste a este" (filas), de la bahía al río: v real en metros. */
exports.ROW_STREETS = {
    rambla25DeAgosto: -342,
    piedras: -236,
    cerrito: -145,
    veinticincoDeMayo: -54,
    rincon: 41,
    sarandi: 147,
    buenosAires: 243,
    reconquista: 342,
};
/** Calles "de norte a sur" (columnas), de la punta oeste a la Plaza Independencia: u real en metros. */
exports.COLUMN_STREETS = {
    juanLindolfoCuestas: -685,
    maciel: -526,
    perezCastellano: -432,
    colon: -333,
    solis: -236,
    zabala: -138,
    misiones: -43,
    treintaYTres: 49,
    ituzaingo: 148,
    juanCarlosGomez: 255,
    bartolomeMitre: 333,
    juncal: 445,
    florida: 568,
};
/** Primer y último tile de la franja de una calle (vereda, calzada de 2, vereda) centrada en `center`. */
function streetBand(center) {
    return [center - 2, center + 1];
}
/** Las franjas, ya en tiles. */
exports.ROW_BANDS = Object.values(exports.ROW_STREETS).map((v) => streetBand(tileY(v)));
exports.COLUMN_BANDS = Object.values(exports.COLUMN_STREETS).map((u) => streetBand(tileX(u)));
/** Rectángulo de tiles. */
function rect(x, y, width, height = width) {
    return { x, y, width, height };
}
//# sourceMappingURL=grid.js.map