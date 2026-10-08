"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CIUDAD_VIEJA_INFO = exports.MERCADO_BUS_STOP = exports.PLAZA_BUS_STOP = exports.ESCOLLERA_NORTE_PLATFORM = exports.ESCOLLERA_PLATFORM = void 0;
const items_1 = require("../../items");
const pets_1 = require("../../pets");
const grid_1 = require("./grid");
/**
 * Ciudad Vieja: nombre, descripción, edificios emblemáticos y tiendas. Es lo liviano del barrio: el
 * cliente lo tiene siempre (lista de barrios, landing, tiendas); el mapa (`map.ts`) se descarga al entrar.
 *
 * Las posiciones salen del plano real (OpenStreetMap), a 12 m por tile y con la grilla girada como
 * las calles (`grid.ts`; ver `docs/finished/ciudad-vieja-mapa-real.md`): cada edificio en su manzana real. Oeste → este: la Escollera Sarandí en la
 * punta, el Mercado del Puerto, la Plaza Zabala, la Plaza Matriz (Catedral y Cabildo enfrentados), la
 * Puerta de la Ciudadela y la Plaza Independencia con el Palacio Salvo en la esquina este.
 */
/** Plataforma de la punta de la Escollera Sarandí (donde se pesca; la guía lleva hasta acá). */
exports.ESCOLLERA_PLATFORM = { x: 1, y: 45, width: 7, height: 11 };
/**
 * Segunda escollera, igual a la de la punta pero más al norte, cerca de la bahía: el brazo sale de
 * la rambla oeste en la fila 15 (de 14 a 16) hasta esta plataforma.
 */
