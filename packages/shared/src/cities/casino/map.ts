import { LayoutBuilder } from "../layoutBuilder";
import { CityDefinition, Door, TileChar } from "../types";
import { CASINO_INFO, HEIGHT, WIDTH } from "./info";

/**
 * El casino por dentro: un salón de baldosas con las paredes al norte y al oeste (las de adelante no
 * se dibujan, para ver la sala), la puerta de salida en la pared oeste, las tragamonedas contra la
 * pared norte y las mesas de ruleta y de blackjack en el medio.
 */

const builder = new LayoutBuilder(WIDTH, HEIGHT, TileChar.Floor)
  .row(0, 0, WIDTH - 1, TileChar.InnerWall)
  .column(0, 0, HEIGHT - 1, TileChar.InnerWall);

/** La salida: lleva a la vereda de Cerrito, frente al casino en Ciudad Vieja. */
const exit: Door = {
  id: "salida",
  name: "Salir a Ciudad Vieja",
  area: { x: 0, y: 8, width: 1, height: 1 },
  to: { cityId: "ciudad-vieja", at: { x: 110, y: 23 } },
};

export const CASINO: CityDefinition = {
  ...CASINO_INFO,
  layout: builder.build(),
  spawnArea: { x: 1, y: 7, width: 3, height: 3 },
  benches: [],
  busStops: [],
  doors: [exit],
  placeLabels: [],
};
