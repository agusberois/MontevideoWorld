import type { CityDefinition } from "../types";
import { STAIRS_AREA, STAIRS_ARRIVAL, spaFloor } from "../termas/map";
import { TERMAS_PISO_2_INFO } from "./info";

/** El piso 2: el mismo spa, sólo con la escalera para bajar (la salida a la calle está abajo). */
export const TERMAS_PISO_2: CityDefinition = spaFloor(
  TERMAS_PISO_2_INFO,
  [{ id: "escalera", name: "Bajar a la planta baja", area: STAIRS_AREA, to: { cityId: "termas", at: STAIRS_ARRIVAL }, access: "donor", stairs: "down" }],
  // Sin pase (volver a entrar al juego acá sin tile guardado): al pie de la escalera.
  { x: 1, y: 3, width: 3, height: 1 },
);
