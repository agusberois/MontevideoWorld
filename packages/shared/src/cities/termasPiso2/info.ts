import type { CityInfo } from "../types";
import { TERMAS_INFO } from "../termas/info";

/**
 * Piso 2 del Hotel del Donador: igual a la planta baja (los mismos dos jacuzzis de 20, reposeras,
 * plantas y faroles), así entran el doble. Se sube por la escalera de la planta baja; no tiene salida
 * a la calle (se baja). Mismo acceso: donadores y el admin.
 */
export const TERMAS_PISO_2_INFO = {
  ...TERMAS_INFO,
  id: "termas-2",
  name: "Hotel del Donador · Piso 2",
  description: "El segundo piso del spa de los donadores: otros dos jacuzzis termales.",
} satisfies CityInfo;
