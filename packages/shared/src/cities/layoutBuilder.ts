import { TileChar, TileCharValue, TileRect } from "./types";

/**
 * Arma el layout de un barrio por capas (manzanas → calles → plazas → agua) en lugar de escribir
 * a mano una grilla ASCII enorme. `build()` devuelve el formato de `CityDefinition.layout`.
 */
export class LayoutBuilder {
  private readonly grid: string[][];

  constructor(
    readonly width: number,
    readonly height: number,
    fill: TileCharValue,
  ) {
    this.grid = Array.from({ length: height }, () => Array<string>(width).fill(fill));
  }

  set(x: number, y: number, char: TileCharValue) {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) this.grid[y][x] = char;
    return this;
  }

  rect({ x, y, width, height }: TileRect, char: TileCharValue) {
    for (let ty = y; ty < y + height; ty++) {
      for (let tx = x; tx < x + width; tx++) this.set(tx, ty, char);
    }
    return this;
  }

  /** Fila y de x0 a x1 inclusive. */
  row(y: number, x0: number, x1: number, char: TileCharValue) {
    return this.rect({ x: x0, y, width: x1 - x0 + 1, height: 1 }, char);
  }

  /** Columna x de y0 a y1 inclusive. */
  column(x: number, y0: number, y1: number, char: TileCharValue) {
    return this.rect({ x, y: y0, width: 1, height: y1 - y0 + 1 }, char);
  }

  /** Convierte en rambla todo tile de tierra que toque agua (en 8 direcciones). */
  coastline() {
    const isWater = (x: number, y: number) => this.grid[y]?.[x] === TileChar.Water;
    const coast: Array<[number, number]> = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (isWater(x, y)) continue;
        let touches = false;
        for (let dy = -1; dy <= 1 && !touches; dy++) {
          for (let dx = -1; dx <= 1 && !touches; dx++) touches = isWater(x + dx, y + dy);
        }
        if (touches) coast.push([x, y]);
      }
    }
    for (const [x, y] of coast) this.grid[y][x] = TileChar.Rambla;
    return this;
  }

  /**
   * Siembra `char` sobre tiles `onto` con probabilidad `chance`, de forma determinística.
   * Sólo usa tiles cuyos 8 vecinos también son `onto`, para no cortar caminos angostos.
   */
  scatter(char: TileCharValue, onto: TileCharValue, chance: number, seed: number) {
    const picked: Array<[number, number]> = [];
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        let surrounded = true;
        for (let dy = -1; dy <= 1 && surrounded; dy++) {
          for (let dx = -1; dx <= 1 && surrounded; dx++) surrounded = this.grid[y + dy][x + dx] === onto;
        }
        if (surrounded && hash01(x, y, seed) < chance) picked.push([x, y]);
      }
    }
    for (const [x, y] of picked) this.grid[y][x] = char;
    return this;
  }

  /**
   * Pone `char` en el borde del rectángulo con probabilidad `chance` (determinística por tile),
   * sólo sobre tiles `onto`. Sirve para manzanas con edificios sueltos sobre la vereda y el centro libre.
   */
  edges({ x, y, width, height }: TileRect, char: TileCharValue, onto: TileCharValue, chance: number, seed: number) {
    for (let ty = y; ty < y + height; ty++) {
      for (let tx = x; tx < x + width; tx++) {
        const border = tx === x || ty === y || tx === x + width - 1 || ty === y + height - 1;
        if (border && this.grid[ty]?.[tx] === onto && hash01(tx, ty, seed) < chance) this.set(tx, ty, char);
      }
    }
    return this;
  }

  build(): string[] {
    return this.grid.map((row) => row.join(""));
  }
}

/** Pseudo-aleatorio en [0, 1) a partir de un tile: igual en cliente y servidor. */
function hash01(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
