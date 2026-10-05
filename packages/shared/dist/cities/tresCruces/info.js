"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRES_CRUCES_INFO = void 0;
const items_1 = require("../../items");
/**
 * Tres Cruces: nombre, descripción, edificios emblemáticos y tiendas. Es lo liviano del barrio: el
 * cliente lo tiene siempre (lista de barrios, landing, tiendas); el mapa (`map.ts`) se descarga al entrar.
 */
exports.TRES_CRUCES_INFO = {
    id: "tres-cruces",
    name: "Tres Cruces",
    description: "El shopping y la terminal, el Bulevar Artigas y el Parque Batlle con el Estadio Centenario.",
    // Oculto por ahora: sólo se juega en Ciudad Vieja, el Centro y el COMCAR.
    hidden: true,
    landmarks: [
        {
            id: "shopping-tres-cruces",
            name: "Shopping Tres Cruces",
            description: "Shopping y terminal de ómnibus sobre el Bulevar Artigas: de acá salen los buses a todo el país.",
            kind: "shopping",
            area: { x: 25, y: 2, width: 8, height: 8 },
        },
        {
            id: "sanatorio-americano",
            name: "Sanatorio Americano",
            description: "Sanatorio en altura con helipuerto en la azotea.",
            kind: "hospital",
            area: { x: 8, y: 10, width: 4, height: 4 },
        },
        {
            id: "obelisco",
            name: "Obelisco a los Constituyentes",
            description: "Obelisco de granito de 1938 al final de la Avenida 18 de Julio.",
            kind: "obelisk",
            area: { x: 16, y: 33, width: 2, height: 2 },
        },
        {
            id: "velodromo",
            name: "Velódromo Municipal",
            description: "Pista de ciclismo peraltada del Parque Batlle, también escenario de recitales.",
            kind: "velodrome",
            area: { x: 28, y: 31, width: 8, height: 8 },
        },
        {
            id: "estadio-centenario",
            name: "Estadio Centenario",
            description: "Sede de la final del primer Mundial (1930), con su Torre de los Homenajes.",
            kind: "stadium",
            area: { x: 53, y: 30, width: 14, height: 14 },
        },
    ],
    shops: [
        {
            // La guardia funciona dentro del Sanatorio Americano (ya dibujado): curarse pagando, y acá te
            // trae la ambulancia si te desmayás (`HOSPITAL_SHOP_ID`).
            id: "guardia-sanatorio",
            name: "Guardia del Sanatorio",
            description: "La guardia del Sanatorio Americano: te curan del todo pagando la consulta.",
            area: { x: 8, y: 10, width: 4, height: 4 },
            building: "none",
            stock: [],
            buys: [],
            hospital: true,
        },
        {
            id: "moda-tres-cruces",
            name: "Moda Tres Cruces",
            description: "Locales de ropa del shopping: compran y venden prendas.",
            area: { x: 25, y: 2, width: 8, height: 8 },
            building: "none",
            buys: ["clothing"],
            stock: items_1.CLOTHING.map((item) => item.id),
        },
        {
            id: "kiosco-parque",
            name: "Kiosco del Parque",
            description: "Frente al Estadio Centenario: vende carritos para vender en la explanada (y compra los usados), panchos y mate.",
            area: { x: 74, y: 28, width: 2, height: 2 },
            building: "kiosk",
            stock: [...items_1.CARTS.map((item) => item.id), "pancho", "mate"],
            buys: ["cart"],
        },
    ],
};
//# sourceMappingURL=info.js.map