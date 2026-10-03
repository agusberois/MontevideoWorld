import { sanitizeLabel } from "./sanitize";

/**
 * Mascotas: se adoptan en la Veterinaria de Ciudad Vieja (`Shop.pets`), se les pone nombre y
 * siguen a su dueño por todos lados (lo dibuja cada cliente; el server sólo guarda cuál es y cómo se
 * llama: `Player.pet` / `Player.petName`). Una por jugador.
 */

export type PetKind = "dog" | "cat" | "capybara";

export interface PetDefinition {
  id: string;
  name: string;
  kind: PetKind;
  /** Pelaje y manchas / orejas. */
  color: string;
  accent: string;
  /** Tamaño relativo al dibujo base (1 = perro mediano). */
  size: number;
  /** Lo que cuesta adoptarla. */
  price: number;
  description: string;
}

export const PETS: readonly PetDefinition[] = [
  {
    id: "perro-mestizo",
    name: "Perro mestizo",
    kind: "dog",
    color: "#c89b62",
    accent: "#8a6236",
    size: 1,
    price: 80,
    description: "Rescatado de la calle: fiel como ninguno.",
  },
  {
    id: "cimarron",
    name: "Cimarrón uruguayo",
    kind: "dog",
    color: "#b0773d",
    accent: "#3b2a1c",
    size: 1.15,
    price: 300,
    description: "El perro nacional: grandote, atigrado y guardián.",
  },
  {
    id: "salchicha",
    name: "Salchicha",
    kind: "dog",
    color: "#6b3e1e",
    accent: "#3a2010",
    size: 0.8,
    price: 220,
    description: "Largo, petiso y con mucha personalidad.",
  },
  {
    id: "gato-atigrado",
    name: "Gato atigrado",
    kind: "cat",
    color: "#d08a45",
    accent: "#8a4f1d",
    size: 0.85,
    price: 120,
    description: "Te sigue cuando quiere. Casi siempre.",
  },
  {
    id: "gato-negro",
    name: "Gato negro",
    kind: "cat",
    color: "#2b2b30",
    accent: "#4a4a52",
    size: 0.85,
    price: 120,
    description: "Trae suerte (dicen).",
  },
  {
    id: "carpincho",
    name: "Carpincho",
    kind: "capybara",
    color: "#8b6a4a",
    accent: "#5e4630",
    size: 1.2,
    price: 900,
    description: "El más tranquilo del Río de la Plata. Exclusivo.",
  },
];

export function getPet(id: string): PetDefinition | undefined {
  return PETS.find((pet) => pet.id === id);
}

export const PET_NAME_MAX_LENGTH = 14;

/** Nombre de la mascota: limpio como el de un jugador (`sanitizeLabel`), hasta `PET_NAME_MAX_LENGTH`. */
export function sanitizePetName(value: unknown): string {
  return sanitizeLabel(value, PET_NAME_MAX_LENGTH);
}
