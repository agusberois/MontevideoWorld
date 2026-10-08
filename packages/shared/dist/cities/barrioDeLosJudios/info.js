"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BARRIO_DE_LOS_JUDIOS_INFO = void 0;
const items_1 = require("../../items");
/**
 * Barrio de los Judíos (oficialmente Villa Muñoz): nombre, descripción, edificios emblemáticos y
 * tiendas. Es lo liviano del barrio: el cliente lo tiene siempre (lista de barrios, landing,
 * tiendas); el mapa (`map.ts`) se descarga al entrar.
 *
 * El barrio real: a fines del siglo XIX Emilio Reus levantó las casas de Reus al Norte y las compraron
 * sobre todo inmigrantes judíos de Europa del Este (sinagogas, escuelas, ídish en la calle). Con los
 * años se llenó de mayoristas: hoy es el "shopping a cielo abierto" de Montevideo, con más de mil
 * comercios de ropa, lencería, bazar, juguetería y celulares a los precios más bajos de la ciudad
 * (se lo compara con el Once de Buenos Aires), locales coreanos, puestos en la vereda y rotiserías.
 * Acá el juego tiene **la mayor cantidad de tiendas**, y las de ropa venden por mayor (`priceFactor`).
 */
/** Los mayoristas de ropa venden un 25 % más barato que las roperías de los otros barrios. */
const WHOLESALE = 0.75;
/** Prendas de una parte del cuerpo (para las tiendas que venden sólo eso). */
const clothingFor = (slot) => items_1.CLOTHING.filter((item) => item.slot === slot).map((item) => item.id);
exports.BARRIO_DE_LOS_JUDIOS_INFO = {
    id: "barrio-de-los-judios",
    name: "Barrio de los Judíos",
    description: "Villa Muñoz: el shopping a cielo abierto de Montevideo, con mayoristas de ropa por todos lados y las casas de colores de Reus al Norte.",
    // Oculto por ahora: sólo se juega en Ciudad Vieja, el Centro y el COMCAR.
    hidden: true,
    landmarks: [
        {
            id: "reus-oeste-norte",
            name: "Casas de Reus al Norte",
            description: "Casas de dos pisos en colores pastel de fines del siglo XIX, sobre la peatonal Emilio Reus: el corazón del barrio judío.",
            kind: "reusHouses",
            area: { x: 31, y: 7, width: 1, height: 11 },
        },
        {
            id: "reus-este-norte",
            name: "Casas de Reus al Norte",
            description: "Casas de dos pisos en colores pastel de fines del siglo XIX, sobre la peatonal Emilio Reus: el corazón del barrio judío.",
            kind: "reusHouses",
            area: { x: 35, y: 7, width: 1, height: 11 },
        },
        {
            id: "reus-oeste-sur",
            name: "Casas de Reus al Norte",
            description: "Casas de dos pisos en colores pastel de fines del siglo XIX, sobre la peatonal Emilio Reus: el corazón del barrio judío.",
            kind: "reusHouses",
            area: { x: 31, y: 19, width: 1, height: 11 },
        },
        {
            id: "reus-este-sur",
            name: "Casas de Reus al Norte",
            description: "Casas de dos pisos en colores pastel de fines del siglo XIX, sobre la peatonal Emilio Reus: el corazón del barrio judío.",
            kind: "reusHouses",
            area: { x: 35, y: 19, width: 1, height: 11 },
        },
        {
            id: "mercado-agricola",
            name: "Mercado Agrícola",
            description: "El MAM: mercado de 1913 con bóveda de hierro y vidrio, lleno de puestos de frutas, verduras, quesos y comida, a pasos de Villa Muñoz.",
            kind: "agriMarket",
            area: { x: 38, y: 21, width: 3, height: 3 },
        },
        {
            id: "san-pancracio",
            name: "Iglesia de San Pancracio",
            description: "Parroquia del Inmaculado Corazón de María, a la que todos los 12 del mes van miles a pedirle trabajo a San Pancracio.",
            kind: "church",
            area: { x: 50, y: 34, width: 4, height: 4 },
        },
        {
            id: "eac",
            name: "Espacio de Arte Contemporáneo",
            description: "Museo de arte en el ala restaurada de la vieja Cárcel de Miguelete, en Arenal Grande y Miguelete.",
            kind: "artCenter",
            area: { x: 12, y: 47, width: 6, height: 6 },
        },
    ],
    shops: [
        {
            id: "mayorista-arenal-grande",
            name: "Mayorista Arenal Grande",
            description: "Ropa por mayor sobre Arenal Grande: todo el catálogo más barato. También compra prendas.",
            area: { x: 18, y: 8, width: 2, height: 2 },
            building: "wholesale",
            buys: ["clothing"],
            stock: items_1.CLOTHING.map((item) => item.id),
            priceFactor: WHOLESALE,
        },
        {
            id: "moda-coreana",
            name: "Moda Coreana",
            description: "Local coreano de la calle Inca: buzos oversize, jeans nevados y colores pastel que no hay en otro lado.",
            area: { x: 24, y: 16, width: 2, height: 2 },
            building: "clothing",
            buys: ["clothing"],
            stock: items_1.KOREAN_FASHION.map((item) => item.id),
        },
        {
            id: "tienda-justicia",
            name: "Tienda Justicia",
            description: "Mayorista de remeras, buzos y pantalones sobre la calle Justicia, más baratos que en el centro.",
            area: { x: 7, y: 12, width: 2, height: 2 },
            building: "wholesale",
            buys: ["clothing"],
            stock: [...clothingFor("top"), ...clothingFor("bottom")],
            priceFactor: WHOLESALE,
        },
        {
            id: "calzados-libres",
            name: "Calzados Libres",
            description: "Championes, botas y chancletas por mayor.",
            area: { x: 47, y: 12, width: 2, height: 2 },
            building: "shoes",
            buys: ["clothing"],
            stock: clothingFor("shoes"),
            priceFactor: WHOLESALE,
        },
        {
            id: "gorras-y-gorros",
            name: "Gorras y Gorros",
            description: "Puesto de gorras, boinas y gorros de lana, al por mayor.",
            area: { x: 22, y: 22, width: 2, height: 2 },
            building: "wholesale",
            buys: ["clothing"],
            stock: clothingFor("hat"),
            priceFactor: WHOLESALE,
        },
        {
            id: "panaderia-reus",
            name: "Panadería Reus",
            description: "Tortas fritas recién hechas, alfajores y mate para seguir recorriendo locales.",
            area: { x: 37, y: 16, width: 2, height: 2 },
            building: "bakery",
            buys: [],
            stock: ["torta-frita", "alfajor", "mate"],
        },
        {
            id: "rotiseria-nicaragua",
            name: "Rotisería Nicaragua",
            description: "Panchos, chivitos y comida al paso para los que vienen a comprar.",
            area: { x: 18, y: 33, width: 2, height: 2 },
            building: "rotisserie",
            buys: [],
            stock: items_1.FOODS.filter((food) => food.id !== "pescado-plancha").map((food) => food.id),
        },
        {
            id: "farmacia-villa-munoz",
            name: "Farmacia Villa Muñoz",
            description: "Curitas, Perifar, vitaminas y botiquines.",
            area: { x: 22, y: 34, width: 2, height: 2 },
            building: "pharmacy",
            buys: [],
            stock: items_1.MEDICINES.map((item) => item.id),
        },
        {
            id: "puesto-tortas-fritas",
            name: "Puesto de tortas fritas",
            description: "En la vereda de Arenal Grande: tortas fritas y mate.",
            area: { x: 22, y: 45, width: 2, height: 2 },
            building: "kiosk",
            buys: [],
            stock: ["torta-frita", "mate"],
        },
    ],
};
//# sourceMappingURL=info.js.map