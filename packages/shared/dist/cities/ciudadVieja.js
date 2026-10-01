"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CIUDAD_VIEJA = void 0;
const items_1 = require("../items");
const layoutBuilder_1 = require("./layoutBuilder");
const types_1 = require("./types");
/**
 * Ciudad Vieja, versión libre y compacta: oeste → este va de la punta de la península a la
 * Plaza Independencia; al norte la bahía/puerto y al sur el Río de la Plata. Las distancias no
 * son reales, pero el orden de los lugares sí: Mercado del Puerto junto al puerto, Plaza Matriz
 * con Catedral y Cabildo al centro, Peatonal Sarandí hasta la Puerta de la Ciudadela, y
 * Plaza Independencia con Palacio Salvo y Teatro Solís al este.
 *
 * Las manzanas son parques (pasto caminable) con pocas casas sueltas: el mapa está pensado para
 * moverse libremente y que los edificios emblemáticos sean los protagonistas.
 */
const WIDTH = 48;
/** Las filas 30 en adelante son río: dan lugar a la Escollera Sarandí. */
const HEIGHT = 38;
const builder = new layoutBuilder_1.LayoutBuilder(WIDTH, HEIGHT, types_1.TileChar.Grass);
// Calles este-oeste.
builder
    .row(7, 2, 42, types_1.TileChar.Street)
    .row(12, 2, 35, types_1.TileChar.Street)
    .row(17, 2, 17, types_1.TileChar.Street)
    .row(22, 2, 29, types_1.TileChar.Street)
    .row(27, 2, 47, types_1.TileChar.Street)
    .row(10, 36, 47, types_1.TileChar.Street)
    .row(25, 35, 47, types_1.TileChar.Street);
// Calles norte-sur.
for (const x of [5, 11, 18, 25, 29, 35])
    builder.column(x, 2, 29, types_1.TileChar.Street);
builder.column(36, 10, 25, types_1.TileChar.Street).column(47, 10, 29, types_1.TileChar.Street);
// Pocas casas coloniales sueltas, en esquinas de manzana.
for (const [x, y, width, height] of [
    [6, 9, 2, 2],
    [12, 8, 3, 1],
    [26, 8, 2, 2],
    [31, 3, 3, 2],
    [38, 3, 3, 2],
    [6, 19, 2, 2],
    [12, 20, 2, 2],
    [19, 20, 3, 1],
    [6, 24, 3, 1],
    [13, 25, 2, 2],
    [21, 24, 2, 2],
    [39, 28, 3, 1],
]) {
    builder.rect({ x, y, width, height }, types_1.TileChar.Block);
}
// Vereda bajo la Ropería Sarandí (tienda de ropa, junto a la peatonal).
builder.rect({ x: 26, y: 19, width: 2, height: 2 }, types_1.TileChar.Plaza);
// Vereda bajo Pesca Sarandí (tienda de pesca) (sobre la rambla, frente a la Escollera Sarandí).
builder.rect({ x: 7, y: 25, width: 2, height: 2 }, types_1.TileChar.Plaza);
// Plaza Matriz (Constitución) con árboles en las esquinas y atrio de la Catedral.
builder
    .rect({ x: 19, y: 13, width: 6, height: 4 }, types_1.TileChar.Plaza)
    .set(19, 13, types_1.TileChar.Tree)
    .set(24, 13, types_1.TileChar.Tree)
    .set(19, 16, types_1.TileChar.Tree)
    .set(24, 16, types_1.TileChar.Tree)
    .rect({ x: 12, y: 13, width: 6, height: 4 }, types_1.TileChar.Plaza);
// Suelo bajo los edificios emblemáticos.
builder
    .rect({ x: 20, y: 8, width: 4, height: 4 }, types_1.TileChar.Plaza)
    .rect({ x: 6, y: 2, width: 5, height: 5 }, types_1.TileChar.Plaza)
    .rect({ x: 43, y: 5, width: 5, height: 5 }, types_1.TileChar.Plaza)
    .rect({ x: 30, y: 22, width: 5, height: 5 }, types_1.TileChar.Plaza);
