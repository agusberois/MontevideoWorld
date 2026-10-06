import { CityDefinition, CityInfo, Door, TilePoint, TileRect } from "../types";
/**
 * El spa del Hotel del Donador por dentro, en dos pisos iguales (este y `termasPiso2`): un salón grande
 * de baldosas con las paredes al norte y al oeste (las de adelante no se dibujan, para ver la sala),
 * dos jacuzzis grandes en el medio (7 × 7, con lugar para veinte cada uno: cuarenta por piso),
 * reposeras alrededor, plantas de varios tipos y faroles dorados que se prenden de noche. En la pared
 * oeste, la salida a Ciudad Vieja (sólo en este piso) y la escalera entre los pisos. Se entra y se sale
 * por `doors` (sin boleto); el server deja entrar sólo a donadores y al admin (`access`).
 */
/**
 * La escalera entre los pisos: 2 × 2 en la esquina noroeste, contra la pared norte, en el mismo lugar
 * en los dos (abajo sube, arriba es el hueco que baja; `Door.stairs`). Se sube o se baja desde el sur.
 */
export declare const STAIRS_AREA: TileRect;
/** Al subir o bajar se aparece al pie de la escalera. */
export declare const STAIRS_ARRIVAL: TilePoint;
/** Lo de un piso del spa (layout, jacuzzis, reposeras): `doors` y `spawnArea` cambian de piso a piso. */
export declare function spaFloor(info: Omit<CityInfo, "prison">, doors: Door[], spawnArea: TileRect): CityDefinition;
/** Planta baja: la salida a Ciudad Vieja y la escalera para subir al piso 2. */
export declare const TERMAS: CityDefinition;
//# sourceMappingURL=map.d.ts.map