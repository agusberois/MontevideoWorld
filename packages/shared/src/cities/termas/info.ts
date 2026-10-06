import type { CityInfo } from "../types";

/**
 * Termas del Donador: el interior al que sólo entran los donadores del proyecto (y el admin), por la
 * puerta del edificio de Ciudad Vieja. Lo liviano de la sala (el mapa, `map.ts`, se descarga al
 * entrar). Inspirado en las termas del Daymán y el Arapey: baldosas, plantas, reposeras y un jacuzzi
 * termal (dos, en realidad) que recarga energía y salud mucho más rápido que un banco.
 */

export const WIDTH = 22;
export const HEIGHT = 18;

export const TERMAS_INFO = {
  id: "termas",
  name: "Hotel del Donador",
  access: "donor",
  indoor: true,
  description: "El spa del hotel de los que bancan el proyecto: un jacuzzi termal para recuperar energía como en el Daymán.",
  landmarks: [
    // Plantas de distintos tipos contra las paredes.
    ...(
      [
        [1, 1, "plant"],
        [5, 1, "pottedPalm"],
        [9, 1, "flowers"],
        [13, 1, "pottedPalm"],
        [17, 1, "flowers"],
        [21, 1, "plant"],
        [1, 5, "flowers"],
        [1, 13, "pottedPalm"],
        [1, 17, "plant"],
        [21, 6, "pottedPalm"],
        [21, 11, "flowers"],
        [21, 17, "pottedPalm"],
        [6, 17, "flowers"],
        [11, 17, "plant"],
        [16, 17, "flowers"],
      ] as const
    ).map(([x, y, kind], i) => ({
      id: `planta-${i + 1}`,
      name: "Planta",
      description: "Una planta en maceta.",
      kind,
      area: { x, y, width: 1, height: 1 },
    })),
    // Faroles dorados: de noche se prenden.
    ...[
      [3, 3],
      [11, 3],
      [20, 3],
      [3, 15],
      [11, 15],
      [20, 15],
    ].map(([x, y], i) => ({
      id: `farol-${i + 1}`,
      name: "Farol",
      description: "Farol dorado del spa.",
      kind: "lamp" as const,
      area: { x, y, width: 1, height: 1 },
    })),
  ],
  shops: [],
} satisfies CityInfo;
