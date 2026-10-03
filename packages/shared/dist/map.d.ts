import { Bench, BusStop, CityDefinition, Shop, TilePoint, TileRect } from "./cities/types";
export type FishingFacing = "south" | "east" | "west" | "north";
/** Hacia dónde mira quien pesca y a cuántos tiles cae la boya (ver `CityMap.fishingSpot`). */
export interface FishingSpot {
    facing: FishingFacing;
    distance: number;
}
/**
 * Con qué cosa fija del mapa se interactúa en un tile (clic, hover o la tecla F). `target` es el tile
 * al que apunta la acción y `area`, lo que se marca al pasar el mouse (toda la tienda, o un tile).
 * Para algo nuevo del mapa (puertas, carteles, cajeros…): sumar su `kind` acá y en `interactionAt`.
 */
export type MapInteraction = {
    kind: "busStop";
    target: TilePoint;
    area: TileRect;
    busStop: BusStop;
} | {
    kind: "shop";
    target: TilePoint;
    area: TileRect;
    shop: Shop;
} | {
    kind: "palm";
    target: TilePoint;
    area: TileRect;
} | {
    kind: "bench";
    target: TilePoint;
    area: TileRect;
    bench: Bench;
}
/** Piso caminable: ir hasta ahí. */
 | {
    kind: "floor";
    target: TilePoint;
    area: TileRect;
};
export type MapInteractionKind = MapInteraction["kind"];
export interface InteractionOptions {
    /**
     * Hasta cuántos tiles en diagonal hacia atrás (+1, +1) se busca una palmera: las hojas se dibujan
     * encima de los tiles de adelante y el clic ahí también la sacude. 0 = sólo el tile.
     */
    palmReach?: number;
}
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
     * Adónde tira la línea quien pesca parado en (x, y): hacia el agua más cercana en las 4
     * direcciones (buscando por la escollera hasta `FISHING_REACH` tiles; en el medio de la escollera
     * el agua no está pegada) y a cuántos tiles cae la boya: uno adentro del agua si se puede, así no
     * queda en la orilla. A igual distancia se prefieren sur y este (de frente a la cámara).
     * undefined si no hay agua al alcance.
     */
    fishingSpot(x: number, y: number): FishingSpot | undefined;
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
    /**
     * Qué hay para hacer en el tile (x, y), en orden de prioridad: parada, tienda, palmera, banco,
     * piso caminable; undefined si nada (agua, edificios). Sólo lo fijo del mapa: picudos y jugadores
     * se mueven y los resuelve quien llama.
     */
    interactionAt(x: number, y: number, { palmReach }?: InteractionOptions): MapInteraction | undefined;
    /**
     * Lo que hay en los 8 tiles pegados a (x, y), sin el piso: con qué se puede interactuar sin
     * caminar (tecla F). Una tienda aparece una vez aunque toque varios tiles.
     */
    interactionsAround(x: number, y: number): MapInteraction[];
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
    /** Cárcel: dónde aparecen los presos (el patio, del lado de adentro de la reja). Vacío si no es cárcel. */
    prisonTiles(): TilePoint[];
    /**
     * BFS en 8 direcciones sin cortar esquinas.
     * Devuelve la lista de tiles a recorrer (sin incluir el origen), o [] si no hay camino.
     */
    findPath(from: TilePoint, to: TilePoint): TilePoint[];
}
//# sourceMappingURL=map.d.ts.map