exports.ESCOLLERA_NORTE_PLATFORM = { x: 1, y: 10, width: 7, height: 11 };
/** Paradas de ómnibus. */
exports.PLAZA_BUS_STOP = { name: "Plaza Independencia", x: 136, y: 60, facing: "south" };
exports.MERCADO_BUS_STOP = { name: "Mercado del Puerto", x: 39, y: 13, facing: "south" };
exports.CIUDAD_VIEJA_INFO = {
    id: "ciudad-vieja",
    name: "Ciudad Vieja",
    description: "El casco histórico de Montevideo, entre el puerto y la Plaza Independencia.",
    landmarks: [
        {
            id: "casino",
            name: "Casino Victoria Plaza",
            description: "El casino Victoria Plaza: tragamonedas, ruleta y blackjack para probar suerte.",
            kind: "casino",
            area: (0, grid_1.rect)(109, 20, 3),
        },
        {
            id: "termas-del-donador",
            name: "Hotel del Donador",
            description: "El hotel cinco estrellas de los que bancan el proyecto, con spa y jacuzzi: sólo entran los donadores.",
            kind: "termas",
            area: (0, grid_1.rect)(125, 43, 4),
        },
        {
            id: "puerta-ciudadela",
            name: "Puerta de la Ciudadela",
            description: "Único resto de la muralla colonial: separa la Ciudad Vieja de la Plaza Independencia.",
            kind: "gate",
            area: (0, grid_1.rect)(124, 47, 1, 6),
            // Los dos arcos, sobre la peatonal Sarandí.
            passable: [
                { x: 124, y: 49 },
                { x: 124, y: 50 },
            ],
        },
        {
            id: "monumento-artigas",
            name: "Monumento a Artigas",
            description: "Estatua ecuestre de José Artigas en el centro de la Plaza Independencia, sobre su mausoleo.",
            kind: "equestrianMonument",
            area: (0, grid_1.rect)(129, 53, 3),
        },
        {
            id: "palacio-salvo",
            name: "Palacio Salvo",
            description: "El rascacielos de 1928 en la esquina de la Plaza Independencia y 18 de Julio.",
            kind: "palacioSalvo",
            area: (0, grid_1.rect)(139, 56, 6),
        },
        {
            id: "torre-ejecutiva",
            name: "Torre Ejecutiva",
            description: "La sede de la Presidencia, sobre el lado sur de la Plaza Independencia.",
            kind: "executiveTower",
            area: (0, grid_1.rect)(125, 61, 4),
        },
        {
            id: "palacio-estevez",
            name: "Palacio Estévez",
            description: "Antigua casa de gobierno (1874), al lado de la Torre Ejecutiva; hoy museo.",
            kind: "palace",
            area: (0, grid_1.rect)(130, 61, 4),
        },
        {
            id: "teatro-solis",
            name: "Teatro Solís",
            description: "El teatro más antiguo del país (1856), con su pórtico de columnas, a pasos de la Plaza Independencia.",
            kind: "theater",
            area: (0, grid_1.rect)(116, 60, 4),
        },
        {
            id: "catedral",
            name: "Catedral Metropolitana",
            description: "La Iglesia Matriz, del lado oeste de la Plaza Matriz, con sus dos torres.",
            kind: "cathedral",
            area: (0, grid_1.rect)(92, 43, 4),
        },
        {
            id: "cabildo",
            name: "Cabildo de Montevideo",
            description: "Sede del gobierno colonial, enfrente de la Catedral; hoy museo histórico.",
            kind: "cabildo",
            area: (0, grid_1.rect)(109, 44, 3),
        },
        {
            id: "fuente-plaza-matriz",
            name: "Fuente de la Plaza Matriz",
            description: "La fuente de 1871 en el centro de la plaza más antigua de la ciudad.",
            kind: "fountain",
            area: (0, grid_1.rect)(101, 44, 2),
        },
        {
            id: "palacio-taranco",
            name: "Palacio Taranco",
            description: "Palacio de estilo francés (1910) frente a la Plaza Zabala; hoy Museo de Artes Decorativas.",
            kind: "palace",
            area: (0, grid_1.rect)(68, 27, 4),
        },
        {
            id: "templo-ingles",
            name: "Templo Inglés",
            description: "La iglesia anglicana de la Santísima Trinidad, sobre la rambla sur.",
            kind: "church",
            area: (0, grid_1.rect)(92, 68, 4),
        },
        {
            id: "escollera-sarandi",
            name: "Escollera Sarandí",
            description: "Espigón que sale de la punta de la Ciudad Vieja hacia el río, con su farola. Parado en la escollera se puede pescar.",
            kind: "lighthouse",
            area: (0, grid_1.rect)(1, 55, 1),
        },
        {
            id: "escollera-norte",
            name: "Escollera norte",
            description: "Segundo espigón, más al norte sobre la rambla oeste, con su farola. También se pesca.",
            kind: "lighthouse",
            area: (0, grid_1.rect)(1, 10, 1),
        },
        {
            id: "registro-barras",
            name: "Registro de Barras",
            description: "Casona sobre la peatonal Sarandí donde se anotan las barras del barrio: nombre, sigla y colores.",
            kind: "barraRegistry",
            area: (0, grid_1.rect)(77, 45, 3),
        },
        {
            id: "mercado-puerto",
            name: "Mercado del Puerto",
            description: "Estructura de hierro de 1868 frente al puerto, famosa por sus parrillas.",
            kind: "market",
            // En la manzana grande entre Juan Lindolfo Cuestas y Maciel; al lado, la Parrilla del Mercado.
            area: (0, grid_1.rect)(31, 11, 4),
        },
    ],
    shops: [
        {
            // Funciona dentro de la casona del Registro (ya dibujada): fundar una barra.
            id: "registro-barras",
            name: "Registro de Barras",
            description: "Fundá tu barra: elegí un nombre, una sigla y dos colores.",
            area: (0, grid_1.rect)(77, 45, 3),
            building: "none",
            stock: [],
            buys: [],
            registry: true,
        },
        {
            id: "calzados-sarandi",
            name: "Calzados Sarandí",
            description: "Sobre la peatonal: championes de todo tipo. Los mejores te hacen caminar mucho más rápido.",
            area: (0, grid_1.rect)(86, 52, 2),
            building: "shoes",
            buys: ["clothing"],
            stock: [...items_1.WALKING_SHOES.map((item) => item.id), ...items_1.CLOTHING.filter((item) => item.slot === "shoes").map((item) => item.id)],
        },
        {
            id: "agencia-stm",
            name: "Agencia STM",
            description: "Sobre la Rambla 25 de Agosto, frente al puerto: vende boletos de ómnibus para viajar entre barrios.",
            area: (0, grid_1.rect)(54, 11, 2),
            building: "stm",
            stock: [items_1.TICKET_ID],
            buys: ["ticket"],
        },
        {
            id: "roperia-sarandi",
            name: "Ropería Sarandí",
            description: "Tienda de ropa de la peatonal: compra y vende prendas.",
            area: (0, grid_1.rect)(84, 52, 2),
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
            id: "kiosco-independencia",
            name: "Kiosco de la Plaza",
            description: "En la Plaza Independencia: tortas fritas, alfajores y mate para seguir laburando.",
            area: (0, grid_1.rect)(136, 47, 2),
            building: "kiosk",
            stock: ["torta-frita", "alfajor", "mate"],
            // El sobre de la bienvenida: unos pesos por él (y se termina la misión, ver `welcome.ts`).
            buys: ["letter"],
        },
        {
            id: "farmacia-sarandi",
            name: "Farmacia Sarandí",
            description: "Sobre la peatonal, al lado de la veterinaria: Perifar, curitas, vitaminas y botiquines para la salud.",
            area: (0, grid_1.rect)(118, 52, 2),
            building: "pharmacy",
            stock: items_1.MEDICINES.map((item) => item.id),
            buys: [],
        },
        {
            id: "veterinaria-sarandi",
            name: "Veterinaria Sarandí",
            description: "Sobre la peatonal: adoptá una mascota, ponele nombre y te acompaña a todos lados.",
            area: (0, grid_1.rect)(116, 52, 2),
            building: "pets",
            stock: [],
            buys: [],
            pets: pets_1.PETS.map((pet) => pet.id),
        },
        {
            id: "pescaderia-mercado",
            name: "Pescadería del Mercado",
            description: "En el Mercado del Puerto te compran lo que pescaste a precio completo y venden todos los pescados del río (más caros). En las parrillas, chivito y pescado a la plancha.",
            area: (0, grid_1.rect)(31, 11, 4),
            building: "none",
            stock: ["chivito", "pescado-plancha", ...items_1.FISH.map((fish) => fish.id)],
            buys: ["fish"],
        },
        {
            // Al lado de la Pescadería, en la misma manzana del Mercado: se cocina lo que se pescó (`grillYield`).
            id: "parrilla-mercado",
            name: "Parrilla del Mercado",
            description: "Brasas de leña frente al Mercado del Puerto: traé lo que pescaste y te lo devuelven a la plancha. Cuanto más grande el pez, más porciones.",
            area: (0, grid_1.rect)(36, 11, 2),
            building: "grill",
            stock: [],
            buys: [],
            grill: true,
        },
        {
            id: "tienda-pesca",
            name: "Pesca Sarandí",
            description: "En la punta, frente a la Escollera Sarandí: vende cañas (las mejores pescan mejor) y compra las usadas.",
            area: (0, grid_1.rect)(20, 52, 2),
            building: "fishing",
            stock: items_1.RODS.map((rod) => rod.id),
            buys: ["rod"],
        },
    ],
};
//# sourceMappingURL=info.js.map