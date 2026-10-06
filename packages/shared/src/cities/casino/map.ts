import { LayoutBuilder } from "../layoutBuilder";
import { CityDefinition, Door, TileChar, doubleBench } from "../types";
import { BAR, BAR_BACK_Y, CASINO_INFO, HEIGHT, WIDTH } from "./info";

/**
 * El casino por dentro: un salón de baldosas con las paredes al norte y al oeste (las de adelante no
 * se dibujan, para ver la sala), la puerta doble de salida en la pared oeste, las tragamonedas contra
 * la pared norte, las mesas en el medio, la barra en la esquina noreste (con el barman, `npcs`) y
 * sillones para descansar delante de la barra.
 */

const builder = new LayoutBuilder(WIDTH, HEIGHT, TileChar.Floor)
  .row(0, 0, WIDTH - 1, TileChar.InnerWall)
  .column(0, 0, HEIGHT - 1, TileChar.InnerWall);

/** La salida (puerta doble, dos tiles de la pared oeste): lleva a la vereda de Cerrito, frente al casino. */
const exit: Door = {
  id: "salida",
  name: "Salir a Ciudad Vieja",
  area: { x: 0, y: 9, width: 1, height: 2 },
  to: { cityId: "ciudad-vieja", at: { x: 110, y: 23 } },
};

export const CASINO: CityDefinition = {
  ...CASINO_INFO,
  layout: builder.build(),
  spawnArea: { x: 1, y: 8, width: 3, height: 4 },
  // Sillones frente a la barra, mirando al salón.
  benches: [...doubleBench(19, 9, "south"), ...doubleBench(23, 9, "south"), ...doubleBench(19, 14, "south"), ...doubleBench(23, 14, "south")],
  busStops: [],
  doors: [exit],
  // Alfombra roja con rombos dorados, paredes negras con moldura dorada y neón, y luz de boliche.
  interior: {
    floor: ["#8e1424", "#7f1120"],
    carpet: "#d9a83a",
    wall: "#17141a",
    wallBase: "#3a0a12",
    wallTrim: "#e2b53e",
    neon: "#ff3d7f",
    nightclub: true,
  },
  npcs: [
    {
      id: "barman",
      name: "Barman",
      appearance: { gender: "m", skin: 2, hairColor: 0, hairStyle: "short", eyeColor: 0, facialHair: "mustache", glasses: "none", color: "#f4a261" },
      outfit: { hat: "", top: "remera-blanca", bottom: "pantalon-vestir-negro", shoes: "championes-negros" },
      roam: { x: BAR.x, y: BAR_BACK_Y, width: BAR.width, height: 1 },
    },
  ],
  placeLabels: [{ name: "Barra", x: BAR.x + BAR.width / 2 - 0.5, y: 4.6 }],
};
