import { LayoutBuilder } from "../layoutBuilder";
import { Bench, CityDefinition, Door, Jacuzzi, TileChar, TilePoint, doubleBench } from "../types";
import { HEIGHT, TERMAS_INFO, WIDTH } from "./info";

/**
 * El spa del Hotel del Donador por dentro: un salón grande de baldosas con las paredes al norte y al
 * oeste (las de adelante no se dibujan, para ver la sala), la puerta de salida en la pared oeste, el
 * jacuzzi grande en el medio (5 × 5, con lugar para doce), reposeras alrededor, plantas de varios
 * tipos y faroles dorados que se prenden de noche. Se entra y se sale por `doors` (sin boleto); el
 * server deja entrar sólo a donadores y al admin (`access`).
 */

const builder = new LayoutBuilder(WIDTH, HEIGHT, TileChar.Floor)
  .row(0, 0, WIDTH - 1, TileChar.InnerWall)
  .column(0, 0, HEIGHT - 1, TileChar.InnerWall);

/** La puerta de salida, en la pared oeste: lleva a la vereda frente al hotel en Ciudad Vieja. */
const exit: Door = {
  id: "salida",
  name: "Salir a Ciudad Vieja",
  area: { x: 0, y: 9, width: 1, height: 1 },
  to: { cityId: "ciudad-vieja", at: { x: 126, y: 47 } },
};

/** El jacuzzi (5 × 5): se meten doce, tres por lado (en el borde de adentro, sin las esquinas). */
const JACUZZI = { x: 9, y: 6, size: 5 };
const seats: TilePoint[] = [];
for (let i = 1; i < JACUZZI.size - 1; i++) {
  seats.push(
    { x: JACUZZI.x + i, y: JACUZZI.y },
    { x: JACUZZI.x + i, y: JACUZZI.y + JACUZZI.size - 1 },
    { x: JACUZZI.x, y: JACUZZI.y + i },
    { x: JACUZZI.x + JACUZZI.size - 1, y: JACUZZI.y + i },
  );
}
const jacuzzi: Jacuzzi = {
  id: "jacuzzi",
  area: { x: JACUZZI.x, y: JACUZZI.y, width: JACUZZI.size, height: JACUZZI.size },
  seats,
};

/** Reposeras a los cuatro costados del jacuzzi, a un tile del borde. */
const benches: Bench[] = [
  ...doubleBench(10, 4, "south"),
  ...doubleBench(10, 12, "south"),
  ...[7, 9].map((y) => ({ x: 7, y: y + 1, facing: "east" as const })),
  ...[7, 9].map((y) => ({ x: 15, y: y + 1, facing: "east" as const })),
  // Contra la pared norte, para mirar el salón.
  ...doubleBench(3, 2, "south"),
  { x: 7, y: 2, facing: "south" },
  { x: 15, y: 2, facing: "south" },
  ...doubleBench(18, 2, "south"),
];

export const TERMAS: CityDefinition = {
  ...TERMAS_INFO,
  layout: builder.build(),
  // Se aparece al entrar frente a la puerta.
  spawnArea: { x: 1, y: 8, width: 3, height: 3 },
  benches,
  busStops: [],
  doors: [exit],
  jacuzzis: [jacuzzi],
  placeLabels: [{ name: "Jacuzzi termal", x: 11, y: 11.5 }],
};
