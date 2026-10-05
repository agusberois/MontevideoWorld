"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CENTRO_INFO = exports.CAGANCHA = exports.FABINI = void 0;
const items_1 = require("../../items");
const grid_1 = require("./grid");
/**
 * El Centro: nombre, descripción, edificios emblemáticos y tiendas. Es lo liviano del barrio: el
 * cliente lo tiene siempre (lista de barrios, landing, tiendas); el mapa (`map.ts`) se descarga al
 * entrar.
 *
 * El barrio real: la "Ciudad Nueva" que trazó José María Reyes en 1829, cuando se tiraron las
 * murallas, de Florida (el límite con Ciudad Vieja) a Ejido. Lo ordena **18 de Julio**, la avenida
 * principal de Montevideo, con sus palacios art déco y eclécticos de los años 20 a 40 (Salvo, Rinaldi,
 * Lapido, Díaz), las grandes tiendas (London París, en Río Negro, fue la primera tienda por
 * departamentos), cafés como el Facal, la Plaza Fabini (El Entrevero, de Belloni), la Plaza Cagancha
 * (la Columna de la Paz, el kilómetro 0, con el Palacio Piria y el Mercado de los Artesanos), el
 * Palacio Santos, la Sala Zitarrosa y, pasando Ejido, el Palacio Municipal con el David en la
 * explanada. Es el centro comercial y administrativo de la ciudad: acá el juego pone **tiendas** y
 * la actividad del barrio es **tocar en la calle** (instrumentos de la Casa de Música, ver `busking.ts`).
 */
