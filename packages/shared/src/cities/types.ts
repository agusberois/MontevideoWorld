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
export const TileChar = {
  Water: "~",
  Rambla: "=",
  Street: ".",
  Pedestrian: "s",
  Plaza: "p",
  Grass: "g",
  /** Manzana edificada: casas genéricas, no caminable. */
  Block: "#",
  /** Edificio de apartamentos en altura (barrios modernos), no caminable. */
  Tower: "H",
  /** Árbol de copa, no caminable. */
  Tree: "T",
  /** Palmera, no caminable. */
  Palm: "P",
  /** Escollera: espigón de piedra que entra en el agua. Caminable; desde acá se pesca. */
  Jetty: "E",
} as const;

export type TileCharValue = (typeof TileChar)[keyof typeof TileChar];

export const WALKABLE_TILE_CHARS: ReadonlySet<string> = new Set<string>([
  TileChar.Rambla,
  TileChar.Street,
  TileChar.Pedestrian,
  TileChar.Plaza,
  TileChar.Grass,
  TileChar.Jetty,
]);

/** Cada tipo tiene su propio dibujo en el cliente (`game/city/landmarks.ts`). */
export type LandmarkKind =
  | "gate"
  | "equestrianMonument"
  | "palacioSalvo"
  | "theater"
  | "cathedral"
  | "cabildo"
  | "market"
  | "fountain"
  | "lighthouse"
  | "shopping"
  | "hospital"
  | "velodrome"
  | "stadium"
  | "obelisk";

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
}

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
export type ShopBuilding = "clothing" | "fishing" | "kiosk" | "none";

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

export interface CityDefinition {
  id: string;
  name: string;
  description: string;
  layout: readonly string[];
  /** Zona donde aparecen los jugadores al entrar al barrio. */
  spawnArea: TileRect;
  landmarks: readonly Landmark[];
  benches: readonly Bench[];
  busStops: readonly BusStop[];
  shops: readonly Shop[];
  /** Dónde se vende con carrito (sólo en algunos barrios). */
  vending?: VendingZone;
  placeLabels: readonly PlaceLabel[];
  /** Edificio emblemático (`Landmark.id`) sobre cuyo techo va el cartel con el logo de Montevideo World. */
  logoSign?: { landmarkId: string };
}
