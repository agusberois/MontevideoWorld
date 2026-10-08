import type { CityInfo } from "../types";

/**
 * La Intendencia por dentro: el hall de Atención al público, al que se entra por la puerta del
 * edificio del Centro (cualquiera, sin boleto). Contra la pared norte, una fila de escritorios
 * (`DESKS`), cada uno con su empleado detrás (`npcs` en `map.ts`); en el primero atiende la
 * funcionaria de la bienvenida, que recibe el sobre. En el medio, bancos para esperar el turno.
 */

export const WIDTH = 22;
export const HEIGHT = 14;

/**
 * Los escritorios (2 × 2): la fila de atrás es la del empleado (no se camina) y la de adelante, la
 * mesa. Se le habla desde el tile de adelante de la mesa (`Npc.counter`).
 */
export const DESK_Y = 2;
export const DESKS = [3, 7, 11, 15] as const;

export const INTENDENCIA_INFO = {
  id: "intendencia",
  name: "Intendencia",
  access: "door",
  indoor: true,
  description: "El hall de Atención al público de la Intendencia de Montevideo: escritorios, funcionarios y trámites.",
  landmarks: [
    ...DESKS.map((x, i) => ({
      id: `escritorio-${i + 1}`,
      name: `Escritorio ${i + 1}`,
      description: "Escritorio de atención al público, con la computadora y una pila de expedientes.",
      kind: "officeDesk" as const,
      area: { x, y: DESK_Y, width: 2, height: 2 },
    })),
    ...[
      [20, 1],
      [1, 12],
      [20, 12],
      [1, 1],
    ].map(([x, y], i) => ({ id: `planta-${i + 1}`, name: "Planta", description: "Una palmera en maceta.", kind: "pottedPalm" as const, area: { x, y, width: 1, height: 1 } })),
  ],
  shops: [],
} satisfies CityInfo;
