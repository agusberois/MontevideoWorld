export declare const BARRIO_DE_LOS_JUDIOS_INFO: {
    id: "barrio-de-los-judios";
    name: string;
    description: string;
    landmarks: ({
        id: string;
        name: string;
        description: string;
        kind: "reusHouses";
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
        kind: "agriMarket";
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
        kind: "church";
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
        kind: "artCenter";
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
        building: "wholesale";
        buys: "clothing"[];
        stock: string[];
        priceFactor: number;
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
        priceFactor?: undefined;
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
        building: "shoes";
        buys: "clothing"[];
        stock: string[];
        priceFactor: number;
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
        building: "bakery";
        buys: never[];
        stock: string[];
        priceFactor?: undefined;
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
        building: "rotisserie";
        buys: never[];
        stock: string[];
        priceFactor?: undefined;
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
        buys: never[];
        stock: string[];
        priceFactor?: undefined;
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
        buys: never[];
        stock: string[];
        priceFactor?: undefined;
    })[];
};
//# sourceMappingURL=info.d.ts.map