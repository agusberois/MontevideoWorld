import type { ItemCategory } from "../items";
export interface TilePoint {
    x: number;
    y: number;
}
/** Rectángulo de tiles: (x, y) es la esquina con coordenadas mínimas. */
export interface TileRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
/**
 * Un carácter por tile en `CityDefinition.layout`. Fila = coordenada y, columna = coordenada x.
 * En el mapa, x crece hacia el este y y hacia el sur.
 */
export declare const TileChar: {
    readonly Water: "~";
    readonly Rambla: "=";
    readonly Street: ".";
    readonly Pedestrian: "s";
    readonly Plaza: "p";
    readonly Grass: "g";
    /** Manzana edificada: casas genéricas, no caminable. */
    readonly Block: "#";
    /** Edificio de apartamentos en altura (barrios modernos), no caminable. */
    readonly Tower: "H";
    /** Árbol de copa, no caminable. */
    readonly Tree: "T";
    /** Palmera, no caminable. */
    readonly Palm: "P";
    /** Escollera: espigón de piedra que entra en el agua. Caminable; desde acá se pesca. */
    readonly Jetty: "E";
    /** Muro de hormigón con alambre de púas (el COMCAR), no caminable. */
    readonly Wall: "W";
    /** Reja de barrotes (el COMCAR): no caminable, pero se ve a través. */
    readonly Fence: "F";
    /** Piso de adentro (baldosas: las Termas del Donador), caminable. */
    readonly Floor: "f";
    /** Pared de adentro, baja (sólo al norte y al oeste, para no tapar la sala), no caminable. */
    readonly InnerWall: "I";
    /** Vereda (de cada lado de la calzada), caminable. */
    readonly Sidewalk: "v";
    /**
     * Terreno de un edificio de relleno grande (`CityDefinition.fillers`), no caminable: el dibujo lo
     * hace el filler, no el tile.
     */
    readonly Building: "B";
};
export type TileCharValue = (typeof TileChar)[keyof typeof TileChar];
export declare const WALKABLE_TILE_CHARS: ReadonlySet<string>;
/** Cada tipo tiene su propio dibujo en el cliente (`game/city/landmarks.ts`). */
export type LandmarkKind = "gate" | "equestrianMonument" | "palacioSalvo" | "theater" | "cathedral" | "cabildo" | "market" | "fountain" | "lighthouse" | "shopping" | "hospital" | "velodrome" | "stadium" | "obelisk" | "cellBlock" | "watchtower" | "reusHouses" | "agriMarket" | "church" | "artCenter" | "termas" | "executiveTower" | "palace" | "plant" | "pottedPalm" | "flowers" | "lamp" | "casino" | "slotMachine" | "rouletteTable" | "blackjackTable";
/** Edificio o monumento emblemático. Sus tiles no son caminables salvo los de `passable`. */
export interface Landmark {
    id: string;
    name: string;
    description: string;
    kind: LandmarkKind;
    area: TileRect;
    /** Tiles del área que sí se pueden caminar (p. ej. el arco de una puerta). */
    passable?: readonly TilePoint[];
}
/**
 * Banco de plaza: ocupa un tile (no caminable) y se sienta una persona. `facing` es hacia dónde
 * mira quien se sienta; sólo sur o este, las direcciones que dan a la cámara.
 */
export interface Bench {
    x: number;
    y: number;
    facing: "south" | "east";
    /**
     * Banco doble: dos lugares pegados que se dibujan como un solo banco largo (cada uno sigue siendo
     * un asiento para una persona). "start" es el de la izquierda / atrás, "end" el otro.
     */
    pair?: "start" | "end";
}
/** Un banco doble: dos lugares pegados a lo largo (hacia +x si mira al sur, hacia +y si mira al este). */
export declare function doubleBench(x: number, y: number, facing: Bench["facing"]): Bench[];
/**
 * Parada de ómnibus: ocupa un tile (no caminable). Al hacerle clic el jugador camina hasta ella y
 * se abre la lista de barrios (lo mismo que la tecla M). `facing` es hacia dónde mira la parada
 * (la calle); el refugio queda del lado opuesto. Sólo sur o este, como los bancos.
 */
export interface BusStop {
    name: string;
    x: number;
    y: number;
    facing: "south" | "east";
}
/**
 * Tienda: un área cuadrada no caminable a la que se hace clic para comprar y vender.
 * Se compra lo que está en `stock` (a `ItemDefinition.price`) y se le vende lo de la mochila
 * cuya categoría esté en `buys` (a `sellPrice`).
 */
