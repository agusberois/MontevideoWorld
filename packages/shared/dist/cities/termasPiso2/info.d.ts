/**
 * Piso 2 del Hotel del Donador: igual a la planta baja (los mismos dos jacuzzis de 20, reposeras,
 * plantas y faroles), así entran el doble. Se sube por la escalera de la planta baja; no tiene salida
 * a la calle (se baja). Mismo acceso: donadores y el admin.
 */
export declare const TERMAS_PISO_2_INFO: {
    id: "termas-2";
    name: string;
    description: string;
    access: "donor";
    indoor: true;
    landmarks: ({
        id: string;
        name: string;
        description: string;
        kind: "plant" | "pottedPalm" | "flowers";
        area: {
            x: 16 | 6 | 9 | 5 | 1 | 11 | 21 | 13 | 17;
            y: 6 | 5 | 1 | 11 | 13 | 17;
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