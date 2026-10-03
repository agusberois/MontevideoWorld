import { LayoutBuilder } from "../layoutBuilder";
import { Bench, BusStop, CityDefinition, TileChar, TileRect } from "../types";
import { COMCAR_INFO, WIDTH, SOUTH_WALL_Y } from "./info";

/**
 * COMCAR (cárcel de Santiago Vázquez), versión libre. Adentro del muro (con garitas en las
 * esquinas): tres pabellones al norte, la cancha y el patio al sur, donde aparecen los presos
 * (`/ban`). El muro sur es una reja larga: del otro lado, la explanada de visitas con la parada del
 * ómnibus. Los que llegan en bondi son visitas (aparecen afuera y se van cuando quieren) y ven a los
 * presos a través de la reja; los de adentro no salen hasta cumplir.
 */

const HEIGHT = 48;

const builder = new LayoutBuilder(WIDTH, HEIGHT, TileChar.Grass);
// Campo con árboles alrededor (antes de todo lo demás, que pisa los que caen adentro).
builder.scatter(TileChar.Tree, TileChar.Grass, 0.2, 21);

// Penal: piso de hormigón y muro perimetral.
builder
  .rect({ x: 0, y: 0, width: WIDTH, height: SOUTH_WALL_Y + 1 }, TileChar.Plaza)
  .row(0, 0, WIDTH - 1, TileChar.Wall)
  .row(SOUTH_WALL_Y, 0, WIDTH - 1, TileChar.Wall)
  .column(0, 0, SOUTH_WALL_Y, TileChar.Wall)
  .column(WIDTH - 1, 0, SOUTH_WALL_Y, TileChar.Wall)
  // La reja: de acá se ve el patio desde la explanada de visitas.
  .row(SOUTH_WALL_Y, 5, WIDTH - 6, TileChar.Fence);

// Adentro: camino frente a los pabellones, la cancha y el patio (pegado a la reja).
const yard: TileRect = { x: 4, y: 25, width: 36, height: 8 };
builder.row(10, 1, WIDTH - 2, TileChar.Street).rect({ x: 7, y: 12, width: 30, height: 11 }, TileChar.Grass);

// Afuera: explanada de visitas frente a la reja y la ruta con la parada.
const visitors: TileRect = { x: 3, y: SOUTH_WALL_Y + 1, width: WIDTH - 6, height: 8 };
builder.rect(visitors, TileChar.Plaza).row(HEIGHT - 4, 0, WIDTH - 1, TileChar.Street).row(HEIGHT - 3, 0, WIDTH - 1, TileChar.Street);

const benches: Bench[] = [
  // Patio, a los costados.
  { x: 2, y: 27, facing: "east" },
  { x: 2, y: 30, facing: "east" },
  { x: 41, y: 27, facing: "east" },
  { x: 41, y: 30, facing: "east" },
  // Mirando la cancha.
  ...[9, 15, 21, 27, 33].map((x) => ({ x, y: 24, facing: "south" as const })),
  // Explanada de visitas, mirando a la ruta.
  ...[6, 12, 30, 36].map((x) => ({ x, y: 42, facing: "south" as const })),
];

const busStops: BusStop[] = [{ name: "COMCAR", x: 22, y: 43, facing: "south" }];

// Bancos y parada sobre piso (la siembra de árboles no los toca, pero por las dudas).
for (const { x, y } of [...benches, ...busStops]) builder.set(x, y, TileChar.Plaza);

export const COMCAR: CityDefinition = {
  ...COMCAR_INFO,
  layout: builder.build(),
  // Las visitas (llegan en ómnibus) aparecen afuera, frente a la reja.
  spawnArea: { x: 8, y: SOUTH_WALL_Y + 2, width: 28, height: 4 },
  prison: { yard },
  benches,
  busStops,
  placeLabels: [
    { name: "Patio", x: 22, y: 29 },
    { name: "Cancha", x: 22, y: 17.5 },
    { name: "Visitas", x: 22, y: 39.5 },
  ],
};