/** Edificio propio de una tienda; "none" = funciona dentro de otro edificio ya dibujado. */
export type ShopBuilding = "clothing" | "fishing" | "kiosk" | "stm" | "pets" | "pharmacy" | "wholesale" | "shoes" | "bakery" | "rotisserie" | "none";
export interface Shop {
    id: string;
    name: string;
    description: string;
    area: TileRect;
    /**
     * "clothing": el cliente dibuja un local de ropa. "none": la tienda funciona dentro de un edificio
     * que ya está dibujado (p. ej. la pescadería en el Mercado del Puerto).
     */
    building: ShopBuilding;
    /** Ids de `ITEMS` que vende. */
    stock: readonly string[];
    /** Categorías que compra. */
    buys: readonly ItemCategory[];
    /** Mascotas que se adoptan acá (ids de `PETS`): la tienda abre el panel de adopción. */
    pets?: readonly string[];
    /** Guardia de un sanatorio: la tienda abre el panel para curarse pagando (`hospital:heal`). */
    hospital?: boolean;
    /** Juego del casino: la "tienda" es la máquina o la mesa y abre su panel (`casino:*`). */
    casino?: import("../casino").CasinoGame;
    /**
     * Multiplica el precio de compra (`buyPrice`): < 1 = más barato (los mayoristas del Barrio de los
     * Judíos). Tiene que quedar por encima de lo que paga una tienda al comprar (`sellPrice`), o se
     * podría comprar y revender ganando.
     */
    priceFactor?: number;
}
/**
 * Zona donde se puede vender con un carrito (p. ej. la explanada del Estadio Centenario): los
 * tiles caminables dentro de `areas`.
 */
export interface VendingZone {
    name: string;
    areas: readonly TileRect[];
}
/** Nombre pintado sobre el piso (plazas, calles, costa). */
export interface PlaceLabel {
    name: string;
    x: number;
    y: number;
}
/** Barrios del juego. Cada uno tiene su carpeta en `cities/` con `info.ts` y `map.ts`. */
export declare const CITY_IDS: readonly ["ciudad-vieja", "tres-cruces", "barrio-de-los-judios", "comcar", "termas", "casino"];
export type CityId = (typeof CITY_IDS)[number];
/**
 * Lo liviano de un barrio: lo que necesitan la lista de barrios, la landing, las tiendas y los
 * avisos. Viaja siempre en el paquete del navegador; el mapa (`CityDefinition`) se descarga al entrar.
 */
export interface CityInfo {
    id: CityId;
    name: string;
    description: string;
    landmarks: readonly Landmark[];
    shops: readonly Shop[];
    /** Es la cárcel (el COMCAR): no sale en la landing y se va "de visita". */
    prison?: boolean;
    /**
     * Se entra sólo por una puerta, no en ómnibus: no sale en la lista de barrios ni en la landing.
     * "donor": además sólo entran los donadores (y el admin), como el Hotel del Donador; "door":
     * entra cualquiera (el casino).
     */
    access?: "donor" | "door";
    /** Es un interior: sin lluvia ni noche (luz fija). */
    indoor?: boolean;
}
/**
 * Puerta: un área (no caminable) a la que se hace clic para pasar a otra sala, sin boleto. Afuera
 * es el edificio entero (las Termas del Donador en Ciudad Vieja); adentro, un tile de la pared.
 * Al cruzar se aparece en `to.at` de `to.cityId`.
 */
export interface Door {
    id: string;
    /** Lo que dice el cartel de la F ("Entrar al Hotel", "Salir a Ciudad Vieja"). */
    name: string;
    area: TileRect;
    to: {
        cityId: CityId;
        at: TilePoint;
    };
    /** Quién puede cruzarla (sin el campo, cualquiera). */
    access?: "donor";
}
/**
 * Jacuzzi: un área (no caminable) con lugares (`seats`, tiles del área) donde se mete uno por
 * lugar. Adentro se recupera energía y salud mucho más rápido (`JACUZZI_ENERGY_REGEN`).
 */
export interface Jacuzzi {
    id: string;
    area: TileRect;
    seats: readonly TilePoint[];
}
/**
 * Edificio de relleno de 2 × 2 (casa de varios pisos o edificio en altura) sobre tiles `Building`:
 * menos piezas y más grandes que una casa por tile (`TileChar.Block`).
 */
export interface Filler {
    x: number;
    y: number;
    kind: "house" | "tower";
}
/**
 * Barco pesquero en el agua (sólo decorado: el agua ya no se camina). Ocupa 3 × 3 tiles desde (x, y);
 * `facing` es hacia dónde apunta la proa y `variant` elige colores (igual en todos los clientes).
 */
export interface Boat {
    x: number;
    y: number;
    facing: "east" | "south";
    variant: number;
}
export interface CityDefinition extends Omit<CityInfo, "prison"> {
    layout: readonly string[];
    /** Zona donde aparecen los jugadores al entrar al barrio. */
    spawnArea: TileRect;
    benches: readonly Bench[];
    busStops: readonly BusStop[];
    /** Dónde se vende con carrito (sólo en algunos barrios). */
    vending?: VendingZone;
    placeLabels: readonly PlaceLabel[];
    /** Edificio emblemático (`Landmark.id`) sobre cuyo techo va el cartel con el logo de Montevideo World. */
    logoSign?: {
        landmarkId: string;
    };
    /**
     * Cárcel (el COMCAR): los presos (`/ban`) aparecen en `yard`, encerrados; los que llegan en
     * ómnibus son visitas y aparecen en `spawnArea`, del otro lado de la reja, y se van cuando quieren.
     * No se muestra en la landing.
     */
    prison?: {
        yard: TileRect;
    };
    doors?: readonly Door[];
    fillers?: readonly Filler[];
    boats?: readonly Boat[];
    /** Faroles de la rambla (sólo decorado, no ocupan el tile): de noche se prenden. */
    streetLamps?: readonly TilePoint[];
    jacuzzis?: readonly Jacuzzi[];
}
//# sourceMappingURL=types.d.ts.map