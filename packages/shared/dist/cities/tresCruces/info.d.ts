/**
 * Tres Cruces: nombre, descripción, edificios emblemáticos y tiendas. Es lo liviano del barrio: el
 * cliente lo tiene siempre (lista de barrios, landing, tiendas); el mapa (`map.ts`) se descarga al entrar.
 */
export declare const TRES_CRUCES_INFO: {
    id: "tres-cruces";
    name: string;
    description: string;
    hidden: true;
    landmarks: ({
        id: string;
        name: string;
        description: string;
        kind: "shopping";
        area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    } | {
        id: string;
        name: string;
        description: string;
        kind: "hospital";
        area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    } | {
        id: string;
        name: string;
        description: string;
        kind: "obelisk";
        area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    } | {
        id: string;
        name: string;
        description: string;
        kind: "velodrome";
        area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    } | {
        id: string;
        name: string;
        description: string;
        kind: "stadium";
        area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
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
        building: "none";
        stock: never[];
        buys: never[];
        hospital: true;
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
        buys: "clothing"[];
        stock: string[];
        hospital?: undefined;
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
        buys: "cart"[];
        hospital?: undefined;
    })[];
};
//# sourceMappingURL=info.d.ts.map