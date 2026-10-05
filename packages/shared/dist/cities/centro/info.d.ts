export declare const FABINI: import("../types").TileRect;
export declare const CAGANCHA: import("../types").TileRect;
export declare const CENTRO_INFO: {
    id: "centro";
    name: string;
    description: string;
    onFoot: true;
    landmarks: ({
        id: string;
        name: string;
        description: string;
        kind: "artDeco";
        area: import("../types").TileRect;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "modernTower";
        area: import("../types").TileRect;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "entrevero";
        area: import("../types").TileRect;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "cinema";
        area: import("../types").TileRect;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "departmentStore";
        area: import("../types").TileRect;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "peaceColumn";
        area: import("../types").TileRect;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "frenchPalace";
        area: import("../types").TileRect;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "italianPalace";
        area: import("../types").TileRect;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "decoTower";
        area: import("../types").TileRect;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "cityHall";
        area: import("../types").TileRect;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "victoryStatue";
        area: import("../types").TileRect;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "statue";
        area: import("../types").TileRect;
    })[];
    shops: ({
        id: string;
        name: string;
        description: string;
        area: import("../types").TileRect;
        building: "none";
        buys: "clothing"[];
        stock: string[];
    } | {
        id: string;
        name: string;
        description: string;
        area: import("../types").TileRect;
        building: "music";
        buys: "instrument"[];
        stock: string[];
    } | {
        id: string;
        name: string;
        description: string;
        area: import("../types").TileRect;
        building: "clothing";
        buys: "clothing"[];
        stock: string[];
    } | {
        id: string;
        name: string;
        description: string;
        area: import("../types").TileRect;
        building: "pharmacy";
        buys: never[];
        stock: string[];
    } | {
        id: string;
        name: string;
        description: string;
        area: import("../types").TileRect;
        building: "shoes";
        buys: "clothing"[];
        stock: string[];
    } | {
        id: string;
        name: string;
        description: string;
        area: import("../types").TileRect;
        building: "kiosk";
        buys: never[];
        stock: string[];
    } | {
        id: string;
        name: string;
        description: string;
        area: import("../types").TileRect;
        building: "bakery";
        buys: never[];
        stock: string[];
    } | {
        id: string;
        name: string;
        description: string;
        area: import("../types").TileRect;
        building: "crafts";
        buys: never[];
        stock: string[];
    } | {
        id: string;
        name: string;
        description: string;
        area: import("../types").TileRect;
        building: "cafe";
        buys: never[];
        stock: string[];
    } | {
        id: string;
        name: string;
        description: string;
        area: import("../types").TileRect;
        building: "rotisserie";
        buys: never[];
        stock: string[];
    })[];
};
//# sourceMappingURL=info.d.ts.map