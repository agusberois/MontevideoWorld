import type { CityInfo } from "../types";

/**
 * COMCAR: nombre, descripción, edificios emblemáticos y tiendas. Es lo liviano del barrio: el
 * cliente lo tiene siempre (lista de barrios, landing, tiendas); el mapa (`map.ts`) se descarga al entrar.
 */

export const WIDTH = 44;
/** Fila del muro sur del penal (con la reja en el medio). */
export const SOUTH_WALL_Y = 34;

export const COMCAR_INFO = {
  id: "comcar",
  name: "COMCAR",
  prison: true,
  description: "El penal de Santiago Vázquez: vení de visita en bondi a ver a los que se portaron mal.",
  landmarks: [
    ...[5, 19, 33].map((x, i) => ({
      id: `pabellon-${i + 1}`,
      name: `Pabellón ${i + 1}`,
      description: "Pabellón de celdas.",
      kind: "cellBlock" as const,
      area: { x, y: 3, width: 6, height: 6 },
    })),
    ...[
      [1, 1],
      [WIDTH - 3, 1],
      [1, SOUTH_WALL_Y - 2],
      [WIDTH - 3, SOUTH_WALL_Y - 2],
    ].map(([x, y], i) => ({
      id: `garita-${i + 1}`,
      name: "Garita",
      description: "Garita de vigilancia.",
      kind: "watchtower" as const,
      area: { x, y, width: 2, height: 2 },
    })),
  ],
  shops: [],
} satisfies CityInfo;
