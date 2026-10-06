import { LayoutBuilder } from "../layoutBuilder";
import { Bench, CityDefinition, Door, Jacuzzi, TileChar, TilePoint, doubleBench } from "../types";
import { HEIGHT, TERMAS_INFO, WIDTH } from "./info";

/**
 * El spa del Hotel del Donador por dentro: un salón grande de baldosas con las paredes al norte y al
 * oeste (las de adelante no se dibujan, para ver la sala), la puerta de salida en la pared oeste, el
 * dos jacuzzis grandes en el medio (7 × 7, con lugar para veinte cada uno), reposeras alrededor, plantas de varios
 * tipos y faroles dorados que se prenden de noche. Se entra y se sale por `doors` (sin boleto); el
 * server deja entrar sólo a donadores y al admin (`access`).
 */

const builder = new LayoutBuilder(WIDTH, HEIGHT, TileChar.Floor)
  .row(0, 0, WIDTH - 1, TileChar.InnerWall)
  .column(0, 0, HEIGHT - 1, TileChar.InnerWall);

/** La puerta doble de salida (dos tiles de la pared oeste): lleva a la vereda frente al hotel en Ciudad Vieja. */
const exit: Door = {
  id: "salida",
  name: "Salir a Ciudad Vieja",
  area: { x: 0, y: 9, width: 1, height: 2 },
  to: { cityId: "ciudad-vieja", at: { x: 126, y: 47 } },
};

/** Los dos jacuzzis (7 × 7), uno al lado del otro: en cada uno se meten veinte (`JACUZZI_CAPACITY`), cinco por lado (en el borde de adentro, sin las esquinas). */
const JACUZZI_SIZE = 7;
function jacuzziAt(id: string, x: number, y: number): Jacuzzi {
  const seats: TilePoint[] = [];
  for (let i = 1; i < JACUZZI_SIZE - 1; i++) {
    seats.push(
      { x: x + i, y },
      { x: x + i, y: y + JACUZZI_SIZE - 1 },
      { x, y: y + i },
      { x: x + JACUZZI_SIZE - 1, y: y + i },
    );
  }
  return { id, area: { x, y, width: JACUZZI_SIZE, height: JACUZZI_SIZE }, seats };
}
const jacuzzis = [jacuzziAt("jacuzzi-1", 4, 5), jacuzziAt("jacuzzi-2", 13, 5)];

const benches: Bench[] = [
  // Contra la pared norte, para mirar el salón.
  ...doubleBench(3, 2, "south"),
  { x: 7, y: 2, facing: "south" },
  { x: 15, y: 2, facing: "south" },
  ...doubleBench(18, 2, "south"),
  // Reposeras frente a los jacuzzis, del lado sur.
  ...doubleBench(5, 14, "south"),
  ...doubleBench(8, 14, "south"),
  ...doubleBench(14, 14, "south"),
  ...doubleBench(17, 14, "south"),
];

export const TERMAS: CityDefinition = {
  ...TERMAS_INFO,
  layout: builder.build(),
  // Se aparece al entrar frente a la puerta.
  spawnArea: { x: 1, y: 8, width: 3, height: 3 },
  benches,
  busStops: [],
  doors: [exit],
  jacuzzis,
  placeLabels: jacuzzis.map(({ area }) => ({ name: "Jacuzzi termal", x: area.x + 3, y: area.y + 7.5 })),
};
