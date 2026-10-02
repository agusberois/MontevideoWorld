import { Bench, BusStop, CityDefinition, Shop, TilePoint, TileRect } from "./cities";
/**
 * Grilla de un barrio lista para consultar: qué hay en cada tile, qué se puede caminar
 * (layout menos los edificios emblemáticos) y pathfinding. Cliente y servidor la usan igual.
 */
export declare class CityMap {
    readonly city: CityDefinition;
    readonly width: number;
    readonly height: number;
    private readonly walkable;
    constructor(city: CityDefinition);
    /** Se pesca parado en la escollera. */
    canFishAt(x: number, y: number): boolean;
    /** Se vende con carrito parado en la zona de venta del barrio (si tiene una). */
    canVendAt(x: number, y: number): boolean;
    /**
     * Hacia dónde está el agua desde (x, y): para orientar al que pesca. Se prueban primero sur y
     * este (de frente a la cámara) y después oeste y norte.
     */
    waterDirection(x: number, y: number): "south" | "east" | "west" | "north" | undefined;
    /** ¿Hay una palmera en (x, y)? (ahí viven los picudos rojos) */
    isPalm(x: number, y: number): boolean;
    /** ¿El tile (x, y) está pegado a la palmera (incluye diagonales)? Desde ahí se la sacude. */
    isNextTo(target: TilePoint, x: number, y: number): boolean;
    /** Tile caminable pegado a `target` más cercano a `from` (para ir a una palmera). */
    approachTile(target: TilePoint, from: TilePoint): TilePoint | undefined;
    shopAt(x: number, y: number): Shop | undefined;
    getShop(id: string): Shop | undefined;
    /** ¿El tile (x, y) está pegado a la tienda (incluye diagonales)? Desde ahí se puede comprar. */
    isNearShop(shop: Shop, x: number, y: number): boolean;
    /** Tile caminable pegado a la tienda más cercano a `from` (adonde camina quien hace clic). */
    shopApproach(shop: Shop, from: TilePoint): TilePoint | undefined;
    benchAt(x: number, y: number): Bench | undefined;
    /** Tile desde el que uno se sienta: el de enfrente del banco o, si no se puede, uno vecino. */
    benchApproach(bench: Bench): TilePoint | undefined;
    busStopAt(x: number, y: number): BusStop | undefined;
    inBounds(x: number, y: number): boolean;
    /** Carácter del layout (`TileChar`), o undefined fuera del mapa. */
    tileAt(x: number, y: number): string | undefined;
    isWalkable(x: number, y: number): boolean;
    /** ¿Se puede pasar de `from` a `to` en un paso? (vecino caminable; en diagonal sin cortar esquinas, como `findPath`) */
    isStep(from: TilePoint, to: TilePoint): boolean;
    /**
     * Recorrido que propone el cliente (`MoveMessage.path`), desde donde está `from`: si `from` está
     * en el recorrido se sigue desde ahí (la primera vez que aparece: si el recorrido va y vuelve,
     * el server hace la ida y la vuelta, igual que lo que ya muestra el cliente); si no, desde el primer tile del
     * recorrido que le quede al lado (por la latencia el server pudo haber dado un paso de más por el
     * recorrido anterior: así vuelve solo). Se corta en el primer paso inválido (no vecino, no
     * caminable o cortando una esquina). Devuelve los tiles a recorrer, o null si el recorrido no
     * pasa por al lado de `from` (ahí se usa `findPath`).
     */
    followRoute(from: TilePoint, route: readonly TilePoint[]): TilePoint[] | null;
    walkableTilesIn({ x, y, width, height }: TileRect): TilePoint[];
    spawnTiles(): TilePoint[];
    /**
     * BFS en 8 direcciones sin cortar esquinas.
     * Devuelve la lista de tiles a recorrer (sin incluir el origen), o [] si no hay camino.
     */
    findPath(from: TilePoint, to: TilePoint): TilePoint[];
}
/** CityMap memoizado por barrio (el layout es inmutable). */
export declare function getCityMap(cityId: string): CityMap | undefined;
//# sourceMappingURL=map.d.ts.map