/**
 * COMCAR: nombre, descripción, edificios emblemáticos y tiendas. Es lo liviano del barrio: el
 * cliente lo tiene siempre (lista de barrios, landing, tiendas); el mapa (`map.ts`) se descarga al entrar.
 */
export declare const WIDTH = 44;
/** Fila del muro sur del penal (con la reja en el medio). */
export declare const SOUTH_WALL_Y = 34;
export declare const COMCAR_INFO: {
    id: "comcar";
    name: string;
    prison: true;
    description: string;
    landmarks: ({
        id: string;
        name: string;
        description: string;
        kind: "cellBlock";
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
        kind: "watchtower";
        area: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    })[];
    shops: never[];
};
//# sourceMappingURL=info.d.ts.map