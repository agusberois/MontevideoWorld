import { Bench, BusStop, CityDefinition, Shop, TileChar, TilePoint, TileRect, WALKABLE_TILE_CHARS } from "./cities/types";

export type FishingFacing = "south" | "east" | "west" | "north";

/** Hacia dónde mira quien pesca y a cuántos tiles cae la boya (ver `CityMap.fishingSpot`). */
export interface FishingSpot {
  facing: FishingFacing;
  distance: number;
}

/** Hasta cuántos tiles se busca el agua para tirar la línea (la plataforma de la escollera mide 7 de ancho). */
const FISHING_REACH = 6;

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
 * Con qué cosa fija del mapa se interactúa en un tile (clic, hover o la tecla F). `target` es el tile
 * al que apunta la acción y `area`, lo que se marca al pasar el mouse (toda la tienda, o un tile).
 * Para algo nuevo del mapa (puertas, carteles, cajeros…): sumar su `kind` acá y en `interactionAt`.
 */
export type MapInteraction =
  | { kind: "busStop"; target: TilePoint; area: TileRect; busStop: BusStop }
  | { kind: "shop"; target: TilePoint; area: TileRect; shop: Shop }
  | { kind: "palm"; target: TilePoint; area: TileRect }
  | { kind: "bench"; target: TilePoint; area: TileRect; bench: Bench }
  /** Piso caminable: ir hasta ahí. */
  | { kind: "floor"; target: TilePoint; area: TileRect };

export type MapInteractionKind = MapInteraction["kind"];

export interface InteractionOptions {
  /**
   * Hasta cuántos tiles en diagonal hacia atrás (+1, +1) se busca una palmera: las hojas se dibujan
   * encima de los tiles de adelante y el clic ahí también la sacude. 0 = sólo el tile.
   */
  palmReach?: number;
}

