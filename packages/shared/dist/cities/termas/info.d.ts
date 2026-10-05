/**
 * Termas del Donador: el interior al que sólo entran los donadores del proyecto (y el admin), por la
 * puerta del edificio de Ciudad Vieja. Lo liviano de la sala (el mapa, `map.ts`, se descarga al
 * entrar). Inspirado en las termas del Daymán y el Arapey: baldosas, plantas, reposeras y un jacuzzi
 * termal en el medio que recupera energía y salud mucho más rápido que un banco.
 */
export declare const WIDTH = 22;
export declare const HEIGHT = 18;
export declare const TERMAS_INFO: {
    id: "termas";
    name: string;
    access: "donor";
    indoor: true;
    description: string;
    landmarks: ({
        id: string;
        name: string;
        description: string;
        kind: "plant" | "pottedPalm" | "flowers";
        area: {
            x: 16 | 6 | 9 | 5 | 1 | 11 | 21 | 13 | 17;
            y: 6 | 5 | 4 | 1 | 12 | 11 | 13 | 17;
            width: number;
            height: number;
        };
    } | {
        id: string;
        name: string;
        description: string;
        kind: "lamp";
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