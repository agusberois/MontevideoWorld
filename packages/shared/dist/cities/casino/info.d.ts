/**
 * Casino Victoria Plaza por dentro: se entra por la puerta del edificio de Ciudad Vieja (cualquiera,
 * sin boleto). Tragamonedas contra la pared norte, dos mesas de ruleta y dos de blackjack, y la
 * barra de tragos y comida en la esquina noreste, con el barman atendiendo (`npcs` en `map.ts`).
 */
export declare const WIDTH = 28;
export declare const HEIGHT = 20;
/** La barra: el estante con las botellas contra la pared, el pasillo del barman y el mostrador. */
export declare const BAR: {
    readonly x: 18;
    readonly width: 8;
};
/** Fila del estante (pegado a la pared norte), del barman y del mostrador. */
export declare const BAR_SHELF_Y = 1;
export declare const BAR_BACK_Y = 2;
export declare const BAR_COUNTER_Y = 3;
export declare const CASINO_INFO: {
    id: "casino";
    name: string;
    access: "door";
    indoor: true;
    description: string;
    landmarks: ({
        id: string;
        name: string;
        description: string;
        kind: "slotMachine";
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
        kind: "rouletteTable";
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
        kind: "blackjackTable";
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
        kind: "pottedPalm";
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
        kind: "barShelf";
        area: {
            x: 18;
            y: number;
            width: 8;
            height: number;
        };
    } | {
        id: string;
        name: string;
        description: string;
        kind: "barCounter";
        area: {
            x: 18;
            y: number;
            width: 8;
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
        casino: "slots";
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
        stock: never[];
        buys: never[];
        casino: "roulette";
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
        stock: never[];
        buys: never[];
        casino: "blackjack";
    } | {
        id: string;
        name: string;
        description: string;
        area: {
            x: 18;
            y: number;
            width: 8;
            height: number;
        };
        building: "none";
        stock: string[];
        buys: never[];
    })[];
};
//# sourceMappingURL=info.d.ts.map