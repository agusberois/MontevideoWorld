import type { BusStop, TileRect } from "../types";
/**
 * Ciudad Vieja: nombre, descripción, edificios emblemáticos y tiendas. Es lo liviano del barrio: el
 * cliente lo tiene siempre (lista de barrios, landing, tiendas); el mapa (`map.ts`) se descarga al entrar.
 *
 * Las posiciones salen del plano real (OpenStreetMap), a 12 m por tile y con la grilla girada como
 * las calles (`grid.ts`; ver `docs/finished/ciudad-vieja-mapa-real.md`): cada edificio en su manzana real. Oeste → este: la Escollera Sarandí en la
 * punta, el Mercado del Puerto, la Plaza Zabala, la Plaza Matriz (Catedral y Cabildo enfrentados), la
 * Puerta de la Ciudadela y la Plaza Independencia con el Palacio Salvo en la esquina este.
 */
/** Plataforma de la punta de la Escollera Sarandí (donde se pesca; la guía lleva hasta acá). */
export declare const ESCOLLERA_PLATFORM: TileRect;
/**
 * Segunda escollera, igual a la de la punta pero más al norte, cerca de la bahía: el brazo sale de
 * la rambla oeste en la fila 15 (de 14 a 16) hasta esta plataforma.
 */
export declare const ESCOLLERA_NORTE_PLATFORM: TileRect;
/** Paradas de ómnibus (la de la Plaza Independencia es la de la guía de bienvenida). */
export declare const PLAZA_BUS_STOP: BusStop;
export declare const MERCADO_BUS_STOP: BusStop;
export declare const CIUDAD_VIEJA_INFO: {
    id: "ciudad-vieja";
    name: string;
    description: string;
    landmarks: ({
        id: string;
        name: string;
        description: string;
        kind: "casino";
        area: TileRect;
        passable?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "termas";
        area: TileRect;
        passable?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "gate";
        area: TileRect;
        passable: {
            x: number;
            y: number;
        }[];
    } | {
        id: string;
        name: string;
        description: string;
        kind: "equestrianMonument";
        area: TileRect;
        passable?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "palacioSalvo";
        area: TileRect;
        passable?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "executiveTower";
        area: TileRect;
        passable?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "palace";
        area: TileRect;
        passable?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "theater";
        area: TileRect;
        passable?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "cathedral";
        area: TileRect;
        passable?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "cabildo";
        area: TileRect;
        passable?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "fountain";
        area: TileRect;
        passable?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "church";
        area: TileRect;
        passable?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "lighthouse";
        area: TileRect;
        passable?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        kind: "market";
        area: TileRect;
        passable?: undefined;
    })[];
    shops: ({
        id: string;
        name: string;
        description: string;
        area: TileRect;
        building: "shoes";
        buys: "clothing"[];
        stock: string[];
        pets?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        area: TileRect;
        building: "stm";
        stock: string[];
        buys: "ticket"[];
        pets?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        area: TileRect;
        building: "clothing";
        buys: "clothing"[];
        stock: string[];
        pets?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        area: TileRect;
        building: "kiosk";
        stock: string[];
        buys: never[];
        pets?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        area: TileRect;
        building: "pharmacy";
        stock: string[];
        buys: never[];
        pets?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        area: TileRect;
        building: "pets";
        stock: never[];
        buys: never[];
        pets: string[];
    } | {
        id: string;
        name: string;
        description: string;
        area: TileRect;
        building: "none";
        stock: string[];
        buys: "fish"[];
        pets?: undefined;
    } | {
        id: string;
        name: string;
        description: string;
        area: TileRect;
        building: "fishing";
        stock: string[];
        buys: "rod"[];
        pets?: undefined;
    })[];
};
//# sourceMappingURL=info.d.ts.map