// Plaza Independencia: canteros con palmeras en las cuatro esquinas.
builder.rect({ x: 37, y: 11, width: 10, height: 14 }, types_1.TileChar.Plaza);
for (const [x, y] of [
    [38, 12],
    [43, 12],
    [38, 21],
    [43, 21],
]) {
    builder.rect({ x, y, width: 3, height: 3 }, types_1.TileChar.Grass).set(x + 1, y + 1, types_1.TileChar.Palm);
}
// Peatonal Sarandí: de la Plaza Matriz a la Puerta de la Ciudadela (incluye el arco).
builder.row(17, 18, 36, types_1.TileChar.Pedestrian);
// Árboles sueltos en los parques (sólo donde no cortan el paso).
builder.scatter(types_1.TileChar.Tree, types_1.TileChar.Grass, 0.18, 11);
// Agua alrededor de la península, con la punta oeste redondeada. La rambla se genera sola.
builder
    .rect({ x: 0, y: 0, width: WIDTH, height: 2 }, types_1.TileChar.Water)
    .rect({ x: 0, y: 30, width: WIDTH, height: HEIGHT - 30 }, types_1.TileChar.Water)
    .rect({ x: 0, y: 0, width: 2, height: HEIGHT }, types_1.TileChar.Water)
    .rect({ x: 2, y: 2, width: 2, height: 4 }, types_1.TileChar.Water)
    .rect({ x: 4, y: 2, width: 1, height: 2 }, types_1.TileChar.Water)
    .rect({ x: 2, y: 26, width: 2, height: 4 }, types_1.TileChar.Water)
    .rect({ x: 4, y: 28, width: 1, height: 2 }, types_1.TileChar.Water)
    .coastline();
// Escollera Sarandí: espigón de piedra que sale de la Rambla Gran Bretaña hacia el río, con una
// plataforma en la punta donde está la farola. Va después de la rambla para no convertirse en rambla.
builder
    .rect({ x: 8, y: 30, width: 2, height: 5 }, types_1.TileChar.Jetty)
    .rect({ x: 7, y: 34, width: 4, height: 2 }, types_1.TileChar.Jetty);
