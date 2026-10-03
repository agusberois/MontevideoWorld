/**
 * Ciudad Vieja: nombre, descripción, edificios emblemáticos y tiendas. Es lo liviano del barrio: el
 * cliente lo tiene siempre (lista de barrios, landing, tiendas); el mapa (`map.ts`) se descarga al entrar.
 */
export declare const CIUDAD_VIEJA_INFO: {
    id: "ciudad-vieja";
    name: string;
    description: string;
    landmarks: ({
        id: string;
        name: string;
        description: string;
        kind: "gate";
        area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        passable: {
            x: number;
            y: number;
        }[];
    } | {
        id: string;
        name: string;
        description: string;
        kind: "equestrianMonument";
        area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        passable?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "palacioSalvo";
        area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        passable?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "theater";
        area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        passable?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "cathedral";
        area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        passable?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "cabildo";
        area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        passable?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "fountain";
        area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        passable?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "lighthouse";
        area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        passable?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "market";
        area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        passable?: undefined;
    })[];
    shops: ({
        id: string;
        name: string;
        description: string;
        area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        building: "stm";
        stock: string[];
        buys: "ticket"[];
        pets?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        building: "clothing";
        buys: "clothing"[];
        stock: string[];
        pets?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        building: "kiosk";
        stock: string[];
        buys: never[];
        pets?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        building: "pharmacy";
        stock: string[];
        buys: never[];
        pets?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        building: "pets";
        stock: never[];
        buys: never[];
        pets: string[];
    } | {
        id: string;
        name: string;
        description: string;
        area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        building: "none";
        stock: string[];
        buys: "fish"[];
        pets?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        building: "fishing";
        stock: string[];
        buys: "rod"[];
        pets?: undefined;
    })[];
};
//# sourceMappingURL=info.d.ts.map