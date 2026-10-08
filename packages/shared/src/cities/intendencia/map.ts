import { WELCOME_CLERK_ID } from "../../welcome";
import { LayoutBuilder } from "../layoutBuilder";
import { CityDefinition, Door, Npc, TileChar, doubleBench } from "../types";
import { DESKS, DESK_Y, HEIGHT, INTENDENCIA_INFO, WIDTH } from "./info";

/**
 * La Intendencia por dentro: un hall de mármol con las paredes al norte y al oeste (las de adelante
 * no se dibujan, para ver la sala), la puerta doble de salida en la pared oeste, los escritorios con
 * sus empleados contra la pared norte y bancos de espera en el medio.
 */

const builder = new LayoutBuilder(WIDTH, HEIGHT, TileChar.Floor)
  .row(0, 0, WIDTH - 1, TileChar.InnerWall)
  .column(0, 0, HEIGHT - 1, TileChar.InnerWall);

/** La salida (puerta doble en la pared oeste): deja en la explanada, frente a la entrada del edificio. */
const exit: Door = {
  id: "salida",
  name: "Salir al Centro",
  area: { x: 0, y: 6, width: 1, height: 2 },
  to: { cityId: "centro", at: { x: 117, y: 39 } },
};

type Employee = Pick<Npc, "id" | "name" | "role" | "appearance" | "outfit" | "lines">;

/** Quién atiende en cada escritorio, en el orden de `DESKS` (la primera es la de la bienvenida). */
const EMPLOYEES: readonly Employee[] = [
  {
    id: WELCOME_CLERK_ID,
    name: "Funcionaria de la Intendencia",
    role: "Intendencia de Montevideo · Atención al público",
    appearance: { gender: "f", skin: 2, hairColor: 1, hairStyle: "bun", eyeColor: 0, facialHair: "none", glasses: "square", color: "#9b5de5" },
    outfit: { hat: "", top: "buzo-bordo", bottom: "pantalon-vestir-negro", shoes: "botas-negras" },
  },
  {
    id: "empleado-tramites",
    name: "Empleado de Trámites",
    role: "Intendencia de Montevideo · Trámites",
    appearance: { gender: "m", skin: 1, hairColor: 2, hairStyle: "short", eyeColor: 1, facialHair: "beard", glasses: "none", color: "#4d908e" },
    outfit: { hat: "", top: "remera-blanca", bottom: "pantalon-vestir-negro", shoes: "championes-negros" },
    lines: [
      "Para ese trámite le falta un formulario. ¿Cuál? El que le voy a dar en la ventanilla de al lado.",
      "Número 47… ¿no? Bueno, siéntese que ya lo llamamos.",
      "El sistema está lento hoy. Como todos los días, bah.",
    ],
  },
  {
    id: "empleada-tributos",
    name: "Empleada de Tributos",
    role: "Intendencia de Montevideo · Tributos",
    appearance: { gender: "f", skin: 0, hairColor: 4, hairStyle: "long", eyeColor: 2, facialHair: "none", glasses: "none", color: "#f9844a" },
    outfit: { hat: "", top: "buzo-gris", bottom: "jean", shoes: "botas-marrones" },
    lines: [
      "¿Viene a pagar la contribución? Por suerte acá en Montevideo World todavía no se cobra.",
      "Si le llega una multa por estacionar, no fue culpa nuestra. Hable con los cuidacoches.",
      "Tributos, buenas. No, el mate no es mío, es de la oficina.",
    ],
  },
  {
    id: "empleado-catastro",
    name: "Empleado de Catastro",
    role: "Intendencia de Montevideo · Catastro",
    appearance: { gender: "m", skin: 3, hairColor: 0, hairStyle: "short", eyeColor: 0, facialHair: "mustache", glasses: "round", color: "#577590" },
    outfit: { hat: "", top: "remera-negra", bottom: "pantalon-beige", shoes: "championes-negros" },
    lines: [
      "Catastro: acá tenemos el plano de cada baldosa de la ciudad. Bueno, de casi todas.",
      "¿Un terreno en la Ciudad Vieja? Uh, eso está carísimo. Y no se pueden agrandar, eh.",
      "Volvé mañana, que hoy se cayó el sistema. Ah, no, era el monitor apagado.",
    ],
  },
];

export const INTENDENCIA: CityDefinition = {
  ...INTENDENCIA_INFO,
  layout: builder.build(),
  spawnArea: { x: 1, y: 5, width: 3, height: 4 },
  // Bancos de espera, en dos filas, mirando a la cámara.
  benches: [7, 11, 15].flatMap((x) => [...doubleBench(x, 8, "south"), ...doubleBench(x, 11, "south")]),
  busStops: [],
  doors: [exit],
  // Piso de mármol claro y paredes de cal con zócalo de madera.
  interior: {
    floor: ["#ddd6c6", "#cfc7b4"],
    wall: "#efe8d8",
    wallBase: "#6b4f37",
    wallTrim: "#b8a37a",
  },
  // Cada empleado, quieto detrás de su escritorio; se le habla desde adelante de la mesa.
  npcs: EMPLOYEES.map((employee, i) => ({
    ...employee,
    roam: { x: DESKS[i], y: DESK_Y, width: 1, height: 1 },
    counter: { x: DESKS[i], y: DESK_Y + 1, width: 2, height: 1 },
    talks: true,
  })),
  placeLabels: [{ name: "Atención al público", x: 10.5, y: 5.2 }],
};
