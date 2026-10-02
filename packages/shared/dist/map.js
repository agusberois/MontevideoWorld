"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CityMap = void 0;
exports.getCityMap = getCityMap;
const cities_1 = require("./cities");
const DIRECTIONS = [
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
class CityMap {
    constructor(city) {
        this.city = city;
        this.height = city.layout.length;
        this.width = city.layout[0].length;
        this.walkable = new Uint8Array(this.width * this.height);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (cities_1.WALKABLE_TILE_CHARS.has(city.layout[y][x]))
                    this.walkable[y * this.width + x] = 1;
            }
        }
        for (const landmark of city.landmarks) {
            const { x, y, width, height } = landmark.area;
            for (let ty = y; ty < y + height; ty++) {
                for (let tx = x; tx < x + width; tx++) {
                    const passable = landmark.passable?.some((tile) => tile.x === tx && tile.y === ty);
                    if (!passable && this.inBounds(tx, ty))
                        this.walkable[ty * this.width + tx] = 0;
                }
            }
        }
        // A los bancos no se camina: se llega al tile de enfrente y ahí uno se sienta.
        for (const bench of city.benches) {
            if (this.inBounds(bench.x, bench.y))
                this.walkable[bench.y * this.width + bench.x] = 0;
        }
        // Las paradas de ómnibus tampoco: se llega a un tile pegado.
        for (const stop of city.busStops) {
            if (this.inBounds(stop.x, stop.y))
                this.walkable[stop.y * this.width + stop.x] = 0;
        }
        // Las tiendas son edificios: se atiende desde un tile pegado a su área.
        for (const shop of city.shops) {
            const { x, y, width, height } = shop.area;
            for (let ty = y; ty < y + height; ty++) {
                for (let tx = x; tx < x + width; tx++)
                    if (this.inBounds(tx, ty))
                        this.walkable[ty * this.width + tx] = 0;
            }
        }
    }
    /** Se pesca parado en la escollera. */
    canFishAt(x, y) {
        return this.tileAt(x, y) === cities_1.TileChar.Jetty;
    }
    /** Se vende con carrito parado en la zona de venta del barrio (si tiene una). */
    canVendAt(x, y) {
        const zone = this.city.vending;
        return Boolean(zone && this.isWalkable(x, y) && zone.areas.some((area) => inRect(area, x, y)));
    }
    /**
     * Hacia dónde está el agua desde (x, y): para orientar al que pesca. Se prueban primero sur y
     * este (de frente a la cámara) y después oeste y norte.
     */
    waterDirection(x, y) {
        const options = [
            ["south", 0, 1],
            ["east", 1, 0],
            ["west", -1, 0],
            ["north", 0, -1],
        ];
        return options.find(([, dx, dy]) => this.tileAt(x + dx, y + dy) === cities_1.TileChar.Water)?.[0];
    }
    /** ¿Hay una palmera en (x, y)? (ahí viven los picudos rojos) */
    isPalm(x, y) {
        return this.tileAt(x, y) === cities_1.TileChar.Palm;
    }
    /** ¿El tile (x, y) está pegado a la palmera (incluye diagonales)? Desde ahí se la sacude. */
    isNextTo(target, x, y) {
        return Math.max(Math.abs(target.x - x), Math.abs(target.y - y)) === 1;
    }
    /** Tile caminable pegado a `target` más cercano a `from` (para ir a una palmera). */
    approachTile(target, from) {
        let best;
        let bestDistance = Infinity;
        for (const dir of DIRECTIONS) {
            const tile = { x: target.x + dir.x, y: target.y + dir.y };
            if (!this.isWalkable(tile.x, tile.y))
                continue;
            const distance = Math.abs(tile.x - from.x) + Math.abs(tile.y - from.y);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = tile;
            }
        }
        return best;
    }
    shopAt(x, y) {
        return this.city.shops.find((shop) => inRect(shop.area, x, y));
    }
    getShop(id) {
        return this.city.shops.find((shop) => shop.id === id);
    }
    /** ¿El tile (x, y) está pegado a la tienda (incluye diagonales)? Desde ahí se puede comprar. */
    isNearShop(shop, x, y) {
        const { area } = shop;
        const dx = Math.max(area.x - x, 0, x - (area.x + area.width - 1));
        const dy = Math.max(area.y - y, 0, y - (area.y + area.height - 1));
        return Math.max(dx, dy) === 1;
    }
    /** Tile caminable pegado a la tienda más cercano a `from` (adonde camina quien hace clic). */
    shopApproach(shop, from) {
        const { x, y, width, height } = shop.area;
        let best;
        let bestDistance = Infinity;
        for (let ty = y - 1; ty <= y + height; ty++) {
            for (let tx = x - 1; tx <= x + width; tx++) {
                if (!this.isWalkable(tx, ty) || !this.isNearShop(shop, tx, ty))
                    continue;
                const distance = Math.abs(tx - from.x) + Math.abs(ty - from.y);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    best = { x: tx, y: ty };
                }
            }
        }
        return best;
    }
    benchAt(x, y) {
        return this.city.benches.find((bench) => bench.x === x && bench.y === y);
    }
    /** Tile desde el que uno se sienta: el de enfrente del banco o, si no se puede, uno vecino. */
    benchApproach(bench) {
        const front = bench.facing === "south" ? { x: bench.x, y: bench.y + 1 } : { x: bench.x + 1, y: bench.y };
        const candidates = [front, ...DIRECTIONS.slice(0, 4).map((d) => ({ x: bench.x + d.x, y: bench.y + d.y }))];
        return candidates.find((tile) => this.isWalkable(tile.x, tile.y));
    }
    busStopAt(x, y) {
        return this.city.busStops.find((stop) => stop.x === x && stop.y === y);
    }
    inBounds(x, y) {
        return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < this.width && y < this.height;
    }
    /** Carácter del layout (`TileChar`), o undefined fuera del mapa. */
    tileAt(x, y) {
        return this.inBounds(x, y) ? this.city.layout[y][x] : undefined;
    }
    isWalkable(x, y) {
        return this.inBounds(x, y) && this.walkable[y * this.width + x] === 1;
    }
    /** ¿Se puede pasar de `from` a `to` en un paso? (vecino caminable; en diagonal sin cortar esquinas, como `findPath`) */
    isStep(from, to) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== 1 || !this.isWalkable(to.x, to.y))
            return false;
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
    followRoute(from, route) {
        const here = route.findIndex((tile) => tile.x === from.x && tile.y === from.y);
        let rest;
        if (here >= 0) {
            rest = route.slice(here + 1);
        }
        else {
            const next = route.findIndex((tile) => this.isStep(from, tile));
            if (next < 0)
                return null;
            rest = route.slice(next);
        }
        const steps = [];
        let previous = from;
        for (const tile of rest) {
            if (!this.isStep(previous, tile))
                break;
            steps.push({ x: tile.x, y: tile.y });
            previous = tile;
        }
        return steps;
    }
    walkableTilesIn({ x, y, width, height }) {
        const tiles = [];
        for (let ty = y; ty < y + height; ty++) {
            for (let tx = x; tx < x + width; tx++) {
                if (this.isWalkable(tx, ty))
                    tiles.push({ x: tx, y: ty });
            }
        }
        return tiles;
    }
    spawnTiles() {
        return this.walkableTilesIn(this.city.spawnArea);
    }
    /**
     * BFS en 8 direcciones sin cortar esquinas.
     * Devuelve la lista de tiles a recorrer (sin incluir el origen), o [] si no hay camino.
     */
    findPath(from, to) {
        if (!this.isWalkable(to.x, to.y))
            return [];
        if (from.x === to.x && from.y === to.y)
            return [];
        const width = this.width;
        const key = (x, y) => y * width + x;
        const cameFrom = new Map();
        const startKey = key(from.x, from.y);
        const goalKey = key(to.x, to.y);
        cameFrom.set(startKey, -1);
        const queue = [from];
        for (let head = 0; head < queue.length; head++) {
            const current = queue[head];
            if (key(current.x, current.y) === goalKey)
                break;
            for (const dir of DIRECTIONS) {
                const nx = current.x + dir.x;
                const ny = current.y + dir.y;
                const nKey = key(nx, ny);
                if (cameFrom.has(nKey) || !this.isWalkable(nx, ny))
                    continue;
                const isDiagonal = dir.x !== 0 && dir.y !== 0;
                if (isDiagonal && (!this.isWalkable(current.x + dir.x, current.y) || !this.isWalkable(current.x, current.y + dir.y))) {
                    continue;
                }
                cameFrom.set(nKey, key(current.x, current.y));
                queue.push({ x: nx, y: ny });
            }
        }
        if (!cameFrom.has(goalKey))
            return [];
        const path = [];
        for (let k = goalKey; k !== startKey; k = cameFrom.get(k)) {
            path.push({ x: k % width, y: Math.floor(k / width) });
        }
        return path.reverse();
    }
}
exports.CityMap = CityMap;
function inRect(rect, x, y) {
    return x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height;
}
const cityMaps = new Map();
/** CityMap memoizado por barrio (el layout es inmutable). */
function getCityMap(cityId) {
    let map = cityMaps.get(cityId);
    if (!map) {
        const city = (0, cities_1.getCity)(cityId);
        if (!city)
            return undefined;
        map = new CityMap(city);
        cityMaps.set(cityId, map);
    }
    return map;
}
//# sourceMappingURL=map.js.map