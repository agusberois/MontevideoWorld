"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WALKABLE_TILE_CHARS = exports.TileChar = void 0;
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
    /** Árbol de copa, no caminable. */
    Tree: "T",
    /** Palmera, no caminable. */
    Palm: "P",
    /** Escollera: espigón de piedra que entra en el agua. Caminable; desde acá se pesca. */
    Jetty: "E",
};
exports.WALKABLE_TILE_CHARS = new Set([
    exports.TileChar.Rambla,
    exports.TileChar.Street,
    exports.TileChar.Pedestrian,
    exports.TileChar.Plaza,
    exports.TileChar.Grass,
    exports.TileChar.Jetty,
]);
//# sourceMappingURL=types.js.map