"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LayoutBuilder = void 0;
const types_1 = require("./types");
/**
 * Arma el layout de un barrio por capas (manzanas → calles → plazas → agua) en lugar de escribir
 * a mano una grilla ASCII enorme. `build()` devuelve el formato de `CityDefinition.layout`.
 */
class LayoutBuilder {
    constructor(width, height, fill) {
        this.width = width;
        this.height = height;
        this.grid = Array.from({ length: height }, () => Array(width).fill(fill));
    }
    set(x, y, char) {
        if (x >= 0 && y >= 0 && x < this.width && y < this.height)
            this.grid[y][x] = char;
        return this;
    }
    rect({ x, y, width, height }, char) {
        for (let ty = y; ty < y + height; ty++) {
            for (let tx = x; tx < x + width; tx++)
                this.set(tx, ty, char);
        }
        return this;
    }
    /** Fila y de x0 a x1 inclusive. */
    row(y, x0, x1, char) {
        return this.rect({ x: x0, y, width: x1 - x0 + 1, height: 1 }, char);
    }
    /** Columna x de y0 a y1 inclusive. */
    column(x, y0, y1, char) {
        return this.rect({ x, y: y0, width: 1, height: y1 - y0 + 1 }, char);
    }
    /** Convierte en rambla todo tile de tierra que toque agua (en 8 direcciones). */
    coastline() {
        const isWater = (x, y) => this.grid[y]?.[x] === types_1.TileChar.Water;
        const coast = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (isWater(x, y))
                    continue;
                let touches = false;
                for (let dy = -1; dy <= 1 && !touches; dy++) {
                    for (let dx = -1; dx <= 1 && !touches; dx++)
                        touches = isWater(x + dx, y + dy);
                }
                if (touches)
                    coast.push([x, y]);
            }
        }
        for (const [x, y] of coast)
            this.grid[y][x] = types_1.TileChar.Rambla;
        return this;
    }
    /**
     * Siembra `char` sobre tiles `onto` con probabilidad `chance`, de forma determinística.
     * Sólo usa tiles cuyos 8 vecinos también son `onto`, para no cortar caminos angostos.
     */
    scatter(char, onto, chance, seed) {
        const picked = [];
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                let surrounded = true;
                for (let dy = -1; dy <= 1 && surrounded; dy++) {
                    for (let dx = -1; dx <= 1 && surrounded; dx++)
                        surrounded = this.grid[y + dy][x + dx] === onto;
                }
                if (surrounded && hash01(x, y, seed) < chance)
                    picked.push([x, y]);
            }
        }
        for (const [x, y] of picked)
            this.grid[y][x] = char;
        return this;
    }
    build() {
        return this.grid.map((row) => row.join(""));
    }
}
exports.LayoutBuilder = LayoutBuilder;
/** Pseudo-aleatorio en [0, 1) a partir de un tile: igual en cliente y servidor. */
function hash01(x, y, seed) {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
//# sourceMappingURL=layoutBuilder.js.map