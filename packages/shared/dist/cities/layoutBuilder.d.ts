import { TileCharValue, TileRect } from "./types";
/**
 * Arma el layout de un barrio por capas (manzanas → calles → plazas → agua) en lugar de escribir
 * a mano una grilla ASCII enorme. `build()` devuelve el formato de `CityDefinition.layout`.
 */
export declare class LayoutBuilder {
    readonly width: number;
    readonly height: number;
    private readonly grid;
    constructor(width: number, height: number, fill: TileCharValue);
    set(x: number, y: number, char: TileCharValue): this;
    rect({ x, y, width, height }: TileRect, char: TileCharValue): this;
    /** Fila y de x0 a x1 inclusive. */
    row(y: number, x0: number, x1: number, char: TileCharValue): this;
    /** Columna x de y0 a y1 inclusive. */
    column(x: number, y0: number, y1: number, char: TileCharValue): this;
    /** Convierte en rambla todo tile de tierra que toque agua (en 8 direcciones). */
    coastline(): this;
    /**
     * Siembra `char` sobre tiles `onto` con probabilidad `chance`, de forma determinística.
     * Sólo usa tiles cuyos 8 vecinos también son `onto`, para no cortar caminos angostos.
     */
    scatter(char: TileCharValue, onto: TileCharValue, chance: number, seed: number): this;
    build(): string[];
}
//# sourceMappingURL=layoutBuilder.d.ts.map