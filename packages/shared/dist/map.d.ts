import { Bench, CityDefinition, Shop, TilePoint, TileRect } from "./cities";
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
    /**
     * Hacia dónde está el agua desde (x, y): para orientar al que pesca. Se prueban primero sur y
     * este (de frente a la cámara) y después oeste y norte.
     */
    waterDirection(x: number, y: number): "south" | "east" | "west" | "north" | undefined;
    shopAt(x: number, y: number): Shop | undefined;
    getShop(id: string): Shop | undefined;
    /** ¿El tile (x, y) está pegado a la tienda (incluye diagonales)? Desde ahí se puede comprar. */
    isNearShop(shop: Shop, x: number, y: number): boolean;
    /** Tile caminable pegado a la tienda más cercano a `from` (adonde camina quien hace clic). */
    shopApproach(shop: Shop, from: TilePoint): TilePoint | undefined;
    benchAt(x: number, y: number): Bench | undefined;
    /** Tile desde el que uno se sienta: el de enfrente del banco o, si no se puede, uno vecino. */
    benchApproach(bench: Bench): TilePoint | undefined;
    inBounds(x: number, y: number): boolean;
    /** Carácter del layout (`TileChar`), o undefined fuera del mapa. */
    tileAt(x: number, y: number): string | undefined;
    isWalkable(x: number, y: number): boolean;
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