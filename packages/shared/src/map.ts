import { Bench, CityDefinition, Shop, TileChar, TilePoint, TileRect, WALKABLE_TILE_CHARS, getCity } from "./cities";

const DIRECTIONS: readonly TilePoint[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
];

/**
 * Grilla de un barrio lista para consultar: qué hay en cada tile, qué se puede caminar
 * (layout menos los edificios emblemáticos) y pathfinding. Cliente y servidor la usan igual.
 */
export class CityMap {
  readonly width: number;
  readonly height: number;
  private readonly walkable: Uint8Array;

  constructor(readonly city: CityDefinition) {
    this.height = city.layout.length;
    this.width = city.layout[0].length;
    this.walkable = new Uint8Array(this.width * this.height);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (WALKABLE_TILE_CHARS.has(city.layout[y][x])) this.walkable[y * this.width + x] = 1;
      }
    }

    for (const landmark of city.landmarks) {
      const { x, y, width, height } = landmark.area;
      for (let ty = y; ty < y + height; ty++) {
        for (let tx = x; tx < x + width; tx++) {
          const passable = landmark.passable?.some((tile) => tile.x === tx && tile.y === ty);
          if (!passable && this.inBounds(tx, ty)) this.walkable[ty * this.width + tx] = 0;
        }
      }
    }

    // A los bancos no se camina: se llega al tile de enfrente y ahí uno se sienta.
    for (const bench of city.benches) {
      if (this.inBounds(bench.x, bench.y)) this.walkable[bench.y * this.width + bench.x] = 0;
    }

    // Las tiendas son edificios: se atiende desde un tile pegado a su área.
    for (const shop of city.shops) {
      const { x, y, width, height } = shop.area;
      for (let ty = y; ty < y + height; ty++) {
        for (let tx = x; tx < x + width; tx++) if (this.inBounds(tx, ty)) this.walkable[ty * this.width + tx] = 0;
      }
    }
  }

  /** Se pesca parado en la escollera. */
  canFishAt(x: number, y: number): boolean {
    return this.tileAt(x, y) === TileChar.Jetty;
  }

  /**
   * Hacia dónde está el agua desde (x, y): para orientar al que pesca. Se prueban primero sur y
   * este (de frente a la cámara) y después oeste y norte.
   */
  waterDirection(x: number, y: number): "south" | "east" | "west" | "north" | undefined {
    const options = [
      ["south", 0, 1],
      ["east", 1, 0],
      ["west", -1, 0],
      ["north", 0, -1],
    ] as const;
    return options.find(([, dx, dy]) => this.tileAt(x + dx, y + dy) === TileChar.Water)?.[0];
  }

  shopAt(x: number, y: number): Shop | undefined {
    return this.city.shops.find((shop) => inRect(shop.area, x, y));
  }

  getShop(id: string): Shop | undefined {
    return this.city.shops.find((shop) => shop.id === id);
  }

  /** ¿El tile (x, y) está pegado a la tienda (incluye diagonales)? Desde ahí se puede comprar. */
  isNearShop(shop: Shop, x: number, y: number): boolean {
    const { area } = shop;
    const dx = Math.max(area.x - x, 0, x - (area.x + area.width - 1));
    const dy = Math.max(area.y - y, 0, y - (area.y + area.height - 1));
    return Math.max(dx, dy) === 1;
  }

  /** Tile caminable pegado a la tienda más cercano a `from` (adonde camina quien hace clic). */
  shopApproach(shop: Shop, from: TilePoint): TilePoint | undefined {
    const { x, y, width, height } = shop.area;
    let best: TilePoint | undefined;
    let bestDistance = Infinity;
    for (let ty = y - 1; ty <= y + height; ty++) {
      for (let tx = x - 1; tx <= x + width; tx++) {
        if (!this.isWalkable(tx, ty) || !this.isNearShop(shop, tx, ty)) continue;
        const distance = Math.abs(tx - from.x) + Math.abs(ty - from.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { x: tx, y: ty };
        }
      }
    }
    return best;
  }

  benchAt(x: number, y: number): Bench | undefined {
    return this.city.benches.find((bench) => bench.x === x && bench.y === y);
  }

  /** Tile desde el que uno se sienta: el de enfrente del banco o, si no se puede, uno vecino. */
  benchApproach(bench: Bench): TilePoint | undefined {
    const front = bench.facing === "south" ? { x: bench.x, y: bench.y + 1 } : { x: bench.x + 1, y: bench.y };
    const candidates = [front, ...DIRECTIONS.slice(0, 4).map((d) => ({ x: bench.x + d.x, y: bench.y + d.y }))];
    return candidates.find((tile) => this.isWalkable(tile.x, tile.y));
  }

  inBounds(x: number, y: number): boolean {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  /** Carácter del layout (`TileChar`), o undefined fuera del mapa. */
  tileAt(x: number, y: number): string | undefined {
    return this.inBounds(x, y) ? this.city.layout[y][x] : undefined;
  }

  isWalkable(x: number, y: number): boolean {
    return this.inBounds(x, y) && this.walkable[y * this.width + x] === 1;
  }

  walkableTilesIn({ x, y, width, height }: TileRect): TilePoint[] {
    const tiles: TilePoint[] = [];
    for (let ty = y; ty < y + height; ty++) {
      for (let tx = x; tx < x + width; tx++) {
        if (this.isWalkable(tx, ty)) tiles.push({ x: tx, y: ty });
      }
    }
    return tiles;
  }

  spawnTiles(): TilePoint[] {
    return this.walkableTilesIn(this.city.spawnArea);
  }

  /**
   * BFS en 8 direcciones sin cortar esquinas.
   * Devuelve la lista de tiles a recorrer (sin incluir el origen), o [] si no hay camino.
   */
  findPath(from: TilePoint, to: TilePoint): TilePoint[] {
    if (!this.isWalkable(to.x, to.y)) return [];
    if (from.x === to.x && from.y === to.y) return [];

    const width = this.width;
    const key = (x: number, y: number) => y * width + x;
    const cameFrom = new Map<number, number>();
    const startKey = key(from.x, from.y);
    const goalKey = key(to.x, to.y);
    cameFrom.set(startKey, -1);

    const queue: TilePoint[] = [from];
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head];
      if (key(current.x, current.y) === goalKey) break;

      for (const dir of DIRECTIONS) {
        const nx = current.x + dir.x;
        const ny = current.y + dir.y;
        const nKey = key(nx, ny);
        if (cameFrom.has(nKey) || !this.isWalkable(nx, ny)) continue;
        const isDiagonal = dir.x !== 0 && dir.y !== 0;
        if (isDiagonal && (!this.isWalkable(current.x + dir.x, current.y) || !this.isWalkable(current.x, current.y + dir.y))) {
          continue;
        }
        cameFrom.set(nKey, key(current.x, current.y));
        queue.push({ x: nx, y: ny });
      }
    }

    if (!cameFrom.has(goalKey)) return [];

    const path: TilePoint[] = [];
    for (let k = goalKey; k !== startKey; k = cameFrom.get(k)!) {
      path.push({ x: k % width, y: Math.floor(k / width) });
    }
    return path.reverse();
  }
}

function inRect(rect: TileRect, x: number, y: number): boolean {
  return x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height;
}

const cityMaps = new Map<string, CityMap>();

/** CityMap memoizado por barrio (el layout es inmutable). */
export function getCityMap(cityId: string): CityMap | undefined {
  let map = cityMaps.get(cityId);
  if (!map) {
    const city = getCity(cityId);
    if (!city) return undefined;
    map = new CityMap(city);
    cityMaps.set(cityId, map);
  }
  return map;
}
