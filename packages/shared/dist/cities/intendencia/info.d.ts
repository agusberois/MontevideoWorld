/**
 * La Intendencia por dentro: el hall de Atención al público, al que se entra por la puerta del
 * edificio del Centro (cualquiera, sin boleto). Contra la pared norte, una fila de escritorios
 * (`DESKS`), cada uno con su empleado detrás (`npcs` en `map.ts`); en el primero atiende la
 * funcionaria de la bienvenida, que recibe el sobre. En el medio, bancos para esperar el turno.
 */
export declare const WIDTH = 22;
export declare const HEIGHT = 14;
/**
 * Los escritorios (2 × 2): la fila de atrás es la del empleado (no se camina) y la de adelante, la
 * mesa. Se le habla desde el tile de adelante de la mesa (`Npc.counter`).
 */
export declare const DESK_Y = 2;
export declare const DESKS: readonly [3, 7, 11, 15];
export declare const INTENDENCIA_INFO: {
    id: "intendencia";
    name: string;
    access: "door";
    indoor: true;
    description: string;
    landmarks: ({
        id: string;
        name: string;
        description: string;
        kind: "officeDesk";
        area: {
            x: 3 | 7 | 15 | 11;
            y: number;
            width: number;
            height: number;
        };
    } | {
        id: string;
        name: string;
        description: string;
        kind: "pottedPalm";
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