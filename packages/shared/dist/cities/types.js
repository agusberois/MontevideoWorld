"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JACUZZI_CAPACITY = exports.CITY_IDS = exports.WALKABLE_TILE_CHARS = exports.TileChar = void 0;
exports.doubleBench = doubleBench;
exports.npcReach = npcReach;
/**
 * Un carácter por tile en `CityDefinition.layout`. Fila = coordenada y, columna = coordenada x.
 * En el mapa, x crece hacia el este y y hacia el sur.
 */
exports.TileChar = {
    Water: "~",
    Rambla: "=",
    Street: ".",
    Pedestrian: "s",
    Plaza: "p",
    Grass: "g",
    /** Manzana edificada: casas genéricas, no caminable. */
    Block: "#",
    /** Edificio de apartamentos en altura (barrios modernos), no caminable. */
    Tower: "H",
    /** Árbol de copa, no caminable. */
    Tree: "T",
    /** Palmera, no caminable. */
    Palm: "P",
    /** Escollera: espigón de piedra que entra en el agua. Caminable; desde acá se pesca. */
    Jetty: "E",
    /** Muro de hormigón con alambre de púas (el COMCAR), no caminable. */
    Wall: "W",
    /** Reja de barrotes (el COMCAR): no caminable, pero se ve a través. */
    Fence: "F",
    /** Piso de adentro (baldosas: las Termas del Donador), caminable. */
    Floor: "f",
    /** Pared de adentro, baja (sólo al norte y al oeste, para no tapar la sala), no caminable. */
    InnerWall: "I",
    /** Vereda (de cada lado de la calzada), caminable. */
    Sidewalk: "v",
    /**
     * Terreno de un edificio de relleno grande (`CityDefinition.fillers`), no caminable: el dibujo lo
     * hace el filler, no el tile.
     */
    Building: "B",
};
exports.WALKABLE_TILE_CHARS = new Set([
    exports.TileChar.Rambla,
    exports.TileChar.Street,
    exports.TileChar.Pedestrian,
    exports.TileChar.Plaza,
    exports.TileChar.Grass,
    exports.TileChar.Jetty,
    exports.TileChar.Floor,
    exports.TileChar.Sidewalk,
]);
/** Un banco doble: dos lugares pegados a lo largo (hacia +x si mira al sur, hacia +y si mira al este). */
function doubleBench(x, y, facing) {
    const next = facing === "south" ? { x: x + 1, y } : { x, y: y + 1 };
    return [
        { x, y, facing, pair: "start" },
        { ...next, facing, pair: "end" },
    ];
}
/** Barrios del juego. Cada uno tiene su carpeta en `cities/` con `info.ts` y `map.ts`. */
exports.CITY_IDS = ["ciudad-vieja", "centro", "tres-cruces", "barrio-de-los-judios", "comcar", "termas", "termas-2", "casino", "intendencia"];
/** Cuántos entran como máximo en un jacuzzi (arriba se ve "x/20"). */
exports.JACUZZI_CAPACITY = 20;
/** Desde dónde se le habla a un NPC: pegado a su `roam` o a su `counter` (el rectángulo que cubre los dos). */
function npcReach({ roam, counter }) {
    if (!counter)
        return roam;
    const x = Math.min(roam.x, counter.x);
    const y = Math.min(roam.y, counter.y);
    const right = Math.max(roam.x + roam.width, counter.x + counter.width);
    const bottom = Math.max(roam.y + roam.height, counter.y + counter.height);
    return { x, y, width: right - x, height: bottom - y };
}
//# sourceMappingURL=types.js.map