exports.CIUDAD_VIEJA = {
    id: "ciudad-vieja",
    name: "Ciudad Vieja",
    description: "El casco histórico de Montevideo, entre el puerto y la Plaza Independencia.",
    layout: builder.build(),
    spawnArea: { x: 37, y: 14, width: 9, height: 7 },
    landmarks: [
        {
            id: "puerta-ciudadela",
            name: "Puerta de la Ciudadela",
            description: "Único resto de la muralla colonial; separa la Ciudad Vieja de la Plaza Independencia.",
            kind: "gate",
            area: { x: 36, y: 15, width: 1, height: 5 },
            passable: [{ x: 36, y: 17 }],
        },
        {
            id: "monumento-artigas",
            name: "Monumento a Artigas",
            description: "Estatua ecuestre de José Artigas en el centro de la Plaza Independencia.",
            kind: "equestrianMonument",
            area: { x: 40, y: 16, width: 3, height: 3 },
        },
        {
            id: "palacio-salvo",
            name: "Palacio Salvo",
            description: "El rascacielos de 1928 que domina la Plaza Independencia.",
            kind: "palacioSalvo",
            area: { x: 43, y: 5, width: 5, height: 5 },
        },
        {
            id: "teatro-solis",
            name: "Teatro Solís",
            description: "El teatro más antiguo del país (1856), con su pórtico de columnas.",
            kind: "theater",
            area: { x: 30, y: 22, width: 5, height: 5 },
        },
        {
            id: "catedral",
            name: "Catedral Metropolitana",
            description: "La Iglesia Matriz, frente a la Plaza Matriz, con sus dos torres.",
            kind: "cathedral",
            area: { x: 13, y: 13, width: 4, height: 4 },
        },
        {
            id: "cabildo",
            name: "Cabildo de Montevideo",
            description: "Sede del gobierno colonial; hoy museo histórico.",
            kind: "cabildo",
            area: { x: 20, y: 8, width: 4, height: 4 },
        },
        {
            id: "fuente-plaza-matriz",
            name: "Fuente de la Plaza Matriz",
            description: "La fuente de 1871 en el centro de la plaza más antigua de la ciudad.",
            kind: "fountain",
            area: { x: 21, y: 14, width: 2, height: 2 },
        },
        {
            id: "escollera-sarandi",
            name: "Escollera Sarandí",
            description: "Espigón sobre el Río de la Plata con su farola. Parado en la escollera se puede pescar.",
            kind: "lighthouse",
            area: { x: 10, y: 35, width: 1, height: 1 },
        },
        {
            id: "mercado-puerto",
            name: "Mercado del Puerto",
            description: "Estructura de hierro de 1868 junto al puerto, famosa por sus parrillas.",
            kind: "market",
            area: { x: 6, y: 2, width: 5, height: 5 },
        },
    ],
    benches: [
        // Plaza Independencia, delante del Monumento a Artigas.
        { x: 40, y: 20, facing: "south" },
        { x: 42, y: 20, facing: "south" },
        { x: 44, y: 16, facing: "east" },
        { x: 44, y: 18, facing: "east" },
        // Plaza Matriz, delante de la fuente.
        { x: 23, y: 14, facing: "east" },
        { x: 23, y: 15, facing: "east" },
        { x: 21, y: 16, facing: "south" },
        { x: 22, y: 16, facing: "south" },
        // Rambla Gran Bretaña, mirando al Río de la Plata.
        { x: 14, y: 29, facing: "south" },
        { x: 26, y: 29, facing: "south" },
        { x: 33, y: 29, facing: "south" },
    ],
    // Cartel "MW" sobre el techo del Cabildo, frente a la Plaza Matriz.
    logoSign: { landmarkId: "cabildo" },
    shops: [
        {
            id: "roperia-sarandi",
            name: "Ropería Sarandí",
            description: "Tienda de ropa de la peatonal: compra y vende prendas.",
            area: { x: 26, y: 19, width: 2, height: 2 },
            building: "clothing",
            buys: ["clothing"],
            stock: [
                "remera-blanca",
                "remera-roja",
                "remera-negra",
                "camiseta-celeste",
                "buzo-gris",
                "musculosa-blanca",
                "jean",
                "pantalon-beige",
                "short-verde",
                "short-azul",
                "championes-blancos",
                "championes-rojos",
                "botas-marrones",
                "chancletas",
                "gorra-azul",
                "gorro-lana",
                "boina-negra",
            ],
        },
        {
            id: "pescaderia-mercado",
            name: "Pescadería del Mercado",
            description: "En el Mercado del Puerto te compran lo que pescaste a precio completo y venden todos los pescados del río (más caros).",
            area: { x: 6, y: 2, width: 5, height: 5 },
            building: "none",
            stock: items_1.FISH.map((fish) => fish.id),
            buys: ["fish"],
        },
        {
            id: "tienda-pesca",
            name: "Pesca Sarandí",
            description: "Frente a la Escollera Sarandí: vende cañas (las mejores pescan mejor) y compra las usadas.",
            area: { x: 7, y: 25, width: 2, height: 2 },
            building: "fishing",
            stock: items_1.RODS.map((rod) => rod.id),
            buys: ["rod"],
        },
    ],
    placeLabels: [
        { name: "Plaza Independencia", x: 41.5, y: 24 },
        { name: "Plaza Matriz", x: 21.5, y: 16.4 },
        { name: "Peatonal Sarandí", x: 28, y: 17 },
        { name: "Rambla 25 de Agosto", x: 22, y: 2 },
        { name: "Rambla Gran Bretaña", x: 22, y: 29 },
        { name: "Bahía de Montevideo", x: 22, y: 0.6 },
        { name: "Río de la Plata", x: 24, y: 34 },
        { name: "Escollera Sarandí", x: 8.5, y: 32 },
    ],
};
//# sourceMappingURL=ciudadVieja.js.map