/** Prendas de una parte del cuerpo (para las tiendas que venden sólo eso). */
const clothingFor = (slot) => items_1.CLOTHING.filter((item) => item.slot === slot).map((item) => item.id);
/** Primera columna de la manzana que sigue a la calle (al este). */
const after = (street) => street + grid_1.STREET_WIDTH;
const { northFront, southFront } = grid_1.AVENUE;
/** Un local de 2 × 2 sobre la vereda norte de 18 de Julio (su fila de abajo da a la vereda). */
const north = (x) => (0, grid_1.rect)(x, northFront - 1, 2);
/** Un local de 2 × 2 sobre la vereda sur. */
const south = (x) => (0, grid_1.rect)(x, southFront, 2);
exports.FABINI = (0, grid_1.rect)(after(grid_1.COLUMN_STREETS.julioHerreraYObes), grid_1.ROW_STREETS.colonia + grid_1.STREET_WIDTH, 6, 8);
exports.CAGANCHA = (0, grid_1.rect)(after(grid_1.COLUMN_STREETS.rondeau), southFront, 6, 8);
exports.CENTRO_INFO = {
    id: "centro",
    name: "Centro",
    description: "18 de Julio, la avenida de las tiendas: London París, los palacios art déco, el Café Facal, la Plaza Cagancha y la Intendencia.",
    onFoot: true,
    landmarks: [
        {
            id: "rinaldi",
            name: "Palacio Rinaldi",
            description: "Art déco de 1929 (Isola y Armas), en 18 de Julio 839, a pasos de la Plaza Independencia.",
            kind: "artDeco",
            area: (0, grid_1.rect)(0, northFront - 2, 3),
        },
        {
            id: "lapido",
            name: "Palacio Lapido",
            description: "Aubriot y Valabrega, 1933: doce pisos blancos que doblan la esquina de Río Branco con balcones curvos y una torre.",
            kind: "modernTower",
            area: (0, grid_1.rect)(after(grid_1.COLUMN_STREETS.rioBranco), northFront - 3, 4),
        },
        {
            id: "entrevero",
            name: "El Entrevero",
            description: "Bronce de José Belloni en la Plaza Fabini: una pelea de jinetes de la independencia, sobre la fuente.",
            kind: "entrevero",
            area: (0, grid_1.rect)(exports.FABINI.x + 2, exports.FABINI.y + 2, 3),
        },
        {
            id: "sala-zitarrosa",
            name: "Sala Zitarrosa",
            description: "En el Edificio Rex (Alfredo Jones Brown, 1928), con su cúpula mirador iluminada: el viejo Cine Rex, hoy sala de recitales y teatro.",
            kind: "cinema",
            area: (0, grid_1.rect)(after(grid_1.COLUMN_STREETS.julioHerreraYObes), southFront, 3),
        },
        {
            id: "london-paris",
            name: "London París",
            description: "The Standard Life (1905–1908), en 18 de Julio y Río Negro: la torre de la esquina con el reloj triple y el Atlas con el mundo arriba de la cúpula.",
            kind: "departmentStore",
            area: (0, grid_1.rect)(after(grid_1.COLUMN_STREETS.rioNegro), southFront, 4),
        },
        {
            id: "columna-de-la-paz",
            name: "Columna de la Paz",
            description: "En el medio de la Plaza Cagancha: la estatua de la Paz sobre la columna. De acá se miden los kilómetros del país.",
            kind: "peaceColumn",
            area: (0, grid_1.rect)(exports.CAGANCHA.x + 2, exports.CAGANCHA.y + 2, 2),
        },
        {
            id: "palacio-piria",
            name: "Palacio Piria",
            description: "La casa de Francisco Piria (Camille Gardelle, 1917), hoy la Suprema Corte de Justicia, mirando a la Plaza Cagancha.",
            kind: "frenchPalace",
            area: (0, grid_1.rect)(exports.CAGANCHA.x + 1, after(grid_1.ROW_STREETS.sanJose), 4),
        },
        {
            id: "palacio-santos",
            name: "Palacio Santos",
            description: "Residencia del presidente Máximo Santos (Juan A. Capurro, 1885), renacimiento italiano en 18 de Julio 1205: hoy la Cancillería.",
            kind: "italianPalace",
            area: (0, grid_1.rect)(after(grid_1.COLUMN_STREETS.zelmarMichelini), southFront, 3),
        },
        {
            id: "palacio-diaz",
            name: "Palacio Díaz",
            description: "Rascacielos art déco de 17 pisos (Vázquez Barrière y Ruano, 1929) con el remate escalonado, entre Yaguarón y Ejido.",
            kind: "decoTower",
            area: (0, grid_1.rect)(after(grid_1.COLUMN_STREETS.yaguaron), southFront, 4),
        },
        {
            id: "intendencia",
            name: "Palacio Municipal",
            description: "La Intendencia (Mauricio Cravotto, 1941): la torre de 78 m y 22 pisos con el mirador arriba y el ascensor por fuera.",
            kind: "cityHall",
            area: (0, grid_1.rect)(after(grid_1.COLUMN_STREETS.ejido) + 5, southFront + 6, 8),
        },
        {
            id: "nike",
            name: "Niké de Samotracia",
            description: "Copia de la Victoria alada de Samotracia, a la derecha de la entrada de la Intendencia.",
            kind: "victoryStatue",
            area: (0, grid_1.rect)(after(grid_1.COLUMN_STREETS.ejido) + 13, southFront + 1, 2),
        },
        {
            id: "david",
            name: "El David",
            description: "Réplica en bronce del David de Miguel Ángel, en la explanada de la Intendencia desde 1958.",
            kind: "statue",
            area: (0, grid_1.rect)(after(grid_1.COLUMN_STREETS.ejido) + 8, southFront + 2, 2),
        },
    ],
    shops: [
        {
            id: "london-paris",
            name: "London París",
            description: "La gran tienda de 18 de Julio: todo el catálogo de ropa y la línea de vestir que no hay en otro lado. También compra prendas.",
            area: (0, grid_1.rect)(after(grid_1.COLUMN_STREETS.rioNegro), southFront, 4),
            building: "none",
            buys: ["clothing"],
            stock: [...items_1.LONDON_PARIS_FASHION, ...items_1.CLOTHING].map((item) => item.id),
        },
        {
            id: "casa-de-musica",
            name: "Casa de Música",
            description: "Armónicas, guitarras criollas, bandoneones y tambores de candombe para tocar en 18 de Julio. También compra instrumentos usados.",
            area: south(after(grid_1.COLUMN_STREETS.rioBranco)),
            building: "music",
            buys: ["instrument"],
            stock: items_1.INSTRUMENTS.map((item) => item.id),
        },
        {
            id: "roperia-18",
            name: "Ropería 18 de Julio",
            description: "Remeras, buzos, jeans y gorras sobre la avenida. También compra prendas.",
            area: north(after(grid_1.COLUMN_STREETS.andes)),
            building: "clothing",
            buys: ["clothing"],
            stock: items_1.CLOTHING.map((item) => item.id),
        },
        {
            id: "farmacia-18",
            name: "Farmacia 18 de Julio",
            description: "Curitas, Perifar, vitaminas y botiquines, abierta hasta tarde.",
            area: north(after(grid_1.COLUMN_STREETS.convencion) + 3),
            building: "pharmacy",
            buys: [],
            stock: items_1.MEDICINES.map((item) => item.id),
        },
        {
            id: "calzados-18",
            name: "Calzados 18 de Julio",
            description: "Championes, botas y los championes para caminar rápido, como en Calzados Sarandí.",
            area: south(after(grid_1.COLUMN_STREETS.convencion)),
            building: "shoes",
            buys: ["clothing"],
            stock: [...clothingFor("shoes"), ...items_1.WALKING_SHOES.map((item) => item.id)],
        },
        {
            id: "kiosco-fabini",
            name: "Kiosco Fabini",
            description: "Alfajores, tortas fritas y un mate para seguir recorriendo vidrieras.",
            area: north(after(grid_1.COLUMN_STREETS.rioNegro)),
            building: "kiosk",
            buys: [],
            stock: ["alfajor", "torta-frita", "mate"],
        },
        {
            id: "confiteria-paraguay",
            name: "Confitería Paraguay",
            description: "Confitería de las de antes: alfajores, tortas fritas y mate.",
            area: north(after(grid_1.COLUMN_STREETS.paraguay)),
            building: "bakery",
            buys: [],
            stock: ["alfajor", "torta-frita", "mate"],
        },
        {
            id: "gorras-paraguay",
            name: "Sombrerería Paraguay",
            description: "Gorras, boinas y gorros de lana.",
            area: south(after(grid_1.COLUMN_STREETS.paraguay)),
            building: "clothing",
            buys: ["clothing"],
            stock: clothingFor("hat"),
        },
        {
            id: "mercado-artesanos",
            name: "Mercado de los Artesanos",
            description: "En la Plaza Cagancha: mates, gorros de lana tejidos a mano, boinas y alpargatas.",
            area: (0, grid_1.rect)(exports.CAGANCHA.x, exports.CAGANCHA.y + exports.CAGANCHA.height - 2, 2),
            building: "crafts",
            buys: [],
            stock: ["mate", "gorro-lana", "boina-negra", "alpargatas"],
        },
        {
            id: "cafe-facal",
            name: "Café Facal",
            description: "El café de 18 de Julio y Yí desde 1882: chivitos, panchos, alfajores y café con Gardel en la vereda.",
            area: north(after(grid_1.COLUMN_STREETS.yi)),
            building: "cafe",
            buys: [],
            stock: ["chivito", "pancho", "alfajor", "mate"],
        },
        {
            id: "mercado-abundancia",
            name: "Mercado de la Abundancia",
            description: "Parrillas y puestos de comida en Yaguarón y San José: chivitos, pescado a la plancha y panchos.",
            area: (0, grid_1.rect)(after(grid_1.COLUMN_STREETS.yi), after(grid_1.ROW_STREETS.sanJose), 2),
            building: "rotisserie",
            buys: [],
            stock: items_1.FOODS.filter((food) => food.id !== "torta-frita").map((food) => food.id),
        },
    ],
};
//# sourceMappingURL=info.js.map