export declare const WIDTH = 20;
export declare const HEIGHT = 16;
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
    })[];
};
//# sourceMappingURL=info.d.ts.map