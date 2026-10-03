"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CITY_IDS = exports.WALKABLE_TILE_CHARS = exports.TileChar = void 0;
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
};
exports.WALKABLE_TILE_CHARS = new Set([
    exports.TileChar.Rambla,
    exports.TileChar.Street,
    exports.TileChar.Pedestrian,
    exports.TileChar.Plaza,
    exports.TileChar.Grass,
    exports.TileChar.Jetty,
]);
/** Barrios del juego. Cada uno tiene su carpeta en `cities/` con `info.ts` y `map.ts`. */
exports.CITY_IDS = ["ciudad-vieja", "tres-cruces", "barrio-de-los-judios", "comcar"];
//# sourceMappingURL=types.js.map