function tileRect(x: number, y: number): TileRect {
  return { x, y, width: 1, height: 1 };
}

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

    // Las paradas de ómnibus tampoco: se llega a un tile pegado.
    for (const stop of city.busStops) {
      if (this.inBounds(stop.x, stop.y)) this.walkable[stop.y * this.width + stop.x] = 0;
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

  /** Se vende con carrito parado en la zona de venta del barrio (si tiene una). */
  canVendAt(x: number, y: number): boolean {
    const zone = this.city.vending;
    return Boolean(zone && this.isWalkable(x, y) && zone.areas.some((area) => inRect(area, x, y)));
  }

  /**
   * Adónde tira la línea quien pesca parado en (x, y): hacia el agua más cercana en las 4
   * direcciones (buscando por la escollera hasta `FISHING_REACH` tiles; en el medio de la escollera
   * el agua no está pegada) y a cuántos tiles cae la boya: uno adentro del agua si se puede, así no
   * queda en la orilla. A igual distancia se prefieren sur y este (de frente a la cámara).
   * undefined si no hay agua al alcance.
   */
  fishingSpot(x: number, y: number): FishingSpot | undefined {
    const options = [
      ["south", 0, 1],
      ["east", 1, 0],
      ["west", -1, 0],
      ["north", 0, -1],
    ] as const;
    let best: { facing: FishingFacing; water: number } | undefined;
    for (const [facing, dx, dy] of options) {
      for (let d = 1; d <= FISHING_REACH; d++) {
        const char = this.tileAt(x + dx * d, y + dy * d);
        if (char === TileChar.Water) {
          if (!best || d < best.water) best = { facing, water: d };
          break;
        }
        // Sólo se tira por encima de la escollera (no por arriba de la rambla ni de edificios).
        if (char !== TileChar.Jetty) break;
      }
    }
    if (!best) return undefined;
    const [, dx, dy] = options.find(([facing]) => facing === best.facing)!;
    const further = this.tileAt(x + dx * (best.water + 1), y + dy * (best.water + 1)) === TileChar.Water;
    return { facing: best.facing, distance: further ? best.water + 1 : best.water };
  }

  /** ¿Hay una palmera en (x, y)? (ahí viven los picudos rojos) */
  isPalm(x: number, y: number): boolean {
    return this.tileAt(x, y) === TileChar.Palm;
  }

  /** ¿El tile (x, y) está pegado a la palmera (incluye diagonales)? Desde ahí se la sacude. */
  isNextTo(target: TilePoint, x: number, y: number): boolean {
    return Math.max(Math.abs(target.x - x), Math.abs(target.y - y)) === 1;
  }

  /** Tile caminable pegado a `target` más cercano a `from` (para ir a una palmera). */
  approachTile(target: TilePoint, from: TilePoint): TilePoint | undefined {
    let best: TilePoint | undefined;
    let bestDistance = Infinity;
    for (const dir of DIRECTIONS) {
      const tile = { x: target.x + dir.x, y: target.y + dir.y };
      if (!this.isWalkable(tile.x, tile.y)) continue;
      const distance = Math.abs(tile.x - from.x) + Math.abs(tile.y - from.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = tile;
      }
    }
    return best;
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

  busStopAt(x: number, y: number): BusStop | undefined {
    return this.city.busStops.find((stop) => stop.x === x && stop.y === y);
  }

  /**
   * Qué hay para hacer en el tile (x, y), en orden de prioridad: parada, tienda, palmera, banco,
   * piso caminable; undefined si nada (agua, edificios). Sólo lo fijo del mapa: picudos y jugadores
   * se mueven y los resuelve quien llama.
   */
  interactionAt(x: number, y: number, { palmReach = 0 }: InteractionOptions = {}): MapInteraction | undefined {
    const busStop = this.busStopAt(x, y);
    if (busStop) return { kind: "busStop", target: { x, y }, area: tileRect(x, y), busStop };
    const shop = this.shopAt(x, y);
    if (shop) return { kind: "shop", target: { x, y }, area: shop.area, shop };
    for (let k = 0; k <= palmReach; k++) {
      if (this.isPalm(x + k, y + k)) return { kind: "palm", target: { x: x + k, y: y + k }, area: tileRect(x + k, y + k) };
    }
    const bench = this.benchAt(x, y);
    if (bench) return { kind: "bench", target: { x, y }, area: tileRect(x, y), bench };
    if (this.isWalkable(x, y)) return { kind: "floor", target: { x, y }, area: tileRect(x, y) };
    return undefined;
  }

  /**
   * Lo que hay en los 8 tiles pegados a (x, y), sin el piso: con qué se puede interactuar sin
   * caminar (tecla F). Una tienda aparece una vez aunque toque varios tiles.
   */
  interactionsAround(x: number, y: number): MapInteraction[] {
    const found: MapInteraction[] = [];
    for (const dir of DIRECTIONS) {
      const hit = this.interactionAt(x + dir.x, y + dir.y);
      if (!hit || hit.kind === "floor") continue;
      if (hit.kind === "shop" && found.some((other) => other.kind === "shop" && other.shop === hit.shop)) continue;
      found.push(hit);
    }
    return found;
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

  /** ¿Se puede pasar de `from` a `to` en un paso? (vecino caminable; en diagonal sin cortar esquinas, como `findPath`) */
  isStep(from: TilePoint, to: TilePoint): boolean {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== 1 || !this.isWalkable(to.x, to.y)) return false;
    return dx === 0 || dy === 0 || (this.isWalkable(from.x + dx, from.y) && this.isWalkable(from.x, from.y + dy));
  }

  /**
   * Recorrido que propone el cliente (`MoveMessage.path`), desde donde está `from`: si `from` está
   * en el recorrido se sigue desde ahí (la primera vez que aparece: si el recorrido va y vuelve,
   * el server hace la ida y la vuelta, igual que lo que ya muestra el cliente); si no, desde el primer tile del
   * recorrido que le quede al lado (por la latencia el server pudo haber dado un paso de más por el
   * recorrido anterior: así vuelve solo). Se corta en el primer paso inválido (no vecino, no
   * caminable o cortando una esquina). Devuelve los tiles a recorrer, o null si el recorrido no
   * pasa por al lado de `from` (ahí se usa `findPath`).
   */
  followRoute(from: TilePoint, route: readonly TilePoint[]): TilePoint[] | null {
    const here = route.findIndex((tile) => tile.x === from.x && tile.y === from.y);
    let rest: readonly TilePoint[];
    if (here >= 0) {
      rest = route.slice(here + 1);
    } else {
      const next = route.findIndex((tile) => this.isStep(from, tile));
      if (next < 0) return null;
      rest = route.slice(next);
    }
    const steps: TilePoint[] = [];
    let previous = from;
    for (const tile of rest) {
      if (!this.isStep(previous, tile)) break;
      steps.push({ x: tile.x, y: tile.y });
      previous = tile;
    }
    return steps;
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

  /** Cárcel: dónde aparecen los presos (el patio, del lado de adentro de la reja). Vacío si no es cárcel. */
  prisonTiles(): TilePoint[] {
    return this.city.prison ? this.walkableTilesIn(this.city.prison.yard) : [];
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
